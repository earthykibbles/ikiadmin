import { auth } from '@/lib/auth';
import {
  ACTIONS,
  RESOURCE_TYPES,
  getUserPermissions,
  getUserRoles,
  getUserWithRBAC,
  isSuperadminUser,
} from '@/lib/rbac';
import { NextRequest, NextResponse } from 'next/server';

type PermissionKey = `${string}:${string}`;

function addKey(set: Set<string>, resource: string, action: string) {
  set.add(`${resource}:${action}`);
}

function applyLegacyFallback(keys: Set<string>, legacyRole: string | null) {
  if (legacyRole === 'superadmin') {
    for (const res of Object.values(RESOURCE_TYPES)) {
      addKey(keys, res, ACTIONS.MANAGE);
    }
    return;
  }

  if (legacyRole !== 'admin') return;

  const adminAccessibleResources = [
    RESOURCE_TYPES.ADMIN,
    RESOURCE_TYPES.PROVIDERS,
    RESOURCE_TYPES.USERS,
    RESOURCE_TYPES.POSTS,
    RESOURCE_TYPES.STORIES,
    RESOURCE_TYPES.ANALYTICS,
    RESOURCE_TYPES.GENERATE,
    RESOURCE_TYPES.EXPLORE,
    RESOURCE_TYPES.UPLOAD,
  ];
  for (const res of adminAccessibleResources) {
    addKey(keys, res, ACTIONS.MANAGE);
  }
}

function buildPermissionKeys(
  perms: Awaited<ReturnType<typeof getUserPermissions>>,
  legacyRole: string | null
): Set<string> {
  const keys = new Set<string>();

  for (const p of perms.rolePermissions) {
    addKey(keys, p.resource, p.action);
  }

  for (const rp of perms.resourcePermissions) {
    const resource = rp.resourceType;
    const actions = (rp.permissions as string[]) || [];
    for (const action of actions) {
      addKey(keys, resource, action);
    }
  }

  applyLegacyFallback(keys, legacyRole);

  return keys;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const [roles, perms, userWithRBAC, superFlag] = await Promise.all([
      getUserRoles(userId),
      getUserPermissions(userId),
      getUserWithRBAC(userId),
      isSuperadminUser(userId),
    ]);

    const roleNames = roles.map((r) => r.name);
    const legacyRole = userWithRBAC?.role || null;
    const keys = buildPermissionKeys(perms, legacyRole);

    return NextResponse.json({
      user: {
        id: session.user.id,
        name: session.user.name || null,
        email: session.user.email || null,
        twoFactorEnabled: Boolean(userWithRBAC?.twoFactorEnabled),
        mustChangePassword: Boolean(userWithRBAC?.mustChangePassword),
      },
      roles: roleNames,
      isSuperadmin: superFlag,
      legacyRole,
      permissions: {
        keys: Array.from(keys) as PermissionKey[],
        roleBased: perms.rolePermissions.map((p) => ({
          id: p.id,
          resource: p.resource,
          action: p.action,
          description: p.description || null,
        })),
        resourceBased: perms.resourcePermissions,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load current user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
