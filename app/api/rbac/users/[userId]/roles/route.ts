import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userRole, role } from '@/lib/db/schema';
import { requirePermission } from '@/lib/rbac';
import { eq, and } from 'drizzle-orm';

// GET user roles
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const authCheck = await requirePermission(request, 'admin', 'read');
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
  } catch (error: any) {
    console.error('Error fetching user roles:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user roles' },
      { status: 500 }
    );
  }
}

// ASSIGN role to user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const authCheck = await requirePermission(request, 'admin', 'write');
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { userId } = await params;
    const body = await request.json();
    const { roleId, expiresAt } = body;

    if (!roleId) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
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
      assignedBy: authCheck.userId,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    return NextResponse.json({ success: true, message: 'Role assigned successfully' });
  } catch (error: any) {
    console.error('Error assigning role:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to assign role' },
      { status: 500 }
    );
  }
}

// REMOVE role from user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const authCheck = await requirePermission(request, 'admin', 'write');
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { userId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const roleId = searchParams.get('roleId');

    if (!roleId) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    // Check if it's a system role and prevent removal of superadmin from last superadmin
    const roleData = await db.select().from(role).where(eq(role.id, roleId)).limit(1);
    if (roleData.length > 0 && roleData[0].name === 'superadmin') {
      const superadminCount = await db
        .select()
        .from(userRole)
        .where(eq(userRole.roleId, roleId));
      
      if (superadminCount.length <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last superadmin' },
          { status: 400 }
        );
      }
    }

    await db
      .delete(userRole)
      .where(and(eq(userRole.userId, userId), eq(userRole.roleId, roleId)));

    return NextResponse.json({ success: true, message: 'Role removed successfully' });
  } catch (error: any) {
    console.error('Error removing role:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove role' },
      { status: 500 }
    );
  }
}

