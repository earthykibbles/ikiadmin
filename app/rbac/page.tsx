'use client';

import { useState, useEffect } from 'react';
import { Home, Users, Shield, Settings, Sparkles, Key, UserCheck, X, Plus, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';
import ProfileDropdown from '@/components/ProfileDropdown';
import RBACDashboard from '@/components/RBACDashboard';

export default function RBACPage() {
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
                RBAC Management
              </h1>
              <p className="body-sm text-iki-white/60 font-tsukimi mt-0.5">
                Role-Based Access Control Dashboard
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
              Admin
            </Link>
            <ProfileDropdown />
            <div className="px-4 py-2 rounded-full bg-iki-grey/50 border border-light-green/20">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-light-green" />
                <span className="body-sm text-iki-white/60 font-tsukimi">RBAC Mode</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10 relative z-10">
        <RBACDashboard />
      </div>
    </main>
  );
}

