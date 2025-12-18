import { db } from '@/lib/db';
import { session, user } from '@/lib/db/schema';
import { ensureSecurityPermissions, getSecuritySettings } from '@/lib/security';
import { ACTIONS, RESOURCE_TYPES, requirePermission } from '@/lib/rbac';
import { and, desc, eq, gt, ilike } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await ensureSecurityPermissions();

    const perm = await requirePermission(request, RESOURCE_TYPES.SECURITY, ACTIONS.READ);
    if (!perm.authorized) {
      return NextResponse.json({ error: perm.error }, { status: perm.status });
    }

    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const limitRaw = searchParams.get('limit');
    const limit = Math.min(Math.max(Number.parseInt(limitRaw || '100', 10) || 100, 1), 500);

    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    const q = searchParams.get('q');

    const now = new Date();
    const whereClauses = [gt(session.expiresAt, now)];

    if (userId) {
      whereClauses.push(eq(session.userId, userId));
    }

    if (email || q) {
      const pattern = `%${(email || q) ?? ''}%`;
      whereClauses.push(ilike(user.email, pattern));
    }

    const where = and(
      // eslint-disable-next-line drizzle/enforce-and-or
      ...whereClauses
    );

    const rows = await db
      .select({
        id: session.id,
        userId: session.userId,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        expiresAt: session.expiresAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        userName: user.name,
        userEmail: user.email,
      })
      .from(session)
      .innerJoin(user, eq(session.userId, user.id))
      .where(where)
      .orderBy(desc(session.createdAt))
      .limit(limit);

    const settings = await getSecuritySettings();

    return NextResponse.json({
      sessions: rows,
      limit,
      policy: {
        maxActiveSessionsPerUser: settings.maxActiveSessionsPerUser,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load active sessions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

