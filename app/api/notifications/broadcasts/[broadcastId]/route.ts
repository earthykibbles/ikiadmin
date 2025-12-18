import { initFirebase } from '@/lib/firebase';
import { RESOURCE_TYPES, requirePermission } from '@/lib/rbac';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ broadcastId: string }> }
) {
  const authCheck = await requirePermission(request, RESOURCE_TYPES.FCM, 'manage');
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const { broadcastId } = await params;
  try {
    initFirebase();
    const db = admin.firestore();
    const ref = db.collection('notification_broadcasts').doc(broadcastId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 });
    }

    const body = await request.json();
    const status = body?.status ? String(body.status) : null;
    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 });
    }

    const allowed = new Set(['pending', 'cancelled', 'completed', 'failed']);
    if (!allowed.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const update: Record<string, unknown> = {
      status,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (status === 'cancelled') {
      update.cancelled_at = admin.firestore.FieldValue.serverTimestamp();
    }
    if (status === 'completed') {
      update.completed_at = admin.firestore.FieldValue.serverTimestamp();
    }

    await ref.set(update, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('notifications/broadcasts PATCH failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to update broadcast';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



