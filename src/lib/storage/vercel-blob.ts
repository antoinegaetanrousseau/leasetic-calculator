import { put, head, del, list } from '@vercel/blob';
import type { StorageAdapter, StorageObject, PutOptions } from './adapter';
import { MAX_SIGNED_URL_TTL_SECONDS } from './adapter';
import { StorageError, StorageNotFoundError, StorageAuthError } from './errors';

/**
 * Vercel Blob driver. Implements StorageAdapter against @vercel/blob.
 *
 * IMPORTANT (PITFALLS §5.2): Vercel Blob URLs returned by put() are PUBLIC by default
 * (unguessable, but anyone with the URL can fetch). For Phase 8 PDF storage, this is
 * NOT sufficient. We therefore:
 *   1. Use unguessable keys (uuid in path) with access: 'public' on put()
 *   2. NEVER expose the put() URL outside the storage layer
 *   3. The application proxies all PDF reads through /api/proposals/{id}/pdf which
 *      reads via this driver's get() method (server-to-server) and re-streams with
 *      auth + ownership checks (see PITFALLS §5.3)
 *
 * As of @vercel/blob 0.27.x, `access: 'private'` is not yet a stable option.
 * The contract above (proxy through authenticated route) is the v1.1 mitigation.
 * If/when Vercel Blob ships true private access, switch the access option here
 * and adjust the proxy route accordingly.
 */
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

  async put(key: string, body: Buffer | Uint8Array, opts: PutOptions): Promise<StorageObject> {
    try {
      // addRandomSuffix: false because we already include uuid in the key (proposals/{userId}/{proposalId}.pdf)
      // Vercel Blob's PutBody type accepts Buffer | File | ArrayBuffer but not plain Uint8Array.
      // Buffer.from() on a Buffer returns the same buffer (no copy); on Uint8Array it wraps.
      const bodyBuf: Buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
      const result = await put(key, bodyBuf, {
        access: 'public',
        contentType: opts.contentType,
        cacheControlMaxAge: 0, // never cache; PITFALLS §5.4
        addRandomSuffix: false,
        token: this.token,
      });
      // Vercel Blob's put() returns { url, downloadUrl, pathname, contentType, contentDisposition }.
      // We do a head() to get full metadata for the StorageObject envelope.
      const headInfo = await head(result.url, { token: this.token });
      return {
        key,
        size: headInfo.size,
        // Vercel Blob doesn't expose a stable etag; use the URL as the immutable identity
        etag: headInfo.url,
        contentType: headInfo.contentType ?? opts.contentType,
        uploadedAt: headInfo.uploadedAt,
      };
    } catch (e) {
      if (e instanceof StorageError) throw e;
      throw new StorageError(`Vercel Blob put failed for key=${key}`, e);
    }
  }

  async get(key: string): Promise<{ body: Buffer; contentType: string; size: number }> {
    // Vercel Blob: find by pathname via head(), then fetch.
    const found = await this.head(key);
    if (found === null) throw new StorageNotFoundError(key);
    const res = await fetch(found.etag /* the URL */, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (res.status === 404) throw new StorageNotFoundError(key);
    if (res.status === 401 || res.status === 403) {
      throw new StorageAuthError(`Vercel Blob auth failed reading ${key}`);
    }
    if (!res.ok) throw new StorageError(`Vercel Blob get failed status=${res.status}`);
    const arr = new Uint8Array(await res.arrayBuffer());
    return {
      body: Buffer.from(arr),
      contentType: found.contentType,
      size: found.size,
    };
  }

  async head(key: string): Promise<StorageObject | null> {
    // Use list() with prefix and filter to an exact pathname match.
    const listResult = await list({ prefix: key, limit: 10, token: this.token });
    const exact = listResult.blobs.find((b) => b.pathname === key);
    if (!exact) return null;
    return {
      key,
      size: exact.size,
      etag: exact.url,
      // list() doesn't return contentType; would need head() for accurate value.
      // Use 'application/octet-stream' as the safe fallback.
      contentType: 'application/octet-stream',
      uploadedAt: exact.uploadedAt,
    };
  }

  async delete(key: string): Promise<void> {
    const found = await this.head(key);
    if (!found) return; // idempotent
    try {
      await del(found.etag /* URL */, { token: this.token });
    } catch (e) {
      throw new StorageError(`Vercel Blob delete failed for key=${key}`, e);
    }
  }

  async signedUrl(key: string, expiresInSeconds: number): Promise<string> {
    if (expiresInSeconds > MAX_SIGNED_URL_TTL_SECONDS) {
      throw new StorageError(
        `signedUrl expiresInSeconds=${expiresInSeconds} exceeds max=${MAX_SIGNED_URL_TTL_SECONDS}`
      );
    }
    // Vercel Blob URLs are unguessable but not signed in the AWS sense.
    // For the v1.1 architecture, signed URLs are issued by the application proxy,
    // not by the blob layer. Return the head URL; the proxy is responsible for
    // wrapping it in an authenticated short-lived token (see PITFALLS §5.2).
    const found = await this.head(key);
    if (!found) throw new StorageNotFoundError(key);
    return found.etag;
  }
}
