import { initFirebase } from '@/lib/firebase';
import { RESOURCE_TYPES, requirePermission } from '@/lib/rbac';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ queueId: string }> }
) {
  const authCheck = await requirePermission(request, RESOURCE_TYPES.FCM, 'manage');
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const { queueId } = await params;
  try {
    initFirebase();
    const db = admin.firestore();
    const ref = db.collection('notification_queue').doc(queueId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = String(body?.reason || 'manual_removed').trim() || 'manual_removed';

    await ref.set(
      {
        status: 'skipped',
        skipped_reason: reason,
        removed_at: admin.firestore.FieldValue.serverTimestamp(),
        // Stop any recurrence on manual remove.
        repeat: admin.firestore.FieldValue.delete(),
        interval_days: admin.firestore.FieldValue.delete(),
        days_of_week: admin.firestore.FieldValue.delete(),
        remaining_occurrences: admin.firestore.FieldValue.delete(),
        end_at: admin.firestore.FieldValue.delete(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('notifications/queue/[queueId] PATCH failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to update queue item';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

