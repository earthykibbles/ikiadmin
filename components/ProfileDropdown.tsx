'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, LogOut, Key, ChevronDown, Shield } from 'lucide-react';
import { createAuthClient } from 'better-auth/react';
import ChangePasswordModal from './ChangePasswordModal';

const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
});

export default function ProfileDropdown() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const session = await authClient.getSession();
        setUser(session?.data?.user || null);
        
        // Check user role if authenticated
        if (session?.data?.user) {
          try {
            const res = await fetch('/api/admin/check-role');
            if (res.ok) {
              const data = await res.json();
              setUserRole(data.role);
            }
          } catch (err) {
            console.error('Failed to check role:', err);
          }
        }
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

  if (loading || !user) {
    return null;
  }

  const userInitials = user.name
    ? user.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0]?.toUpperCase() || 'U';

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-iki-grey/50 border border-light-green/20 hover:bg-iki-grey/70 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-iki-grey/50 flex items-center justify-center border border-light-green/30">
            <span className="text-xs font-goldplay text-iki-white font-semibold">
              {userInitials}
            </span>
          </div>
          <span className="body-sm text-iki-white/80 font-tsukimi max-w-[120px] truncate">
            {user.name || user.email}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-iki-white/60 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 glass rounded-xl border border-light-green/20 shadow-lg overflow-hidden z-50">
            <div className="p-2">
              <div className="px-3 py-2 mb-2 border-b border-light-green/10">
                <p className="body-sm font-goldplay text-iki-white">{user.name || 'User'}</p>
                <p className="body-xs text-iki-white/60 font-tsukimi truncate">{user.email}</p>
              </div>
              
              {userRole === 'superadmin' && (
                <Link
                  href="/superadmin"
                  onClick={() => setIsOpen(false)}
                  className="w-full px-3 py-2 rounded-lg hover:bg-iki-grey/50 transition-colors flex items-center gap-2 body-sm text-iki-white/80 font-tsukimi"
                >
                  <Shield className="w-4 h-4" />
                  Create Admin
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

