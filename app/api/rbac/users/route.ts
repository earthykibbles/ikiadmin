import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user, userRole, role, resourcePermission } from '@/lib/db/schema';
import { requirePermission, getUserRoles, getUserPermissions, RESOURCE_TYPES } from '@/lib/rbac';
import { eq, inArray } from 'drizzle-orm';

// GET all admin users with their RBAC info
export async function GET(request: NextRequest) {
  try {
    // Check RBAC permission (supports both legacy and new system)
    const authCheck = await requirePermission(request, RESOURCE_TYPES.ADMIN, 'read');
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    // Get all admin users (users in the admin system)
    const allUsers = await db.select().from(user).orderBy(user.name);

    // Get RBAC info for each user
    const usersWithRBAC = await Promise.all(
      allUsers.map(async (u) => {
        const roles = await getUserRoles(u.id);
        const { rolePermissions, resourcePermissions } = await getUserPermissions(u.id);

        return {
          ...u,
          roles,
          permissions: {
            roleBased: rolePermissions,
            resourceBased: resourcePermissions,
          },
        };
      })
    );

    return NextResponse.json({ users: usersWithRBAC });
  } catch (error: any) {
    console.error('Error fetching users with RBAC:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

