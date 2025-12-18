import { cache, createCacheKey } from '@/lib/cache';
import { initFirebase } from '@/lib/firebase';
import { exploreRateLimiter, getClientId } from '@/lib/rateLimit';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 300; // 5 minutes
export const dynamic = 'force-dynamic';

type TopItem = {
  contentId: string;
  title: string;
  mediaType: string;
  mediaCategory: string;
  tags: string[];
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  viewCount: number;
  totalEngagedMs: number;
  updatedAt?: string;
};

type ExploreStatsResponse = {
  windowDays: number;
  windowStartIso: string;
  windowEndIso: string;
  totalsAllTime: {
    contents: number;
    likeCount: number;
    dislikeCount: number;
    commentCount: number;
    viewCount: number;
    totalEngagedMs: number;
  };
  window: {
    events: number;
    uniqueUsers: number;
    uniqueSessions: number;
    eventTypes: Record<string, number>;
    engagedMs: number;
    views: number;
    reactions: number;
    comments: number;
    commentLikes: number;
  };
  topAllTime: {
    byEngagedMs: TopItem[];
    byViews: TopItem[];
    byLikes: TopItem[];
    byComments: TopItem[];
  };
  recentEvents: Array<{
    id: string;
    timestamp: string;
    eventType: string;
    userId: string;
    contentId: string;
    title?: string;
    mediaType?: string;
    mediaCategory?: string;
    sessionId?: string;
    payload?: unknown;
  }>;
  scanned: {
    metricsDocs: number;
    historyDocs: number;
    truncated: boolean;
  };
};

function toIso(ts: admin.firestore.Timestamp | undefined): string | undefined {
  if (!ts) return undefined;
  try {
    return ts.toDate().toISOString();
  } catch {
    return undefined;
  }
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNum(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v)).filter((v) => v.trim().length > 0);
}

function clampDays(raw: string | null): number {
  const n = raw ? Number(raw) : 7;
  if (!Number.isFinite(n)) return 7;
  return Math.max(1, Math.min(90, Math.trunc(n)));
}

async function fetchTop(
  db: admin.firestore.Firestore,
  field: 'totalEngagedMs' | 'viewCount' | 'likeCount' | 'commentCount'
): Promise<TopItem[]> {
  const snap = await db
    .collection('explore_content_metrics')
    .orderBy(field, 'desc')
    .limit(10)
    .get();

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      contentId: d.id,
      title: asString(data.title, d.id),
      mediaType: asString(data.mediaType, ''),
      mediaCategory: asString(data.mediaCategory, ''),
      tags: asStringArray(data.tags),
      likeCount: asNum(data.likeCount),
      dislikeCount: asNum(data.dislikeCount),
      commentCount: asNum(data.commentCount),
      viewCount: asNum(data.viewCount),
      totalEngagedMs: asNum(data.totalEngagedMs),
      updatedAt: toIso(data.updatedAt),
    };
  });
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
    const cacheKey = createCacheKey('explore-stats', { days });
    const cached = cache.get<ExploreStatsResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
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

    // Top lists from aggregate docs (fast, bounded reads).
    const [byEngagedMs, byViews, byLikes, byComments] = await Promise.all([
      fetchTop(db, 'totalEngagedMs'),
      fetchTop(db, 'viewCount'),
      fetchTop(db, 'likeCount'),
      fetchTop(db, 'commentCount'),
    ]);

    // Totals across all content metrics.
    let metricsDocs = 0;
    let totalLikes = 0;
    let totalDislikes = 0;
    let totalComments = 0;
    let totalViews = 0;
    let totalEngagedMs = 0;

    const metricsRef = db.collection('explore_content_metrics');
    const pageSize = 400;
    const maxDocs = 2000; // safety cap to avoid quota spikes
    let last: admin.firestore.QueryDocumentSnapshot | undefined;

    while (metricsDocs < maxDocs) {
      let query: admin.firestore.Query = metricsRef
        .orderBy(admin.firestore.FieldPath.documentId())
        .limit(pageSize);
      if (last) query = query.startAfter(last);
      const snap = await query.get();
      if (snap.empty) break;

      for (const doc of snap.docs) {
        metricsDocs += 1;
        const data = doc.data();
        totalLikes += asNum(data.likeCount);
        totalDislikes += asNum(data.dislikeCount);
        totalComments += asNum(data.commentCount);
        totalViews += asNum(data.viewCount);
        totalEngagedMs += asNum(data.totalEngagedMs);
      }

      last = snap.docs[snap.docs.length - 1];
      if (snap.docs.length < pageSize) break;
    }

    // Windowed activity from history (bounded reads).
    const historyLimit = 2000;
    const historySnap = await db
      .collection('explore_history')
      .where('timestamp', '>=', windowStartTs)
      .orderBy('timestamp', 'desc')
      .limit(historyLimit)
      .get();

    const eventTypes: Record<string, number> = {};
    const users = new Set<string>();
    const sessions = new Set<string>();
    let windowEngagedMs = 0;
    let windowViews = 0;
    let windowReactions = 0;
    let windowComments = 0;
    let windowCommentLikes = 0;

    const recentEvents = historySnap.docs.slice(0, 50).map((d) => {
      const data = d.data();
      return {
        id: d.id,
        timestamp: toIso(data.timestamp) ?? new Date().toISOString(),
        eventType: asString(data.eventType, 'event'),
        userId: asString(data.userId, ''),
        contentId: asString(data.contentId, ''),
        title: typeof data.title === 'string' ? data.title : undefined,
        mediaType: typeof data.mediaType === 'string' ? data.mediaType : undefined,
        mediaCategory: typeof data.mediaCategory === 'string' ? data.mediaCategory : undefined,
        sessionId: typeof data.sessionId === 'string' ? data.sessionId : undefined,
        payload: data.payload,
      };
    });

    for (const doc of historySnap.docs) {
      const data = doc.data();
      const type = asString(data.eventType, 'event');
      eventTypes[type] = (eventTypes[type] || 0) + 1;

      const userId = asString(data.userId, '');
      if (userId) users.add(userId);

      const sessionId = asString(data.sessionId, '');
      if (sessionId) sessions.add(sessionId);

      if (type === 'view_start') windowViews += 1;
      if (type === 'reaction') windowReactions += 1;
      if (type === 'comment_add') windowComments += 1;
      if (type === 'comment_like') windowCommentLikes += 1;

      if (type === 'view_end') {
        const payload = data.payload;
        let engaged = 0;
        if (payload && typeof payload === 'object' && 'engagedMs' in payload) {
          const v = (payload as Record<string, unknown>).engagedMs;
          engaged = typeof v === 'number' && Number.isFinite(v) ? v : 0;
        }
        windowEngagedMs += Math.max(0, engaged);
      }
    }

    const truncated = metricsDocs >= maxDocs || historySnap.docs.length >= historyLimit;

    const response: ExploreStatsResponse = {
      windowDays: days,
      windowStartIso: windowStart.toISOString(),
      windowEndIso: windowEnd.toISOString(),
      totalsAllTime: {
        contents: metricsDocs,
        likeCount: totalLikes,
        dislikeCount: totalDislikes,
        commentCount: totalComments,
        viewCount: totalViews,
        totalEngagedMs: totalEngagedMs,
      },
      window: {
        events: historySnap.size,
        uniqueUsers: users.size,
        uniqueSessions: sessions.size,
        eventTypes,
        engagedMs: windowEngagedMs,
        views: windowViews,
        reactions: windowReactions,
        comments: windowComments,
        commentLikes: windowCommentLikes,
      },
      topAllTime: {
        byEngagedMs,
        byViews,
        byLikes,
        byComments,
      },
      recentEvents,
      scanned: {
        metricsDocs,
        historyDocs: historySnap.size,
        truncated,
      },
    };

    cache.set(cacheKey, response, 300000);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'MISS',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('Error building explore stats:', error);
    const message = error instanceof Error ? error.message : 'Failed to build explore stats';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



