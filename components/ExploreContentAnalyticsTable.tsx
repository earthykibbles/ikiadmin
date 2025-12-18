'use client';

import { Clock, Eye, MessageCircle, RefreshCw, Search, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

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

type EngagementResponse = {
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getString(obj: Record<string, unknown> | null, key: string): string {
  if (!obj) return '';
  const v = obj[key];
  return typeof v === 'string' ? v : '';
}

function fmtNumber(n: number) {
  return Number.isFinite(n) ? n.toLocaleString() : '0';
}

function fmtSeconds(ms: number) {
  const s = Math.max(0, ms) / 1000;
  if (s < 60) return `${(Math.round(s * 10) / 10).toLocaleString()}s`;
  const m = s / 60;
  if (m < 60) return `${(Math.round(m * 10) / 10).toLocaleString()}m`;
  const h = m / 60;
  return `${(Math.round(h * 10) / 10).toLocaleString()}h`;
}

function formatIso(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Large table + modal component
export default function ExploreContentAnalyticsTable() {
  const [sort, setSort] = useState<SortKey>('totalEngagedMs');
  const [limit, setLimit] = useState<number>(50);

  const [items, setItems] = useState<MetricsRow[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<EngagementResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const hasMore = !!cursor;

  const load = async (mode: 'reset' | 'more') => {
    try {
      setError(null);
      if (mode === 'reset') setLoading(true);
      else setLoadingMore(true);

      const params = new URLSearchParams();
      params.set('sort', sort);
      params.set('limit', String(limit));
      if (mode === 'more' && cursor) params.set('cursor', cursor);

      const res = await fetch(`/api/explore/metrics?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load Explore content metrics');
      const data = (await res.json()) as MetricsResponse;

      if (mode === 'reset') {
        setItems(data.items || []);
      } else {
        setItems((prev) => [...prev, ...(data.items || [])]);
      }
      setCursor(data.nextCursor);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load Explore content metrics';
      setError(msg);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: refresh when sort/limit changes
  useEffect(() => {
    setCursor(undefined);
    load('reset');
  }, [sort, limit]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => {
      return (
        i.title.toLowerCase().includes(q) ||
        i.contentId.toLowerCase().includes(q) ||
        i.mediaCategory.toLowerCase().includes(q) ||
        i.mediaType.toLowerCase().includes(q)
      );
    });
  }, [items, query]);

  const openDetails = async (contentId: string) => {
    try {
      setDetailError(null);
      setDetailLoading(true);
      setDetail(null);
      const res = await fetch(`/api/explore/engagement?contentId=${encodeURIComponent(contentId)}`);
      if (!res.ok) throw new Error('Failed to fetch engagement details');
      const data = (await res.json()) as EngagementResponse;
      setDetail(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch engagement details';
      setDetailError(msg);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="heading-md text-iki-white">Explore content performance</h3>
          <p className="body-sm text-iki-white/60">
            Table of <span className="font-mono">explore_content_metrics</span> (all-time
            aggregates).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="px-3 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
          >
            <option value="totalEngagedMs">Sort: engaged time</option>
            <option value="viewCount">Sort: views</option>
            <option value="likeCount">Sort: likes</option>
            <option value="dislikeCount">Sort: dislikes</option>
            <option value="commentCount">Sort: comments</option>
            <option value="updatedAt">Sort: last updated</option>
          </select>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-3 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
          >
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
            <option value={100}>100 rows</option>
          </select>
          <button
            type="button"
            onClick={() => load('reset')}
            disabled={loading || loadingMore}
            className="btn-secondary"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-iki-white/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, id, category, type..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white placeholder-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/50"
        />
      </div>

      {error && (
        <div className="mt-4 card-compact status-error">
          <p className="body-md">Error: {error}</p>
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="mt-6 text-iki-white/60 body-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 text-iki-white/60 body-sm">No rows.</div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-iki-white/60">
                <th className="text-left py-2 pr-3">Title</th>
                <th className="text-left py-2 pr-3">Category</th>
                <th className="text-right py-2 pr-3">
                  <span className="inline-flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> Views
                  </span>
                </th>
                <th className="text-right py-2 pr-3">
                  <span className="inline-flex items-center gap-1">
                    <ThumbsUp className="w-3.5 h-3.5 text-light-green" /> Likes
                  </span>
                </th>
                <th className="text-right py-2 pr-3">
                  <span className="inline-flex items-center gap-1">
                    <ThumbsDown className="w-3.5 h-3.5 text-red-400" /> Dislikes
                  </span>
                </th>
                <th className="text-right py-2 pr-3">
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5" /> Comments
                  </span>
                </th>
                <th className="text-right py-2 pr-3">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Engaged
                  </span>
                </th>
                <th className="text-right py-2 pr-3">Avg / view</th>
                <th className="text-right py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const avg = row.viewCount > 0 ? row.totalEngagedMs / row.viewCount : 0;
                return (
                  <tr key={row.contentId} className="border-t border-white/10">
                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        className="text-left"
                        onClick={() => openDetails(row.contentId)}
                        title="Open details"
                      >
                        <div className="text-iki-white line-clamp-1 hover:underline">
                          {row.title || row.contentId}
                        </div>
                        <div className="text-xs text-iki-white/40 font-mono line-clamp-1">
                          {row.contentId}
                        </div>
                      </button>
                    </td>
                    <td className="py-2 pr-3 text-iki-white/70 capitalize">
                      {row.mediaCategory || '-'}
                    </td>
                    <td className="py-2 pr-3 text-right text-iki-white/80">
                      {fmtNumber(row.viewCount)}
                    </td>
                    <td className="py-2 pr-3 text-right text-iki-white/80">
                      {fmtNumber(row.likeCount)}
                    </td>
                    <td className="py-2 pr-3 text-right text-iki-white/80">
                      {fmtNumber(row.dislikeCount)}
                    </td>
                    <td className="py-2 pr-3 text-right text-iki-white/80">
                      {fmtNumber(row.commentCount)}
                    </td>
                    <td className="py-2 pr-3 text-right text-iki-white/80">
                      {fmtSeconds(row.totalEngagedMs)}
                    </td>
                    <td className="py-2 pr-3 text-right text-iki-white/80">{fmtSeconds(avg)}</td>
                    <td className="py-2 text-right text-iki-white/60">
                      {formatIso(row.updatedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-xs text-iki-white/50">
          Showing {fmtNumber(filtered.length)} row(s){query.trim() ? ' (filtered)' : ''}.
        </div>
        <div className="flex items-center gap-2">
          {hasMore && (
            <button
              type="button"
              onClick={() => load('more')}
              disabled={loading || loadingMore}
              className="btn-secondary"
            >
              <RefreshCw className={`w-4 h-4 ${loadingMore ? 'animate-spin' : ''}`} />
              Load more
            </button>
          )}
        </div>
      </div>

      {(detailLoading || detailError || detail) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-3xl p-6 border border-light-green/10 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="heading-md font-goldplay text-iki-white">Content details</div>
                <div className="text-xs text-iki-white/50 font-mono">{detail?.contentId || ''}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDetail(null);
                  setDetailError(null);
                }}
                className="px-4 py-2 rounded-xl bg-iki-grey/30 text-iki-white/80 border border-light-green/10 hover:bg-iki-grey/40 transition-colors body-sm font-tsukimi"
              >
                Close
              </button>
            </div>

            {detailLoading ? (
              <div className="text-iki-white/60 body-sm">Loading details…</div>
            ) : detailError ? (
              <div className="card-compact status-error">
                <p className="body-md">Error: {detailError}</p>
              </div>
            ) : detail ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <div className="card-compact">
                    <div className="text-xs text-iki-white/60">Views</div>
                    <div className="heading-md text-iki-white">
                      {fmtNumber(detail.metrics?.viewCount ?? 0)}
                    </div>
                  </div>
                  <div className="card-compact">
                    <div className="text-xs text-iki-white/60">Likes</div>
                    <div className="heading-md text-iki-white">
                      {fmtNumber(detail.metrics?.likeCount ?? 0)}
                    </div>
                  </div>
                  <div className="card-compact">
                    <div className="text-xs text-iki-white/60">Dislikes</div>
                    <div className="heading-md text-iki-white">
                      {fmtNumber(detail.metrics?.dislikeCount ?? 0)}
                    </div>
                  </div>
                  <div className="card-compact">
                    <div className="text-xs text-iki-white/60">Comments</div>
                    <div className="heading-md text-iki-white">
                      {fmtNumber(detail.metrics?.commentCount ?? 0)}
                    </div>
                  </div>
                  <div className="card-compact">
                    <div className="text-xs text-iki-white/60">Engaged</div>
                    <div className="heading-md text-iki-white">
                      {fmtSeconds(detail.metrics?.totalEngagedMs ?? 0)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl bg-iki-grey/20 border border-light-green/10 p-3">
                    <div className="text-xs text-iki-white/60 mb-2">Recent events</div>
                    {detail.history.length === 0 ? (
                      <div className="text-xs text-iki-white/40">No events.</div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {detail.history.slice(0, 25).map((evt) => {
                          const obj = asRecord(evt);
                          const eventType = getString(obj, 'eventType') || 'event';
                          const ts = getString(obj, 'timestamp');
                          const userId = getString(obj, 'userId');
                          const id = getString(obj, 'id');
                          const key = id || `${eventType}-${ts}-${userId}`;
                          return (
                            <div
                              key={key}
                              className="text-xs text-iki-white/80 border-b border-white/5 pb-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-iki-white/70">{eventType}</span>
                                <span className="text-iki-white/40">{ts}</span>
                              </div>
                              <div className="text-iki-white/50 font-mono truncate">
                                {userId ? `user:${userId}` : ''}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl bg-iki-grey/20 border border-light-green/10 p-3">
                    <div className="text-xs text-iki-white/60 mb-2">Recent comments</div>
                    {detail.comments.length === 0 ? (
                      <div className="text-xs text-iki-white/40">No comments.</div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {detail.comments.slice(0, 25).map((c) => {
                          const obj = asRecord(c);
                          const username = getString(obj, 'username') || 'Iki user';
                          const ts = getString(obj, 'timestamp');
                          const comment = getString(obj, 'comment');
                          const id = getString(obj, 'id') || getString(obj, 'commentId');
                          const key = id || `${username}-${ts}-${comment.slice(0, 24)}`;
                          return (
                            <div
                              key={key}
                              className="text-xs text-iki-white/80 border-b border-white/5 pb-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-iki-white/70">{username}</span>
                                <span className="text-iki-white/40">{ts}</span>
                              </div>
                              <div className="text-iki-white/80 line-clamp-2">{comment}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}



