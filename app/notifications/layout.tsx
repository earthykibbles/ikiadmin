import AccessDenied from '@/components/AccessDenied';
import { auth } from '@/lib/auth';
import { ACTIONS, RESOURCE_TYPES, hasPermission } from '@/lib/rbac';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function NotificationsLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session?.user) {
    redirect('/login');
  }

  const ok = await hasPermission(session.user.id, RESOURCE_TYPES.FCM, ACTIONS.MANAGE);
  if (!ok) {
    return (
      <AccessDenied
        title="Notifications"
        message="You don't have permission to access notifications controls."
      />
    );
  }

  return children;
}
