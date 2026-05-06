import { describe, it, expect, afterEach } from 'vitest';
import { VercelBlobStorage } from './vercel-blob';
import { StorageError, StorageAuthError } from './errors';

describe('VercelBlobStorage construction', () => {
  const original = process.env.BLOB_READ_WRITE_TOKEN;
  afterEach(() => {
    if (original === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
    else process.env.BLOB_READ_WRITE_TOKEN = original;
  });

  it('throws StorageAuthError if BLOB_READ_WRITE_TOKEN is unset', () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    expect(() => new VercelBlobStorage()).toThrow(StorageAuthError);
  });

  it('constructs successfully when BLOB_READ_WRITE_TOKEN is present', () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'fake-token-for-unit-test';
    const driver = new VercelBlobStorage();
    expect(driver).toBeInstanceOf(VercelBlobStorage);
  });

  it('signedUrl rejects expiresInSeconds > 3600', async () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'fake-token';
    const driver = new VercelBlobStorage();
    await expect(driver.signedUrl('test/key.bin', 3601)).rejects.toThrow(StorageError);
  });
});
