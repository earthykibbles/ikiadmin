import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { initFirebase } from '@/lib/firebase';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

// Helper function to check if user is admin or superadmin
async function checkAdminAccess(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return { authorized: false, error: 'Unauthorized' };
  }

  const currentUser = await db.query.user.findFirst({
    where: (users, { eq }) => eq(users.id, session.user.id),
  });

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
    return { authorized: false, error: 'Forbidden' };
  }

  return { authorized: true, user: currentUser };
}

// Get Matrix access token for a user
async function getMatrixAccessToken(userId: string): Promise<string | null> {
  try {
    initFirebase();
    const firestore = admin.firestore();
    
    // Get user's Matrix credentials from Firestore
    const userDoc = await firestore.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    const matrixUserId = userData?.matrixUserId;
    const matrixPassword = userData?.matrixPassword;

    if (!matrixUserId || !matrixPassword) {
      return null;
    }

    // Login to Matrix to get access token
    const matrixServerUrl = process.env.MATRIX_HOMESERVER_URL || 'https://rooms.ikiwellness.com';
    const loginResponse = await fetch(`${matrixServerUrl}/_matrix/client/v3/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'm.login.password',
        identifier: {
          type: 'm.id.user',
          user: matrixUserId,
        },
        password: matrixPassword,
      }),
    });

    if (!loginResponse.ok) {
      console.error('Matrix login failed:', await loginResponse.text());
      return null;
    }

    const loginData = await loginResponse.json();
    return loginData.access_token || null;
  } catch (error) {
    console.error('Error getting Matrix access token:', error);
    return null;
  }
}

// Create a group room in Matrix
async function createMatrixRoom(
  accessToken: string,
  name: string,
  topic?: string,
  inviteUserIds?: string[],
  isPublic: boolean = false
): Promise<{ roomId: string; roomAlias?: string } | null> {
  try {
    const matrixServerUrl = process.env.MATRIX_HOMESERVER_URL || 'https://rooms.ikiwellness.com';
    
    const createRoomResponse = await fetch(`${matrixServerUrl}/_matrix/client/v3/createRoom`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name,
        topic,
        invite: inviteUserIds || [],
        is_direct: false,
        preset: 'private_chat',
        visibility: isPublic ? 'public' : 'private',
      }),
    });

    if (!createRoomResponse.ok) {
      const errorText = await createRoomResponse.text();
      console.error('Matrix room creation failed:', errorText);
      return null;
    }

    const roomData = await createRoomResponse.json();
    return {
      roomId: roomData.room_id,
      roomAlias: roomData.room_alias,
    };
  } catch (error) {
    console.error('Error creating Matrix room:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const accessCheck = await checkAdminAccess(request);
    if (!accessCheck.authorized) {
      return NextResponse.json(
        { error: accessCheck.error },
        { status: accessCheck.error === 'Unauthorized' ? 401 : 403 }
      );
    }

    const body = await request.json();
    const { name, description, memberUserIds, isPublic = false, creatorUserId } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    if (!creatorUserId) {
      return NextResponse.json({ error: 'Creator user ID is required' }, { status: 400 });
    }

    // Initialize Firebase
    initFirebase();
    const firestore = admin.firestore();

    // Get Matrix IDs for all members
    const matrixUserIds: string[] = [];
    const userIdsToProcess = memberUserIds && memberUserIds.length > 0 
      ? [...new Set([creatorUserId, ...memberUserIds])] 
      : [creatorUserId];

    for (const userId of userIdsToProcess) {
      try {
        const userDoc = await firestore.collection('users').doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          const matrixUserId = userData?.matrixUserId;
          if (matrixUserId) {
            matrixUserIds.push(matrixUserId);
          } else {
            // Generate Matrix ID format if not exists
            const matrixUsername = `iki_${userId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
            const matrixId = `@${matrixUsername}:rooms.ikiwellness.com`;
            matrixUserIds.push(matrixId);
          }
        }
      } catch (error) {
        console.error(`Error getting Matrix ID for user ${userId}:`, error);
      }
    }

    // Get Matrix access token for the creator
    const accessToken = await getMatrixAccessToken(creatorUserId);
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Failed to authenticate with Matrix. Please ensure the creator has a Matrix account.' },
        { status: 500 }
      );
    }

    // Filter to only local users (same homeserver)
    const localMatrixUserIds = matrixUserIds.filter(
      (id) => id.endsWith(':rooms.ikiwellness.com')
    );

    // Get creator's Matrix ID
    const creatorDoc = await firestore.collection('users').doc(creatorUserId).get();
    const creatorMatrixId = creatorDoc.data()?.matrixUserId || 
      `@iki_${creatorUserId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}:rooms.ikiwellness.com`;

    // Exclude the creator from invite list (they're already in the room as creator)
    const inviteUserIds = localMatrixUserIds.filter(id => id !== creatorMatrixId);

    // Create the Matrix room
    const roomResult = await createMatrixRoom(
      accessToken,
      name,
      description,
      inviteUserIds,
      isPublic
    );

    if (!roomResult) {
      return NextResponse.json(
        { error: 'Failed to create group in Matrix' },
        { status: 500 }
      );
    }

    // Store group metadata in Firestore
    const groupData = {
      name,
      description: description || '',
      roomId: roomResult.roomId,
      creatorId: creatorUserId,
      memberIds: userIdsToProcess,
      isPublic,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await firestore.collection('groups').doc(roomResult.roomId).set(groupData);

    return NextResponse.json({
      success: true,
      message: 'Group created successfully',
      group: {
        id: roomResult.roomId,
        name,
        description,
        roomId: roomResult.roomId,
        memberCount: userIdsToProcess.length,
      },
    });
  } catch (error: unknown) {
    console.error('Error creating group:', error);
    const message = error instanceof Error ? error.message : 'Failed to create group';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Get all groups
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const accessCheck = await checkAdminAccess(request);
    if (!accessCheck.authorized) {
      return NextResponse.json(
        { error: accessCheck.error },
        { status: accessCheck.error === 'Unauthorized' ? 401 : 403 }
      );
    }

    initFirebase();
    const firestore = admin.firestore();

    const groupsSnapshot = await firestore
      .collection('groups')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const groups = groupsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    }));

    return NextResponse.json({ groups });
  } catch (error: unknown) {
    console.error('Error fetching groups:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch groups';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}




