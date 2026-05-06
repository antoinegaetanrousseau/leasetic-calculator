import { createDb } from './client';
import * as schemaModule from '@/db/schema';

export { DbError, DbAuthError } from './errors';
export type { DriverKind } from './client';

/**
 * Memoized Drizzle Database singleton.
 * First read instantiates the driver based on DATABASE_URL; subsequent reads return it.
 * Reset by __resetDbForTests() (test-only).
 */
let _db: ReturnType<typeof createDb> | null = null;
export function db() {
  if (_db === null) _db = createDb();
  return _db;
}

export const schema = schemaModule;

/** TEST-ONLY: clear the memoized instance. */
export function __resetDbForTests(): void {
  _db = null;
}
