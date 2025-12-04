import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { twoFactor } from 'better-auth/plugins/two-factor';
import { db } from './db';
import * as schema from './db/schema';
import { eq } from 'drizzle-orm';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      twoFactor: schema.twoFactor,
    },
  }),
  secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || 'change-me-in-production-min-32-chars',
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // We'll handle this manually for admin accounts
  },
  plugins: [
    twoFactor({
      factors: ['totp', 'email'],
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  trustedOrigins: process.env.NEXT_PUBLIC_APP_URL 
    ? [process.env.NEXT_PUBLIC_APP_URL] 
    : ['http://localhost:3000'],
  hooks: {
    async beforeSignUp({ email, name, password }) {
      // Check if there are any existing users in the database
      const existingUsers = await db.select().from(schema.user).limit(1);
      
      // If there are existing users, block sign-up
      if (existingUsers.length > 0) {
        throw new Error('Sign-up is disabled. An account already exists.');
      }
      
      // If this is the first user, allow sign-up
      return { email, name, password };
    },
    async afterSignUp({ user }) {
      // Check if this is the first user
      const allUsers = await db.select().from(schema.user);
      
      // If this is the only user, make them superadmin
      if (allUsers.length === 1) {
        await db
          .update(schema.user)
          .set({ role: 'superadmin' })
          .where(eq(schema.user.id, user.id));
      }
    },
  },
});

export type Session = typeof auth.$Infer.Session;

