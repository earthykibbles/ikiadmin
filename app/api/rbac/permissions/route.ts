import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { permission } from '@/lib/db/schema';
import { requirePermission } from '@/lib/rbac';

// GET all permissions
export async function GET(request: NextRequest) {
  try {
    const authCheck = await requirePermission(request, 'admin', 'read');
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const permissions = await db.select().from(permission).orderBy(permission.resource, permission.action);

    // Group by resource
    const grouped = permissions.reduce((acc, perm) => {
      if (!acc[perm.resource]) {
        acc[perm.resource] = [];
      }
      acc[perm.resource].push(perm);
      return acc;
    }, {} as Record<string, typeof permissions>);

    return NextResponse.json({ permissions, grouped });
  } catch (error: any) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}

