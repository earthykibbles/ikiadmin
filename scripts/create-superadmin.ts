import 'dotenv/config';
import { hashPassword } from 'better-auth/crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
import { nanoid } from 'nanoid';
import postgres from 'postgres';
import { account, user } from '../lib/db/schema';
import * as schema from '../lib/db/schema';

async function createSuperadmin() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  // Use postgres client for transactions (neon-serverless doesn't support transactions)
  const client = postgres(process.env.DATABASE_URL);
  const db = drizzle(client, { schema });

  const email = 'admin2@ikiwellness.com';
  const password = 'TerraforM@123';
  const name = 'Super Admin';

  const userId = nanoid();
  // Better Auth uses scrypt-based hashing (salt:key)
  const hashedPassword = await hashPassword(password);

  try {
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
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  } finally {
    await client.end();
  }
}

createSuperadmin().catch(console.error);
