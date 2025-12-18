import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { isSuperadminUser } from '@/lib/rbac';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userData = await db.query.user.findFirst({
      where: (users, { eq }) => eq(users.id, session.user.id),
    });

    const isSuperadmin = await isSuperadminUser(session.user.id);

    return NextResponse.json({
      role: isSuperadmin ? 'superadmin' : userData?.role || 'admin',
      userId: session.user.id,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to check role';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
