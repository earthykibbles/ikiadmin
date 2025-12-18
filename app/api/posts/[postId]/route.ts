import { initFirebase } from '@/lib/firebase';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

// GET single post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    initFirebase();
    const db = admin.firestore();

    const postDoc = await db.collection('posts').doc(postId).get();

    if (!postDoc.exists) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const data = postDoc.data()!;
    const post = {
      id: postDoc.id,
      postId: data.postId || postDoc.id,
      ownerId: data.ownerId || '',
      username: data.username || '',
      description: data.description || '',
      mediaUrl: data.mediaUrl || '',
      location: data.location || '',
      timestamp: data.timestamp
        ? data.timestamp.toDate
          ? data.timestamp.toDate().toISOString()
          : data.timestamp
        : null,
      likes: data.likes || {},
      likesCount: data.likes ? Object.keys(data.likes).length : 0,
    };

    return NextResponse.json({ post });
  } catch (error: unknown) {
    console.error('Error fetching post:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch post';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    initFirebase();
    const db = admin.firestore();

    const postDoc = await db.collection('posts').doc(postId).get();

    if (!postDoc.exists) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const postData = postDoc.data()!;
    const ownerId = postData.ownerId;

    // Delete the post
    await db.collection('posts').doc(postId).delete();

    // Delete comments for this post
    const commentsRef = db.collection('comments').doc(postId).collection('comments');
    const commentsSnapshot = await commentsRef.get();
    const batch = db.batch();
    commentsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    if (commentsSnapshot.docs.length > 0) {
      await batch.commit();
    }

    // Delete comment document if it exists
    const commentDocRef = db.collection('comments').doc(postId);
    const commentDoc = await commentDocRef.get();
    if (commentDoc.exists) {
      await commentDocRef.delete();
    }

    // Delete notifications related to this post
    if (ownerId) {
      const notificationsRef = db
        .collection('notifications')
        .doc(ownerId)
        .collection('notifications');
      const notificationsSnapshot = await notificationsRef.where('postId', '==', postId).get();

      const notificationsBatch = db.batch();
      notificationsSnapshot.docs.forEach((doc) => notificationsBatch.delete(doc.ref));
      if (notificationsSnapshot.docs.length > 0) {
        await notificationsBatch.commit();
      }
    }

    return NextResponse.json({ success: true, message: 'Post deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting post:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete post';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
