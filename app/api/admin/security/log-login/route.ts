import { auth } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { sendLoginAlertEmail } from '@/lib/email';
import { getSecuritySettings } from '@/lib/security';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ipAddress = request.headers.get('x-forwarded-for') || null;
    const userAgent = request.headers.get('user-agent') || null;

    await logAuditEvent({
      userId: session.user.id,
      action: 'LOGIN_SUCCESS',
      severity: 'medium',
      message: 'User logged in to iki-gen admin',
      ipAddress,
      userAgent,
      metadata: {
        email: session.user.email,
      },
    });

    const settings = await getSecuritySettings();
    const emails = Array.isArray(settings.loginAlertEmails)
      ? (settings.loginAlertEmails as string[])
      : [];

    if (settings.loginAlertEnabled && emails.length > 0 && session.user.email) {
      const when = new Date();
      await Promise.all(
        emails.map((to) =>
          sendLoginAlertEmail({
            to,
            userEmail: session.user.email as string,
            loginAt: when,
            ipAddress,
            userAgent,
          })
        )
      );
    }

    return NextResponse.json({ logged: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to log login event';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

