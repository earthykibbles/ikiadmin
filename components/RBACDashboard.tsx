'use client';

import {
  Check,
  CheckCircle2,
  Edit,
  Filter,
  Key,
  Plus,
  Save,
  Search,
  Shield,
  Trash2,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePermissions } from '@/components/PermissionsProvider';
import { RBAC_ACTIONS, RBAC_RESOURCES } from '@/lib/permissions';

interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions?: Permission[];
}

interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string | null;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  permissions: {
    roleBased: Permission[];
    resourceBased: any[];
  };
}

export default function RBACDashboard() {
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'permissions'>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Superadmin-only create user flow
  const { me, can } = usePermissions();
  const isSuperadmin = !!me?.isSuperadmin;
  const canAdminWrite = can(RBAC_RESOURCES.ADMIN, RBAC_ACTIONS.WRITE);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createUserSuccess, setCreateUserSuccess] = useState<{
    userId: string;
    email: string;
    temporaryPassword?: string;
    emailSent?: boolean;
    emailError?: string | null;
  } | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(true);
  const [newUserRoleIds, setNewUserRoleIds] = useState<string[]>(['role_admin']);
  const [sendCredentials, setSendCredentials] = useState(true);

  // Superadmin-only reset password flow (for fixing bad hashes / onboarding)
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState<{
    userId: string;
    email: string;
    temporaryPassword?: string;
    emailSent?: boolean;
    emailError?: string | null;
  } | null>(null);
  const [resetAutoGenerate, setResetAutoGenerate] = useState(true);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetSendEmail, setResetSendEmail] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'users') return;
    if (!showRoleModal) return;
    if (roles.length > 0) return;
    ensureRolesLoaded().catch((err: any) => setError(err?.message || 'Failed to fetch roles'));
  }, [activeTab, showRoleModal]);

  // Fetch permissions when create modal opens
  useEffect(() => {
    if (showCreateRoleModal && permissions.length === 0) {
      fetch('/api/rbac/permissions')
        .then((res) => res.json())
        .then((data) => setPermissions(data.permissions || []))
        .catch((err) => setError(err.message));
    }
  }, [showCreateRoleModal]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'users') {
        const res = await fetch('/api/rbac/users');
        if (!res.ok) throw new Error('Failed to fetch users');
        const data = await res.json();
        setUsers(data.users || []);
      } else if (activeTab === 'roles') {
        const res = await fetch('/api/rbac/roles');
        if (!res.ok) throw new Error('Failed to fetch roles');
        const data = await res.json();
        setRoles(data.roles || []);
      } else if (activeTab === 'permissions') {
        const res = await fetch('/api/rbac/permissions');
        if (!res.ok) throw new Error('Failed to fetch permissions');
        const data = await res.json();
        setPermissions(data.permissions || []);
      }

      // Always fetch permissions when showing create role modal
      if (showCreateRoleModal && permissions.length === 0) {
        const res = await fetch('/api/rbac/permissions');
        if (res.ok) {
          const data = await res.json();
          setPermissions(data.permissions || []);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const ensureRolesLoaded = async () => {
    if (roles.length > 0) return;
    const res = await fetch('/api/rbac/roles');
    if (!res.ok) throw new Error('Failed to fetch roles');
    const data = await res.json();
    setRoles(data.roles || []);
  };

  const handleCreateUser = async () => {
    try {
      setCreatingUser(true);
      setCreateUserError(null);
      setCreateUserSuccess(null);

      await ensureRolesLoaded();

      const roleIds = newUserRoleIds.length > 0 ? newUserRoleIds : ['role_admin'];
      if (!autoGeneratePassword) {
        if (!newUserPassword.trim() || newUserPassword.trim().length < 8) {
          throw new Error('Password must be at least 8 characters (or enable random generation)');
        }
      }
      const response = await fetch('/api/rbac/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.trim(),
          password: autoGeneratePassword ? undefined : newUserPassword.trim(),
          roleIds,
          sendEmail: sendCredentials,
          returnPassword: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to create user');
      }

      setCreateUserSuccess(data);
      setNewUserPassword('');
      await fetchData();
    } catch (err: any) {
      setCreateUserError(err?.message || 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      setResettingPassword(true);
      setResetPasswordError(null);
      setResetPasswordSuccess(null);

      if (!resetAutoGenerate) {
        if (!resetPasswordValue.trim() || resetPasswordValue.trim().length < 8) {
          throw new Error('Password must be at least 8 characters (or enable random generation)');
        }
      }

      const response = await fetch(`/api/rbac/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: resetAutoGenerate ? undefined : resetPasswordValue.trim(),
          sendEmail: resetSendEmail,
          returnPassword: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to reset password');
      }

      setResetPasswordSuccess(data);
      setResetPasswordValue('');
    } catch (err: any) {
      setResetPasswordError(err?.message || 'Failed to reset password');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleAssignRole = async (userId: string, roleId: string) => {
    try {
      const res = await fetch(`/api/rbac/users/${userId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to assign role');
      }

      await fetchData();
      if (selectedUser?.id === userId) {
        const updatedUser = users.find((u) => u.id === userId);
        if (updatedUser) setSelectedUser(updatedUser);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveRole = async (userId: string, roleId: string) => {
    if (!confirm('Are you sure you want to remove this role?')) return;

    try {
      const res = await fetch(`/api/rbac/users/${userId}/roles?roleId=${roleId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to remove role');
      }

      await fetchData();
      if (selectedUser?.id === userId) {
        const updatedUser = users.find((u) => u.id === userId);
        if (updatedUser) setSelectedUser(updatedUser);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRoles = roles.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group permissions by resource
  const groupedPermissions =
    permissions.length > 0
      ? permissions.reduce(
          (acc, perm) => {
            if (!acc[perm.resource]) {
              acc[perm.resource] = [];
            }
            acc[perm.resource].push(perm);
            return acc;
          },
          {} as Record<string, Permission[]>
        )
      : {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black bg-gradient-to-r from-light-green to-[#a8d91a] bg-clip-text text-transparent">
            RBAC Management
          </h2>
          <p className="text-sm text-iki-white/60 mt-1">
            Manage roles, permissions, and user access across the entire application
          </p>
        </div>
        {canAdminWrite && (
          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/rbac/initialize', { method: 'POST' });
                if (res.ok) {
                  alert('RBAC system initialized!');
                  await fetchData();
                }
              } catch (err: any) {
                setError(err.message);
              }
            }}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-light-green to-[#a8d91a] text-dark-blue font-semibold hover:shadow-lg hover:shadow-light-green/50 transition-all flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            Initialize RBAC
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-light-green/20">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'users'
              ? 'bg-iki-grey/50 border-b-2 border-light-green text-light-green'
              : 'text-iki-white/60 hover:text-iki-white/80'
          }`}
        >
          <Users className="w-4 h-4" />
          Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-6 py-3 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'roles'
              ? 'bg-iki-grey/50 border-b-2 border-light-green text-light-green'
              : 'text-iki-white/60 hover:text-iki-white/80'
          }`}
        >
          <Shield className="w-4 h-4" />
          Roles ({roles.length})
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-6 py-3 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'permissions'
              ? 'bg-iki-grey/50 border-b-2 border-light-green text-light-green'
              : 'text-iki-white/60 hover:text-iki-white/80'
          }`}
        >
          <Key className="w-4 h-4" />
          Permissions ({permissions.length})
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/50 text-red-300">
          {error}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-iki-white/40" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-iki-grey/50 border border-light-green/20 text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/50"
              />
            </div>

            {isSuperadmin && (
              <button
                onClick={async () => {
                  try {
                    setCreateUserError(null);
                    setCreateUserSuccess(null);
                    setNewUserName('');
                    setNewUserEmail('');
                    setNewUserPassword('');
                    setAutoGeneratePassword(true);
                    setNewUserRoleIds(['role_admin']);
                    setSendCredentials(true);
                    await ensureRolesLoaded();
                    setShowCreateUserModal(true);
                  } catch (err: any) {
                    setError(err?.message || 'Failed to load roles');
                  }
                }}
                className="px-4 py-3 rounded-2xl bg-gradient-to-r from-light-green to-[#a8d91a] text-dark-blue font-semibold hover:shadow-lg hover:shadow-light-green/50 transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <UserCheck className="w-4 h-4" />
                Create User
              </button>
            )}
          </div>

          {/* Users List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-light-green border-t-transparent" />
              <p className="text-iki-white/60 mt-4">Loading users...</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="p-6 rounded-2xl bg-iki-grey/30 border border-light-green/20 hover:border-light-green/40 transition-all cursor-pointer"
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-light-green to-[#a8d91a] flex items-center justify-center text-dark-blue font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-iki-white">{user.name}</h3>
                        <p className="text-sm text-iki-white/60">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.roles.map((role) => (
                        <span
                          key={role.id}
                          className="px-3 py-1 rounded-full bg-light-green/20 text-light-green text-xs font-medium"
                        >
                          {role.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* User Detail Modal */}
          {selectedUser && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-iki-grey rounded-2xl border border-light-green/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-light-green/20 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-iki-white">User Roles & Permissions</h3>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-2 hover:bg-iki-grey/50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-iki-white/60" />
                  </button>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <h4 className="font-semibold text-iki-white mb-2">{selectedUser.name}</h4>
                    <p className="text-sm text-iki-white/60">{selectedUser.email}</p>
                    {isSuperadmin && (
                      <div className="mt-4 flex items-center gap-2">
                        <button
                          onClick={() => {
                            setResetPasswordError(null);
                            setResetPasswordSuccess(null);
                            setResetAutoGenerate(true);
                            setResetPasswordValue('');
                            setResetSendEmail(true);
                            setShowResetPasswordModal(true);
                          }}
                          className="px-3 py-2 rounded-lg bg-iki-grey/50 border border-light-green/20 text-iki-white/80 hover:border-light-green/40 transition-colors flex items-center gap-2 text-sm"
                        >
                          <Key className="w-4 h-4" />
                          Reset password
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Roles */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-iki-white">Roles</h4>
                      {canAdminWrite && (
                        <button
                          onClick={() => setShowRoleModal(true)}
                          className="px-3 py-1 rounded-lg bg-light-green/20 text-light-green text-sm font-medium hover:bg-light-green/30 transition-colors flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Assign Role
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {selectedUser.roles.map((role) => (
                        <div
                          key={role.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-iki-grey/50 border border-light-green/20"
                        >
                          <div>
                            <span className="font-medium text-iki-white">{role.name}</span>
                            {role.description && (
                              <p className="text-xs text-iki-white/60 mt-1">{role.description}</p>
                            )}
                          </div>
                          {canAdminWrite && !role.isSystem && me?.user.id !== selectedUser.id && (
                            <button
                              onClick={() => handleRemoveRole(selectedUser.id, role.id)}
                              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Permissions Summary */}
                  <div>
                    <h4 className="font-semibold text-iki-white mb-4">Permissions Summary</h4>
                    <div className="space-y-2">
                      <div className="p-3 rounded-lg bg-iki-grey/50 border border-light-green/20">
                        <p className="text-sm text-iki-white/80">
                          <strong>Role-based:</strong> {selectedUser.permissions.roleBased.length}{' '}
                          permissions
                        </p>
                        <p className="text-sm text-iki-white/80 mt-1">
                          <strong>Resource-based:</strong>{' '}
                          {selectedUser.permissions.resourceBased.length} permissions
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reset Password Modal (Superadmin only) */}
          {showResetPasswordModal && selectedUser && isSuperadmin && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-iki-grey rounded-2xl border border-light-green/20 max-w-xl w-full">
                <div className="p-6 border-b border-light-green/20 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-iki-white">Reset password</h3>
                  <button
                    onClick={() => setShowResetPasswordModal(false)}
                    className="p-2 hover:bg-iki-grey/50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-iki-white/60" />
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  <div className="text-sm text-iki-white/70">
                    User: <span className="text-iki-white/90">{selectedUser.email}</span>
                  </div>

                  {resetPasswordError && (
                    <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/50 text-red-300 flex items-center gap-2">
                      <XCircle className="w-5 h-5" />
                      <span>{resetPasswordError}</span>
                    </div>
                  )}

                  {resetPasswordSuccess && (
                    <div className="p-4 rounded-2xl bg-green-500/15 border border-green-500/40 text-green-200">
                      <div className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="w-5 h-5" />
                        Password reset
                      </div>
                      <div className="mt-2 text-sm text-iki-white/80 space-y-1">
                        {typeof resetPasswordSuccess.emailSent === 'boolean' && (
                          <div>
                            <strong>Email sent:</strong> {resetPasswordSuccess.emailSent ? 'Yes' : 'No'}
                            {resetPasswordSuccess.emailError ? ` (${resetPasswordSuccess.emailError})` : ''}
                          </div>
                        )}
                        {resetPasswordSuccess.temporaryPassword && (
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <strong>Temporary password:</strong>{' '}
                              <span className="font-mono break-all">{resetPasswordSuccess.temporaryPassword}</span>
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(
                                    resetPasswordSuccess.temporaryPassword || ''
                                  );
                                } catch {
                                  // ignore
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-iki-grey/50 border border-light-green/20 text-iki-white/80 text-xs hover:border-light-green/40 transition-colors whitespace-nowrap"
                            >
                              Copy
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-3 p-3 rounded-lg bg-iki-grey/50 border border-light-green/20">
                    <input
                      type="checkbox"
                      checked={resetAutoGenerate}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setResetAutoGenerate(next);
                        if (next) setResetPasswordValue('');
                      }}
                      className="w-4 h-4 rounded border-light-green/30 text-light-green focus:ring-light-green/50"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-iki-white">Generate random password</div>
                      <div className="text-xs text-iki-white/60">If disabled, you must enter a password.</div>
                    </div>
                  </label>

                  <div>
                    <label className="block text-sm font-medium text-iki-white mb-2">New password</label>
                    <input
                      type="text"
                      value={resetPasswordValue}
                      onChange={(e) => setResetPasswordValue(e.target.value)}
                      disabled={resetAutoGenerate}
                      className="w-full px-4 py-3 rounded-lg bg-iki-grey/50 border border-light-green/20 text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/50"
                      placeholder={
                        resetAutoGenerate ? 'Random password will be generated automatically' : 'Enter a password (min 8 chars)'
                      }
                    />
                  </div>

                  <label className="flex items-center gap-3 p-3 rounded-lg bg-iki-grey/50 border border-light-green/20">
                    <input
                      type="checkbox"
                      checked={resetSendEmail}
                      onChange={(e) => setResetSendEmail(e.target.checked)}
                      className="w-4 h-4 rounded border-light-green/30 text-light-green focus:ring-light-green/50"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-iki-white">Email credentials via SMTP</div>
                      <div className="text-xs text-iki-white/60">
                        Requires SMTP env vars to be configured on the server.
                      </div>
                    </div>
                  </label>
                </div>

                <div className="p-6 border-t border-light-green/20 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowResetPasswordModal(false)}
                    className="px-4 py-2 rounded-lg bg-iki-grey/50 border border-light-green/20 text-iki-white hover:bg-iki-grey/70 transition-colors"
                    disabled={resettingPassword}
                  >
                    Close
                  </button>
                  <button
                    onClick={async () => {
                      await handleResetPassword(selectedUser.id);
                    }}
                    className="px-6 py-2 rounded-lg bg-gradient-to-r from-light-green to-[#a8d91a] text-dark-blue font-semibold hover:shadow-lg hover:shadow-light-green/50 transition-all flex items-center gap-2"
                    disabled={resettingPassword}
                  >
                    {resettingPassword ? (
                      <>
                        <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-dark-blue border-t-transparent" />
                        Resetting...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4" />
                        Reset password
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Assign Role Modal */}
          {showRoleModal && selectedUser && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-iki-grey rounded-2xl border border-light-green/20 max-w-md w-full">
                <div className="p-6 border-b border-light-green/20 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-iki-white">Assign Role</h3>
                  <button
                    onClick={() => setShowRoleModal(false)}
                    className="p-2 hover:bg-iki-grey/50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-iki-white/60" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  {roles
                    .filter((r) => !selectedUser.roles.some((ur) => ur.id === r.id))
                    .map((role) => (
                      <button
                        key={role.id}
                        onClick={async () => {
                          await handleAssignRole(selectedUser.id, role.id);
                          setShowRoleModal(false);
                        }}
                        className="w-full p-4 rounded-lg bg-iki-grey/50 border border-light-green/20 hover:border-light-green/40 transition-all text-left"
                      >
                        <div className="font-medium text-iki-white">{role.name}</div>
                        {role.description && (
                          <div className="text-sm text-iki-white/60 mt-1">{role.description}</div>
                        )}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Create User Modal (Superadmin only) */}
          {showCreateUserModal && isSuperadmin && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-iki-grey rounded-2xl border border-light-green/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-light-green/20 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-iki-white">Create Admin User</h3>
                  <button
                    onClick={() => setShowCreateUserModal(false)}
                    className="p-2 hover:bg-iki-grey/50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-iki-white/60" />
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  {createUserError && (
                    <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/50 text-red-300 flex items-center gap-2">
                      <XCircle className="w-5 h-5" />
                      <span>{createUserError}</span>
                    </div>
                  )}

                  {createUserSuccess && (
                    <div className="p-4 rounded-2xl bg-green-500/15 border border-green-500/40 text-green-200">
                      <div className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="w-5 h-5" />
                        User created
                      </div>
                      <div className="mt-2 text-sm text-iki-white/80 space-y-1">
                        <div>
                          <strong>Email:</strong> {createUserSuccess.email}
                        </div>
                        {typeof createUserSuccess.emailSent === 'boolean' && (
                          <div>
                            <strong>Email sent:</strong>{' '}
                            {createUserSuccess.emailSent ? 'Yes' : 'No'}
                            {createUserSuccess.emailError ? ` (${createUserSuccess.emailError})` : ''}
                          </div>
                        )}
                        {createUserSuccess.temporaryPassword && (
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <strong>Temporary password:</strong>{' '}
                              <span className="font-mono break-all">{createUserSuccess.temporaryPassword}</span>
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(
                                    createUserSuccess.temporaryPassword || ''
                                  );
                                } catch {
                                  // ignore
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-iki-grey/50 border border-light-green/20 text-iki-white/80 text-xs hover:border-light-green/40 transition-colors whitespace-nowrap"
                            >
                              Copy
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-iki-white mb-2">Name *</label>
                      <input
                        type="text"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-iki-grey/50 border border-light-green/20 text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/50"
                        placeholder="e.g., Jane Admin"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-iki-white mb-2">Email *</label>
                      <input
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-iki-grey/50 border border-light-green/20 text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/50"
                        placeholder="admin@iki.app"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-iki-white mb-2">
                      Password (optional)
                    </label>
                    <input
                      type="text"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      disabled={autoGeneratePassword}
                      className="w-full px-4 py-3 rounded-lg bg-iki-grey/50 border border-light-green/20 text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/50"
                      placeholder={
                        autoGeneratePassword
                          ? 'Random password will be generated automatically'
                          : 'Enter a password (min 8 chars)'
                      }
                    />
                    <p className="text-xs text-iki-white/60 mt-2">
                      Choose random generation or type your own password.
                    </p>
                  </div>

                  <label className="flex items-center gap-3 p-3 rounded-lg bg-iki-grey/50 border border-light-green/20">
                    <input
                      type="checkbox"
                      checked={autoGeneratePassword}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setAutoGeneratePassword(next);
                        if (next) setNewUserPassword('');
                      }}
                      className="w-4 h-4 rounded border-light-green/30 text-light-green focus:ring-light-green/50"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-iki-white">Generate random password</div>
                      <div className="text-xs text-iki-white/60">
                        If enabled, we’ll generate a strong temporary password.
                      </div>
                    </div>
                  </label>

                  <div>
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <label className="block text-sm font-medium text-iki-white">
                        Assign roles ({newUserRoleIds.length} selected)
                      </label>
                      <button
                        onClick={() => setNewUserRoleIds(['role_admin'])}
                        className="text-xs text-iki-white/70 hover:text-iki-white/90"
                      >
                        Reset to Admin
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {roles.map((r) => (
                        <label
                          key={r.id}
                          className="flex items-start gap-3 p-3 rounded-lg bg-iki-grey/50 border border-light-green/20 hover:border-light-green/40 cursor-pointer transition-all"
                        >
                          <input
                            type="checkbox"
                            checked={newUserRoleIds.includes(r.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewUserRoleIds([...new Set([...newUserRoleIds, r.id])]);
                              } else {
                                const next = newUserRoleIds.filter((id) => id !== r.id);
                                setNewUserRoleIds(next.length > 0 ? next : ['role_admin']);
                              }
                            }}
                            className="mt-1 w-4 h-4 rounded border-light-green/30 text-light-green focus:ring-light-green/50"
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-iki-white flex items-center gap-2">
                              <span className="capitalize">{r.name}</span>
                              {r.isSystem && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                                  System
                                </span>
                              )}
                            </div>
                            {r.description && (
                              <div className="text-xs text-iki-white/60 mt-1">{r.description}</div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-3 p-3 rounded-lg bg-iki-grey/50 border border-light-green/20">
                    <input
                      type="checkbox"
                      checked={sendCredentials}
                      onChange={(e) => setSendCredentials(e.target.checked)}
                      className="w-4 h-4 rounded border-light-green/30 text-light-green focus:ring-light-green/50"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-iki-white">
                        Email credentials via SMTP (Mailgun)
                      </div>
                      <div className="text-xs text-iki-white/60">
                        Requires SMTP env vars to be configured on the server.
                      </div>
                    </div>
                  </label>
                </div>

                <div className="p-6 border-t border-light-green/20 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowCreateUserModal(false)}
                    className="px-4 py-2 rounded-lg bg-iki-grey/50 border border-light-green/20 text-iki-white hover:bg-iki-grey/70 transition-colors"
                    disabled={creatingUser}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!newUserName.trim() || !newUserEmail.trim()) {
                        setCreateUserError('Name and email are required');
                        return;
                      }
                      await handleCreateUser();
                    }}
                    className="px-6 py-2 rounded-lg bg-gradient-to-r from-light-green to-[#a8d91a] text-dark-blue font-semibold hover:shadow-lg hover:shadow-light-green/50 transition-all flex items-center gap-2"
                    disabled={creatingUser}
                  >
                    {creatingUser ? (
                      <>
                        <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-dark-blue border-t-transparent" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Create User
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-iki-white/40" />
              <input
                type="text"
                placeholder="Search roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-iki-grey/50 border border-light-green/20 text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/50"
              />
            </div>
            {canAdminWrite && (
              <button
                onClick={() => {
                  setEditingRole(null);
                  setNewRoleName('');
                  setNewRoleDescription('');
                  setSelectedPermissions([]);
                  setShowCreateRoleModal(true);
                }}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-light-green to-[#a8d91a] text-dark-blue font-semibold hover:shadow-lg hover:shadow-light-green/50 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Role
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-light-green border-t-transparent" />
              <p className="text-iki-white/60 mt-4">Loading roles...</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredRoles.map((role) => (
                <div
                  key={role.id}
                  className="p-6 rounded-2xl bg-iki-grey/30 border border-light-green/20 hover:border-light-green/40 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-iki-white">{role.name}</h3>
                        {role.isSystem && (
                          <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
                            System
                          </span>
                        )}
                      </div>
                      {role.description && (
                        <p className="text-sm text-iki-white/60 mb-4">{role.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {role.permissions?.map((perm) => (
                          <span
                            key={perm.id}
                            className="px-2 py-1 rounded bg-light-green/20 text-light-green text-xs"
                          >
                            {perm.resource}:{perm.action}
                          </span>
                        ))}
                      </div>
                    </div>
                    {canAdminWrite && !role.isSystem && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingRole(role);
                            setNewRoleName(role.name);
                            setNewRoleDescription(role.description || '');
                            setSelectedPermissions(role.permissions?.map((p) => p.id) || []);
                            setShowCreateRoleModal(true);
                          }}
                          className="p-2 hover:bg-iki-grey/50 rounded-lg transition-colors"
                          title="Edit role"
                        >
                          <Edit className="w-4 h-4 text-iki-white/60" />
                        </button>
                        <button
                          onClick={async () => {
                            if (
                              !confirm(
                                `Are you sure you want to delete the role "${role.name}"? This will remove it from all users.`
                              )
                            ) {
                              return;
                            }
                            try {
                              // Note: You'll need to create a DELETE endpoint for roles
                              setError(
                                'Role deletion endpoint not yet implemented. Please delete manually from database.'
                              );
                            } catch (err: any) {
                              setError(err.message);
                            }
                          }}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Delete role"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-light-green border-t-transparent" />
              <p className="text-iki-white/60 mt-4">Loading permissions...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedPermissions).map(([resource, perms]) => (
                <div
                  key={resource}
                  className="p-6 rounded-2xl bg-iki-grey/30 border border-light-green/20"
                >
                  <h3 className="font-semibold text-iki-white mb-4 capitalize">{resource}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {perms.map((perm) => (
                      <div
                        key={perm.id}
                        className="p-3 rounded-lg bg-iki-grey/50 border border-light-green/20"
                      >
                        <div className="font-medium text-iki-white text-sm">{perm.action}</div>
                        {perm.description && (
                          <div className="text-xs text-iki-white/60 mt-1">{perm.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Role Modal */}
      {showCreateRoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-iki-grey rounded-2xl border border-light-green/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-light-green/20 flex items-center justify-between">
              <h3 className="text-xl font-bold text-iki-white">
                {editingRole ? 'Edit Role' : 'Create Role'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateRoleModal(false);
                  setEditingRole(null);
                  setNewRoleName('');
                  setNewRoleDescription('');
                  setSelectedPermissions([]);
                }}
                className="p-2 hover:bg-iki-grey/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-iki-white/60" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Role Name */}
              <div>
                <label className="block text-sm font-medium text-iki-white mb-2">Role Name *</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g., Content Manager"
                  className="w-full px-4 py-3 rounded-lg bg-iki-grey/50 border border-light-green/20 text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/50"
                  disabled={editingRole?.isSystem}
                />
              </div>

              {/* Role Description */}
              <div>
                <label className="block text-sm font-medium text-iki-white mb-2">Description</label>
                <textarea
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Describe what this role can do..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg bg-iki-grey/50 border border-light-green/20 text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/50 resize-none"
                />
              </div>

              {/* Permissions Selection */}
              <div>
                <label className="block text-sm font-medium text-iki-white mb-4">
                  Permissions ({selectedPermissions.length} selected)
                </label>
                {permissions.length === 0 ? (
                  <div className="text-center py-8 text-iki-white/60">Loading permissions...</div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {Object.entries(groupedPermissions).map(([resource, perms]) => (
                      <div
                        key={resource}
                        className="p-4 rounded-lg bg-iki-grey/50 border border-light-green/20"
                      >
                        <h4 className="font-semibold text-iki-white mb-3 capitalize">{resource}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {perms.map((perm) => (
                            <label
                              key={perm.id}
                              className="flex items-center gap-2 p-2 rounded bg-iki-grey/30 border border-light-green/10 hover:border-light-green/30 cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedPermissions.includes(perm.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPermissions([...selectedPermissions, perm.id]);
                                  } else {
                                    setSelectedPermissions(
                                      selectedPermissions.filter((id) => id !== perm.id)
                                    );
                                  }
                                }}
                                className="w-4 h-4 rounded border-light-green/30 text-light-green focus:ring-light-green/50"
                              />
                              <span className="text-sm text-iki-white">{perm.action}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-light-green/20">
                <button
                  onClick={() => {
                    setShowCreateRoleModal(false);
                    setEditingRole(null);
                    setNewRoleName('');
                    setNewRoleDescription('');
                    setSelectedPermissions([]);
                  }}
                  className="px-4 py-2 rounded-lg bg-iki-grey/50 border border-light-green/20 text-iki-white hover:bg-iki-grey/70 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!newRoleName.trim()) {
                      setError('Role name is required');
                      return;
                    }

                    try {
                      if (editingRole) {
                        // Update role - for now we'll just show a message that editing is not fully implemented
                        // In a full implementation, you'd need an UPDATE endpoint
                        setError(
                          'Role editing is not yet implemented. Please delete and recreate the role.'
                        );
                        return;
                      }

                      const response = await fetch('/api/rbac/roles', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          name: newRoleName.trim(),
                          description: newRoleDescription.trim() || null,
                          permissionIds: selectedPermissions,
                        }),
                      });

                      if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Failed to create role');
                      }

                      // Refresh roles list
                      await fetchData();
                      setShowCreateRoleModal(false);
                      setEditingRole(null);
                      setNewRoleName('');
                      setNewRoleDescription('');
                      setSelectedPermissions([]);
                    } catch (err: any) {
                      setError(err.message);
                    }
                  }}
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-light-green to-[#a8d91a] text-dark-blue font-semibold hover:shadow-lg hover:shadow-light-green/50 transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingRole ? 'Update Role' : 'Create Role'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
