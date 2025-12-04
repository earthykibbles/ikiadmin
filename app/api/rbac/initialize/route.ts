import { NextRequest, NextResponse } from 'next/server';
import { initializeRBAC, getUserSession } from '@/lib/rbac';
import { db } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Initialize RBAC system (run once)
// This endpoint is accessible to any authenticated user with legacy admin/superadmin role
// to allow initial setup
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated (but don't require RBAC permissions yet)
    const session = await getUserSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check legacy role system for authorization
    const userData = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
    });

    if (!userData || (userData.role !== 'superadmin' && userData.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    await initializeRBAC();

    return NextResponse.json({ success: true, message: 'RBAC system initialized' });
  } catch (error: any) {
    console.error('Error initializing RBAC:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize RBAC' },
      { status: 500 }
    );
  }
}

