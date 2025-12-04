'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createAuthClient } from 'better-auth/react';
import { UserPlus, Mail, Lock, Shield, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
});

export default function SuperAdminPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'superadmin'>('admin');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Check if user is superadmin (this should be done server-side in production)
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await authClient.getSession();
        if (session?.data?.user) {
          // Verify role from API
          const res = await fetch('/api/admin/check-role');
          if (res.ok) {
            const data = await res.json();
            if (data.role === 'superadmin') {
              setIsAuthorized(true);
            }
          }
        }
      } catch (err) {
        console.error('Auth check failed:', err);
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch('/api/admin/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create admin');
      }

      setSuccess(true);
      setEmail('');
      setPassword('');
      setName('');
      setRole('admin');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-iki-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-iki-white">Unauthorized</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen relative">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-light-green/10">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-4">
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
                  Super Admin Portal
                </p>
              </div>
            </Link>
          </div>
          <Link
            href="/"
            className="px-4 py-2 rounded-full bg-iki-grey/50 border border-light-green/20 hover:bg-iki-grey/70 transition-colors flex items-center gap-2 body-sm text-iki-white/80 font-tsukimi hover:border-light-green/40"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="max-w-2xl mx-auto">
          <div className="glass rounded-2xl p-8 border border-light-green/20">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-iki-grey/50 border border-light-green/20">
                <UserPlus className="w-8 h-8 text-light-green" />
              </div>
              <h1 className="heading-xl font-goldplay text-iki-white mb-2">
                Create Admin Account
              </h1>
              <p className="body-sm text-iki-white/60 font-tsukimi">
                Create credentials for admin personnel
              </p>
            </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              <p className="body-sm text-red-400 font-tsukimi">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <p className="body-sm text-green-400 font-tsukimi">
                Admin account created successfully!
              </p>
            </div>
          )}

          <form onSubmit={handleCreateAdmin} className="space-y-6">
            <div>
              <label className="block body-sm text-iki-white/80 font-tsukimi mb-2">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg bg-iki-grey/30 border border-light-green/20 text-iki-white placeholder-iki-white/40 focus:outline-none focus:border-light-green/40 focus:ring-2 focus:ring-light-green/20 body-sm font-tsukimi"
                placeholder="Admin Name"
              />
            </div>

            <div>
              <label className="block body-sm text-iki-white/80 font-tsukimi mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-iki-white/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-iki-grey/30 border border-light-green/20 text-iki-white placeholder-iki-white/40 focus:outline-none focus:border-light-green/40 focus:ring-2 focus:ring-light-green/20 body-sm font-tsukimi"
                  placeholder="admin@iki.app"
                />
              </div>
            </div>

            <div>
              <label className="block body-sm text-iki-white/80 font-tsukimi mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-iki-white/40" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-iki-grey/30 border border-light-green/20 text-iki-white placeholder-iki-white/40 focus:outline-none focus:border-light-green/40 focus:ring-2 focus:ring-light-green/20 body-sm font-tsukimi"
                  placeholder="••••••••"
                />
              </div>
              <p className="mt-1 body-xs text-iki-white/50 font-tsukimi">
                Minimum 8 characters
              </p>
            </div>

            <div>
              <label className="block body-sm text-iki-white/80 font-tsukimi mb-2">
                Role
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-iki-white/40" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'superadmin')}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-iki-grey/30 border border-light-green/20 text-iki-white focus:outline-none focus:border-light-green/40 focus:ring-2 focus:ring-light-green/20 body-sm font-tsukimi appearance-none"
                >
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-light-green text-dark-blue font-goldplay font-semibold hover:bg-light-green/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Admin Account'}
            </button>
          </form>
          </div>
        </div>
      </div>
    </main>
  );
}

