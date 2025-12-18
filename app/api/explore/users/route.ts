import { cache, createCacheKey } from '@/lib/cache';
import { initFirebase } from '@/lib/firebase';
import { exploreRateLimiter, getClientId } from '@/lib/rateLimit';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 120;
export const dynamic = 'force-dynamic';

type UserRow = {
  userId: string;
  username?: string;
  events: number;
  uniqueContents: number;
  views: number;
  reactions: number;
  comments: number;
  commentLikes: number;
  engagedMs: number;
  lastSeenIso?: string;
};

type UsersResponse = {
  windowDays: number;
  windowStartIso: string;
  windowEndIso: string;
  items: UserRow[];
  scannedEvents: number;
  truncated: boolean;
};

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function toIso(ts: admin.firestore.Timestamp | undefined): string | undefined {
  if (!ts) return undefined;
  try {
    return ts.toDate().toISOString();
  } catch {
    return undefined;
  }
}

function clampDays(raw: string | null): number {
  const n = raw ? Number(raw) : 7;
  if (!Number.isFinite(n)) return 7;
  return Math.max(1, Math.min(90, Math.trunc(n)));
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Aggregation endpoint (bounded reads + caching)
export async function GET(request: NextRequest) {
  try {
    const clientId = getClientId(request);
    const rateLimit = exploreRateLimiter.check(clientId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again after ${new Date(rateLimit.resetAt).toISOString()}`,
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
          },
        }
      );
    }

    const days = clampDays(request.nextUrl.searchParams.get('days'));
    const cacheKey = createCacheKey('explore-users', { days });
    const cached = cache.get<UsersResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240',
          'X-Cache': 'HIT',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        },
      });
    }

    initFirebase();
    const db = admin.firestore();

    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - days * 24 * 60 * 60 * 1000);
    const windowStartTs = admin.firestore.Timestamp.fromDate(windowStart);

    const historyLimit = 5000;
    const historySnap = await db
      .collection('explore_history')
      .where('timestamp', '>=', windowStartTs)
      .orderBy('timestamp', 'desc')
      .limit(historyLimit)
      .get();

    type Agg = {
      events: number;
      views: number;
      reactions: number;
      comments: number;
      commentLikes: number;
      engagedMs: number;
      lastSeen?: admin.firestore.Timestamp;
      contents: Set<string>;
    };

    const byUser = new Map<string, Agg>();

    for (const doc of historySnap.docs) {
      const data = doc.data();
      const userId = asString(data.userId, '');
      if (!userId) continue;

      const eventType = asString(data.eventType, 'event');
      const contentId = asString(data.contentId, '');
      const ts = data.timestamp as admin.firestore.Timestamp | undefined;

      let agg = byUser.get(userId);
      if (!agg) {
        agg = {
          events: 0,
          views: 0,
          reactions: 0,
          comments: 0,
          commentLikes: 0,
          engagedMs: 0,
          lastSeen: undefined,
          contents: new Set<string>(),
        };
        byUser.set(userId, agg);
      }

      agg.events += 1;
      if (contentId) agg.contents.add(contentId);
      if (!agg.lastSeen || (ts && ts.toMillis() > agg.lastSeen.toMillis())) {
        agg.lastSeen = ts;
      }

      if (eventType === 'view_start') agg.views += 1;
      if (eventType === 'reaction') agg.reactions += 1;
      if (eventType === 'comment_add') agg.comments += 1;
      if (eventType === 'comment_like') agg.commentLikes += 1;

      if (eventType === 'view_end') {
        const payload = data.payload;
        if (payload && typeof payload === 'object' && 'engagedMs' in payload) {
          const v = (payload as Record<string, unknown>).engagedMs;
          const ms = typeof v === 'number' && Number.isFinite(v) ? v : 0;
          agg.engagedMs += Math.max(0, ms);
        }
      }
    }

    const sorted = [...byUser.entries()]
      .map(([userId, agg]) => ({
        userId,
        events: agg.events,
        uniqueContents: agg.contents.size,
        views: agg.views,
        reactions: agg.reactions,
        comments: agg.comments,
        commentLikes: agg.commentLikes,
        engagedMs: agg.engagedMs,
        lastSeenIso: toIso(agg.lastSeen),
      }))
      .sort((a, b) => b.engagedMs - a.engagedMs)
      .slice(0, 100);

    // Attach usernames (best-effort) for the top users.
    const refs = sorted.map((u) => db.collection('users').doc(u.userId));
    const userDocs = refs.length ? await db.getAll(...refs) : [];
    const usernames = new Map<string, string>();
    for (const doc of userDocs) {
      if (!doc.exists) continue;
      const data = doc.data() as Record<string, unknown> | undefined;
      if (!data) continue;
      const username = asString(data.username, '');
      if (username) usernames.set(doc.id, username);
    }

    const items: UserRow[] = sorted.map((u) => ({
      ...u,
      username: usernames.get(u.userId) || undefined,
    }));

    const response: UsersResponse = {
      windowDays: days,
      windowStartIso: windowStart.toISOString(),
      windowEndIso: windowEnd.toISOString(),
      items,
      scannedEvents: historySnap.size,
      truncated: historySnap.size >= historyLimit,
    };

    cache.set(cacheKey, response, 120000);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240',
        'X-Cache': 'MISS',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('Error building explore user stats:', error);
    const message = error instanceof Error ? error.message : 'Failed to build explore user stats';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



