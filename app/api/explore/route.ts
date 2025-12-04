import { NextRequest, NextResponse } from 'next/server';
import { initFirebase } from '@/lib/firebase';
import admin from 'firebase-admin';
import { nanoid } from 'nanoid';

function generateDateId(date?: Date): string {
  const targetDate = date || new Date();
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// GET videos from explore_landings
export async function GET(request: NextRequest) {
  try {
    initFirebase();
    const db = admin.firestore();
    
    const searchParams = request.nextUrl.searchParams;
    const dateId = searchParams.get('dateId') || generateDateId();
    const category = searchParams.get('category'); // Optional filter by category
    
    const docRef = db.collection('explore_landings').doc(dateId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return NextResponse.json({
        videos: [],
        dateId,
        exists: false,
      });
    }
    
    const data = doc.data();
    let videos = (data?.videos || []) as any[];
    
    // Filter by category if provided
    if (category) {
      videos = videos.filter(
        (video) => video.media_category?.toLowerCase() === category.toLowerCase()
      );
    }
    
    return NextResponse.json({
      videos,
      dateId,
      exists: true,
    });
  } catch (error: any) {
    console.error('Error fetching explore videos:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch explore videos' },
      { status: 500 }
    );
  }
}

// POST add a new video to explore_landings
export async function POST(request: NextRequest) {
  try {
    initFirebase();
    const db = admin.firestore();
    
    const body = await request.json();
    const {
      title,
      media_type,
      media_url,
      img_url,
      thumbnail,
      media_text,
      media_desc,
      media_category,
      media_tags,
      dateId, // Optional, defaults to today
    } = body;
    
    // Validate required fields
    if (!title || !media_type || !media_url || !media_category) {
      return NextResponse.json(
        { error: 'title, media_type, media_url, and media_category are required' },
        { status: 400 }
      );
    }
    
    const targetDateId = dateId || generateDateId();
    const docRef = db.collection('explore_landings').doc(targetDateId);
    
    // Get existing document or create new
    const doc = await docRef.get();
    const existingData = doc.exists ? doc.data() : {};
    const existingVideos = (existingData?.videos || []) as any[];
    
    // Create new video object
    const newVideo = {
      id: nanoid(),
      created_at: new Date().toISOString(),
      title,
      media_type: media_type.toLowerCase(), // video, audio, article
      media_url,
      img_url: img_url || thumbnail || '',
      thumbnail: thumbnail || img_url || '',
      media_text: media_text || '',
      media_desc: media_desc || '',
      media_category: media_category.toLowerCase(), // fitness, nutrition, mindfulness, finance, mood
      media_tags: Array.isArray(media_tags) ? media_tags : [],
    };
    
    // Add to videos array
    const updatedVideos = [...existingVideos, newVideo];
    
    // Update document
    await docRef.set({
      ...existingData,
      videos: updatedVideos,
    }, { merge: true });
    
    return NextResponse.json({
      success: true,
      video: newVideo,
      dateId: targetDateId,
    });
  } catch (error: any) {
    console.error('Error adding explore video:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add explore video' },
      { status: 500 }
    );
  }
}

// DELETE remove a video from explore_landings
export async function DELETE(request: NextRequest) {
  try {
    initFirebase();
    const db = admin.firestore();
    
    const searchParams = request.nextUrl.searchParams;
    const videoId = searchParams.get('videoId');
    const dateId = searchParams.get('dateId') || generateDateId();
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'videoId is required' },
        { status: 400 }
      );
    }
    
    const docRef = db.collection('explore_landings').doc(dateId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Document not found for the specified date' },
        { status: 404 }
      );
    }
    
    const data = doc.data();
    const videos = (data?.videos || []) as any[];
    
    // Filter out the video with matching ID
    const updatedVideos = videos.filter((video) => video.id !== videoId);
    
    if (updatedVideos.length === videos.length) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }
    
    // Update document
    await docRef.set({
      ...data,
      videos: updatedVideos,
    }, { merge: true });
    
    return NextResponse.json({
      success: true,
      message: 'Video deleted successfully',
      dateId,
    });
  } catch (error: any) {
    console.error('Error deleting explore video:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete explore video' },
      { status: 500 }
    );
  }
}

