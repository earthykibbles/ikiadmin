'use client';

import {
  Check,
  Plus,
  Search,
  Users as UsersIcon,
  X,
  Loader2,
  MessageSquare,
  UserPlus,
  Globe,
  Lock,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import Avatar from './Avatar';
import { downloadCsv, downloadJson } from '@/lib/export';
import { getUserAvatarSeed, getUserLabel, maskEmail, shortId } from '@/lib/privacy';
import { usePrivacyMode } from '@/lib/usePrivacyMode';

interface User {
  id: string;
  firstname?: string;
  lastname?: string;
  username?: string;
  email?: string;
  photoUrl?: string;
  displayName?: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  roomId: string;
  creatorId: string;
  memberIds: string[];
  memberCount?: number;
  isPublic: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const { privacyMode } = usePrivacyMode();

  // Create group form state
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    creatorUserId: '',
    memberUserIds: [] as string[],
    isPublic: false,
  });

  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/groups');
      if (!response.ok) throw new Error('Failed to fetch groups');

      const data = await response.json();
      setGroups(data.groups || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch('/api/users?limit=1000');
      if (!response.ok) throw new Error('Failed to fetch users');

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (isCreateModalOpen) {
      fetchUsers();
    }
  }, [isCreateModalOpen]);

  const handleCreateGroup = async () => {
    if (!groupForm.name.trim()) {
      setError('Group name is required');
      return;
    }

    if (!groupForm.creatorUserId) {
      setError('Please select a creator');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: groupForm.name.trim(),
          description: groupForm.description.trim() || undefined,
          creatorUserId: groupForm.creatorUserId,
          memberUserIds: groupForm.memberUserIds,
          isPublic: groupForm.isPublic,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create group');
      }

      const data = await response.json();
      
      // Reset form
      setGroupForm({
        name: '',
        description: '',
        creatorUserId: '',
        memberUserIds: [],
        isPublic: false,
      });
      setIsCreateModalOpen(false);
      
      // Refresh groups list
      await fetchGroups();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleMember = (userId: string) => {
    setGroupForm((prev) => ({
      ...prev,
      memberUserIds: prev.memberUserIds.includes(userId)
        ? prev.memberUserIds.filter((id) => id !== userId)
        : [...prev.memberUserIds, userId],
    }));
  };

  const getDisplayName = (user: User): string => {
    if (privacyMode) return getUserLabel(user, true);
    if (user.displayName) return user.displayName;
    return getUserLabel(user, false);
  };

  const filteredUsers = users.filter((user) => {
    const query = memberSearchQuery.toLowerCase();
    const displayName = getDisplayName(user).toLowerCase();
    const email = (user.email || '').toLowerCase();
    const username = (user.username || '').toLowerCase();
    return displayName.includes(query) || email.includes(query) || username.includes(query);
  });

  const filteredGroups = groups.filter((group) => {
    const query = searchQuery.toLowerCase();
    return (
      group.name.toLowerCase().includes(query) ||
      (group.description || '').toLowerCase().includes(query)
    );
  });

  const selectedCreator = users.find((u) => u.id === groupForm.creatorUserId);
  const selectedMembers = users.filter((u) => groupForm.memberUserIds.includes(u.id));

  const exportGroups = (format: 'csv' | 'json') => {
    const rows = filteredGroups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description || '',
      roomId: g.roomId,
      creatorId: g.creatorId,
      isPublic: g.isPublic,
      memberCount: g.memberCount || g.memberIds?.length || 0,
      createdAt: g.createdAt || '',
      updatedAt: g.updatedAt || '',
    }));
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === 'json') return downloadJson(`groups-${stamp}.json`, rows);
    return downloadCsv(`groups-${stamp}.csv`, rows, [
      'id',
      'name',
      'description',
      'roomId',
      'creatorId',
      'isPublic',
      'memberCount',
      'createdAt',
      'updatedAt',
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-iki-white">Groups Management</h2>
          <p className="text-iki-white/60 mt-1">Create and manage Connect groups</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportGroups('csv')}
            className="flex items-center gap-2 px-4 py-2 bg-iki-grey/30 border border-light-green/20 text-iki-white rounded-lg font-semibold hover:bg-iki-grey/50 transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={() => exportGroups('json')}
            className="flex items-center gap-2 px-4 py-2 bg-iki-grey/30 border border-light-green/20 text-iki-white rounded-lg font-semibold hover:bg-iki-grey/50 transition-colors"
          >
            Export JSON
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-light-green text-dark-blue rounded-lg font-semibold hover:bg-light-green/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Group
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-iki-white/40" />
        <input
          type="text"
          placeholder="Search groups..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-iki-grey/30 border border-light-green/20 rounded-lg text-iki-white placeholder-iki-white/40 focus:outline-none focus:border-light-green focus:ring-2 focus:ring-light-green/20"
        />
      </div>

      {/* Groups List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-light-green animate-spin" />
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center py-12 text-iki-white/60">
          <UsersIcon className="w-16 h-16 mx-auto mb-4 opacity-40" />
          <p>No groups found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => (
            <div
              key={group.id}
              className="p-6 bg-iki-grey/30 border border-light-green/20 rounded-lg hover:border-light-green/40 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-light-green" />
                  <h3 className="font-semibold text-iki-white text-lg">{group.name}</h3>
                </div>
                {group.isPublic ? (
                  <Globe className="w-4 h-4 text-iki-white/60" />
                ) : (
                  <Lock className="w-4 h-4 text-iki-white/60" />
                )}
              </div>
              {group.description && (
                <p className="text-iki-white/70 text-sm mb-4 line-clamp-2">
                  {group.description}
                </p>
              )}
              <div className="flex items-center justify-between text-sm text-iki-white/60">
                <span className="flex items-center gap-1">
                  <UsersIcon className="w-4 h-4" />
                  {group.memberCount || group.memberIds?.length || 0} members
                </span>
                {group.createdAt && (
                  <span>
                    {new Date(group.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-blue rounded-xl border border-light-green/30 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-light-green/20">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-iki-white">Create New Group</h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-iki-white/60 hover:text-iki-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Group Name */}
              <div>
                <label className="block text-sm font-medium text-iki-white mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  placeholder="Enter group name"
                  className="w-full px-4 py-3 bg-iki-grey/30 border border-light-green/20 rounded-lg text-iki-white placeholder-iki-white/40 focus:outline-none focus:border-light-green focus:ring-2 focus:ring-light-green/20"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-iki-white mb-2">
                  Description
                </label>
                <textarea
                  value={groupForm.description}
                  onChange={(e) =>
                    setGroupForm({ ...groupForm, description: e.target.value })
                  }
                  placeholder="Enter group description (optional)"
                  rows={3}
                  className="w-full px-4 py-3 bg-iki-grey/30 border border-light-green/20 rounded-lg text-iki-white placeholder-iki-white/40 focus:outline-none focus:border-light-green focus:ring-2 focus:ring-light-green/20 resize-none"
                />
              </div>

              {/* Creator Selection */}
              <div>
                <label className="block text-sm font-medium text-iki-white mb-2">
                  Creator *
                </label>
                <select
                  value={groupForm.creatorUserId}
                  onChange={(e) =>
                    setGroupForm({ ...groupForm, creatorUserId: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-iki-grey/30 border border-light-green/20 rounded-lg text-iki-white focus:outline-none focus:border-light-green focus:ring-2 focus:ring-light-green/20"
                >
                  <option value="">Select a creator</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {getDisplayName(user)}{' '}
                      {user.email
                        ? `(${privacyMode ? maskEmail(user.email) : user.email})`
                        : privacyMode
                          ? `(id:${shortId(user.id)})`
                          : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Public/Private Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={groupForm.isPublic}
                  onChange={(e) =>
                    setGroupForm({ ...groupForm, isPublic: e.target.checked })
                  }
                  className="w-5 h-5 text-light-green rounded focus:ring-light-green"
                />
                <label htmlFor="isPublic" className="text-iki-white cursor-pointer">
                  Public Group (anyone can join)
                </label>
              </div>

              {/* Members Selection */}
              <div>
                <label className="block text-sm font-medium text-iki-white mb-2">
                  Add Members ({selectedMembers.length} selected)
                </label>

                {/* Selected Members */}
                {selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-light-green/20 border border-light-green/40 rounded-lg"
                      >
                        <span className="text-iki-white text-sm">
                          {getDisplayName(member)}
                        </span>
                        <button
                          onClick={() => toggleMember(member.id)}
                          className="text-light-green hover:text-light-green/70"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Member Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-iki-white/40" />
                  <input
                    type="text"
                    placeholder="Search users to add..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-iki-grey/30 border border-light-green/20 rounded-lg text-iki-white placeholder-iki-white/40 focus:outline-none focus:border-light-green focus:ring-2 focus:ring-light-green/20 text-sm"
                  />
                </div>

                {/* Users List */}
                <div className="max-h-60 overflow-y-auto border border-light-green/20 rounded-lg">
                  {loadingUsers ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-light-green animate-spin" />
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="p-4 text-center text-iki-white/60 text-sm">
                      No users found
                    </div>
                  ) : (
                    <div className="divide-y divide-light-green/10">
                      {filteredUsers
                        .filter((user) => user.id !== groupForm.creatorUserId)
                        .map((user) => {
                          const isSelected = groupForm.memberUserIds.includes(user.id);
                          return (
                            <div
                              key={user.id}
                              onClick={() => toggleMember(user.id)}
                              className="flex items-center gap-3 p-3 hover:bg-iki-grey/20 cursor-pointer transition-colors"
                            >
                              <div className="flex-shrink-0">
                                <Avatar
                                  src={user.photoUrl}
                                  seed={getUserAvatarSeed(user)}
                                  alt={getDisplayName(user)}
                                  size={40}
                                  forceDicebear={privacyMode}
                                  className="w-10 h-10 rounded-full object-cover bg-iki-grey/50"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-iki-white font-medium truncate">
                                  {getDisplayName(user)}
                                </p>
                                {user.email && !privacyMode && (
                                  <p className="text-iki-white/60 text-sm truncate">
                                    {user.email}
                                  </p>
                                )}
                                {privacyMode && (
                                  <p className="text-iki-white/60 text-sm truncate">id:{shortId(user.id)}</p>
                                )}
                              </div>
                              <div className="flex-shrink-0">
                                {isSelected ? (
                                  <div className="w-6 h-6 rounded-full bg-light-green flex items-center justify-center">
                                    <Check className="w-4 h-4 text-dark-blue" />
                                  </div>
                                ) : (
                                  <div className="w-6 h-6 rounded-full border-2 border-iki-white/30" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-light-green/20">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-iki-grey/30 border border-light-green/20 text-iki-white rounded-lg font-semibold hover:bg-iki-grey/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroup}
                  disabled={creating || !groupForm.name.trim() || !groupForm.creatorUserId}
                  className="flex-1 px-4 py-3 bg-light-green text-dark-blue rounded-lg font-semibold hover:bg-light-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Create Group
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




