import 'server-only';

const POSTHOG_HOST = process.env.POSTHOG_HOST || 'https://eu.i.posthog.com';
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const POSTHOG_PERSONAL_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;

export type PosthogConfiguredState =
  | { configured: true; host: string; projectId: string; apiKey: string }
  | { configured: false; reason: string };

export function getPosthogConfig(): PosthogConfiguredState {
  if (!POSTHOG_PROJECT_ID || !POSTHOG_PERSONAL_API_KEY) {
    return {
      configured: false,
      reason: 'PostHog analytics is not configured. Please set POSTHOG_PROJECT_ID and POSTHOG_PERSONAL_API_KEY.',
    };
  }

  return {
    configured: true,
    host: POSTHOG_HOST.replace(/\/$/, ''),
    projectId: POSTHOG_PROJECT_ID,
    apiKey: POSTHOG_PERSONAL_API_KEY,
  };
}

async function posthogRequest<T>(
  path: string,
  init: RequestInit & { method?: 'GET' | 'POST' } = { method: 'GET' }
): Promise<T> {
  const cfg = getPosthogConfig();
  if (!cfg.configured) {
    throw new Error(cfg.reason);
  }

  const url = `${cfg.host.replace(/\/$/, '')}/api/projects/${encodeURIComponent(cfg.projectId)}${path}`;

  const headers: HeadersInit = {
    Authorization: `Bearer ${cfg.apiKey}`,
    'Content-Type': 'application/json',
    ...(init.headers || {}),
  };

  const res = await fetch(url, {
    ...init,
    headers,
    // Small safety timeout via AbortSignal if supported by runtime.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PostHog request failed (${res.status}): ${text || res.statusText}`);
  }

  return (await res.json()) as T;
}

// Minimal subset of the Trends API response we care about.
export interface PosthogTrendSeriesPoint {
  date: string;
  value: number;
}

export interface PosthogTrendSeries {
  label: string;
  count: number;
  data: number[];
  dates: string[];
}

export interface PosthogTrendsResponseItem {
  label: string;
  count: number;
  data: number[];
  days?: string[];
  dates?: string[];
}

export type PosthogTrendsResponse = PosthogTrendsResponseItem[];

export interface EventTrendsOptions {
  event: string;
  /** HogQL-style relative range, e.g. "-30d". */
  dateFrom?: string;
  /** Optional end of the window, e.g. "-7d" for a previous period. */
  dateTo?: string;
  /** Optional event-level property filters. */
  properties?: Array<{
    key: string;
    value: string | number | boolean;
    operator?: 'exact' | 'is_not' | 'icontains' | 'not_icontains';
    type?: 'event';
  }>;
}

/**
 * Query PostHog Trends API for a single custom event.
 * Returns daily series and total count over the window.
 */
export async function getEventTrends(options: EventTrendsOptions): Promise<PosthogTrendSeries> {
  const { event, dateFrom = '-30d', dateTo, properties = [] } = options;

  const body = {
    insight: 'TRENDS',
    display: 'ActionsLineGraph',
    events: [
      {
        id: event,
        name: event,
        type: 'events',
        order: 0,
      },
    ],
    date_from: dateFrom,
    ...(dateTo ? { date_to: dateTo } : {}),
    properties: properties.map((p) => ({
      type: p.type || 'event',
      key: p.key,
      value: p.value,
      operator: p.operator || 'exact',
    })),
  };

  const res = await posthogRequest<PosthogTrendsResponse>('/insights/trend/', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const series = res[0];
  if (!series) {
    return {
      label: event,
      count: 0,
      data: [],
      dates: [],
    };
  }

  const dates = (series.days || series.dates || []) as string[];

  return {
    label: series.label || event,
    count: typeof series.count === 'number' && Number.isFinite(series.count) ? series.count : 0,
    data: Array.isArray(series.data) ? series.data.map((v) => (typeof v === 'number' ? v : 0)) : [],
    dates,
  };
}

/** Convenience helper to check if PostHog analytics is usable at runtime. */
export function isPosthogEnabled(): boolean {
  return getPosthogConfig().configured;
}
