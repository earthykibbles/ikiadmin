import { auth } from '@/lib/auth';
import { initFirebase } from '@/lib/firebase';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

const COLLECTION = 'admin_profiles';

function sanitizeString(value: unknown, maxLength = 200): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.slice(0, maxLength);
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    initFirebase();
    const db = admin.firestore();
    const docRef = db.collection(COLLECTION).doc(session.user.id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({
        fullName: session.user.name || '',
        phone: '',
        organization: '',
        jobTitle: '',
      });
    }

    const data = snap.data() || {};

    return NextResponse.json({
      fullName: sanitizeString(data.fullName ?? session.user.name ?? ''),
      phone: sanitizeString(data.phone),
      organization: sanitizeString(data.organization),
      jobTitle: sanitizeString(data.jobTitle),
    });
  } catch (error: unknown) {
    console.error('Error loading admin profile:', error);
    const message = error instanceof Error ? error.message : 'Failed to load profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const update: Record<string, string> = {};

    if ('phone' in body) {
      update.phone = sanitizeString(body.phone, 100);
    }
    if ('organization' in body) {
      update.organization = sanitizeString(body.organization, 200);
    }
    if ('jobTitle' in body) {
      update.jobTitle = sanitizeString(body.jobTitle, 150);
    }
    if ('fullName' in body) {
      update.fullName = sanitizeString(body.fullName, 150);
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    initFirebase();
    const db = admin.firestore();
    const docRef = db.collection(COLLECTION).doc(session.user.id);

    await docRef.set(
      {
        ...update,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error updating admin profile:', error);
    const message = error instanceof Error ? error.message : 'Failed to update profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
