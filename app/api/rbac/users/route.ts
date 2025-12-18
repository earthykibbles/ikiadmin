import { db } from '@/lib/db';
import { sendCredentialsEmail } from '@/lib/email';
import { account, role, user, userRole } from '@/lib/db/schema';
import {
  RESOURCE_TYPES,
  getUserPermissions,
  getUserRoles,
  initializeRBAC,
  requirePermission,
  requireSuperadmin,
} from '@/lib/rbac';
import { hashPassword } from 'better-auth/crypto';
import { eq, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';

// GET all admin users with their RBAC info
export async function GET(request: NextRequest) {
  try {
    // Check RBAC permission (supports both legacy and new system)
    const authCheck = await requirePermission(request, RESOURCE_TYPES.ADMIN, 'read');
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    // Get all admin users (users in the admin system)
    const allUsers = await db.select().from(user).orderBy(user.name);

    // Get RBAC info for each user
    const usersWithRBAC = await Promise.all(
      allUsers.map(async (u) => {
        const roles = await getUserRoles(u.id);
        const { rolePermissions, resourcePermissions } = await getUserPermissions(u.id);

        return {
          ...u,
          roles,
          permissions: {
            roleBased: rolePermissions,
            resourceBased: resourcePermissions,
          },
        };
      })
    );

    return NextResponse.json({ users: usersWithRBAC });
  } catch (error: unknown) {
    console.error('Error fetching users with RBAC:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch users';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function generateTemporaryPassword(length = 14) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const symbols = '!@#$%*-_?';
  const chars = `${alphabet}${symbols}`;

  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  // Ensure at least one symbol
  const passwordChars = Array.from(bytes, (b) => chars[b % chars.length]);
  passwordChars[0] = symbols[bytes[0] % symbols.length];

  return passwordChars.join('');
}

// POST create a new BetterAuth user (superadmin only), assign RBAC roles, optionally email credentials
export async function POST(request: NextRequest) {
  try {
    const superadminCheck = await requireSuperadmin(request);
    if (!superadminCheck.authorized) {
      return NextResponse.json({ error: superadminCheck.error }, { status: superadminCheck.status });
    }

    // Ensure RBAC tables are seeded with default roles/permissions (idempotent)
    await initializeRBAC();

    const body = await request.json();
    const {
      email,
      name,
      password,
      roleIds,
      sendEmail,
      returnPassword,
    }: {
      email?: string;
      name?: string;
      password?: string;
      roleIds?: string[];
      sendEmail?: boolean;
      returnPassword?: boolean;
    } = body || {};

    const normalizedEmail = (email || '').trim().toLowerCase();
    const trimmedName = (name || '').trim();

    if (!normalizedEmail || !trimmedName) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const desiredRoleIds =
      Array.isArray(roleIds) && roleIds.length > 0 ? roleIds.map((r) => String(r)) : ['role_admin'];

    // Validate role IDs exist
    const roleRows = await db.select().from(role).where(inArray(role.id, desiredRoleIds));
    const foundRoleIds = new Set(roleRows.map((r) => r.id));
    const missingRoleIds = desiredRoleIds.filter((id) => !foundRoleIds.has(id));
    if (missingRoleIds.length > 0) {
      return NextResponse.json(
        { error: `Unknown role(s): ${missingRoleIds.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.query.user.findFirst({
      where: (users, { eq }) => eq(users.email, normalizedEmail),
    });
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const tempPassword = (password || '').trim() || generateTemporaryPassword();
    if (tempPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(tempPassword);
    const userId = nanoid();
    const isSuperadminTarget = roleRows.some((r) => r.name === 'superadmin');
    const legacyRole: 'admin' | 'superadmin' = isSuperadminTarget ? 'superadmin' : 'admin';

    await db.transaction(async (tx) => {
      await tx.insert(user).values({
        id: userId,
        email: normalizedEmail,
        name: trimmedName,
        role: legacyRole,
        emailVerified: true, // Admin accounts are pre-verified
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await tx.insert(account).values({
        id: nanoid(),
        accountId: normalizedEmail,
        providerId: 'credential',
        userId,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await tx.insert(userRole).values(
        desiredRoleIds.map((roleId) => ({
          userId,
          roleId,
          assignedBy: superadminCheck.userId,
        }))
      );
    });

    let emailSent = false;
    let emailError: string | null = null;

    if (sendEmail) {
      try {
        const loginUrl = new URL('/login', request.url).toString();
        await sendCredentialsEmail({
          to: normalizedEmail,
          name: trimmedName,
          loginUrl,
          temporaryPassword: tempPassword,
          roles: roleRows.map((r) => r.name),
        });
        emailSent = true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to send email';
        emailError = message;
      }
    }

    return NextResponse.json(
      {
        success: true,
        userId,
        email: normalizedEmail,
        roles: roleRows.map((r) => ({ id: r.id, name: r.name })),
        emailSent,
        emailError,
        ...(returnPassword ? { temporaryPassword: tempPassword } : {}),
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error creating admin user:', error);
    const message = error instanceof Error ? error.message : 'Failed to create user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
