# Authentication Setup Guide

This guide will help you set up authentication for the Iki Gen admin dashboard.

## Prerequisites

1. NeonDB PostgreSQL database (or any PostgreSQL database)
2. Environment variables configured

## Setup Steps

### 1. Configure Environment Variables

Add the following to your `.env.local` file:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# Providers database (optional; defaults to DATABASE_URL if omitted)
PROVIDERS_DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# Better Auth
BETTER_AUTH_SECRET=your-secret-key-here-min-32-chars
BETTER_AUTH_URL=http://localhost:3000

# App URL (for production, use your actual domain)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate a secure secret:
```bash
openssl rand -base64 32
```

### 2. Run Database Migrations

Generate the database schema:
```bash
npm run db:generate
```

Push the schema to your database:
```bash
npm run db:push
```

Or use migrations:
```bash
npm run db:migrate
```

### 3. Create Your First Superadmin Account

You'll need to create the first superadmin account manually. You can do this by:

1. **Using the database directly:**
   - Insert a user record with `role = 'superadmin'`
   - Insert an account record with the hashed password

2. **Using a script:**
   Create a file `scripts/create-superadmin.ts`:

```typescript
import { db } from '../lib/db';
import { user, account } from '../lib/db/schema';
import { nanoid } from 'nanoid';
import { hashPassword } from 'better-auth/crypto';

async function createSuperadmin() {
  const email = 'your-email@example.com';
  const password = 'your-secure-password';
  const name = 'Super Admin';

  const userId = nanoid();
  const hashedPassword = await hashPassword(password);

  await db.transaction(async (tx) => {
    await tx.insert(user).values({
      id: userId,
      email,
      name,
      role: 'superadmin',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await tx.insert(account).values({
      id: nanoid(),
      accountId: email,
      providerId: 'credential',
      userId,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  console.log('Superadmin created successfully!');
}

createSuperadmin();
```

Run it with:
```bash
npx tsx scripts/create-superadmin.ts
```

### 4. Access the Application

1. **Login Page:** Navigate to `/login`
2. **Superadmin Page:** Navigate to `/superadmin` (or use the inconspicuous link in the bottom-right corner of the homepage)

### 5. Set Up MFA (Multi-Factor Authentication)

After logging in, admins can set up MFA:

1. **TOTP (Google Authenticator):**
   - Go to account settings
   - Scan QR code with authenticator app
   - Enter verification code

2. **Email MFA:**
   - Enable email-based MFA
   - Receive codes via email

## Security Features

- ✅ Email/Password authentication
- ✅ Multi-factor authentication (TOTP & Email)
- ✅ Role-based access control (Superadmin & Admin)
- ✅ Session management
- ✅ Protected routes via middleware
- ✅ Secure password hashing (scrypt)

## Database Schema

The authentication system uses the following tables:

- `user` - User accounts with roles
- `session` - Active user sessions
- `account` - Authentication credentials
- `verification` - Email verification tokens
- `twoFactor` - MFA configuration

## API Routes

- `/api/auth/[...all]` - Better Auth API endpoints
- `/api/admin/create` - Create admin accounts (superadmin only)
- `/api/admin/check-role` - Check user role

## Pages

- `/login` - Login page with MFA support
- `/superadmin` - Superadmin page for creating admin accounts (inconspicuous link on homepage)

## Notes

- The superadmin page is protected and only accessible to users with `role = 'superadmin'`
- All routes except `/login` and `/api/auth` are protected by middleware
- MFA is optional but recommended for enhanced security
- Passwords must be at least 8 characters long

