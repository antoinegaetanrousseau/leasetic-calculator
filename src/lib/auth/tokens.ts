/**
 * Invitation / password-reset token generation.
 *
 * Per D-12 / 06-CONTEXT.md: tokens are 32 cryptographically random bytes,
 * encoded as URL-safe base64 (no padding), and stored in the DB as their
 * SHA-256 hex digest — never the plaintext. The plaintext exists only in
 * the URL the admin shares with the partner (pseudo-Stripe pattern).
 *
 * Server-only module: imports node:crypto. Do NOT import from a Client Component.
 */
import { randomBytes, createHash } from 'node:crypto';

/** Generated token tuple. Caller stores `hash` in DB, sends `plaintext` in URL. */
export interface TokenPair {
  /** URL-safe base64 of 32 random bytes (~43 chars, no padding). Goes in the URL. */
  plaintext: string;
  /** SHA-256 hex digest of plaintext (64 chars). Stored in password_resets.token_hash. */
  hash: string;
}

/**
 * Generate a fresh invitation/reset token. Each call produces a fresh random
 * 32-byte sequence; collision probability is cryptographically negligible.
 */
export function generateToken(): TokenPair {
  const bytes = randomBytes(32);
  const plaintext = bytes.toString('base64url');
  const hash = createHash('sha256').update(plaintext).digest('hex');
  return { plaintext, hash };
}

/**
 * Hash a token plaintext to its DB-stored form. Used by the redemption flow
 * (Plan 06-05) to look up `passwordResets.token_hash` from the URL plaintext.
 */
export function hashToken(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}
