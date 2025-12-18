import { db } from '@/lib/db';
import { permission } from '@/lib/db/schema';
import { RESOURCE_TYPES, requirePermission } from '@/lib/rbac';
import { NextRequest, NextResponse } from 'next/server';

// GET all permissions
export async function GET(request: NextRequest) {
  try {
    const authCheck = await requirePermission(request, RESOURCE_TYPES.ADMIN, 'read');
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const permissions = await db
      .select()
      .from(permission)
      .orderBy(permission.resource, permission.action);

    // Group by resource
    const grouped = permissions.reduce(
      (acc, perm) => {
        if (!acc[perm.resource]) {
          acc[perm.resource] = [];
        }
        acc[perm.resource].push(perm);
        return acc;
      },
      {} as Record<string, typeof permissions>
    );

    return NextResponse.json({ permissions, grouped });
  } catch (error: unknown) {
    console.error('Error fetching permissions:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch permissions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
