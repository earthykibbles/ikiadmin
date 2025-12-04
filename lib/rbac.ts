import { auth } from './auth';
import { db } from './db';
import { user, role, permission, rolePermission, userRole, resourcePermission } from './db/schema';
import { eq, and, or, inArray } from 'drizzle-orm';
import { NextRequest } from 'next/server';

// Resource types in the system
export const RESOURCE_TYPES = {
  USERS: 'users',
  POSTS: 'posts',
  STORIES: 'stories',
  ANALYTICS: 'analytics',
  GENERATE: 'generate',
  EXPLORE: 'explore',
  UPLOAD: 'upload',
  ADMIN: 'admin',
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
} as const;

// Actions
export const ACTIONS = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  MANAGE: 'manage', // Full control
} as const;

// Predefined roles
export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  VIEWER: 'viewer',
  EDITOR: 'editor',
} as const;

// Get user's session and roles
export async function getUserSession(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return null;
    }
    return session;
  } catch (error) {
    return null;
  }
}

// Get all roles for a user
export async function getUserRoles(userId: string) {
  const userRoles = await db
    .select({
      role: role,
    })
    .from(userRole)
    .innerJoin(role, eq(userRole.roleId, role.id))
    .where(eq(userRole.userId, userId));

  return userRoles.map(ur => ur.role);
}

// Get all permissions for a user (from roles + direct resource permissions)
export async function getUserPermissions(userId: string) {
  // Get user's roles
  const userRoles = await getUserRoles(userId);
  const roleIds = userRoles.map(r => r.id);

  // Get permissions from roles
  let rolePermissions: any[] = [];
  if (roleIds.length > 0) {
    rolePermissions = await db
      .select({
        permission: permission,
      })
      .from(rolePermission)
      .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
      .where(inArray(rolePermission.roleId, roleIds));
  }

  // Get direct resource permissions
  const directPermissions = await db
    .select()
    .from(resourcePermission)
    .where(eq(resourcePermission.userId, userId));

  return {
    rolePermissions: rolePermissions.map(rp => rp.permission),
    resourcePermissions: directPermissions,
  };
}

// Check if user has permission for a resource and action
export async function hasPermission(
  userId: string,
  resource: string,
  action: string,
  resourceId?: string
): Promise<boolean> {
  // First check legacy role system (for backward compatibility)
  const userData = await db.query.user.findFirst({
    where: eq(user.id, userId),
  });

  if (userData) {
    // Legacy role check - if user has superadmin or admin in old system, grant access
    // This allows transition period before RBAC is fully initialized
    if (userData.role === 'superadmin') {
      return true; // Superadmin has all permissions
    }
    // Legacy admin can access admin resources and most other resources
    if (userData.role === 'admin') {
      // Admin can access admin, users, and most resources (except sensitive ones)
      const adminAccessibleResources = [
        RESOURCE_TYPES.ADMIN,
        RESOURCE_TYPES.USERS,
        RESOURCE_TYPES.POSTS,
        RESOURCE_TYPES.STORIES,
        RESOURCE_TYPES.ANALYTICS,
        RESOURCE_TYPES.GENERATE,
        RESOURCE_TYPES.EXPLORE,
        RESOURCE_TYPES.UPLOAD,
      ];
      if (adminAccessibleResources.includes(resource as any)) {
        return true;
      }
    }
  }

  // Get user's roles from RBAC system
  const userRoles = await getUserRoles(userId);
  
  // Check if user is superadmin (has all permissions)
  const isSuperadmin = userRoles.some(r => r.name === ROLES.SUPERADMIN);
  if (isSuperadmin) {
    return true;
  }

  // Get user's permissions
  const { rolePermissions, resourcePermissions } = await getUserPermissions(userId);

  // Check role-based permissions
  const hasRolePermission = rolePermissions.some(
    p => p.resource === resource && (p.action === action || p.action === ACTIONS.MANAGE)
  );

  if (hasRolePermission) {
    return true;
  }

  // Check resource-specific permissions
  if (resourceId) {
    const hasResourcePermission = resourcePermissions.some(rp => {
      if (rp.resourceType !== resource) return false;
      if (rp.resourceId && rp.resourceId !== resourceId) return false;
      const allowedActions = rp.permissions as string[];
      return allowedActions.includes(action) || allowedActions.includes(ACTIONS.MANAGE);
    });

    if (hasResourcePermission) {
      return true;
    }
  }

  return false;
}

// Middleware to check permission in API routes
export async function requirePermission(
  request: NextRequest,
  resource: string,
  action: string,
  resourceId?: string
) {
  const session = await getUserSession(request);
  if (!session) {
    return { authorized: false, error: 'Unauthorized', status: 401 };
  }

  const hasAccess = await hasPermission(session.user.id, resource, action, resourceId);
  if (!hasAccess) {
    return { authorized: false, error: 'Forbidden', status: 403 };
  }

  return { authorized: true, userId: session.user.id };
}

// Get user with roles and permissions (for admin dashboard)
export async function getUserWithRBAC(userId: string) {
  const userData = await db.query.user.findFirst({
    where: eq(user.id, userId),
  });

  if (!userData) {
    return null;
  }

  const roles = await getUserRoles(userId);
  const { rolePermissions, resourcePermissions } = await getUserPermissions(userId);

  return {
    ...userData,
    roles,
    permissions: {
      roleBased: rolePermissions,
      resourceBased: resourcePermissions,
    },
  };
}

// Initialize default roles and permissions (run once)
export async function initializeRBAC() {
  // Check if roles already exist
  const existingRoles = await db.select().from(role).limit(1);
  if (existingRoles.length > 0) {
    // Migrate legacy roles if not already done
    await migrateLegacyRoles();
    return; // Already initialized
  }

  // Create default roles
  const defaultRoles = [
    { id: 'role_superadmin', name: ROLES.SUPERADMIN, description: 'Full system access', isSystem: true },
    { id: 'role_admin', name: ROLES.ADMIN, description: 'Administrative access to most resources', isSystem: true },
    { id: 'role_moderator', name: ROLES.MODERATOR, description: 'Can moderate content and users', isSystem: true },
    { id: 'role_editor', name: ROLES.EDITOR, description: 'Can create and edit content', isSystem: true },
    { id: 'role_viewer', name: ROLES.VIEWER, description: 'Read-only access', isSystem: true },
  ];

  await db.insert(role).values(defaultRoles);

  // Create default permissions for all resources
  const resources = Object.values(RESOURCE_TYPES);
  const actions = Object.values(ACTIONS);
  const defaultPermissions: any[] = [];

  for (const res of resources) {
    for (const act of actions) {
      defaultPermissions.push({
        id: `perm_${res}_${act}`,
        resource: res,
        action: act,
        description: `${act} access to ${res}`,
      });
    }
  }

  await db.insert(permission).values(defaultPermissions);

  // Assign permissions to roles
  const rolePermMappings: any[] = [];

  // Superadmin gets all permissions
  for (const perm of defaultPermissions) {
    rolePermMappings.push({
      roleId: 'role_superadmin',
      permissionId: perm.id,
    });
  }

  // Admin gets read, write, manage for most resources
  const adminResources = [
    RESOURCE_TYPES.USERS,
    RESOURCE_TYPES.POSTS,
    RESOURCE_TYPES.STORIES,
    RESOURCE_TYPES.ANALYTICS,
    RESOURCE_TYPES.GENERATE,
    RESOURCE_TYPES.EXPLORE,
    RESOURCE_TYPES.UPLOAD,
    RESOURCE_TYPES.ADMIN,
  ];
  for (const res of adminResources) {
    for (const act of [ACTIONS.READ, ACTIONS.WRITE, ACTIONS.MANAGE]) {
      rolePermMappings.push({
        roleId: 'role_admin',
        permissionId: `perm_${res}_${act}`,
      });
    }
  }

  // Moderator gets read, write for users, posts, stories
  const moderatorResources = [RESOURCE_TYPES.USERS, RESOURCE_TYPES.POSTS, RESOURCE_TYPES.STORIES];
  for (const res of moderatorResources) {
    for (const act of [ACTIONS.READ, ACTIONS.WRITE]) {
      rolePermMappings.push({
        roleId: 'role_moderator',
        permissionId: `perm_${res}_${act}`,
      });
    }
  }

  // Editor gets read, write for content resources
  const editorResources = [
    RESOURCE_TYPES.POSTS,
    RESOURCE_TYPES.STORIES,
    RESOURCE_TYPES.GENERATE,
    RESOURCE_TYPES.EXPLORE,
    RESOURCE_TYPES.UPLOAD,
  ];
  for (const res of editorResources) {
    for (const act of [ACTIONS.READ, ACTIONS.WRITE]) {
      rolePermMappings.push({
        roleId: 'role_editor',
        permissionId: `perm_${res}_${act}`,
      });
    }
  }

  // Viewer gets read for all resources
  for (const res of resources) {
    rolePermMappings.push({
      roleId: 'role_viewer',
      permissionId: `perm_${res}_${ACTIONS.READ}`,
    });
  }

  await db.insert(rolePermission).values(rolePermMappings);

  // Migrate legacy roles to RBAC system
  await migrateLegacyRoles();
}

// Migrate users from legacy role system to RBAC
async function migrateLegacyRoles() {
  // Get all users with legacy roles
  const allUsers = await db.select().from(user);
  
  for (const u of allUsers) {
    // Check if user already has RBAC roles
    const existingRoles = await getUserRoles(u.id);
    if (existingRoles.length > 0) {
      continue; // Already migrated
    }

    // Map legacy role to RBAC role
    let roleName: string | null = null;
    if (u.role === 'superadmin') {
      roleName = ROLES.SUPERADMIN;
    } else if (u.role === 'admin') {
      roleName = ROLES.ADMIN;
    }

    if (roleName) {
      // Find the role ID
      const roleData = await db.select().from(role).where(eq(role.name, roleName)).limit(1);
      if (roleData.length > 0) {
        // Assign role to user
        try {
          await db.insert(userRole).values({
            userId: u.id,
            roleId: roleData[0].id,
            assignedBy: u.id, // Self-assigned during migration
          });
        } catch (error) {
          // Role might already be assigned, ignore
          console.log(`Role already assigned for user ${u.id}`);
        }
      }
    }
  }
}

