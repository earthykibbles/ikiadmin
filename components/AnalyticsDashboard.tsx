'use client';

import { clearAnalyticsCache, getCachedAnalytics } from '@/lib/analyticsCache';
import {
  Activity,
  Apple,
  DollarSign,
  Droplet,
  RefreshCw,
  Smile,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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

const COLORS = ['#a8d91a', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981'];

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalytics();
    // No auto-refresh - data is cached in memory until manual refresh
  }, []);

  const fetchAnalytics = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
        // Clear cache before manual refresh to force fresh data
        clearAnalyticsCache();
      } else {
        setLoading(true);
      }
      setError(null);

      // Use shared cache - will return cached data unless forceRefresh is true
      const analyticsData = await getCachedAnalytics(isManualRefresh);
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
      <div className="spacing-section">
        {/* Key Metrics Skeleton */}
        <div className="grid-metrics">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="skeleton h-4 w-24" />
              </div>
              <div className="skeleton h-8 w-20 mb-2" />
              <div className="skeleton h-4 w-32" />
            </div>
          ))}
        </div>

        {/* Chart Skeletons */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="skeleton w-5 h-5 rounded" />
              <div className="skeleton h-6 w-48" />
            </div>
            <div className="skeleton h-[300px]" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="card-compact status-error">
          <p className="body-md">Error: {error}</p>
        </div>
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
    <div className="spacing-section">
      {/* Refresh Button */}
      <div className="flex justify-end mb-2">
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="btn-secondary"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid-metrics">
        <MetricCard
          icon={<Users className="w-5 h-5" />}
          title="Total Users"
          value={data.users.total.toLocaleString()}
          subtitle={`${data.users.online} online`}
          color="from-light-green to-[#a8d91a]"
        />
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
      </div>

      {/* User Signups Over Time */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5 text-light-green" />
          <h3 className="heading-md text-iki-white">User Signups (Last 30 Days)</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.users.signupsByDate}>
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
              stroke="#a8d91a"
              strokeWidth={2}
              dot={{ fill: '#a8d91a', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Mood Distribution */}
      {data.moods.distribution.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Smile className="w-5 h-5 text-light-green" />
            <h3 className="heading-md text-iki-white">Mood Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.moods.distribution.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="emoji" stroke="#ffffff60" style={{ fontSize: '16px' }} />
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
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-5 h-5 text-light-green" />
            <h3 className="heading-md text-iki-white">Mood Entries (Last 7 Days)</h3>
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
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Droplet className="w-5 h-5 text-light-green" />
            <h3 className="heading-md text-iki-white">Water Intake (Last 7 Days)</h3>
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
                formatter={(value: any) => [`${Number.parseFloat(value).toFixed(2)}L`, 'Total']}
              />
              <Bar dataKey="totalLiters" fill="#06b6d4" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Nutrition Calories */}
      {data.nutrition.caloriesByDate.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Apple className="w-5 h-5 text-light-green" />
            <h3 className="heading-md text-iki-white">Calories Logged (Last 7 Days)</h3>
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
      {data.nutrition.macroTotals && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Apple className="w-5 h-5 text-light-green" />
            <h3 className="heading-md text-iki-white">Nutrition Macros</h3>
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

      {/* Activity Levels */}
      {data.users.activityLevels.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-5 h-5 text-light-green" />
            <h3 className="heading-md text-iki-white">User Activity Levels</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.users.activityLevels}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(props: any) => {
                  const entry = props.payload as { level: string; count: number };
                  return `${entry.level}: ${entry.count}`;
                }}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {data.users.activityLevels.map((entry, index) => (
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
      {data.finance.users > 0 && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-5 h-5 text-light-green" />
            <h3 className="heading-md text-iki-white">Finance Overview</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="card-compact">
              <div className="body-sm text-iki-white/60 mb-1">Users with Finance</div>
              <div className="heading-md text-light-green">{data.finance.users}</div>
            </div>
            <div className="card-compact">
              <div className="body-sm text-iki-white/60 mb-1">Total Budgets</div>
              <div className="heading-md text-iki-white">{data.finance.totalBudgets}</div>
            </div>
            <div className="card-compact">
              <div className="body-sm text-iki-white/60 mb-1">Total Debts</div>
              <div className="heading-md text-red-400">{data.finance.totalDebts}</div>
            </div>
            <div className="card-compact">
              <div className="body-sm text-iki-white/60 mb-1">Total Goals</div>
              <div className="heading-md text-iki-white">{data.finance.totalGoals}</div>
            </div>
            <div className="card-compact">
              <div className="body-sm text-iki-white/60 mb-1">Total Income</div>
              <div className="heading-md text-green-400">
                ${data.finance.totalIncome.toLocaleString()}
              </div>
            </div>
            <div className="card-compact">
              <div className="body-sm text-iki-white/60 mb-1">Total Expenses</div>
              <div className="heading-md text-red-400">
                ${data.finance.totalExpenses.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Countries */}
      {data.users.topCountries.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-light-green" />
            <h3 className="heading-md text-iki-white">Top Countries</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.users.topCountries} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis type="number" stroke="#ffffff60" style={{ fontSize: '12px' }} />
              <YAxis
                type="category"
                dataKey="country"
                stroke="#ffffff60"
                style={{ fontSize: '12px' }}
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #a8d91a40',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" fill="#a8d91a" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
    <div className="card">
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white`}
        >
          {icon}
        </div>
        <div className="body-sm text-iki-white/60 font-medium">{title}</div>
      </div>
      <div className="heading-lg text-iki-white mb-1">
        {value}
        {unit && <span className="heading-md ml-1">{unit}</span>}
      </div>
      <div className="body-sm text-iki-white/60">{subtitle}</div>
    </div>
  );
}
