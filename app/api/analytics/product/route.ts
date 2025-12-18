import { cache, createCacheKey } from '@/lib/cache';
import { analyticsRateLimiter, getClientId } from '@/lib/rateLimit';
import { RESOURCE_TYPES, requirePermission } from '@/lib/rbac';
import { getEventTrends, isPosthogEnabled } from '@/lib/posthog';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 300; // 5 minutes
export const dynamic = 'force-dynamic';

const DEFAULT_WINDOW = '-30d';

const FEATURE_DEFINITIONS = [
  {
    key: 'explore',
    label: 'Explore',
    events: ['explore_media_opened', 'explore_media_closed', 'explore_comment_added'],
  },
  {
    key: 'connect',
    label: 'Connect',
    events: ['connect_feed_viewed', 'connect_post_opened', 'connect_comment_added'],
  },
  {
    key: 'finance',
    label: 'Finance',
    events: [
      'finance_screen_viewed',
      'finance_tracker_opened',
      'finance_debt_add_submitted',
      'finance_goal_add_submitted',
    ],
  },
  {
    key: 'water',
    label: 'Water',
    events: ['water_tab_selected'],
  },
  {
    key: 'mood',
    label: 'Mood',
    events: ['mood_checkin_submitted', 'mood_journal_submitted', 'mood_gratitude_submitted'],
  },
  {
    key: 'mindfulness',
    label: 'Mindfulness',
    events: ['mindfulness_session_completed', 'mindfulness_activity_opened'],
  },
  {
    key: 'fitness',
    label: 'Fitness',
    events: ['fitness_workout_started', 'fitness_workout_completed'],
  },
  {
    key: 'passport',
    label: 'Passport',
    events: ['passport_screen_viewed', 'passport_action_tapped'],
  },
] as const;

function clampDays(raw: string | null): number {
  const n = raw ? Number(raw) : 30;
  if (!Number.isFinite(n)) return 30;
  return Math.max(1, Math.min(90, Math.trunc(n)));
}

export type ProductFeatureSummary = {
  key: string;
  label: string;
  totalEvents: number;
  events: Array<{
    name: string;
    total: number;
  }>;
};

export type ProductInsights = {
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
};

export async function GET(request: NextRequest) {
  try {
    // RBAC: only users with analytics:read can access product analytics
    const authCheck = await requirePermission(request, RESOURCE_TYPES.ANALYTICS, 'read');
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    // Rate limiting
    const clientId = getClientId(request);
    const rateLimit = analyticsRateLimiter.check(clientId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again after ${new Date(rateLimit.resetAt).toISOString()}`,
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
          },
        }
      );
    }

    const days = clampDays(request.nextUrl.searchParams.get('days'));
    const windowLabel = days === 1 ? 'Last 24 hours' : `Last ${days} days`;

    const cacheKey = createCacheKey('product-analytics', { days });
    const cached = cache.get<ProductInsights>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'X-Cache': 'HIT',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        },
      });
    }

    if (!isPosthogEnabled()) {
      const disabled: ProductInsights = {
        windowDays: days,
        windowLabel,
        enabled: false,
        disabledReason:
          'PostHog analytics is not configured. Set POSTHOG_PROJECT_ID and POSTHOG_PERSONAL_API_KEY to enable.',
        features: [],
        highlights: {},
      };

      cache.set(cacheKey, disabled, 300000);

      return NextResponse.json(disabled, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'X-Cache': 'MISS',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        },
      });
    }

    const dateFrom = `-${days}d` as const;
    const previousDateFrom = `-${days * 2}d` as const;
    const previousDateTo = `-${days}d` as const;

    // Fetch trends for all feature/event combinations in parallel.
    const featureSummaries: (ProductFeatureSummary & {
      previousTotalEvents: number;
      changePercent: number;
    })[] = [];

    for (const feature of FEATURE_DEFINITIONS) {
      const seriesList = await Promise.all(
        feature.events.map(async (eventName) => {
          try {
            const [currentSeries, previousSeries] = await Promise.all([
              getEventTrends({ event: eventName, dateFrom }),
              getEventTrends({ event: eventName, dateFrom: previousDateFrom, dateTo: previousDateTo }),
            ]);
            return {
              eventName,
              total: currentSeries.count,
              previousTotal: previousSeries.count,
            };
          } catch (error) {
            console.error('PostHog trends error for event', eventName, error);
            return { eventName, total: 0, previousTotal: 0 };
          }
        })
      );

      const totalEvents = seriesList.reduce((sum, s) => sum + (s.total || 0), 0);
      const previousTotalEvents = seriesList.reduce(
        (sum, s) => sum + (s.previousTotal || 0),
        0
      );
      const changePercent =
        previousTotalEvents > 0 ? ((totalEvents - previousTotalEvents) / previousTotalEvents) * 100 : 0;

      featureSummaries.push({
        key: feature.key,
        label: feature.label,
        totalEvents,
        events: seriesList.map((s) => ({ name: s.eventName, total: s.total })),
        previousTotalEvents,
        changePercent,
      });
    }

    // Basic "intelligent" highlights.
    const sortedByActivity = [...featureSummaries].sort((a, b) => b.totalEvents - a.totalEvents);
    const mostActive = sortedByActivity[0];
    const leastActive = sortedByActivity.filter((f) => f.totalEvents > 0).at(-1);

    const withHistory = featureSummaries.filter(
      (f) => Number.isFinite(f.changePercent) && f.previousTotalEvents > 0
    );
    const fastestGrowing = [...withHistory]
      .filter((f) => f.changePercent > 5)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 3);
    const atRisk = [...withHistory]
      .filter((f) => f.changePercent < -10)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 3);

    const response: ProductInsights = {
      windowDays: days,
      windowLabel,
      enabled: true,
      features: featureSummaries,
      highlights: {
        mostActiveFeature: mostActive
          ? {
              key: mostActive.key,
              label: mostActive.label,
              totalEvents: mostActive.totalEvents,
            }
          : undefined,
        leastActiveFeature: leastActive
          ? {
              key: leastActive.key,
              label: leastActive.label,
              totalEvents: leastActive.totalEvents,
            }
          : undefined,
        fastestGrowingFeatures: fastestGrowing.map((f) => ({
          key: f.key,
          label: f.label,
          totalEvents: f.totalEvents,
          changePercent: f.changePercent,
        })),
        atRiskFeatures: atRisk.map((f) => ({
          key: f.key,
          label: f.label,
          totalEvents: f.totalEvents,
          changePercent: f.changePercent,
        })),
      },
    };

    cache.set(cacheKey, response, 300000);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'MISS',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching product analytics:', error);
    const message =
      error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
        ? error.message
        : 'Failed to fetch product analytics';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
