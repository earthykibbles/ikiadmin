import { initFirebase } from '@/lib/firebase';
import admin from 'firebase-admin';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';

// GET all stories (non-expired)
export async function GET(request: NextRequest) {
  try {
    initFirebase();
    const db = admin.firestore();

    const searchParams = request.nextUrl.searchParams;
    const limit = Number.parseInt(searchParams.get('limit') || '50');
    const lastDocId = searchParams.get('lastDocId');

    const now = admin.firestore.Timestamp.now();

    // Order by timestamp and filter expired stories in memory to avoid index requirement
    let query = db
      .collection('stories')
      .orderBy('timestamp', 'desc')
      .limit(limit * 2); // Fetch more to account for expired stories

    if (lastDocId) {
      const lastDoc = await db.collection('stories').doc(lastDocId).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.get();
    // Filter out expired stories and limit results
    const allStories = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          storyId: data.storyId || doc.id,
          userId: data.userId || '',
          username: data.username || '',
          userDp: data.userDp || '',
          imageUrl: data.imageUrl || '',
          caption: data.caption || '',
          timestamp: data.timestamp
            ? data.timestamp.toDate
              ? data.timestamp.toDate().toISOString()
              : data.timestamp
            : null,
          expiresAt: data.expiresAt
            ? data.expiresAt.toDate
              ? data.expiresAt.toDate().toISOString()
              : data.expiresAt
            : null,
          viewers: data.viewers || [],
          whoCanSee: data.whoCanSee || [],
        };
      })
      .filter((story) => {
        if (!story.expiresAt) return true;
        const expiry = new Date(story.expiresAt);
        return expiry > new Date();
      })
      .slice(0, limit);

    const stories = allStories;

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    const hasMore = snapshot.docs.length === limit;

    return NextResponse.json({
      stories,
      hasMore,
      lastDocId: hasMore && lastDoc ? lastDoc.id : null,
    });
  } catch (error: unknown) {
    console.error('Error fetching stories:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch stories';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST create a new story
export async function POST(request: NextRequest) {
  try {
    initFirebase();
    const db = admin.firestore();

    const body = await request.json();
    const { userId, imageUrl, caption, whoCanSee } = body;

    if (!userId || !imageUrl) {
      return NextResponse.json({ error: 'userId and imageUrl are required' }, { status: 400 });
    }

    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const username = userData?.username || '';
    const userDp = userData?.photoUrl || '';

    // Create story document
    const storyId = nanoid();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Stories expire after 24 hours

    const storyData = {
      storyId: storyId,
      userId: userId,
      username: username,
      userDp: userDp,
      imageUrl: imageUrl,
      caption: caption || '',
      viewers: [],
      whoCanSee: whoCanSee || [],
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    };

    await db.collection('stories').doc(storyId).set(storyData);

    return NextResponse.json({
      success: true,
      story: {
        id: storyId,
        ...storyData,
        timestamp: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error('Error creating story:', error);
    const message = error instanceof Error ? error.message : 'Failed to create story';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
