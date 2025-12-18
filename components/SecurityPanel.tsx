'use client';

import { useEffect, useState } from 'react';

type SecuritySettingsState = {
  enforceTwoFactorForAll: boolean;
  loginAlertEnabled: boolean;
  loginAlertEmails: string[];
  ipAllowlistEnabled: boolean;
  ipAllowlist: string[];
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSpecial: boolean;
  passwordExpirationDays: number;
  forcePasswordChangeOnFirstLogin: boolean;
  maxActiveSessionsPerUser: number;
};

const DEFAULT_STATE: SecuritySettingsState = {
  enforceTwoFactorForAll: false,
  loginAlertEnabled: false,
  loginAlertEmails: [],
  ipAllowlistEnabled: false,
  ipAllowlist: [],
  passwordMinLength: 12,
  passwordRequireUppercase: true,
  passwordRequireNumber: true,
  passwordRequireSpecial: true,
  passwordExpirationDays: 0,
  forcePasswordChangeOnFirstLogin: false,
  maxActiveSessionsPerUser: 0,
};

export default function SecurityPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [settings, setSettings] = useState<SecuritySettingsState>(DEFAULT_STATE);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/admin/security/settings', { cache: 'no-store' });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load security settings');
        }
        const json = await res.json();
        if (cancelled) return;

        setSettings({
          enforceTwoFactorForAll: Boolean(json.enforceTwoFactorForAll),
          loginAlertEnabled: Boolean(json.loginAlertEnabled),
          loginAlertEmails: Array.isArray(json.loginAlertEmails)
            ? json.loginAlertEmails
            : [],
          ipAllowlistEnabled: Boolean(json.ipAllowlistEnabled),
          ipAllowlist: Array.isArray(json.ipAllowlist) ? json.ipAllowlist : [],
          passwordMinLength: Number(json.passwordMinLength) || DEFAULT_STATE.passwordMinLength,
          passwordRequireUppercase:
            typeof json.passwordRequireUppercase === 'boolean'
              ? json.passwordRequireUppercase
              : DEFAULT_STATE.passwordRequireUppercase,
          passwordRequireNumber:
            typeof json.passwordRequireNumber === 'boolean'
              ? json.passwordRequireNumber
              : DEFAULT_STATE.passwordRequireNumber,
          passwordRequireSpecial:
            typeof json.passwordRequireSpecial === 'boolean'
              ? json.passwordRequireSpecial
              : DEFAULT_STATE.passwordRequireSpecial,
          passwordExpirationDays:
            typeof json.passwordExpirationDays === 'number'
              ? json.passwordExpirationDays
              : DEFAULT_STATE.passwordExpirationDays,
          forcePasswordChangeOnFirstLogin:
            typeof json.forcePasswordChangeOnFirstLogin === 'boolean'
              ? json.forcePasswordChangeOnFirstLogin
              : DEFAULT_STATE.forcePasswordChangeOnFirstLogin,
          maxActiveSessionsPerUser:
            typeof json.maxActiveSessionsPerUser === 'number'
              ? json.maxActiveSessionsPerUser
              : DEFAULT_STATE.maxActiveSessionsPerUser,
        });
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load security settings');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/admin/security/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...settings,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json.error || 'Failed to update security settings');
      }

      setSuccess('Security settings updated');
    } catch (err: any) {
      setError(err?.message || 'Failed to update security settings');
    } finally {
      setSaving(false);
    }
  };

  const loginAlertEmailsText = settings.loginAlertEmails.join('\n');
  const ipAllowlistText = settings.ipAllowlist.join('\n');

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="heading-lg font-goldplay text-iki-white">Security configuration</h1>
        <p className="body-sm text-iki-white/70">
          Control global security policies for the iki-gen admin: 2FA, password rules, login
          alerts, IP allowlisting and session limits.
        </p>
      </header>

      <form onSubmit={handleSave} className="space-y-6">
        {error && (
          <div className="card border border-red-500/40 bg-red-500/10 text-red-100 body-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="card border border-light-green/40 bg-light-green/10 text-light-green body-sm">
            {success}
          </div>
        )}

        <section className="card space-y-4">
          <div>
            <h2 className="heading-sm text-iki-white">Authentication hardening</h2>
            <p className="body-xs text-iki-white/60">
              Require stronger authentication controls across all admin accounts.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <input
              id="enforce2fa"
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-light-green/40 bg-iki-grey/40 text-light-green focus:ring-light-green/50"
              checked={settings.enforceTwoFactorForAll}
              onChange={(e) =>
                setSettings((s) => ({ ...s, enforceTwoFactorForAll: e.target.checked }))
              }
              disabled={loading || saving}
            />
            <label htmlFor="enforce2fa" className="space-y-1 cursor-pointer">
              <span className="body-sm text-iki-white font-medium">
                Enforce two-factor authentication for all admins
              </span>
              <p className="body-xs text-iki-white/60">
                When enabled, 2FA should be turned on for every admin account. You can roll out
                enforcement gradually by monitoring 2FA status in account settings.
              </p>
            </label>
          </div>

          <div className="flex items-start gap-3">
            <input
              id="forcePasswordChange"
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-light-green/40 bg-iki-grey/40 text-light-green focus:ring-light-green/50"
              checked={settings.forcePasswordChangeOnFirstLogin}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  forcePasswordChangeOnFirstLogin: e.target.checked,
                }))
              }
              disabled={loading || saving}
            />
            <label htmlFor="forcePasswordChange" className="space-y-1 cursor-pointer">
              <span className="body-sm text-iki-white font-medium">
                Force password change on first login
              </span>
              <p className="body-xs text-iki-white/60">
                New admins created from the superadmin panel will be required to change their
                password after their first successful sign-in.
              </p>
            </label>
          </div>
        </section>

        <section className="card space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="heading-sm text-iki-white">Password policy</h2>
              <p className="body-xs text-iki-white/60">
                Define the minimum complexity requirements for admin passwords.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="body-xs text-iki-white/70">Minimum length</label>
              <input
                type="number"
                min={8}
                max={128}
                value={settings.passwordMinLength}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    passwordMinLength: Number(e.target.value) || 8,
                  }))
                }
                className="input-standard"
                disabled={loading || saving}
              />
              <p className="body-xs text-iki-white/50">
                Recommended: at least 12 characters for admins.
              </p>
            </div>

            <div className="space-y-2">
              <label className="body-xs text-iki-white/70">Password expiration (days)</label>
              <input
                type="number"
                min={0}
                max={3650}
                value={settings.passwordExpirationDays}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    passwordExpirationDays: Math.max(0, Number(e.target.value) || 0),
                  }))
                }
                className="input-standard"
                disabled={loading || saving}
              />
              <p className="body-xs text-iki-white/50">
                Set to 0 to disable forced password rotation.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-light-green/40 bg-iki-grey/40 text-light-green focus:ring-light-green/50"
                checked={settings.passwordRequireUppercase}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, passwordRequireUppercase: e.target.checked }))
                }
                disabled={loading || saving}
              />
              <span className="body-xs text-iki-white/80">Require uppercase letters</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-light-green/40 bg-iki-grey/40 text-light-green focus:ring-light-green/50"
                checked={settings.passwordRequireNumber}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, passwordRequireNumber: e.target.checked }))
                }
                disabled={loading || saving}
              />
              <span className="body-xs text-iki-white/80">Require numbers</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-light-green/40 bg-iki-grey/40 text-light-green focus:ring-light-green/50"
                checked={settings.passwordRequireSpecial}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, passwordRequireSpecial: e.target.checked }))
                }
                disabled={loading || saving}
              />
              <span className="body-xs text-iki-white/80">Require special characters</span>
            </label>
          </div>
        </section>

        <section className="card space-y-4">
          <div>
            <h2 className="heading-sm text-iki-white">Login alerts</h2>
            <p className="body-xs text-iki-white/60">
              Receive email notifications whenever someone signs into the iki-gen admin.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <input
              id="loginAlerts"
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-light-green/40 bg-iki-grey/40 text-light-green focus:ring-light-green/50"
              checked={settings.loginAlertEnabled}
              onChange={(e) =>
                setSettings((s) => ({ ...s, loginAlertEnabled: e.target.checked }))
              }
              disabled={loading || saving}
            />
            <label htmlFor="loginAlerts" className="space-y-1 cursor-pointer">
              <span className="body-sm text-iki-white font-medium">Enable login email alerts</span>
              <p className="body-xs text-iki-white/60">
                When enabled, each successful admin login will be logged and can trigger an email
                notification to the addresses below.
              </p>
            </label>
          </div>

          <div className="space-y-2">
            <label className="body-xs text-iki-white/70">Alert recipients</label>
            <textarea
              rows={3}
              className="w-full rounded-xl bg-iki-grey/30 border border-light-green/20 text-iki-white placeholder-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/40 px-3 py-2 body-sm"
              placeholder="one@example.com&#10;another@example.com"
              value={loginAlertEmailsText}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  loginAlertEmails: e.target.value
                    .split('\n')
                    .map((v) => v.trim())
                    .filter(Boolean),
                }))
              }
              disabled={loading || saving || !settings.loginAlertEnabled}
            />
            <p className="body-xs text-iki-white/50">
              One email address per line. Use your own address to be notified when anyone signs in.
            </p>
          </div>
        </section>

        <section className="card space-y-4">
          <div>
            <h2 className="heading-sm text-iki-white">IP allowlist & sessions</h2>
            <p className="body-xs text-iki-white/60">
              Restrict where admins can sign in from and how many active sessions they may have.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <input
              id="ipAllowlist"
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-light-green/40 bg-iki-grey/40 text-light-green focus:ring-light-green/50"
              checked={settings.ipAllowlistEnabled}
              onChange={(e) =>
                setSettings((s) => ({ ...s, ipAllowlistEnabled: e.target.checked }))
              }
              disabled={loading || saving}
            />
            <label htmlFor="ipAllowlist" className="space-y-1 cursor-pointer">
              <span className="body-sm text-iki-white font-medium">
                Enable IP allowlist for admin access
              </span>
              <p className="body-xs text-iki-white/60">
                When enabled, only requests coming from the IP ranges below should be allowed to
                access the admin. Enforcement can be wired up at the gateway or middleware layer.
              </p>
            </label>
          </div>

          <div className="space-y-2">
            <label className="body-xs text-iki-white/70">Allowed IPs / CIDR ranges</label>
            <textarea
              rows={4}
              className="w-full rounded-xl bg-iki-grey/30 border border-light-green/20 text-iki-white placeholder-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/40 px-3 py-2 body-sm"
              placeholder="203.0.113.5&#10;203.0.113.0/24"
              value={ipAllowlistText}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  ipAllowlist: e.target.value
                    .split('\n')
                    .map((v) => v.trim())
                    .filter(Boolean),
                }))
              }
              disabled={loading || saving || !settings.ipAllowlistEnabled}
            />
            <p className="body-xs text-iki-white/50">
              One IP or CIDR range per line. Enforcement can also be mirrored in your cloud
              firewall for defense-in-depth.
            </p>
          </div>

          <div className="space-y-2">
            <label className="body-xs text-iki-white/70">Maximum active sessions per user</label>
            <input
              type="number"
              min={0}
              max={1000}
              value={settings.maxActiveSessionsPerUser}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  maxActiveSessionsPerUser: Math.max(0, Number(e.target.value) || 0),
                }))
              }
              className="input-standard"
              disabled={loading || saving}
            />
            <p className="body-xs text-iki-white/50">
              Set to 0 for unlimited sessions. This is surfaced on the active sessions page and can
              be enforced server-side.
            </p>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-light-green text-iki-brown font-semibold body-sm shadow-lg shadow-light-green/20 hover:shadow-light-green/30 hover:bg-emerald-300 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading || saving}
          >
            {saving ? 'Saving…' : 'Save security settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

