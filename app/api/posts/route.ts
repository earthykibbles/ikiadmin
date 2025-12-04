import { NextRequest, NextResponse } from 'next/server';
import { initFirebase } from '@/lib/firebase';
import admin from 'firebase-admin';
import { nanoid } from 'nanoid';

// GET all posts (global feed)
export async function GET(request: NextRequest) {
  try {
    initFirebase();
    const db = admin.firestore();
    
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const lastDocId = searchParams.get('lastDocId');
    
    let query = db.collection('posts')
      .orderBy('timestamp', 'desc')
      .limit(limit);
    
    if (lastDocId) {
      const lastDoc = await db.collection('posts').doc(lastDocId).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }
    
    const snapshot = await query.get();
    const posts = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        postId: data.postId || doc.id,
        ownerId: data.ownerId || '',
        username: data.username || '',
        description: data.description || '',
        mediaUrl: data.mediaUrl || '',
        location: data.location || '',
        timestamp: data.timestamp 
          ? (data.timestamp.toDate ? data.timestamp.toDate().toISOString() : data.timestamp)
          : null,
        likes: data.likes || {},
        likesCount: data.likes ? Object.keys(data.likes).length : 0,
      };
    });
    
    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    const hasMore = snapshot.docs.length === limit;
    
    return NextResponse.json({
      posts,
      hasMore,
      lastDocId: hasMore && lastDoc ? lastDoc.id : null,
    });
  } catch (error: any) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

// POST create a new post
export async function POST(request: NextRequest) {
  try {
    initFirebase();
    const db = admin.firestore();
    
    const body = await request.json();
    const { ownerId, mediaUrl, description, location } = body;
    
    if (!ownerId || !mediaUrl) {
      return NextResponse.json(
        { error: 'ownerId and mediaUrl are required' },
        { status: 400 }
      );
    }
    
    // Get user data
    const userDoc = await db.collection('users').doc(ownerId).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const userData = userDoc.data();
    const username = userData?.username || '';
    
    // Create post document
    const postId = nanoid();
    const postData = {
      id: postId,
      postId: postId,
      ownerId: ownerId,
      username: username,
      mediaUrl: mediaUrl,
      description: description || '',
      location: location || '',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      likes: {},
    };
    
    await db.collection('posts').doc(postId).set(postData);
    
    return NextResponse.json({
      success: true,
      post: {
        id: postId,
        ...postData,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create post' },
      { status: 500 }
    );
  }
}

