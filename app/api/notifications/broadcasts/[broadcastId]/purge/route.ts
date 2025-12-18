import { initFirebase } from '@/lib/firebase';
import { RESOURCE_TYPES, requirePermission } from '@/lib/rbac';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
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

    const limit = Math.min(
      Math.max(parseInt(request.nextUrl.searchParams.get('limit') || '300', 10) || 300, 1),
      400
    );

    const snap = await db
      .collection('notification_queue')
      .where('campaign_kind', '==', 'broadcast')
      .where('campaign_id', '==', broadcastId)
      .where('status', '==', 'pending')
      .orderBy('scheduled_at', 'asc')
      .limit(limit)
      .get();

    if (snap.empty) {
      return NextResponse.json({ ok: true, updated: 0 });
    }

    const batch = db.batch();
    for (const d of snap.docs) {
      batch.set(
        d.ref,
        {
          status: 'skipped',
          skipped_reason: 'broadcast_cancelled',
          repeat: admin.firestore.FieldValue.delete(),
          interval_days: admin.firestore.FieldValue.delete(),
          days_of_week: admin.firestore.FieldValue.delete(),
          remaining_occurrences: admin.firestore.FieldValue.delete(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
    await batch.commit();

    return NextResponse.json({ ok: true, updated: snap.size });
  } catch (error: unknown) {
    console.error('notifications/broadcasts purge failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to purge broadcast queue items';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



