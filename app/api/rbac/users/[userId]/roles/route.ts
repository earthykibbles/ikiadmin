import { db } from '@/lib/db';
import { role, user, userRole } from '@/lib/db/schema';
import { RESOURCE_TYPES, requirePermission, requireSuperadmin } from '@/lib/rbac';
import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

// GET user roles
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const authCheck = await requirePermission(request, RESOURCE_TYPES.ADMIN, 'read');
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { userId } = await params;

    const userRoles = await db
      .select({
        role: role,
        assignedBy: userRole.assignedBy,
        assignedAt: userRole.assignedAt,
        expiresAt: userRole.expiresAt,
      })
      .from(userRole)
      .innerJoin(role, eq(userRole.roleId, role.id))
      .where(eq(userRole.userId, userId));

    return NextResponse.json({ roles: userRoles });
  } catch (error: unknown) {
    console.error('Error fetching user roles:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch user roles';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ASSIGN role to user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const authCheck = await requirePermission(request, RESOURCE_TYPES.ADMIN, 'write');
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { userId } = await params;
    const body = await request.json();
    const { roleId, expiresAt } = body;

    if (!roleId) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    // Validate role + protect superadmin role assignment
    const roleData = await db.select().from(role).where(eq(role.id, roleId)).limit(1);
    if (roleData.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const isSuperadminRole = roleData[0].name === 'superadmin';
    let assignedBy = authCheck.userId;

    if (isSuperadminRole) {
      const superadminCheck = await requireSuperadmin(request);
      if (!superadminCheck.authorized) {
        return NextResponse.json({ error: superadminCheck.error }, { status: superadminCheck.status });
      }
      assignedBy = superadminCheck.userId;
    }

    // Check if role assignment already exists
    const existing = await db
      .select()
      .from(userRole)
      .where(and(eq(userRole.userId, userId), eq(userRole.roleId, roleId)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Role already assigned' }, { status: 400 });
    }

    // Assign role
    await db.insert(userRole).values({
      userId,
      roleId,
      assignedBy,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    // Keep legacy role in sync for superadmin (bootstrap + middleware)
    if (isSuperadminRole) {
      await db
        .update(user)
        .set({ role: 'superadmin', updatedAt: new Date() })
        .where(eq(user.id, userId));
    }

    return NextResponse.json({ success: true, message: 'Role assigned successfully' });
  } catch (error: unknown) {
    console.error('Error assigning role:', error);
    const message = error instanceof Error ? error.message : 'Failed to assign role';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// REMOVE role from user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const authCheck = await requirePermission(request, RESOURCE_TYPES.ADMIN, 'write');
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { userId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const roleId = searchParams.get('roleId');

    if (!roleId) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    // Safety: prevent admins from removing their own roles
    if (userId === authCheck.userId) {
      return NextResponse.json(
        { error: 'You cannot remove your own roles. Use another admin account.' },
        { status: 400 }
      );
    }

    // Check if it's a system role and prevent removal of superadmin from last superadmin
    const roleData = await db.select().from(role).where(eq(role.id, roleId)).limit(1);
    if (roleData.length > 0 && roleData[0].name === 'superadmin') {
      // Only superadmin can remove superadmin role
      const superadminCheck = await requireSuperadmin(request);
      if (!superadminCheck.authorized) {
        return NextResponse.json({ error: superadminCheck.error }, { status: superadminCheck.status });
      }

      const superadminCount = await db.select().from(userRole).where(eq(userRole.roleId, roleId));

      if (superadminCount.length <= 1) {
        return NextResponse.json({ error: 'Cannot remove the last superadmin' }, { status: 400 });
      }
    }

    await db.delete(userRole).where(and(eq(userRole.userId, userId), eq(userRole.roleId, roleId)));

    // If superadmin role removed, downgrade legacy role if no other superadmin role remains
    if (roleData.length > 0 && roleData[0].name === 'superadmin') {
      const remainingSuperadmin = await db
        .select()
        .from(userRole)
        .innerJoin(role, eq(userRole.roleId, role.id))
        .where(and(eq(userRole.userId, userId), eq(role.name, 'superadmin')))
        .limit(1);

      if (remainingSuperadmin.length === 0) {
        await db.update(user).set({ role: 'admin', updatedAt: new Date() }).where(eq(user.id, userId));
      }
    }

    return NextResponse.json({ success: true, message: 'Role removed successfully' });
  } catch (error: unknown) {
    console.error('Error removing role:', error);
    const message = error instanceof Error ? error.message : 'Failed to remove role';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
