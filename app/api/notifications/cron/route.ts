import { initFirebase } from '@/lib/firebase';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';
import {
  ensureEngagementSchedulesForRecentUsers,
  loadNotificationRouterConfig,
  processQueueBatch,
} from '@/lib/notification_router';

function requireCronSecret(request: NextRequest): NextResponse | null {
  const expected = process.env.NOTIFICATIONS_CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: 'NOTIFICATIONS_CRON_SECRET is not configured' },
      { status: 500 }
    );
  }
  const got =
    request.headers.get('x-cron-secret') ||
    request.headers.get('x-notifications-cron-secret') ||
    '';
  if (got !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function POST(request: NextRequest) {
  const authFail = requireCronSecret(request);
  if (authFail) return authFail;

  const task = (request.nextUrl.searchParams.get('task') || 'all').toLowerCase();
  const limit = Math.min(
    Math.max(parseInt(request.nextUrl.searchParams.get('limit') || '100', 10) || 100, 1),
    500
  );

  try {
    initFirebase();
    const db = admin.firestore();
    const messaging = admin.messaging();
    const config = await loadNotificationRouterConfig(db);

    // Allow infra to keep calling this endpoint on a schedule,
    // but make the actual work opt-in via config so marketers
    // can turn automation on/off from the admin UI.
    if (!config.autoCronEnabled) {
      return NextResponse.json(
        {
          ok: true,
          task,
          skipped: true,
          reason: 'Automation disabled in notification config (autoCronEnabled=false)',
        },
        { status: 200 }
      );
    }

    const results: Record<string, unknown> = {};

    async function processBroadcasts(batchSize: number) {
      const now = admin.firestore.Timestamp.fromDate(new Date());
      const broadcastsSnap = await db
        .collection('notification_broadcasts')
        .where('status', '==', 'pending')
        .limit(5)
        .get();

      let processed = 0;
      let expanded = 0;

      for (const b of broadcastsSnap.docs) {
        processed++;
        const bd = b.data() || {};
        const schedule = bd.schedule || { mode: 'now' };
        const recurrence = bd.recurrence || { mode: 'none' };

        // Determine if broadcast is eligible to expand.
        let eligible = true;
        if (schedule.mode === 'at_utc') {
          const at = new Date(String(schedule.atUtc || ''));
          if (Number.isNaN(at.getTime())) {
            await b.ref.set(
              { status: 'failed', error: 'Invalid schedule.atUtc', updated_at: admin.firestore.FieldValue.serverTimestamp() },
              { merge: true }
            );
            continue;
          }
          if (admin.firestore.Timestamp.fromDate(at).toMillis() > now.toMillis()) {
            eligible = false;
          }
        }
        if (!eligible) continue;

        const cursorLastDocId = bd.cursor_last_doc_id as string | null;
        const queryLimit = Math.min(
          Math.max(parseInt(String(bd.batch_size || batchSize), 10) || batchSize, 50),
          500
        );

        let userQuery = db.collection('users').orderBy('time', 'desc').limit(queryLimit);
        if (cursorLastDocId) {
          const lastDoc = await db.collection('users').doc(cursorLastDocId).get();
          if (lastDoc.exists) {
            userQuery = userQuery.startAfter(lastDoc);
          }
        }

        const usersSnap = await userQuery.get();
        if (usersSnap.empty) {
          await b.ref.set(
            { status: 'completed', updated_at: admin.firestore.FieldValue.serverTimestamp() },
            { merge: true }
          );
          continue;
        }

        const title = String(bd.title || '').trim();
        const body = String(bd.body || '').trim();
        const type = String(bd.type || '').trim();
        const category = String(bd.category || 'admin');
        const data = (bd.data && typeof bd.data === 'object') ? bd.data : {};

        if (!title || !body || !type) {
          await b.ref.set(
            { status: 'failed', error: 'Missing title/body/type', updated_at: admin.firestore.FieldValue.serverTimestamp() },
            { merge: true }
          );
          continue;
        }

        const batch = db.batch();
        let created = 0;
        for (const u of usersSnap.docs) {
          const userId = u.id;
          const ud = u.data() || {};
          const tzOffsetMinutes = typeof ud.tz_offset_minutes === 'number' ? ud.tz_offset_minutes : 0;

          let scheduledAt = new Date();
          if (schedule.mode === 'at_utc') {
            scheduledAt = new Date(String(schedule.atUtc));
          } else if (schedule.mode === 'at_user_local') {
            const hour = Math.min(Math.max(parseInt(String(schedule.hour ?? 8), 10) || 8, 0), 23);
            const minute = Math.min(Math.max(parseInt(String(schedule.minute ?? 0), 10) || 0, 0), 59);
            // Use the same helper as router file (re-implemented locally to avoid import cycles).
            const nowDate = new Date();
            const nowUtcMs = nowDate.getTime();
            const nowLocalMs = nowUtcMs + tzOffsetMinutes * 60_000;
            const nowLocal = new Date(nowLocalMs);
            let candidateLocal = new Date(
              Date.UTC(nowLocal.getUTCFullYear(), nowLocal.getUTCMonth(), nowLocal.getUTCDate(), hour, minute, 0, 0)
            );
            if (candidateLocal.getTime() <= nowLocal.getTime()) {
              candidateLocal = new Date(candidateLocal.getTime() + 24 * 60 * 60_000);
            }
            scheduledAt = new Date(candidateLocal.getTime() - tzOffsetMinutes * 60_000);
          }

          const qref = db.collection('notification_queue').doc();
          const docPayload: any = {
            category,
            type,
            title,
            body,
            recipient_id: userId,
            data,
            campaign_kind: 'broadcast',
            campaign_id: b.id,
            status: 'pending',
            scheduled_at: admin.firestore.Timestamp.fromDate(scheduledAt),
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            tz_offset_minutes: tzOffsetMinutes,
            hour: schedule.mode === 'at_user_local' ? schedule.hour : undefined,
            minute: schedule.mode === 'at_user_local' ? schedule.minute : undefined,
            dedupe_key: `broadcast:${b.id}:${userId}`,
            dedupe_window_ms: 2 * 60_000,
          };

          if (recurrence && recurrence.mode && recurrence.mode !== 'none') {
            docPayload.repeat =
              recurrence.mode === 'daily'
                ? 'daily'
                : recurrence.mode === 'every_n_days'
                  ? 'every_n_days'
                  : 'weekdays';
            if (recurrence.mode === 'every_n_days') {
              docPayload.interval_days = Math.max(1, parseInt(String(recurrence.intervalDays || 1), 10) || 1);
            }
            if (recurrence.mode === 'weekdays') {
              const raw = Array.isArray(recurrence.daysOfWeek) ? recurrence.daysOfWeek : [];
              docPayload.days_of_week = raw;
            }
            if (typeof recurrence.occurrences === 'number') {
              docPayload.remaining_occurrences = Math.max(1, Math.floor(recurrence.occurrences));
            }
          }

          batch.set(qref, docPayload, { merge: true });
          created++;
        }

        await batch.commit();
        expanded += created;

        const lastDocId = usersSnap.docs[usersSnap.docs.length - 1].id;
        await b.ref.set(
          {
            cursor_last_doc_id: lastDocId,
            total_enqueued: (bd.total_enqueued || 0) + created,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      return { processed, expanded };
    }

    if (task === 'all' || task === 'schedule') {
      results.schedule = await ensureEngagementSchedulesForRecentUsers({
        db,
        limit: Math.min(limit, 200),
        config,
      });
    }

    if (task === 'all' || task === 'broadcasts') {
      results.broadcasts = await processBroadcasts(Math.min(limit, 300));
    }

    if (task === 'all' || task === 'process') {
      results.process = await processQueueBatch({
        db,
        messaging,
        limit,
        config,
      });
    }

    return NextResponse.json({ ok: true, task, ...results });
  } catch (error: unknown) {
    console.error('notifications/cron failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to run notifications cron';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}




