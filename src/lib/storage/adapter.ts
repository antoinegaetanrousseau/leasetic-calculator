/**
 * Storage adapter contract. Every storage operation in the application
 * goes through an instance of StorageAdapter. The concrete driver
 * (VercelBlobStorage or S3Storage) is selected at runtime by getStorage()
 * in src/lib/storage/index.ts based on STORAGE_DRIVER.
 *
 * Reference: ARCHITECTURE.md §5, STACK.md §5, PITFALLS §5.1-5.4.
 */
export interface StorageObject {
  key: string;
  size: number;
  etag: string;
  contentType: string;
  uploadedAt: Date;
}

export interface PutOptions {
  contentType: string;
  /** Cache-Control header on the stored object. Default 'private, max-age=0, no-store' per PITFALLS §5.4. */
  cacheControl?: string;
}

export interface StorageAdapter {
  /**
   * Upload a buffer to the given key. Always private access (per PITFALLS §5.2).
   * Throws StorageAuthError if credentials are invalid.
   */
  put(key: string, body: Buffer | Uint8Array, opts: PutOptions): Promise<StorageObject>;

  /**
   * Read an object's body. Throws StorageNotFoundError if the key does not exist.
   * Throws StorageAuthError on credential failure.
   */
  get(key: string): Promise<{ body: Buffer; contentType: string; size: number }>;

  /** Returns metadata or null if the key does not exist. Never throws on 404. */
  head(key: string): Promise<StorageObject | null>;

  /** Idempotent delete. No error if key already absent. */
  delete(key: string): Promise<void>;

  /**
   * Issue a short-lived signed URL.
   * @param expiresInSeconds — must be ≤ 3600 (1h). Adapters enforce this.
   */
  signedUrl(key: string, expiresInSeconds: number): Promise<string>;
}

/** Default cache-control for stored objects (per PITFALLS §5.4 — never let CDNs cache PDFs under signed URLs). */
export const DEFAULT_CACHE_CONTROL = 'private, max-age=0, no-store';

/** Maximum allowed signed-URL TTL. Defense in depth: keep download windows short. */
export const MAX_SIGNED_URL_TTL_SECONDS = 3600;
