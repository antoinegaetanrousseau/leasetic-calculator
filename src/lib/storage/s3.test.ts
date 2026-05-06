import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { S3Storage } from './s3';
import { StorageError } from './errors';

describe('S3Storage construction', () => {
  const keys = ['S3_ENDPOINT', 'S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'];
  const originals: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of keys) originals[k] = process.env[k];
  });

  afterEach(() => {
    for (const k of keys) {
      if (originals[k] === undefined) delete process.env[k];
      else process.env[k] = originals[k];
    }
  });

  function setAll() {
    process.env.S3_ENDPOINT = 'https://s3.gra.cloud.ovh.net';
    process.env.S3_REGION = 'gra';
    process.env.S3_BUCKET = 'leasetic-test';
    process.env.S3_ACCESS_KEY_ID = 'fake-key';
    process.env.S3_SECRET_ACCESS_KEY = 'fake-secret';
  }

  it('throws StorageError listing every missing var when none are set', () => {
    for (const k of keys) delete process.env[k];
    expect(() => new S3Storage()).toThrow(StorageError);
    expect(() => new S3Storage()).toThrow(/S3_ENDPOINT/);
    expect(() => new S3Storage()).toThrow(/S3_BUCKET/);
  });

  it('throws when only S3_ENDPOINT is missing', () => {
    setAll();
    delete process.env.S3_ENDPOINT;
    expect(() => new S3Storage()).toThrow(/S3_ENDPOINT/);
  });

  it('constructs successfully when all 5 env vars are present', () => {
    setAll();
    const driver = new S3Storage();
    expect(driver).toBeInstanceOf(S3Storage);
  });

  it('signedUrl rejects expiresInSeconds > 3600', async () => {
    setAll();
    const driver = new S3Storage();
    await expect(driver.signedUrl('test/key.bin', 3601)).rejects.toThrow(StorageError);
  });
});
