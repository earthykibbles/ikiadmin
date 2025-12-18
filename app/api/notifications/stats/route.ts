import { initFirebase } from '@/lib/firebase';
import { RESOURCE_TYPES, requirePermission } from '@/lib/rbac';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { getQueueStats, loadNotificationRouterConfig } from '@/lib/notification_router';

export async function GET(request: NextRequest) {
  const authCheck = await requirePermission(request, RESOURCE_TYPES.FCM, 'manage');
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    initFirebase();
    const db = admin.firestore();
    const [stats, config] = await Promise.all([getQueueStats(db), loadNotificationRouterConfig(db)]);
    return NextResponse.json({
      stats,
      configSummary: {
        globalEnabled: config.globalEnabled,
        processingEnabled: config.processingEnabled,
        autoCronEnabled: config.autoCronEnabled,
        connectEnabled: config.connect.enabled,
        engagementEnabled: config.engagement.enabled,
        firstTimeEnabled: config.engagement.firstTimeEnabled,
        recurringEnabled: config.engagement.recurringEnabled,
      },
    });
  } catch (error: unknown) {
    console.error('notifications/stats failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to load notification stats';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}




