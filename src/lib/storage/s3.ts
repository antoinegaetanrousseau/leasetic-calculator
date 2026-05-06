import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageAdapter, StorageObject, PutOptions } from './adapter';
import { DEFAULT_CACHE_CONTROL, MAX_SIGNED_URL_TTL_SECONDS } from './adapter';
import { StorageError, StorageNotFoundError, StorageAuthError } from './errors';

/**
 * S3-compatible driver. Works against any S3-compatible endpoint:
 *   - AWS S3
 *   - OVH Object Storage (the production target for Phase 10 cutover)
 *   - Scaleway, MinIO, Cloudflare R2 with API endpoint set
 *
 * IMPORTANT for OVH (per STACK.md §5): use `forcePathStyle: true` because
 * OVH Object Storage doesn't support virtual-hosted-style URLs.
 */
export class S3Storage implements StorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION;
    const bucket = process.env.S3_BUCKET;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

    const missing: string[] = [];
    if (!endpoint) missing.push('S3_ENDPOINT');
    if (!region) missing.push('S3_REGION');
    if (!bucket) missing.push('S3_BUCKET');
    if (!accessKeyId) missing.push('S3_ACCESS_KEY_ID');
    if (!secretAccessKey) missing.push('S3_SECRET_ACCESS_KEY');
    if (missing.length > 0) {
      throw new StorageError(
        `S3Storage missing required env vars: ${missing.join(', ')}`
      );
    }

    this.bucket = bucket!;
    this.client = new S3Client({
      endpoint: endpoint!,
      region: region!,
      credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
      forcePathStyle: true, // required for OVH Object Storage and most non-AWS providers
    });
  }

  async put(key: string, body: Buffer | Uint8Array, opts: PutOptions): Promise<StorageObject> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: opts.contentType,
          CacheControl: opts.cacheControl ?? DEFAULT_CACHE_CONTROL,
          // Private by default (PITFALLS §5.2). Bucket-level policy must also enforce private.
          ACL: 'private',
        })
      );
      const headInfo = await this.head(key);
      if (!headInfo) {
        throw new StorageError(`S3 put for key=${key} succeeded but head returned null`);
      }
      return headInfo;
    } catch (e) {
      if (e instanceof StorageError) throw e;
      if (this.isAuthError(e)) throw new StorageAuthError('S3 put auth failed', e);
      throw new StorageError(`S3 put failed for key=${key}`, e);
    }
  }

  async get(key: string): Promise<{ body: Buffer; contentType: string; size: number }> {
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key })
      );
      if (!res.Body) throw new StorageNotFoundError(key);
      // Body is a ReadableStream in Node 18+; collect into a Buffer.
      const chunks: Buffer[] = [];
      // @ts-expect-error -- Body has Symbol.asyncIterator at runtime in Node
      for await (const chunk of res.Body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const body = Buffer.concat(chunks);
      return {
        body,
        contentType: res.ContentType ?? 'application/octet-stream',
        size: res.ContentLength ?? body.length,
      };
    } catch (e) {
      if (e instanceof StorageError) throw e;
      if (this.isNotFound(e)) throw new StorageNotFoundError(key, e);
      if (this.isAuthError(e)) throw new StorageAuthError('S3 get auth failed', e);
      throw new StorageError(`S3 get failed for key=${key}`, e);
    }
  }

  async head(key: string): Promise<StorageObject | null> {
    try {
      const res = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key })
      );
      return {
        key,
        size: res.ContentLength ?? 0,
        etag: res.ETag ?? '',
        contentType: res.ContentType ?? 'application/octet-stream',
        uploadedAt: res.LastModified ?? new Date(0),
      };
    } catch (e) {
      if (this.isNotFound(e)) return null;
      if (this.isAuthError(e)) throw new StorageAuthError('S3 head auth failed', e);
      throw new StorageError(`S3 head failed for key=${key}`, e);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
      );
    } catch (e) {
      // S3 DELETE is idempotent at the protocol level; swallow not-found.
      if (this.isNotFound(e)) return;
      if (this.isAuthError(e)) throw new StorageAuthError('S3 delete auth failed', e);
      throw new StorageError(`S3 delete failed for key=${key}`, e);
    }
  }

  async signedUrl(key: string, expiresInSeconds: number): Promise<string> {
    if (expiresInSeconds > MAX_SIGNED_URL_TTL_SECONDS) {
      throw new StorageError(
        `signedUrl expiresInSeconds=${expiresInSeconds} exceeds max=${MAX_SIGNED_URL_TTL_SECONDS}`
      );
    }
    try {
      return await getSignedUrl(
        this.client,
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { expiresIn: expiresInSeconds }
      );
    } catch (e) {
      throw new StorageError(`S3 signedUrl failed for key=${key}`, e);
    }
  }

  /** Discriminate "object not found" errors across S3-compatible providers. */
  private isNotFound(e: unknown): boolean {
    if (!e || typeof e !== 'object') return false;
    const err = e as { name?: string; $metadata?: { httpStatusCode?: number } };
    return (
      err.name === 'NoSuchKey' ||
      err.name === 'NotFound' ||
      err.$metadata?.httpStatusCode === 404
    );
  }

  /** Discriminate auth/permission errors. */
  private isAuthError(e: unknown): boolean {
    if (!e || typeof e !== 'object') return false;
    const err = e as { name?: string; $metadata?: { httpStatusCode?: number } };
    const status = err.$metadata?.httpStatusCode;
    return (
      err.name === 'AccessDenied' ||
      err.name === 'InvalidAccessKeyId' ||
      err.name === 'SignatureDoesNotMatch' ||
      status === 401 ||
      status === 403
    );
  }
}
