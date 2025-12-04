'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Droplet, Apple, DollarSign, Smile, Activity, RefreshCw } from 'lucide-react';


interface UserAnalyticsData {
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
    waterByDate: { date: string; totalLiters: string; averageMl: string; logCount: number }[];
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
    totalBudgets: number;
    totalDebts: number;
    totalGoals: number;
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
  };
}

const COLORS = ['#a8d91a', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981'];

interface UserAnalyticsDashboardProps {
  userId: string;
}

// Simple in-memory cache to prevent duplicate requests
const analyticsCache = new Map<string, { data: UserAnalyticsData; timestamp: number }>();
const loadingPromises = new Map<string, Promise<UserAnalyticsData>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default function UserAnalyticsDashboard({ userId }: UserAnalyticsDashboardProps) {
  const [data, setData] = useState<UserAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [userId]);

  const fetchAnalytics = async (isManualRefresh = false) => {
    // Check cache first (unless manual refresh)
    if (!isManualRefresh) {
      const cached = analyticsCache.get(userId);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setData(cached.data);
        setLoading(false);
        return;
      }
    }

    // Prevent duplicate concurrent requests
    const existingPromise = loadingPromises.get(userId);
    if (existingPromise && !isManualRefresh) {
      try {
        const analyticsData = await existingPromise;
        setData(analyticsData);
        setLoading(false);
        return;
      } catch (err: any) {
        // Continue to fetch if existing promise failed
      }
    }

    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const fetchPromise = fetch(`/api/users/${userId}/analytics`, {
        cache: 'default',
      })
        .then((response) => {
          if (!response.ok) throw new Error('Failed to fetch analytics');
          return response.json();
        })
        .then((analyticsData) => {
          // Update cache
          analyticsCache.set(userId, { data: analyticsData, timestamp: Date.now() });
          loadingPromises.delete(userId);
          return analyticsData;
        })
        .catch((err) => {
          loadingPromises.delete(userId);
          throw err;
        });

      if (!isManualRefresh) {
        loadingPromises.set(userId, fetchPromise);
      }

      const analyticsData = await fetchPromise;
      setData(analyticsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchAnalytics(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Key Metrics Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass p-6 rounded-2xl animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-iki-grey/50"></div>
                <div className="h-4 w-24 bg-iki-grey/50 rounded"></div>
              </div>
              <div className="h-8 w-20 bg-iki-grey/50 rounded mb-2"></div>
              <div className="h-4 w-32 bg-iki-grey/50 rounded"></div>
            </div>
          ))}
        </div>

        {/* Chart Skeletons */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass p-6 rounded-2xl animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-5 rounded bg-iki-grey/50"></div>
              <div className="h-6 w-48 bg-iki-grey/50 rounded"></div>
            </div>
            <div className="h-[300px] bg-iki-grey/30 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  if (!data) return null;

  // Format dates for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Refresh Button */}
      <div className="flex justify-end mb-2">
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="px-4 py-2 rounded-full bg-iki-grey/50 border border-light-green/20 hover:bg-iki-grey/70 transition-colors flex items-center gap-2 text-sm text-iki-white/80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Smile className="w-5 h-5" />}
          title="Total Moods"
          value={data.moods.total.toLocaleString()}
          subtitle={`Avg intensity: ${data.moods.averageIntensity.toFixed(1)}`}
          color="from-purple-500 to-purple-600"
        />
        <MetricCard
          icon={<Droplet className="w-5 h-5" />}
          title="Water Logs"
          value={data.water.totalLiters.toFixed(1)}
          subtitle={`${data.water.totalLogs} logs`}
          color="from-blue-500 to-blue-600"
          unit="L"
        />
        <MetricCard
          icon={<Apple className="w-5 h-5" />}
          title="Meals Logged"
          value={data.nutrition.totalMeals.toLocaleString()}
          subtitle={`${data.nutrition.totalCalories.toLocaleString()} calories`}
          color="from-orange-500 to-orange-600"
        />
        <MetricCard
          icon={<DollarSign className="w-5 h-5" />}
          title="Finance Budgets"
          value={data.finance.totalBudgets.toLocaleString()}
          subtitle={`${data.finance.totalGoals} goals`}
          color="from-green-500 to-green-600"
        />
      </div>

      {/* Mood Distribution */}
      {data.moods.distribution.length > 0 && (
        <div className="glass p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Smile className="w-5 h-5 text-light-green" />
            <h3 className="text-xl font-bold text-iki-white">Mood Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.moods.distribution.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis
                dataKey="emoji"
                stroke="#ffffff60"
                style={{ fontSize: '16px' }}
              />
              <YAxis stroke="#ffffff60" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #a8d91a40',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" fill="#a8d91a" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Mood Entries Over Time */}
      {data.moods.moodsByDate.length > 0 && (
        <div className="glass p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-5 h-5 text-light-green" />
            <h3 className="text-xl font-bold text-iki-white">Mood Entries (Last 30 Days)</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.moods.moodsByDate}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#ffffff60"
                style={{ fontSize: '12px' }}
              />
              <YAxis stroke="#ffffff60" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #a8d91a40',
                  borderRadius: '8px',
                }}
                labelFormatter={(label) => formatDate(label)}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Water Intake */}
      {data.water.waterByDate.length > 0 && (
        <div className="glass p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Droplet className="w-5 h-5 text-light-green" />
            <h3 className="text-xl font-bold text-iki-white">Water Intake (Last 7 Days)</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.water.waterByDate}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#ffffff60"
                style={{ fontSize: '12px' }}
              />
              <YAxis stroke="#ffffff60" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #a8d91a40',
                  borderRadius: '8px',
                }}
                labelFormatter={(label) => formatDate(label)}
                formatter={(value: any) => [`${parseFloat(value).toFixed(2)}L`, 'Total']}
              />
              <Bar dataKey="totalLiters" fill="#06b6d4" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Nutrition Calories */}
      {data.nutrition.caloriesByDate.length > 0 && (
        <div className="glass p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Apple className="w-5 h-5 text-light-green" />
            <h3 className="text-xl font-bold text-iki-white">Calories Logged (Last 7 Days)</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.nutrition.caloriesByDate}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#ffffff60"
                style={{ fontSize: '12px' }}
              />
              <YAxis stroke="#ffffff60" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #a8d91a40',
                  borderRadius: '8px',
                }}
                labelFormatter={(label) => formatDate(label)}
              />
              <Bar dataKey="total" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Macro Distribution */}
      {data.nutrition.macroTotals && data.nutrition.macroTotals.protein > 0 && (
        <div className="glass p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Apple className="w-5 h-5 text-light-green" />
            <h3 className="text-xl font-bold text-iki-white">Nutrition Macros</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Protein', value: data.nutrition.macroTotals.protein },
                  { name: 'Carbs', value: data.nutrition.macroTotals.carbs },
                  { name: 'Fats', value: data.nutrition.macroTotals.fats },
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value.toLocaleString()}g`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {[
                  { name: 'Protein', value: data.nutrition.macroTotals.protein },
                  { name: 'Carbs', value: data.nutrition.macroTotals.carbs },
                  { name: 'Fats', value: data.nutrition.macroTotals.fats },
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #a8d91a40',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Finance Overview */}
      {data.finance.totalBudgets > 0 && (
        <div className="glass p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-5 h-5 text-light-green" />
            <h3 className="text-xl font-bold text-iki-white">Finance Overview</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-iki-grey/50 p-4 rounded-xl">
              <div className="text-iki-white/60 text-sm mb-1">Total Budgets</div>
              <div className="text-2xl font-bold text-iki-white">{data.finance.totalBudgets}</div>
            </div>
            <div className="bg-iki-grey/50 p-4 rounded-xl">
              <div className="text-iki-white/60 text-sm mb-1">Total Debts</div>
              <div className="text-2xl font-bold text-red-400">{data.finance.totalDebts}</div>
            </div>
            <div className="bg-iki-grey/50 p-4 rounded-xl">
              <div className="text-iki-white/60 text-sm mb-1">Total Goals</div>
              <div className="text-2xl font-bold text-iki-white">{data.finance.totalGoals}</div>
            </div>
            <div className="bg-iki-grey/50 p-4 rounded-xl">
              <div className="text-iki-white/60 text-sm mb-1">Total Income</div>
              <div className="text-2xl font-bold text-green-400">${data.finance.totalIncome.toLocaleString()}</div>
            </div>
            <div className="bg-iki-grey/50 p-4 rounded-xl">
              <div className="text-iki-white/60 text-sm mb-1">Total Expenses</div>
              <div className="text-2xl font-bold text-red-400">${data.finance.totalExpenses.toLocaleString()}</div>
            </div>
            <div className="bg-iki-grey/50 p-4 rounded-xl">
              <div className="text-iki-white/60 text-sm mb-1">Net Balance</div>
              <div className={`text-2xl font-bold ${data.finance.netBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${data.finance.netBalance.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
  color: string;
  unit?: string;
}

function MetricCard({ icon, title, value, subtitle, color, unit }: MetricCardProps) {
  return (
    <div className="glass p-6 rounded-2xl">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white`}>
          {icon}
        </div>
        <div className="text-iki-white/60 text-sm font-medium">{title}</div>
      </div>
      <div className="text-3xl font-bold text-iki-white mb-1">
        {value}
        {unit && <span className="text-xl ml-1">{unit}</span>}
      </div>
      <div className="text-sm text-iki-white/60">{subtitle}</div>
    </div>
  );
}

