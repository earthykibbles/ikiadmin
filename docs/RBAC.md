# RBAC (Role-Based Access Control) System

## Overview

The Iki Gen application now includes a comprehensive RBAC system that allows granular control over user permissions across all data and features in the application.

## Features

- **Role-Based Permissions**: Assign roles to users with predefined permission sets
- **Resource-Based Permissions**: Grant granular permissions for specific resources (users, collections, API routes)
- **Admin Dashboard**: Visual interface to manage users, roles, and permissions
- **API Protection**: All API routes are protected with RBAC checks
- **Flexible System**: Support for custom roles and permissions

## Database Schema

The RBAC system uses the following tables:

- **`role`**: Predefined roles (superadmin, admin, moderator, editor, viewer)
- **`permission`**: Granular permissions (resource + action combinations)
- **`rolePermission`**: Maps roles to permissions
- **`userRole`**: Maps users to roles (many-to-many)
- **`resourcePermission`**: Resource-specific permissions for individual users

## Getting Started

### 1. Run Database Migration

First, apply the database migration to create the RBAC tables:

```bash
npm run db:migrate
```

Or if using push:

```bash
npm run db:push
```

### 2. Initialize RBAC System

Visit the RBAC dashboard at `/rbac` and click the "Initialize RBAC" button. This will:

- Create default roles (superadmin, admin, moderator, editor, viewer)
- Create permissions for all resources and actions
- Assign default permissions to each role

Alternatively, you can call the API directly:

```bash
curl -X POST http://localhost:3000/api/rbac/initialize \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN"
```

### 3. Assign Roles to Users

1. Go to `/rbac` dashboard
2. Click on the "Users" tab
3. Click on a user to view their roles
4. Click "Assign Role" to add roles to the user

## Default Roles

### Superadmin
- **Description**: Full system access
- **Permissions**: All permissions for all resources
- **Use Case**: System administrators who need complete control

### Admin
- **Description**: Administrative access to most resources
- **Permissions**: Read, write, and manage for:
  - Users
  - Posts
  - Stories
  - Analytics
  - Generate
  - Explore
  - Upload
  - Admin
- **Use Case**: Administrators managing day-to-day operations

### Moderator
- **Description**: Can moderate content and users
- **Permissions**: Read and write for:
  - Users
  - Posts
  - Stories
- **Use Case**: Content moderators and community managers

### Editor
- **Description**: Can create and edit content
- **Permissions**: Read and write for:
  - Posts
  - Stories
  - Generate
  - Explore
  - Upload
- **Use Case**: Content creators and editors

### Viewer
- **Description**: Read-only access
- **Permissions**: Read access to all resources
- **Use Case**: Read-only access for analytics and reporting

## Resources

The system defines the following resources:

- `users` - User management
- `posts` - Social posts
- `stories` - User stories
- `analytics` - Analytics data
- `generate` - Content generation
- `explore` - Explore features
- `upload` - File uploads
- `admin` - Admin features
- `finance` - Finance data
- `fitness` - Fitness data
- `mindfulness` - Mindfulness data
- `mood` - Mood tracking
- `nutrition` - Nutrition data
- `water` - Water tracking
- `wellsphere` - WellSphere data
- `fcm` - Push notifications
- `points` - User points
- `onboarding` - Onboarding data

## Actions

Each resource supports the following actions:

- `read` - View/list resources
- `write` - Create/update resources
- `delete` - Delete resources
- `manage` - Full control (includes all actions)

## Using RBAC in API Routes

### Basic Permission Check

```typescript
import { requirePermission, RESOURCE_TYPES } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  // Check if user has read permission for users
  const authCheck = await requirePermission(request, RESOURCE_TYPES.USERS, 'read');
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }
  
  // User is authorized, proceed with request
  // ...
}
```

### Resource-Specific Permission Check

```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  
  // Check if user has write permission for this specific user
  const authCheck = await requirePermission(
    request, 
    RESOURCE_TYPES.USERS, 
    'write', 
    userId  // Specific resource ID
  );
  
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }
  
  // User is authorized, proceed with update
  // ...
}
```

## API Endpoints

### RBAC Management

- `GET /api/rbac/users` - Get all admin users with RBAC info
- `GET /api/rbac/roles` - Get all roles with permissions
- `GET /api/rbac/permissions` - Get all permissions
- `POST /api/rbac/initialize` - Initialize RBAC system

### User Role Management

- `GET /api/rbac/users/[userId]/roles` - Get user's roles
- `POST /api/rbac/users/[userId]/roles` - Assign role to user
- `DELETE /api/rbac/users/[userId]/roles?roleId=xxx` - Remove role from user

### Resource Permissions

- `GET /api/rbac/users/[userId]/permissions` - Get user's resource permissions
- `POST /api/rbac/users/[userId]/permissions` - Create resource permission
- `PATCH /api/rbac/users/[userId]/permissions` - Update resource permission
- `DELETE /api/rbac/users/[userId]/permissions?permissionId=xxx` - Delete resource permission

## Creating Custom Roles

1. Go to `/rbac` dashboard
2. Click on the "Roles" tab
3. Click "Create Role"
4. Enter role name and description
5. Select permissions to assign
6. Save the role

## Granting Resource-Specific Permissions

Resource permissions allow you to grant access to specific resources (e.g., a specific user, collection, or API route).

Example: Grant a user read access to a specific Firestore collection:

```typescript
POST /api/rbac/users/[userId]/permissions
{
  "resourceType": "firestore_collection",
  "resourceId": "wellsphere_conditions",
  "permissions": ["read"]
}
```

## Best Practices

1. **Principle of Least Privilege**: Only grant the minimum permissions necessary
2. **Regular Audits**: Periodically review user roles and permissions
3. **System Roles**: Don't delete or modify system roles (marked with `isSystem: true`)
4. **Superadmin Protection**: Always maintain at least one superadmin user
5. **Documentation**: Document custom roles and their purposes

## Troubleshooting

### User can't access a resource

1. Check if user has the required role
2. Check if role has the required permission
3. Check for resource-specific permissions
4. Verify the API route has RBAC checks implemented

### Migration issues

If you encounter migration errors:

1. Check database connection
2. Verify all previous migrations are applied
3. Check for schema conflicts
4. Review migration SQL file for errors

### RBAC not initialized

If the RBAC system isn't initialized:

1. Visit `/rbac` dashboard
2. Click "Initialize RBAC" button
3. Or call `/api/rbac/initialize` endpoint directly
4. Verify roles and permissions are created in database

## Security Considerations

- All RBAC checks are performed server-side
- Session tokens are required for all operations
- Superadmin role bypasses all permission checks
- Resource permissions are checked in addition to role permissions
- Failed permission checks return 401 (Unauthorized) or 403 (Forbidden)

## Future Enhancements

- Permission inheritance
- Role hierarchies
- Time-based permissions
- Audit logging
- Permission templates
- Bulk role assignment




