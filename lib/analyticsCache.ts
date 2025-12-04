// Client-side in-memory cache for analytics data
// This cache persists until manual refresh to prevent excessive Firestore reads

interface AnalyticsData {
  users: {
    total: number;
    online: number;
    totalPoints: number;
    averagePoints: number;
    signupsByDate: { date: string; count: number }[];
    activityLevels: { level: string; count: number }[];
    topCountries: { country: string; count: number }[];
  };
  moods: {
    total: number;
    averageIntensity: number;
    distribution: { emoji: string; count: number }[];
    moodsByDate: { date: string; count: number }[];
  };
  water: {
    totalLogs: number;
    totalLiters: number;
    averagePerLog: number;
    averageDaily: number;
    waterByDate: { date: string; totalLiters: string; averageMl: string; userCount: number }[];
  };
  nutrition: {
    totalMeals: number;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFats: number;
    caloriesByDate: { date: string; total: number; average: number; mealCount: number }[];
    macroTotals: { protein: number; carbs: number; fats: number };
  };
  finance: {
    users: number;
    totalBudgets: number;
    totalDebts: number;
    totalGoals: number;
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
  };
}

// In-memory cache - persists until manual refresh or page reload
const analyticsCache: { data: AnalyticsData | null; timestamp: number | null } = {
  data: null,
  timestamp: null,
};

let loadingPromise: Promise<AnalyticsData> | null = null;

export async function getCachedAnalytics(forceRefresh = false): Promise<AnalyticsData> {
  // Return cached data if available and not forcing refresh
  if (!forceRefresh && analyticsCache.data && analyticsCache.timestamp) {
    return analyticsCache.data;
  }

  // If there's already a loading promise, wait for it
  if (loadingPromise && !forceRefresh) {
    return loadingPromise;
  }

  // Fetch new data
  const fetchPromise = fetch('/api/analytics')
    .then((response) => {
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    })
    .then((data: AnalyticsData) => {
      // Store in cache
      analyticsCache.data = data;
      analyticsCache.timestamp = Date.now();
      loadingPromise = null;
      return data;
    })
    .catch((error) => {
      loadingPromise = null;
      throw error;
    });

  if (!forceRefresh) {
    loadingPromise = fetchPromise;
  }

  return fetchPromise;
}

export function clearAnalyticsCache(): void {
  analyticsCache.data = null;
  analyticsCache.timestamp = null;
  loadingPromise = null;
}

export function getCachedData(): AnalyticsData | null {
  return analyticsCache.data;
}

