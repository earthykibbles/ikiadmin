import { initFirebase } from '@/lib/firebase';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

type ExploreEngagementResponse = {
  contentId: string;
  metrics: {
    likeCount: number;
    dislikeCount: number;
    commentCount: number;
    viewCount: number;
    totalEngagedMs: number;
    updatedAt?: string;
  } | null;
  history: Array<Record<string, unknown>>;
  comments: Array<Record<string, unknown>>;
};

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function tsToIso(value: unknown): string | undefined {
  const ts = value as admin.firestore.Timestamp | undefined;
  if (!ts || typeof ts.toDate !== 'function') return undefined;
  return ts.toDate().toISOString();
}

async function queryWithFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>
): Promise<T> {
  try {
    return await primary();
  } catch (e: unknown) {
    // Most common failure here is missing composite index; fallback to non-ordered query.
    return await fallback();
  }
}

export async function GET(request: NextRequest) {
  try {
    initFirebase();
    const db = admin.firestore();

    const contentId = request.nextUrl.searchParams.get('contentId')?.trim() || '';
    if (!contentId) {
      return NextResponse.json({ error: 'contentId is required' }, { status: 400 });
    }

    const metricsDoc = await db.collection('explore_content_metrics').doc(contentId).get();
    const metricsData = metricsDoc.exists ? metricsDoc.data() : undefined;

    const metrics = metricsData
      ? {
          likeCount: num(metricsData.likeCount),
          dislikeCount: num(metricsData.dislikeCount),
          commentCount: num(metricsData.commentCount),
          viewCount: num(metricsData.viewCount),
          totalEngagedMs: num(metricsData.totalEngagedMs),
          updatedAt: tsToIso(metricsData.updatedAt),
        }
      : null;

    const historySnap = await queryWithFallback(
      () =>
        db
          .collection('explore_history')
          .where('contentId', '==', contentId)
          .orderBy('timestamp', 'desc')
          .limit(50)
          .get(),
      () => db.collection('explore_history').where('contentId', '==', contentId).limit(50).get()
    );

    const history = historySnap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          timestamp: tsToIso(data.timestamp),
        } as Record<string, unknown>;
      })
      .sort((a, b) => {
        const at = typeof a.timestamp === 'string' ? Date.parse(a.timestamp) : 0;
        const bt = typeof b.timestamp === 'string' ? Date.parse(b.timestamp) : 0;
        return bt - at;
      });

    const commentsSnap = await queryWithFallback(
      () =>
        db
          .collection('explore_comments')
          .where('contentId', '==', contentId)
          .orderBy('timestamp', 'desc')
          .limit(50)
          .get(),
      () => db.collection('explore_comments').where('contentId', '==', contentId).limit(50).get()
    );

    const comments = commentsSnap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          timestamp: tsToIso(data.timestamp),
        } as Record<string, unknown>;
      })
      .sort((a, b) => {
        const at = typeof a.timestamp === 'string' ? Date.parse(a.timestamp) : 0;
        const bt = typeof b.timestamp === 'string' ? Date.parse(b.timestamp) : 0;
        return bt - at;
      });

    const response: ExploreEngagementResponse = {
      contentId,
      metrics,
      history,
      comments,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('Error fetching explore engagement:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch engagement';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



