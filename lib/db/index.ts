import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Use postgres client for better transaction support
// In Next.js, we use a singleton pattern to reuse connections
declare global {
  // eslint-disable-next-line no-var
  var postgresClient: postgres.Sql | undefined;
}

// Use a singleton pattern in development to avoid creating multiple connections
// In production, this will create a new connection each time (which is fine for serverless)
const client = globalThis.postgresClient ?? postgres(process.env.DATABASE_URL);

if (process.env.NODE_ENV !== 'production') {
  globalThis.postgresClient = client;
}

export const db = drizzle(client, { schema });

