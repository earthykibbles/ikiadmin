import { initFirebase } from '@/lib/firebase';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

type MindfulnessCategory = {
  id?: string;
  name?: string;
  displayName?: string;
  description?: string;
  iconName?: string;
  color?: string;
  order?: number;
  isActive?: boolean;
  createdAt?: admin.firestore.Timestamp | admin.firestore.FieldValue | string | null;
  updatedAt?: admin.firestore.Timestamp | admin.firestore.FieldValue | string | null;
  [key: string]: unknown;
};

const COLLECTION = 'mindfulness_categories';

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
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

function normalizeId(value: unknown): string {
  const raw = asString(value, '');
  return raw.replace(/[^a-zA-Z0-9_-]/g, '');
}

function normalizeColor(value: unknown): string {
  const v = asString(value, '');
  // Keep whatever user provides if it's not empty; UI will validate.
  return v;
}

function tsToIso(value: unknown): string | null {
  return value instanceof admin.firestore.Timestamp ? value.toDate().toISOString() : null;
}

function toApiCategory(doc: admin.firestore.QueryDocumentSnapshot): MindfulnessCategory {
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

// GET /api/mindfulness/categories?activeOnly=&limit=
export async function GET(request: NextRequest) {
  try {
    initFirebase();
    const db = admin.firestore();

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    if (id) {
      const doc = await db.collection(COLLECTION).doc(id).get();
      if (!doc.exists) return NextResponse.json({ category: null }, { status: 404 });
      const data = doc.data() as admin.firestore.DocumentData;
      const createdAt = tsToIso(data.createdAt);
      const updatedAt = tsToIso(data.updatedAt);
      return NextResponse.json({ category: { id: doc.id, ...data, createdAt, updatedAt } });
    }

    const activeOnly = asBool(searchParams.get('activeOnly'), false);
    const limit = Math.min(Math.max(asInt(searchParams.get('limit'), 200), 1), 500);

    let query: admin.firestore.Query = db.collection(COLLECTION);
    if (activeOnly) query = query.where('isActive', '==', true);
    query = query.orderBy('order', 'asc').limit(limit);

    const snapshot = await query.get();
    const categories = snapshot.docs.map(toApiCategory);
    return NextResponse.json({ categories });
  } catch (error: unknown) {
    console.error('Error fetching mindfulness categories:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch mindfulness categories';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/mindfulness/categories
export async function POST(request: NextRequest) {
  try {
    initFirebase();
    const db = admin.firestore();

    const body = (await request.json()) as Record<string, unknown>;
    const id = normalizeId(body.id ?? body.name);
    const name = asString(body.name ?? id, '').toLowerCase();
    const displayName = asString(body.displayName ?? name, '');

    if (!id || !name || !displayName) {
      return NextResponse.json(
        { error: 'id (or name), name, and displayName are required' },
        { status: 400 }
      );
    }

    const docRef = db.collection(COLLECTION).doc(id);
    const now = admin.firestore.FieldValue.serverTimestamp();

    const payload: Record<string, unknown> = {
      id,
      name,
      displayName,
      description: asString(body.description, ''),
      iconName: asString(body.iconName, 'self_improvement'),
      color: normalizeColor(body.color) || '#6C63FF',
      order: asInt(body.order, 0),
      isActive: asBool(body.isActive, true),
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(payload, { merge: true });

    const createdDoc = await docRef.get();
    const data = createdDoc.data() as admin.firestore.DocumentData;
    const createdAt = tsToIso(data.createdAt);
    const updatedAt = tsToIso(data.updatedAt);
    return NextResponse.json({
      success: true,
      category: { id: createdDoc.id, ...data, createdAt, updatedAt },
    });
  } catch (error: unknown) {
    console.error('Error creating mindfulness category:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to create mindfulness category';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/mindfulness/categories
export async function PUT(request: NextRequest) {
  try {
    initFirebase();
    const db = admin.firestore();

    const body = (await request.json()) as Record<string, unknown>;
    const categoryId = asString(body.categoryId ?? body.id, '');
    if (!categoryId) {
      return NextResponse.json({ error: 'categoryId is required' }, { status: 400 });
    }

    const docRef = db.collection(COLLECTION).doc(categoryId);
    const existing = await docRef.get();
    if (!existing.exists) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = { ...body };
    const { categoryId: _categoryId, id: _id, ...rest } = updates;
    void _categoryId;
    void _id;

    const normalized: Record<string, unknown> = { ...rest };
    if ('name' in normalized) normalized.name = asString(normalized.name, '').toLowerCase();
    if ('displayName' in normalized) normalized.displayName = asString(normalized.displayName, '');
    if ('description' in normalized) normalized.description = asString(normalized.description, '');
    if ('iconName' in normalized)
      normalized.iconName = asString(normalized.iconName, 'self_improvement');
    if ('color' in normalized) normalized.color = normalizeColor(normalized.color);
    if ('order' in normalized) normalized.order = asInt(normalized.order, 0);
    if ('isActive' in normalized) normalized.isActive = asBool(normalized.isActive, true);

    normalized.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await docRef.set(normalized, { merge: true });

    const updatedDoc = await docRef.get();
    const data = updatedDoc.data() as admin.firestore.DocumentData;
    const createdAt = tsToIso(data.createdAt);
    const updatedAt = tsToIso(data.updatedAt);
    return NextResponse.json({
      success: true,
      category: { id: updatedDoc.id, ...data, createdAt, updatedAt },
    });
  } catch (error: unknown) {
    console.error('Error updating mindfulness category:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to update mindfulness category';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/mindfulness/categories?categoryId=
export async function DELETE(request: NextRequest) {
  try {
    initFirebase();
    const db = admin.firestore();

    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('categoryId') || searchParams.get('id');
    if (!categoryId) {
      return NextResponse.json({ error: 'categoryId is required' }, { status: 400 });
    }

    const docRef = db.collection(COLLECTION).doc(categoryId);
    const existing = await docRef.get();
    if (!existing.exists) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    await docRef.delete();
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting mindfulness category:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to delete mindfulness category';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

