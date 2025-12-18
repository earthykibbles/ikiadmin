import { logAuditEvent } from '@/lib/audit';
import {
  SecuritySettingsInput,
  ensureSecurityPermissions,
  getSecuritySettings,
  updateSecuritySettings,
} from '@/lib/security';
import { ACTIONS, RESOURCE_TYPES, requirePermission } from '@/lib/rbac';
import { NextRequest, NextResponse } from 'next/server';

function normalizeInput(raw: any): SecuritySettingsInput {
  const input: SecuritySettingsInput = {};

  if (typeof raw.enforceTwoFactorForAll === 'boolean') {
    input.enforceTwoFactorForAll = raw.enforceTwoFactorForAll;
  }

  if (typeof raw.loginAlertEnabled === 'boolean') {
    input.loginAlertEnabled = raw.loginAlertEnabled;
  }

  if (typeof raw.loginAlertEmails !== 'undefined') {
    input.loginAlertEmails = Array.isArray(raw.loginAlertEmails)
      ? raw.loginAlertEmails
      : String(raw.loginAlertEmails)
          .split(/[,\n]/)
          .map((v) => v.trim())
          .filter(Boolean);
  }

  if (typeof raw.ipAllowlistEnabled === 'boolean') {
    input.ipAllowlistEnabled = raw.ipAllowlistEnabled;
  }

  if (typeof raw.ipAllowlist !== 'undefined') {
    input.ipAllowlist = Array.isArray(raw.ipAllowlist)
      ? raw.ipAllowlist
      : String(raw.ipAllowlist)
          .split(/[,\n]/)
          .map((v) => v.trim())
          .filter(Boolean);
  }

  if (typeof raw.passwordMinLength !== 'undefined') {
    const val = Number.parseInt(String(raw.passwordMinLength), 10);
    if (!Number.isNaN(val) && val > 0 && val <= 128) {
      input.passwordMinLength = val;
    }
  }

  if (typeof raw.passwordRequireUppercase === 'boolean') {
    input.passwordRequireUppercase = raw.passwordRequireUppercase;
  }

  if (typeof raw.passwordRequireNumber === 'boolean') {
    input.passwordRequireNumber = raw.passwordRequireNumber;
  }

  if (typeof raw.passwordRequireSpecial === 'boolean') {
    input.passwordRequireSpecial = raw.passwordRequireSpecial;
  }

  if (typeof raw.passwordExpirationDays !== 'undefined') {
    const val = Number.parseInt(String(raw.passwordExpirationDays), 10);
    if (!Number.isNaN(val) && val >= 0 && val <= 3650) {
      input.passwordExpirationDays = val;
    }
  }

  if (typeof raw.forcePasswordChangeOnFirstLogin === 'boolean') {
    input.forcePasswordChangeOnFirstLogin = raw.forcePasswordChangeOnFirstLogin;
  }

  if (typeof raw.maxActiveSessionsPerUser !== 'undefined') {
    const val = Number.parseInt(String(raw.maxActiveSessionsPerUser), 10);
    if (!Number.isNaN(val) && val >= 0 && val <= 1000) {
      input.maxActiveSessionsPerUser = val;
    }
  }

  return input;
}

export async function GET(request: NextRequest) {
  try {
    await ensureSecurityPermissions();

    const perm = await requirePermission(request, RESOURCE_TYPES.SECURITY, ACTIONS.READ);
    if (!perm.authorized) {
      return NextResponse.json({ error: perm.error }, { status: perm.status });
    }

    const settings = await getSecuritySettings();

    return NextResponse.json({
      ...settings,
      loginAlertEmails: settings.loginAlertEmails,
      ipAllowlist: settings.ipAllowlist,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load security settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSecurityPermissions();

    const perm = await requirePermission(request, RESOURCE_TYPES.SECURITY, ACTIONS.MANAGE);
    if (!perm.authorized) {
      return NextResponse.json({ error: perm.error }, { status: perm.status });
    }

    const raw = await request.json().catch(() => ({}));
    const input = normalizeInput(raw);

    const before = await getSecuritySettings();
    const next = await updateSecuritySettings(input);

    await logAuditEvent({
      userId: perm.userId,
      action: 'SECURITY_SETTINGS_UPDATED',
      severity: 'high',
      message: 'Security settings updated',
      metadata: {
        changedKeys: Object.keys(input),
        before,
        after: next,
      },
    });

    return NextResponse.json({
      ...next,
      loginAlertEmails: next.loginAlertEmails,
      ipAllowlist: next.ipAllowlist,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update security settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

