import { initFirebase } from '@/lib/firebase';
import {
  computeNextUtcForLocalTime,
  loadNotificationRouterConfig,
} from '@/lib/notification_router';
import { dicebearAvatarUrl } from '@/lib/privacy';
import { RESOURCE_TYPES, requirePermission } from '@/lib/rbac';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

type Audience = { mode: 'users'; userIds: string[] } | { mode: 'all' };

type Schedule =
  | { mode: 'now' }
  | { mode: 'at_utc'; atUtc: string }
  | { mode: 'at_user_local'; hour: number; minute: number };

type Recurrence =
  | { mode: 'none' }
  | { mode: 'daily'; occurrences?: number }
  | { mode: 'every_n_days'; intervalDays: number; occurrences?: number }
  | { mode: 'weekdays'; daysOfWeek: number[]; occurrences?: number };

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function normalizeDays(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const days = value
    .map((v) => Number.parseInt(String(v), 10))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 6) as number[];
  return Array.from(new Set(days)).sort((a, b) => a - b);
}

function tsToIso(value: unknown): string | null {
  const ts = value as admin.firestore.Timestamp | undefined;
  if (!ts || typeof ts.toDate !== 'function') return null;
  return ts.toDate().toISOString();
}

function queueDocToItem(d: admin.firestore.QueryDocumentSnapshot) {
  const data = d.data() || {};
  return {
    id: d.id,
    status: data.status || 'pending',
    category: data.category || null,
    type: data.type || null,
    title: data.title || '',
    body: data.body || '',
    recipient_id: data.recipient_id || null,
    sender_id: data.sender_id || null,
    sender_name: data.sender_name || null,
    campaign_kind: data.campaign_kind || null,
    campaign_id: data.campaign_id || null,
    repeat: data.repeat || null,
    interval_days: data.interval_days || null,
    days_of_week: data.days_of_week || null,
    remaining_occurrences: data.remaining_occurrences ?? null,
    scheduled_at: tsToIso(data.scheduled_at),
    created_at: tsToIso(data.created_at),
    updated_at: tsToIso(data.updated_at),
    last_sent_at: tsToIso(data.last_sent_at),
    sent_at: tsToIso(data.sent_at),
    error: data.error || null,
    error_code: data.error_code || null,
    skipped_reason: data.skipped_reason || null,
    retry_after_ms: data.retry_after_ms || null,
  };
}

export async function GET(request: NextRequest) {
  const authCheck = await requirePermission(request, RESOURCE_TYPES.FCM, 'manage');
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    initFirebase();
    const db = admin.firestore();

    const statusRaw = (request.nextUrl.searchParams.get('status') || 'pending').toLowerCase();
    const status = statusRaw === 'all' ? 'all' : statusRaw;
    const allowed = new Set(['pending', 'sent', 'failed', 'skipped', 'all']);
    if (!allowed.has(status)) {
      return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
    }

    const limit = Math.min(
      Math.max(Number.parseInt(request.nextUrl.searchParams.get('limit') || '50', 10) || 50, 1),
      200
    );

    const cursor = request.nextUrl.searchParams.get('cursor');

    let query: admin.firestore.Query = db.collection('notification_queue');
    if (status !== 'all') {
      query = query.where('status', '==', status);
    }
    query = query.orderBy('scheduled_at', 'asc').limit(limit);

    if (cursor) {
      const last = await db.collection('notification_queue').doc(cursor).get();
      if (last.exists) {
        query = query.startAfter(last);
      }
    }

    const snap = await query.get();
    const items = snap.docs.map(queueDocToItem);

    const nextCursor = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1].id : null;
    return NextResponse.json({ items, nextCursor });
  } catch (error: unknown) {
    console.error('notifications/queue GET failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to load queue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: legacy endpoint (kept explicit for admin tooling)
export async function POST(request: NextRequest) {
  const authCheck = await requirePermission(request, RESOURCE_TYPES.FCM, 'manage');
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    initFirebase();
    const db = admin.firestore();
    const config = await loadNotificationRouterConfig(db);
    if (!config.globalEnabled) {
      return NextResponse.json({ error: 'Notifications are globally disabled' }, { status: 409 });
    }

    const body = await request.json();
    const title = String(body?.title || '').trim();
    const messageBody = String(body?.body || '').trim();
    const type = String(body?.type || '').trim();
    const data = body?.data && typeof body.data === 'object' ? body.data : undefined;

    const audience = body?.audience as Audience;
    const schedule = body?.schedule as Schedule;
    const recurrence = body?.recurrence as Recurrence;

    if (!title || !messageBody || !type) {
      return NextResponse.json({ error: 'title, body, and type are required' }, { status: 400 });
    }

    if (!audience || !audience.mode) {
      return NextResponse.json({ error: 'audience is required' }, { status: 400 });
    }

    if (!schedule || !schedule.mode) {
      return NextResponse.json({ error: 'schedule is required' }, { status: 400 });
    }

    if (schedule.mode === 'at_user_local') {
      const { hour, minute } = schedule;
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
        return NextResponse.json(
          { error: 'schedule.hour and schedule.minute must be numbers for at_user_local' },
          { status: 400 }
        );
      }
    }

    const category = String(body?.category || 'admin');
    const senderName = String(body?.sender_name || 'IKI Admin').trim() || 'IKI Admin';
    const senderAvatar =
      String(body?.sender_avatar || '').trim() || dicebearAvatarUrl('iki_admin');

    // Build recipients list or broadcast job
    if (audience.mode === 'all') {
      const ref = await db.collection('notification_broadcasts').add({
        status: 'pending',
        category,
        title,
        body: messageBody,
        type,
        data: data || {},
        sender_name: senderName,
        sender_avatar: senderAvatar,
        schedule,
        recurrence: recurrence || { mode: 'none' },
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        batch_size: 300,
        cursor_last_doc_id: null,
        total_enqueued: 0,
      });
      return NextResponse.json({ ok: true, mode: 'broadcast', broadcastId: ref.id });
    }

    const userIds = Array.from(
      new Set((audience.userIds || []).map((s) => String(s).trim()).filter(Boolean))
    );
    if (userIds.length === 0) {
      return NextResponse.json({ error: 'No users selected' }, { status: 400 });
    }

    const now = new Date();
    let created = 0;

    // Batch-load user docs (tz offsets) + batch-write queue docs.
    for (const group of chunk(userIds, 400)) {
      const refs = group.map((uid) => db.collection('users').doc(uid));
      const snaps = await db.getAll(...refs);

      const batch = db.batch();
      for (const userSnap of snaps) {
        if (!userSnap.exists) continue;
        const userId = userSnap.id;
        const ud = userSnap.data() || {};
        const tzOffsetMinutes =
          typeof ud.tz_offset_minutes === 'number' ? ud.tz_offset_minutes : 0;

        let scheduledAt = now;
        if (schedule.mode === 'at_utc') {
          const dt = new Date(schedule.atUtc);
          if (Number.isNaN(dt.getTime())) {
            return NextResponse.json({ error: 'Invalid schedule.atUtc' }, { status: 400 });
          }
          scheduledAt = dt;
        } else if (schedule.mode === 'at_user_local') {
          scheduledAt = computeNextUtcForLocalTime({
            now,
            tzOffsetMinutes,
            hour: clamp(schedule.hour, 0, 23),
            minute: clamp(schedule.minute, 0, 59),
          });
        }

        const qref = db.collection('notification_queue').doc();
        const base: Record<string, unknown> = {
          category,
          type,
          title,
          body: messageBody,
          recipient_id: userId,
          sender_name: senderName,
          sender_avatar: senderAvatar,
          data: data || {},
          status: 'pending',
          scheduled_at: admin.firestore.Timestamp.fromDate(scheduledAt),
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
          tz_offset_minutes: tzOffsetMinutes,
          dedupe_key: `admin:${qref.id}`,
          dedupe_window_ms: 2 * 60_000,
        };
        if (schedule.mode === 'at_user_local') {
          base.hour = clamp(schedule.hour, 0, 23);
          base.minute = clamp(schedule.minute, 0, 59);
        }

        const rec = recurrence || { mode: 'none' };
        if (rec.mode !== 'none') {
          base.repeat =
            rec.mode === 'daily'
              ? 'daily'
              : rec.mode === 'every_n_days'
                ? 'every_n_days'
                : 'weekdays';
          if (rec.mode === 'every_n_days')
            base.interval_days = Math.max(1, Math.floor(rec.intervalDays || 1));
          if (rec.mode === 'weekdays') base.days_of_week = normalizeDays(rec.daysOfWeek);
          const occ =
            typeof rec.occurrences === 'number'
              ? Math.max(1, Math.floor(rec.occurrences))
              : undefined;
          if (occ) base.remaining_occurrences = occ;
        }

        batch.set(qref, base, { merge: true });
        created++;
      }

      await batch.commit();
    }

    return NextResponse.json({ ok: true, mode: 'users', created });
  } catch (error: unknown) {
    console.error('notifications/queue failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to enqueue notifications';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

