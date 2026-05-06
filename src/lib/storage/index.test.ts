import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getStorage, __resetStorageForTests, StorageError, StorageNotFoundError, StorageAuthError } from './index';

describe('storage driver selection', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    __resetStorageForTests();
    // Strip the env vars we care about so tests are deterministic
    delete process.env.STORAGE_DRIVER;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    __resetStorageForTests();
  });

  it('throws when STORAGE_DRIVER is unset', () => {
    expect(() => getStorage()).toThrow(StorageError);
    expect(() => getStorage()).toThrow(/STORAGE_DRIVER/);
  });

  it('throws on unknown STORAGE_DRIVER value', () => {
    process.env.STORAGE_DRIVER = 'gcs';
    expect(() => getStorage()).toThrow(StorageError);
    expect(() => getStorage()).toThrow(/Unknown STORAGE_DRIVER/);
  });

  it('returns a VercelBlobStorage instance when STORAGE_DRIVER=vercel', async () => {
    process.env.STORAGE_DRIVER = 'vercel';
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token-not-used-here';
    const { VercelBlobStorage } = await import('./vercel-blob');
    expect(getStorage()).toBeInstanceOf(VercelBlobStorage);
  });

  it('returns an S3Storage instance when STORAGE_DRIVER=s3', async () => {
    process.env.STORAGE_DRIVER = 's3';
    process.env.S3_ENDPOINT = 'https://test.example.com';
    process.env.S3_REGION = 'eu-west-3';
    process.env.S3_BUCKET = 'test-bucket';
    process.env.S3_ACCESS_KEY_ID = 'test-key';
    process.env.S3_SECRET_ACCESS_KEY = 'test-secret';
    const { S3Storage } = await import('./s3');
    expect(getStorage()).toBeInstanceOf(S3Storage);
  });
});

describe('typed errors', () => {
  it('StorageNotFoundError extends StorageError', () => {
    const err = new StorageNotFoundError('proposals/u1/p1.pdf');
    expect(err).toBeInstanceOf(StorageError);
    expect(err).toBeInstanceOf(StorageNotFoundError);
    expect(err.message).toContain('proposals/u1/p1.pdf');
  });

  it('StorageAuthError extends StorageError', () => {
    const err = new StorageAuthError();
    expect(err).toBeInstanceOf(StorageError);
    expect(err).toBeInstanceOf(StorageAuthError);
  });
});
