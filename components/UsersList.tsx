'use client';

import { User, UsersResponse } from '@/lib/types';
import { downloadCsv, downloadJson } from '@/lib/export';
import { getUserAvatarSeed, getUserLabel, maskEmail, maskPhone, shortId } from '@/lib/privacy';
import { usePrivacyMode } from '@/lib/usePrivacyMode';
import { usePermissions } from '@/components/PermissionsProvider';
import { RBAC_ACTIONS, RBAC_RESOURCES } from '@/lib/permissions';
import {
  Activity,
  Calendar,
  Edit,
  Eye,
  Mail,
  MapPin,
  Search,
  Send,
  User as UserIcon,
  UserPlus,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import Avatar from './Avatar';
import CreateUserModal from './CreateUserModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import EditUserModal from './EditUserModal';
import SendMessageModal from './SendMessageModal';
import UserActionsMenu from './UserActionsMenu';
import UserDetailModal from './UserDetailModal';

export default function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [lastDocId, setLastDocId] = useState<string | null>(null);
  const { privacyMode } = usePrivacyMode();
  const { can } = usePermissions();
  const canWriteUsers = can(RBAC_RESOURCES.USERS, RBAC_ACTIONS.WRITE);
  const canDeleteUsers = can(RBAC_RESOURCES.USERS, RBAC_ACTIONS.DELETE);
  const canSendFcm = can(RBAC_RESOURCES.FCM, RBAC_ACTIONS.WRITE);

  // Modal states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDisplayName = (user: User) => getUserLabel(user, privacyMode);

  const exportUsers = (format: 'csv' | 'json') => {
    const rows = filteredUsers.map((u) => ({
      id: u.id,
      label: getUserLabel(u, privacyMode),
      username: privacyMode ? '' : u.username || '',
      email: privacyMode ? maskEmail(u.email) : u.email || '',
      phone: privacyMode ? maskPhone(u.phone) : u.phone || '',
      country: u.country || '',
      joinedAt: u.signedUpAt || '',
      isOnline: !!u.isOnline,
      points: u.points || 0,
    }));

    const stamp = new Date().toISOString().slice(0, 10);
    if (format === 'json') {
      downloadJson(`users-${stamp}.json`, rows);
      return;
    }
    downloadCsv(`users-${stamp}.csv`, rows, [
      'id',
      'label',
      'username',
      'email',
      'phone',
      'country',
      'joinedAt',
      'isOnline',
      'points',
    ]);
  };

  // Action handlers
  const handleView = (user: User) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleSendMessage = (user: User) => {
    setSelectedUser(user);
    setShowMessageModal(true);
  };

  const handleSaveUser = async (userId: string, data: any) => {
    const response = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update user');
    }

    // Refresh users list
    await fetchUsers(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      // Remove user from list
      setUsers(users.filter((u) => u.id !== selectedUser.id));
      setShowDeleteModal(false);
      setSelectedUser(null);
    } catch (err: any) {
      setError(err.message);
      setShowDeleteModal(false);
    }
  };

  const handleSendFCM = async (title: string, body: string, data?: any) => {
    if (!selectedUser) return;

    const response = await fetch(`/api/users/${selectedUser.id}/fcm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, data }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send message');
    }
  };

  return (
    <div className="spacing-section">
      {/* Header */}
      <div className="section-header">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="section-title text-gradient-green">Users Management</h2>
            <p className="section-subtitle">Manage and view all users on the platform</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => exportUsers('csv')} className="btn-secondary" title="Export users as CSV">
                Export CSV
              </button>
              <button onClick={() => exportUsers('json')} className="btn-secondary" title="Export users as JSON">
                Export JSON
              </button>
            </div>
            {canWriteUsers && (
              <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                <UserPlus className="w-4 h-4" />
                Create User
              </button>
            )}
            <div className="badge-secondary">
              <span className="body-sm font-medium">
                {users.length} {users.length === 1 ? 'user' : 'users'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-iki-white/40" />
        <input
          type="text"
          placeholder={privacyMode ? 'Search by username or ID...' : 'Search by name, username, or email...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-standard pl-12"
        />
      </div>

      {/* Error State */}
      {error && (
        <div className="card-compact status-error">
          <p className="body-md">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && users.length === 0 && (
        <div className="card text-center py-12">
          <div className="spinner h-8 w-8 mx-auto" />
          <p className="body-md text-iki-white/60 mt-4">Loading users...</p>
        </div>
      )}

      {/* Users Table */}
      {!loading && filteredUsers.length > 0 && (
        <div className="table-container">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">User</th>
                  <th className="table-header-cell">Contact</th>
                  <th className="table-header-cell">Location</th>
                  <th className="table-header-cell">Joined</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Points</th>
                  <th className="table-header-cell text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-green/10">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-iki-grey/40 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-light-green to-[#a8d91a] flex items-center justify-center">
                          <Avatar
                            src={user.photoUrl}
                            seed={getUserAvatarSeed(user)}
                            alt={getDisplayName(user)}
                            size={40}
                            forceDicebear={privacyMode}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-semibold text-iki-white">{getDisplayName(user)}</div>
                          {privacyMode ? (
                            <div className="text-sm text-iki-white/60">id:{shortId(user.id)}</div>
                          ) : (
                            user.username && <div className="text-sm text-iki-white/60">@{user.username}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="spacing-card">
                        {user.email && (
                          <div className="flex items-center gap-2 body-sm text-iki-white/80">
                            <Mail className="w-4 h-4 text-iki-white/40" />
                            {privacyMode ? maskEmail(user.email) : user.email}
                          </div>
                        )}
                        {user.phone && (
                          <div className="body-sm text-iki-white/60">
                            {privacyMode ? maskPhone(user.phone) : user.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      {user.country ? (
                        <div className="flex items-center gap-2 body-sm text-iki-white/80">
                          <MapPin className="w-4 h-4 text-iki-white/40" />
                          {user.country}
                        </div>
                      ) : (
                        <span className="body-sm text-iki-white/40">N/A</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2 body-sm text-iki-white/80">
                        <Calendar className="w-4 h-4 text-iki-white/40" />
                        {formatDate(user.signedUpAt)}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            user.isOnline ? 'bg-light-green animate-pulse' : 'bg-iki-white/40'
                          }`}
                        />
                        <span className="body-sm text-iki-white/80">
                          {user.isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-light-green" />
                        <span className="font-semibold text-iki-white body-sm">{user.points || 0}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleView(user)}
                          className="btn-ghost"
                          title="View full user details"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline body-sm">View</span>
                        </button>
                        {canSendFcm && (
                          <button
                            onClick={() => handleSendMessage(user)}
                            className="btn-ghost"
                            title="Send push notification"
                          >
                            <Send className="w-4 h-4" />
                            <span className="hidden sm:inline body-sm">Message</span>
                          </button>
                        )}
                        {canWriteUsers && (
                          <button
                            onClick={() => handleEdit(user)}
                            className="btn-ghost"
                            title="Edit user profile"
                          >
                            <Edit className="w-4 h-4" />
                            <span className="hidden sm:inline body-sm">Edit</span>
                          </button>
                        )}
                        <UserActionsMenu
                          user={user}
                          onView={handleView}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onSendMessage={handleSendMessage}
                          allowEdit={canWriteUsers}
                          allowDelete={canDeleteUsers}
                          allowMessage={canSendFcm}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredUsers.length === 0 && (
        <div className="card text-center py-12">
          <UserIcon className="w-12 h-12 text-iki-white/40 mx-auto mb-4" />
          <p className="body-md text-iki-white/60">
            {searchQuery ? 'No users found matching your search' : 'No users found'}
          </p>
        </div>
      )}

      {/* Load More */}
      {hasMore && !loading && (
        <div className="text-center">
          <button onClick={() => fetchUsers(false)} className="btn-primary">
            Load More Users
          </button>
        </div>
      )}

      {/* Modals */}
      <UserDetailModal
        user={selectedUser}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedUser(null);
        }}
      />

      <EditUserModal
        user={selectedUser}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
        }}
        onSave={handleSaveUser}
      />

      <SendMessageModal
        user={selectedUser}
        isOpen={showMessageModal}
        onClose={() => {
          setShowMessageModal(false);
          setSelectedUser(null);
        }}
        onSend={handleSendFCM}
      />

      <DeleteConfirmModal
        user={selectedUser}
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedUser(null);
        }}
        onConfirm={handleDeleteUser}
      />

      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchUsers(true);
        }}
      />
    </div>
  );
}
