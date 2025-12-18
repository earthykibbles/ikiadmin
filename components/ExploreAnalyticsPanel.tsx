'use client';

import ExploreContentAnalyticsTable from '@/components/ExploreContentAnalyticsTable';
import ExploreUserAnalytics from '@/components/ExploreUserAnalytics';
import {
  type ExploreRecentEvent,
  type ExploreStatsResponse,
  type ExploreTopItem,
  clearExploreStatsCache,
  getCachedExploreStats,
} from '@/lib/exploreAnalyticsCache';
import {
  Clock,
  Compass,
  Eye,
  MessageCircle,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Large dashboard widget
export default function ExploreAnalyticsPanel() {
  const [tab, setTab] = useState<'overview' | 'content' | 'users'>('overview');
  const [days, setDays] = useState<number>(7);
  const [data, setData] = useState<ExploreStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async (force = false) => {
    try {
      setError(null);
      if (force) setRefreshing(true);
      else setLoading(true);
      if (force) clearExploreStatsCache();
      const stats = await getCachedExploreStats(days, force);
      setData(stats);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load Explore stats';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: reload when window changes
  useEffect(() => {
    if (tab !== 'overview') return;
    fetchStats(false);
  }, [days, tab]);

  const allTime = data?.totalsAllTime;
  const window = data?.window;

  const top = useMemo(() => {
    const list = data?.topAllTime?.byEngagedMs ?? [];
    return Array.isArray(list) ? (list.slice(0, 8) as ExploreTopItem[]) : [];
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTab('overview')}
          className={`px-4 py-2 rounded-xl border transition-colors body-sm font-tsukimi ${
            tab === 'overview'
              ? 'bg-light-green/20 text-light-green border-light-green/30'
              : 'bg-iki-grey/30 text-iki-white/70 border-light-green/10 hover:bg-iki-grey/40'
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setTab('content')}
          className={`px-4 py-2 rounded-xl border transition-colors body-sm font-tsukimi ${
            tab === 'content'
              ? 'bg-light-green/20 text-light-green border-light-green/30'
              : 'bg-iki-grey/30 text-iki-white/70 border-light-green/10 hover:bg-iki-grey/40'
          }`}
        >
          Content table
        </button>
        <button
          type="button"
          onClick={() => setTab('users')}
          className={`px-4 py-2 rounded-xl border transition-colors body-sm font-tsukimi ${
            tab === 'users'
              ? 'bg-light-green/20 text-light-green border-light-green/30'
              : 'bg-iki-grey/30 text-iki-white/70 border-light-green/10 hover:bg-iki-grey/40'
          }`}
        >
          Users
        </button>
      </div>

      {tab === 'overview' && (
        <div className="card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Compass className="w-5 h-5 text-light-green" />
                <h3 className="heading-md text-iki-white">Explore Engagement</h3>
              </div>
              <p className="body-sm text-iki-white/60">
                Aggregated metrics from <span className="font-mono">explore_*</span> collections.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="px-3 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <button
                type="button"
                onClick={() => fetchStats(true)}
                disabled={refreshing || loading}
                className="btn-secondary"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 card-compact status-error">
              <p className="body-md">Error: {error}</p>
            </div>
          )}

          {loading && !data ? (
            <div className="mt-6 grid-metrics">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card animate-pulse">
                  <div className="skeleton h-4 w-24 mb-2" />
                  <div className="skeleton h-8 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="mt-6 grid-metrics">
                <Metric
                  icon={<Eye className="w-5 h-5" />}
                  title={`Views (${days}d)`}
                  value={fmtNumber(window?.views ?? 0)}
                  subtitle={`${fmtNumber(window?.events ?? 0)} events`}
                  color="from-blue-500 to-blue-600"
                />
                <Metric
                  icon={<Clock className="w-5 h-5" />}
                  title={`Engaged (${days}d)`}
                  value={fmtSeconds(window?.engagedMs ?? 0)}
                  subtitle={`Sessions: ${fmtNumber(window?.uniqueSessions ?? 0)}`}
                  color="from-light-green to-[#a8d91a]"
                />
                <Metric
                  icon={<Users className="w-5 h-5" />}
                  title={`Active users (${days}d)`}
                  value={fmtNumber(window?.uniqueUsers ?? 0)}
                  subtitle={`All-time contents: ${fmtNumber(allTime?.contents ?? 0)}`}
                  color="from-purple-500 to-purple-600"
                />
                <Metric
                  icon={<MessageCircle className="w-5 h-5" />}
                  title={`Comments (${days}d)`}
                  value={fmtNumber(window?.comments ?? 0)}
                  subtitle={`All-time: ${fmtNumber(allTime?.commentCount ?? 0)}`}
                  color="from-orange-500 to-orange-600"
                />
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card-compact">
                  <div className="flex items-center gap-2 mb-2 text-iki-white/60 body-sm">
                    <ThumbsUp className="w-4 h-4 text-light-green" />
                    Likes (all-time)
                  </div>
                  <div className="heading-md text-iki-white">
                    {fmtNumber(allTime?.likeCount ?? 0)}
                  </div>
                </div>
                <div className="card-compact">
                  <div className="flex items-center gap-2 mb-2 text-iki-white/60 body-sm">
                    <ThumbsDown className="w-4 h-4 text-red-400" />
                    Dislikes (all-time)
                  </div>
                  <div className="heading-md text-iki-white">
                    {fmtNumber(allTime?.dislikeCount ?? 0)}
                  </div>
                </div>
                <div className="card-compact">
                  <div className="flex items-center gap-2 mb-2 text-iki-white/60 body-sm">
                    <Clock className="w-4 h-4 text-light-green" />
                    Engaged (all-time)
                  </div>
                  <div className="heading-md text-iki-white">
                    {fmtSeconds(allTime?.totalEngagedMs ?? 0)}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="heading-md text-iki-white">Top content (by engaged time)</h4>
                    <div className="body-sm text-iki-white/50">
                      Window: {formatIso(data?.windowStartIso)} → {formatIso(data?.windowEndIso)}
                    </div>
                  </div>
                  {top.length === 0 ? (
                    <div className="text-iki-white/60 body-sm">No metrics yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="text-iki-white/60">
                            <th className="text-left py-2 pr-3">Title</th>
                            <th className="text-left py-2 pr-3">Category</th>
                            <th className="text-right py-2 pr-3">Views</th>
                            <th className="text-right py-2 pr-3">Comments</th>
                            <th className="text-right py-2">Engaged</th>
                          </tr>
                        </thead>
                        <tbody>
                          {top.map((item) => (
                            <tr key={item.contentId} className="border-t border-white/10">
                              <td className="py-2 pr-3">
                                <div className="text-iki-white line-clamp-1">
                                  {item.title || item.contentId}
                                </div>
                                <div className="text-xs text-iki-white/40 font-mono line-clamp-1">
                                  {item.contentId}
                                </div>
                              </td>
                              <td className="py-2 pr-3 text-iki-white/70 capitalize">
                                {item.mediaCategory || '-'}
                              </td>
                              <td className="py-2 pr-3 text-right text-iki-white/80">
                                {fmtNumber(item.viewCount || 0)}
                              </td>
                              <td className="py-2 pr-3 text-right text-iki-white/80">
                                {fmtNumber(item.commentCount || 0)}
                              </td>
                              <td className="py-2 text-right text-iki-white/80">
                                {fmtSeconds(item.totalEngagedMs || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="heading-md text-iki-white">Recent Explore events</h4>
                    <div className="body-sm text-iki-white/50">Showing last 50</div>
                  </div>

                  {(data?.recentEvents?.length ?? 0) === 0 ? (
                    <div className="text-iki-white/60 body-sm">No events yet.</div>
                  ) : (
                    <div className="space-y-2 max-h-[360px] overflow-y-auto">
                      {(data?.recentEvents ?? []).slice(0, 30).map((evt: ExploreRecentEvent) => (
                        <div
                          key={evt.id}
                          className="rounded-xl bg-iki-grey/20 border border-light-green/10 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-iki-white font-mono text-xs">{evt.eventType}</div>
                            <div className="text-iki-white/50 text-xs">
                              {formatIso(evt.timestamp)}
                            </div>
                          </div>
                          <div className="mt-1 text-iki-white/80 text-sm line-clamp-1">
                            {evt.title || evt.contentId || '-'}
                          </div>
                          <div className="mt-1 text-iki-white/40 text-xs font-mono line-clamp-1">
                            user:{String(evt.userId || '-')}
                            {evt.sessionId ? ` · session:${String(evt.sessionId)}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {data?.scanned?.truncated && (
                    <div className="mt-3 text-xs text-iki-white/50">
                      Note: results may be truncated (safety caps) to avoid quota spikes.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'content' && <ExploreContentAnalyticsTable />}
      {tab === 'users' && <ExploreUserAnalytics />}
    </div>
  );
}

function Metric({
  icon,
  title,
  value,
  subtitle,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white`}
        >
          {icon}
        </div>
        <div className="body-sm text-iki-white/60 font-medium">{title}</div>
      </div>
      <div className="heading-lg text-iki-white mb-1">{value}</div>
      <div className="body-sm text-iki-white/60">{subtitle}</div>
    </div>
  );
}



