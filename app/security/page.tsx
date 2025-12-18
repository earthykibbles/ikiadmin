'use client';

import AccessDenied from '@/components/AccessDenied';
import SecurityPanel from '@/components/SecurityPanel';
import { usePermissions } from '@/components/PermissionsProvider';
import { RBAC_ACTIONS, RBAC_RESOURCES } from '@/lib/permissions';

export default function SecuritySettingsPage() {
  const { loading, can } = usePermissions();
  const allowed = can(RBAC_RESOURCES.SECURITY, RBAC_ACTIONS.READ);

  if (!loading && !allowed) {
    return <AccessDenied title="Security" message="You do not have permission to view security settings." />;
  }

  return (
    <main className="page-container relative">
      <div className="container-standard relative z-10">
        <SecurityPanel />
      </div>
    </main>
  );
}

