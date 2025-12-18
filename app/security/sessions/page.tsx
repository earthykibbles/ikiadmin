'use client';

import AccessDenied from '@/components/AccessDenied';
import ActiveSessionsPanel from '@/components/ActiveSessionsPanel';
import { usePermissions } from '@/components/PermissionsProvider';
import { RBAC_ACTIONS, RBAC_RESOURCES } from '@/lib/permissions';

export default function SecuritySessionsPage() {
  const { loading, can } = usePermissions();
  const allowed = can(RBAC_RESOURCES.SECURITY, RBAC_ACTIONS.READ);

  if (!loading && !allowed) {
    return <AccessDenied title="Active sessions" message="You do not have permission to view active sessions." />;
  }

  return (
    <main className="page-container relative">
      <div className="container-standard relative z-10">
        <ActiveSessionsPanel />
      </div>
    </main>
  );
}

