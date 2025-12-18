'use client';

import { createAuthClient } from 'better-auth/react';
import { KeyRound, ShieldCheck, ShieldOff, Smartphone, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePermissions } from '@/components/PermissionsProvider';
import ChangePasswordModal from './ChangePasswordModal';

const authClient = createAuthClient();

interface AccountSecurityProps {
  email: string;
  initialTwoFactorEnabled?: boolean;
  forcePasswordChange?: boolean;
}

interface Enable2FAResponse {
  totpURI?: string;
  backupCodes?: string[];
}

export default function AccountSecurity({
  email,
  initialTwoFactorEnabled,
  forcePasswordChange,
}: AccountSecurityProps) {
  const { me } = usePermissions();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(
    me?.user?.twoFactorEnabled ?? initialTwoFactorEnabled ?? false
  );
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [step, setStep] = useState<'idle' | 'enabling' | 'verify' | 'disabling'>('idle');
  const [totpURI, setTotpURI] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    const enabledFromContext = me?.user?.twoFactorEnabled;
    setTwoFactorEnabled(enabledFromContext ?? initialTwoFactorEnabled ?? false);
  }, [me?.user?.twoFactorEnabled, initialTwoFactorEnabled]);

  useEffect(() => {
    if (forcePasswordChange) {
      setShowChangePassword(true);
    }
  }, [forcePasswordChange]);

  const resetState = () => {
    setPassword('');
    setMfaCode('');
    setTotpURI(null);
    setBackupCodes(null);
    setError(null);
    setSuccess(null);
  };

  const startEnable = () => {
    resetState();
    setStep('enabling');
  };

  const startDisable = () => {
    resetState();
    setStep('disabling');
  };

  async function handleEnable(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await (authClient as any).twoFactor.enable({
        password,
        issuer: 'Iki Admin',
      });

      if (result?.error) {
        throw new Error(result.error?.message || 'Failed to start 2FA setup');
      }

      const data = (result?.data || {}) as Enable2FAResponse;
      if (!data.totpURI) {
        throw new Error('2FA setup did not return a TOTP URI');
      }

      setTotpURI(data.totpURI);
      setBackupCodes(data.backupCodes || null);
      setStep('verify');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start 2FA setup';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyTotp(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await (authClient as any).twoFactor.verifyTotp({
        code: mfaCode,
        trustDevice: true,
      });

      if (result?.error) {
        throw new Error(result.error?.message || 'Invalid verification code');
      }

      setTwoFactorEnabled(true);
      setSuccess('Two-factor authentication enabled');
      setStep('idle');
      setPassword('');
      setMfaCode('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to verify 2FA code';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await (authClient as any).twoFactor.disable({
        password,
      });

      if (result?.error) {
        throw new Error(result.error?.message || 'Failed to disable 2FA');
      }

      setTwoFactorEnabled(false);
      setSuccess('Two-factor authentication disabled');
      setStep('idle');
      setPassword('');
      setMfaCode('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to disable 2FA';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const render2FAContent = () => {
    if (twoFactorEnabled && step === 'idle') {
      return (
        <div className="space-y-3">
          <p className="body-xs text-iki-white/70 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-light-green" />
            Two-factor is currently <span className="font-semibold text-light-green">enabled</span> on your
            account.
          </p>
          <p className="body-2xs text-iki-white/60">
            When you sign in, you will be asked for a 6-digit code from your authenticator app after your
            password.
          </p>
          <button
            type="button"
            className="btn-secondary body-xs flex items-center gap-2"
            onClick={startDisable}
          >
            <ShieldOff className="w-4 h-4" />
            Turn off 2FA
          </button>
        </div>
      );
    }

    if (step === 'enabling') {
      return (
        <form onSubmit={handleEnable} className="space-y-3">
          <p className="body-2xs text-iki-white/60">
            Confirm your password to start two-factor setup. We will generate a QR code and backup codes
            for you.
          </p>
          <div>
            <label className="block body-xs text-iki-white/70 mb-1">Current password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-standard w-full"
              placeholder="••••••••"
              required
              minLength={8}
              disabled={loading}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="btn-ghost body-xs"
              onClick={() => {
                resetState();
                setStep('idle');
              }}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary body-xs px-4" disabled={loading}>
              {loading ? 'Starting…' : 'Continue'}
            </button>
          </div>
        </form>
      );
    }

    if (step === 'verify' && totpURI) {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
        totpURI
      )}`;

      return (
        <form onSubmit={handleVerifyTotp} className="space-y-3">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="shrink-0 rounded-xl border border-light-green/30 bg-iki-grey/40 p-3">
              <img
                src={qrUrl}
                alt="Scan with your authenticator app"
                className="w-40 h-40 object-contain"
              />
            </div>
            <div className="space-y-2">
              <p className="body-xs text-iki-white/80 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-light-green" />
                Scan this QR code with your authenticator app (Google Authenticator, 1Password, etc.).
              </p>
              <p className="body-2xs text-iki-white/60">
                Then enter the 6-digit code from the app to finish enabling 2FA.
              </p>
              {backupCodes && backupCodes.length > 0 && (
                <div className="mt-2">
                  <p className="body-2xs text-iki-white/60 mb-1">Backup codes (store these safely):</p>
                  <div className="grid grid-cols-2 gap-1 body-2xs text-iki-white/80">
                    {backupCodes.map((code) => (
                      <span key={code} className="rounded bg-iki-grey/60 px-2 py-1 tracking-widest">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block body-xs text-iki-white/70 mb-1">Authenticator code</label>
            <input
              type="text"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="input-standard w-full max-w-xs text-center tracking-[0.3em] text-lg"
              placeholder="000000"
              required
              disabled={loading}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className="btn-ghost body-xs"
              onClick={() => {
                resetState();
                setStep('idle');
              }}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary body-xs px-4" disabled={loading}>
              {loading ? 'Verifying…' : 'Verify & enable'}
            </button>
          </div>
        </form>
      );
    }

    if (step === 'disabling') {
      return (
        <form onSubmit={handleDisable} className="space-y-3">
          <p className="body-2xs text-iki-white/60">
            Turning off 2FA makes your admin account less secure. You will only need your password to
            sign in.
          </p>
          <div>
            <label className="block body-xs text-iki-white/70 mb-1">Confirm password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-standard w-full"
              placeholder="••••••••"
              required
              minLength={8}
              disabled={loading}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="btn-ghost body-xs"
              onClick={() => {
                resetState();
                setStep('idle');
              }}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn-secondary body-xs px-4" disabled={loading}>
              {loading ? 'Disabling…' : 'Turn off 2FA'}
            </button>
          </div>
        </form>
      );
    }

    // Default: show call-to-action to enable 2FA
    return (
      <div className="space-y-3">
        <p className="body-xs text-iki-white/70 flex items-center gap-2">
          <ShieldOff className="w-4 h-4 text-iki-white/70" />
          Two-factor is currently <span className="font-semibold">disabled</span> on your account.
        </p>
        <p className="body-2xs text-iki-white/60">
          We strongly recommend enabling 2FA using an authenticator app to add an extra layer of security
          to your admin access.
        </p>
        <button
          type="button"
          className="btn-primary body-xs flex items-center gap-2"
          onClick={startEnable}
        >
          <ShieldCheck className="w-4 h-4" />
          Set up 2FA
        </button>
      </div>
    );
  };

  return (
    <section className="card space-y-5 h-full">
      <header className="space-y-1">
        <h2 className="heading-sm text-iki-white">Security</h2>
        <p className="body-xs text-iki-white/60">
          Manage your password and two-factor authentication for this admin account.
        </p>
      </header>

      <div className="space-y-4">
        {forcePasswordChange && (
          <div className="rounded-xl border border-orange-400/40 bg-orange-500/15 px-3 py-2">
            <p className="body-xs text-orange-50">
              Your administrator requires you to change your password before continuing to use the
              dashboard.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <p className="body-xs text-iki-white/80 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-iki-white/70" />
            Password
          </p>
          <p className="body-2xs text-iki-white/60">
            Your password is used together with your email ({email}) to sign in.
          </p>
          <button
            type="button"
            className="btn-secondary body-xs flex items-center gap-2"
            onClick={() => setShowChangePassword(true)}
          >
            <KeyRound className="w-4 h-4" />
            Change password
          </button>
        </div>

        <div className="border-t border-iki-white/10 pt-4 space-y-3">
          <p className="body-xs text-iki-white/80 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-iki-white/70" />
            Two-factor authentication (authenticator app)
          </p>
          {render2FAContent()}
        </div>

        <div className="border-t border-iki-white/10 pt-3 space-y-2">
          <p className="body-xs text-iki-white/80 flex items-center gap-2">
            <Mail className="w-4 h-4 text-iki-white/70" />
            Email security
          </p>
          <p className="body-2xs text-iki-white/60">
            Login verification emails and alerts are handled by the auth system. Additional email-based
            2FA flows can be wired up later if needed.
          </p>
        </div>

        {error && <p className="body-xs text-red-400">{error}</p>}
        {success && <p className="body-xs text-light-green">{success}</p>}
      </div>

      <ChangePasswordModal isOpen={showChangePassword} onClose={() => setShowChangePassword(false)} />
    </section>
  );
}
