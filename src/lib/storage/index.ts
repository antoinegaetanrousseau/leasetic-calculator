import type { StorageAdapter } from './adapter';
import { StorageError } from './errors';

export type { StorageAdapter, StorageObject, PutOptions } from './adapter';
export { StorageError, StorageNotFoundError, StorageAuthError } from './errors';

/**
 * Build a fresh StorageAdapter based on the STORAGE_DRIVER env var.
 * Exposed for tests; production code uses the memoized `storage` singleton below.
 */
export function getStorage(): StorageAdapter {
  const driver = process.env.STORAGE_DRIVER;
  if (!driver) {
    throw new StorageError(
      "STORAGE_DRIVER env var is not set. Expected 'vercel' or 's3'."
    );
  }
  if (driver === 'vercel') {
    // Lazy-import to avoid pulling @vercel/blob into the bundle when STORAGE_DRIVER=s3 (and vice versa).
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional dynamic require for driver isolation
    const { VercelBlobStorage } = require('./vercel-blob') as typeof import('./vercel-blob');
    return new VercelBlobStorage();
  }
  if (driver === 's3') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { S3Storage } = require('./s3') as typeof import('./s3');
    return new S3Storage();
  }
  throw new StorageError(
    `Unknown STORAGE_DRIVER: '${driver}'. Expected 'vercel' or 's3'.`
  );
}

/**
 * Memoized singleton. First read instantiates the driver; subsequent reads return it.
 * Reset by calling `__resetStorageForTests()` (test-only).
 */
let _storage: StorageAdapter | null = null;
export function storage(): StorageAdapter {
  if (_storage === null) _storage = getStorage();
  return _storage;
}

/** TEST-ONLY: clear the memoized instance. */
export function __resetStorageForTests(): void {
  _storage = null;
}
