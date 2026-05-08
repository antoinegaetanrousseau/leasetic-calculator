import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { generateToken, hashToken } from './tokens';

describe('tokens.ts', () => {
  it('generateToken returns {plaintext, hash} as strings', () => {
    const t = generateToken();
    expect(typeof t.plaintext).toBe('string');
    expect(typeof t.hash).toBe('string');
  });

  it('plaintext is base64url (no padding, no +/) and ~43 chars', () => {
    const { plaintext } = generateToken();
    expect(plaintext).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(plaintext).not.toContain('=');
    expect(plaintext).not.toContain('+');
    expect(plaintext).not.toContain('/');
    // 32 bytes → ceil(32 / 3) * 4 = 44, minus padding (none) = 43
    expect(plaintext.length).toBeGreaterThanOrEqual(42);
    expect(plaintext.length).toBeLessThanOrEqual(44);
  });

  it('hash is exactly 64 lowercase hex chars', () => {
    const { hash } = generateToken();
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('hash is SHA-256 of plaintext', () => {
    const { plaintext, hash } = generateToken();
    const expected = createHash('sha256').update(plaintext).digest('hex');
    expect(hash).toBe(expected);
  });

  it('hashToken matches generateToken().hash for the same plaintext', () => {
    const { plaintext, hash } = generateToken();
    expect(hashToken(plaintext)).toBe(hash);
  });

  it('1000 successive generations have no plaintext collisions', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const { plaintext } = generateToken();
      expect(seen.has(plaintext)).toBe(false);
      seen.add(plaintext);
    }
    expect(seen.size).toBe(1000);
  });
});
