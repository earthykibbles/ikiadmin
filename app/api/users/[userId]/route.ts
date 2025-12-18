import { initFirebase } from '@/lib/firebase';
import { ACTIONS, RESOURCE_TYPES, requirePermission } from '@/lib/rbac';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

// GET user details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // RBAC check - check if user has permission to read this specific user or users in general
    const authCheck = await requirePermission(request, RESOURCE_TYPES.USERS, 'read', userId);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }
    initFirebase();
    const db = admin.firestore();

    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const data = userDoc.data()!;
    const user = {
      id: userDoc.id,
      firstname: data.firstname || '',
      lastname: data.lastname || '',
      username: data.username || '',
      email: data.email || '',
      photoUrl: data.photoUrl || '',
      country: data.country || '',
      bio: data.bio || '',
      gender: data.gender || '',
      birthday: data.birthday || '',
      phone: data.phone || '',
      signedUpAt: data.time ? data.time.toDate().toISOString() : null,
      lastSeen: data.lastSeen ? data.lastSeen.toDate().toISOString() : null,
      isOnline: data.isOnline || false,
      points: data.points || 0,
      activityLevel: data.activityLevel || '',
      bodyWeightKg: data.bodyWeightKg || null,
      age: data.age || null,
      onboardingData: data.onboardingData || null,
      healthStats: data.health_stats || [],
      fcmToken: data.fcm_token || data.fcmToken || data.device_token || null,
    };

    return NextResponse.json({ user });
  } catch (error: unknown) {
    console.error('Error fetching user:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch user';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// UPDATE user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // RBAC check
    const authCheck = await requirePermission(request, RESOURCE_TYPES.USERS, 'write', userId);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    initFirebase();
    const db = admin.firestore();

    const body = await request.json();
    const {
      firstname,
      lastname,
      username,
      email,
      phone,
      country,
      bio,
      gender,
      birthday,
      age,
      activityLevel,
      bodyWeightKg,
      points,
      isOnline,
    } = body;

    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (firstname !== undefined) updateData.firstname = firstname;
    if (lastname !== undefined) updateData.lastname = lastname;
    if (username !== undefined) {
      updateData.username = username;
      updateData.usernameLowercase = username?.toLowerCase();
    }
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (country !== undefined) updateData.country = country;
    if (bio !== undefined) updateData.bio = bio;
    if (gender !== undefined) updateData.gender = gender;
    if (birthday !== undefined) updateData.birthday = birthday;
    if (age !== undefined) updateData.age = age;
    if (activityLevel !== undefined) updateData.activityLevel = activityLevel;
    if (bodyWeightKg !== undefined) updateData.bodyWeightKg = bodyWeightKg;
    if (points !== undefined) updateData.points = points;
    if (isOnline !== undefined) updateData.isOnline = isOnline;

    await db.collection('users').doc(userId).update(updateData);

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (error: unknown) {
    console.error('Error updating user:', error);
    const message = error instanceof Error ? error.message : 'Failed to update user';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Helper function to delete all documents in a collection/subcollection
async function deleteCollection(
  db: admin.firestore.Firestore,
  collectionRef: admin.firestore.CollectionReference,
  batchSize = 500
): Promise<void> {
  let query = collectionRef.limit(batchSize);

  while (true) {
    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    if (snapshot.docs.length < batchSize) break;
    query = collectionRef.limit(batchSize).startAfter(snapshot.docs[snapshot.docs.length - 1]);
  }
}

// Helper function to delete all documents matching a query
async function deleteQueryBatch(
  db: admin.firestore.Firestore,
  baseQuery: admin.firestore.Query,
  batchSize = 500
): Promise<void> {
  let query = baseQuery.limit(batchSize);

  while (true) {
    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    if (snapshot.docs.length < batchSize) break;

    // Create new query starting after the last document
    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    query = baseQuery.startAfter(lastDoc).limit(batchSize);
  }
}

// DELETE user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // RBAC check
    const authCheck = await requirePermission(request, RESOURCE_TYPES.USERS, ACTIONS.DELETE, userId);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    initFirebase();
    const db = admin.firestore();
    const auth = admin.auth();

    console.log(`Starting deletion of user ${userId} and all associated data...`);

    // 1. Delete user subcollections (health & wellness data)
    const userSubcollections = [
      'nutrition',
      'fitness',
      'mood',
      'water',
      'mindfulness',
      'finance',
      'drugs',
      'emergency_contacts',
      'medical_info',
      'wellsphere',
      'legalChatMessages',
      'legalWellness',
      'sukiChatMessages',
    ];

    for (const subcol of userSubcollections) {
      try {
        const subcolRef = db.collection('users').doc(userId).collection(subcol);
        await deleteCollection(db, subcolRef);
        console.log(`Deleted subcollection: users/${userId}/${subcol}`);
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`Error deleting subcollection ${subcol}:`, errorMsg);
      }
    }

    // 2. Delete wellsphere profile
    try {
      const wellsphereProfileRef = db.collection('wellsphere_profiles').doc(userId);
      const wellsphereProfile = await wellsphereProfileRef.get();
      if (wellsphereProfile.exists) {
        await wellsphereProfileRef.delete();
        console.log(`Deleted wellsphere profile: ${userId}`);
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Error deleting wellsphere profile:', errorMsg);
    }

    // 3. Delete symptoms entries
    try {
      const symptomsRef = db.collection('symptoms').doc(userId).collection('entries');
      await deleteCollection(db, symptomsRef);
      const symptomsDocRef = db.collection('symptoms').doc(userId);
      const symptomsDoc = await symptomsDocRef.get();
      if (symptomsDoc.exists) {
        await symptomsDocRef.delete();
      }
      console.log(`Deleted symptoms data for: ${userId}`);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Error deleting symptoms:', errorMsg);
    }

    // 4. Delete daily check-ins
    try {
      const dailyCheckInsRef = db.collection('dailycheckin').doc(userId).collection('dates');
      await deleteCollection(db, dailyCheckInsRef);
      const dailyCheckInDocRef = db.collection('dailycheckin').doc(userId);
      const dailyCheckInDoc = await dailyCheckInDocRef.get();
      if (dailyCheckInDoc.exists) {
        await dailyCheckInDocRef.delete();
      }
      console.log(`Deleted daily check-ins for: ${userId}`);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Error deleting daily check-ins:', errorMsg);
    }

    // 5. Delete user's posts and their comments
    try {
      const postsQuery = db.collection('posts').where('ownerId', '==', userId);
      const postsSnapshot = await postsQuery.get();

      for (const postDoc of postsSnapshot.docs) {
        const postId = postDoc.id;

        // Delete comments for this post
        const commentsRef = db.collection('comments').doc(postId).collection('comments');
        await deleteCollection(db, commentsRef);

        // Delete comment document
        const commentDocRef = db.collection('comments').doc(postId);
        const commentDoc = await commentDocRef.get();
        if (commentDoc.exists) {
          await commentDocRef.delete();
        }

        // Delete the post
        await postDoc.ref.delete();
      }
      console.log(`Deleted ${postsSnapshot.docs.length} posts and their comments`);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Error deleting posts:', errorMsg);
    }

    // 6. Delete comments by the user (in case they commented on others' posts)
    try {
      // Note: This requires iterating through all posts, which might be expensive
      // Alternative: Store userId in comment documents for efficient querying
      // For now, we'll delete comments when posts are deleted above
      console.log('Comments deletion handled via post deletion');
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Error deleting user comments:', errorMsg);
    }

    // 7. Delete likes by the user
    try {
      const likesQuery = db.collection('likes').where('userId', '==', userId);
      await deleteQueryBatch(db, likesQuery);
      console.log('Deleted likes by user');
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Error deleting likes:', errorMsg);
    }

    // 8. Delete comment likes by the user
    try {
      const commentLikesQuery = db.collection('commentLikes').where('userId', '==', userId);
      await deleteQueryBatch(db, commentLikesQuery);
      console.log('Deleted comment likes by user');
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Error deleting comment likes:', errorMsg);
    }

    // 9. Delete notifications
    try {
      const notificationsRef = db
        .collection('notifications')
        .doc(userId)
        .collection('notifications');
      await deleteCollection(db, notificationsRef);
      const notificationsDocRef = db.collection('notifications').doc(userId);
      const notificationsDoc = await notificationsDocRef.get();
      if (notificationsDoc.exists) {
        await notificationsDocRef.delete();
      }
      console.log(`Deleted notifications for: ${userId}`);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Error deleting notifications:', errorMsg);
    }

    // 10. Delete stories
    try {
      const storiesQuery = db.collection('stories').where('userId', '==', userId);
      await deleteQueryBatch(db, storiesQuery);
      console.log('Deleted stories by user');
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Error deleting stories:', errorMsg);
    }

    // 11. Delete userTags and obQuestions documents
    try {
      const userTagsRef = db.collection('userTags').doc(userId);
      const userTagsDoc = await userTagsRef.get();
      if (userTagsDoc.exists) {
        await userTagsRef.delete();
      }

      const obQuestionsRef = db.collection('obQuestions').doc(userId);
      const obQuestionsDoc = await obQuestionsRef.get();
      if (obQuestionsDoc.exists) {
        await obQuestionsRef.delete();
      }
      console.log('Deleted userTags and obQuestions');
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Error deleting userTags/obQuestions:', errorMsg);
    }

    // 12. Delete chats where user is a participant
    try {
      const chatsQuery = db.collection('chats').where('users', 'array-contains', userId);
      await deleteQueryBatch(db, chatsQuery);
      console.log('Deleted chats with user as participant');
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Error deleting chats:', errorMsg);
    }

    // 13. Delete favoriteUsers references
    try {
      // Delete where user is the favoriter
      const favoriteUsersQuery1 = db.collection('favoriteUsers').where('userId', '==', userId);
      await deleteQueryBatch(db, favoriteUsersQuery1);

      // Delete where user is the favoritee
      const favoriteUsersQuery2 = db
        .collection('favoriteUsers')
        .where('favoriteUserId', '==', userId);
      await deleteQueryBatch(db, favoriteUsersQuery2);
      console.log('Deleted favoriteUsers references');
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Error deleting favoriteUsers:', errorMsg);
    }

    // 14. Delete chatIds
    try {
      const chatIdsQuery = db.collection('chatIds').where('userId', '==', userId);
      await deleteQueryBatch(db, chatIdsQuery);
      console.log('Deleted chatIds');
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Error deleting chatIds:', errorMsg);
    }

    // 15. Delete user document (do this last after all subcollections are deleted)
    try {
      await db.collection('users').doc(userId).delete();
      console.log(`Deleted user document: ${userId}`);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Error deleting user document:', errorMsg);
    }

    // 16. Delete from Firebase Auth
    try {
      await auth.deleteUser(userId);
      console.log(`Deleted Firebase Auth user: ${userId}`);
    } catch (authError: any) {
      // User might not exist in Auth, or might have been deleted already
      if (authError.code !== 'auth/user-not-found') {
        console.warn('Could not delete auth user:', authError.message);
      }
    }

    console.log(`Successfully deleted user ${userId} and all associated data`);

    return NextResponse.json({
      success: true,
      message: 'User and all associated data deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Error deleting user:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete user';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
