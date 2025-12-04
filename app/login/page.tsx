'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createAuthClient } from 'better-auth/react';
import { Lock, Mail, Shield, UserPlus } from 'lucide-react';

const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
});

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [needsMfa, setNeedsMfa] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);
  const [checkingUsers, setCheckingUsers] = useState(true);

  useEffect(() => {
    const checkUsers = async () => {
      try {
        const response = await fetch('/api/auth/check-users');
        const data = await response.json();
        setHasUsers(data.hasUsers);
        // If users exist, disable sign up
        if (data.hasUsers) {
          setIsSignUp(false);
        }
      } catch (err) {
        console.error('Failed to check users:', err);
        setHasUsers(false); // Default to allowing sign up if check fails
      } finally {
        setCheckingUsers(false);
      }
    };
    checkUsers();
  }, []);

  const redirectAfterAuth = () => {
    const redirectTo = searchParams.get('redirect') || '/';
    // Use window.location for a hard redirect to ensure it works
    window.location.href = redirectTo;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        // Handle sign-up
        const result = await authClient.signUp.email({
          email,
          password,
          name,
        });

        if (result.error) {
          setError(result.error.message || 'Failed to create account');
          setLoading(false);
          return;
        }

        // Sign-up successful, redirect
        redirectAfterAuth();
      } else {
        // Handle login
        if (needsMfa) {
          // Verify MFA code
          const result = await authClient.twoFactor.verify({
            code: mfaCode,
          });

          if (result.error) {
            setError(result.error.message || 'Invalid MFA code');
            setLoading(false);
            return;
          }

          redirectAfterAuth();
        } else {
          // Initial login
          const result = await authClient.signIn.email({
            email,
            password,
          });

          if (result.error) {
            if (result.error.code === 'TWO_FACTOR_REQUIRED') {
              setNeedsMfa(true);
            } else {
              setError(result.error.message || 'Invalid credentials');
            }
            setLoading(false);
            return;
          }

          // Login successful, redirect
          redirectAfterAuth();
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  if (checkingUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-blue">
        <div className="text-iki-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-blue p-6">
      <div className="w-full max-w-md">
        <div className="glass rounded-2xl p-8 border border-light-green/20">
          <div className="text-center mb-8">
            {/* Iki Logo */}
            <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center transform hover:scale-105 transition-transform">
              <img 
                src="/logo.png" 
                alt="Iki Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="heading-xl font-goldplay text-iki-white mb-2">
              {isSignUp ? 'Create Account' : 'Admin Login'}
            </h1>
            <p className="body-sm text-iki-white/60 font-tsukimi">
              {isSignUp 
                ? 'Create the first super admin account' 
                : 'Secure access to Iki Dashboard'}
            </p>
          </div>

          {/* Toggle between login and sign-up - only show if no users exist */}
          {!hasUsers && (
            <div className="mb-6 flex gap-2 p-1 rounded-lg bg-iki-grey/20 border border-light-green/10">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setError('');
                  setNeedsMfa(false);
                }}
                className={`flex-1 py-2 rounded-md body-sm font-tsukimi transition-all ${
                  !isSignUp
                    ? 'bg-light-green text-iki-brown font-semibold'
                    : 'text-iki-white/60 hover:text-iki-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setError('');
                  setNeedsMfa(false);
                }}
                className={`flex-1 py-2 rounded-md body-sm font-tsukimi transition-all ${
                  isSignUp
                    ? 'bg-light-green text-iki-brown font-semibold'
                    : 'text-iki-white/60 hover:text-iki-white'
                }`}
              >
                Sign Up
              </button>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="body-sm text-red-400 font-tsukimi">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {!needsMfa ? (
              <>
                {isSignUp && (
                  <div>
                    <label className="block body-sm text-iki-white/80 font-tsukimi mb-2">
                      Name
                    </label>
                    <div className="relative">
                      <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-iki-white/40" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-lg bg-iki-grey/30 border border-light-green/20 text-iki-white placeholder-iki-white/40 focus:outline-none focus:border-light-green/40 focus:ring-2 focus:ring-light-green/20 body-sm font-tsukimi"
                        placeholder="Your name"
                      />
                    </div>
                  </div>
                )}

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
                  {isSignUp && (
                    <p className="mt-1 body-xs text-iki-white/50 font-tsukimi">
                      Must be at least 8 characters
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div>
                <label className="block body-sm text-iki-white/80 font-tsukimi mb-2">
                  MFA Code
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-iki-white/40" />
                  <input
                    type="text"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    maxLength={6}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-iki-grey/30 border border-light-green/20 text-iki-white placeholder-iki-white/40 focus:outline-none focus:border-light-green/40 focus:ring-2 focus:ring-light-green/20 body-sm font-tsukimi text-center text-2xl tracking-widest"
                    placeholder="000000"
                  />
                </div>
                <p className="mt-2 body-xs text-iki-white/50 font-tsukimi text-center">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-light-green text-dark-blue font-goldplay font-semibold hover:bg-light-green/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading 
                ? (isSignUp ? 'Creating account...' : 'Signing in...') 
                : needsMfa 
                  ? 'Verify Code' 
                  : isSignUp 
                    ? 'Create Account' 
                    : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-dark-blue">
        <div className="text-iki-white">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

