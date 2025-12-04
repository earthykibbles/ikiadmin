import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resourcePermission } from '@/lib/db/schema';
import { requirePermission } from '@/lib/rbac';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// GET user resource permissions
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

    const permissions = await db
      .select()
      .from(resourcePermission)
      .where(eq(resourcePermission.userId, userId));

    return NextResponse.json({ permissions });
  } catch (error: any) {
    console.error('Error fetching user permissions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user permissions' },
      { status: 500 }
    );
  }
}

// CREATE resource permission for user
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
    const { resourceType, resourceId, permissions, conditions } = body;

    if (!resourceType || !permissions || !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'resourceType and permissions array are required' },
        { status: 400 }
      );
    }

    const newPermission = await db
      .insert(resourcePermission)
      .values({
        id: `rperm_${nanoid()}`,
        userId,
        resourceType,
        resourceId: resourceId || null,
        permissions,
        conditions: conditions || null,
      })
      .returning();

    return NextResponse.json({ permission: newPermission[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating resource permission:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create permission' },
      { status: 500 }
    );
  }
}

// UPDATE resource permission
export async function PATCH(
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
    const { permissionId, permissions, conditions } = body;

    if (!permissionId) {
      return NextResponse.json({ error: 'Permission ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (permissions !== undefined) updateData.permissions = permissions;
    if (conditions !== undefined) updateData.conditions = conditions;

    await db
      .update(resourcePermission)
      .set(updateData)
      .where(eq(resourcePermission.id, permissionId));

    return NextResponse.json({ success: true, message: 'Permission updated successfully' });
  } catch (error: any) {
    console.error('Error updating permission:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update permission' },
      { status: 500 }
    );
  }
}

// DELETE resource permission
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
    const permissionId = searchParams.get('permissionId');

    if (!permissionId) {
      return NextResponse.json({ error: 'Permission ID is required' }, { status: 400 });
    }

    await db
      .delete(resourcePermission)
      .where(eq(resourcePermission.id, permissionId));

    return NextResponse.json({ success: true, message: 'Permission deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting permission:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete permission' },
      { status: 500 }
    );
  }
}

