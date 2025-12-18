import { initFirebase } from '@/lib/firebase';
import { RESOURCE_TYPES, requirePermission } from '@/lib/rbac';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';
import {
  DEFAULT_NOTIFICATION_ROUTER_CONFIG,
  loadNotificationRouterConfig,
  saveNotificationRouterConfig,
} from '@/lib/notification_router';

export async function GET(request: NextRequest) {
  const authCheck = await requirePermission(request, RESOURCE_TYPES.FCM, 'manage');
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    initFirebase();
    const db = admin.firestore();
    const config = await loadNotificationRouterConfig(db);
    return NextResponse.json({ config });
  } catch (error: unknown) {
    console.error('notifications/config GET failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to load notification config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authCheck = await requirePermission(request, RESOURCE_TYPES.FCM, 'manage');
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    initFirebase();
    const db = admin.firestore();
    const body = await request.json();

    // Allow either {config: ...} or direct patch payload.
    const patch = (body?.config ?? body) as Record<string, unknown>;
    if (!patch || typeof patch !== 'object') {
      return NextResponse.json({ error: 'Invalid config payload' }, { status: 400 });
    }

    await saveNotificationRouterConfig(db, patch as any);
    const config = await loadNotificationRouterConfig(db);

    // Ensure the doc exists with defaults if empty patch
    if (!config) {
      await saveNotificationRouterConfig(db, DEFAULT_NOTIFICATION_ROUTER_CONFIG);
    }

    return NextResponse.json({ ok: true, config });
  } catch (error: unknown) {
    console.error('notifications/config PUT failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to save notification config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}




