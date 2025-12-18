import { initFirebase } from '@/lib/firebase';
import admin from 'firebase-admin';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';

type ExploreLandingItem = {
  id?: string;
  created_at?: string;
  priority?: number;
  thumbnail?: string;
  title?: string;
  media_type?: string;
  img_url?: string;
  media_url?: string;
  media_text?: string;
  media_category?: string;
  media_tags?: string[];
  media_desc?: string;
  // Allow forward compatibility with extra fields
  [key: string]: unknown;
};

function generateDateId(date?: Date): string {
  const targetDate = date || new Date();
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function asVideosArray(data: admin.firestore.DocumentData | undefined): ExploreLandingItem[] {
  const raw = data?.videos;
  return Array.isArray(raw) ? (raw as ExploreLandingItem[]) : [];
}

function normalizeLower(value: unknown): string {
  return (typeof value === 'string' ? value : '').trim().toLowerCase();
}

function normalizePriority(value: unknown): number {
  const num = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(num)) return 0;
  // Keep it as an integer for predictable ordering/UI
  return Math.trunc(num);
}

function getCreatedAtMs(value: unknown): number {
  if (typeof value !== 'string') return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function stableExploreSort(a: ExploreLandingItem, b: ExploreLandingItem): number {
  const ap = normalizePriority(a.priority);
  const bp = normalizePriority(b.priority);
  if (bp !== ap) return bp - ap;

  const at = getCreatedAtMs(a.created_at);
  const bt = getCreatedAtMs(b.created_at);
  if (bt !== at) return bt - at;

  const aid = typeof a.id === 'string' ? a.id : '';
  const bid = typeof b.id === 'string' ? b.id : '';
  return aid.localeCompare(bid);
}

function validateNewItem(input: {
  title: unknown;
  media_type: unknown;
  media_url: unknown;
  media_text: unknown;
  media_category: unknown;
}): { ok: true; type: string; url: string; text: string } | { ok: false; error: string } {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const type = normalizeLower(input.media_type);
  const url = typeof input.media_url === 'string' ? input.media_url.trim() : '';
  const text = typeof input.media_text === 'string' ? input.media_text.trim() : '';
  const category = normalizeLower(input.media_category);

  if (!title || !type || !category) {
    return { ok: false, error: 'title, media_type, and media_category are required' };
  }

  if (type === 'article') {
    if (!url && !text) {
      return {
        ok: false,
        error: 'For articles, provide either media_url or media_text (markdown).',
      };
    }
    return { ok: true, type, url, text };
  }

  if (!url) {
    return { ok: false, error: 'media_url is required for audio/video' };
  }

  if (type === 'video') {
    const lowered = url.toLowerCase();
    if (lowered.includes('youtube.com') || lowered.includes('youtu.be')) {
      return {
        ok: false,
        error: 'YouTube links are not supported. Provide a direct video URL (e.g. mp4).',
      };
    }
  }

  return { ok: true, type, url, text };
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
    let videos = asVideosArray(data);

    // Filter by category if provided
    if (category) {
      videos = videos.filter(
        (video) =>
          typeof video.media_category === 'string' &&
          video.media_category.toLowerCase() === category.toLowerCase()
      );
    }

    // Stable ordering so reloads/admin views don't reshuffle.
    videos = [...videos].sort(stableExploreSort);

    return NextResponse.json({
      videos,
      dateId,
      exists: true,
    });
  } catch (error: unknown) {
    console.error('Error fetching explore videos:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch explore videos';
    return NextResponse.json({ error: message }, { status: 500 });
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
      priority,
      dateId, // Optional, defaults to today
    } = body;

    const validation = validateNewItem({
      title,
      media_type,
      media_url,
      media_text,
      media_category,
    });
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const targetDateId = dateId || generateDateId();
    const docRef = db.collection('explore_landings').doc(targetDateId);

    // Get existing document or create new
    const doc = await docRef.get();
    const existingData = doc.exists ? doc.data() : undefined;
    const existingVideos = asVideosArray(existingData);

    // Create new video object
    const newVideo: ExploreLandingItem = {
      id: nanoid(),
      created_at: new Date().toISOString(),
      priority: normalizePriority(priority),
      title: typeof title === 'string' ? title : String(title ?? ''),
      media_type: validation.type, // video, audio, article
      media_url: validation.url,
      img_url: (img_url || thumbnail || '').toString(),
      thumbnail: (thumbnail || img_url || '').toString(),
      // Store article content as markdown in this field (schema unchanged).
      media_text: validation.text,
      media_desc: (media_desc || '').toString(),
      media_category: normalizeLower(media_category), // fitness, nutrition, mindfulness, finance, mood
      media_tags: Array.isArray(media_tags) ? (media_tags as string[]).map((t) => String(t)) : [],
    };

    // Add to videos array
    const updatedVideos = [...existingVideos, newVideo].sort(stableExploreSort);

    // Update document
    await docRef.set(
      {
        ...(existingData ?? {}),
        videos: updatedVideos,
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      video: newVideo,
      dateId: targetDateId,
    });
  } catch (error: unknown) {
    console.error('Error adding explore video:', error);
    const message = error instanceof Error ? error.message : 'Failed to add explore video';
    return NextResponse.json({ error: message }, { status: 500 });
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
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
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
    const videos = asVideosArray(data);

    // Filter out the video with matching ID
    const updatedVideos = videos.filter((video) => video.id !== videoId);

    if (updatedVideos.length === videos.length) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Update document
    await docRef.set(
      {
        ...data,
        videos: updatedVideos,
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Video deleted successfully',
      dateId,
    });
  } catch (error: unknown) {
    console.error('Error deleting explore video:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete explore video';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT update an existing item in explore_landings (by id)
export async function PUT(request: NextRequest) {
  try {
    initFirebase();
    const db = admin.firestore();

    const body = await request.json();
    const { dateId, videoId, ...updates } = body;

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    const targetDateId = dateId || generateDateId();
    const docRef = db.collection('explore_landings').doc(targetDateId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Document not found for the specified date' },
        { status: 404 }
      );
    }

    const data = doc.data();
    const videos = asVideosArray(data);
    const index = videos.findIndex((v) => v.id === videoId);

    if (index < 0) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const current = videos[index] || {};
    const next: ExploreLandingItem = {
      ...current,
      ...updates,
    };

    if ('priority' in updates) {
      next.priority = normalizePriority((updates as any).priority);
    }

    if (typeof next.media_type === 'string') {
      next.media_type = next.media_type.toLowerCase();
    }
    if (typeof next.media_category === 'string') {
      next.media_category = next.media_category.toLowerCase();
    }
    next.media_tags = Array.isArray(next.media_tags) ? next.media_tags : current.media_tags || [];

    // Keep thumbnail/img_url mirrored if either is updated
    if (typeof updates.thumbnail === 'string') {
      next.thumbnail = updates.thumbnail;
      next.img_url = updates.thumbnail;
    }
    if (typeof updates.img_url === 'string') {
      next.img_url = updates.img_url;
      next.thumbnail = updates.img_url;
    }

    videos[index] = next;

    // Keep list stable after edits as well.
    videos.sort(stableExploreSort);

    await docRef.set(
      {
        ...data,
        videos,
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      video: next,
      dateId: targetDateId,
    });
  } catch (error: unknown) {
    console.error('Error updating explore video:', error);
    const message = error instanceof Error ? error.message : 'Failed to update explore video';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
