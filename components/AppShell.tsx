'use client';

import TopNavbar from '@/components/TopNavbar';
import { PermissionsProvider } from '@/components/PermissionsProvider';
import { usePathname } from 'next/navigation';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNavbar = pathname !== '/login';

  return (
    <PermissionsProvider enabled={showNavbar}>
      {showNavbar && <TopNavbar />}
      {children}
    </PermissionsProvider>
  );
}

