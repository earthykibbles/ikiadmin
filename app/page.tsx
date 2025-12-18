import AccessDenied from '@/components/AccessDenied';
import { auth } from '@/lib/auth';
import { ACTIONS, RESOURCE_TYPES, hasPermission } from '@/lib/rbac';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Home() {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session?.user) {
    redirect('/login');
  }

  const userId = session.user.id;

  if (await hasPermission(userId, RESOURCE_TYPES.ADMIN, ACTIONS.READ)) {
    redirect('/admin');
  }
  if (await hasPermission(userId, RESOURCE_TYPES.USERS, ACTIONS.READ)) {
    redirect('/users');
  }
  if (await hasPermission(userId, RESOURCE_TYPES.GENERATE, ACTIONS.READ)) {
    redirect('/generate');
  }
  if (await hasPermission(userId, RESOURCE_TYPES.FCM, ACTIONS.MANAGE)) {
    redirect('/notifications');
  }

  return <AccessDenied title="Iki Gen" message="No accessible pages for your role." />;
}
