'use client';

import { User } from '@/lib/types';
import { getUserAvatarSeed, getUserLabel, maskEmail, shortId } from '@/lib/privacy';
import { usePrivacyMode } from '@/lib/usePrivacyMode';
import {
  Award,
  BarChart3,
  Calendar,
  Edit2,
  Save,
  Search,
  TrendingUp,
  User as UserIcon,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import Avatar from './Avatar';

interface PointsData {
  totalPoints: number;
  level: number;
  earnedPoints: { [key: string]: number };
  pointsDailyTotals: { [key: string]: number };
  pointsDailyCounters?: { [key: string]: { [key: string]: number } };
  lastPointsAwardedAt: string | null;
}

interface UserWithPoints extends User {
  pointsData?: PointsData;
}

export default function PointsManagement() {
  const [users, setUsers] = useState<UserWithPoints[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithPoints | null>(null);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [editingPoints, setEditingPoints] = useState(false);
  const { privacyMode } = usePrivacyMode();
  const [pointsForm, setPointsForm] = useState({
    totalPoints: 0,
    level: 1,
  });
  const [hasMore, setHasMore] = useState(false);
  const [lastDocId, setLastDocId] = useState<string | null>(null);

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

      const data = await response.json();

      if (reset) {
        setUsers(data.users);
      } else {
        setUsers((prev) => [...prev, ...data.users]);
      }

      setHasMore(data.hasMore);
      setLastDocId(data.lastDocId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(true);
  }, []);

  const fetchUserPoints = async (userId: string) => {
    try {
      setLoadingPoints(true);
      const response = await fetch(`/api/users/${userId}/points`);
      if (!response.ok) throw new Error('Failed to fetch points');

      const data = await response.json();
      return data.points as PointsData;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoadingPoints(false);
    }
  };

  const handleViewPoints = async (user: UserWithPoints) => {
    setSelectedUser(user);
    const pointsData = await fetchUserPoints(user.id);
    if (pointsData) {
      setSelectedUser({ ...user, pointsData });
      setPointsForm({
        totalPoints: pointsData.totalPoints,
        level: pointsData.level,
      });
    }
  };

  const handleEditPoints = () => {
    setEditingPoints(true);
  };

  const handleCancelEdit = () => {
    setEditingPoints(false);
    if (selectedUser?.pointsData) {
      setPointsForm({
        totalPoints: selectedUser.pointsData.totalPoints,
        level: selectedUser.pointsData.level,
      });
    }
  };

  const handleSavePoints = async () => {
    if (!selectedUser) return;

    try {
      setLoadingPoints(true);
      const response = await fetch(`/api/users/${selectedUser.id}/points`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pointsForm),
      });

      if (!response.ok) throw new Error('Failed to update points');

      const updatedPoints = await fetchUserPoints(selectedUser.id);
      if (updatedPoints) {
        setSelectedUser({ ...selectedUser, pointsData: updatedPoints });
      }
      setEditingPoints(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingPoints(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTitle = (key: string) => {
    return key
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getWeeklyTrend = (dailyTotals: { [key: string]: number }) => {
    const now = new Date();
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const key = day.toISOString().split('T')[0];
      trend.push({
        label: day.toLocaleDateString('en-US', { weekday: 'short' }),
        points: dailyTotals[key] || 0,
      });
    }
    return trend;
  };

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    if (privacyMode) {
      return (
        user.id?.toLowerCase().includes(query) ||
        user.username?.toLowerCase().includes(query) ||
        shortId(user.id)?.toLowerCase().includes(query)
      );
    }
    return (
      user.firstname?.toLowerCase().includes(query) ||
      user.lastname?.toLowerCase().includes(query) ||
      user.username?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  });

  const getDisplayName = (user: User) => getUserLabel(user, privacyMode);

  if (selectedUser) {
    const points = selectedUser.pointsData;
    const weeklyTrend = points ? getWeeklyTrend(points.pointsDailyTotals) : [];
    const todayKey = new Date().toISOString().split('T')[0];
    const todayPoints = points?.pointsDailyTotals[todayKey] || 0;
    const categories = points
      ? Object.entries(points.earnedPoints)
          .map(([key, value]) => ({ key, label: formatTitle(key), points: value }))
          .filter((c) => c.points > 0)
          .sort((a, b) => b.points - a.points)
      : [];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedUser(null)}
            className="p-2 rounded-lg bg-iki-grey/50 hover:bg-iki-grey/70 transition-colors"
          >
            <X className="w-5 h-5 text-iki-white" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-light-green font-goldplay">
              Points Breakdown: {getDisplayName(selectedUser)}
            </h2>
            <p className="text-iki-white/60 body-sm">
              {privacyMode ? maskEmail(selectedUser.email) : selectedUser.email}
            </p>
          </div>
        </div>

        {loadingPoints ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-light-green border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-iki-white/60">Loading points data...</p>
          </div>
        ) : points ? (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="glass rounded-2xl p-6 border border-light-green/10">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-iki-white mb-2">Total Points</h3>
                  {editingPoints ? (
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        value={pointsForm.totalPoints}
                        onChange={(e) =>
                          setPointsForm({
                            ...pointsForm,
                            totalPoints: Number.parseInt(e.target.value) || 0,
                            level: Math.floor((Number.parseInt(e.target.value) || 0) / 100) + 1,
                          })
                        }
                        className="px-4 py-2 rounded-lg bg-iki-grey border border-light-green/20 text-light-green font-bold text-2xl w-40"
                      />
                      <span className="text-2xl font-bold text-light-green">pts</span>
                    </div>
                  ) : (
                    <p className="text-4xl font-bold text-light-green font-goldplay">
                      {points.totalPoints} pts
                    </p>
                  )}
                  <p className="text-iki-white/60 mt-2">
                    Level {editingPoints ? pointsForm.level : points.level}
                  </p>
                </div>
                <div className="flex gap-2">
                  {editingPoints ? (
                    <>
                      <button
                        onClick={handleSavePoints}
                        disabled={loadingPoints}
                        className="p-2 rounded-lg bg-light-green/20 hover:bg-light-green/30 text-light-green transition-colors disabled:opacity-50"
                      >
                        <Save className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-2 rounded-lg bg-iki-grey/50 hover:bg-iki-grey/70 text-iki-white transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleEditPoints}
                      className="p-2 rounded-lg bg-iki-grey/50 hover:bg-iki-grey/70 text-iki-white transition-colors"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="bg-iki-grey/30 rounded-lg p-4">
                  <p className="text-iki-white/60 body-sm mb-1">Today</p>
                  <p className="text-xl font-bold text-iki-white">{todayPoints} pts</p>
                </div>
                <div className="bg-iki-grey/30 rounded-lg p-4">
                  <p className="text-iki-white/60 body-sm mb-1">Last Awarded</p>
                  <p className="text-sm font-semibold text-iki-white">
                    {formatDate(points.lastPointsAwardedAt)}
                  </p>
                </div>
                <div className="bg-iki-grey/30 rounded-lg p-4">
                  <p className="text-iki-white/60 body-sm mb-1">Categories</p>
                  <p className="text-xl font-bold text-iki-white">{categories.length}</p>
                </div>
              </div>
            </div>

            {/* Weekly Trend */}
            {weeklyTrend.length > 0 && (
              <div className="glass rounded-2xl p-6 border border-light-green/10">
                <h3 className="text-lg font-semibold text-iki-white mb-4">Last 7 Days</h3>
                <div className="flex items-end gap-2 h-32">
                  {weeklyTrend.map((day, index) => {
                    const maxPoints = Math.max(...weeklyTrend.map((d) => d.points), 1);
                    const height = (day.points / maxPoints) * 100;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-iki-grey/30 rounded-t-lg relative"
                          style={{ height: `${height}%` }}
                        >
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-light-green/60 rounded-t-lg"
                            style={{ height: '100%' }}
                          />
                        </div>
                        <p className="text-xs text-iki-white/60 mt-2">{day.label}</p>
                        <p className="text-xs font-semibold text-iki-white mt-1">{day.points}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Categories Breakdown */}
            {categories.length > 0 && (
              <div className="glass rounded-2xl p-6 border border-light-green/10">
                <h3 className="text-lg font-semibold text-iki-white mb-4">Points by Category</h3>
                <div className="space-y-3">
                  {categories.map((category) => {
                    const total = Object.values(points.earnedPoints).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? (category.points / total) * 100 : 0;
                    return (
                      <div key={category.key} className="bg-iki-grey/30 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-iki-white">{category.label}</p>
                          <p className="text-light-green font-bold">+{category.points} pts</p>
                        </div>
                        <div className="w-full bg-iki-grey/50 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-light-green h-full rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-iki-white/60 mt-1">
                          {percentage.toFixed(1)}% of total points
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="glass rounded-2xl p-12 text-center">
            <p className="text-iki-white/60">No points data available</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-light-green font-goldplay flex items-center gap-2">
            <Award className="w-6 h-6" />
            Points Management
          </h2>
          <p className="text-iki-white/60 body-sm mt-1">View and manage user points</p>
        </div>
      </div>

      {/* Search */}
      <div className="glass rounded-xl p-4 border border-light-green/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-iki-white/40" />
          <input
            type="text"
            placeholder={privacyMode ? 'Search by username or ID...' : 'Search users by name, username, or email...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-iki-grey/30 border border-light-green/10 rounded-lg text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:border-light-green/50 transition-colors"
          />
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-light-green border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-iki-white/60">Loading users...</p>
        </div>
      ) : error ? (
        <div className="glass rounded-2xl p-6 border border-red-500/20 bg-red-500/10">
          <p className="text-red-400">Error: {error}</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-iki-white/60">No users found</p>
        </div>
      ) : (
        <div className="glass rounded-2xl border border-light-green/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-iki-grey/30 border-b border-light-green/10">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-iki-white/80">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-iki-white/80">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-iki-white/80">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-green/10">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-iki-grey/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={user.photoUrl}
                          seed={getUserAvatarSeed(user)}
                          alt={getDisplayName(user)}
                          size={40}
                          forceDicebear={privacyMode}
                          className="w-10 h-10 rounded-full object-cover bg-iki-grey/50"
                        />
                        <div>
                          <p className="font-semibold text-iki-white">{getDisplayName(user)}</p>
                          {privacyMode ? (
                            <p className="text-sm text-iki-white/60">id:{shortId(user.id)}</p>
                          ) : (
                            <p className="text-sm text-iki-white/60">@{user.username || 'No username'}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-iki-white/80">
                      {privacyMode ? maskEmail(user.email) : user.email}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleViewPoints(user)}
                        className="px-4 py-2 rounded-lg bg-light-green/20 hover:bg-light-green/30 text-light-green transition-colors flex items-center gap-2 body-sm font-medium"
                      >
                        <BarChart3 className="w-4 h-4" />
                        View Points
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <div className="p-4 text-center border-t border-light-green/10">
              <button
                onClick={() => fetchUsers(false)}
                className="px-4 py-2 rounded-lg bg-iki-grey/50 hover:bg-iki-grey/70 text-iki-white transition-colors body-sm"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
