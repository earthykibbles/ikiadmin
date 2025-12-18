'use client';

import RBACDashboard from '@/components/RBACDashboard';

export default function SuperAdminPage() {
  return (
    <main className="page-container relative">
      <div className="container-standard relative">
        <RBACDashboard />
      </div>
    </main>
  );
}
