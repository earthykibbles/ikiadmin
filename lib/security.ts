import { db } from '@/lib/db';
import { permission, role, rolePermission, securitySettings } from '@/lib/db/schema';
import { ACTIONS, RESOURCE_TYPES } from '@/lib/rbac';
import { and, eq, inArray } from 'drizzle-orm';

export type SecuritySettings = {
  id: string;
  enforceTwoFactorForAll: boolean;
  loginAlertEnabled: boolean;
  loginAlertEmails: unknown;
  ipAllowlistEnabled: boolean;
  ipAllowlist: unknown;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSpecial: boolean;
  passwordExpirationDays: number;
  forcePasswordChangeOnFirstLogin: boolean;
  maxActiveSessionsPerUser: number;
  createdAt: Date;
  updatedAt: Date;
};

export type SecuritySettingsInput = Partial<{
  enforceTwoFactorForAll: boolean;
  loginAlertEnabled: boolean;
  loginAlertEmails: string[];
  ipAllowlistEnabled: boolean;
  ipAllowlist: string[];
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSpecial: boolean;
  passwordExpirationDays: number;
  forcePasswordChangeOnFirstLogin: boolean;
  maxActiveSessionsPerUser: number;
}>;

export type PasswordValidationResult = {
  valid: boolean;
  errors: string[];
};

const GLOBAL_ID = 'global';

// Reasonable defaults if no row exists yet.
const DEFAULT_SECURITY_SETTINGS: Omit<
  SecuritySettings,
  'id' | 'createdAt' | 'updatedAt'
> = {
  enforceTwoFactorForAll: false,
  loginAlertEnabled: false,
  loginAlertEmails: [],
  ipAllowlistEnabled: false,
  ipAllowlist: [],
  passwordMinLength: 12,
  passwordRequireUppercase: true,
  passwordRequireNumber: true,
  passwordRequireSpecial: true,
  passwordExpirationDays: 0,
  forcePasswordChangeOnFirstLogin: false,
  maxActiveSessionsPerUser: 0,
};

let securityPermissionsEnsured = false;

function coerceStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).filter((v) => v.trim().length > 0);
  }
  if (typeof value === 'string') {
    return value
      .split(/[,\n]/)
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Ensure the RBAC permission rows for the SECURITY resource exist and that
 * core roles (superadmin/admin) have sensible defaults.
 *
 * This is safe to call from API routes and acts as a lightweight migration
 * for upgraded installs.
 */
export async function ensureSecurityPermissions() {
  if (securityPermissionsEnsured) return;

  const securityResource = RESOURCE_TYPES.SECURITY;
  const desired = [
    {
      id: `perm_${securityResource}_${ACTIONS.READ}`,
      action: ACTIONS.READ,
      description: 'Read security settings, audit log, and active sessions',
    },
    {
      id: `perm_${securityResource}_${ACTIONS.MANAGE}`,
      action: ACTIONS.MANAGE,
      description: 'Manage security configuration and terminate sessions',
    },
  ] as const;

  const desiredIds = desired.map((d) => d.id);

  const existing = await db
    .select({ id: permission.id })
    .from(permission)
    .where(inArray(permission.id, desiredIds));

  const existingIds = new Set(existing.map((p) => p.id));
  const missing = desired.filter((d) => !existingIds.has(d.id));

  if (missing.length > 0) {
    await db.insert(permission).values(
      missing.map((m) => ({
        id: m.id,
        resource: securityResource,
        action: m.action,
        description: m.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    );
  }

  // Attach to core roles where they exist.
  const coreRoleIds = ['role_superadmin', 'role_admin'];
  const coreRoles = await db
    .select()
    .from(role)
    .where(inArray(role.id, coreRoleIds));

  if (coreRoles.length > 0) {
    const existingRolePerms = await db
      .select({
        roleId: rolePermission.roleId,
        permissionId: rolePermission.permissionId,
      })
      .from(rolePermission)
      .where(
        and(
          inArray(rolePermission.roleId, coreRoleIds),
          inArray(rolePermission.permissionId, desiredIds)
        )
      );

    const existingPairs = new Set(
      existingRolePerms.map((rp) => `${rp.roleId}:${rp.permissionId}`)
    );

    const rolePermValues: { roleId: string; permissionId: string; createdAt: Date }[] = [];
    const now = new Date();

    for (const r of coreRoles) {
      for (const d of desired) {
        // superadmin gets both READ + MANAGE; admin only READ by default
        if (r.id === 'role_admin' && d.action !== ACTIONS.READ) continue;

        const key = `${r.id}:${d.id}`;
        if (existingPairs.has(key)) continue;
        rolePermValues.push({
          roleId: r.id,
          permissionId: d.id,
          createdAt: now,
        });
      }
    }

    if (rolePermValues.length > 0) {
      await db.insert(rolePermission).values(rolePermValues);
    }
  }

  securityPermissionsEnsured = true;
}

export async function getSecuritySettings(): Promise<SecuritySettings> {
  const existing = await db
    .select()
    .from(securitySettings)
    .where(eq(securitySettings.id, GLOBAL_ID))
    .limit(1);

  if (existing.length > 0) {
    const row = existing[0];
    return {
      ...row,
      loginAlertEmails: coerceStringArray(row.loginAlertEmails),
      ipAllowlist: coerceStringArray(row.ipAllowlist),
    } as SecuritySettings;
  }

  const now = new Date();
  await db.insert(securitySettings).values({
    id: GLOBAL_ID,
    enforceTwoFactorForAll: DEFAULT_SECURITY_SETTINGS.enforceTwoFactorForAll,
    loginAlertEnabled: DEFAULT_SECURITY_SETTINGS.loginAlertEnabled,
    loginAlertEmails: DEFAULT_SECURITY_SETTINGS.loginAlertEmails as any,
    ipAllowlistEnabled: DEFAULT_SECURITY_SETTINGS.ipAllowlistEnabled,
    ipAllowlist: DEFAULT_SECURITY_SETTINGS.ipAllowlist as any,
    passwordMinLength: DEFAULT_SECURITY_SETTINGS.passwordMinLength,
    passwordRequireUppercase: DEFAULT_SECURITY_SETTINGS.passwordRequireUppercase,
    passwordRequireNumber: DEFAULT_SECURITY_SETTINGS.passwordRequireNumber,
    passwordRequireSpecial: DEFAULT_SECURITY_SETTINGS.passwordRequireSpecial,
    passwordExpirationDays: DEFAULT_SECURITY_SETTINGS.passwordExpirationDays,
    forcePasswordChangeOnFirstLogin: DEFAULT_SECURITY_SETTINGS.forcePasswordChangeOnFirstLogin,
    maxActiveSessionsPerUser: DEFAULT_SECURITY_SETTINGS.maxActiveSessionsPerUser,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: GLOBAL_ID,
    ...DEFAULT_SECURITY_SETTINGS,
    loginAlertEmails: [],
    ipAllowlist: [],
    createdAt: now,
    updatedAt: now,
  } as SecuritySettings;
}

export async function updateSecuritySettings(
  input: SecuritySettingsInput
): Promise<SecuritySettings> {
  const current = await getSecuritySettings();

  const nextEmails =
    typeof input.loginAlertEmails !== 'undefined'
      ? coerceStringArray(input.loginAlertEmails)
      : (current.loginAlertEmails as string[]);
  const nextIpAllowlist =
    typeof input.ipAllowlist !== 'undefined'
      ? coerceStringArray(input.ipAllowlist)
      : (current.ipAllowlist as string[]);

  const patch: Partial<SecuritySettings> = {
    ...current,
    ...input,
    loginAlertEmails: nextEmails,
    ipAllowlist: nextIpAllowlist,
    updatedAt: new Date(),
  };

  await db
    .update(securitySettings)
    .set({
      enforceTwoFactorForAll: patch.enforceTwoFactorForAll,
      loginAlertEnabled: patch.loginAlertEnabled,
      loginAlertEmails: patch.loginAlertEmails as any,
      ipAllowlistEnabled: patch.ipAllowlistEnabled,
      ipAllowlist: patch.ipAllowlist as any,
      passwordMinLength: patch.passwordMinLength,
      passwordRequireUppercase: patch.passwordRequireUppercase,
      passwordRequireNumber: patch.passwordRequireNumber,
      passwordRequireSpecial: patch.passwordRequireSpecial,
      passwordExpirationDays: patch.passwordExpirationDays,
      forcePasswordChangeOnFirstLogin: patch.forcePasswordChangeOnFirstLogin,
      maxActiveSessionsPerUser: patch.maxActiveSessionsPerUser,
      updatedAt: patch.updatedAt,
    })
    .where(eq(securitySettings.id, GLOBAL_ID));

  return patch as SecuritySettings;
}

export function validatePassword(
  password: string,
  settings: Pick<
    SecuritySettings,
    | 'passwordMinLength'
    | 'passwordRequireUppercase'
    | 'passwordRequireNumber'
    | 'passwordRequireSpecial'
  >
): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }

  if (password.length < settings.passwordMinLength) {
    errors.push(`Password must be at least ${settings.passwordMinLength} characters long`);
  }

  if (settings.passwordRequireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (settings.passwordRequireNumber && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (settings.passwordRequireSpecial && !/[^\w\s]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

