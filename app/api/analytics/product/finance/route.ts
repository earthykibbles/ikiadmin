import { cache, createCacheKey } from '@/lib/cache';
import { analyticsRateLimiter, getClientId } from '@/lib/rateLimit';
import { RESOURCE_TYPES, requirePermission } from '@/lib/rbac';
import { getEventTrends, isPosthogEnabled } from '@/lib/posthog';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

function clampDays(raw: string | null): number {
  const n = raw ? Number(raw) : 30;
  if (!Number.isFinite(n)) return 30;
  return Math.max(1, Math.min(90, Math.trunc(n)));
}

type FinanceFunnelStep = {
  id: number;
  label: string;
  eventNames: string[];
  count: number;
  conversionFromPrevious: number;
  conversionFromFirst: number;
};

export type FinanceFunnelResponse = {
  windowDays: number;
  windowLabel: string;
  enabled: boolean;
  disabledReason?: string;
  steps: FinanceFunnelStep[];
};

export async function GET(request: NextRequest) {
  try {
    const authCheck = await requirePermission(request, RESOURCE_TYPES.ANALYTICS, 'read');
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

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

    const cacheKey = createCacheKey('product-finance-funnel', { days });
    const cached = cache.get<FinanceFunnelResponse>(cacheKey);
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
      const disabled: FinanceFunnelResponse = {
        windowDays: days,
        windowLabel,
        enabled: false,
        disabledReason:
          'PostHog analytics is not configured. Set POSTHOG_PROJECT_ID and POSTHOG_PERSONAL_API_KEY to enable.',
        steps: [],
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

    // Pseudo-funnel using aggregate event counts for finance flows.
    const [screenViewed, trackerOpened, debtSubmitted, goalSubmitted] = await Promise.all([
      getEventTrends({ event: 'finance_screen_viewed', dateFrom }),
      getEventTrends({ event: 'finance_tracker_opened', dateFrom }),
      getEventTrends({ event: 'finance_debt_add_submitted', dateFrom }),
      getEventTrends({ event: 'finance_goal_add_submitted', dateFrom }),
    ]);

    const base = screenViewed.count || 0;
    const tracker = trackerOpened.count || 0;
    const planCreated = (debtSubmitted.count || 0) + (goalSubmitted.count || 0);

    const steps: FinanceFunnelStep[] = [];

    const makeStep = (
      id: number,
      label: string,
      eventNames: string[],
      count: number,
      previousCount: number | null
    ): FinanceFunnelStep => {
      const safeCount = Number.isFinite(count) ? Math.max(0, count) : 0;
      const safePrev = previousCount !== null && Number.isFinite(previousCount) ? Math.max(0, previousCount) : 0;
      const convPrev = safePrev > 0 ? safeCount / safePrev : 0;
      const convFirst = base > 0 ? safeCount / base : 0;
      return {
        id,
        label,
        eventNames,
        count: safeCount,
        conversionFromPrevious: convPrev,
        conversionFromFirst: convFirst,
      };
    };

    steps.push(makeStep(1, 'Finance viewed', ['finance_screen_viewed'], base, null));
    steps.push(makeStep(2, 'Tracker opened', ['finance_tracker_opened'], tracker, base));
    steps.push(
      makeStep(
        3,
        'Plan created (debt/goal)',
        ['finance_debt_add_submitted', 'finance_goal_add_submitted'],
        planCreated,
        tracker
      )
    );

    const response: FinanceFunnelResponse = {
      windowDays: days,
      windowLabel,
      enabled: true,
      steps,
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
    console.error('Error building finance funnel analytics:', error);
    const message =
      error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
        ? error.message
        : 'Failed to fetch finance funnel analytics';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

