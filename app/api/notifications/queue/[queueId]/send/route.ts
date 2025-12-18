import { initFirebase } from '@/lib/firebase';
import { loadNotificationRouterConfig, processQueueItemById } from '@/lib/notification_router';
import { RESOURCE_TYPES, requirePermission } from '@/lib/rbac';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
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
    const messaging = admin.messaging();
    const config = await loadNotificationRouterConfig(db);

    const body = await request.json().catch(() => ({}));
    const force = Boolean(body?.force ?? true);

    const result = await processQueueItemById({
      db,
      messaging,
      config,
      queueId,
      force,
    });

    if (!result.ok) {
      const status = result.paused
        ? 409
        : String(result.message || '').includes('not found')
          ? 404
          : 409;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('notifications/queue/[queueId]/send POST failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to send queue item';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

