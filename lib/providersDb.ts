import postgres from 'postgres';

function getProvidersDatabaseUrl() {
  return process.env.PROVIDERS_DATABASE_URL || process.env.DATABASE_URL;
}

declare global {
  // eslint-disable-next-line no-var
  var providersPostgresClient: postgres.Sql | undefined;
}

const url = getProvidersDatabaseUrl();

if (!url) {
  throw new Error(
    'PROVIDERS_DATABASE_URL (or DATABASE_URL) environment variable is required for Providers admin',
  );
}

// Reuse connection in development
const client = globalThis.providersPostgresClient ?? postgres(url);

if (process.env.NODE_ENV !== 'production') {
  globalThis.providersPostgresClient = client;
}

export const providersSql = client;



