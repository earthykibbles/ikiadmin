'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, Flame, Gauge, Sparkles } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface ProductFeatureSummary {
  key: string;
  label: string;
  totalEvents: number;
  events: Array<{
    name: string;
    total: number;
  }>;
}

export interface ProductInsights {
  windowDays: number;
  windowLabel: string;
  enabled: boolean;
  disabledReason?: string;
  features: ProductFeatureSummary[];
  highlights: {
    mostActiveFeature?: { key: string; label: string; totalEvents: number };
    leastActiveFeature?: { key: string; label: string; totalEvents: number };
    fastestGrowingFeatures?: Array<{
      key: string;
      label: string;
      totalEvents: number;
      changePercent: number;
    }>;
    atRiskFeatures?: Array<{
      key: string;
      label: string;
      totalEvents: number;
      changePercent: number;
    }>;
  };
}

const COLORS = ['#a8d91a', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#38bdf8', '#f97316'];

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toString();
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '0%';
  const rounded = Math.round(value);
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded}%`;
}

export default function ProductAnalyticsPanel() {
  const [data, setData] = useState<ProductInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/analytics/product');
        if (!res.ok) {
          throw new Error('Failed to load product analytics');
        }
        const json = (await res.json()) as ProductInsights;
        setData(json);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error loading analytics';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="skeleton w-5 h-5 rounded" />
          <div className="skeleton h-6 w-48" />
        </div>
        <div className="skeleton h-[260px]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-compact status-error flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400" />
        <p className="body-sm">Product analytics error: {error}</p>
      </div>
    );
  }

  if (!data) return null;

  if (!data.enabled) {
    return (
      <div className="card-compact bg-iki-grey/40 border border-dashed border-light-green/40 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-light-green mt-0.5" />
        <div>
          <p className="body-sm text-iki-white/80 font-semibold">PostHog analytics not configured</p>
          <p className="body-xs text-iki-white/60 mt-1 max-w-xl">
            {data.disabledReason ||
              'Set POSTHOG_PROJECT_ID and POSTHOG_PERSONAL_API_KEY in the iki-gen environment to enable global product usage insights powered by PostHog.'}
          </p>
        </div>
      </div>
    );
  }

  const featureChartData = data.features.map((f) => ({
    feature: f.label,
    key: f.key,
    totalEvents: f.totalEvents,
  }));

  const mostActive = data.highlights.mostActiveFeature;
  const leastActive = data.highlights.leastActiveFeature;
  const fastestGrowing = data.highlights.fastestGrowingFeatures ?? [];
  const atRisk = data.highlights.atRiskFeatures ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-light-green" />
          <div>
            <h3 className="heading-md text-iki-white">Product Usage (PostHog)</h3>
            <p className="body-xs text-iki-white/70">{data.windowLabel}</p>
          </div>
        </div>
      </div>

      {/* High-level highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-compact flex items-center gap-3">
          <Gauge className="w-5 h-5 text-light-green" />
          <div>
            <div className="body-xs text-iki-white/60">Tracked features</div>
            <div className="heading-md text-iki-white">{data.features.length}</div>
          </div>
        </div>

        <div className="card-compact flex items-center gap-3">
          <Flame className="w-5 h-5 text-orange-400" />
          <div>
            <div className="body-xs text-iki-white/60">Most active feature</div>
            <div className="heading-sm text-iki-white">
              {mostActive ? (
                <>
                  {mostActive.label}
                  <span className="body-xs text-iki-white/60 ml-2">
                    {formatNumber(mostActive.totalEvents)} events
                  </span>
                </>
              ) : (
                'No events yet'
              )}
            </div>
          </div>
        </div>

        <div className="card-compact flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <div>
            <div className="body-xs text-iki-white/60">Least active feature</div>
            <div className="heading-sm text-iki-white">
              {leastActive ? (
                <>
                  {leastActive.label}
                  <span className="body-xs text-iki-white/60 ml-2">
                    {formatNumber(leastActive.totalEvents)} events
                  </span>
                </>
              ) : (
                'No low-activity features'
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Feature activity chart */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-5 h-5 text-light-green" />
          <h4 className="heading-sm text-iki-white">Feature Activity (event volume)</h4>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={featureChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis
              dataKey="feature"
              stroke="#ffffff60"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#ffffff60"
              style={{ fontSize: '12px' }}
              tickFormatter={formatNumber}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #a8d91a40',
                borderRadius: '8px',
              }}
              formatter={(value: unknown) => [formatNumber(Number(value)), 'Events']}
            />
            <Legend />
            <Bar
              dataKey="totalEvents"
              name="Events"
              radius={[8, 8, 0, 0]}
              fill="#a8d91a"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-feature breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.features.map((f, idx) => (
          <div key={f.key} className="card">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="body-xs text-iki-white/60">Feature</div>
                <div className="heading-sm text-iki-white">{f.label}</div>
              </div>
              <div
                className="px-2 py-1 rounded-full text-[11px] font-semibold"
                style={{
                  backgroundColor: `${COLORS[idx % COLORS.length]}22`,
                  color: COLORS[idx % COLORS.length],
                }}
              >
                {formatNumber(f.totalEvents)} events
              </div>
            </div>
            <div className="mt-2 space-y-1">
              {f.events.map((e) => (
                <div key={e.name} className="flex items-center justify-between body-xs text-iki-white/70">
                  <span className="truncate mr-2">{e.name}</span>
                  <span className="text-iki-white/90 font-mono">
                    {formatNumber(e.total)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {(fastestGrowing.length > 0 || atRisk.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fastestGrowing.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-3 mb-3">
                <Flame className="w-5 h-5 text-light-green" />
                <div>
                  <div className="heading-sm text-iki-white">Fastest-growing features</div>
                  <div className="body-xs text-iki-white/60">
                    Based on change vs previous {data.windowDays}-day period
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {fastestGrowing.map((f) => (
                  <div key={f.key} className="flex items-center justify-between body-xs text-iki-white/80">
                    <div className="flex flex-col">
                      <span className="font-medium">{f.label}</span>
                      <span className="text-iki-white/50">
                        {formatNumber(f.totalEvents)} events in last {data.windowDays}d
                      </span>
                    </div>
                    <span className="px-2 py-1 rounded-full bg-light-green/10 text-light-green font-semibold">
                      {formatPercent(f.changePercent)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {atRisk.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <div>
                  <div className="heading-sm text-iki-white">At-risk features</div>
                  <div className="body-xs text-iki-white/60">
                    Significant drop vs previous {data.windowDays}-day period
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {atRisk.map((f) => (
                  <div key={f.key} className="flex items-center justify-between body-xs text-iki-white/80">
                    <div className="flex flex-col">
                      <span className="font-medium">{f.label}</span>
                      <span className="text-iki-white/50">
                        {formatNumber(f.totalEvents)} events in last {data.windowDays}d
                      </span>
                    </div>
                    <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-400 font-semibold">
                      {formatPercent(f.changePercent)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
