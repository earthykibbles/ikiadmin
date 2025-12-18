'use client';

import { useEffect, useState } from 'react';

type AuditItem = {
  id: string;
  userId: string | null;
  action: string;
  severity: string;
  message: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
};

const SEVERITY_OPTIONS = ['info', 'low', 'medium', 'high', 'critical'] as const;

export default function ActivityLogPanel() {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severity, setSeverity] = useState<string>('all');
  const [query, setQuery] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('limit', '100');
      if (severity !== 'all') params.set('severity', severity);
      if (query.trim()) params.set('q', query.trim());

      const res = await fetch(`/api/admin/security/audit-log?${params.toString()}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load activity log');
      }
      const json = await res.json();
      setItems(json.items || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load activity log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial load
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  const badgeClassForSeverity = (value: string) => {
    switch (value) {
      case 'critical':
      case 'high':
        return 'bg-red-500/20 text-red-200 border-red-500/40';
      case 'medium':
        return 'bg-orange-500/20 text-orange-200 border-orange-500/40';
      case 'low':
        return 'bg-yellow-500/20 text-yellow-200 border-yellow-500/40';
      default:
        return 'bg-iki-grey/40 text-iki-white/80 border-iki-grey/60';
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="heading-lg font-goldplay text-iki-white">Security activity log</h1>
        <p className="body-sm text-iki-white/70">
          Inspect who did what in the iki-gen admin. Filter by severity, user, and free text to
          investigate issues.
        </p>
      </header>

      <section className="card space-y-4">
        <form
          onSubmit={handleFilterSubmit}
          className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
        >
          <div className="flex flex-1 flex-col gap-2 md:flex-row">
            <div className="flex-1">
              <label className="body-xs text-iki-white/70">Search</label>
              <input
                type="text"
                placeholder="Action, message, IP, email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input-standard w-full"
              />
            </div>
            <div className="w-full md:w-48">
              <label className="body-xs text-iki-white/70">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="input-standard w-full"
              >
                <option value="all">All</option>
                {SEVERITY_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-light-green text-iki-brown font-semibold body-sm shadow-lg shadow-light-green/20 hover:shadow-light-green/30 hover:bg-emerald-300 transition-all self-stretch md:self-auto"
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Apply filters'}
          </button>
        </form>
      </section>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="min-w-full text-left border-separate border-spacing-y-1">
            <thead>
              <tr className="text-iki-white/60 body-xs uppercase tracking-wide">
                <th className="px-4 py-2 whitespace-nowrap">Time</th>
                <th className="px-4 py-2 whitespace-nowrap">User</th>
                <th className="px-4 py-2 whitespace-nowrap">Action</th>
                <th className="px-4 py-2 whitespace-nowrap">Severity</th>
                <th className="px-4 py-2 whitespace-nowrap">Details</th>
                <th className="px-4 py-2 whitespace-nowrap">IP / Agent</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-iki-white/60 body-sm">
                    Loading activity…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-red-400 body-sm">
                    {error}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-iki-white/60 body-sm">
                    No activity found for the selected filters.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-4 py-3 body-xs text-iki-white/80 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 body-xs text-iki-white/80 whitespace-nowrap">
                      {item.userEmail || item.userName || item.userId || '—'}
                    </td>
                    <td className="px-4 py-3 body-xs text-iki-white/80 whitespace-nowrap">
                      <code className="px-2 py-1 rounded bg-iki-grey/60 text-iki-white/90 text-[11px]">
                        {item.action}
                      </code>
                    </td>
                    <td className="px-4 py-3 body-xs whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${badgeClassForSeverity(
                          item.severity
                        )}`}
                      >
                        {item.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 body-xs text-iki-white/70 max-w-md">
                      {item.message || '—'}
                    </td>
                    <td className="px-4 py-3 body-xs text-iki-white/60 whitespace-nowrap">
                      {item.ipAddress || '—'}
                      <br />
                      <span className="text-[10px] text-iki-white/40 line-clamp-1">
                        {item.userAgent || ''}
                      </span>
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

