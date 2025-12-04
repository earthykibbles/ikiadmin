'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Settings, Sparkles, Shield } from 'lucide-react';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import AttentionItems from '@/components/AttentionItems';
import ProfileDropdown from '@/components/ProfileDropdown';

export default function Home() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const res = await fetch('/api/admin/check-role');
        if (res.ok) {
          const data = await res.json();
          setUserRole(data.role);
        }
      } catch (err) {
        console.error('Failed to check role:', err);
      } finally {
        setLoading(false);
      }
    };
    checkRole();
  }, []);

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
            <div>
              <h1 className="heading-xl font-goldplay text-iki-white">
                Iki Dashboard
              </h1>
              <p className="body-sm text-iki-white/60 font-tsukimi mt-0.5">
                Analytics & Insights
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/generate"
              className="px-4 py-2 rounded-full bg-iki-grey/50 border border-light-green/20 hover:bg-iki-grey/70 transition-colors flex items-center gap-2 body-sm text-iki-white/80 font-tsukimi hover:border-light-green/40"
            >
              <Sparkles className="w-4 h-4" />
              Content Generator
            </Link>
            <Link
              href="/users"
              className="px-4 py-2 rounded-full bg-iki-grey/50 border border-light-green/20 hover:bg-iki-grey/70 transition-colors flex items-center gap-2 body-sm text-iki-white/80 font-tsukimi hover:border-light-green/40"
            >
              <Users className="w-4 h-4" />
              Users
            </Link>
            <Link
              href="/admin"
              className="px-4 py-2 rounded-full bg-iki-grey/50 border border-light-green/20 hover:bg-iki-grey/70 transition-colors flex items-center gap-2 body-sm text-iki-white/80 font-tsukimi hover:border-light-green/40"
            >
              <Settings className="w-4 h-4" />
              Admin Dashboard
            </Link>
            <Link
              href="/rbac"
              className="px-4 py-2 rounded-full bg-iki-grey/50 border border-light-green/20 hover:bg-iki-grey/70 transition-colors flex items-center gap-2 body-sm text-iki-white/80 font-tsukimi hover:border-light-green/40"
            >
              <Shield className="w-4 h-4" />
              RBAC
            </Link>
            {!loading && userRole === 'superadmin' && (
              <Link
                href="/superadmin"
                className="px-4 py-2 rounded-full bg-iki-grey/50 border border-light-green/20 hover:bg-iki-grey/70 transition-colors flex items-center gap-2 body-sm text-iki-white/80 font-tsukimi hover:border-light-green/40"
              >
                <Shield className="w-4 h-4" />
                Super Admin
              </Link>
            )}
            <ProfileDropdown />
            <div className="px-4 py-2 rounded-full bg-iki-grey/50 border border-light-green/20 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-light-green animate-pulse"></div>
              <span className="body-sm text-iki-white/60 font-tsukimi">Live</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10 relative z-10">
        {/* Matters Requiring Attention */}
        <div className="mb-12">
          <AttentionItems />
        </div>

        {/* Analytics Dashboard */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="heading-lg font-goldplay text-iki-white mb-2">Analytics Dashboard</h2>
              <p className="body-md text-iki-white/60 font-tsukimi">Aggregated user data and insights</p>
            </div>
          </div>
          <AnalyticsDashboard key="analytics-dashboard" />
        </div>
      </div>
    </main>
  );
}
