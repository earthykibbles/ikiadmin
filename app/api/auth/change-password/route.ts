import { auth } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { db } from '@/lib/db';
import { account, user } from '@/lib/db/schema';
import { getSecuritySettings, validatePassword } from '@/lib/security';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    const settings = await getSecuritySettings();
    const validation = validatePassword(newPassword, {
      passwordMinLength: settings.passwordMinLength,
      passwordRequireUppercase: settings.passwordRequireUppercase,
      passwordRequireNumber: settings.passwordRequireNumber,
      passwordRequireSpecial: settings.passwordRequireSpecial,
    });

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: validation.errors[0] || 'New password does not meet policy requirements',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Get the user's account with password
    const accounts = await db
      .select()
      .from(account)
      .where(and(eq(account.userId, session.user.id), eq(account.providerId, 'credential')))
      .limit(1);

    if (accounts.length === 0 || !accounts[0].password) {
      return NextResponse.json({ error: 'Password account not found' }, { status: 404 });
    }

    // Verify current password
    const isValid = await verifyPassword({ hash: accounts[0].password, password: currentPassword });
    if (!isValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    const now = new Date();

    // Update password + user security flags
    await db.transaction(async (tx) => {
      await tx
        .update(account)
        .set({
          password: hashedPassword,
          updatedAt: now,
        })
        .where(eq(account.id, accounts[0].id));

      await tx
        .update(user)
        .set({
          mustChangePassword: false,
          passwordChangedAt: now,
          updatedAt: now,
        })
        .where(eq(user.id, session.user.id));
    });

    await logAuditEvent({
      userId: session.user.id,
      action: 'PASSWORD_CHANGED',
      severity: 'medium',
      message: 'User changed their password',
      ipAddress: request.headers.get('x-forwarded-for') || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: unknown) {
    console.error('Error changing password:', error);
    const message = error instanceof Error ? error.message : 'Failed to change password';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
