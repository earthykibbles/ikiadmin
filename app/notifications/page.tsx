'use client';

import type { NotificationRouterConfig } from '@/lib/notification_router';
import { NOTIFICATION_TYPES } from '@/lib/notification_types';
import Avatar from '@/components/Avatar';
import { getUserAvatarSeed, getUserLabel, getUserSecondaryLabel, shortId } from '@/lib/privacy';
import { usePrivacyMode } from '@/lib/usePrivacyMode';
import { Bell, Loader2, Pencil, PlayCircle, RefreshCw, Save, Send, Trash2 } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';

type QueueStats = { pending: number; sent: number; failed: number; skipped: number };
type ConfigSummary = {
  globalEnabled: boolean;
  processingEnabled: boolean;
  autoCronEnabled: boolean;
  connectEnabled: boolean;
  engagementEnabled: boolean;
  firstTimeEnabled: boolean;
  recurringEnabled: boolean;
};
type QueueStatusFilter = 'pending' | 'sent' | 'failed' | 'skipped' | 'all';
type QueueItem = {
  id: string;
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  category: string | null;
  type: string | null;
  title: string;
  body: string;
  recipient_id: string | null;
  sender_id: string | null;
  sender_name: string | null;
  scheduled_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  error: string | null;
  error_code: string | null;
  skipped_reason: string | null;
  campaign_kind: string | null;
  campaign_id: string | null;
  repeat: string | null;
  interval_days: number | null;
  days_of_week: number[] | null;
  remaining_occurrences: number | null;
  retry_after_ms: number | null;
};

type BroadcastRow = {
  id: string;
  status: string;
  title: string;
  type: string;
  total_enqueued?: number;
  created_at?: string | null;
  [key: string]: unknown;
};

type UserRow = {
  id: string;
  firstname?: string;
  lastname?: string;
  username?: string;
  email?: string;
  [key: string]: unknown;
};

type ComposeResult = {
  mode?: 'broadcast' | 'users';
  broadcastId?: string;
  created?: number;
  [key: string]: unknown;
};

function errorMessage(e: unknown, fallback: string) {
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function clampInt(value: string, min: number, max: number, fallback: number) {
  const n = Number.parseInt(value, 10);
  if (Number.isFinite(n)) return Math.min(Math.max(n, min), max);
  return fallback;
}

function timeToString(t: { hour: number; minute: number }) {
  const hh = String(t.hour).padStart(2, '0');
  const mm = String(t.minute).padStart(2, '0');
  return `${hh}:${mm}`;
}

function parseTime(value: string) {
  const [h, m] = value.split(':');
  const hour = clampInt(h ?? '', 0, 23, 0);
  const minute = clampInt(m ?? '', 0, 59, 0);
  return { hour, minute };
}

export default function NotificationsControlPage() {
  const { privacyMode } = usePrivacyMode();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'routing' | 'composer' | 'broadcasts'
  >('composer');
  const [routingTab, setRoutingTab] = useState<'engagement' | 'connect'>('engagement');
  const [connectEditing, setConnectEditing] = useState(false);
  const [engagementEditing, setEngagementEditing] = useState(false);

  const [stats, setStats] = useState<QueueStats | null>(null);
  const [configSummary, setConfigSummary] = useState<ConfigSummary | null>(null);
  const [config, setConfig] = useState<NotificationRouterConfig | null>(null);
  const [lastRun, setLastRun] = useState<Record<string, unknown> | null>(null);
  const [broadcasts, setBroadcasts] = useState<BroadcastRow[]>([]);
  const [broadcastsLoading, setBroadcastsLoading] = useState(false);
  const [broadcastExpanded, setBroadcastExpanded] = useState<Record<string, boolean>>({});

  // Queue browser state
  const [queueStatus, setQueueStatus] = useState<QueueStatusFilter>('pending');
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [queueCursor, setQueueCursor] = useState<string | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueActionId, setQueueActionId] = useState<string | null>(null);
  const [queueExpanded, setQueueExpanded] = useState<Record<string, boolean>>({});

  // Composer state
  const [composeTitle, setComposeTitle] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeType, setComposeType] = useState('iki_home');
  const [composeAudienceMode, setComposeAudienceMode] = useState<'all' | 'users'>('users');
  const [composeUserQuery, setComposeUserQuery] = useState('');
  const [composeUsers, setComposeUsers] = useState<UserRow[]>([]);
  const [composeUsersCursor, setComposeUsersCursor] = useState<string | null>(null);
  const [composeUsersLoading, setComposeUsersLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [composeScheduleMode, setComposeScheduleMode] = useState<
    'now' | 'at_utc' | 'at_user_local'
  >('now');
  const [composeAtUtc, setComposeAtUtc] = useState<string>('');
  const [composeLocalTime, setComposeLocalTime] = useState('09:00');
  const [composeRepeatMode, setComposeRepeatMode] = useState<
    'none' | 'daily' | 'every_n_days' | 'weekdays'
  >('none');
  const [composeIntervalDays, setComposeIntervalDays] = useState(2);
  const [composeDaysOfWeek, setComposeDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [composeOccurrences, setComposeOccurrences] = useState<number | null>(null);
  const [composeSending, setComposeSending] = useState(false);
  const [composeResult, setComposeResult] = useState<ComposeResult | null>(null);

  const dirty = useMemo(() => config != null, [config]);

  async function loadAll() {
    setError(null);
    setLoading(true);
    try {
      const statsRes = await fetch('/api/notifications/stats', { cache: 'no-store' });
      if (!statsRes.ok) throw new Error((await statsRes.json()).error || 'Failed to load stats');

      const statsJson = (await statsRes.json()) as { stats?: QueueStats; configSummary?: ConfigSummary };
      setStats(statsJson.stats || null);
      setConfigSummary(statsJson.configSummary || null);
    } catch (e: unknown) {
      setError(errorMessage(e, 'Failed to load notifications control data'));
    } finally {
      setLoading(false);
    }
  }

  async function loadConfig() {
    setConfigLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/notifications/config', { cache: 'no-store' });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        config?: NotificationRouterConfig;
      };
      if (!res.ok) throw new Error(json.error || 'Failed to load config');
      setConfig(json.config || null);
    } catch (e: unknown) {
      setError(errorMessage(e, 'Failed to load config'));
    } finally {
      setConfigLoading(false);
    }
  }

  async function loadBroadcasts() {
    setBroadcastsLoading(true);
    try {
      const res = await fetch('/api/notifications/broadcasts?limit=30', { cache: 'no-store' });
      const json = (await res.json()) as { error?: string; broadcasts?: BroadcastRow[] };
      if (!res.ok) throw new Error(json.error || 'Failed to load broadcasts');
      setBroadcasts(json.broadcasts || []);
    } catch (e: unknown) {
      setError(errorMessage(e, 'Failed to load broadcasts'));
    } finally {
      setBroadcastsLoading(false);
    }
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/notifications/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      const json = (await res.json()) as { error?: string; config?: NotificationRouterConfig };
      if (!res.ok) throw new Error(json.error || 'Failed to save');
      setConfig(json.config || null);
    } catch (e: unknown) {
      setError(errorMessage(e, 'Failed to save config'));
    } finally {
      setSaving(false);
    }
  }

  async function run(task: 'schedule' | 'broadcasts' | 'process' | 'all') {
    setRunning(task);
    setError(null);
    try {
      const res = await fetch('/api/notifications/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, limit: 150 }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; [k: string]: unknown };
      if (!res.ok || !json.ok) throw new Error(String(json.error || 'Run failed'));
      setLastRun(json);
      await loadAll();
      if (activeTab === 'overview') {
        await loadQueue(true);
      }
      if (activeTab === 'broadcasts' || broadcasts.length > 0) {
        await loadBroadcasts();
      }
    } catch (e: unknown) {
      setError(errorMessage(e, 'Run failed'));
    } finally {
      setRunning(null);
    }
  }

  async function loadQueue(reset = true) {
    setQueueLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('status', queueStatus);
      params.set('limit', '30');
      if (!reset && queueCursor) params.set('cursor', queueCursor);
      const res = await fetch(`/api/notifications/queue?${params.toString()}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load queue');
      const items = (json.items || []) as QueueItem[];
      const nextCursor = (json.nextCursor as string | null) || null;
      setQueueItems((prev) => (reset ? items : [...prev, ...items]));
      setQueueCursor(nextCursor);
    } catch (e: unknown) {
      setError(errorMessage(e, 'Failed to load queue'));
    } finally {
      setQueueLoading(false);
    }
  }

  async function sendQueueItem(id: string) {
    setQueueActionId(id);
    setError(null);
    try {
      const res = await fetch(`/api/notifications/queue/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string; error?: string; [k: string]: unknown };
      if (!res.ok || !json.ok)
        throw new Error(String(json.message || json.error || 'Failed to send queue item'));
      setLastRun((prev) => ({ ...asRecord(prev), sendOne: json }));
      await loadAll();
      await loadQueue(true);
    } catch (e: unknown) {
      setError(errorMessage(e, 'Failed to send queue item'));
    } finally {
      setQueueActionId(null);
    }
  }

  async function removeQueueItem(id: string) {
    setQueueActionId(id);
    setError(null);
    try {
      const res = await fetch(`/api/notifications/queue/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'manual_removed' }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || 'Failed to remove queue item');
      await loadAll();
      await loadQueue(true);
    } catch (e: unknown) {
      setError(errorMessage(e, 'Failed to remove queue item'));
    } finally {
      setQueueActionId(null);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') {
      loadQueue(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, queueStatus]);

  useEffect(() => {
    if (activeTab === 'broadcasts' && broadcasts.length === 0 && !broadcastsLoading) {
      loadBroadcasts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'routing' && !config && !configLoading) {
      loadConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function setBroadcastStatus(id: string, status: 'pending' | 'cancelled') {
    setError(null);
    try {
      const res = await fetch(`/api/notifications/broadcasts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || 'Failed to update broadcast');
      await loadBroadcasts();
    } catch (e: unknown) {
      setError(errorMessage(e, 'Failed to update broadcast'));
    }
  }

  async function purgeBroadcast(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/notifications/broadcasts/${id}/purge?limit=400`, {
        method: 'POST',
      });
      const json = (await res.json()) as { error?: string; [k: string]: unknown };
      if (!res.ok) throw new Error(json.error || 'Failed to purge broadcast deliveries');
      setLastRun((prev) => ({ ...asRecord(prev), purge: { broadcastId: id, ...json } }));
      await loadAll();
      await loadBroadcasts();
    } catch (e: unknown) {
      setError(errorMessage(e, 'Failed to purge broadcast deliveries'));
    }
  }

  async function loadUsersPage(reset = false) {
    setComposeUsersLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (!reset && composeUsersCursor) params.set('lastDocId', composeUsersCursor);
      const res = await fetch(`/api/users?${params.toString()}`, { cache: 'no-store' });
      const json = (await res.json()) as { error?: string; users?: UserRow[]; lastDocId?: string | null };
      if (!res.ok) throw new Error(json.error || 'Failed to load users');
      const users = json.users || [];
      setComposeUsers((prev) => (reset ? users : [...prev, ...users]));
      setComposeUsersCursor(json.lastDocId || null);
    } catch (e: unknown) {
      setError(errorMessage(e, 'Failed to load users'));
    } finally {
      setComposeUsersLoading(false);
    }
  }

  useEffect(() => {
    // load first page lazily (only when needed)
    if (activeTab === 'composer' && composeAudienceMode === 'users' && composeUsers.length === 0) {
      loadUsersPage(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, composeAudienceMode]);

  const filteredUsers = useMemo(() => {
    const q = composeUserQuery.trim().toLowerCase();
    if (!q) return composeUsers;
    return composeUsers.filter((u) => {
      const name =
        `${u.firstname || ''} ${u.lastname || ''} ${u.username || ''} ${u.email || ''}`.toLowerCase();
      return (
        name.includes(q) ||
        String(u.id || '')
          .toLowerCase()
          .includes(q)
      );
    });
  }, [composeUsers, composeUserQuery]);

  async function sendCustom() {
    setComposeSending(true);
    setComposeResult(null);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        category: 'admin',
        title: composeTitle,
        body: composeBody,
        type: composeType,
        audience:
          composeAudienceMode === 'all'
            ? { mode: 'all' }
            : { mode: 'users', userIds: selectedUserIds },
        schedule:
          composeScheduleMode === 'now'
            ? { mode: 'now' }
            : composeScheduleMode === 'at_utc'
              ? { mode: 'at_utc', atUtc: composeAtUtc }
              : {
                  mode: 'at_user_local',
                  hour: parseTime(composeLocalTime).hour,
                  minute: parseTime(composeLocalTime).minute,
                },
        recurrence:
          composeRepeatMode === 'none'
            ? { mode: 'none' }
            : composeRepeatMode === 'daily'
              ? { mode: 'daily', occurrences: composeOccurrences ?? undefined }
              : composeRepeatMode === 'every_n_days'
                ? {
                    mode: 'every_n_days',
                    intervalDays: composeIntervalDays,
                    occurrences: composeOccurrences ?? undefined,
                  }
                : {
                    mode: 'weekdays',
                    daysOfWeek: composeDaysOfWeek,
                    occurrences: composeOccurrences ?? undefined,
                  },
      };

      const res = await fetch('/api/notifications/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as ComposeResult & { error?: string };
      if (!res.ok) throw new Error(json.error || 'Failed to enqueue');
      setComposeResult(json);
    } catch (e: unknown) {
      setError(errorMessage(e, 'Failed to send'));
    } finally {
      setComposeSending(false);
    }
  }

  return (
    <main className="page-container relative">
      <div className="container-standard relative">
        <div className="section-header flex items-start justify-between gap-4">
          <div>
            <h2 className="section-title flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications Control Center
            </h2>
            <p className="section-subtitle">
              Plan campaigns, manage automations, and keep an eye on what is queued to send.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAll}
              className="btn-secondary flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={save}
              className="btn-primary flex items-center gap-2"
              disabled={saving || loading || !dirty || !config}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>

        {error && (
          <div className="glass-card border border-red-500/30 bg-red-500/10 p-4 mb-6">
            <div className="text-red-200 font-tsukimi text-sm">{error}</div>
          </div>
        )}

        {/* Quick guidance for non-technical users */}
        <div className="glass-card p-4 mb-4 text-xs md:text-sm text-iki-white/70 font-tsukimi">
          <p className="mb-2">
            For day-to-day work you mostly need <span className="text-light-green font-semibold">Send</span>{' '}
            and <span className="text-light-green font-semibold">Campaigns</span>.{' '}
            <span className="text-iki-white/80">Overview</span> and{' '}
            <span className="text-iki-white/80">Automation rules</span> are more advanced.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-2 border-b border-light-green/20 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-t-lg font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-iki-grey/50 border-b-2 border-light-green text-light-green'
                : 'text-iki-white/60 hover:text-iki-white/80'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('routing')}
            className={`px-6 py-3 rounded-t-lg font-medium transition-colors ${
              activeTab === 'routing'
                ? 'bg-iki-grey/50 border-b-2 border-light-green text-light-green'
                : 'text-iki-white/60 hover:text-iki-white/80'
            }`}
          >
            Automation rules
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('composer')}
            className={`px-6 py-3 rounded-t-lg font-medium transition-colors ${
              activeTab === 'composer'
                ? 'bg-iki-grey/50 border-b-2 border-light-green text-light-green'
                : 'text-iki-white/60 hover:text-iki-white/80'
            }`}
          >
            Send (Custom)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('broadcasts')}
            className={`px-6 py-3 rounded-t-lg font-medium transition-colors ${
              activeTab === 'broadcasts'
                ? 'bg-iki-grey/50 border-b-2 border-light-green text-light-green'
                : 'text-iki-white/60 hover:text-iki-white/80'
            }`}
          >
            Campaigns
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-card p-6 lg:col-span-2">
              <h3 className="section-title mb-3">Queue health</h3>
              {loading || !stats ? (
                <div className="text-iki-white/70 font-tsukimi text-sm">Loading…</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Stat label="Pending" value={stats.pending} tone="warning" />
                  <Stat label="Sent" value={stats.sent} tone="success" />
                  <Stat label="Failed" value={stats.failed} tone="danger" />
                  <Stat label="Skipped" value={stats.skipped} tone="muted" />
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={() => run('schedule')}
                  className="btn-secondary flex items-center gap-2"
                  disabled={!!running || loading}
                >
                  {running === 'schedule' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PlayCircle className="w-4 h-4" />
                  )}
                  Run schedule (engagement)
                </button>
                <button
                  onClick={() => run('broadcasts')}
                  className="btn-secondary flex items-center gap-2"
                  disabled={!!running || loading}
                >
                  {running === 'broadcasts' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PlayCircle className="w-4 h-4" />
                  )}
                  Run broadcasts (expand)
                </button>
                <button
                  onClick={() => run('process')}
                  className="btn-secondary flex items-center gap-2"
                  disabled={!!running || loading}
                >
                  {running === 'process' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PlayCircle className="w-4 h-4" />
                  )}
                  Run process (send)
                </button>
                <button
                  onClick={() => run('all')}
                  className="btn-primary flex items-center gap-2"
                  disabled={!!running || loading}
                >
                  {running === 'all' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PlayCircle className="w-4 h-4" />
                  )}
                  Run all
                </button>
              </div>

              {lastRun && (
                <div className="mt-4 text-xs font-mono text-iki-white/70 whitespace-pre-wrap bg-iki-grey/30 border border-light-green/10 rounded-xl p-3">
                  {JSON.stringify(lastRun, null, 2)}
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-iki-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="section-title mb-1">Queue items</h3>
                    <p className="section-subtitle">
                      Latest items in the queue (pending/sent/failed/skipped). Click a row for details.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      className="bg-iki-grey/30 border border-iki-white/10 rounded-xl px-3 py-2 text-iki-white font-tsukimi text-sm"
                      value={queueStatus}
                      onChange={(e) => setQueueStatus(e.target.value as QueueStatusFilter)}
                      disabled={queueLoading}
                    >
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                      <option value="sent">Sent</option>
                      <option value="skipped">Skipped</option>
                      <option value="all">All</option>
                    </select>
                    <button
                      onClick={() => loadQueue(true)}
                      className="btn-secondary flex items-center gap-2"
                      disabled={queueLoading}
                    >
                      <RefreshCw className={`w-4 h-4 ${queueLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="mt-4 overflow-auto border border-iki-white/10 rounded-xl">
                  <table className="min-w-full text-sm">
                    <thead className="bg-iki-grey/30 text-iki-white/70 font-tsukimi">
                      <tr>
                        <th className="text-left px-3 py-2">Status</th>
                        <th className="text-left px-3 py-2">Scheduled</th>
                        <th className="text-left px-3 py-2">Category</th>
                        <th className="text-left px-3 py-2">Type</th>
                        <th className="text-left px-3 py-2">Title</th>
                        <th className="text-left px-3 py-2">Recipient</th>
                        <th className="text-left px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-iki-white/80 font-tsukimi">
                      {queueLoading && queueItems.length === 0 ? (
                        <tr>
                          <td className="px-3 py-3 text-iki-white/60" colSpan={7}>
                            Loading…
                          </td>
                        </tr>
                      ) : queueItems.length === 0 ? (
                        <tr>
                          <td className="px-3 py-3 text-iki-white/60" colSpan={7}>
                            No items.
                          </td>
                        </tr>
                      ) : (
                        queueItems.map((q) => {
                          const expanded = !!queueExpanded[q.id];
                          const badge =
                            q.status === 'pending'
                              ? 'border-orange-400/30 bg-orange-400/10 text-orange-200'
                              : q.status === 'sent'
                                ? 'border-light-green/30 bg-light-green/10 text-light-green'
                                : q.status === 'failed'
                                  ? 'border-red-500/30 bg-red-500/10 text-red-200'
                                  : 'border-iki-white/15 bg-iki-grey/25 text-iki-white/70';
                          return (
                            <Fragment key={q.id}>
                              <tr
                                className="border-t border-iki-white/5 hover:bg-iki-grey/20 cursor-pointer"
                                onClick={() =>
                                  setQueueExpanded((prev) => ({ ...prev, [q.id]: !expanded }))
                                }
                              >
                                <td className="px-3 py-2">
                                  <span
                                    className={`px-2 py-1 rounded-lg border text-xs font-semibold ${badge}`}
                                  >
                                    {q.status}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-iki-white/70 text-xs">
                                  {q.scheduled_at ? q.scheduled_at : '—'}
                                </td>
                                <td className="px-3 py-2 text-iki-white/70 text-xs">
                                  {q.category || '—'}
                                </td>
                                <td className="px-3 py-2 font-mono text-[12px] text-iki-white/60">
                                  {q.type || '—'}
                                </td>
                                <td className="px-3 py-2 max-w-[520px] truncate" title={q.title}>
                                  {q.title || '—'}
                                </td>
                                <td className="px-3 py-2">
                                  {q.recipient_id ? (
                                    <div className="flex items-center gap-2">
                                      <Avatar
                                        seed={q.recipient_id}
                                        alt="Recipient avatar"
                                        size={22}
                                        className="w-[22px] h-[22px] rounded-full border border-iki-white/10 bg-iki-grey/30"
                                      />
                                      <span className="font-mono text-[12px] text-iki-white/60">
                                        {privacyMode ? shortId(q.recipient_id) : q.recipient_id}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="font-mono text-[12px] text-iki-white/60">—</span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      className="btn-secondary flex items-center gap-2"
                                      disabled={queueActionId === q.id || q.status !== 'pending'}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        sendQueueItem(q.id);
                                      }}
                                      title="Send now"
                                    >
                                      {queueActionId === q.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Send className="w-4 h-4" />
                                      )}
                                      Send
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-secondary flex items-center gap-2"
                                      disabled={queueActionId === q.id || q.status !== 'pending'}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeQueueItem(q.id);
                                      }}
                                      title="Remove from queue"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Remove
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {expanded && (
                                <tr className="border-t border-iki-white/5">
                                  <td colSpan={7} className="px-3 py-3">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                      <div className="lg:col-span-2">
                                        <div className="text-xs text-iki-white/60 font-tsukimi mb-1">
                                          Body
                                        </div>
                                        <div className="text-sm text-iki-white/80 whitespace-pre-wrap">
                                          {q.body || '—'}
                                        </div>
                                        {(q.error || q.skipped_reason) && (
                                          <div className="mt-3 text-xs font-mono text-iki-white/70 whitespace-pre-wrap bg-iki-grey/30 border border-iki-white/10 rounded-xl p-3">
                                            {JSON.stringify(
                                              {
                                                error: q.error,
                                                error_code: q.error_code,
                                                skipped_reason: q.skipped_reason,
                                                retry_after_ms: q.retry_after_ms,
                                              },
                                              null,
                                              2
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <div className="text-xs text-iki-white/60 font-tsukimi mb-1">
                                          Metadata
                                        </div>
                                        <div className="text-[11px] font-mono text-iki-white/60 bg-iki-grey/30 border border-iki-white/10 rounded-xl p-3 whitespace-pre-wrap">
                                          {JSON.stringify(
                                            {
                                              id: q.id,
                                              status: q.status,
                                              category: q.category,
                                              type: q.type,
                                              recipient_id: privacyMode
                                                ? q.recipient_id
                                                  ? shortId(q.recipient_id)
                                                  : null
                                                : q.recipient_id,
                                              sender_id: privacyMode
                                                ? q.sender_id
                                                  ? shortId(q.sender_id)
                                                  : null
                                                : q.sender_id,
                                              sender_name: privacyMode ? null : q.sender_name,
                                              campaign_kind: q.campaign_kind,
                                              campaign_id: q.campaign_id,
                                              repeat: q.repeat,
                                              interval_days: q.interval_days,
                                              days_of_week: q.days_of_week,
                                              remaining_occurrences: q.remaining_occurrences,
                                              scheduled_at: q.scheduled_at,
                                              created_at: q.created_at,
                                              updated_at: q.updated_at,
                                            },
                                            null,
                                            2
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={queueLoading || !queueCursor}
                    onClick={() => loadQueue(false)}
                  >
                    Load more
                  </button>
                  <div className="text-xs text-iki-white/60 font-tsukimi">
                    Showing {queueItems.length} item{queueItems.length === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="section-title mb-3">Global switches</h3>
              {config ? (
                <div className="space-y-4">
                  <ToggleRow
                    label="Global enabled"
                    description="Master kill-switch for server-side notifications"
                    value={config.globalEnabled}
                    onChange={(v) => setConfig({ ...config, globalEnabled: v })}
                  />
                  <ToggleRow
                    label="Processing enabled"
                    description="If off, we do not send from the queue"
                    value={config.processingEnabled}
                    onChange={(v) => setConfig({ ...config, processingEnabled: v })}
                  />
                  <ToggleRow
                    label="Automatic sending (cron)"
                    description="If on, a scheduled worker calling /api/notifications/cron will keep scanning & sending from the queue."
                    value={config.autoCronEnabled}
                    onChange={(v) => setConfig({ ...config, autoCronEnabled: v })}
                  />
                </div>
              ) : configSummary ? (
                <div className="space-y-4">
                  <ToggleRow
                    label="Global enabled"
                    description="Master kill-switch for server-side notifications"
                    value={configSummary.globalEnabled}
                    onChange={() => {}}
                    disabled
                  />
                  <ToggleRow
                    label="Processing enabled"
                    description="If off, we do not send from the queue"
                    value={configSummary.processingEnabled}
                    onChange={() => {}}
                    disabled
                  />
                  <ToggleRow
                    label="Automatic sending (cron)"
                    description="If on, a scheduled worker calling /api/notifications/cron will keep scanning & sending from the queue."
                    value={configSummary.autoCronEnabled}
                    onChange={() => {}}
                    disabled
                  />
                  <ToggleRow
                    label="Connect enabled"
                    description="Connect notifications processing gate"
                    value={configSummary.connectEnabled}
                    onChange={() => {}}
                    disabled
                  />
                  <ToggleRow
                    label="Engagement enabled"
                    description="Engagement scheduling + processing gate"
                    value={configSummary.engagementEnabled}
                    onChange={() => {}}
                    disabled
                  />
                </div>
              ) : (
                <div className="text-iki-white/70 font-tsukimi text-sm">Loading…</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'routing' && (
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-iki-white/10">
              <button
                type="button"
                onClick={() => setRoutingTab('engagement')}
                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  routingTab === 'engagement'
                    ? 'bg-iki-grey/50 border-b-2 border-light-green text-light-green'
                    : 'text-iki-white/60 hover:text-iki-white/80'
                }`}
              >
                Engagement
              </button>
              <button
                type="button"
                onClick={() => setRoutingTab('connect')}
                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  routingTab === 'connect'
                    ? 'bg-iki-grey/50 border-b-2 border-light-green text-light-green'
                    : 'text-iki-white/60 hover:text-iki-white/80'
                }`}
              >
                Connect
              </button>
            </div>

            {routingTab === 'connect' && (
              <div className="glass-card p-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="section-title">Connect routing</h3>
                    <p className="section-subtitle">
                      Rate limits and sender blocks for Connect pushes.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary flex items-center gap-2"
                    onClick={() => setConnectEditing((v) => !v)}
                    disabled={!config}
                    title={connectEditing ? 'Lock' : 'Edit'}
                  >
                    <Pencil className="w-4 h-4" />
                    {connectEditing ? 'Done' : 'Edit'}
                  </button>
                </div>

                {!config ? (
                  <div className="text-iki-white/70 font-tsukimi text-sm">Loading…</div>
                ) : (
                  <div className="space-y-5">
                    {!connectEditing && (
                      <div className="text-xs text-iki-white/60 font-tsukimi">
                        Locked by default — click the pencil to edit, then Save.
                      </div>
                    )}
                    <ToggleRow
                      label="Connect enabled"
                      description="If off, connect notifications stay queued (not sent)"
                      value={config.connect.enabled}
                      onChange={(v) =>
                        setConfig({ ...config, connect: { ...config.connect, enabled: v } })
                      }
                      disabled={!connectEditing}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <NumberField
                        label="Comment cooldown (min)"
                        value={Math.round(
                          (config.connect.rateLimitsMs.connect_comment ?? 60000) / 60000
                        )}
                        onChange={(min) =>
                          setConfig({
                            ...config,
                            connect: {
                              ...config.connect,
                              rateLimitsMs: {
                                ...config.connect.rateLimitsMs,
                                connect_comment: Math.max(0, min) * 60_000,
                              },
                            },
                          })
                        }
                        disabled={!connectEditing}
                      />
                      <NumberField
                        label="Follow cooldown (min)"
                        value={Math.round(
                          (config.connect.rateLimitsMs.connect_general ?? 300000) / 60000
                        )}
                        onChange={(min) =>
                          setConfig({
                            ...config,
                            connect: {
                              ...config.connect,
                              rateLimitsMs: {
                                ...config.connect.rateLimitsMs,
                                connect_general: Math.max(0, min) * 60_000,
                              },
                            },
                          })
                        }
                        disabled={!connectEditing}
                      />
                      <NumberField
                        label="Friend request cooldown (min)"
                        value={Math.round(
                          (config.connect.rateLimitsMs.connect_friend_request ?? 600000) / 60000
                        )}
                        onChange={(min) =>
                          setConfig({
                            ...config,
                            connect: {
                              ...config.connect,
                              rateLimitsMs: {
                                ...config.connect.rateLimitsMs,
                                connect_friend_request: Math.max(0, min) * 60_000,
                              },
                            },
                          })
                        }
                        disabled={!connectEditing}
                      />
                    </div>

                    <label className="block">
                      <div className="text-xs text-iki-white/70 font-tsukimi mb-1">
                        Blocked Connect senders (one userId per line)
                      </div>
                      <textarea
                        className={`w-full min-h-[92px] bg-iki-grey/30 border border-iki-white/10 rounded-xl px-3 py-2 text-iki-white font-tsukimi text-sm focus:outline-none focus:ring-2 focus:ring-light-green/30 ${
                          !connectEditing ? 'opacity-60' : ''
                        }`}
                        value={(config.connect.blockedSenders || []).join('\n')}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            connect: {
                              ...config.connect,
                              blockedSenders: e.target.value
                                .split('\n')
                                .map((s) => s.trim())
                                .filter(Boolean),
                            },
                          })
                        }
                        placeholder="e.g.\nuser_123\nuser_456"
                        disabled={!connectEditing}
                      />
                      <div className="text-[11px] text-iki-white/50 font-tsukimi mt-1">
                        These users can still do actions in Connect, but push notifications
                        originating from them will be skipped server-side.
                      </div>
                    </label>
                  </div>
                )}
              </div>
            )}

            {routingTab === 'engagement' && (
              <div className="glass-card p-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="section-title">Engagement routing</h3>
                    <p className="section-subtitle">
                      Full-width engagement scheduling, rules, and templates.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary flex items-center gap-2"
                    onClick={() => setEngagementEditing((v) => !v)}
                    disabled={!config}
                    title={engagementEditing ? 'Lock' : 'Edit'}
                  >
                    <Pencil className="w-4 h-4" />
                    {engagementEditing ? 'Done' : 'Edit'}
                  </button>
                </div>

                {!config ? (
                  <div className="text-iki-white/70 font-tsukimi text-sm">Loading…</div>
                ) : (
                  <div className="space-y-5">
                    {!engagementEditing && (
                      <div className="text-xs text-iki-white/60 font-tsukimi">
                        Locked by default — click the pencil to edit, then Save.
                      </div>
                    )}
                    <ToggleRow
                      label="Engagement enabled"
                      description="If off, engagement intros/recurring won’t be scheduled or sent"
                      value={config.engagement.enabled}
                      onChange={(v) =>
                        setConfig({ ...config, engagement: { ...config.engagement, enabled: v } })
                      }
                      disabled={!engagementEditing}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <ToggleRow
                        label="First-time intros"
                        description="Welcome + feature intro series"
                        value={config.engagement.firstTimeEnabled}
                        onChange={(v) =>
                          setConfig({
                            ...config,
                            engagement: { ...config.engagement, firstTimeEnabled: v },
                          })
                        }
                        disabled={!engagementEditing}
                      />
                      <ToggleRow
                        label="Recurring nudges"
                        description="Daily reminders for features"
                        value={config.engagement.recurringEnabled}
                        onChange={(v) =>
                          setConfig({
                            ...config,
                            engagement: { ...config.engagement, recurringEnabled: v },
                          })
                        }
                        disabled={!engagementEditing}
                      />
                    </div>

                    <div>
                      <div className="text-sm font-tsukimi text-iki-white/80 mb-2">
                        Schedule (user local time)
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {(
                          [
                            ['water', 'Water'],
                            ['daily_checkin', 'Daily check-in'],
                            ['mood', 'Mood'],
                            ['meal_tracking', 'Nutrition'],
                            ['journal', 'Journal'],
                            ['gratitude', 'Gratitude'],
                          ] as const
                        ).map(([key, label]) => (
                          <TimeField
                            key={key}
                            label={label}
                            value={timeToString(config.engagement.schedule[key])}
                            onChange={(t) =>
                              setConfig({
                                ...config,
                                engagement: {
                                  ...config.engagement,
                                  schedule: {
                                    ...config.engagement.schedule,
                                    [key]: parseTime(t),
                                  },
                                },
                              })
                            }
                            disabled={!engagementEditing}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-iki-white/10 pt-4">
                      <div className="text-sm font-tsukimi text-iki-white/80 mb-3">
                        Recurrence rules (per notification)
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(
                          [
                            ['water', 'Water'],
                            ['daily_checkin', 'Daily check-in'],
                            ['mood', 'Mood'],
                            ['meal_tracking', 'Nutrition'],
                            ['journal', 'Journal'],
                            ['gratitude', 'Gratitude'],
                          ] as const
                        ).map(([key, label]) => (
                          <RecurrenceRuleEditor
                            key={key}
                            label={label}
                            rule={config.engagement.recurringRules[key]}
                            onChange={(rule) =>
                              setConfig({
                                ...config,
                                engagement: {
                                  ...config.engagement,
                                  recurringRules: {
                                    ...config.engagement.recurringRules,
                                    [key]: rule,
                                  },
                                },
                              })
                            }
                            disabled={!engagementEditing}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-iki-white/10 pt-4">
                      <div className="text-sm font-tsukimi text-iki-white/80 mb-3">
                        Message templates
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <TemplateEditor
                          title="First-time intros"
                          templates={config.engagement.templates.intro}
                          onChange={(intro) =>
                            setConfig({
                              ...config,
                              engagement: {
                                ...config.engagement,
                                templates: { ...config.engagement.templates, intro },
                              },
                            })
                          }
                          disabled={!engagementEditing}
                        />
                        <TemplateEditor
                          title="Recurring nudges"
                          templates={config.engagement.templates.recurring}
                          onChange={(recurring) =>
                            setConfig({
                              ...config,
                              engagement: {
                                ...config.engagement,
                                templates: { ...config.engagement.templates, recurring },
                              },
                            })
                          }
                          disabled={!engagementEditing}
                        />
                      </div>
                    </div>

                    <div className="text-xs text-iki-white/60 font-tsukimi">
                      Note: cron must call `POST /api/notifications/cron` in production (or use “Run
                      all” above) to actually schedule/process.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'composer' && (
          <div className="glass-card p-6">
            <h3 className="section-title mb-2">Send a notification (custom)</h3>
            <p className="section-subtitle mb-4">
              Pick message, time, recurrence rules, target page (type), and recipients. Preview
              updates live.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="block">
                    <div className="text-xs text-iki-white/70 font-tsukimi mb-1">Title</div>
                    <input
                      className="w-full bg-iki-grey/30 border border-iki-white/10 rounded-xl px-3 py-2 text-iki-white font-tsukimi text-sm"
                      value={composeTitle}
                      onChange={(e) => setComposeTitle(e.target.value)}
                      placeholder="e.g. Hydration check"
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs text-iki-white/70 font-tsukimi mb-1">
                      Target page (type)
                    </div>
                    <select
                      className="w-full bg-iki-grey/30 border border-iki-white/10 rounded-xl px-3 py-2 text-iki-white font-tsukimi text-sm"
                      value={composeType}
                      onChange={(e) => setComposeType(e.target.value)}
                    >
                      {NOTIFICATION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label} ({t.value})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block">
                  <div className="text-xs text-iki-white/70 font-tsukimi mb-1">Body</div>
                  <textarea
                    className="w-full min-h-[90px] bg-iki-grey/30 border border-iki-white/10 rounded-xl px-3 py-2 text-iki-white font-tsukimi text-sm"
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    placeholder="Message text..."
                  />
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="block">
                    <div className="text-xs text-iki-white/70 font-tsukimi mb-1">Send time</div>
                    <select
                      className="w-full bg-iki-grey/30 border border-iki-white/10 rounded-xl px-3 py-2 text-iki-white font-tsukimi text-sm"
                      value={composeScheduleMode}
                    onChange={(e) =>
                      setComposeScheduleMode(e.target.value as 'now' | 'at_utc' | 'at_user_local')
                    }
                    >
                      <option value="now">Now</option>
                      <option value="at_utc">At specific time (UTC)</option>
                      <option value="at_user_local">At user local time (HH:mm)</option>
                    </select>
                  </label>
                  {composeScheduleMode === 'at_utc' ? (
                    <label className="block">
                      <div className="text-xs text-iki-white/70 font-tsukimi mb-1">
                        UTC datetime (ISO)
                      </div>
                      <input
                        className="w-full bg-iki-grey/30 border border-iki-white/10 rounded-xl px-3 py-2 text-iki-white font-tsukimi text-sm"
                        value={composeAtUtc}
                        onChange={(e) => setComposeAtUtc(e.target.value)}
                        placeholder="2025-12-17T12:00:00Z"
                      />
                    </label>
                  ) : composeScheduleMode === 'at_user_local' ? (
                    <TimeField
                      label="Local time"
                      value={composeLocalTime}
                      onChange={setComposeLocalTime}
                    />
                  ) : (
                    <div />
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="block">
                    <div className="text-xs text-iki-white/70 font-tsukimi mb-1">Recurrence</div>
                    <select
                      className="w-full bg-iki-grey/30 border border-iki-white/10 rounded-xl px-3 py-2 text-iki-white font-tsukimi text-sm"
                      value={composeRepeatMode}
                    onChange={(e) =>
                      setComposeRepeatMode(e.target.value as 'none' | 'daily' | 'every_n_days' | 'weekdays')
                    }
                    >
                      <option value="none">One-time</option>
                      <option value="daily">Daily</option>
                      <option value="every_n_days">Every N days</option>
                      <option value="weekdays">Weekdays / selected days</option>
                    </select>
                  </label>
                  <label className="block">
                    <div className="text-xs text-iki-white/70 font-tsukimi mb-1">
                      Only next N sends (optional)
                    </div>
                    <input
                      className="w-full bg-iki-grey/30 border border-iki-white/10 rounded-xl px-3 py-2 text-iki-white font-tsukimi text-sm"
                      type="number"
                      min={1}
                      max={365}
                      value={composeOccurrences ?? ''}
                      placeholder="Unlimited"
                      onChange={(e) => {
                        const raw = e.target.value.trim();
                        if (!raw) setComposeOccurrences(null);
                        else setComposeOccurrences(clampInt(raw, 1, 365, 7));
                      }}
                    />
                  </label>
                </div>

                {composeRepeatMode === 'every_n_days' && (
                  <NumberField
                    label="Interval (days)"
                    value={composeIntervalDays}
                    onChange={(v) => setComposeIntervalDays(Math.max(1, v))}
                  />
                )}

                {composeRepeatMode === 'weekdays' && (
                  <div>
                    <div className="text-xs text-iki-white/70 font-tsukimi mb-1">Days</div>
                    <div className="flex flex-wrap gap-2">
                      {(['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const).map((d, idx) => {
                        const on = composeDaysOfWeek.includes(idx);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setComposeDaysOfWeek((prev) => {
                                const set = new Set(prev);
                                if (set.has(idx)) set.delete(idx);
                                else set.add(idx);
                                return Array.from(set).sort((a, b) => a - b);
                              });
                            }}
                            className={`px-2 py-1 rounded-lg border text-xs font-tsukimi font-semibold ${
                              on
                                ? 'border-light-green/40 bg-light-green/15 text-light-green'
                                : 'border-iki-white/15 bg-iki-grey/25 text-iki-white/70'
                            }`}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="border-t border-iki-white/10 pt-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="text-sm font-tsukimi text-iki-white">Recipients</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className={`px-3 py-1.5 rounded-lg border text-xs font-tsukimi font-semibold ${
                          composeAudienceMode === 'users'
                            ? 'border-light-green/40 bg-light-green/15 text-light-green'
                            : 'border-iki-white/15 bg-iki-grey/25 text-iki-white/70'
                        }`}
                        onClick={() => setComposeAudienceMode('users')}
                      >
                        Select users
                      </button>
                      <button
                        type="button"
                        className={`px-3 py-1.5 rounded-lg border text-xs font-tsukimi font-semibold ${
                          composeAudienceMode === 'all'
                            ? 'border-light-green/40 bg-light-green/15 text-light-green'
                            : 'border-iki-white/15 bg-iki-grey/25 text-iki-white/70'
                        }`}
                        onClick={() => setComposeAudienceMode('all')}
                      >
                        All users
                      </button>
                    </div>
                  </div>

                  {composeAudienceMode === 'users' && (
                    <div className="space-y-2">
                      <input
                        className="w-full bg-iki-grey/30 border border-iki-white/10 rounded-xl px-3 py-2 text-iki-white font-tsukimi text-sm"
                        value={composeUserQuery}
                        onChange={(e) => setComposeUserQuery(e.target.value)}
                        placeholder="Search users…"
                      />

                      <div className="max-h-[260px] overflow-auto border border-iki-white/10 rounded-xl">
                        {filteredUsers.slice(0, 200).map((u) => {
                          const id = String(u.id);
                          const checked = selectedUserIds.includes(id);
                          const label =
                            getUserLabel(u, privacyMode) || (privacyMode ? `User ${shortId(id)}` : id);
                          const secondary = getUserSecondaryLabel(u, privacyMode);
                          return (
                            <label
                              key={id}
                              className="flex items-center gap-2 px-3 py-2 border-b border-iki-white/5 text-sm font-tsukimi"
                            >
                              <Avatar
                                seed={getUserAvatarSeed(u)}
                                alt={label}
                                size={28}
                                className="w-7 h-7 rounded-full border border-iki-white/10 bg-iki-grey/30"
                              />
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setSelectedUserIds((prev) =>
                                    checked ? prev.filter((x) => x !== id) : [...prev, id]
                                  )
                                }
                              />
                              <div className="min-w-0">
                                <div className="text-iki-white/80 truncate">{label}</div>
                                {secondary && (
                                  <div className="text-[11px] text-iki-white/50 font-mono truncate">
                                    {secondary}
                                  </div>
                                )}
                              </div>
                              <span className="ml-auto text-[11px] text-iki-white/40 font-mono">
                                {privacyMode ? shortId(id) : id}
                              </span>
                            </label>
                          );
                        })}
                        {composeUsersLoading && (
                          <div className="px-3 py-2 text-iki-white/60 text-sm font-tsukimi">
                            Loading…
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={composeUsersLoading || !composeUsersCursor}
                          onClick={() => loadUsersPage(false)}
                        >
                          Load more users
                        </button>
                        <div className="text-xs text-iki-white/60 font-tsukimi">
                          Selected: {selectedUserIds.length}
                        </div>
                      </div>
                    </div>
                  )}

                  {composeAudienceMode === 'all' && (
                    <div className="text-xs text-iki-white/60 font-tsukimi">
                      This will create a broadcast job and the cron/runner will expand it into queue
                      items in batches.
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={sendCustom}
                    className="btn-primary flex items-center gap-2"
                    disabled={composeSending || !composeTitle.trim() || !composeBody.trim()}
                  >
                    {composeSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Enqueue
                  </button>
                  {composeResult && (
                    <div className="text-xs text-iki-white/70 font-tsukimi">
                      {composeResult.mode === 'broadcast'
                        ? `Broadcast created: ${composeResult.broadcastId}`
                        : `Created: ${composeResult.created}`}
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-card p-4">
                <div className="text-sm font-tsukimi text-iki-white mb-2">Preview</div>
                <div className="border border-iki-white/10 rounded-xl p-4 bg-iki-grey/20">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-iki-white/10 bg-iki-grey/30 flex items-center justify-center">
                      <Avatar
                        seed={
                          composeAudienceMode === 'users' && selectedUserIds[0]
                            ? selectedUserIds[0]
                            : composeAudienceMode === 'all'
                              ? 'all_users'
                              : 'admin'
                        }
                        alt="Recipient avatar"
                        size={40}
                        className="w-10 h-10 rounded-full"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-iki-white/60 font-tsukimi mb-1">Title</div>
                      <div className="text-lg font-tsukimi font-semibold break-words">
                        {composeTitle || '—'}
                      </div>
                      <div className="mt-3 text-xs text-iki-white/60 font-tsukimi mb-1">Body</div>
                      <div className="text-sm text-iki-white/80 font-tsukimi whitespace-pre-wrap">
                        {composeBody || '—'}
                      </div>
                      <div className="mt-3 text-[11px] text-iki-white/50 font-mono">
                        type: {composeType}
                      </div>
                      <div className="mt-1 text-[11px] text-iki-white/50 font-mono">
                        schedule: {composeScheduleMode}
                        {composeScheduleMode === 'at_utc' ? ` @ ${composeAtUtc || '…'}` : ''}
                        {composeScheduleMode === 'at_user_local' ? ` @ ${composeLocalTime}` : ''}
                      </div>
                      <div className="mt-1 text-[11px] text-iki-white/50 font-mono">
                        repeat: {composeRepeatMode}
                        {composeRepeatMode === 'every_n_days'
                          ? ` (every ${composeIntervalDays}d)`
                          : ''}
                        {composeRepeatMode === 'weekdays'
                          ? ` (days ${composeDaysOfWeek.join(',')})`
                          : ''}
                        {composeOccurrences ? ` (next ${composeOccurrences})` : ''}
                      </div>
                      <div className="mt-1 text-[11px] text-iki-white/50 font-mono">
                        audience:{' '}
                        {composeAudienceMode === 'all' ? 'all' : `${selectedUserIds.length} users`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'broadcasts' && (
          <div className="glass-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="section-title">Campaigns / Broadcasts</h3>
                <p className="section-subtitle">
                  Manage “send to all” jobs: cancel/resume and optionally stop queued deliveries.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => run('broadcasts')}
                  className="btn-secondary flex items-center gap-2"
                  disabled={!!running}
                  title="Expand pending broadcasts into queue items"
                >
                  {running === 'broadcasts' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PlayCircle className="w-4 h-4" />
                  )}
                  Expand
                </button>
                <button
                  onClick={loadBroadcasts}
                  className="btn-secondary flex items-center gap-2"
                  disabled={broadcastsLoading}
                >
                  <RefreshCw className={`w-4 h-4 ${broadcastsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="mt-4">
              {broadcastsLoading ? (
                <div className="text-iki-white/70 font-tsukimi text-sm">Loading…</div>
              ) : broadcasts.length === 0 ? (
                <div className="text-iki-white/60 font-tsukimi text-sm">No broadcasts yet.</div>
              ) : (
                <div className="overflow-auto border border-iki-white/10 rounded-xl">
                  <table className="min-w-full text-sm">
                    <thead className="bg-iki-grey/30 text-iki-white/70 font-tsukimi">
                      <tr>
                        <th className="text-left px-3 py-2">Status</th>
                        <th className="text-left px-3 py-2">Title</th>
                        <th className="text-left px-3 py-2">Type</th>
                        <th className="text-left px-3 py-2">Enqueued</th>
                        <th className="text-left px-3 py-2">Created</th>
                        <th className="text-left px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-iki-white/80 font-tsukimi">
                      {broadcasts.map((b) => {
                        const expanded = !!broadcastExpanded[b.id];
                        const meta = asRecord(b);
                        const body = typeof meta.body === 'string' ? meta.body : '';
                        return (
                          <Fragment key={b.id}>
                            <tr
                              className="border-t border-iki-white/5 hover:bg-iki-grey/20 cursor-pointer"
                              onClick={() =>
                                setBroadcastExpanded((prev) => ({ ...prev, [b.id]: !expanded }))
                              }
                            >
                              <td className="px-3 py-2">
                                <span
                                  className={`px-2 py-1 rounded-lg border text-xs font-semibold ${
                                    b.status === 'pending'
                                      ? 'border-orange-400/30 bg-orange-400/10 text-orange-200'
                                      : b.status === 'completed'
                                        ? 'border-light-green/30 bg-light-green/10 text-light-green'
                                        : b.status === 'cancelled'
                                          ? 'border-iki-white/15 bg-iki-grey/25 text-iki-white/70'
                                          : 'border-red-500/30 bg-red-500/10 text-red-200'
                                  }`}
                                >
                                  {b.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 max-w-[420px] truncate" title={b.title}>
                                {b.title}
                              </td>
                              <td className="px-3 py-2 font-mono text-[12px] text-iki-white/60">
                                {b.type}
                              </td>
                              <td className="px-3 py-2">{b.total_enqueued ?? 0}</td>
                              <td className="px-3 py-2 text-iki-white/60 text-xs">
                                {b.created_at || '—'}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex flex-wrap gap-2">
                                  {b.status === 'pending' ? (
                                    <button
                                      className="btn-secondary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setBroadcastStatus(b.id, 'cancelled');
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  ) : (
                                    <button
                                      className="btn-secondary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setBroadcastStatus(b.id, 'pending');
                                      }}
                                    >
                                      Resume
                                    </button>
                                  )}
                                  <button
                                    className="btn-secondary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      purgeBroadcast(b.id);
                                    }}
                                  >
                                    Stop queued (purge)
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {expanded && (
                              <tr className="border-t border-iki-white/5">
                                <td colSpan={6} className="px-3 py-3">
                                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    <div className="lg:col-span-2">
                                      <div className="text-xs text-iki-white/60 font-tsukimi mb-1">
                                        Body
                                      </div>
                                      <div className="text-sm text-iki-white/80 whitespace-pre-wrap">
                                        {body || '—'}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-iki-white/60 font-tsukimi mb-1">
                                        Details
                                      </div>
                                      <div className="text-[11px] font-mono text-iki-white/60 bg-iki-grey/30 border border-iki-white/10 rounded-xl p-3 whitespace-pre-wrap">
                                        {JSON.stringify(
                                          {
                                            id: b.id,
                                            status: b.status,
                                            category: meta.category,
                                            type: b.type,
                                            schedule: meta.schedule,
                                            recurrence: meta.recurrence,
                                            batch_size: meta.batch_size,
                                            cursor_last_doc_id: meta.cursor_last_doc_id,
                                            total_enqueued: b.total_enqueued ?? 0,
                                            created_at: b.created_at,
                                            updated_at: meta.updated_at,
                                            completed_at: meta.completed_at,
                                            cancelled_at: meta.cancelled_at,
                                            error: meta.error,
                                          },
                                          null,
                                          2
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'success' | 'warning' | 'danger' | 'muted';
}) {
  const toneClass =
    tone === 'success'
      ? 'border-light-green/30 bg-light-green/10 text-light-green'
      : tone === 'warning'
        ? 'border-orange-400/30 bg-orange-400/10 text-orange-200'
        : tone === 'danger'
          ? 'border-red-500/30 bg-red-500/10 text-red-200'
          : 'border-iki-white/10 bg-iki-grey/20 text-iki-white/70';
  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="text-xs font-tsukimi opacity-80">{label}</div>
      <div className="text-2xl font-tsukimi font-semibold">{value}</div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-tsukimi text-iki-white">{label}</div>
        {description && <div className="text-xs text-iki-white/60 font-tsukimi">{description}</div>}
      </div>
      <button
        onClick={() => {
          if (disabled) return;
          onChange(!value);
        }}
        disabled={disabled}
        className={`px-3 py-1.5 rounded-lg border text-xs font-tsukimi font-semibold transition
          ${
            value
              ? 'border-light-green/40 bg-light-green/15 text-light-green'
              : 'border-iki-white/15 bg-iki-grey/25 text-iki-white/70'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {value ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <div className="text-xs text-iki-white/70 font-tsukimi mb-1">{label}</div>
      <input
        className={`w-full bg-iki-grey/30 border border-iki-white/10 rounded-xl px-3 py-2 text-iki-white font-tsukimi text-sm focus:outline-none focus:ring-2 focus:ring-light-green/30 ${
          disabled ? 'opacity-60 cursor-not-allowed' : ''
        }`}
        type="number"
        min={0}
        max={1440}
        value={value}
        onChange={(e) => onChange(clampInt(e.target.value, 0, 1440, value))}
        disabled={disabled}
      />
    </label>
  );
}

function TimeField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <div className="text-xs text-iki-white/70 font-tsukimi mb-1">{label}</div>
      <input
        className={`w-full bg-iki-grey/30 border border-iki-white/10 rounded-xl px-3 py-2 text-iki-white font-tsukimi text-sm focus:outline-none focus:ring-2 focus:ring-light-green/30 ${
          disabled ? 'opacity-60 cursor-not-allowed' : ''
        }`}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </label>
  );
}

function RecurrenceRuleEditor({
  label,
  rule,
  onChange,
  disabled,
}: {
  label: string;
  rule: {
    repeat: 'daily' | 'every_n_days' | 'weekdays';
    intervalDays?: number;
    daysOfWeek?: number[];
    occurrences?: number | null;
  };
  onChange: (v: {
    repeat: 'daily' | 'every_n_days' | 'weekdays';
    intervalDays?: number;
    daysOfWeek?: number[];
    occurrences?: number | null;
  }) => void;
  disabled?: boolean;
}) {
  const repeat = rule?.repeat ?? 'daily';
  const intervalDays = rule?.intervalDays ?? 2;
  const days = new Set(rule?.daysOfWeek ?? [1, 2, 3, 4, 5]);
  const occurrences = rule?.occurrences ?? null;

  return (
    <div className="bg-iki-grey/20 border border-iki-white/10 rounded-xl p-3">
      <div className="text-xs font-tsukimi text-iki-white/70 mb-2">{label}</div>
      <div className="grid grid-cols-1 gap-2">
        <label className="block">
          <div className="text-[11px] text-iki-white/60 font-tsukimi mb-1">Repeat</div>
          <select
            className="w-full bg-iki-grey/30 border border-iki-white/10 rounded-xl px-3 py-2 text-iki-white font-tsukimi text-sm"
            value={repeat}
            onChange={(e) =>
              onChange({ ...rule, repeat: e.target.value as 'daily' | 'every_n_days' | 'weekdays' })
            }
            disabled={disabled}
          >
            <option value="daily">Daily</option>
            <option value="every_n_days">Every N days</option>
            <option value="weekdays">Weekdays / selected days</option>
          </select>
        </label>

        {repeat === 'every_n_days' && (
          <NumberField
            label="Interval (days)"
            value={intervalDays}
            onChange={(v) =>
              onChange({ ...rule, repeat: 'every_n_days', intervalDays: Math.max(1, v) })
            }
            disabled={disabled}
          />
        )}

        {repeat === 'weekdays' && (
          <div>
            <div className="text-[11px] text-iki-white/60 font-tsukimi mb-1">Days</div>
            <div className="flex flex-wrap gap-2">
              {(['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const).map((d, idx) => {
                const on = days.has(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) return;
                      const next = new Set(days);
                      if (next.has(idx)) next.delete(idx);
                      else next.add(idx);
                      onChange({
                        ...rule,
                        repeat: 'weekdays',
                        daysOfWeek: Array.from(next).sort((a, b) => a - b),
                      });
                    }}
                    className={`px-2 py-1 rounded-lg border text-xs font-tsukimi font-semibold ${
                      on
                        ? 'border-light-green/40 bg-light-green/15 text-light-green'
                        : 'border-iki-white/15 bg-iki-grey/25 text-iki-white/70'
                    } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <label className="block">
          <div className="text-[11px] text-iki-white/60 font-tsukimi mb-1">
            Only next N sends (optional)
          </div>
          <input
            className="w-full bg-iki-grey/30 border border-iki-white/10 rounded-xl px-3 py-2 text-iki-white font-tsukimi text-sm"
            type="number"
            min={1}
            max={365}
            value={occurrences ?? ''}
            placeholder="Unlimited"
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (!raw) onChange({ ...rule, occurrences: null });
              else onChange({ ...rule, occurrences: clampInt(raw, 1, 365, 7) });
            }}
            disabled={disabled}
          />
        </label>
      </div>
    </div>
  );
}

function TemplateEditor({
  title,
  templates,
  onChange,
  disabled,
}: {
  title: string;
  templates: Record<string, { title: string; body: string }>;
  onChange: (t: Record<string, { title: string; body: string }>) => void;
  disabled?: boolean;
}) {
  const keys = ['water', 'daily_checkin', 'mood', 'meal_tracking', 'journal', 'gratitude'] as const;
  const labels: Record<string, string> = {
    water: 'Water',
    daily_checkin: 'Daily check-in',
    mood: 'Mood',
    meal_tracking: 'Nutrition',
    journal: 'Journal',
    gratitude: 'Gratitude',
  };

  return (
    <div className="bg-iki-grey/20 border border-iki-white/10 rounded-xl p-4">
      <div className="text-sm font-tsukimi text-iki-white mb-3">{title}</div>
      <div className="grid grid-cols-1 gap-4">
        {keys.map((k) => (
          <div key={k} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <div className="text-xs text-iki-white/70 font-tsukimi mb-1">{labels[k]} title</div>
              <input
                className="w-full bg-iki-grey/30 border border-iki-white/10 rounded-xl px-3 py-2 text-iki-white font-tsukimi text-sm"
                value={templates[k]?.title ?? ''}
                onChange={(e) =>
                  onChange({
                    ...templates,
                    [k]: { ...(templates[k] || { title: '', body: '' }), title: e.target.value },
                  })
                }
                disabled={disabled}
              />
            </label>
            <label className="block">
              <div className="text-xs text-iki-white/70 font-tsukimi mb-1">{labels[k]} body</div>
              <input
                className="w-full bg-iki-grey/30 border border-iki-white/10 rounded-xl px-3 py-2 text-iki-white font-tsukimi text-sm"
                value={templates[k]?.body ?? ''}
                onChange={(e) =>
                  onChange({
                    ...templates,
                    [k]: { ...(templates[k] || { title: '', body: '' }), body: e.target.value },
                  })
                }
                disabled={disabled}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

