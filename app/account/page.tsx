import AccessDenied from '@/components/AccessDenied';
import AccountProfileForm from '@/components/AccountProfileForm';
import AccountSecurity from '@/components/AccountSecurity';
import { auth } from '@/lib/auth';
import { getUserWithRBAC } from '@/lib/rbac';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

type PageProps = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AccountPage({ searchParams }: PageProps) {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session?.user) {
    redirect('/login?redirect=/account');
  }

  const me = await getUserWithRBAC(session.user.id);
  if (!me) {
    return <AccessDenied title="Account" message="Unable to load your account." />;
  }

  const name = me.name || null;
  const email = me.email as string;
  const legacyRole = me.role || '—';
  const twoFactorEnabled = Boolean(me.twoFactorEnabled);

  const awaitedSearchParams = await searchParams;
  const forceParam = awaitedSearchParams?.forcePasswordChange;
  const forcePasswordChange =
    typeof forceParam === 'string'
      ? forceParam === '1' || forceParam.toLowerCase() === 'true'
      : Array.isArray(forceParam)
      ? forceParam.some((v) => v === '1' || v.toLowerCase() === 'true')
      : false;

  return (
    <main className="page-container relative">
      <div className="container-standard relative z-10 space-y-6">
        <header className="space-y-2 max-w-3xl">
          <h1 className="heading-lg font-goldplay text-iki-white">My account</h1>
          <p className="body-sm text-iki-white/70">
            Manage your admin profile, security and see exactly which roles and permissions you have.
          </p>
          <div className="flex flex-wrap gap-2 body-2xs text-iki-white/60">
            <span className="px-3 py-1 rounded-full bg-iki-grey/40 border border-iki-white/10">
              {email}
            </span>
            <span className="px-3 py-1 rounded-full bg-iki-grey/40 border border-iki-white/10">
              Legacy role: {legacyRole}
            </span>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)] items-start">
          <AccountProfileForm initialName={name} initialEmail={email} />
          <AccountSecurity
            email={email}
            initialTwoFactorEnabled={twoFactorEnabled}
            forcePasswordChange={forcePasswordChange || !!me.mustChangePassword}
          />
        </div>

        <section className="card space-y-4 mt-2">
          <header className="space-y-1">
            <h2 className="heading-sm text-iki-white">Roles & permissions</h2>
            <p className="body-xs text-iki-white/60 max-w-2xl">
              This is a read-only view of what this admin account is allowed to do across Iki. Roles come
              from RBAC; permissions are the granular actions assigned to those roles and any overrides.
            </p>
          </header>

          <div className="space-y-4">
            <div>
              <h3 className="body-xs text-iki-white/60 mb-1">Roles</h3>
              {me.roles.length === 0 ? (
                <p className="body-sm text-iki-white/60">No roles assigned.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {me.roles.map((r) => (
                    <span
                      key={r.id}
                      className="px-3 py-1 rounded-full bg-light-green/15 border border-light-green/40 text-light-green body-xs font-medium"
                    >
                      {r.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="body-xs text-iki-white/60 mb-1">Permissions</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {me.permissions.roleBased.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-light-green/20 bg-iki-grey/40 px-3 py-2 body-xs text-iki-white/80"
                  >
                    <div className="font-semibold">
                      {p.resource}:{p.action}
                    </div>
                    {p.description && (
                      <div className="text-iki-white/60 mt-0.5">{p.description}</div>
                    )}
                  </div>
                ))}
                {me.permissions.roleBased.length === 0 && (
                  <p className="body-sm text-iki-white/60">No explicit permissions found.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
