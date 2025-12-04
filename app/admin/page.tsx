'use client';

import { useState, useEffect } from 'react';
import { User, UsersResponse } from '@/lib/types';
import { Search, User as UserIcon, Mail, Calendar, DollarSign, TrendingUp, TrendingDown, Target, CreditCard, Home, Users, ArrowLeft, Pill, Phone, Heart, FileText, CheckCircle, XCircle, Droplet, Apple, BookOpen, Smile, Sparkles, Brain, Activity, ClipboardList, Stethoscope } from 'lucide-react';
import Link from 'next/link';
import AdminNavbar, { DataModelView } from '@/components/AdminNavbar';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import PointsManagement from '@/components/PointsManagement';
import ConnectPosts from '@/components/ConnectPosts';
import ExploreVideos from '@/components/ExploreVideos';
import ProfileDropdown from '@/components/ProfileDropdown';
import OnboardingSummary from '@/components/OnboardingSummary';

interface FinanceData {
  budgets: any[];
  debts: any[];
  goals: any[];
  summary: {
    totalBudgets: number;
    totalDebts: number;
    totalGoals: number;
    totalDebt: number;
    totalGoalsAmount: number;
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
  };
}

interface WellsphereData {
  condition: string | null;
  conditionData: any | null;
  onboardingFinished: boolean;
  onboardingData: any | null;
  drugs: any[];
  emergencyContacts: any[];
  medicalInfo: any | null;
  symptoms: any[];
  dailyCheckIns: any[];
  summary: {
    totalDrugs: number;
    totalEmergencyContacts: number;
    totalSymptoms: number;
    totalDailyCheckIns: number;
    hasCondition: boolean;
    hasMedicalInfo: boolean;
    onboardingComplete: boolean;
  };
}

interface MoodData {
  moods: any[];
  gratitudeEntries: any[];
  journalEntries: any[];
  summary: {
    totalMoods: number;
    totalGratitudeEntries: number;
    totalJournalEntries: number;
    recentMoodCount: number;
    averageMoodIntensity: number;
  };
}

interface WaterData {
  waterLogs: any[];
  dailyTotals: { [key: string]: number };
  summary: {
    totalLogs: number;
    totalIntakeMl: number;
    totalIntakeL: number;
    averageDailyIntakeMl: number;
    averageDailyIntakeL: number;
    todayIntakeMl: number;
    todayIntakeL: number;
    uniqueDays: number;
    recentLogsCount: number;
  };
}

interface NutritionData {
  mealLogs: any[];
  dailyMeals: { [key: string]: any[] };
  dailyTotals: { [key: string]: any };
  summary: {
    totalMeals: number;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFats: number;
    averageDailyCalories: number;
    todayCalories: number;
    todayProtein: number;
    todayCarbs: number;
    todayFats: number;
    todayMealCount: number;
    uniqueDays: number;
    recentMealsCount: number;
  };
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [financeData, setFinanceData] = useState<FinanceData | null>(null);
  const [wellsphereData, setWellsphereData] = useState<WellsphereData | null>(null);
  const [moodData, setMoodData] = useState<MoodData | null>(null);
  const [waterData, setWaterData] = useState<WaterData | null>(null);
  const [nutritionData, setNutritionData] = useState<NutritionData | null>(null);
  const [loadingFinance, setLoadingFinance] = useState(false);
  const [loadingWellsphere, setLoadingWellsphere] = useState(false);
  const [loadingMood, setLoadingMood] = useState(false);
  const [loadingWater, setLoadingWater] = useState(false);
  const [loadingNutrition, setLoadingNutrition] = useState(false);
  const [mindfulnessData, setMindfulnessData] = useState<any | null>(null);
  const [fitnessData, setFitnessData] = useState<any | null>(null);
  const [onboardingData, setOnboardingData] = useState<any | null>(null);
  const [loadingMindfulness, setLoadingMindfulness] = useState(false);
  const [loadingFitness, setLoadingFitness] = useState(false);
  const [loadingOnboarding, setLoadingOnboarding] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastDocId, setLastDocId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<DataModelView>('analytics');

  const fetchUsers = async (reset = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append('limit', '50');
      if (!reset && lastDocId) {
        params.append('lastDocId', lastDocId);
      }
      
      const response = await fetch(`/api/users?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      
      const data: UsersResponse = await response.json();
      
      if (reset) {
        setUsers(data.users);
      } else {
        setUsers(prev => [...prev, ...data.users]);
      }
      
      setHasMore(data.hasMore);
      setLastDocId(data.lastDocId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFinanceData = async (userId: string) => {
    try {
      setLoadingFinance(true);
      const response = await fetch(`/api/users/${userId}/finance`);
      if (!response.ok) throw new Error('Failed to fetch finance data');
      const data = await response.json();
      setFinanceData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingFinance(false);
    }
  };

  const fetchWellsphereData = async (userId: string) => {
    try {
      setLoadingWellsphere(true);
      const response = await fetch(`/api/users/${userId}/wellsphere`);
      if (!response.ok) throw new Error('Failed to fetch wellsphere data');
      const data = await response.json();
      setWellsphereData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingWellsphere(false);
    }
  };

  const fetchMoodData = async (userId: string) => {
    try {
      setLoadingMood(true);
      const response = await fetch(`/api/users/${userId}/mood`);
      if (!response.ok) throw new Error('Failed to fetch mood data');
      const data = await response.json();
      setMoodData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingMood(false);
    }
  };

  const fetchWaterData = async (userId: string) => {
    try {
      setLoadingWater(true);
      const response = await fetch(`/api/users/${userId}/water`);
      if (!response.ok) throw new Error('Failed to fetch water data');
      const data = await response.json();
      setWaterData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingWater(false);
    }
  };

  const fetchNutritionData = async (userId: string) => {
    try {
      setLoadingNutrition(true);
      const response = await fetch(`/api/users/${userId}/nutrition`);
      if (!response.ok) throw new Error('Failed to fetch nutrition data');
      const data = await response.json();
      setNutritionData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingNutrition(false);
    }
  };

  const fetchMindfulnessData = async (userId: string) => {
    try {
      setLoadingMindfulness(true);
      const response = await fetch(`/api/users/${userId}/mindfulness`);
      if (!response.ok) throw new Error('Failed to fetch mindfulness data');
      const data = await response.json();
      setMindfulnessData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingMindfulness(false);
    }
  };

  const fetchFitnessData = async (userId: string) => {
    try {
      setLoadingFitness(true);
      const response = await fetch(`/api/users/${userId}/fitness`);
      if (!response.ok) throw new Error('Failed to fetch fitness data');
      const data = await response.json();
      setFitnessData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingFitness(false);
    }
  };

  const fetchOnboardingData = async (userId: string) => {
    try {
      setLoadingOnboarding(true);
      const response = await fetch(`/api/users/${userId}/onboarding`);
      if (!response.ok) throw new Error('Failed to fetch onboarding data');
      const data = await response.json();
      setOnboardingData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingOnboarding(false);
    }
  };

  const handleViewChange = (view: DataModelView) => {
    setCurrentView(view);
    // Clear selected user when switching to analytics view
    if (view === 'analytics') {
      setSelectedUser(null);
    }
    // Clear data when switching views
    if (view !== 'finance') setFinanceData(null);
    if (view !== 'wellsphere') setWellsphereData(null);
    if (view !== 'mood') setMoodData(null);
    if (view !== 'water') setWaterData(null);
    if (view !== 'nutrition') setNutritionData(null);
    if (view !== 'mindfulness') setMindfulnessData(null);
    if (view !== 'fitness') setFitnessData(null);
    if (view !== 'onboarding') setOnboardingData(null);
  };

  useEffect(() => {
    fetchUsers(true);
  }, []);

  useEffect(() => {
    if (selectedUser) {
      if (currentView === 'finance') {
        fetchFinanceData(selectedUser.id);
      } else if (currentView === 'wellsphere') {
        fetchWellsphereData(selectedUser.id);
      } else if (currentView === 'mood') {
        fetchMoodData(selectedUser.id);
      } else if (currentView === 'water') {
        fetchWaterData(selectedUser.id);
      } else if (currentView === 'nutrition') {
        fetchNutritionData(selectedUser.id);
      } else if (currentView === 'mindfulness') {
        fetchMindfulnessData(selectedUser.id);
      } else if (currentView === 'fitness') {
        fetchFitnessData(selectedUser.id);
      } else if (currentView === 'onboarding') {
        fetchOnboardingData(selectedUser.id);
      } else if (currentView === 'goals') {
        // Goals are part of finance data
        fetchFinanceData(selectedUser.id);
      }
    }
  }, [selectedUser, currentView]);

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.firstname?.toLowerCase().includes(query) ||
      user.lastname?.toLowerCase().includes(query) ||
      user.username?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDisplayName = (user: User) => {
    if (user.firstname || user.lastname) {
      return `${user.firstname || ''} ${user.lastname || ''}`.trim();
    }
    return user.username || user.email || 'Unknown User';
  };

  return (
    <main className="min-h-screen relative">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-light-green/10">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 flex items-center justify-center transform hover:scale-105 transition-transform">
              <img 
                src="/logo.png" 
                alt="Iki Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 rounded-full bg-iki-grey/50 border border-light-green/20 hover:bg-iki-grey/70 transition-colors flex items-center gap-2 body-sm text-iki-white/80 font-tsukimi hover:border-light-green/40"
            >
              <Home className="w-4 h-4" />
              Dashboard
            </Link>
            <Link
              href="/generate"
              className="px-4 py-2 rounded-full bg-iki-grey/50 border border-light-green/20 hover:bg-iki-grey/70 transition-colors flex items-center gap-2 body-sm text-iki-white/80 font-tsukimi hover:border-light-green/40"
            >
              <Sparkles className="w-4 h-4" />
              Content Gen
            </Link>
            <Link
              href="/users"
              className="px-4 py-2 rounded-full bg-iki-grey/50 border border-light-green/20 hover:bg-iki-grey/70 transition-colors flex items-center gap-2 body-sm text-iki-white/80 font-tsukimi hover:border-light-green/40"
            >
              <Users className="w-4 h-4" />
              Users
            </Link>
            <ProfileDropdown />
            <div className="px-4 py-2 rounded-full bg-iki-grey/50 border border-light-green/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-light-green animate-pulse"></div>
                <span className="body-sm text-iki-white/60 font-tsukimi">Admin Mode</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10 relative z-10">
        {/* Navigation Bar */}
        <AdminNavbar currentView={currentView} onViewChange={handleViewChange} />
        
        {/* Analytics Dashboard View */}
        {currentView === 'analytics' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="heading-lg font-goldplay text-iki-white mb-2">Analytics Dashboard</h2>
                <p className="body-md text-iki-white/60 font-tsukimi">Aggregated user data and insights</p>
              </div>
            </div>
            <AnalyticsDashboard key="analytics-dashboard" />
          </div>
        )}

        {/* Points Management View */}
        {currentView === 'points' && (
          <div className="space-y-6">
            <PointsManagement />
          </div>
        )}

        {/* Connect Posts View */}
        {currentView === 'connect' && (
          <div className="space-y-6">
            <ConnectPosts />
          </div>
        )}

        {/* Explore Videos View */}
        {currentView === 'explore' && (
          <div className="space-y-6">
            <ExploreVideos />
          </div>
        )}

        {/* User Data Views */}
        {currentView !== 'analytics' && currentView !== 'points' && currentView !== 'connect' && currentView !== 'explore' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Users List */}
            <div className="lg:col-span-1">
            <div className="glass rounded-3xl p-6 border border-light-green/10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="heading-md font-goldplay text-iki-white">Users</h2>
                <div className="body-sm text-iki-white/60 font-tsukimi">
                  {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-iki-white/40" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white placeholder-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/50"
                />
              </div>

              {/* Users List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8 text-iki-white/60">Loading users...</div>
                ) : error ? (
                  <div className="text-center py-8 text-red-400">{error}</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-iki-white/60">No users found</div>
                ) : (
                  filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className={`w-full text-left p-4 rounded-xl transition-all ${
                        selectedUser?.id === user.id
                          ? 'bg-light-green/20 border-2 border-light-green/50'
                          : 'bg-iki-grey/20 border border-light-green/10 hover:bg-iki-grey/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {user.photoUrl ? (
                          <img
                            src={user.photoUrl}
                            alt={getDisplayName(user)}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-light-green/20 flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-light-green" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-iki-white truncate">
                            {getDisplayName(user)}
                          </div>
                          <div className="text-xs text-iki-white/60 truncate">
                            {user.email || user.username}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {hasMore && (
                <button
                  onClick={() => fetchUsers(false)}
                  className="w-full mt-4 px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white/80 hover:bg-iki-grey/40 transition-colors"
                >
                  Load More
                </button>
              )}
            </div>
          </div>

          {/* Data View */}
          <div className="lg:col-span-2">
            {selectedUser ? (
              <div className="space-y-6">
                {/* User Info Header */}
                <div className="glass rounded-3xl p-6 border border-light-green/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {selectedUser.photoUrl ? (
                        <img
                          src={selectedUser.photoUrl}
                          alt={getDisplayName(selectedUser)}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-light-green/20 flex items-center justify-center">
                          <UserIcon className="w-8 h-8 text-light-green" />
                        </div>
                      )}
                      <div>
                        <h2 className="heading-md font-goldplay text-iki-white">
                          {getDisplayName(selectedUser)}
                        </h2>
                        <div className="flex items-center gap-4 mt-1 body-sm text-iki-white/60 font-tsukimi">
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {selectedUser.email}
                          </div>
                          {selectedUser.signedUpAt && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              Joined {formatDate(selectedUser.signedUpAt)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedUser(null);
                        setFinanceData(null);
                        setWellsphereData(null);
                        setMoodData(null);
                        setWaterData(null);
                        setNutritionData(null);
                        setMindfulnessData(null);
                        setFitnessData(null);
                        setOnboardingData(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white/80 hover:bg-iki-grey/40 transition-colors flex items-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                  </div>
                </div>

                {/* Finance View */}
                {currentView === 'finance' && (
                  <>
                    {loadingFinance ? (
                      <div className="glass rounded-3xl p-6 border border-light-green/10 text-center text-iki-white/60">
                        Loading finance data...
                      </div>
                    ) : financeData ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="glass rounded-2xl p-4 border border-light-green/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-iki-white/60">Total Income</span>
                          <TrendingUp className="w-4 h-4 text-green-400" />
                        </div>
                        <div className="text-2xl font-bold text-iki-white">
                          {formatCurrency(financeData.summary.totalIncome)}
                        </div>
                      </div>
                      <div className="glass rounded-2xl p-4 border border-light-green/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-iki-white/60">Total Expenses</span>
                          <TrendingDown className="w-4 h-4 text-red-400" />
                        </div>
                        <div className="text-2xl font-bold text-iki-white">
                          {formatCurrency(financeData.summary.totalExpenses)}
                        </div>
                      </div>
                      <div className="glass rounded-2xl p-4 border border-light-green/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-iki-white/60">Net Balance</span>
                          <DollarSign className="w-4 h-4 text-light-green" />
                        </div>
                        <div className={`text-2xl font-bold ${
                          financeData.summary.netBalance >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatCurrency(financeData.summary.netBalance)}
                        </div>
                      </div>
                      <div className="glass rounded-2xl p-4 border border-light-green/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-iki-white/60">Total Debt</span>
                          <CreditCard className="w-4 h-4 text-orange-400" />
                        </div>
                        <div className="text-2xl font-bold text-iki-white">
                          {formatCurrency(financeData.summary.totalDebt)}
                        </div>
                      </div>
                    </div>

                    {/* Budgets */}
                    <div className="glass rounded-3xl p-6 border border-light-green/10">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-iki-white flex items-center gap-2">
                          <DollarSign className="w-5 h-5" />
                          Budgets ({financeData.budgets.length})
                        </h3>
                      </div>
                      {financeData.budgets.length === 0 ? (
                        <div className="text-center py-8 text-iki-white/60">No budgets found</div>
                      ) : (
                        <div className="space-y-4">
                          {financeData.budgets.map((budget) => (
                            <div key={budget.id} className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <div className="font-semibold text-iki-white">
                                    Budget #{budget.id.slice(0, 8)}
                                  </div>
                                  <div className="text-xs text-iki-white/60">
                                    Start Day: {budget.startDay} | Created: {formatDate(budget.createdAt)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm text-iki-white/60">Income</div>
                                  <div className="font-bold text-green-400">{formatCurrency(budget.totalIncome)}</div>
                                </div>
                              </div>
                              
                              {/* Incomes */}
                              {budget.incomes.length > 0 && (
                                <div className="mb-3">
                                  <div className="text-xs font-semibold text-iki-white/60 mb-2">INCOMES</div>
                                  <div className="space-y-1">
                                    {budget.incomes.map((income: any, idx: number) => (
                                      <div key={idx} className="flex items-center justify-between text-sm bg-iki-grey/10 rounded-lg p-2">
                                        <div>
                                          <div className="text-iki-white">{income.description || 'Income'}</div>
                                          <div className="text-xs text-iki-white/60">{formatDate(income.addedAt)}</div>
                                        </div>
                                        <div className="font-semibold text-green-400">{formatCurrency(income.amount || 0)}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Categories */}
                              {budget.categories.length > 0 && (
                                <div className="mb-3">
                                  <div className="text-xs font-semibold text-iki-white/60 mb-2">CATEGORIES</div>
                                  <div className="space-y-1">
                                    {budget.categories.map((category: any) => (
                                      <div key={category.id} className="flex items-center justify-between text-sm bg-iki-grey/10 rounded-lg p-2">
                                        <div className="text-iki-white">{category.name}</div>
                                        <div className="flex items-center gap-3">
                                          <span className="text-iki-white/60">
                                            {formatCurrency(category.spent || 0)} / {formatCurrency(category.limit || 0)}
                                          </span>
                                          <div className={`w-16 h-2 rounded-full bg-iki-grey/30 overflow-hidden`}>
                                            <div 
                                              className={`h-full ${
                                                (category.spent || 0) > (category.limit || 0) ? 'bg-red-400' : 'bg-light-green'
                                              }`}
                                              style={{ 
                                                width: `${Math.min(100, ((category.limit || 0) > 0 ? (category.spent || 0) / (category.limit || 0) : 0) * 100)}%` 
                                              }}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Expenses */}
                              {budget.expenses.length > 0 && (
                                <div>
                                  <div className="text-xs font-semibold text-iki-white/60 mb-2">
                                    RECENT EXPENSES ({budget.expenses.length})
                                  </div>
                                  <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {budget.expenses.slice(0, 5).map((expense: any) => (
                                      <div key={expense.id} className="flex items-center justify-between text-sm bg-iki-grey/10 rounded-lg p-2">
                                        <div>
                                          <div className="text-iki-white">{expense.description || expense.businessName}</div>
                                          <div className="text-xs text-iki-white/60">
                                            {expense.category} • {formatDate(expense.date)}
                                          </div>
                                        </div>
                                        <div className="font-semibold text-red-400">{formatCurrency(expense.amount || 0)}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Debts */}
                    <div className="glass rounded-3xl p-6 border border-light-green/10">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-iki-white flex items-center gap-2">
                          <CreditCard className="w-5 h-5" />
                          Debts ({financeData.debts.length})
                        </h3>
                      </div>
                      {financeData.debts.length === 0 ? (
                        <div className="text-center py-8 text-iki-white/60">No debts found</div>
                      ) : (
                        <div className="space-y-4">
                          {financeData.debts.map((debt) => (
                            <div key={debt.id} className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <div className="font-semibold text-iki-white">{debt.lenderName}</div>
                                  <div className="text-xs text-iki-white/60">
                                    Due: {formatDate(debt.dueDate)} | {debt.repaymentPeriod} months
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm text-iki-white/60">Remaining</div>
                                  <div className="font-bold text-orange-400">
                                    {formatCurrency(debt.loanAmount - debt.paidAmount)}
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-iki-white/60">Loan Amount:</span>
                                  <span className="text-iki-white ml-2">{formatCurrency(debt.loanAmount)}</span>
                                </div>
                                <div>
                                  <span className="text-iki-white/60">Paid:</span>
                                  <span className="text-green-400 ml-2">{formatCurrency(debt.paidAmount)}</span>
                                </div>
                                <div>
                                  <span className="text-iki-white/60">Monthly:</span>
                                  <span className="text-iki-white ml-2">{formatCurrency(debt.monthlyInstallment)}</span>
                                </div>
                                <div>
                                  <span className="text-iki-white/60">Interest:</span>
                                  <span className="text-iki-white ml-2">{formatCurrency(debt.totalInterest)}</span>
                                </div>
                              </div>
                              {debt.payments.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-light-green/10">
                                  <div className="text-xs font-semibold text-iki-white/60 mb-2">
                                    PAYMENTS ({debt.payments.length})
                                  </div>
                                  <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {debt.payments.slice(0, 3).map((payment: any) => (
                                      <div key={payment.id} className="flex items-center justify-between text-sm bg-iki-grey/10 rounded-lg p-2">
                                        <div>
                                          <div className="text-iki-white">{payment.description || 'Payment'}</div>
                                          <div className="text-xs text-iki-white/60">{formatDate(payment.paidAt)}</div>
                                        </div>
                                        <div className="font-semibold text-green-400">{formatCurrency(payment.amount || 0)}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Goals */}
                    <div className="glass rounded-3xl p-6 border border-light-green/10">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-iki-white flex items-center gap-2">
                          <Target className="w-5 h-5" />
                          Goals ({financeData.goals.length})
                        </h3>
                      </div>
                      {financeData.goals.length === 0 ? (
                        <div className="text-center py-8 text-iki-white/60">No goals found</div>
                      ) : (
                        <div className="space-y-4">
                          {financeData.goals.map((goal) => (
                            <div key={goal.id} className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <div className="font-semibold text-iki-white">{goal.name}</div>
                                  <div className="text-xs text-iki-white/60">
                                    Deadline: {formatDate(goal.deadline)} | Streak: {goal.streak} days
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm text-iki-white/60">Progress</div>
                                  <div className="font-bold text-light-green">
                                    {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                                  </div>
                                </div>
                              </div>
                              <div className="mb-3">
                                <div className="w-full h-3 rounded-full bg-iki-grey/30 overflow-hidden">
                                  <div 
                                    className="h-full bg-light-green transition-all"
                                    style={{ width: `${Math.min(100, goal.progress || 0)}%` }}
                                  />
                                </div>
                                <div className="text-xs text-iki-white/60 mt-1 text-right">
                                  {goal.progress?.toFixed(1) || 0}%
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-iki-white/60">Monthly Contribution:</span>
                                  <span className="text-iki-white ml-2">{formatCurrency(goal.monthlyContribution)}</span>
                                </div>
                                <div>
                                  <span className="text-iki-white/60">Last Contribution:</span>
                                  <span className="text-iki-white ml-2">{formatDate(goal.lastContributionDate)}</span>
                                </div>
                              </div>
                              {goal.contributions.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-light-green/10">
                                  <div className="text-xs font-semibold text-iki-white/60 mb-2">
                                    CONTRIBUTIONS ({goal.contributions.length})
                                  </div>
                                  <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {goal.contributions.slice(0, 3).map((contribution: any) => (
                                      <div key={contribution.id} className="flex items-center justify-between text-sm bg-iki-grey/10 rounded-lg p-2">
                                        <div>
                                          <div className="text-iki-white">{contribution.description || 'Contribution'}</div>
                                          <div className="text-xs text-iki-white/60">{formatDate(contribution.contributedAt)}</div>
                                        </div>
                                        <div className="font-semibold text-green-400">{formatCurrency(contribution.amount || 0)}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="glass rounded-3xl p-6 border border-light-green/10 text-center text-iki-white/60">
                    No finance data available
                  </div>
                )}
                  </>
                )}

                {/* Wellsphere View */}
                {currentView === 'wellsphere' && (
                  <>
                    {loadingWellsphere ? (
                      <div className="glass rounded-3xl p-6 border border-light-green/10 text-center text-iki-white/60">
                        Loading wellsphere data...
                      </div>
                    ) : wellsphereData ? (
                      <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Onboarding</span>
                              {wellsphereData.summary.onboardingComplete ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              )}
                            </div>
                            <div className="text-2xl font-bold text-iki-white">
                              {wellsphereData.summary.onboardingComplete ? 'Complete' : 'Incomplete'}
                            </div>
                          </div>
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Condition</span>
                              <Heart className="w-4 h-4 text-red-400" />
                            </div>
                            <div className="text-2xl font-bold text-iki-white truncate">
                              {wellsphereData.summary.hasCondition ? (wellsphereData.condition || 'Yes') : 'None'}
                            </div>
                          </div>
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Drugs</span>
                              <Pill className="w-4 h-4 text-blue-400" />
                            </div>
                            <div className="text-2xl font-bold text-iki-white">
                              {wellsphereData.summary.totalDrugs}
                            </div>
                          </div>
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Symptoms</span>
                              <Heart className="w-4 h-4 text-purple-400" />
                            </div>
                            <div className="text-2xl font-bold text-iki-white">
                              {wellsphereData.summary.totalSymptoms}
                            </div>
                          </div>
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Check-Ins</span>
                              <CheckCircle className="w-4 h-4 text-light-green" />
                            </div>
                            <div className="text-2xl font-bold text-iki-white">
                              {wellsphereData.summary.totalDailyCheckIns || 0}
                            </div>
                          </div>
                        </div>

                        {/* Condition Data */}
                        {wellsphereData.condition && (
                          <div className="glass rounded-3xl p-6 border border-light-green/10">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-xl font-bold text-iki-white flex items-center gap-2">
                                <Heart className="w-5 h-5" />
                                Condition: {wellsphereData.condition}
                              </h3>
                            </div>
                            {wellsphereData.conditionData && (
                              <div className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                                <div className="space-y-3 text-sm">
                                  {wellsphereData.conditionData.condition_description && (
                                    <div>
                                      <div className="text-xs font-semibold text-iki-white/60 mb-1">Description</div>
                                      <div className="text-iki-white">{wellsphereData.conditionData.condition_description}</div>
                                    </div>
                                  )}
                                  {wellsphereData.conditionData.severity_level && (
                                    <div>
                                      <div className="text-xs font-semibold text-iki-white/60 mb-1">Severity</div>
                                      <div className="text-iki-white">{wellsphereData.conditionData.severity_level}</div>
                                    </div>
                                  )}
                                  {wellsphereData.conditionData.common_symptoms && wellsphereData.conditionData.common_symptoms.length > 0 && (
                                    <div>
                                      <div className="text-xs font-semibold text-iki-white/60 mb-1">Common Symptoms</div>
                                      <div className="flex flex-wrap gap-2">
                                        {wellsphereData.conditionData.common_symptoms.map((symptom: string, idx: number) => (
                                          <span key={idx} className="px-2 py-1 bg-iki-grey/30 rounded-lg text-iki-white text-xs">
                                            {symptom}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Onboarding Data */}
                        {wellsphereData.onboardingData && (
                          <OnboardingSummary
                            wellsphereOnboarding={wellsphereData.onboardingData}
                          />
                        )}

                        {/* Drugs */}
                        <div className="glass rounded-3xl p-6 border border-light-green/10">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-iki-white flex items-center gap-2">
                              <Pill className="w-5 h-5" />
                              Drugs ({wellsphereData.drugs.length})
                            </h3>
                          </div>
                          {wellsphereData.drugs.length === 0 ? (
                            <div className="text-center py-8 text-iki-white/60">No drugs found</div>
                          ) : (
                            <div className="space-y-4">
                              {wellsphereData.drugs.map((drug) => (
                                <div key={drug.id} className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                                  <div className="flex items-center justify-between mb-3">
                                    <div>
                                      <div className="font-semibold text-iki-white">{drug.drugName}</div>
                                      <div className="text-xs text-iki-white/60">
                                        Strength: {drug.drugStrength} | Dosage: {drug.dosage}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm text-iki-white/60">Times/Day</div>
                                      <div className="font-bold text-blue-400">{drug.timesPerDay}x</div>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                      <span className="text-iki-white/60">Start Date:</span>
                                      <span className="text-iki-white ml-2">{formatDate(drug.startDate)}</span>
                                    </div>
                                    <div>
                                      <span className="text-iki-white/60">End Date:</span>
                                      <span className="text-iki-white ml-2">{formatDate(drug.endDate) || 'Ongoing'}</span>
                                    </div>
                                    {drug.frequency && (
                                      <div>
                                        <span className="text-iki-white/60">Frequency:</span>
                                        <span className="text-iki-white ml-2">{drug.frequency}</span>
                                      </div>
                                    )}
                                    {drug.scheduledTimes && drug.scheduledTimes.length > 0 && (
                                      <div>
                                        <span className="text-iki-white/60">Scheduled:</span>
                                        <span className="text-iki-white ml-2">{drug.scheduledTimes.join(', ')}</span>
                                      </div>
                                    )}
                                  </div>
                                  {drug.notes && (
                                    <div className="mt-3 pt-3 border-t border-light-green/10">
                                      <div className="text-xs font-semibold text-iki-white/60 mb-1">Notes</div>
                                      <div className="text-sm text-iki-white">{drug.notes}</div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Emergency Contacts */}
                        <div className="glass rounded-3xl p-6 border border-light-green/10">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-iki-white flex items-center gap-2">
                              <Phone className="w-5 h-5" />
                              Emergency Contacts ({wellsphereData.emergencyContacts.length})
                            </h3>
                          </div>
                          {wellsphereData.emergencyContacts.length === 0 ? (
                            <div className="text-center py-8 text-iki-white/60">No emergency contacts found</div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {wellsphereData.emergencyContacts.map((contact) => (
                                <div key={contact.id} className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                                  <div className="font-semibold text-iki-white mb-2">{contact.name}</div>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex items-center gap-2">
                                      <Phone className="w-4 h-4 text-iki-white/60" />
                                      <span className="text-iki-white">{contact.phone}</span>
                                    </div>
                                    <div className="text-iki-white/60">Relationship: {contact.relationship}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Medical Info */}
                        {wellsphereData.medicalInfo && (
                          <div className="glass rounded-3xl p-6 border border-light-green/10">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-xl font-bold text-iki-white flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Medical Information
                              </h3>
                            </div>
                            <div className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <div className="text-xs font-semibold text-iki-white/60 mb-2">Blood Type</div>
                                  <div className="text-iki-white">{wellsphereData.medicalInfo.bloodType}</div>
                                </div>
                                {wellsphereData.medicalInfo.conditions && wellsphereData.medicalInfo.conditions.length > 0 && (
                                  <div>
                                    <div className="text-xs font-semibold text-iki-white/60 mb-2">Conditions</div>
                                    <div className="flex flex-wrap gap-2">
                                      {wellsphereData.medicalInfo.conditions.map((condition: string, idx: number) => (
                                        <span key={idx} className="px-2 py-1 bg-red-400/20 rounded-lg text-red-300 text-xs">
                                          {condition}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {wellsphereData.medicalInfo.allergies && wellsphereData.medicalInfo.allergies.length > 0 && (
                                  <div>
                                    <div className="text-xs font-semibold text-iki-white/60 mb-2">Allergies</div>
                                    <div className="flex flex-wrap gap-2">
                                      {wellsphereData.medicalInfo.allergies.map((allergy: string, idx: number) => (
                                        <span key={idx} className="px-2 py-1 bg-orange-400/20 rounded-lg text-orange-300 text-xs">
                                          {allergy}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {wellsphereData.medicalInfo.medications && wellsphereData.medicalInfo.medications.length > 0 && (
                                  <div>
                                    <div className="text-xs font-semibold text-iki-white/60 mb-2">Medications</div>
                                    <div className="flex flex-wrap gap-2">
                                      {wellsphereData.medicalInfo.medications.map((med: string, idx: number) => (
                                        <span key={idx} className="px-2 py-1 bg-blue-400/20 rounded-lg text-blue-300 text-xs">
                                          {med}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Symptoms */}
                        {wellsphereData.symptoms && wellsphereData.symptoms.length > 0 && (
                          <div className="glass rounded-3xl p-6 border border-light-green/10">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-xl font-bold text-iki-white flex items-center gap-2">
                                <Heart className="w-5 h-5" />
                                Recent Symptoms ({wellsphereData.symptoms.length})
                              </h3>
                            </div>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {wellsphereData.symptoms.map((symptom) => (
                                <div key={symptom.id} className="bg-iki-grey/20 rounded-xl p-3 border border-light-green/10">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex-1">
                                      <div className="font-semibold text-iki-white">{symptom.symptom}</div>
                                      <div className="flex items-center gap-4 mt-1">
                                        {symptom.severity && (
                                          <div className="text-xs text-iki-white/60">
                                            Severity: <span className="text-light-green font-semibold">{symptom.severity}/10</span>
                                          </div>
                                        )}
                                        {symptom.tags && symptom.tags.length > 0 && (
                                          <div className="flex gap-1">
                                            {symptom.tags.map((tag: string, idx: number) => (
                                              <span key={idx} className="px-2 py-0.5 bg-iki-grey/30 rounded text-xs text-iki-white/80">
                                                {tag}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      {symptom.notes && (
                                        <div className="text-xs text-iki-white/80 mt-2">{symptom.notes}</div>
                                      )}
                                    </div>
                                    <div className="text-xs text-iki-white/60 ml-4">
                                      {formatDate(symptom.timestamp || symptom.createdAt)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Daily Check-Ins */}
                        {wellsphereData.dailyCheckIns && wellsphereData.dailyCheckIns.length > 0 && (
                          <div className="glass rounded-3xl p-6 border border-light-green/10">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-xl font-bold text-iki-white flex items-center gap-2">
                                <CheckCircle className="w-5 h-5" />
                                Daily Check-Ins ({wellsphereData.dailyCheckIns.length})
                              </h3>
                            </div>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                              {wellsphereData.dailyCheckIns.map((checkIn) => (
                                <div key={checkIn.id} className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="font-semibold text-iki-white">
                                      {formatDate(checkIn.date)}
                                    </div>
                                    <div className="text-xs text-iki-white/60">
                                      {checkIn.date ? new Date(checkIn.date).toLocaleTimeString('en-US', { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      }) : 'N/A'}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                    <div>
                                      <div className="text-xs text-iki-white/60 mb-1">Sleep Quality</div>
                                      <div className="text-iki-white font-semibold">{checkIn.sleepQuality || 'N/A'}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-iki-white/60 mb-1">Energy Level</div>
                                      <div className="text-iki-white font-semibold">
                                        {checkIn.energyLevel !== undefined ? `${checkIn.energyLevel}/10` : 'N/A'}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-iki-white/60 mb-1">Mood</div>
                                      <div className="text-iki-white font-semibold">{checkIn.mood || 'N/A'}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-iki-white/60 mb-1">Pain Level</div>
                                      <div className="text-iki-white font-semibold">
                                        {checkIn.painLevel !== undefined ? `${checkIn.painLevel}/10` : 'N/A'}
                                      </div>
                                    </div>
                                    <div className="md:col-span-2">
                                      <div className="text-xs text-iki-white/60 mb-1">Medication</div>
                                      <div className="text-iki-white font-semibold">{checkIn.medication || 'N/A'}</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="glass rounded-3xl p-6 border border-light-green/10 text-center text-iki-white/60">
                        No wellsphere data available
                      </div>
                    )}
                  </>
                )}

                {/* Other Data Model Views */}
                {currentView === 'users' && (
                  <div className="glass rounded-3xl p-6 border border-light-green/10">
                    <h3 className="text-xl font-bold text-iki-white mb-4">User Profile Data</h3>
                    <div className="space-y-4">
                      <div className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-iki-white/60">Username:</span>
                            <span className="text-iki-white ml-2">{selectedUser.username || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-iki-white/60">Country:</span>
                            <span className="text-iki-white ml-2">{selectedUser.country || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-iki-white/60">Gender:</span>
                            <span className="text-iki-white ml-2">{selectedUser.gender || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-iki-white/60">Age:</span>
                            <span className="text-iki-white ml-2">{selectedUser.age || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-iki-white/60">Activity Level:</span>
                            <span className="text-iki-white ml-2">{selectedUser.activityLevel || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-iki-white/60">Body Weight:</span>
                            <span className="text-iki-white ml-2">{selectedUser.bodyWeightKg ? `${selectedUser.bodyWeightKg} kg` : 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-iki-white/60">Points:</span>
                            <span className="text-iki-white ml-2">{selectedUser.points || 0}</span>
                          </div>
                          <div>
                            <span className="text-iki-white/60">Status:</span>
                            <span className={`ml-2 ${selectedUser.isOnline ? 'text-green-400' : 'text-iki-white/60'}`}>
                              {selectedUser.isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </div>
                        {selectedUser.bio && (
                          <div className="mt-4 pt-4 border-t border-light-green/10">
                            <span className="text-iki-white/60 text-sm">Bio:</span>
                            <p className="text-iki-white mt-1">{selectedUser.bio}</p>
                          </div>
                        )}
                        {selectedUser.healthStats && selectedUser.healthStats.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-light-green/10">
                            <span className="text-iki-white/60 text-sm mb-2 block">Health Stats:</span>
                            <div className="grid grid-cols-2 gap-2">
                              {selectedUser.healthStats.map((stat: any, idx: number) => (
                                <div key={idx} className="bg-iki-grey/10 rounded-lg p-2">
                                  <div className="text-xs text-iki-white/60">{stat.name || stat.id}</div>
                                  <div className="text-iki-white font-semibold">{stat.value || 0}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Mood View */}
                {currentView === 'mood' && (
                  <>
                    {loadingMood ? (
                      <div className="glass rounded-3xl p-6 border border-light-green/10 text-center text-iki-white/60">
                        Loading mood data...
                      </div>
                    ) : moodData ? (
                      <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Mood Entries</span>
                              <Smile className="w-4 h-4 text-purple-400" />
                            </div>
                            <div className="text-2xl font-bold text-iki-white">
                              {moodData.summary.totalMoods}
                            </div>
                          </div>
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Gratitude Entries</span>
                              <Heart className="w-4 h-4 text-pink-400" />
                            </div>
                            <div className="text-2xl font-bold text-iki-white">
                              {moodData.summary.totalGratitudeEntries}
                            </div>
                          </div>
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Journal Entries</span>
                              <BookOpen className="w-4 h-4 text-blue-400" />
                            </div>
                            <div className="text-2xl font-bold text-iki-white">
                              {moodData.summary.totalJournalEntries}
                            </div>
                          </div>
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Avg Intensity</span>
                              <TrendingUp className="w-4 h-4 text-green-400" />
                            </div>
                            <div className="text-2xl font-bold text-iki-white">
                              {moodData.summary.averageMoodIntensity.toFixed(1)}
                            </div>
                          </div>
                        </div>

                        {/* Mood Entries */}
                        <div className="glass rounded-3xl p-6 border border-light-green/10">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-iki-white flex items-center gap-2">
                              <Smile className="w-5 h-5" />
                              Mood Entries ({moodData.moods.length})
                            </h3>
                          </div>
                          {moodData.moods.length === 0 ? (
                            <div className="text-center py-8 text-iki-white/60">No mood entries found</div>
                          ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {moodData.moods.slice(0, 50).map((mood) => (
                                <div key={mood.id} className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="text-3xl">{mood.moodEmoji}</div>
                                      <div>
                                        <div className="font-semibold text-iki-white">
                                          Intensity: {mood.intensity}/10
                                        </div>
                                        <div className="text-xs text-iki-white/60">
                                          Valence: {mood.valence > 0 ? 'Positive' : mood.valence < 0 ? 'Negative' : 'Neutral'} • 
                                          Index: {mood.scaledMoodIndex?.toFixed(1)}
                                        </div>
                                        {mood.notes && (
                                          <div className="text-sm text-iki-white/80 mt-1">{mood.notes}</div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-xs text-iki-white/60">
                                      {formatDate(mood.createdAt || mood.timestamp)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Gratitude Entries */}
                        <div className="glass rounded-3xl p-6 border border-light-green/10">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-iki-white flex items-center gap-2">
                              <Heart className="w-5 h-5" />
                              Gratitude Entries ({moodData.gratitudeEntries.length})
                            </h3>
                          </div>
                          {moodData.gratitudeEntries.length === 0 ? (
                            <div className="text-center py-8 text-iki-white/60">No gratitude entries found</div>
                          ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {moodData.gratitudeEntries.slice(0, 50).map((entry, idx) => (
                                <div key={entry.id || idx} className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="text-iki-white">{entry.text}</div>
                                    </div>
                                    <div className="text-xs text-iki-white/60 ml-4">
                                      {formatDate(entry.timestamp)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Journal Entries */}
                        <div className="glass rounded-3xl p-6 border border-light-green/10">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-iki-white flex items-center gap-2">
                              <BookOpen className="w-5 h-5" />
                              Journal Entries ({moodData.journalEntries.length})
                            </h3>
                          </div>
                          {moodData.journalEntries.length === 0 ? (
                            <div className="text-center py-8 text-iki-white/60">No journal entries found</div>
                          ) : (
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                              {moodData.journalEntries.slice(0, 30).map((entry) => (
                                <div key={entry.id} className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="font-semibold text-iki-white">{entry.title || 'Untitled'}</div>
                                    <div className="text-xs text-iki-white/60">
                                      {formatDate(entry.createdAt)}
                                    </div>
                                  </div>
                                  <div className="text-sm text-iki-white/80 mb-2 line-clamp-3">
                                    {entry.content}
                                  </div>
                                  {entry.mood && (
                                    <div className="text-xs text-iki-white/60">Mood: {entry.mood}</div>
                                  )}
                                  {entry.tags && entry.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {entry.tags.map((tag: string, idx: number) => (
                                        <span key={idx} className="px-2 py-1 bg-iki-grey/30 rounded-lg text-iki-white text-xs">
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="glass rounded-3xl p-6 border border-light-green/10 text-center text-iki-white/60">
                        No mood data available
                      </div>
                    )}
                  </>
                )}

                {/* Water View */}
                {currentView === 'water' && (
                  <>
                    {loadingWater ? (
                      <div className="glass rounded-3xl p-6 border border-light-green/10 text-center text-iki-white/60">
                        Loading water data...
                      </div>
                    ) : waterData ? (
                      <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Total Logs</span>
                              <Droplet className="w-4 h-4 text-blue-400" />
                            </div>
                            <div className="text-2xl font-bold text-iki-white">
                              {waterData.summary.totalLogs}
                            </div>
                          </div>
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Today's Intake</span>
                              <TrendingUp className="w-4 h-4 text-green-400" />
                            </div>
                            <div className="text-2xl font-bold text-iki-white">
                              {waterData.summary.todayIntakeL.toFixed(1)} L
                            </div>
                          </div>
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Avg Daily</span>
                              <Target className="w-4 h-4 text-light-green" />
                            </div>
                            <div className="text-2xl font-bold text-iki-white">
                              {waterData.summary.averageDailyIntakeL.toFixed(1)} L
                            </div>
                          </div>
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Total Intake</span>
                              <Droplet className="w-4 h-4 text-cyan-400" />
                            </div>
                            <div className="text-2xl font-bold text-iki-white">
                              {waterData.summary.totalIntakeL.toFixed(1)} L
                            </div>
                          </div>
                        </div>

                        {/* Recent Water Logs */}
                        <div className="glass rounded-3xl p-6 border border-light-green/10">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-iki-white flex items-center gap-2">
                              <Droplet className="w-5 h-5" />
                              Recent Water Logs ({waterData.waterLogs.length})
                            </h3>
                          </div>
                          {waterData.waterLogs.length === 0 ? (
                            <div className="text-center py-8 text-iki-white/60">No water logs found</div>
                          ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {waterData.waterLogs.slice(0, 100).map((log) => (
                                <div key={log.id} className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <Droplet className="w-5 h-5 text-blue-400" />
                                      <div>
                                        <div className="font-semibold text-iki-white">
                                          {(log.amountMl / 1000).toFixed(2)} L
                                        </div>
                                        <div className="text-xs text-iki-white/60">
                                          {log.amountMl} ml
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-iki-white/60">
                                        {formatDate(log.timestamp)}
                                      </div>
                                      {log.activityLevel && (
                                        <div className="text-xs text-iki-white/60 mt-1">
                                          Activity: {log.activityLevel}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Daily Totals */}
                        <div className="glass rounded-3xl p-6 border border-light-green/10">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-iki-white flex items-center gap-2">
                              <Calendar className="w-5 h-5" />
                              Daily Totals ({Object.keys(waterData.dailyTotals).length} days)
                            </h3>
                          </div>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {Object.entries(waterData.dailyTotals)
                              .sort(([a], [b]) => b.localeCompare(a))
                              .slice(0, 30)
                              .map(([date, total]) => (
                                <div key={date} className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                                  <div className="flex items-center justify-between">
                                    <div className="font-semibold text-iki-white">{formatDate(date)}</div>
                                    <div className="text-lg font-bold text-blue-400">
                                      {(total / 1000).toFixed(2)} L
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="glass rounded-3xl p-6 border border-light-green/10 text-center text-iki-white/60">
                        No water data available
                      </div>
                    )}
                  </>
                )}

                {/* Nutrition View */}
                {currentView === 'nutrition' && (
                  <>
                    {loadingNutrition ? (
                      <div className="glass rounded-3xl p-6 border border-light-green/10 text-center text-iki-white/60">
                        Loading nutrition data...
                      </div>
                    ) : nutritionData ? (
                      <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Total Meals</span>
                              <Apple className="w-4 h-4 text-green-400" />
                            </div>
                            <div className="text-2xl font-bold text-iki-white">
                              {nutritionData.summary.totalMeals}
                            </div>
                          </div>
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Today's Calories</span>
                              <TrendingUp className="w-4 h-4 text-orange-400" />
                            </div>
                            <div className="text-2xl font-bold text-iki-white">
                              {nutritionData.summary.todayCalories.toFixed(0)}
                            </div>
                          </div>
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Avg Daily</span>
                              <Target className="w-4 h-4 text-light-green" />
                            </div>
                            <div className="text-2xl font-bold text-iki-white">
                              {nutritionData.summary.averageDailyCalories.toFixed(0)}
                            </div>
                          </div>
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Total Calories</span>
                              <Apple className="w-4 h-4 text-red-400" />
                            </div>
                            <div className="text-2xl font-bold text-iki-white">
                              {nutritionData.summary.totalCalories.toFixed(0)}
                            </div>
                          </div>
                        </div>

                        {/* Today's Macros */}
                        <div className="glass rounded-3xl p-6 border border-light-green/10">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-iki-white flex items-center gap-2">
                              <Target className="w-5 h-5" />
                              Today's Nutrition
                            </h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                              <div className="text-sm text-iki-white/60 mb-1">Calories</div>
                              <div className="text-2xl font-bold text-orange-400">
                                {nutritionData.summary.todayCalories.toFixed(0)}
                              </div>
                            </div>
                            <div className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                              <div className="text-sm text-iki-white/60 mb-1">Protein</div>
                              <div className="text-2xl font-bold text-red-400">
                                {nutritionData.summary.todayProtein.toFixed(1)}g
                              </div>
                            </div>
                            <div className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                              <div className="text-sm text-iki-white/60 mb-1">Carbs</div>
                              <div className="text-2xl font-bold text-yellow-400">
                                {nutritionData.summary.todayCarbs.toFixed(1)}g
                              </div>
                            </div>
                            <div className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                              <div className="text-sm text-iki-white/60 mb-1">Fats</div>
                              <div className="text-2xl font-bold text-blue-400">
                                {nutritionData.summary.todayFats.toFixed(1)}g
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Recent Meal Logs */}
                        <div className="glass rounded-3xl p-6 border border-light-green/10">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-iki-white flex items-center gap-2">
                              <Apple className="w-5 h-5" />
                              Recent Meal Logs ({nutritionData.mealLogs.length})
                            </h3>
                          </div>
                          {nutritionData.mealLogs.length === 0 ? (
                            <div className="text-center py-8 text-iki-white/60">No meal logs found</div>
                          ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                              {nutritionData.mealLogs.slice(0, 50).map((meal) => (
                                <div key={meal.id} className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        {meal.imageUrl && (
                                          <img
                                            src={meal.imageUrl}
                                            alt={meal.name}
                                            className="w-16 h-16 rounded-lg object-cover"
                                          />
                                        )}
                                        <div className="flex-1">
                                          <div className="font-semibold text-iki-white">{meal.name}</div>
                                          <div className="text-xs text-iki-white/60 mt-1">
                                            {formatDate(meal.timestamp)} • {meal.mealType || 'Meal'}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-4 text-sm">
                                        <span className="text-orange-400">
                                          {meal.calories.toFixed(0)} cal
                                        </span>
                                        <span className="text-red-400">
                                          P: {meal.protein.toFixed(1)}g
                                        </span>
                                        <span className="text-yellow-400">
                                          C: {meal.carbs.toFixed(1)}g
                                        </span>
                                        <span className="text-blue-400">
                                          F: {meal.fats.toFixed(1)}g
                                        </span>
                                      </div>
                                      {meal.notes && (
                                        <div className="text-sm text-iki-white/80 mt-2">{meal.notes}</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Daily Totals */}
                        <div className="glass rounded-3xl p-6 border border-light-green/10">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-iki-white flex items-center gap-2">
                              <Calendar className="w-5 h-5" />
                              Daily Totals ({Object.keys(nutritionData.dailyTotals).length} days)
                            </h3>
                          </div>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {Object.entries(nutritionData.dailyTotals)
                              .sort(([a], [b]) => b.localeCompare(a))
                              .slice(0, 30)
                              .map(([date, totals]) => (
                                <div key={date} className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="font-semibold text-iki-white">{formatDate(date)}</div>
                                    <div className="text-sm text-iki-white/60">
                                      {totals.mealCount} meals
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-4 gap-2 text-sm">
                                    <div>
                                      <span className="text-iki-white/60">Cal:</span>
                                      <span className="text-orange-400 ml-1">{totals.totalCalories.toFixed(0)}</span>
                                    </div>
                                    <div>
                                      <span className="text-iki-white/60">P:</span>
                                      <span className="text-red-400 ml-1">{totals.totalProtein.toFixed(1)}g</span>
                                    </div>
                                    <div>
                                      <span className="text-iki-white/60">C:</span>
                                      <span className="text-yellow-400 ml-1">{totals.totalCarbs.toFixed(1)}g</span>
                                    </div>
                                    <div>
                                      <span className="text-iki-white/60">F:</span>
                                      <span className="text-blue-400 ml-1">{totals.totalFats.toFixed(1)}g</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="glass rounded-3xl p-6 border border-light-green/10 text-center text-iki-white/60">
                        No nutrition data available
                      </div>
                    )}
                  </>
                )}

                {/* Mindfulness View */}
                {currentView === 'mindfulness' && (
                  <>
                    {loadingMindfulness ? (
                      <div className="glass rounded-3xl p-6 border border-light-green/10 text-center text-iki-white/60">
                        Loading mindfulness data...
                      </div>
                    ) : mindfulnessData ? (
                      <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Total Sessions</span>
                              <Brain className="w-4 h-4 text-purple-400" />
                            </div>
                            <div className="text-2xl font-bold text-iki-white">
                              {mindfulnessData.summary.totalSessions}
                            </div>
                          </div>
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Total Minutes</span>
                              <TrendingUp className="w-4 h-4 text-green-400" />
                            </div>
                            <div className="text-2xl font-bold text-iki-white">
                              {mindfulnessData.summary.totalMinutes}
                            </div>
                          </div>
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Current Streak</span>
                              <Target className="w-4 h-4 text-light-green" />
                            </div>
                            <div className="text-2xl font-bold text-iki-white">
                              {mindfulnessData.summary.currentStreak} days
                            </div>
                          </div>
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Exercises</span>
                              <Brain className="w-4 h-4 text-blue-400" />
                            </div>
                            <div className="text-2xl font-bold text-iki-white">
                              {mindfulnessData.summary.totalExercises}
                            </div>
                          </div>
                        </div>

                        {/* Stats */}
                        {mindfulnessData.stats && (
                          <div className="glass rounded-3xl p-6 border border-light-green/10">
                            <h3 className="text-xl font-bold text-iki-white mb-4 flex items-center gap-2">
                              <Target className="w-5 h-5" />
                              Mindfulness Stats
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="bg-iki-grey/20 rounded-xl p-4">
                                <div className="text-sm text-iki-white/60 mb-1">Total Sessions</div>
                                <div className="text-2xl font-bold text-iki-white">{mindfulnessData.stats.totalSessions}</div>
                              </div>
                              <div className="bg-iki-grey/20 rounded-xl p-4">
                                <div className="text-sm text-iki-white/60 mb-1">Total Minutes</div>
                                <div className="text-2xl font-bold text-iki-white">{mindfulnessData.stats.totalMinutes}</div>
                              </div>
                              <div className="bg-iki-grey/20 rounded-xl p-4">
                                <div className="text-sm text-iki-white/60 mb-1">Current Streak</div>
                                <div className="text-2xl font-bold text-light-green">{mindfulnessData.stats.currentStreak} days</div>
                              </div>
                              <div className="bg-iki-grey/20 rounded-xl p-4">
                                <div className="text-sm text-iki-white/60 mb-1">Longest Streak</div>
                                <div className="text-2xl font-bold text-iki-white">{mindfulnessData.stats.longestStreak} days</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Recent History */}
                        <div className="glass rounded-3xl p-6 border border-light-green/10">
                          <h3 className="text-xl font-bold text-iki-white mb-4 flex items-center gap-2">
                            <Brain className="w-5 h-5" />
                            Recent Sessions ({mindfulnessData.history.length})
                          </h3>
                          {mindfulnessData.history.length === 0 ? (
                            <div className="text-center py-8 text-iki-white/60">No sessions found</div>
                          ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {mindfulnessData.history.slice(0, 50).map((session: any) => (
                                <div key={session.id} className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-semibold text-iki-white">Exercise ID: {session.exerciseId}</div>
                                      <div className="text-xs text-iki-white/60">
                                        Duration: {session.duration} minutes
                                        {session.rating && ` • Rating: ${session.rating}/5`}
                                      </div>
                                    </div>
                                    <div className="text-xs text-iki-white/60">
                                      {formatDate(session.completedAt)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Favorites */}
                        {mindfulnessData.favorites && mindfulnessData.favorites.length > 0 && (
                          <div className="glass rounded-3xl p-6 border border-light-green/10">
                            <h3 className="text-xl font-bold text-iki-white mb-4 flex items-center gap-2">
                              <Heart className="w-5 h-5" />
                              Favorites ({mindfulnessData.favorites.length})
                            </h3>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {mindfulnessData.favorites.map((fav: any) => (
                                <div key={fav.id} className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                                  <div className="flex items-center justify-between">
                                    <div className="font-semibold text-iki-white">Exercise ID: {fav.exerciseId}</div>
                                    <div className="text-xs text-iki-white/60">{formatDate(fav.addedAt)}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="glass rounded-3xl p-6 border border-light-green/10 text-center text-iki-white/60">
                        No mindfulness data available
                      </div>
                    )}
                  </>
                )}

                {/* Fitness View */}
                {currentView === 'fitness' && (
                  <>
                    {loadingFitness ? (
                      <div className="glass rounded-3xl p-6 border border-light-green/10 text-center text-iki-white/60">
                        Loading fitness data...
                      </div>
                    ) : fitnessData ? (
                      <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Has Profile</span>
                              {fitnessData.summary.hasProfile ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              )}
                            </div>
                            <div className="text-2xl font-bold text-iki-white">
                              {fitnessData.summary.hasProfile ? 'Yes' : 'No'}
                            </div>
                          </div>
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Onboarding</span>
                              {fitnessData.summary.onboardingComplete ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              )}
                            </div>
                            <div className="text-2xl font-bold text-iki-white">
                              {fitnessData.summary.onboardingComplete ? 'Complete' : 'Incomplete'}
                            </div>
                          </div>
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Total Workouts</span>
                              <Activity className="w-4 h-4 text-blue-400" />
                            </div>
                            <div className="text-2xl font-bold text-iki-white">
                              {fitnessData.summary.totalWorkouts}
                            </div>
                          </div>
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Experience</span>
                              <TrendingUp className="w-4 h-4 text-light-green" />
                            </div>
                            <div className="text-lg font-bold text-iki-white truncate">
                              {fitnessData.summary.experienceLevel || 'N/A'}
                            </div>
                          </div>
                        </div>

                        {/* Profile */}
                        {fitnessData.profile && (
                          <div className="glass rounded-3xl p-6 border border-light-green/10">
                            <h3 className="text-xl font-bold text-iki-white mb-4 flex items-center gap-2">
                              <UserIcon className="w-5 h-5" />
                              Fitness Profile
                            </h3>
                            <div className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-iki-white/60">Username:</span>
                                  <span className="text-iki-white ml-2">{fitnessData.profile.username}</span>
                                </div>
                                <div>
                                  <span className="text-iki-white/60">Experience:</span>
                                  <span className="text-iki-white ml-2">{fitnessData.profile.experienceLevel || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-iki-white/60">Goal:</span>
                                  <span className="text-iki-white ml-2">{fitnessData.profile.fitnessGoal || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-iki-white/60">Location:</span>
                                  <span className="text-iki-white ml-2">{fitnessData.profile.trainingLocation || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-iki-white/60">Frequency:</span>
                                  <span className="text-iki-white ml-2">{fitnessData.profile.workoutFrequency || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-iki-white/60">Duration:</span>
                                  <span className="text-iki-white ml-2">{fitnessData.profile.workoutDurationMinutes ? `${fitnessData.profile.workoutDurationMinutes} min` : 'N/A'}</span>
                                </div>
                                {fitnessData.profile.equipment && fitnessData.profile.equipment.length > 0 && (
                                  <div className="md:col-span-3">
                                    <span className="text-iki-white/60">Equipment:</span>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {fitnessData.profile.equipment.map((eq: string, idx: number) => (
                                        <span key={idx} className="px-2 py-1 bg-iki-grey/30 rounded-lg text-iki-white text-xs">
                                          {eq}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Onboarding Data */}
                        {fitnessData.onboarding && (
                          <div className="glass rounded-3xl p-6 border border-light-green/10">
                            <h3 className="text-xl font-bold text-iki-white mb-4 flex items-center gap-2">
                              <ClipboardList className="w-5 h-5" />
                              Fitness Onboarding
                            </h3>
                            <div className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                              <pre className="text-xs text-iki-white/80 overflow-x-auto">
                                {JSON.stringify(fitnessData.onboarding, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="glass rounded-3xl p-6 border border-light-green/10 text-center text-iki-white/60">
                        No fitness data available
                      </div>
                    )}
                  </>
                )}

                {/* Goals View */}
                {currentView === 'goals' && (
                  <>
                    {loadingFinance ? (
                      <div className="glass rounded-3xl p-6 border border-light-green/10 text-center text-iki-white/60">
                        Loading goals data...
                      </div>
                    ) : financeData && financeData.goals ? (
                      <>
                        <div className="glass rounded-3xl p-6 border border-light-green/10">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-iki-white flex items-center gap-2">
                              <Target className="w-5 h-5" />
                              Financial Goals ({financeData.goals.length})
                            </h3>
                          </div>
                          {financeData.goals.length === 0 ? (
                            <div className="text-center py-8 text-iki-white/60">No goals found</div>
                          ) : (
                            <div className="space-y-4">
                              {financeData.goals.map((goal: any) => (
                                <div key={goal.id} className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                                  <div className="flex items-center justify-between mb-3">
                                    <div>
                                      <div className="font-semibold text-iki-white">{goal.name}</div>
                                      <div className="text-xs text-iki-white/60">
                                        Deadline: {formatDate(goal.deadline)} | Streak: {goal.streak} days
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm text-iki-white/60">Progress</div>
                                      <div className="font-bold text-light-green">
                                        {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mb-3">
                                    <div className="w-full h-3 rounded-full bg-iki-grey/30 overflow-hidden">
                                      <div 
                                        className="h-full bg-light-green transition-all"
                                        style={{ width: `${Math.min(100, goal.progress || 0)}%` }}
                                      />
                                    </div>
                                    <div className="text-xs text-iki-white/60 mt-1 text-right">
                                      {goal.progress?.toFixed(1) || 0}%
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                      <span className="text-iki-white/60">Monthly Contribution:</span>
                                      <span className="text-iki-white ml-2">{formatCurrency(goal.monthlyContribution)}</span>
                                    </div>
                                    <div>
                                      <span className="text-iki-white/60">Last Contribution:</span>
                                      <span className="text-iki-white ml-2">{formatDate(goal.lastContributionDate)}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="glass rounded-3xl p-6 border border-light-green/10 text-center text-iki-white/60">
                        No goals data available
                      </div>
                    )}
                  </>
                )}

                {/* Onboarding View */}
                {currentView === 'onboarding' && (
                  <>
                    {loadingOnboarding ? (
                      <div className="glass rounded-3xl p-6 border border-light-green/10 text-center text-iki-white/60">
                        Loading onboarding data...
                      </div>
                    ) : onboardingData ? (
                      <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Main App</span>
                              {onboardingData.summary.hasMainOnboarding ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              )}
                            </div>
                            <div className="text-2xl font-bold text-iki-white">
                              {onboardingData.summary.hasMainOnboarding ? 'Yes' : 'No'}
                            </div>
                          </div>
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Fitness</span>
                              {onboardingData.summary.fitnessOnboardingComplete ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              )}
                            </div>
                            <div className="text-2xl font-bold text-iki-white">
                              {onboardingData.summary.fitnessOnboardingComplete ? 'Complete' : onboardingData.summary.hasFitnessOnboarding ? 'Incomplete' : 'None'}
                            </div>
                          </div>
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Nutrition</span>
                              {onboardingData.summary.nutritionOnboardingComplete ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              )}
                            </div>
                            <div className="text-2xl font-bold text-iki-white">
                              {onboardingData.summary.nutritionOnboardingComplete ? 'Complete' : onboardingData.summary.hasNutritionOnboarding ? 'Incomplete' : 'None'}
                            </div>
                          </div>
                          <div className="glass rounded-2xl p-4 border border-light-green/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-iki-white/60">Wellsphere</span>
                              {onboardingData.summary.hasWellsphereOnboarding ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              )}
                            </div>
                            <div className="text-2xl font-bold text-iki-white">
                              {onboardingData.summary.hasWellsphereOnboarding ? 'Yes' : 'No'}
                            </div>
                          </div>
                          {onboardingData.summary.hasEnhancedQuestions !== undefined && (
                            <div className="glass rounded-2xl p-4 border border-light-green/10">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-iki-white/60">Questions</span>
                                {onboardingData.summary.hasEnhancedQuestions ? (
                                  <CheckCircle className="w-4 h-4 text-green-400" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-400" />
                                )}
                              </div>
                              <div className="text-2xl font-bold text-iki-white">
                                {onboardingData.summary.hasEnhancedQuestions ? 'Yes' : 'No'}
                              </div>
                            </div>
                          )}
                          {onboardingData.summary.hasEnhancedInterests !== undefined && (
                            <div className="glass rounded-2xl p-4 border border-light-green/10">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-iki-white/60">Interests</span>
                                {onboardingData.summary.hasEnhancedInterests ? (
                                  <CheckCircle className="w-4 h-4 text-green-400" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-400" />
                                )}
                              </div>
                              <div className="text-2xl font-bold text-iki-white">
                                {onboardingData.summary.hasEnhancedInterests ? 'Yes' : 'No'}
                              </div>
                            </div>
                          )}
                          {onboardingData.summary.hasEnhancedMedical !== undefined && (
                            <div className="glass rounded-2xl p-4 border border-light-green/10">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-iki-white/60">Medical</span>
                                {onboardingData.summary.hasEnhancedMedical ? (
                                  <CheckCircle className="w-4 h-4 text-green-400" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-400" />
                                )}
                              </div>
                              <div className="text-2xl font-bold text-iki-white">
                                {onboardingData.summary.hasEnhancedMedical ? 'Yes' : 'No'}
                              </div>
                            </div>
                          )}
                          {onboardingData.summary.hasEnhancedSecurity !== undefined && (
                            <div className="glass rounded-2xl p-4 border border-light-green/10">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-iki-white/60">Security</span>
                                {onboardingData.summary.hasEnhancedSecurity ? (
                                  <CheckCircle className="w-4 h-4 text-green-400" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-400" />
                                )}
                              </div>
                              <div className="text-2xl font-bold text-iki-white">
                                {onboardingData.summary.hasEnhancedSecurity ? 'Yes' : 'No'}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Main App Onboarding */}
                        {onboardingData.mainOnboarding && (
                          <div className="glass rounded-3xl p-6 border border-light-green/10">
                            <h3 className="text-xl font-bold text-iki-white mb-4 flex items-center gap-2">
                              <UserIcon className="w-5 h-5" />
                              Main App Onboarding (Enhanced Details)
                            </h3>
                            <div className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                {onboardingData.mainOnboarding.firstName && (
                                  <div>
                                    <span className="text-iki-white/60">First Name:</span>
                                    <span className="text-iki-white ml-2">{onboardingData.mainOnboarding.firstName}</span>
                                  </div>
                                )}
                                {onboardingData.mainOnboarding.lastName && (
                                  <div>
                                    <span className="text-iki-white/60">Last Name:</span>
                                    <span className="text-iki-white ml-2">{onboardingData.mainOnboarding.lastName}</span>
                                  </div>
                                )}
                                {onboardingData.mainOnboarding.username && (
                                  <div>
                                    <span className="text-iki-white/60">Username:</span>
                                    <span className="text-iki-white ml-2">{onboardingData.mainOnboarding.username}</span>
                                  </div>
                                )}
                                {onboardingData.mainOnboarding.gender && (
                                  <div>
                                    <span className="text-iki-white/60">Gender:</span>
                                    <span className="text-iki-white ml-2">{onboardingData.mainOnboarding.gender}</span>
                                  </div>
                                )}
                                {onboardingData.mainOnboarding.age && (
                                  <div>
                                    <span className="text-iki-white/60">Age:</span>
                                    <span className="text-iki-white ml-2">{onboardingData.mainOnboarding.age}</span>
                                  </div>
                                )}
                                {onboardingData.mainOnboarding.country && (
                                  <div>
                                    <span className="text-iki-white/60">Country:</span>
                                    <span className="text-iki-white ml-2">{onboardingData.mainOnboarding.country}</span>
                                  </div>
                                )}
                                {onboardingData.mainOnboarding.bodyWeightKg && (
                                  <div>
                                    <span className="text-iki-white/60">Weight:</span>
                                    <span className="text-iki-white ml-2">{onboardingData.mainOnboarding.bodyWeightKg} kg</span>
                                  </div>
                                )}
                                {onboardingData.mainOnboarding.heightCm && (
                                  <div>
                                    <span className="text-iki-white/60">Height:</span>
                                    <span className="text-iki-white ml-2">{onboardingData.mainOnboarding.heightCm} cm</span>
                                  </div>
                                )}
                                {onboardingData.mainOnboarding.activityLevel && (
                                  <div>
                                    <span className="text-iki-white/60">Activity Level:</span>
                                    <span className="text-iki-white ml-2">{onboardingData.mainOnboarding.activityLevel}</span>
                                  </div>
                                )}
                                {onboardingData.mainOnboarding.facet && (
                                  <div>
                                    <span className="text-iki-white/60">Facet:</span>
                                    <span className="text-iki-white ml-2">{onboardingData.mainOnboarding.facet}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Fitness Onboarding */}
                        {onboardingData.fitnessOnboarding && (
                          <div className="glass rounded-3xl p-6 border border-light-green/10">
                            <h3 className="text-xl font-bold text-iki-white mb-4 flex items-center gap-2">
                              <Activity className="w-5 h-5" />
                              Fitness Onboarding
                            </h3>
                            <div className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                              <div className="mb-2">
                                <span className="text-xs font-semibold text-iki-white/60">Status:</span>
                                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                                  onboardingData.fitnessOnboarding.complete
                                    ? 'bg-green-400/20 text-green-400'
                                    : 'bg-yellow-400/20 text-yellow-400'
                                }`}>
                                  {onboardingData.fitnessOnboarding.complete ? 'Complete' : 'In Progress'}
                                </span>
                              </div>
                              <pre className="text-xs text-iki-white/80 overflow-x-auto mt-4">
                                {JSON.stringify(onboardingData.fitnessOnboarding, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}

                        {/* Onboarding Summary - Nutrition, Wellsphere, and Enhanced Interests */}
                        <OnboardingSummary
                          nutritionOnboarding={onboardingData.nutritionOnboarding}
                          wellsphereOnboarding={onboardingData.wellsphereOnboarding}
                          enhancedInterests={onboardingData.userTags || onboardingData.enhancedInterests}
                        />

                        {/* Enhanced Questions */}
                        {onboardingData.enhancedQuestions && (
                          <div className="glass rounded-3xl p-6 border border-light-green/10">
                            <h3 className="text-xl font-bold text-iki-white mb-4 flex items-center gap-2">
                              <ClipboardList className="w-5 h-5" />
                              Enhanced Questions (Health Goals & Preferences)
                            </h3>
                            <div className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                              <pre className="text-xs text-iki-white/80 overflow-x-auto">
                                {JSON.stringify(onboardingData.enhancedQuestions, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}

                        {/* Enhanced Medical */}
                        {onboardingData.enhancedMedical && (
                          <div className="glass rounded-3xl p-6 border border-light-green/10">
                            <h3 className="text-xl font-bold text-iki-white mb-4 flex items-center gap-2">
                              <Stethoscope className="w-5 h-5" />
                              Enhanced Medical Information
                            </h3>
                            <div className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-iki-white/60">Has Medical Condition:</span>
                                  <span className={`ml-2 font-semibold ${onboardingData.enhancedMedical.hasMedicalCondition ? 'text-red-400' : 'text-green-400'}`}>
                                    {onboardingData.enhancedMedical.hasMedicalCondition ? 'Yes' : 'No'}
                                  </span>
                                </div>
                                {onboardingData.enhancedMedical.medicalCondition && (
                                  <div>
                                    <span className="text-iki-white/60">Condition:</span>
                                    <span className="text-iki-white ml-2">{onboardingData.enhancedMedical.medicalCondition}</span>
                                  </div>
                                )}
                                {onboardingData.enhancedMedical.medicalDetails && (
                                  <div className="col-span-2">
                                    <span className="text-iki-white/60">Details:</span>
                                    <div className="text-iki-white mt-1">{onboardingData.enhancedMedical.medicalDetails}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Enhanced Security */}
                        {onboardingData.enhancedSecurity && (
                          <div className="glass rounded-3xl p-6 border border-light-green/10">
                            <h3 className="text-xl font-bold text-iki-white mb-4 flex items-center gap-2">
                              <CheckCircle className="w-5 h-5" />
                              Enhanced Security Setup
                            </h3>
                            <div className="bg-iki-grey/20 rounded-xl p-4 border border-light-green/10">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-iki-white/60">Biometric Enabled:</span>
                                  <span className={`ml-2 font-semibold ${onboardingData.enhancedSecurity.biometricEnabled ? 'text-green-400' : 'text-iki-white/60'}`}>
                                    {onboardingData.enhancedSecurity.biometricEnabled ? 'Yes' : 'No'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-iki-white/60">PIN Enabled:</span>
                                  <span className={`ml-2 font-semibold ${onboardingData.enhancedSecurity.pinEnabled ? 'text-green-400' : 'text-iki-white/60'}`}>
                                    {onboardingData.enhancedSecurity.pinEnabled ? 'Yes' : 'No'}
                                  </span>
                                </div>
                                {onboardingData.enhancedSecurity.pinSetAt && (
                                  <div className="col-span-2">
                                    <span className="text-iki-white/60">PIN Set At:</span>
                                    <span className="text-iki-white ml-2">{formatDate(onboardingData.enhancedSecurity.pinSetAt)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="glass rounded-3xl p-6 border border-light-green/10 text-center text-iki-white/60">
                        No onboarding data available
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="glass rounded-3xl p-6 border border-light-green/10 text-center">
                <UserIcon className="w-16 h-16 text-iki-white/20 mx-auto mb-4" />
                <p className="text-iki-white/60">Select a user to view their {currentView} data</p>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </main>
  );
}

