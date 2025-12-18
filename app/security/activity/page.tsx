'use client';

import AccessDenied from '@/components/AccessDenied';
import ActivityLogPanel from '@/components/ActivityLogPanel';
import { usePermissions } from '@/components/PermissionsProvider';
import { RBAC_ACTIONS, RBAC_RESOURCES } from '@/lib/permissions';

export default function SecurityActivityPage() {
  const { loading, can } = usePermissions();
  const allowed = can(RBAC_RESOURCES.SECURITY, RBAC_ACTIONS.READ);

  if (!loading && !allowed) {
    return <AccessDenied title="Activity log" message="You do not have permission to view the activity log." />;
  }

  return (
    <main className="page-container relative">
      <div className="container-standard relative z-10">
        <ActivityLogPanel />
      </div>
    </main>
  );
}

