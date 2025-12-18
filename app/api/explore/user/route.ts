import { cache, createCacheKey } from '@/lib/cache';
import { initFirebase } from '@/lib/firebase';
import { exploreRateLimiter, getClientId } from '@/lib/rateLimit';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 120;
export const dynamic = 'force-dynamic';

type ContentBreakdownRow = {
  contentId: string;
  title?: string;
  mediaType?: string;
  mediaCategory?: string;
  engagedMs: number;
  views: number;
  reactions: number;
  comments: number;
  commentLikes: number;
  lastSeenIso?: string;
};

type UserExploreResponse = {
  userId: string;
  username?: string;
  windowDays: number;
  windowStartIso: string;
  windowEndIso: string;
  totals: {
    events: number;
    uniqueContents: number;
    views: number;
    reactions: number;
    comments: number;
    commentLikes: number;
    engagedMs: number;
  };
  contentBreakdown: ContentBreakdownRow[];
  recentEvents: Array<{
    id: string;
    timestamp: string;
    eventType: string;
    contentId: string;
    title?: string;
    mediaType?: string;
    mediaCategory?: string;
    sessionId?: string;
    payload?: unknown;
  }>;
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
  const n = raw ? Number(raw) : 30;
  if (!Number.isFinite(n)) return 30;
  return Math.max(1, Math.min(180, Math.trunc(n)));
}

async function queryWithFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>
): Promise<T> {
  try {
    return await primary();
  } catch {
    return await fallback();
  }
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

    const userId = request.nextUrl.searchParams.get('userId')?.trim() || '';
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const days = clampDays(request.nextUrl.searchParams.get('days'));
    const cacheKey = createCacheKey('explore-user', { userId, days });
    const cached = cache.get<UserExploreResponse>(cacheKey);
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

    const historyLimit = 3000;
    const historySnap = await queryWithFallback(
      () =>
        db
          .collection('explore_history')
          .where('userId', '==', userId)
          .where('timestamp', '>=', windowStartTs)
          .orderBy('timestamp', 'desc')
          .limit(historyLimit)
          .get(),
      () => db.collection('explore_history').where('userId', '==', userId).limit(historyLimit).get()
    );

    type Agg = {
      engagedMs: number;
      views: number;
      reactions: number;
      comments: number;
      commentLikes: number;
      lastSeen?: admin.firestore.Timestamp;
      title?: string;
      mediaType?: string;
      mediaCategory?: string;
    };

    const byContent = new Map<string, Agg>();
    const contents = new Set<string>();
    let totalViews = 0;
    let totalReactions = 0;
    let totalComments = 0;
    let totalCommentLikes = 0;
    let totalEngagedMs = 0;

    // If fallback query was used (no timestamp filter), apply filter in memory.
    const filteredDocs = historySnap.docs.filter((d) => {
      const ts = d.data().timestamp as admin.firestore.Timestamp | undefined;
      if (!ts) return false;
      return ts.toMillis() >= windowStart.getTime();
    });

    filteredDocs.sort((a, b) => {
      const at = (a.data().timestamp as admin.firestore.Timestamp | undefined)?.toMillis() ?? 0;
      const bt = (b.data().timestamp as admin.firestore.Timestamp | undefined)?.toMillis() ?? 0;
      return bt - at;
    });

    const recentEvents = filteredDocs.slice(0, 200).map((d) => {
      const data = d.data();
      return {
        id: d.id,
        timestamp:
          toIso(data.timestamp as admin.firestore.Timestamp | undefined) ??
          new Date().toISOString(),
        eventType: asString(data.eventType, 'event'),
        contentId: asString(data.contentId, ''),
        title: typeof data.title === 'string' ? data.title : undefined,
        mediaType: typeof data.mediaType === 'string' ? data.mediaType : undefined,
        mediaCategory: typeof data.mediaCategory === 'string' ? data.mediaCategory : undefined,
        sessionId: typeof data.sessionId === 'string' ? data.sessionId : undefined,
        payload: data.payload,
      };
    });

    for (const doc of filteredDocs) {
      const data = doc.data();
      const eventType = asString(data.eventType, 'event');
      const contentId = asString(data.contentId, '');
      const ts = data.timestamp as admin.firestore.Timestamp | undefined;
      if (!contentId) continue;

      contents.add(contentId);
      let agg = byContent.get(contentId);
      if (!agg) {
        agg = {
          engagedMs: 0,
          views: 0,
          reactions: 0,
          comments: 0,
          commentLikes: 0,
          lastSeen: undefined,
          title: undefined,
          mediaType: undefined,
          mediaCategory: undefined,
        };
        byContent.set(contentId, agg);
      }

      if (!agg.lastSeen || (ts && ts.toMillis() > agg.lastSeen.toMillis())) {
        agg.lastSeen = ts;
      }

      if (!agg.title && typeof data.title === 'string' && data.title.trim()) {
        agg.title = data.title;
      }
      if (!agg.mediaType && typeof data.mediaType === 'string') agg.mediaType = data.mediaType;
      if (!agg.mediaCategory && typeof data.mediaCategory === 'string')
        agg.mediaCategory = data.mediaCategory;

      if (eventType === 'view_start') {
        agg.views += 1;
        totalViews += 1;
      }
      if (eventType === 'reaction') {
        agg.reactions += 1;
        totalReactions += 1;
      }
      if (eventType === 'comment_add') {
        agg.comments += 1;
        totalComments += 1;
      }
      if (eventType === 'comment_like') {
        agg.commentLikes += 1;
        totalCommentLikes += 1;
      }

      if (eventType === 'view_end') {
        const payload = data.payload;
        if (payload && typeof payload === 'object' && 'engagedMs' in payload) {
          const v = (payload as Record<string, unknown>).engagedMs;
          const ms = typeof v === 'number' && Number.isFinite(v) ? v : 0;
          const safe = Math.max(0, ms);
          agg.engagedMs += safe;
          totalEngagedMs += safe;
        }
      }
    }

    const contentBreakdown: ContentBreakdownRow[] = [...byContent.entries()]
      .map(([contentId, agg]) => ({
        contentId,
        title: agg.title,
        mediaType: agg.mediaType,
        mediaCategory: agg.mediaCategory,
        engagedMs: agg.engagedMs,
        views: agg.views,
        reactions: agg.reactions,
        comments: agg.comments,
        commentLikes: agg.commentLikes,
        lastSeenIso: toIso(agg.lastSeen),
      }))
      .sort((a, b) => b.engagedMs - a.engagedMs);

    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists
      ? (userDoc.data() as Record<string, unknown> | undefined)
      : undefined;
    const username = userData ? asString(userData.username, '') : '';

    const response: UserExploreResponse = {
      userId,
      username: username || undefined,
      windowDays: days,
      windowStartIso: windowStart.toISOString(),
      windowEndIso: windowEnd.toISOString(),
      totals: {
        events: filteredDocs.length,
        uniqueContents: contents.size,
        views: totalViews,
        reactions: totalReactions,
        comments: totalComments,
        commentLikes: totalCommentLikes,
        engagedMs: totalEngagedMs,
      },
      contentBreakdown,
      recentEvents,
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
    console.error('Error building explore user view:', error);
    const message = error instanceof Error ? error.message : 'Failed to build explore user view';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



