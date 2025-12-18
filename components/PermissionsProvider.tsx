'use client';

import type { AuthMeResponse, PermissionKey } from '@/lib/permissions';
import { canPermission } from '@/lib/permissions';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type PermissionsContextValue = {
  loading: boolean;
  me: AuthMeResponse | null;
  keys: Set<string>;
  can: (resource: string, action: string) => boolean;
};

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({
  children,
  enabled = true,
}: {
  children: React.ReactNode;
  enabled?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<AuthMeResponse | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setMe(null);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (res.status === 401) {
          if (!cancelled) {
            setMe(null);
          }
          return;
        }
        const json = (await res.json()) as AuthMeResponse;
        if (!res.ok) {
          throw new Error((json as any)?.error || 'Failed to load permissions');
        }
        if (!cancelled) {
          setMe(json);
        }
      } catch {
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const keys = useMemo(() => {
    const set = new Set<string>();
    const list = me?.permissions?.keys || ([] as PermissionKey[]);
    for (const k of list) set.add(k);
    return set;
  }, [me]);

  const value = useMemo<PermissionsContextValue>(() => {
    return {
      loading,
      me,
      keys,
      can: (resource: string, action: string) => canPermission(keys, resource, action),
    };
  }, [loading, me, keys]);

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    return {
      loading: true,
      me: null,
      keys: new Set<string>(),
      can: () => false,
    } satisfies PermissionsContextValue;
  }
  return ctx;
}
