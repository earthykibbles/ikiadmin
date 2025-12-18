'use client';

import { Clock, RefreshCw, Search, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

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
  recentEvents: Array<Record<string, unknown>>;
  scannedEvents: number;
  truncated: boolean;
};

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

export default function ExploreUserAnalytics() {
  const [days, setDays] = useState<number>(7);
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userDetail, setUserDetail] = useState<UserExploreResponse | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [userDetailError, setUserDetailError] = useState<string | null>(null);

  const fetchUsers = async (force = false) => {
    try {
      setError(null);
      if (force) setRefreshing(true);
      else setLoading(true);
      const res = await fetch(`/api/explore/users?days=${encodeURIComponent(String(days))}`);
      if (!res.ok) throw new Error('Failed to load Explore users');
      const json = (await res.json()) as UsersResponse;
      setData(json);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load Explore users';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: refresh when days change
  useEffect(() => {
    fetchUsers(false);
  }, [days]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = data?.items ?? [];
    if (!q) return items;
    return items.filter((u) => {
      return (
        u.userId.toLowerCase().includes(q) ||
        (u.username ? u.username.toLowerCase().includes(q) : false)
      );
    });
  }, [data, query]);

  const openUser = async (userId: string) => {
    try {
      setSelectedUserId(userId);
      setUserDetail(null);
      setUserDetailError(null);
      setUserDetailLoading(true);
      const res = await fetch(
        `/api/explore/user?userId=${encodeURIComponent(userId)}&days=${encodeURIComponent(String(days))}`
      );
      if (!res.ok) throw new Error('Failed to load user Explore activity');
      const json = (await res.json()) as UserExploreResponse;
      setUserDetail(json);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load user Explore activity';
      setUserDetailError(msg);
    } finally {
      setUserDetailLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-light-green" />
            <h3 className="heading-md text-iki-white">Explore users (per-user view)</h3>
          </div>
          <p className="body-sm text-iki-white/60">
            For each user: how long they engaged with Explore content, plus breakdown by content.
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
            onClick={() => fetchUsers(true)}
            disabled={loading || refreshing}
            className="btn-secondary"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-iki-white/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by userId or username..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white placeholder-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/50"
        />
      </div>

      {error && (
        <div className="mt-4 card-compact status-error">
          <p className="body-md">Error: {error}</p>
        </div>
      )}

      {loading && !data ? (
        <div className="mt-6 text-iki-white/60 body-sm">Loading…</div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-iki-white/60">
                <th className="text-left py-2 pr-3">User</th>
                <th className="text-right py-2 pr-3">Engaged</th>
                <th className="text-right py-2 pr-3">Views</th>
                <th className="text-right py-2 pr-3">Contents</th>
                <th className="text-right py-2 pr-3">Comments</th>
                <th className="text-right py-2 pr-3">Reactions</th>
                <th className="text-right py-2">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.userId} className="border-t border-white/10">
                  <td className="py-2 pr-3">
                    <button
                      type="button"
                      className="text-left"
                      onClick={() => openUser(u.userId)}
                      title="Open per-user Explore breakdown"
                    >
                      <div className="text-iki-white hover:underline line-clamp-1">
                        {u.username ? `@${u.username}` : u.userId}
                      </div>
                      <div className="text-xs text-iki-white/40 font-mono line-clamp-1">
                        {u.userId}
                      </div>
                    </button>
                  </td>
                  <td className="py-2 pr-3 text-right text-iki-white/80">
                    {fmtSeconds(u.engagedMs)}
                  </td>
                  <td className="py-2 pr-3 text-right text-iki-white/80">{fmtNumber(u.views)}</td>
                  <td className="py-2 pr-3 text-right text-iki-white/80">
                    {fmtNumber(u.uniqueContents)}
                  </td>
                  <td className="py-2 pr-3 text-right text-iki-white/80">
                    {fmtNumber(u.comments)}
                  </td>
                  <td className="py-2 pr-3 text-right text-iki-white/80">
                    {fmtNumber(u.reactions)}
                  </td>
                  <td className="py-2 text-right text-iki-white/60">{formatIso(u.lastSeenIso)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="mt-4 text-iki-white/60 body-sm">No users in this window.</div>
          )}
        </div>
      )}

      {(userDetailLoading || userDetailError || userDetail) && selectedUserId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-3xl p-6 border border-light-green/10 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="heading-md font-goldplay text-iki-white">
                  User Explore breakdown
                </div>
                <div className="text-xs text-iki-white/50 font-mono">{selectedUserId}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedUserId('');
                  setUserDetail(null);
                  setUserDetailError(null);
                }}
                className="px-4 py-2 rounded-xl bg-iki-grey/30 text-iki-white/80 border border-light-green/10 hover:bg-iki-grey/40 transition-colors body-sm font-tsukimi"
              >
                Close
              </button>
            </div>

            {userDetailLoading ? (
              <div className="text-iki-white/60 body-sm">Loading…</div>
            ) : userDetailError ? (
              <div className="card-compact status-error">
                <p className="body-md">Error: {userDetailError}</p>
              </div>
            ) : userDetail ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                  <div className="card-compact">
                    <div className="text-xs text-iki-white/60">Engaged</div>
                    <div className="heading-md text-iki-white">
                      {fmtSeconds(userDetail.totals.engagedMs)}
                    </div>
                  </div>
                  <div className="card-compact">
                    <div className="text-xs text-iki-white/60">Views</div>
                    <div className="heading-md text-iki-white">
                      {fmtNumber(userDetail.totals.views)}
                    </div>
                  </div>
                  <div className="card-compact">
                    <div className="text-xs text-iki-white/60">Contents</div>
                    <div className="heading-md text-iki-white">
                      {fmtNumber(userDetail.totals.uniqueContents)}
                    </div>
                  </div>
                  <div className="card-compact">
                    <div className="text-xs text-iki-white/60">Comments</div>
                    <div className="heading-md text-iki-white">
                      {fmtNumber(userDetail.totals.comments)}
                    </div>
                  </div>
                  <div className="card-compact">
                    <div className="text-xs text-iki-white/60">Reactions</div>
                    <div className="heading-md text-iki-white">
                      {fmtNumber(userDetail.totals.reactions)}
                    </div>
                  </div>
                  <div className="card-compact">
                    <div className="text-xs text-iki-white/60">Events</div>
                    <div className="heading-md text-iki-white">
                      {fmtNumber(userDetail.totals.events)}
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-light-green" />
                    <h4 className="heading-md text-iki-white">Per-content engagement</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="text-iki-white/60">
                          <th className="text-left py-2 pr-3">Title</th>
                          <th className="text-left py-2 pr-3">Category</th>
                          <th className="text-right py-2 pr-3">Engaged</th>
                          <th className="text-right py-2 pr-3">Views</th>
                          <th className="text-right py-2 pr-3">Comments</th>
                          <th className="text-right py-2">Last seen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userDetail.contentBreakdown.slice(0, 50).map((c) => (
                          <tr key={c.contentId} className="border-t border-white/10">
                            <td className="py-2 pr-3">
                              <div className="text-iki-white line-clamp-1">
                                {c.title || c.contentId}
                              </div>
                              <div className="text-xs text-iki-white/40 font-mono line-clamp-1">
                                {c.contentId}
                              </div>
                            </td>
                            <td className="py-2 pr-3 text-iki-white/70 capitalize">
                              {c.mediaCategory || '-'}
                            </td>
                            <td className="py-2 pr-3 text-right text-iki-white/80">
                              {fmtSeconds(c.engagedMs)}
                            </td>
                            <td className="py-2 pr-3 text-right text-iki-white/80">
                              {fmtNumber(c.views)}
                            </td>
                            <td className="py-2 pr-3 text-right text-iki-white/80">
                              {fmtNumber(c.comments)}
                            </td>
                            <td className="py-2 text-right text-iki-white/60">
                              {formatIso(c.lastSeenIso)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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



