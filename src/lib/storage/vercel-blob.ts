import {
  put,
  head,
  del,
  get,
  BlobNotFoundError,
  BlobAccessError,
  BlobError,
} from '@vercel/blob';
import type { StorageAdapter, StorageObject, PutOptions } from './adapter';
import { MAX_SIGNED_URL_TTL_SECONDS } from './adapter';
import { StorageError, StorageNotFoundError, StorageAuthError } from './errors';

/**
 * Vercel Blob driver. Implements StorageAdapter against @vercel/blob v2.x.
 *
 * Architecture (PITFALLS §5.2, BOOT-04):
 *   The Vercel Blob *store* is provisioned with private access. Every SDK call
 *   here passes `access: 'private'` — operations against a public store would
 *   fail at the SDK validation layer.
 *
 *   With private stores:
 *   - put() returns a URL on the *.private.blob.vercel-storage.com host
 *   - Direct unauthed fetch of that URL returns 403 (server-enforced)
 *   - Reads MUST go through this driver's get() (uses the SDK's get() with the
 *     BLOB_READ_WRITE_TOKEN under the hood)
 *   - Application proxies all PDF reads through /api/proposals/{id}/pdf with
 *     auth + ownership checks (PITFALLS §5.3)
 *
 * SDK migration note: previously @vercel/blob 0.27.x used `access: 'public'` as
 * a workaround when private stores weren't yet shipped. v2.x makes private the
 * first-class option; this driver is the v2 rewrite.
 */
const ACCESS = 'private' as const;

export class VercelBlobStorage implements StorageAdapter {
  private readonly token: string;

  constructor() {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      throw new StorageAuthError(
        'BLOB_READ_WRITE_TOKEN env var is not set; cannot construct VercelBlobStorage'
      );
    }
    this.token = token;
  }

  /** Map a thrown BlobError subclass (or anything else) to one of our StorageError types. */
  private wrap(e: unknown, op: string, key: string): StorageError {
    if (e instanceof StorageError) return e;
    if (e instanceof BlobNotFoundError) return new StorageNotFoundError(key);
    if (e instanceof BlobAccessError) {
      return new StorageAuthError(`Vercel Blob auth failed during ${op} for key=${key}`);
    }
    if (e instanceof BlobError) {
      return new StorageError(`Vercel Blob ${op} failed for key=${key}: ${e.message}`, e);
    }
    return new StorageError(`Vercel Blob ${op} failed for key=${key}`, e);
  }

  async put(key: string, body: Buffer | Uint8Array, opts: PutOptions): Promise<StorageObject> {
    try {
      // Buffer.from() on a Buffer returns the same buffer (no copy); on Uint8Array it wraps.
      const bodyBuf: Buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
      const result = await put(key, bodyBuf, {
        access: ACCESS,
        contentType: opts.contentType,
        cacheControlMaxAge: 0, // PITFALLS §5.4
        addRandomSuffix: false,
        token: this.token,
      });
      // put() returns { url, downloadUrl, pathname } only. head() round-trips the
      // canonical metadata (size, etag, uploadedAt). One extra request, but ensures
      // StorageObject is fully populated with server values.
      const meta = await head(result.pathname, { token: this.token });
      return {
        key: meta.pathname,
        size: meta.size,
        etag: meta.etag,
        contentType: meta.contentType ?? opts.contentType,
        uploadedAt: meta.uploadedAt,
      };
    } catch (e) {
      throw this.wrap(e, 'put', key);
    }
  }

  async get(key: string): Promise<{ body: Buffer; contentType: string; size: number }> {
    try {
      const res = await get(key, { token: this.token, access: ACCESS });
      // v2 SDK get() returns null on missing blob (does NOT throw BlobNotFoundError here).
      if (res === null) {
        throw new StorageNotFoundError(key);
      }
      // res = { statusCode, stream: ReadableStream, headers, blob: { ...metadata } }
      // Convert the Web ReadableStream to a Buffer via the Response trick.
      const body = Buffer.from(await new Response(res.stream).arrayBuffer());
      const meta = res.blob;
      return {
        body,
        contentType: meta.contentType ?? 'application/octet-stream',
        size: meta.size ?? body.length,
      };
    } catch (e) {
      throw this.wrap(e, 'get', key);
    }
  }

  async head(key: string): Promise<StorageObject | null> {
    try {
      const meta = await head(key, { token: this.token });
      return {
        key: meta.pathname,
        size: meta.size,
        etag: meta.etag,
        contentType: meta.contentType ?? 'application/octet-stream',
        uploadedAt: meta.uploadedAt,
      };
    } catch (e) {
      // Per StorageAdapter contract, head() returns null on missing — never throws on 404.
      if (e instanceof BlobNotFoundError) return null;
      throw this.wrap(e, 'head', key);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await del(key, { token: this.token });
      // del() is idempotent in v2 — succeeds even if the blob doesn't exist
    } catch (e) {
      // Defense in depth: if SDK semantics change, treat NotFound as success
      if (e instanceof BlobNotFoundError) return;
      throw this.wrap(e, 'delete', key);
    }
  }

  async signedUrl(key: string, expiresInSeconds: number): Promise<string> {
    if (expiresInSeconds > MAX_SIGNED_URL_TTL_SECONDS) {
      throw new StorageError(
        `signedUrl expiresInSeconds=${expiresInSeconds} exceeds max=${MAX_SIGNED_URL_TTL_SECONDS}`
      );
    }
    // Private blob URLs are unguessable but do not embed an expiring signature.
    // For v1.1, signed-URL semantics are implemented at the application proxy layer
    // (Phase 8: /api/proposals/{id}/pdf with auth + ownership checks). This method
    // returns the canonical blob URL; the proxy is responsible for wrapping it in
    // an authenticated short-lived token.
    try {
      const meta = await head(key, { token: this.token });
      return meta.url;
    } catch (e) {
      if (e instanceof BlobNotFoundError) throw new StorageNotFoundError(key);
      throw this.wrap(e, 'signedUrl', key);
    }
  }
}
