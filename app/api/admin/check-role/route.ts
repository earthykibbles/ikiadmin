import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userData = await db.query.user.findFirst({
      where: (users, { eq }) => eq(users.id, session.user.id),
    });

    return NextResponse.json({
      role: userData?.role || 'admin',
      userId: session.user.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to check role' },
      { status: 500 }
    );
  }
}

