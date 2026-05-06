export class DbError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'DbError';
  }
}

export class DbAuthError extends DbError {
  constructor(message = 'Database authentication failed', cause?: unknown) {
    super(message, cause);
    this.name = 'DbAuthError';
  }
}
