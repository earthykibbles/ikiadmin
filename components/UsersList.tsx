'use client';

import { useState, useEffect } from 'react';
import { User, UsersResponse } from '@/lib/types';
import { Search, User as UserIcon, Mail, Calendar, MapPin, Activity, Eye, Send, Edit, UserPlus } from 'lucide-react';
import UserActionsMenu from './UserActionsMenu';
import SendMessageModal from './SendMessageModal';
import EditUserModal from './EditUserModal';
import UserDetailModal from './UserDetailModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import CreateUserModal from './CreateUserModal';

export default function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [lastDocId, setLastDocId] = useState<string | null>(null);
  
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

  useEffect(() => {
    fetchUsers(true);
  }, []);

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
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

  const getDisplayName = (user: User) => {
    if (user.firstname && user.lastname) {
      return `${user.firstname} ${user.lastname}`;
    }
    if (user.firstname) return user.firstname;
    if (user.username) return user.username;
    return 'Unknown User';
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
      setUsers(users.filter(u => u.id !== selectedUser.id));
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black bg-gradient-to-r from-light-green to-[#a8d91a] bg-clip-text text-transparent">
            Users Management
          </h2>
          <p className="text-sm text-iki-white/60 mt-1">
            Manage and view all users on the platform
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-light-green to-[#a8d91a] text-dark-blue font-semibold hover:shadow-lg hover:shadow-light-green/50 transition-all flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Create User
          </button>
          <div className="px-4 py-2 rounded-full bg-iki-grey/50 border border-light-green/20">
            <span className="text-sm text-iki-white/80 font-medium">
              {users.length} {users.length === 1 ? 'user' : 'users'}
            </span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-iki-white/40" />
        <input
          type="text"
          placeholder="Search by name, username, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-2xl bg-iki-grey/50 border border-light-green/20 text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/50"
        />
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/50 text-red-300">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && users.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-light-green border-t-transparent"></div>
          <p className="text-iki-white/60 mt-4">Loading users...</p>
        </div>
      )}

      {/* Users Table */}
      {!loading && filteredUsers.length > 0 && (
        <div className="rounded-2xl bg-iki-grey/30 border border-light-green/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-iki-grey/50 border-b border-light-green/20">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-iki-white/60 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-iki-white/60 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-iki-white/60 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-iki-white/60 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-iki-white/60 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-iki-white/60 uppercase tracking-wider">
                    Points
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-iki-white/60 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-green/10">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-iki-grey/40 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-light-green to-[#a8d91a] flex items-center justify-center text-dark-blue font-bold">
                          {user.photoUrl ? (
                            <img
                              src={user.photoUrl}
                              alt={getDisplayName(user)}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <UserIcon className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-iki-white">
                            {getDisplayName(user)}
                          </div>
                          {user.username && (
                            <div className="text-sm text-iki-white/60">
                              @{user.username}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {user.email && (
                          <div className="flex items-center gap-2 text-sm text-iki-white/80">
                            <Mail className="w-4 h-4 text-iki-white/40" />
                            {user.email}
                          </div>
                        )}
                        {user.phone && (
                          <div className="text-sm text-iki-white/60">
                            {user.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.country ? (
                        <div className="flex items-center gap-2 text-sm text-iki-white/80">
                          <MapPin className="w-4 h-4 text-iki-white/40" />
                          {user.country}
                        </div>
                      ) : (
                        <span className="text-sm text-iki-white/40">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-iki-white/80">
                        <Calendar className="w-4 h-4 text-iki-white/40" />
                        {formatDate(user.signedUpAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            user.isOnline
                              ? 'bg-light-green animate-pulse'
                              : 'bg-iki-white/40'
                          }`}
                        />
                        <span className="text-sm text-iki-white/80">
                          {user.isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-light-green" />
                        <span className="font-semibold text-iki-white">
                          {user.points || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleView(user)}
                          className="px-3 py-2 rounded-lg bg-iki-grey/50 border border-light-green/20 hover:bg-light-green/20 hover:border-light-green/40 transition-all group flex items-center gap-2"
                          title="View full user details"
                        >
                          <Eye className="w-4 h-4 text-iki-white/60 group-hover:text-light-green transition-colors" />
                          <span className="text-xs font-medium text-iki-white/60 group-hover:text-light-green transition-colors hidden sm:inline">
                            View
                          </span>
                        </button>
                        <button
                          onClick={() => handleSendMessage(user)}
                          className="px-3 py-2 rounded-lg bg-iki-grey/50 border border-light-green/20 hover:bg-light-green/20 hover:border-light-green/40 transition-all group flex items-center gap-2"
                          title="Send push notification"
                        >
                          <Send className="w-4 h-4 text-iki-white/60 group-hover:text-light-green transition-colors" />
                          <span className="text-xs font-medium text-iki-white/60 group-hover:text-light-green transition-colors hidden sm:inline">
                            Message
                          </span>
                        </button>
                        <button
                          onClick={() => handleEdit(user)}
                          className="px-3 py-2 rounded-lg bg-iki-grey/50 border border-light-green/20 hover:bg-light-green/20 hover:border-light-green/40 transition-all group flex items-center gap-2"
                          title="Edit user profile"
                        >
                          <Edit className="w-4 h-4 text-iki-white/60 group-hover:text-light-green transition-colors" />
                          <span className="text-xs font-medium text-iki-white/60 group-hover:text-light-green transition-colors hidden sm:inline">
                            Edit
                          </span>
                        </button>
                        <UserActionsMenu
                          user={user}
                          onView={handleView}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onSendMessage={handleSendMessage}
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
        <div className="text-center py-12 rounded-2xl bg-iki-grey/30 border border-light-green/20">
          <UserIcon className="w-12 h-12 text-iki-white/40 mx-auto mb-4" />
          <p className="text-iki-white/60">
            {searchQuery ? 'No users found matching your search' : 'No users found'}
          </p>
        </div>
      )}

      {/* Load More */}
      {hasMore && !loading && (
        <div className="text-center">
          <button
            onClick={() => fetchUsers(false)}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-light-green to-[#a8d91a] text-dark-blue font-semibold hover:shadow-lg hover:shadow-light-green/50 transition-all"
          >
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

