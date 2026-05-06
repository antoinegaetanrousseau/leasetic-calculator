import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { neon } from '@neondatabase/serverless';
import postgres from 'postgres';
import * as schema from '@/db/schema';
import { DbError } from './errors';

export type DriverKind = 'neon-http' | 'postgres-js';

export interface DbWithMeta {
  /** Discriminator the test suite reads. NEVER read from app code. */
  readonly __driverKind: DriverKind;
}

/**
 * Parse DATABASE_URL and decide which driver to use.
 * Exported for unit testing.
 */
export function parseDatabaseUrl(url: string): { kind: DriverKind; host: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new DbError(`DATABASE_URL is an invalid URL (got: ${url.slice(0, 30)}...)`);
  }
  const host = parsed.hostname.toLowerCase();
  // Neon production AND preview-branch hosts both contain neon.tech / neon.build
  const isNeon = host.endsWith('.neon.tech') || host.endsWith('.neon.build');
  return { kind: isNeon ? 'neon-http' : 'postgres-js', host };
}

/**
 * Build a Drizzle Database with the appropriate driver.
 * Per PITFALLS §3.1: postgres-js connection pool is capped at max=1 to avoid
 * Vercel function pool exhaustion.
 */
export function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new DbError('DATABASE_URL env var is not set');
  }
  const { kind } = parseDatabaseUrl(url);
  if (kind === 'neon-http') {
    const sql = neon(url);
    const db = drizzleNeon(sql, { schema });
    return Object.assign(db, { __driverKind: 'neon-http' as const });
  }
  // postgres-js: cap pool at 1 (PITFALLS §3.1); prepare:false for pgbouncer transaction-pooling compat
  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzlePg(client, { schema });
  return Object.assign(db, { __driverKind: 'postgres-js' as const });
}
