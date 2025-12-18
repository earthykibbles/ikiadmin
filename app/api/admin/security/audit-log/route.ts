import { db } from '@/lib/db';
import { auditLog, user } from '@/lib/db/schema';
import { ensureSecurityPermissions } from '@/lib/security';
import { ACTIONS, RESOURCE_TYPES, requirePermission } from '@/lib/rbac';
import { and, desc, eq, gte, ilike, inArray, lte } from 'drizzle-orm';
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
    const limit = Math.min(Math.max(Number.parseInt(limitRaw || '50', 10) || 50, 1), 200);

    const severityParam = searchParams.get('severity');
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const q = searchParams.get('q');
    const since = searchParams.get('since');
    const until = searchParams.get('until');

    const whereClauses = [];

    if (severityParam) {
      const severities = severityParam
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      if (severities.length > 0) {
        whereClauses.push(inArray(auditLog.severity, severities));
      }
    }

    if (userId) {
      whereClauses.push(eq(auditLog.userId, userId));
    }

    if (action) {
      whereClauses.push(eq(auditLog.action, action));
    }

    if (q) {
      const pattern = `%${q}%`;
      whereClauses.push(
        and(
          // Try to match on message or action
          ilike(auditLog.message, pattern)
        )
      );
    }

    if (since) {
      const sinceDate = new Date(since);
      if (!Number.isNaN(sinceDate.getTime())) {
        whereClauses.push(gte(auditLog.createdAt, sinceDate));
      }
    }

    if (until) {
      const untilDate = new Date(until);
      if (!Number.isNaN(untilDate.getTime())) {
        whereClauses.push(lte(auditLog.createdAt, untilDate));
      }
    }

    const where =
      whereClauses.length > 0
        ? and(
            // eslint-disable-next-line drizzle/enforce-and-or
            ...whereClauses
          )
        : undefined;

    const rows = await db
      .select({
        id: auditLog.id,
        userId: auditLog.userId,
        action: auditLog.action,
        severity: auditLog.severity,
        message: auditLog.message,
        ipAddress: auditLog.ipAddress,
        userAgent: auditLog.userAgent,
        metadata: auditLog.metadata,
        createdAt: auditLog.createdAt,
        userName: user.name,
        userEmail: user.email,
      })
      .from(auditLog)
      .leftJoin(user, eq(auditLog.userId, user.id))
      .where(where)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);

    return NextResponse.json({
      items: rows,
      limit,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load audit log';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

