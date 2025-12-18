import { initFirebase } from '@/lib/firebase';
import { RESOURCE_TYPES, requirePermission } from '@/lib/rbac';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

function tsToIso(value: unknown): string | null {
  const ts = value as admin.firestore.Timestamp | undefined;
  if (!ts || typeof ts.toDate !== 'function') return null;
  return ts.toDate().toISOString();
}

export async function GET(request: NextRequest) {
  const authCheck = await requirePermission(request, RESOURCE_TYPES.FCM, 'manage');
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    initFirebase();
    const db = admin.firestore();
    const limit = Math.min(
      Math.max(parseInt(request.nextUrl.searchParams.get('limit') || '30', 10) || 30, 1),
      100
    );

    const snap = await db
      .collection('notification_broadcasts')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .get();

    const broadcasts = snap.docs.map((d) => {
      const data = d.data() || {};
      return {
        id: d.id,
        status: data.status || 'pending',
        category: data.category || 'admin',
        title: data.title || '',
        body: data.body || '',
        type: data.type || '',
        schedule: data.schedule || null,
        recurrence: data.recurrence || null,
        batch_size: data.batch_size || null,
        cursor_last_doc_id: data.cursor_last_doc_id || null,
        total_enqueued: data.total_enqueued || 0,
        created_at: tsToIso(data.created_at),
        updated_at: tsToIso(data.updated_at),
        completed_at: tsToIso(data.completed_at),
        cancelled_at: tsToIso(data.cancelled_at),
        error: data.error || null,
      };
    });

    return NextResponse.json({ broadcasts });
  } catch (error: unknown) {
    console.error('notifications/broadcasts GET failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to load broadcasts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



