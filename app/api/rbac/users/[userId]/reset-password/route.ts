import { db } from '@/lib/db';
import { sendCredentialsEmail } from '@/lib/email';
import { account, user } from '@/lib/db/schema';
import { requireSuperadmin } from '@/lib/rbac';
import { hashPassword } from 'better-auth/crypto';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const superadminCheck = await requireSuperadmin(request);
    if (!superadminCheck.authorized) {
      return NextResponse.json({ error: superadminCheck.error }, { status: superadminCheck.status });
    }

    const { userId } = await params;
    const body = await request.json();
    const {
      password,
      sendEmail,
      returnPassword,
    }: { password?: string; sendEmail?: boolean; returnPassword?: boolean } = body || {};

    const userRow = await db.query.user.findFirst({
      where: (u, { eq }) => eq(u.id, userId),
    });

    if (!userRow) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const nextPassword = (password || '').trim() || generateTemporaryPassword();
    if (nextPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const hashed = await hashPassword(nextPassword);

    await db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(account)
        .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')))
        .limit(1);

      if (existing.length > 0) {
        await tx
          .update(account)
          .set({ password: hashed, updatedAt: new Date() })
          .where(eq(account.id, existing[0].id));
      } else {
        await tx.insert(account).values({
          id: nanoid(),
          accountId: userRow.email,
          providerId: 'credential',
          userId,
          password: hashed,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    });

    let emailSent = false;
    let emailError: string | null = null;

    if (sendEmail) {
      try {
        const loginUrl = new URL('/login', request.url).toString();
        await sendCredentialsEmail({
          to: userRow.email,
          name: userRow.name,
          loginUrl,
          temporaryPassword: nextPassword,
        });
        emailSent = true;
      } catch (err: unknown) {
        emailError = err instanceof Error ? err.message : 'Failed to send email';
      }
    }

    return NextResponse.json({
      success: true,
      userId,
      email: userRow.email,
      emailSent,
      emailError,
      ...(returnPassword ? { temporaryPassword: nextPassword } : {}),
    });
  } catch (error: unknown) {
    console.error('Error resetting password:', error);
    const message = error instanceof Error ? error.message : 'Failed to reset password';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

