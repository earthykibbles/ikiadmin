import { initFirebase } from '@/lib/firebase';
import admin from 'firebase-admin';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';

type MindfulnessExercise = {
  id?: string;
  title?: string;
  description?: string;
  artist?: string;
  soundcloudUrl?: string | null;
  videoUrl?: string | null;
  backgroundSoundUrl?: string | null;
  durationMinutes?: number;
  imageUrl?: string;
  thumbnailUrl?: string | null;
  category?: string;
  tags?: string[];
  difficulty?: string;
  featured?: boolean;
  popular?: boolean;
  playCount?: number;
  rating?: number;
  isActive?: boolean;
  createdAt?: admin.firestore.Timestamp | admin.firestore.FieldValue | string | null;
  updatedAt?: admin.firestore.Timestamp | admin.firestore.FieldValue | string | null;
  // Forward compat
  [key: string]: unknown;
};

const COLLECTION = 'mindfulness_exercises';

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function asNullableString(value: unknown): string | null {
  const s = asString(value, '');
  return s.length ? s : null;
}

function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === '1' || v === 'yes') return true;
    if (v === 'false' || v === '0' || v === 'no') return false;
  }
  return fallback;
}

function asInt(value: unknown, fallback = 0): number {
  const n =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function asFloat(value: unknown, fallback = 0): number {
  const n =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isFinite(n)) return fallback;
  return n;
}

function normalizeId(value: unknown): string {
  // Keep Firestore doc ids simple and URL-safe.
  const raw = asString(value, '');
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '');
  return cleaned;
}

function normalizeCategory(value: unknown): string {
  return asString(value, '').toLowerCase();
}

function normalizeDifficulty(value: unknown): string {
  const v = asString(value, '').toLowerCase();
  if (!v) return 'beginner';
  if (v === 'beginner' || v === 'intermediate' || v === 'advanced') return v;
  return v;
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((t) => asString(t, ''))
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }
  return [];
}

function tsToIso(value: unknown): string | null {
  return value instanceof admin.firestore.Timestamp ? value.toDate().toISOString() : null;
}

function toApiExercise(doc: admin.firestore.QueryDocumentSnapshot): MindfulnessExercise {
  const data = doc.data() as admin.firestore.DocumentData;
  const createdAt = tsToIso(data.createdAt);
  const updatedAt = tsToIso(data.updatedAt);
  return {
    id: doc.id,
    ...data,
    createdAt,
    updatedAt,
  };
}

// GET /api/mindfulness/exercises?category=&activeOnly=&limit=
export async function GET(request: NextRequest) {
  try {
    initFirebase();
    const db = admin.firestore();

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    if (id) {
      const doc = await db.collection(COLLECTION).doc(id).get();
      if (!doc.exists) {
        return NextResponse.json({ exercise: null }, { status: 404 });
      }
      const data = doc.data() as admin.firestore.DocumentData;
      const createdAt = tsToIso(data.createdAt);
      const updatedAt = tsToIso(data.updatedAt);
      return NextResponse.json({
        exercise: { id: doc.id, ...data, createdAt, updatedAt },
      });
    }

    const category = normalizeCategory(searchParams.get('category'));
    const activeOnly = asBool(searchParams.get('activeOnly'), false);
    const limit = Math.min(Math.max(asInt(searchParams.get('limit'), 200), 1), 500);

    let query: admin.firestore.Query = db.collection(COLLECTION);
    if (category) query = query.where('category', '==', category);
    if (activeOnly) query = query.where('isActive', '==', true);

    // Prefer createdAt ordering for predictable admin UI.
    query = query.orderBy('createdAt', 'desc').limit(limit);

    const snapshot = await query.get();
    const exercises = snapshot.docs.map(toApiExercise);
    return NextResponse.json({ exercises });
  } catch (error: unknown) {
    console.error('Error fetching mindfulness exercises:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch mindfulness exercises';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/mindfulness/exercises
export async function POST(request: NextRequest) {
  try {
    initFirebase();
    const db = admin.firestore();

    const body = (await request.json()) as Record<string, unknown>;

    const title = asString(body.title, '');
    const category = normalizeCategory(body.category);
    if (!title || !category) {
      return NextResponse.json({ error: 'title and category are required' }, { status: 400 });
    }

    const desiredId = normalizeId(body.id);
    const exerciseId = desiredId || nanoid();
    const docRef = db.collection(COLLECTION).doc(exerciseId);

    const now = admin.firestore.FieldValue.serverTimestamp();
    const payload: Record<string, unknown> = {
      id: exerciseId,
      title,
      description: asString(body.description, ''),
      artist: asString(body.artist, 'Unknown'),
      soundcloudUrl: asNullableString(body.soundcloudUrl),
      videoUrl: asNullableString(body.videoUrl),
      backgroundSoundUrl: asNullableString(body.backgroundSoundUrl),
      durationMinutes: Math.max(asInt(body.durationMinutes, 5), 1),
      imageUrl: asString(body.imageUrl, 'https://source.unsplash.com/featured/?meditation'),
      thumbnailUrl: asNullableString(body.thumbnailUrl),
      category,
      tags: normalizeTags(body.tags),
      difficulty: normalizeDifficulty(body.difficulty),
      featured: asBool(body.featured, false),
      popular: asBool(body.popular, false),
      playCount: Math.max(asInt(body.playCount, 0), 0),
      rating: Math.max(Math.min(asFloat(body.rating, 0), 5), 0),
      isActive: asBool(body.isActive, true),
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(payload, { merge: true });

    const createdDoc = await docRef.get();
    const created = createdDoc.data() as admin.firestore.DocumentData;
    const createdAt = tsToIso(created.createdAt);
    const updatedAt = tsToIso(created.updatedAt);
    return NextResponse.json({
      success: true,
      exercise: { id: createdDoc.id, ...created, createdAt, updatedAt },
    });
  } catch (error: unknown) {
    console.error('Error creating mindfulness exercise:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to create mindfulness exercise';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/mindfulness/exercises
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Validates and normalizes many fields.
export async function PUT(request: NextRequest) {
  try {
    initFirebase();
    const db = admin.firestore();

    const body = (await request.json()) as Record<string, unknown>;
    const exerciseId = asString(body.exerciseId ?? body.id, '');
    if (!exerciseId) {
      return NextResponse.json({ error: 'exerciseId is required' }, { status: 400 });
    }

    const docRef = db.collection(COLLECTION).doc(exerciseId);
    const existing = await docRef.get();
    if (!existing.exists) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = { ...body };
    const { exerciseId: _exerciseId, id: _id, ...rest } = updates;
    void _exerciseId;
    void _id;

    const normalized: Record<string, unknown> = { ...rest };

    // Normalize a few known fields for consistency.
    if ('title' in normalized) normalized.title = asString(normalized.title, '');
    if ('description' in normalized) normalized.description = asString(normalized.description, '');
    if ('artist' in normalized) normalized.artist = asString(normalized.artist, 'Unknown');
    if ('category' in normalized) normalized.category = normalizeCategory(normalized.category);
    if ('difficulty' in normalized)
      normalized.difficulty = normalizeDifficulty(normalized.difficulty);
    if ('durationMinutes' in normalized)
      normalized.durationMinutes = Math.max(asInt(normalized.durationMinutes, 5), 1);
    if ('playCount' in normalized)
      normalized.playCount = Math.max(asInt(normalized.playCount, 0), 0);
    if ('rating' in normalized)
      normalized.rating = Math.max(Math.min(asFloat(normalized.rating, 0), 5), 0);
    if ('featured' in normalized) normalized.featured = asBool(normalized.featured, false);
    if ('popular' in normalized) normalized.popular = asBool(normalized.popular, false);
    if ('isActive' in normalized) normalized.isActive = asBool(normalized.isActive, true);
    if ('soundcloudUrl' in normalized)
      normalized.soundcloudUrl = asNullableString(normalized.soundcloudUrl);
    if ('videoUrl' in normalized) normalized.videoUrl = asNullableString(normalized.videoUrl);
    if ('backgroundSoundUrl' in normalized)
      normalized.backgroundSoundUrl = asNullableString(normalized.backgroundSoundUrl);
    if ('imageUrl' in normalized) normalized.imageUrl = asString(normalized.imageUrl, '');
    if ('thumbnailUrl' in normalized)
      normalized.thumbnailUrl = asNullableString(normalized.thumbnailUrl);
    if ('tags' in normalized) normalized.tags = normalizeTags(normalized.tags);

    normalized.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await docRef.set(normalized, { merge: true });

    const updatedDoc = await docRef.get();
    const data = updatedDoc.data() as admin.firestore.DocumentData;
    const createdAt = tsToIso(data.createdAt);
    const updatedAt = tsToIso(data.updatedAt);
    return NextResponse.json({
      success: true,
      exercise: { id: updatedDoc.id, ...data, createdAt, updatedAt },
    });
  } catch (error: unknown) {
    console.error('Error updating mindfulness exercise:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to update mindfulness exercise';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/mindfulness/exercises?exerciseId=
export async function DELETE(request: NextRequest) {
  try {
    initFirebase();
    const db = admin.firestore();

    const searchParams = request.nextUrl.searchParams;
    const exerciseId = searchParams.get('exerciseId') || searchParams.get('id');
    if (!exerciseId) {
      return NextResponse.json({ error: 'exerciseId is required' }, { status: 400 });
    }

    const docRef = db.collection(COLLECTION).doc(exerciseId);
    const existing = await docRef.get();
    if (!existing.exists) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    await docRef.delete();
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting mindfulness exercise:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to delete mindfulness exercise';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

