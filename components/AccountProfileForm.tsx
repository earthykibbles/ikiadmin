'use client';

import { createAuthClient } from 'better-auth/react';
import { Phone, Building2, IdCard } from 'lucide-react';
import { useEffect, useState } from 'react';

const authClient = createAuthClient();

interface AccountProfileFormProps {
  initialName: string | null;
  initialEmail: string;
}

interface ProfileResponse {
  fullName: string;
  phone: string;
  organization: string;
  jobTitle: string;
}

export default function AccountProfileForm({ initialName, initialEmail }: AccountProfileFormProps) {
  const [profile, setProfile] = useState<ProfileResponse>({
    fullName: initialName || '',
    phone: '',
    organization: '',
    jobTitle: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        setLoading(true);
        const res = await fetch('/api/account/profile', { cache: 'no-store' });
        if (!res.ok) {
          // If this fails, fall back to basic name/email only
          console.error('Failed to load admin profile');
          return;
        }
        const json = (await res.json()) as ProfileResponse;
        if (!cancelled) {
          setProfile({
            fullName: json.fullName || initialName || '',
            phone: json.phone || '',
            organization: json.organization || '',
            jobTitle: json.jobTitle || '',
          });
        }
      } catch (err) {
        console.error('Error loading admin profile', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [initialName]);

  const handleChange = (field: keyof ProfileResponse) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setProfile((prev) => ({ ...prev, [field]: value }));
    };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const body = {
        fullName: profile.fullName,
        phone: profile.phone,
        organization: profile.organization,
        jobTitle: profile.jobTitle,
      };

      // Save extended profile fields
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = (await res.json()) as { error?: string } | { success?: boolean };
      if (!res.ok) {
        throw new Error((json as any)?.error || 'Failed to update profile');
      }

      // Update primary display name in Better Auth if it changed
      const cleanedName = profile.fullName.trim();
      if (cleanedName && cleanedName !== (initialName || '')) {
        const result = await authClient.updateUser({ name: cleanedName });
        if ((result as any)?.error) {
          throw new Error((result as any).error?.message || 'Failed to update account name');
        }
      }

      setSuccess('Profile updated');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card space-y-5 h-full">
      <header className="space-y-1">
        <h2 className="heading-sm text-iki-white">Profile & contact</h2>
        <p className="body-xs text-iki-white/60">
          Manage your admin profile, contact details and organization info.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3">
          <div>
            <label className="block body-xs text-iki-white/70 mb-1">Full name</label>
            <input
              type="text"
              value={profile.fullName}
              onChange={handleChange('fullName')}
              placeholder="Your name"
              className="input-standard w-full"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block body-xs text-iki-white/70 mb-1">Primary email</label>
            <input
              type="email"
              value={initialEmail}
              readOnly
              className="input-standard w-full opacity-80 cursor-not-allowed bg-iki-grey/40 border-iki-white/10"
            />
            <p className="body-2xs text-iki-white/50 mt-1">
              Email changes are handled via the auth system to keep things secure.
            </p>
          </div>
        </div>

        <div className="border-t border-iki-white/10 pt-4 space-y-3">
          <div>
            <label className="block body-xs text-iki-white/70 mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-iki-white/60" />
              Phone number
            </label>
            <input
              type="tel"
              value={profile.phone}
              onChange={handleChange('phone')}
              placeholder="Optional contact number"
              className="input-standard w-full"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block body-xs text-iki-white/70 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-iki-white/60" />
              Organization name
            </label>
            <input
              type="text"
              value={profile.organization}
              onChange={handleChange('organization')}
              placeholder="Company or organization"
              className="input-standard w-full"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block body-xs text-iki-white/70 mb-1 flex items-center gap-1.5">
              <IdCard className="w-3.5 h-3.5 text-iki-white/60" />
              Role / job title
            </label>
            <input
              type="text"
              value={profile.jobTitle}
              onChange={handleChange('jobTitle')}
              placeholder="e.g. Wellness lead, HR, Founder"
              className="input-standard w-full"
              disabled={saving}
            />
          </div>
        </div>

        {error && <p className="body-xs text-red-400">{error}</p>}
        {success && <p className="body-xs text-light-green">{success}</p>}

        <div className="flex items-center justify-between pt-1">
          <p className="body-2xs text-iki-white/50">
            These details are used to personalize admin tools and communications.
          </p>
          <button
            type="submit"
            className="btn-primary px-4 py-2 body-xs font-semibold"
            disabled={saving || loading}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </section>
  );
}
