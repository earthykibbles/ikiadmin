import { pgTable, text, timestamp, boolean, varchar, index, jsonb, primaryKey } from 'drizzle-orm/pg-core';

// User table for Better Auth
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  twoFactorEnabled: boolean('twoFactorEnabled').notNull().default(false),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  role: varchar('role', { length: 20 }).notNull().default('admin'), // 'superadmin' or 'admin'
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
}));

// Session table
export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('session_userId_idx').on(table.userId),
  tokenIdx: index('session_token_idx').on(table.token),
}));

// Account table (for email/password auth)
export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  expiresAt: timestamp('expiresAt'),
  password: text('password'), // hashed password
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('account_userId_idx').on(table.userId),
  accountIdIdx: index('account_accountId_idx').on(table.accountId),
}));

// Verification table (for email verification and password reset)
export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
  identifierIdx: index('verification_identifier_idx').on(table.identifier),
}));

// Two-factor table (Better Auth plugin)
export const twoFactor = pgTable('twoFactor', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  secret: text('secret'),
  backupCodes: text('backupCodes'),
  enabled: boolean('enabled').notNull().default(false),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('twoFactor_userId_idx').on(table.userId),
}));

// RBAC Tables

// Roles table - Predefined roles in the system
export const role = pgTable('role', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: text('description'),
  isSystem: boolean('isSystem').notNull().default(false), // System roles cannot be deleted
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
  nameIdx: index('role_name_idx').on(table.name),
}));

// Permissions table - Granular permissions
export const permission = pgTable('permission', {
  id: text('id').primaryKey(),
  resource: varchar('resource', { length: 100 }).notNull(), // e.g., 'users', 'posts', 'analytics', 'generate'
  action: varchar('action', { length: 50 }).notNull(), // e.g., 'read', 'write', 'delete', 'manage'
  description: text('description'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
  resourceActionIdx: index('permission_resource_action_idx').on(table.resource, table.action),
}));

// RolePermissions - Maps roles to permissions
export const rolePermission = pgTable('rolePermission', {
  roleId: text('roleId').notNull().references(() => role.id, { onDelete: 'cascade' }),
  permissionId: text('permissionId').notNull().references(() => permission.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
  roleIdIdx: index('rolePermission_roleId_idx').on(table.roleId),
  permissionIdIdx: index('rolePermission_permissionId_idx').on(table.permissionId),
}));

// UserRoles - Maps users to roles (many-to-many)
export const userRole = pgTable('userRole', {
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  roleId: text('roleId').notNull().references(() => role.id, { onDelete: 'cascade' }),
  assignedBy: text('assignedBy').references(() => user.id), // Who assigned this role
  assignedAt: timestamp('assignedAt').notNull().defaultNow(),
  expiresAt: timestamp('expiresAt'), // Optional expiration
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.roleId] }),
  userIdIdx: index('userRole_userId_idx').on(table.userId),
  roleIdIdx: index('userRole_roleId_idx').on(table.roleId),
}));

// ResourcePermissions - Granular resource-specific permissions (e.g., specific user, specific collection)
export const resourcePermission = pgTable('resourcePermission', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  resourceType: varchar('resourceType', { length: 100 }).notNull(), // e.g., 'firestore_collection', 'user', 'api_route'
  resourceId: text('resourceId'), // Specific resource ID (e.g., userId, collection name, route path)
  permissions: jsonb('permissions').notNull().default('[]'), // Array of allowed actions: ['read', 'write', 'delete']
  conditions: jsonb('conditions'), // Optional conditions (e.g., filters, scopes)
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('resourcePermission_userId_idx').on(table.userId),
  resourceIdx: index('resourcePermission_resource_idx').on(table.resourceType, table.resourceId),
}));

