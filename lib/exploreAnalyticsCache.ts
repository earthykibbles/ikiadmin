// Client-side in-memory cache for Explore engagement analytics.
// Keeps data stable until manual refresh to avoid expensive Firestore aggregation.

export type ExploreTopItem = {
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

export type ExploreRecentEvent = {
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
};

export type ExploreStatsResponse = {
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
    byEngagedMs: ExploreTopItem[];
    byViews: ExploreTopItem[];
    byLikes: ExploreTopItem[];
    byComments: ExploreTopItem[];
  };
  recentEvents: ExploreRecentEvent[];
  scanned: {
    metricsDocs: number;
    historyDocs: number;
    truncated: boolean;
  };
};

type CacheKey = string;

const exploreCache: {
  data: Map<CacheKey, ExploreStatsResponse>;
  timestamp: Map<CacheKey, number>;
} = {
  data: new Map(),
  timestamp: new Map(),
};

const loadingPromises: Map<CacheKey, Promise<ExploreStatsResponse>> = new Map();

function key(days: number) {
  return `explore_stats?days=${days}`;
}

export async function getCachedExploreStats(
  days: number,
  forceRefresh = false
): Promise<ExploreStatsResponse> {
  const k = key(days);
  if (!forceRefresh && exploreCache.data.has(k)) {
    const cached = exploreCache.data.get(k);
    if (cached) return cached;
  }

  if (!forceRefresh && loadingPromises.has(k)) {
    const existing = loadingPromises.get(k);
    if (existing) return existing;
  }

  const fetchPromise = fetch(`/api/explore/stats?days=${encodeURIComponent(String(days))}`)
    .then((response) => {
      if (!response.ok) throw new Error('Failed to fetch Explore stats');
      return response.json();
    })
    .then((data: ExploreStatsResponse) => {
      exploreCache.data.set(k, data);
      exploreCache.timestamp.set(k, Date.now());
      loadingPromises.delete(k);
      return data;
    })
    .catch((error) => {
      loadingPromises.delete(k);
      throw error;
    });

  if (!forceRefresh) {
    loadingPromises.set(k, fetchPromise);
  }

  return fetchPromise;
}

export function clearExploreStatsCache(): void {
  exploreCache.data.clear();
  exploreCache.timestamp.clear();
  loadingPromises.clear();
}



