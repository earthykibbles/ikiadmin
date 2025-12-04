'use client';

import UsersList from '@/components/UsersList';
import { Home, Users, Settings, Sparkles } from 'lucide-react';
import Link from 'next/link';
import ProfileDropdown from '@/components/ProfileDropdown';

export default function UsersPage() {
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
              <h1 className="heading-xl font-goldplay bg-gradient-to-r from-iki-brown via-[#f5e6b8] to-iki-brown bg-clip-text text-transparent">
                Iki Dashboard
              </h1>
              <p className="body-sm text-iki-white/60 font-tsukimi mt-0.5">
                Admin Management Portal
              </p>
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
              href="/admin"
              className="px-4 py-2 rounded-full bg-iki-grey/50 border border-light-green/20 hover:bg-iki-grey/70 transition-colors flex items-center gap-2 body-sm text-iki-white/80 font-tsukimi hover:border-light-green/40"
            >
              <Settings className="w-4 h-4" />
              Admin Dashboard
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
        <UsersList />
      </div>
    </main>
  );
}

