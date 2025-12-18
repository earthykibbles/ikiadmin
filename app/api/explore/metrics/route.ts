import { cache, createCacheKey } from '@/lib/cache';
import { initFirebase } from '@/lib/firebase';
import { exploreRateLimiter, getClientId } from '@/lib/rateLimit';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 60;
export const dynamic = 'force-dynamic';

type SortKey =
  | 'totalEngagedMs'
  | 'viewCount'
  | 'likeCount'
  | 'dislikeCount'
  | 'commentCount'
  | 'updatedAt';

type MetricsRow = {
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

type MetricsResponse = {
  sort: SortKey;
  limit: number;
  items: MetricsRow[];
  nextCursor?: string;
};

function asNum(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v)).filter((v) => v.trim().length > 0);
}

function toIso(ts: admin.firestore.Timestamp | undefined): string | undefined {
  if (!ts) return undefined;
  try {
    return ts.toDate().toISOString();
  } catch {
    return undefined;
  }
}

type Cursor = { v: number | string; id: string };

function decodeCursor(raw?: string | null): Cursor | null {
  const c = raw?.trim();
  if (!c) return null;
  try {
    const json = Buffer.from(c, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as { v?: unknown; id?: unknown };
    const id = typeof parsed.id === 'string' ? parsed.id : '';
    const v = parsed.v;
    if (!id) return null;
    if (typeof v === 'number' && Number.isFinite(v)) return { id, v };
    if (typeof v === 'string') return { id, v };
    return { id, v: 0 };
  } catch {
    return null;
  }
}

function encodeCursor(cursor: Cursor): string {
  const json = JSON.stringify(cursor);
  return Buffer.from(json, 'utf8').toString('base64url');
}

function parseSort(raw: string | null): SortKey {
  const s = (raw || '').trim();
  const allowed: SortKey[] = [
    'totalEngagedMs',
    'viewCount',
    'likeCount',
    'dislikeCount',
    'commentCount',
    'updatedAt',
  ];
  return (allowed.includes(s as SortKey) ? (s as SortKey) : 'totalEngagedMs') as SortKey;
}

function parseLimit(raw: string | null): number {
  const n = raw ? Number(raw) : 50;
  if (!Number.isFinite(n)) return 50;
  return Math.max(10, Math.min(100, Math.trunc(n)));
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Pagination + cursor parsing
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

    const sort = parseSort(request.nextUrl.searchParams.get('sort'));
    const limit = parseLimit(request.nextUrl.searchParams.get('limit'));
    const cursor = decodeCursor(request.nextUrl.searchParams.get('cursor'));

    const cacheKey = createCacheKey('explore-metrics', { sort, limit, cursor: cursor ? '1' : '0' });
    const cached = cache.get<MetricsResponse>(cacheKey);
    if (!cursor && cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          'X-Cache': 'HIT',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        },
      });
    }

    initFirebase();
    const db = admin.firestore();

    let query: admin.firestore.Query = db
      .collection('explore_content_metrics')
      .orderBy(sort, 'desc');
    // Stable tie-breaker for pagination.
    query = query.orderBy(admin.firestore.FieldPath.documentId(), 'asc').limit(limit);

    if (cursor) {
      if (sort === 'updatedAt') {
        const iso = typeof cursor.v === 'string' ? cursor.v : '';
        const dt = iso ? new Date(iso) : null;
        const ts =
          dt && Number.isFinite(dt.getTime()) ? admin.firestore.Timestamp.fromDate(dt) : null;
        if (ts) {
          query = query.startAfter(ts, cursor.id);
        } else {
          query = query.startAfter(cursor.id);
        }
      } else {
        const v = typeof cursor.v === 'number' ? cursor.v : Number(cursor.v);
        query = Number.isFinite(v) ? query.startAfter(v, cursor.id) : query.startAfter(cursor.id);
      }
    }

    const snap = await query.get();
    const items: MetricsRow[] = snap.docs.map((d) => {
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

    const lastDoc = snap.docs.at(-1);
    const nextCursor = lastDoc?.exists
      ? encodeCursor({
          id: lastDoc.id,
          v:
            sort === 'updatedAt'
              ? (toIso(lastDoc.data().updatedAt) ?? '')
              : asNum(lastDoc.data()[sort]),
        })
      : undefined;

    const response: MetricsResponse = { sort, limit, items, nextCursor };
    if (!cursor) cache.set(cacheKey, response, 60000);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'X-Cache': cursor ? 'BYPASS' : 'MISS',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('Error listing explore metrics:', error);
    const message = error instanceof Error ? error.message : 'Failed to list explore metrics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



