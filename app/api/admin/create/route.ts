import { db } from '@/lib/db';
import { sendCredentialsEmail } from '@/lib/email';
import { account, role as rbacRole, user, userRole } from '@/lib/db/schema';
import { getSecuritySettings, validatePassword } from '@/lib/security';
import { initializeRBAC, requireSuperadmin } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';
import { hashPassword } from 'better-auth/crypto';
import { inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';

async function maybeSendCredentialsEmail(input: {
  shouldSend: boolean;
  requestUrl: string;
  to: string;
  name: string;
  temporaryPassword: string;
  roles: string[];
}) {
  if (!input.shouldSend) {
    return { emailSent: false, emailError: null as string | null };
  }

  try {
    const loginUrl = new URL('/login', input.requestUrl).toString();
    await sendCredentialsEmail({
      to: input.to,
      name: input.name,
      loginUrl,
      temporaryPassword: input.temporaryPassword,
      roles: input.roles,
    });
    return { emailSent: true, emailError: null as string | null };
  } catch (err: unknown) {
    const emailError = err instanceof Error ? err.message : 'Failed to send email';
    return { emailSent: false, emailError };
  }
}

export async function POST(request: NextRequest) {
  try {
    const superadminCheck = await requireSuperadmin(request);
    if (!superadminCheck.authorized) {
      return NextResponse.json(
        { error: superadminCheck.error },
        { status: superadminCheck.status }
      );
    }

    await initializeRBAC();

    const { email, password, name, role, sendEmail } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    const security = await getSecuritySettings();
    const passwordCheck = validatePassword(password, {
      passwordMinLength: security.passwordMinLength,
      passwordRequireUppercase: security.passwordRequireUppercase,
      passwordRequireNumber: security.passwordRequireNumber,
      passwordRequireSpecial: security.passwordRequireSpecial,
    });

    if (!passwordCheck.valid) {
      return NextResponse.json(
        {
          error: passwordCheck.errors[0] || 'Password does not meet policy requirements',
          details: passwordCheck.errors,
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.query.user.findFirst({
      where: (users, { eq }) => eq(users.email, email),
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const trimmedName = String(name).trim();

    const roleIds = [role === 'superadmin' ? 'role_superadmin' : 'role_admin'];
    const roleRows = await db.select().from(rbacRole).where(inArray(rbacRole.id, roleIds));
    if (roleRows.length !== roleIds.length) {
      return NextResponse.json({ error: 'RBAC not initialized (missing roles)' }, { status: 500 });
    }

    // Create BetterAuth user + RBAC mapping
    const userId = nanoid();
    const hashedPassword = await hashPassword(password);

    const mustChangePassword = !!security.forcePasswordChangeOnFirstLogin;

    await db.transaction(async (tx) => {
      // Create user
      await tx.insert(user).values({
        id: userId,
        email: normalizedEmail,
        name: trimmedName,
        role: role || 'admin',
        emailVerified: true, // Admin accounts are pre-verified
        mustChangePassword,
        passwordChangedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create account with password
      await tx.insert(account).values({
        id: nanoid(),
        accountId: normalizedEmail,
        providerId: 'credential',
        userId,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await tx.insert(userRole).values({
        userId,
        roleId: roleIds[0],
        assignedBy: superadminCheck.userId,
      });
    });

    const { emailSent, emailError } = await maybeSendCredentialsEmail({
      shouldSend: Boolean(sendEmail),
      requestUrl: request.url,
      to: normalizedEmail,
      name: trimmedName,
      temporaryPassword: password,
      roles: roleRows.map((r) => r.name),
    });

    await logAuditEvent({
      userId: superadminCheck.userId,
      action: 'ADMIN_CREATED',
      severity: role === 'superadmin' ? 'critical' : 'high',
      message: `Admin account created for ${normalizedEmail}`,
      ipAddress: request.headers.get('x-forwarded-for') || null,
      userAgent: request.headers.get('user-agent') || null,
      metadata: {
        newUserId: userId,
        role,
        emailSent,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Admin account created successfully',
      userId,
      emailSent,
      emailError,
    });
  } catch (error: unknown) {
    console.error('Error creating admin:', error);
    const message = error instanceof Error ? error.message : 'Failed to create admin account';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
