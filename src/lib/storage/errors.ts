/**
 * Typed errors thrown by storage adapters. Callers match these classes
 * (e.g., `if (err instanceof StorageNotFoundError)`) without depending on
 * provider-specific error types from @vercel/blob or @aws-sdk/client-s3.
 */
export class StorageError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'StorageError';
  }
}

export class StorageNotFoundError extends StorageError {
  constructor(key: string, cause?: unknown) {
    super(`Storage object not found: ${key}`, cause);
    this.name = 'StorageNotFoundError';
  }
}

export class StorageAuthError extends StorageError {
  constructor(message = 'Storage authentication failed', cause?: unknown) {
    super(message, cause);
    this.name = 'StorageAuthError';
  }
}
