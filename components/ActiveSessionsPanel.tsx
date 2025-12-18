'use client';

import { useEffect, useState } from 'react';

type ActiveSession = {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  userName: string | null;
  userEmail: string | null;
};

type SessionsResponse = {
  sessions: ActiveSession[];
  limit: number;
  policy: {
    maxActiveSessionsPerUser: number;
  };
};

export default function ActiveSessionsPanel() {
  const [data, setData] = useState<SessionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/admin/security/sessions?limit=200', { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load active sessions');
      }
      const json = (await res.json()) as SessionsResponse;
      setData(json);
    } catch (err: any) {
      setError(err?.message || 'Failed to load active sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="heading-lg font-goldplay text-iki-white">Active sessions</h1>
        <p className="body-sm text-iki-white/70">
          See who is currently signed into the iki-gen admin, from where, and for how long.
        </p>
      </header>

      <section className="card space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="body-xs text-iki-white/60">
              Active sessions are determined by non-expired Better Auth sessions in the database.
            </p>
            {data?.policy?.maxActiveSessionsPerUser ? (
              <p className="body-xs text-iki-white/50">
                Policy: up to{' '}
                <span className="font-semibold">
                  {data.policy.maxActiveSessionsPerUser.toLocaleString()}
                </span>{' '}
                concurrent sessions per user.
              </p>
            ) : (
              <p className="body-xs text-iki-white/50">
                Policy: unlimited concurrent sessions per user (can be restricted in security
                settings).
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={load}
            className="px-4 py-2 rounded-xl bg-iki-grey/40 text-iki-white/80 body-xs border border-light-green/30 hover:bg-iki-grey/60 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="min-w-full text-left border-separate border-spacing-y-1">
            <thead>
              <tr className="text-iki-white/60 body-xs uppercase tracking-wide">
                <th className="px-4 py-2 whitespace-nowrap">User</th>
                <th className="px-4 py-2 whitespace-nowrap">IP</th>
                <th className="px-4 py-2 whitespace-nowrap">User agent</th>
                <th className="px-4 py-2 whitespace-nowrap">Started</th>
                <th className="px-4 py-2 whitespace-nowrap">Last updated</th>
                <th className="px-4 py-2 whitespace-nowrap">Expires</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-iki-white/60 body-sm">
                    Loading sessions…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-red-400 body-sm">
                    {error}
                  </td>
                </tr>
              ) : !data || data.sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-iki-white/60 body-sm">
                    No active sessions found.
                  </td>
                </tr>
              ) : (
                data.sessions.map((s) => (
                  <tr key={s.id} className="align-top">
                    <td className="px-4 py-3 body-xs text-iki-white/80 whitespace-nowrap">
                      {s.userEmail || s.userName || s.userId}
                    </td>
                    <td className="px-4 py-3 body-xs text-iki-white/80 whitespace-nowrap">
                      {s.ipAddress || '—'}
                    </td>
                    <td className="px-4 py-3 body-xs text-iki-white/60 max-w-md">
                      <span className="text-[10px] line-clamp-2">{s.userAgent || '—'}</span>
                    </td>
                    <td className="px-4 py-3 body-xs text-iki-white/70 whitespace-nowrap">
                      {new Date(s.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 body-xs text-iki-white/70 whitespace-nowrap">
                      {new Date(s.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 body-xs text-iki-white/70 whitespace-nowrap">
                      {new Date(s.expiresAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

