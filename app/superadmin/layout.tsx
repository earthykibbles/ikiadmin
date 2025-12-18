import AccessDenied from '@/components/AccessDenied';
import { auth } from '@/lib/auth';
import { isSuperadminUser } from '@/lib/rbac';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session?.user) {
    redirect('/login');
  }

  const ok = await isSuperadminUser(session.user.id);
  if (!ok) {
    return <AccessDenied title="Super" message="Superadmin access required." />;
  }

  return children;
}
