'use client';

import { createAuthClient } from 'better-auth/react';
import { ChevronDown, Key, LogOut, Shield, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { usePermissions } from '@/components/PermissionsProvider';
import { usePrivacyMode } from '@/lib/usePrivacyMode';
import Avatar from './Avatar';
import ChangePasswordModal from './ChangePasswordModal';

const authClient = createAuthClient();

export default function ProfileDropdown() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { privacyMode } = usePrivacyMode();
  const { me } = usePermissions();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const session = await authClient.getSession();
        setUser(session?.data?.user || null);
      } catch (err) {
        console.error('Failed to load user:', err);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    await authClient.signOut();
    router.push('/login');
  };

  const handleChangePassword = () => {
    setShowChangePassword(true);
    setIsOpen(false);
  };

  const avatarSeed = (user?.id || user?.email || user?.name || 'guest').toString();
  const avatarSrc = (user?.image || '').toString().trim() || null;
  const isSuperAdmin = !!me?.isSuperadmin;
  const displayName = user?.name || user?.email || 'Account';

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => {
            if (!user && !loading) {
              router.push('/login');
              return;
            }
            setIsOpen(!isOpen);
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-iki-grey/50 border border-light-green/20 hover:bg-iki-grey/70 transition-colors"
        >
          <div className="relative">
            <Avatar
              src={avatarSrc}
              seed={avatarSeed}
              alt={user?.name || user?.email || 'Avatar'}
              size={32}
              forceDicebear={privacyMode}
              className="w-8 h-8 rounded-full border border-light-green/30 object-cover bg-iki-grey/50"
            />
            {user && (
              <span
                title="Live"
                aria-label="Live"
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-light-green ring-2 ring-dark-blue animate-pulse"
              />
            )}
            {loading && (
              <span
                aria-label="Loading"
                className="absolute inset-0 rounded-full border-2 border-light-green/30 animate-pulse"
              />
            )}
          </div>
          <span
            className={`body-sm font-tsukimi max-w-[120px] truncate ${
              loading ? 'text-iki-white/50' : 'text-iki-white/80'
            }`}
          >
            {displayName}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-iki-white/60 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isOpen && user && (
          <div className="absolute right-0 mt-2 w-56 glass rounded-xl border border-light-green/20 shadow-lg overflow-hidden z-50">
            <div className="p-2">
              <div className="px-3 py-2 mb-2 border-b border-light-green/10">
                <div className="flex items-start justify-between gap-2">
                  <p className="body-sm font-goldplay text-iki-white">{user.name || 'User'}</p>
                  {me && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-tsukimi font-semibold ${
                        isSuperAdmin
                          ? 'border-light-green/40 text-light-green bg-light-green/10'
                          : 'border-iki-white/15 text-iki-white/70 bg-iki-grey/30'
                      }`}
                      title={isSuperAdmin ? 'Super Admin' : 'Admin'}
                    >
                      {isSuperAdmin ? 'Super' : 'Admin'}
                    </span>
                  )}
                </div>
                <p className="body-xs text-iki-white/60 font-tsukimi truncate">{user.email}</p>
              </div>

              <Link
                href="/account"
                onClick={() => setIsOpen(false)}
                className="w-full px-3 py-2 rounded-lg hover:bg-iki-grey/50 transition-colors flex items-center gap-2 body-sm text-iki-white/80 font-tsukimi"
              >
                <User className="w-4 h-4" />
                My Account
              </Link>

              {isSuperAdmin && (
                <Link
                  href="/superadmin"
                  onClick={() => setIsOpen(false)}
                  className="w-full px-3 py-2 rounded-lg hover:bg-iki-grey/50 transition-colors flex items-center gap-2 body-sm text-iki-white/80 font-tsukimi"
                >
                  <Shield className="w-4 h-4" />
                  Admin Tools
                </Link>
              )}

              <button
                onClick={handleChangePassword}
                className="w-full px-3 py-2 rounded-lg hover:bg-iki-grey/50 transition-colors flex items-center gap-2 body-sm text-iki-white/80 font-tsukimi"
              >
                <Key className="w-4 h-4" />
                Change Password
              </button>

              <button
                onClick={handleLogout}
                className="w-full px-3 py-2 rounded-lg hover:bg-red-500/20 transition-colors flex items-center gap-2 body-sm text-red-400 font-tsukimi mt-1"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </>
  );
}
