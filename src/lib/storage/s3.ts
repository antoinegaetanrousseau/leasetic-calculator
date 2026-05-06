// STUB — Task 2 implements the full S3Storage class.
// This file exists to satisfy TypeScript module resolution in index.ts and index.test.ts.
// The class constructor is intentionally not implemented yet; tests that require construction
// will fail until Task 2 ships the real driver.
import type { StorageAdapter, StorageObject, PutOptions } from './adapter';

export class S3Storage implements StorageAdapter {
  async put(_key: string, _body: Buffer | Uint8Array, _opts: PutOptions): Promise<StorageObject> {
    throw new Error('S3Storage not yet implemented — Task 2');
  }
  async get(_key: string): Promise<{ body: Buffer; contentType: string; size: number }> {
    throw new Error('S3Storage not yet implemented — Task 2');
  }
  async head(_key: string): Promise<StorageObject | null> {
    throw new Error('S3Storage not yet implemented — Task 2');
  }
  async delete(_key: string): Promise<void> {
    throw new Error('S3Storage not yet implemented — Task 2');
  }
  async signedUrl(_key: string, _expiresInSeconds: number): Promise<string> {
    throw new Error('S3Storage not yet implemented — Task 2');
  }
}
