import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { role, rolePermission, permission } from '@/lib/db/schema';
import { requirePermission, RESOURCE_TYPES } from '@/lib/rbac';
import { eq } from 'drizzle-orm';

// GET all roles
export async function GET(request: NextRequest) {
  try {
    const authCheck = await requirePermission(request, RESOURCE_TYPES.ADMIN, 'read');
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const roles = await db.select().from(role).orderBy(role.name);

    // Get permissions for each role
    const rolesWithPermissions = await Promise.all(
      roles.map(async (r) => {
        const permissions = await db
          .select({
            permission: permission,
          })
          .from(rolePermission)
          .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
          .where(eq(rolePermission.roleId, r.id));

        return {
          ...r,
          permissions: permissions.map(p => p.permission),
        };
      })
    );

    return NextResponse.json({ roles: rolesWithPermissions });
  } catch (error: any) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}

// CREATE new role
export async function POST(request: NextRequest) {
  try {
    const authCheck = await requirePermission(request, RESOURCE_TYPES.ADMIN, 'write');
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const body = await request.json();
    const { name, description, permissionIds } = body;

    if (!name) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    // Check if role already exists
    const existing = await db.select().from(role).where(eq(role.name, name)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Role already exists' }, { status: 400 });
    }

    // Create role
    const roleId = `role_${name.toLowerCase().replace(/\s+/g, '_')}`;
    const newRole = await db.insert(role).values({
      id: roleId,
      name,
      description: description || null,
      isSystem: false,
    }).returning();

    // Assign permissions if provided
    if (permissionIds && Array.isArray(permissionIds) && permissionIds.length > 0) {
      const rolePerms = permissionIds.map((permId: string) => ({
        roleId: roleId,
        permissionId: permId,
      }));
      await db.insert(rolePermission).values(rolePerms);
    }

    return NextResponse.json({ role: newRole[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating role:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create role' },
      { status: 500 }
    );
  }
}

