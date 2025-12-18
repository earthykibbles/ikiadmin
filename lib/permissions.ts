export const RBAC_ACTIONS = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  MANAGE: 'manage',
} as const;

export const RBAC_RESOURCES = {
  USERS: 'users',
  POSTS: 'posts',
  STORIES: 'stories',
  ANALYTICS: 'analytics',
  GENERATE: 'generate',
  EXPLORE: 'explore',
  UPLOAD: 'upload',
  ADMIN: 'admin',
  PROVIDERS: 'providers',
  FINANCE: 'finance',
  FITNESS: 'fitness',
  MINDFULNESS: 'mindfulness',
  MOOD: 'mood',
  NUTRITION: 'nutrition',
  WATER: 'water',
  WELLSPHERE: 'wellsphere',
  FCM: 'fcm',
  POINTS: 'points',
  ONBOARDING: 'onboarding',
  SECURITY: 'security',
} as const;

export type RbacAction = (typeof RBAC_ACTIONS)[keyof typeof RBAC_ACTIONS];
export type RbacResource = (typeof RBAC_RESOURCES)[keyof typeof RBAC_RESOURCES];
export type PermissionKey = `${string}:${string}`;

export type AuthMeResponse = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    /**
     * Whether two-factor authentication is enabled for this account.
     * This is populated from the Better Auth user table.
     */
    twoFactorEnabled?: boolean;
    /**
     * Whether the user must change their password on next login.
     */
    mustChangePassword?: boolean;
  };
  roles: string[];
  isSuperadmin: boolean;
  legacyRole: string | null;
  permissions: {
    keys: PermissionKey[];
    roleBased: Array<{ id: string; resource: string; action: string; description: string | null }>;
    resourceBased: unknown[];
  };
};

export function canPermission(
  keys: Set<string> | PermissionKey[] | null | undefined,
  resource: string,
  action: string
): boolean {
  if (!keys) return false;
  const has = (k: string) =>
    keys instanceof Set ? keys.has(k) : keys.includes(k as PermissionKey);
  return has(`${resource}:${action}`) || has(`${resource}:${RBAC_ACTIONS.MANAGE}`);
}
