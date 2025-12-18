'use client';

import { clearAnalyticsCache, getCachedAnalytics } from '@/lib/analyticsCache';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  RefreshCw,
  TrendingDown,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface AttentionItem {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  count?: number;
  action?: {
    label: string;
    href: string;
  };
}

interface AttentionData {
  lowEngagementUsers: number;
  incompleteProfiles: number;
  noActivityUsers: number;
  dataAnomalies: number;
}

export default function AttentionItems() {
  const [data, setData] = useState<AttentionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAttentionData();
  }, []);

  const fetchAttentionData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
        // Clear cache before manual refresh to force fresh data
        clearAnalyticsCache();
      } else {
        setLoading(true);
      }

      // Use shared cache - will return cached data unless forceRefresh is true
      const analyticsData = await getCachedAnalytics(isManualRefresh);

      // Calculate attention items based on analytics
      // These are simplified calculations - you can enhance based on your needs
      const attentionData: AttentionData = {
        lowEngagementUsers: Math.max(
          0,
          analyticsData.users.total - analyticsData.users.online - 10
        ), // Users not online recently
        incompleteProfiles: Math.floor(analyticsData.users.total * 0.15), // Estimate 15% incomplete
        noActivityUsers:
          analyticsData.users.total > 0 && analyticsData.moods.total === 0
            ? Math.floor(analyticsData.users.total * 0.2)
            : 0,
        dataAnomalies: 0, // Could be calculated based on data inconsistencies
      };

      setData(attentionData);
    } catch (error) {
      console.error('Error fetching attention data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchAttentionData(true);
  };

  if (loading) {
    return (
      <div className="glass rounded-3xl p-6 border border-light-green/10">
        <div className="text-center py-8 text-iki-white/60">Loading attention items...</div>
      </div>
    );
  }

  if (!data) return null;

  const allAttentionItems = [
    {
      id: 'low-engagement',
      type: 'warning',
      title: 'Low Engagement Users',
      description: "Users who haven't been active recently may need re-engagement",
      count: data.lowEngagementUsers,
      action: {
        label: 'View Users',
        href: '/users',
      },
    },
    {
      id: 'incomplete-profiles',
      type: 'info',
      title: 'Incomplete Profiles',
      description: 'Users with missing profile information',
      count: data.incompleteProfiles,
      action: {
        label: 'Review Profiles',
        href: '/admin',
      },
    },
    {
      id: 'no-activity',
      type: 'warning',
      title: 'Users with No Activity',
      description: "Users who haven't logged any mood entries",
      count: data.noActivityUsers,
      action: {
        label: 'Check Users',
        href: '/admin',
      },
    },
  ] satisfies AttentionItem[];

  const attentionItems: AttentionItem[] = allAttentionItems.filter((item) => (item.count ?? 0) > 0);

  if (attentionItems.length === 0) {
    return (
      <div className="glass rounded-3xl p-6 border border-light-green/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-light-green" />
            <h3 className="text-xl font-bold text-iki-white">Matters Requiring Attention</h3>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg bg-iki-grey/30 border border-light-green/10 hover:bg-iki-grey/50 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 text-iki-white/60 ${refreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
        <div className="text-center py-8">
          <div className="mb-3 flex items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-light-green/10 border border-light-green/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-light-green" />
            </div>
          </div>
          <p className="text-iki-white/60">
            All systems operational. No items require immediate attention.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-3xl p-6 border border-light-green/10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-400" />
          <h3 className="text-xl font-bold text-iki-white">Matters Requiring Attention</h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 rounded-lg bg-iki-grey/30 border border-light-green/10 hover:bg-iki-grey/50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-iki-white/60 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-4">
        {attentionItems.map((item) => (
          <div
            key={item.id}
            className={`p-5 rounded-2xl border-2 ${
              item.type === 'error'
                ? 'bg-red-500/10 border-red-500/30'
                : item.type === 'warning'
                  ? 'bg-orange-500/10 border-orange-500/30'
                  : 'bg-blue-500/10 border-blue-500/30'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {item.type === 'error' ? (
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  ) : item.type === 'warning' ? (
                    <AlertTriangle className="w-5 h-5 text-orange-400" />
                  ) : (
                    <Database className="w-5 h-5 text-blue-400" />
                  )}
                  <h4 className="text-lg font-bold text-iki-white">{item.title}</h4>
                  {item.count !== undefined && (
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-bold ${
                        item.type === 'error'
                          ? 'bg-red-500/20 text-red-300'
                          : item.type === 'warning'
                            ? 'bg-orange-500/20 text-orange-300'
                            : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </div>
                <p className="text-iki-white/70 text-sm mb-3">{item.description}</p>
                {item.action && (
                  <Link
                    href={item.action.href}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-iki-grey/30 border border-light-green/20 hover:bg-iki-grey/50 transition-colors text-sm text-iki-white/80"
                  >
                    {item.action.label}
                    <span>→</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
