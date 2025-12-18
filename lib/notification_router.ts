import admin from 'firebase-admin';

export type EngagementFeatureKey =
  | 'water'
  | 'daily_checkin'
  | 'mood'
  | 'meal_tracking'
  | 'journal'
  | 'gratitude';

export type NotificationRouterConfig = {
  globalEnabled: boolean;
  processingEnabled: boolean;
  /**
   * If false, the automated cron endpoint will be a no-op.
   * Manual runs from the admin UI are still allowed.
   */
  autoCronEnabled: boolean;

  connect: {
    enabled: boolean;
    // ms cooldown per (sender, recipient, type)
    rateLimitsMs: Record<string, number>;
    blockedSenders: string[]; // user IDs whose outbound Connect pushes are ignored
  };

  engagement: {
    enabled: boolean;
    firstTimeEnabled: boolean;
    recurringEnabled: boolean;
    // Local-clock schedule for both intros + recurring ads
    schedule: Record<EngagementFeatureKey, { hour: number; minute: number }>;
    templates: {
      intro: Record<EngagementFeatureKey, { title: string; body: string }>;
      recurring: Record<EngagementFeatureKey, { title: string; body: string }>;
    };
    recurringRules: Record<
      EngagementFeatureKey,
      {
        // How it repeats once created. (Intro is always one-off.)
        repeat: 'daily' | 'every_n_days' | 'weekdays';
        intervalDays?: number; // repeat=every_n_days
        daysOfWeek?: number[]; // repeat=weekdays (0=Sun..6=Sat)
        occurrences?: number | null; // optional cap (e.g. next 7 sends)
      }
    >;
  };
};

export const DEFAULT_NOTIFICATION_ROUTER_CONFIG: NotificationRouterConfig = {
  globalEnabled: true,
  processingEnabled: true,
  autoCronEnabled: true,
  connect: {
    enabled: true,
    rateLimitsMs: {
      connect_comment: 60_000,
      connect_general: 5 * 60_000,
      connect_friend_request: 10 * 60_000,
    },
    blockedSenders: [],
  },
  engagement: {
    enabled: true,
    firstTimeEnabled: true,
    recurringEnabled: true,
    schedule: {
      water: { hour: 8, minute: 0 },
      daily_checkin: { hour: 9, minute: 0 },
      mood: { hour: 10, minute: 0 },
      meal_tracking: { hour: 12, minute: 0 },
      journal: { hour: 20, minute: 0 },
      gratitude: { hour: 21, minute: 0 },
    },
    templates: {
      intro: {
        water: {
          title: 'Stay Hydrated 💧',
          body: 'Track your water intake! Start with a glass of water and build a healthy habit.',
        },
        daily_checkin: {
          title: 'Daily Wellness Check 🏥',
          body: 'Quick daily check-in! Track your sleep, energy, and overall wellbeing.',
        },
        mood: {
          title: 'How Are You Feeling? 🌈',
          body: 'Track your mood throughout the day. It helps you understand your emotional patterns!',
        },
        meal_tracking: {
          title: 'Track Your Meals 🍎',
          body: 'Good nutrition is key to wellness. Start logging your meals to build healthy eating habits!',
        },
        journal: {
          title: 'Start Journaling ✍️',
          body: 'Writing helps you process your thoughts and emotions. Try your first journal entry!',
        },
        gratitude: {
          title: 'Practice Gratitude 🙏',
          body: 'What are you grateful for today? Gratitude practice boosts happiness and wellbeing!',
        },
      },
      recurring: {
        water: {
          title: 'Stay Hydrated 💧',
          body: "Don't forget to track your water intake today!",
        },
        daily_checkin: {
          title: 'Daily Wellness Check 🏥',
          body: 'How are you feeling today? Take a moment for your daily check-in!',
        },
        mood: {
          title: 'How Are You Feeling? 🌈',
          body: 'Track your mood to understand your emotional patterns better!',
        },
        meal_tracking: {
          title: 'Track Your Meals 🍎',
          body: 'Log your meals to build healthy eating habits!',
        },
        journal: {
          title: 'Journal Time ✍️',
          body: 'Reflect on your day and process your thoughts through journaling!',
        },
        gratitude: {
          title: 'Gratitude Moment 🙏',
          body: 'What are you grateful for today? Practice gratitude for better wellbeing!',
        },
      },
    },
    recurringRules: {
      water: { repeat: 'daily' },
      daily_checkin: { repeat: 'daily' },
      mood: { repeat: 'daily' },
      meal_tracking: { repeat: 'daily' },
      journal: { repeat: 'daily' },
      gratitude: { repeat: 'daily' },
    },
  },
};

export function notificationConfigRef(db: admin.firestore.Firestore) {
  return db.collection('notification_config').doc('global');
}

export async function loadNotificationRouterConfig(
  db: admin.firestore.Firestore
): Promise<NotificationRouterConfig> {
  const snap = await notificationConfigRef(db).get();
  if (!snap.exists) return DEFAULT_NOTIFICATION_ROUTER_CONFIG;
  const data = snap.data() || {};

  // Shallow merge with defaults to handle partial docs safely.
  return {
    ...DEFAULT_NOTIFICATION_ROUTER_CONFIG,
    ...data,
    connect: {
      ...DEFAULT_NOTIFICATION_ROUTER_CONFIG.connect,
      ...(data.connect || {}),
      rateLimitsMs: {
        ...DEFAULT_NOTIFICATION_ROUTER_CONFIG.connect.rateLimitsMs,
        ...((data.connect?.rateLimitsMs) || {}),
      },
      blockedSenders: Array.isArray(data.connect?.blockedSenders)
        ? (data.connect.blockedSenders as string[])
        : DEFAULT_NOTIFICATION_ROUTER_CONFIG.connect.blockedSenders,
    },
    engagement: {
      ...DEFAULT_NOTIFICATION_ROUTER_CONFIG.engagement,
      ...(data.engagement || {}),
      schedule: {
        ...DEFAULT_NOTIFICATION_ROUTER_CONFIG.engagement.schedule,
        ...((data.engagement?.schedule) || {}),
      },
      templates: {
        intro: {
          ...DEFAULT_NOTIFICATION_ROUTER_CONFIG.engagement.templates.intro,
          ...((data.engagement?.templates?.intro) || {}),
        },
        recurring: {
          ...DEFAULT_NOTIFICATION_ROUTER_CONFIG.engagement.templates.recurring,
          ...((data.engagement?.templates?.recurring) || {}),
        },
      },
      recurringRules: {
        ...DEFAULT_NOTIFICATION_ROUTER_CONFIG.engagement.recurringRules,
        ...((data.engagement?.recurringRules) || {}),
      },
    },
  } as NotificationRouterConfig;
}

export async function saveNotificationRouterConfig(
  db: admin.firestore.Firestore,
  patch: Partial<NotificationRouterConfig>
) {
  await notificationConfigRef(db).set(
    {
      ...patch,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export function stringifyData(input: Record<string, unknown> | undefined): Record<string, string> {
  if (!input) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || v === null) continue;
    out[k] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  return out;
}

export function computeNextUtcForLocalTime(params: {
  now: Date;
  tzOffsetMinutes: number;
  hour: number;
  minute: number;
}): Date {
  const { now, tzOffsetMinutes, hour, minute } = params;
  const nowUtcMs = now.getTime();
  const nowLocalMs = nowUtcMs + tzOffsetMinutes * 60_000;
  const nowLocal = new Date(nowLocalMs);

  const candidateLocal = new Date(
    Date.UTC(
      nowLocal.getUTCFullYear(),
      nowLocal.getUTCMonth(),
      nowLocal.getUTCDate(),
      hour,
      minute,
      0,
      0
    )
  );

  let scheduledLocal = candidateLocal;
  if (scheduledLocal.getTime() <= nowLocal.getTime()) {
    scheduledLocal = new Date(scheduledLocal.getTime() + 24 * 60 * 60_000);
  }

  const scheduledUtcMs = scheduledLocal.getTime() - tzOffsetMinutes * 60_000;
  return new Date(scheduledUtcMs);
}

export async function getQueueStats(db: admin.firestore.Firestore) {
  const col = db.collection('notification_queue');

  async function countWhere(field: string, op: admin.firestore.WhereFilterOp, value: unknown) {
    try {
      // Aggregate count (preferred)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agg = (col.where(field, op, value) as any).count();
      const snap = await agg.get();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (snap.data() as any).count as number;
    } catch {
      // Fallback (bounded)
      const snap = await col.where(field, op, value).limit(1000).get();
      return snap.size;
    }
  }

  const [pending, sent, failed, skipped] = await Promise.all([
    countWhere('status', '==', 'pending'),
    countWhere('status', '==', 'sent'),
    countWhere('status', '==', 'failed'),
    countWhere('status', '==', 'skipped'),
  ]);

  return { pending, sent, failed, skipped };
}

export type QueueDoc = {
  category?: string;
  type?: string;
  title?: string;
  body?: string;
  recipient_id?: string;
  sender_id?: string;
  sender_name?: string;
  sender_avatar?: string;
  data?: Record<string, unknown>;
  dedupe_key?: string;
  dedupe_window_ms?: number;
  status?: 'pending' | 'sent' | 'failed' | 'skipped';
  scheduled_at?: admin.firestore.Timestamp;
  repeat?: 'daily' | 'every_n_days' | 'weekdays';
  interval_days?: number;
  days_of_week?: number[];
  remaining_occurrences?: number;
  end_at?: admin.firestore.Timestamp;
  hour?: number;
  minute?: number;
  tz_offset_minutes?: number;
  last_sent_at?: admin.firestore.Timestamp;
};

function normalizeDayOfWeekList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const days = value
    .map((v) => Number.parseInt(String(v), 10))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 6) as number[];
  return Array.from(new Set(days)).sort((a, b) => a - b);
}

function computeNextUtcForWeekdays(params: {
  now: Date;
  tzOffsetMinutes: number;
  hour: number;
  minute: number;
  daysOfWeek: number[]; // 0=Sun..6=Sat
}): Date {
  const { now, tzOffsetMinutes, hour, minute, daysOfWeek } = params;
  const days = normalizeDayOfWeekList(daysOfWeek);
  if (days.length === 0) {
    return computeNextUtcForLocalTime({ now, tzOffsetMinutes, hour, minute });
  }

  // Convert now to "local-as-UTC"
  const nowUtcMs = now.getTime();
  const nowLocalMs = nowUtcMs + tzOffsetMinutes * 60_000;
  const nowLocal = new Date(nowLocalMs);

  // Candidate at today's local clock time
  let candidateLocal = new Date(
    Date.UTC(
      nowLocal.getUTCFullYear(),
      nowLocal.getUTCMonth(),
      nowLocal.getUTCDate(),
      hour,
      minute,
      0,
      0
    )
  );

  // If candidate time already passed in local, start checking from tomorrow
  if (candidateLocal.getTime() <= nowLocal.getTime()) {
    candidateLocal = new Date(candidateLocal.getTime() + 24 * 60 * 60_000);
  }

  // Iterate up to 7 days to find next allowed weekday
  for (let i = 0; i < 7; i++) {
    const weekday = candidateLocal.getUTCDay(); // local-as-UTC day
    if (days.includes(weekday)) {
      const candidateUtcMs = candidateLocal.getTime() - tzOffsetMinutes * 60_000;
      return new Date(candidateUtcMs);
    }
    candidateLocal = new Date(candidateLocal.getTime() + 24 * 60 * 60_000);
  }

  // Fallback
  return computeNextUtcForLocalTime({ now, tzOffsetMinutes, hour, minute });
}

async function getUserToken(db: admin.firestore.Firestore, userId: string) {
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return null;
  const data = userDoc.data() || {};
  const token = (data.fcm_token || data.fcmToken || data.device_token) as string | undefined;
  if (!token || typeof token !== 'string' || !token.trim()) return null;
  return token;
}

async function clearUserToken(db: admin.firestore.Firestore, userId: string) {
  await db.collection('users').doc(userId).set(
    {
      fcm_token: admin.firestore.FieldValue.delete(),
      fcmToken: admin.firestore.FieldValue.delete(),
      device_token: admin.firestore.FieldValue.delete(),
      fcm_token_invalidated_at: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

async function rateLimitConnectIfNeeded(params: {
  db: admin.firestore.Firestore;
  senderId: string;
  recipientId: string;
  type: string;
  cooldownMs: number;
}): Promise<{ allowed: true } | { allowed: false; retryAfterMs: number }> {
  const { db, senderId, recipientId, type, cooldownMs } = params;
  const docRef = db
    .collection('connect_notification_rate_limits')
    .doc(`${senderId}-${recipientId}`);

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    const data = snap.data() || {};
    const last = data[type] as admin.firestore.Timestamp | undefined;
    const now = new Date();

    if (last?.toDate) {
      const lastDate = last.toDate();
      const diff = now.getTime() - lastDate.getTime();
      if (diff < cooldownMs) {
        return { allowed: false as const, retryAfterMs: cooldownMs - diff };
      }
    }

    tx.set(
      docRef,
      {
        [type]: admin.firestore.Timestamp.fromDate(now),
        updated_at: admin.firestore.Timestamp.fromDate(now),
        sender_id: senderId,
        recipient_id: recipientId,
      },
      { merge: true }
    );

    return { allowed: true as const };
  });

  return result;
}

type ProcessQueueDocOutcome = {
  outcome: 'sent' | 'failed' | 'skipped' | 'deferred';
  countedAs: 'sent' | 'failed' | 'skipped';
  message?: string;
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: main router logic is intentionally explicit
async function processQueueDoc(params: {
  db: admin.firestore.Firestore;
  messaging: admin.messaging.Messaging;
  config: NotificationRouterConfig;
  ref: admin.firestore.DocumentReference;
  payload: QueueDoc;
}): Promise<ProcessQueueDocOutcome> {
  const { db, messaging, config, ref, payload } = params;
  const category = (payload.category || '').toString();
  const type = (payload.type || '').toString();
  const title = (payload.title || '').toString();
  const body = (payload.body || '').toString();
  const recipientId = (payload.recipient_id || '').toString();
  const senderId = (payload.sender_id || '').toString();

  // Category gates (leave pending when disabled)
  if (category === 'connect' && !config.connect.enabled) {
    return { outcome: 'deferred', countedAs: 'skipped', message: 'Connect processing disabled' };
  }
  if (category === 'engagement' && !config.engagement.enabled) {
    return { outcome: 'deferred', countedAs: 'skipped', message: 'Engagement processing disabled' };
  }

  // Block notorious Connect senders (server-side control)
  if (
    category === 'connect' &&
    senderId &&
    Array.isArray(config.connect.blockedSenders) &&
    config.connect.blockedSenders.includes(senderId)
  ) {
    await ref.set(
      {
        status: 'skipped',
        skipped_reason: 'blocked_sender',
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return { outcome: 'skipped', countedAs: 'skipped', message: 'Blocked sender' };
  }

  if (!type || !title || !body || !recipientId) {
    await ref.set(
      {
        status: 'failed',
        error: 'Missing required fields (type/title/body/recipient_id)',
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return { outcome: 'failed', countedAs: 'failed', message: 'Missing required fields' };
  }

  // Dedupe (time-windowed)
  const dedupeKey = (payload.dedupe_key || '').toString().trim();
  const dedupeWindowMs =
    typeof payload.dedupe_window_ms === 'number' ? payload.dedupe_window_ms : 0;
  if (dedupeKey && dedupeWindowMs > 0) {
    const dedupeRef = db.collection('notification_dedupe').doc(dedupeKey);
    const existing = await dedupeRef.get();
    if (existing.exists) {
      const sentAt = existing.get('sent_at') as admin.firestore.Timestamp | undefined;
      if (sentAt?.toDate) {
        const ageMs = Date.now() - sentAt.toDate().getTime();
        if (ageMs >= 0 && ageMs < dedupeWindowMs) {
          await ref.set(
            {
              status: 'skipped',
              skipped_reason: 'deduped',
              updated_at: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          return { outcome: 'skipped', countedAs: 'skipped', message: 'Deduped' };
        }
      }
    }
  }

  // Connect rate limiting (server-side)
  if (type.startsWith('connect_') && senderId) {
    const cooldownMs = config.connect.rateLimitsMs[type] ?? 0;
    if (cooldownMs > 0) {
      const rl = await rateLimitConnectIfNeeded({
        db,
        senderId,
        recipientId,
        type,
        cooldownMs,
      });
      if (!rl.allowed) {
        await ref.set(
          {
            status: 'skipped',
            skipped_reason: 'rate_limited',
            retry_after_ms: rl.retryAfterMs,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        return { outcome: 'skipped', countedAs: 'skipped', message: 'Rate limited' };
      }
    }
  }

  const token = await getUserToken(db, recipientId);
  if (!token) {
    await ref.set(
      {
        status: 'failed',
        error: 'Recipient has no FCM token',
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return { outcome: 'failed', countedAs: 'failed', message: 'Recipient has no FCM token' };
  }

  const data = stringifyData({
    ...(payload.data || {}),
    type,
    recipient_id: recipientId,
    sender_id: senderId || undefined,
    sender_name: payload.sender_name || undefined,
    sender_avatar: payload.sender_avatar || undefined,
  });

  try {
    await messaging.send({
      token,
      notification: { title, body },
      data,
      android: { priority: 'high' as const },
      apns: { payload: { aps: { sound: 'default' } } },
    });

    if (dedupeKey && dedupeWindowMs > 0) {
      await db
        .collection('notification_dedupe')
        .doc(dedupeKey)
        .set(
          {
            dedupe_key: dedupeKey,
            sent_at: admin.firestore.FieldValue.serverTimestamp(),
            type,
            recipient_id: recipientId,
            sender_id: senderId || null,
          },
          { merge: true }
        );
    }

    const remaining =
      typeof payload.remaining_occurrences === 'number' ? payload.remaining_occurrences : undefined;
    const nextRemaining =
      remaining != null && Number.isFinite(remaining) ? Math.max(0, remaining - 1) : undefined;
    const endAt = payload.end_at;
    const endAtDate = endAt?.toDate ? endAt.toDate() : null;

    const shouldStopByCount = remaining != null ? nextRemaining === 0 : false;
    const shouldStopByEndAt = endAtDate ? Date.now() >= endAtDate.getTime() : false;

    if (payload.repeat && !shouldStopByCount && !shouldStopByEndAt) {
      const tzOffsetMinutes =
        typeof payload.tz_offset_minutes === 'number' ? payload.tz_offset_minutes : 0;
      const hour = typeof payload.hour === 'number' ? payload.hour : 0;
      const minute = typeof payload.minute === 'number' ? payload.minute : 0;

      let nextUtc: Date;
      if (payload.repeat === 'daily') {
        nextUtc = computeNextUtcForLocalTime({
          now: new Date(),
          tzOffsetMinutes,
          hour,
          minute,
        });
      } else if (payload.repeat === 'every_n_days') {
        const intervalDays =
          typeof payload.interval_days === 'number' && payload.interval_days > 0
            ? payload.interval_days
            : 1;
        const baseNext = computeNextUtcForLocalTime({
          now: new Date(),
          tzOffsetMinutes,
          hour,
          minute,
        });
        nextUtc = new Date(baseNext.getTime() + (intervalDays - 1) * 24 * 60 * 60_000);
      } else {
        const days = normalizeDayOfWeekList(payload.days_of_week);
        nextUtc = computeNextUtcForWeekdays({
          now: new Date(),
          tzOffsetMinutes,
          hour,
          minute,
          daysOfWeek: days,
        });
      }

      if (endAtDate && nextUtc.getTime() > endAtDate.getTime()) {
        await ref.set(
          {
            status: 'sent',
            sent_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        await ref.set(
          {
            status: 'pending',
            last_sent_at: admin.firestore.FieldValue.serverTimestamp(),
            scheduled_at: admin.firestore.Timestamp.fromDate(nextUtc),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            ...(nextRemaining != null ? { remaining_occurrences: nextRemaining } : {}),
          },
          { merge: true }
        );
      }
    } else {
      await ref.set(
        {
          status: 'sent',
          sent_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    return { outcome: 'sent', countedAs: 'sent', message: 'Sent' };
  } catch (error: unknown) {
    const errObj =
      error && typeof error === 'object' ? (error as { code?: string; message?: string }) : null;
    const code = errObj?.code || '';

    if (
      code === 'messaging/invalid-registration-token' ||
      code === 'messaging/registration-token-not-registered'
    ) {
      await clearUserToken(db, recipientId);
    }

    await ref.set(
      {
        status: 'failed',
        error: errObj?.message || (error instanceof Error ? error.message : 'FCM send failed'),
        error_code: code || null,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return {
      outcome: 'failed',
      countedAs: 'failed',
      message: errObj?.message || 'FCM send failed',
    };
  }
}

export async function processQueueBatch(params: {
  db: admin.firestore.Firestore;
  messaging: admin.messaging.Messaging;
  limit: number;
  config: NotificationRouterConfig;
}) {
  const { db, messaging, limit, config } = params;
  if (!config.globalEnabled || !config.processingEnabled) {
    return { processed: 0, sent: 0, failed: 0, skipped: 0, paused: true as const };
  }

  const now = admin.firestore.Timestamp.fromDate(new Date());
  const snapshot = await db
    .collection('notification_queue')
    .where('status', '==', 'pending')
    .where('scheduled_at', '<=', now)
    .orderBy('scheduled_at', 'asc')
    .limit(limit)
    .get();

  let processed = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    processed++;
    const payload = doc.data() as QueueDoc;
    const outcome = await processQueueDoc({
      db,
      messaging,
      config,
      ref: doc.ref,
      payload,
    });
    if (outcome.countedAs === 'sent') sent++;
    else if (outcome.countedAs === 'failed') failed++;
    else skipped++;
  }

  return { processed, sent, failed, skipped, paused: false as const };
}

export async function processQueueItemById(params: {
  db: admin.firestore.Firestore;
  messaging: admin.messaging.Messaging;
  config: NotificationRouterConfig;
  queueId: string;
  force?: boolean;
}) {
  const { db, messaging, config, queueId, force = false } = params;
  if (!config.globalEnabled || !config.processingEnabled) {
    return {
      ok: false as const,
      paused: true as const,
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      message: 'Notifications are paused (globalEnabled/processingEnabled)',
    };
  }

  const ref = db.collection('notification_queue').doc(queueId);
  const snap = await ref.get();
  if (!snap.exists) {
    return {
      ok: false as const,
      paused: false as const,
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      message: 'Queue item not found',
    };
  }

  const payload = (snap.data() || {}) as QueueDoc;
  if (payload.status && payload.status !== 'pending') {
    return {
      ok: false as const,
      paused: false as const,
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      message: `Queue item is not pending (status=${payload.status})`,
    };
  }

  const scheduledAt = payload.scheduled_at;
  if (!force && scheduledAt && typeof scheduledAt.toDate === 'function') {
    const dt = scheduledAt.toDate();
    if (dt.getTime() > Date.now()) {
      return {
        ok: false as const,
        paused: false as const,
        processed: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        message: 'Queue item is scheduled in the future (use force=true)',
      };
    }
  }

  const outcome = await processQueueDoc({ db, messaging, config, ref, payload });
  return {
    ok: true as const,
    paused: false as const,
    processed: 1,
    sent: outcome.countedAs === 'sent' ? 1 : 0,
    failed: outcome.countedAs === 'failed' ? 1 : 0,
    skipped: outcome.countedAs === 'skipped' ? 1 : 0,
    outcome: outcome.outcome,
    message: outcome.message || null,
  };
}

export async function ensureEngagementSchedulesForRecentUsers(params: {
  db: admin.firestore.Firestore;
  limit: number;
  config: NotificationRouterConfig;
}) {
  const { db, limit, config } = params;
  if (!config.globalEnabled || !config.engagement.enabled) {
    return { scanned: 0, scheduled: 0, disabled: true as const };
  }

  const snap = await db
    .collection('users')
    .orderBy('fcm_token_updated_at', 'desc')
    .limit(limit)
    .get();

  let scheduled = 0;
  for (const userDoc of snap.docs) {
    const data = userDoc.data() || {};
    const userId = userDoc.id;
    const token = (data.fcm_token || data.fcmToken || data.device_token) as string | undefined;
    if (!token) continue;

    const tzOffsetMinutes =
      typeof data.tz_offset_minutes === 'number' ? (data.tz_offset_minutes as number) : 0;
    const firstTimeDone = Boolean(data.engagement_first_time_scheduled);
    const recurringDone = Boolean(data.engagement_recurring_scheduled);

    if (!firstTimeDone && config.engagement.firstTimeEnabled) {
      const now = new Date();
      const welcomeAt = new Date(now.getTime() + 2 * 60_000);

      const schedule = config.engagement.schedule;
      const introTpl = config.engagement.templates.intro;
      const intros = [
        {
          id: 'welcome_intro',
          type: 'iki_home',
          title: 'Welcome to IKI!',
          body: "Let's build healthy habits together. We'll introduce you to some amazing features!",
          atUtc: welcomeAt,
        },
        {
          id: 'water_intro',
          type: 'water_general',
          title: introTpl.water.title,
          body: introTpl.water.body,
          atUtc: computeNextUtcForLocalTime({
            now,
            tzOffsetMinutes,
            hour: schedule.water.hour,
            minute: schedule.water.minute,
          }),
        },
        {
          id: 'daily_checkin_intro',
          type: 'wellsphere_general',
          title: introTpl.daily_checkin.title,
          body: introTpl.daily_checkin.body,
          atUtc: computeNextUtcForLocalTime({
            now,
            tzOffsetMinutes,
            hour: schedule.daily_checkin.hour,
            minute: schedule.daily_checkin.minute,
          }),
        },
        {
          id: 'mood_intro',
          type: 'mindscape_mood',
          title: introTpl.mood.title,
          body: introTpl.mood.body,
          atUtc: computeNextUtcForLocalTime({
            now,
            tzOffsetMinutes,
            hour: schedule.mood.hour,
            minute: schedule.mood.minute,
          }),
        },
        {
          id: 'meal_tracking_intro',
          type: 'nutrition_general',
          title: introTpl.meal_tracking.title,
          body: introTpl.meal_tracking.body,
          atUtc: computeNextUtcForLocalTime({
            now,
            tzOffsetMinutes,
            hour: schedule.meal_tracking.hour,
            minute: schedule.meal_tracking.minute,
          }),
        },
        {
          id: 'journal_intro',
          type: 'mindscape_journal',
          title: introTpl.journal.title,
          body: introTpl.journal.body,
          atUtc: computeNextUtcForLocalTime({
            now,
            tzOffsetMinutes,
            hour: schedule.journal.hour,
            minute: schedule.journal.minute,
          }),
        },
        {
          id: 'gratitude_intro',
          type: 'mindscape_gratitude',
          title: introTpl.gratitude.title,
          body: introTpl.gratitude.body,
          atUtc: computeNextUtcForLocalTime({
            now,
            tzOffsetMinutes,
            hour: schedule.gratitude.hour,
            minute: schedule.gratitude.minute,
          }),
        },
      ];

      const batch = db.batch();
      for (const intro of intros) {
        const docId = `intro_${userId}_${intro.id}`;
        const ref = db.collection('notification_queue').doc(docId);
        batch.set(
          ref,
          {
            category: 'engagement',
            type: intro.type,
            title: intro.title,
            body: intro.body,
            recipient_id: userId,
            status: 'pending',
            scheduled_at: admin.firestore.Timestamp.fromDate(intro.atUtc),
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            dedupe_key: `intro:${userId}:${intro.id}`,
            // "send once" effectively
            dedupe_window_ms: 10 * 365 * 24 * 60 * 60_000,
          },
          { merge: true }
        );
      }
      batch.set(
        db.collection('users').doc(userId),
        {
          engagement_first_time_scheduled: true,
          engagement_first_time_scheduled_at: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      await batch.commit();
      scheduled++;
    }

    if (!recurringDone && config.engagement.recurringEnabled) {
      const now = new Date();
      const schedule = config.engagement.schedule;
      const recurringTpl = config.engagement.templates.recurring;
      const recurringRules = config.engagement.recurringRules;
      const recurring = [
        {
          id: 'water_advertisement',
          type: 'water_general',
          title: recurringTpl.water.title,
          body: recurringTpl.water.body,
          key: 'water' as const,
        },
        {
          id: 'daily_checkin_advertisement',
          type: 'wellsphere_general',
          title: recurringTpl.daily_checkin.title,
          body: recurringTpl.daily_checkin.body,
          key: 'daily_checkin' as const,
        },
        {
          id: 'mood_advertisement',
          type: 'mindscape_mood',
          title: recurringTpl.mood.title,
          body: recurringTpl.mood.body,
          key: 'mood' as const,
        },
        {
          id: 'meal_tracking_advertisement',
          type: 'nutrition_general',
          title: recurringTpl.meal_tracking.title,
          body: recurringTpl.meal_tracking.body,
          key: 'meal_tracking' as const,
        },
        {
          id: 'journal_advertisement',
          type: 'mindscape_journal',
          title: recurringTpl.journal.title,
          body: recurringTpl.journal.body,
          key: 'journal' as const,
        },
        {
          id: 'gratitude_advertisement',
          type: 'mindscape_gratitude',
          title: recurringTpl.gratitude.title,
          body: recurringTpl.gratitude.body,
          key: 'gratitude' as const,
        },
      ];

      const batch = db.batch();
      for (const r of recurring) {
        const rule = recurringRules[r.key] || { repeat: 'daily' };
        const hour = schedule[r.key].hour;
        const minute = schedule[r.key].minute;

        let at: Date;
        if (rule.repeat === 'weekdays') {
          at = computeNextUtcForWeekdays({
            now,
            tzOffsetMinutes,
            hour,
            minute,
            daysOfWeek: normalizeDayOfWeekList(rule.daysOfWeek),
          });
        } else {
          at = computeNextUtcForLocalTime({ now, tzOffsetMinutes, hour, minute });
        }

        const docId = `recurring_${userId}_${r.id}`;
        const ref = db.collection('notification_queue').doc(docId);
        const docPayload: any = {
          category: 'engagement',
          type: r.type,
          title: r.title,
          body: r.body,
          recipient_id: userId,
          status: 'pending',
          repeat: rule.repeat,
          hour,
          minute,
          tz_offset_minutes: tzOffsetMinutes,
          scheduled_at: admin.firestore.Timestamp.fromDate(at),
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
          dedupe_key: `recurring:${userId}:${r.id}`,
          // avoid duplicates from overlapping cron runs, allow daily repeats
          dedupe_window_ms: 2 * 60_000,
        };

        if (rule.repeat === 'every_n_days') {
          docPayload.interval_days =
            typeof rule.intervalDays === 'number' ? Math.max(1, Math.floor(rule.intervalDays)) : 1;
        }
        if (rule.repeat === 'weekdays') {
          docPayload.days_of_week = normalizeDayOfWeekList(rule.daysOfWeek);
        }
        if (typeof rule.occurrences === 'number' && Number.isFinite(rule.occurrences)) {
          docPayload.remaining_occurrences = Math.max(1, Math.floor(rule.occurrences));
        }

        batch.set(ref, docPayload, { merge: true });
      }
      batch.set(
        db.collection('users').doc(userId),
        {
          engagement_recurring_scheduled: true,
          engagement_recurring_scheduled_at: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      await batch.commit();
      scheduled++;
    }
  }

  return { scanned: snap.size, scheduled, disabled: false as const };
}

