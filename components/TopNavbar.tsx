'use client';

import {
  Activity,
  Bell,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  Menu,
  ShieldAlert,
  Settings,
  Shield,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { usePermissions } from '@/components/PermissionsProvider';
import { RBAC_ACTIONS, RBAC_RESOURCES } from '@/lib/permissions';
import { usePrivacyMode } from '@/lib/usePrivacyMode';
import ProfileDropdown from './ProfileDropdown';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Home', icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: '/users', label: 'Users', icon: <Users className="w-4 h-4" /> },
  { href: '/generate', label: 'Gen', icon: <Sparkles className="w-4 h-4" /> },
  { href: '/notifications', label: 'Alerts', icon: <Bell className="w-4 h-4" /> },
];

export default function TopNavbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const navMenuRef = useRef<HTMLDivElement>(null);
  const { privacyMode, setPrivacyMode } = usePrivacyMode();
  const { loading: permsLoading, me, can } = usePermissions();
  const isSuperadmin = !!me?.isSuperadmin;

  useEffect(() => {
    setNavMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navMenuRef.current && !navMenuRef.current.contains(event.target as Node)) {
        setNavMenuOpen(false);
      }
    };

    if (navMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [navMenuOpen]);

  useEffect(() => {
    // Prevent body scroll when mobile menu is open
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const getPageTitle = () => {
    if (pathname === '/') return 'Insights';
    if (pathname === '/users') return 'Users';
    if (pathname === '/generate') return 'Generator';
    if (pathname === '/notifications') return 'Alerts';
    if (pathname === '/admin') return 'Admin';
    if (pathname === '/rbac') return 'Access';
    if (pathname === '/superadmin') return 'Super';
    return 'Admin';
  };

  const settingsItems: NavItem[] = [
    ...(can(RBAC_RESOURCES.ADMIN, RBAC_ACTIONS.READ)
      ? [
          { href: '/admin', label: 'Admin', icon: <Settings className="w-4 h-4" /> },
          { href: '/rbac', label: 'Access', icon: <Shield className="w-4 h-4" /> },
        ]
      : []),
    ...(can(RBAC_RESOURCES.SECURITY, RBAC_ACTIONS.READ)
      ? [
          { href: '/security', label: 'Security', icon: <ShieldAlert className="w-4 h-4" /> },
          { href: '/security/activity', label: 'Activity log', icon: <ClipboardList className="w-4 h-4" /> },
          { href: '/security/sessions', label: 'Sessions', icon: <Activity className="w-4 h-4" /> },
        ]
      : []),
    ...(!permsLoading && isSuperadmin
      ? [{ href: '/superadmin', label: 'Super', icon: <ShieldAlert className="w-4 h-4" /> }]
      : []),
  ];

  const isSettingsActive =
    pathname === '/admin' ||
    pathname === '/rbac' ||
    pathname === '/superadmin' ||
    pathname?.startsWith('/admin') ||
    pathname === '/security' ||
    pathname?.startsWith('/security');

  return (
    <>
      <header className="glass-enhanced sticky top-0 z-50 border-b border-light-green/20 shadow-2xl backdrop-blur-xl">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Left: Logo & Branding */}
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <Link
                href="/"
                className="flex items-center gap-3 min-w-0 group transition-all duration-300 hover:scale-[1.02]"
              >
                <div className="relative w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-light-green/20 to-light-green/5 border border-light-green/30 p-2 group-hover:border-light-green/50 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-light-green/20">
                  <img
                    src="/logo.png"
                    alt="Iki Logo"
                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
                <div className="min-w-0 hidden sm:block">
                  <h1 className="heading-sm font-goldplay text-iki-white truncate bg-gradient-to-r from-iki-white to-iki-white/80 bg-clip-text">
                    Iki Admin
                  </h1>
                  <p className="text-xs text-iki-white/60 font-tsukimi truncate mt-0.5">
                    {getPageTitle()}
                  </p>
                </div>
              </Link>
            </div>

            {/* Center: Navigation (Desktop) */}
            <nav className="hidden lg:flex items-center gap-2 flex-1 justify-center">
              {navItems
                .filter((item) => {
                  if (item.href === '/users') return can(RBAC_RESOURCES.USERS, RBAC_ACTIONS.READ);
                  if (item.href === '/generate') return can(RBAC_RESOURCES.GENERATE, RBAC_ACTIONS.READ);
                  if (item.href === '/notifications') return can(RBAC_RESOURCES.FCM, RBAC_ACTIONS.MANAGE);
                  return can(RBAC_RESOURCES.ADMIN, RBAC_ACTIONS.READ);
                })
                .map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href === '/users' && pathname?.startsWith('/users/'));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      relative px-5 py-2.5 rounded-xl transition-all duration-300
                      flex items-center gap-2.5 body-sm font-tsukimi font-medium
                      group
                      ${
                        isActive
                          ? 'bg-gradient-to-br from-light-green/20 via-light-green/10 to-transparent text-light-green border border-light-green/40 shadow-lg shadow-light-green/10'
                          : 'text-iki-white/70 hover:text-iki-white hover:bg-iki-grey/40 border border-transparent hover:border-light-green/20'
                      }
                    `}
                  >
                    <span
                      className={`transition-transform duration-300 ${
                        isActive ? 'scale-110' : 'group-hover:scale-110'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="relative z-10">{item.label}</span>
                    {isActive && (
                      <>
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-light-green/10 to-transparent opacity-50" />
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-transparent via-light-green to-transparent rounded-full" />
                      </>
                    )}
                  </Link>
                );
              })}

              {/* Settings dropdown */}
              <div className="relative" ref={navMenuRef}>
                <button
                  type="button"
                  onClick={() => setNavMenuOpen((v) => !v)}
                  className={`
                    relative px-5 py-2.5 rounded-xl transition-all duration-300
                    flex items-center gap-2.5 body-sm font-tsukimi font-medium
                    group
                    ${
                      isSettingsActive
                        ? 'bg-gradient-to-br from-light-green/20 via-light-green/10 to-transparent text-light-green border border-light-green/40 shadow-lg shadow-light-green/10'
                        : 'text-iki-white/70 hover:text-iki-white hover:bg-iki-grey/40 border border-transparent hover:border-light-green/20'
                    }
                  `}
                >
                  <Settings
                    className={`w-4 h-4 transition-transform duration-300 ${
                      navMenuOpen || isSettingsActive ? 'scale-110' : 'group-hover:scale-110'
                    }`}
                  />
                  <span className="relative z-10">Settings</span>
                  <ChevronDown
                    className={`w-4 h-4 text-iki-white/60 transition-transform ${
                      navMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                  {isSettingsActive && (
                    <>
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-light-green/10 to-transparent opacity-50" />
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-transparent via-light-green to-transparent rounded-full" />
                    </>
                  )}
                </button>

                {navMenuOpen && settingsItems.length > 0 && (
                  <div className="absolute right-0 mt-2 w-56 glass rounded-xl border border-light-green/20 shadow-lg overflow-hidden z-50">
                    <div className="p-2">
                      {settingsItems.map((item) => {
                        const isActive =
                          pathname === item.href ||
                          (item.href === '/admin' && pathname?.startsWith('/admin')) ||
                          (item.href.startsWith('/security') && pathname?.startsWith(item.href));

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setNavMenuOpen(false)}
                            className={`w-full px-3 py-2 rounded-lg transition-colors flex items-center gap-2 body-sm font-tsukimi ${
                              isActive
                                ? 'bg-light-green/10 text-light-green'
                                : 'text-iki-white/80 hover:bg-iki-grey/50'
                            }`}
                          >
                            <span className="text-current">{item.icon}</span>
                            <span className="flex-1">{item.label}</span>
                            {isActive && <div className="w-1.5 h-1.5 rounded-full bg-light-green" />}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </nav>

            {/* Right: Actions & Profile */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Privacy Toggle */}
              <button
                onClick={() => {
                  // Allow disabling privacy mode only for superadmin (default safe behavior)
                  if (privacyMode && !isSuperadmin) {
                    return;
                  }
                  setPrivacyMode(!privacyMode);
                }}
                title={
                  privacyMode
                    ? isSuperadmin
                      ? 'Privacy mode is ON (click to reveal PII)'
                      : 'Privacy mode is ON (superadmin required to reveal PII)'
                    : 'Privacy mode is OFF (click to mask PII)'
                }
                className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 ${
                  privacyMode
                    ? 'bg-iki-grey/50 border-light-green/30 text-light-green'
                    : 'bg-red-500/15 border-red-500/40 text-red-300'
                } ${privacyMode && !isSuperadmin ? 'opacity-70 cursor-not-allowed' : 'hover:bg-iki-grey/70'}`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span className="text-xs font-tsukimi font-medium">
                  {privacyMode ? 'PII Masked' : 'PII Visible'}
                </span>
              </button>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-iki-grey/50 border border-light-green/20 hover:bg-iki-grey/70 hover:border-light-green/40 transition-all duration-300"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 text-iki-white" />
                ) : (
                  <Menu className="w-5 h-5 text-iki-white/80" />
                )}
              </button>

              {/* Profile Dropdown */}
              <ProfileDropdown />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] glass-enhanced border-l border-light-green/20 shadow-2xl overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-light-green/20">
                <div>
                  <h2 className="heading-sm font-goldplay text-iki-white">Navigation</h2>
                  <p className="text-xs text-iki-white/60 font-tsukimi mt-1">
                    {getPageTitle()}
                  </p>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-iki-grey/50 border border-light-green/20 hover:bg-iki-grey/70 transition-colors"
                >
                  <X className="w-5 h-5 text-iki-white" />
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="space-y-2">
                {navItems
                  .filter((item) => {
                    if (item.href === '/users') return can(RBAC_RESOURCES.USERS, RBAC_ACTIONS.READ);
                    if (item.href === '/generate') return can(RBAC_RESOURCES.GENERATE, RBAC_ACTIONS.READ);
                    if (item.href === '/notifications') return can(RBAC_RESOURCES.FCM, RBAC_ACTIONS.MANAGE);
                    return can(RBAC_RESOURCES.ADMIN, RBAC_ACTIONS.READ);
                  })
                  .map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href === '/users' && pathname?.startsWith('/users/'));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`
                        w-full px-4 py-3.5 rounded-xl transition-all duration-300
                        flex items-center gap-3 body-sm font-tsukimi font-medium
                        ${
                          isActive
                            ? 'bg-gradient-to-br from-light-green/20 via-light-green/10 to-transparent text-light-green border border-light-green/40 shadow-lg shadow-light-green/10'
                            : 'text-iki-white/80 hover:bg-iki-grey/50 hover:text-iki-white border border-transparent hover:border-light-green/20'
                        }
                      `}
                    >
                      <span className={`transition-transform ${isActive ? 'scale-110' : ''}`}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                      {isActive && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-light-green" />
                      )}
                    </Link>
                  );
                })}

                {settingsItems.length > 0 && (
                  <div className="pt-4 mt-4 border-t border-light-green/10">
                  <p className="px-1 pb-2 text-xs text-iki-white/50 font-tsukimi">Settings</p>
                  <div className="space-y-2">
                    {settingsItems.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        (item.href === '/admin' && pathname?.startsWith('/admin'));

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`
                            w-full px-4 py-3.5 rounded-xl transition-all duration-300
                            flex items-center gap-3 body-sm font-tsukimi font-medium
                            ${
                              isActive
                                ? 'bg-gradient-to-br from-light-green/20 via-light-green/10 to-transparent text-light-green border border-light-green/40 shadow-lg shadow-light-green/10'
                                : 'text-iki-white/80 hover:bg-iki-grey/50 hover:text-iki-white border border-transparent hover:border-light-green/20'
                            }
                          `}
                        >
                          <span className={`transition-transform ${isActive ? 'scale-110' : ''}`}>
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                          {isActive && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-light-green" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
                )}
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
