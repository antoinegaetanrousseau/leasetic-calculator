import type { StorageAdapter } from './adapter';
import { StorageError } from './errors';
import { VercelBlobStorage } from './vercel-blob';
import { S3Storage } from './s3';

export type { StorageAdapter, StorageObject, PutOptions } from './adapter';
export { StorageError, StorageNotFoundError, StorageAuthError } from './errors';
export { VercelBlobStorage } from './vercel-blob';
export { S3Storage } from './s3';

/**
 * Build a fresh StorageAdapter based on the STORAGE_DRIVER env var.
 * Exposed for tests; production code uses the memoized `storage` singleton below.
 *
 * Note: both drivers are imported at module load time (standard ESM). The bundle
 * split between Vercel/S3 SDKs is handled at the process level by STORAGE_DRIVER —
 * whichever driver is not in use will simply not be instantiated. Next.js build-time
 * tree-shaking handles further optimisation for the browser bundle.
 */
export function getStorage(): StorageAdapter {
  const driver = process.env.STORAGE_DRIVER;
  if (!driver) {
    throw new StorageError(
      "STORAGE_DRIVER env var is not set. Expected 'vercel' or 's3'."
    );
  }
  if (driver === 'vercel') {
    return new VercelBlobStorage();
  }
  if (driver === 's3') {
    return new S3Storage();
  }
  throw new StorageError(
    `Unknown STORAGE_DRIVER: '${driver}'. Expected 'vercel' or 's3'.`
  );
}

/**
 * Memoized singleton. First call instantiates the driver; subsequent calls return it.
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
