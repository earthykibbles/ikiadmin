'use client';

import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, ArrowDownRight, BarChart3, Sparkles } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface FinanceFunnelStep {
  id: number;
  label: string;
  eventNames: string[];
  count: number;
  conversionFromPrevious: number;
  conversionFromFirst: number;
}

export interface FinanceFunnelResponse {
  windowDays: number;
  windowLabel: string;
  enabled: boolean;
  disabledReason?: string;
  steps: FinanceFunnelStep[];
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toString();
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value * 100)}%`;
}

export default function FinanceFunnelPanel() {
  const [data, setData] = useState<FinanceFunnelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/analytics/product/finance');
        if (!res.ok) {
          throw new Error('Failed to load finance funnel analytics');
        }
        const json = (await res.json()) as FinanceFunnelResponse;
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
          <div className="skeleton h-6 w-64" />
        </div>
        <div className="skeleton h-[220px]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-compact status-error flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400" />
        <p className="body-sm">Finance funnel error: {error}</p>
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
              'Set POSTHOG_PROJECT_ID and POSTHOG_PERSONAL_API_KEY in the iki-gen environment to enable finance funnels powered by PostHog.'}
          </p>
        </div>
      </div>
    );
  }

  const chartData = data.steps.map((step) => ({
    step: `${step.id}. ${step.label}`,
    count: step.count,
  }));

  const base = data.steps[0]?.count ?? 0;
  const finalStep = data.steps[data.steps.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-light-green" />
          <div>
            <h3 className="heading-md text-iki-white">Finance Funnel (PostHog)</h3>
            <p className="body-xs text-iki-white/70">{data.windowLabel}</p>
          </div>
        </div>
        {base > 0 && finalStep && (
          <div className="card-compact flex items-center gap-2">
            <Activity className="w-4 h-4 text-light-green" />
            <div>
              <div className="body-xs text-iki-white/60">Overall conversion</div>
              <div className="heading-sm text-iki-white">
                {formatPercent(finalStep.conversionFromFirst)}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-5 h-5 text-light-green" />
          <h4 className="heading-sm text-iki-white">Step volume</h4>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="step" stroke="#ffffff60" style={{ fontSize: '12px' }} />
            <YAxis stroke="#ffffff60" style={{ fontSize: '12px' }} tickFormatter={formatNumber} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #a8d91a40',
                borderRadius: '8px',
              }}
              formatter={(value: unknown) => [formatNumber(Number(value)), 'Events']}
            />
            <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#a8d91a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.steps.map((step, idx) => (
          <div key={step.id} className="card-compact">
            <div className="flex items-center justify-between mb-1">
              <div className="body-xs text-iki-white/60">Step {step.id}</div>
              {idx > 0 && (
                <ArrowDownRight className="w-4 h-4 text-iki-white/40" />
              )}
            </div>
            <div className="heading-sm text-iki-white mb-1">{step.label}</div>
            <div className="body-xs text-iki-white/70 mb-1">
              {formatNumber(step.count)} events
            </div>
            {idx > 0 && (
              <div className="body-xs text-iki-white/60 flex flex-col gap-0.5">
                <span>
                  From previous step: <span className="text-iki-white/90">{formatPercent(step.conversionFromPrevious)}</span>
                </span>
                <span>
                  From start: <span className="text-iki-white/90">{formatPercent(step.conversionFromFirst)}</span>
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
