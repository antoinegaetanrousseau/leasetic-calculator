import { describe, it, expect } from 'vitest';
import { loginSchema, setPasswordSchema } from './schemas';

describe('loginSchema', () => {
  it('accepts a well-formed input', () => {
    const r = loginSchema.safeParse({ email: 'a@b.co', password: '12345678' });
    expect(r.success).toBe(true);
  });

  it('rejects malformed email', () => {
    const r = loginSchema.safeParse({ email: 'not-an-email', password: '12345678' });
    expect(r.success).toBe(false);
  });

  it('rejects too-short password (<8)', () => {
    const r = loginSchema.safeParse({ email: 'a@b.co', password: 'short' });
    expect(r.success).toBe(false);
  });

  it('rejects too-long password (>128)', () => {
    const r = loginSchema.safeParse({ email: 'a@b.co', password: 'x'.repeat(129) });
    expect(r.success).toBe(false);
  });
});

describe('setPasswordSchema', () => {
  it('accepts matching pair (>=8 chars)', () => {
    const r = setPasswordSchema.safeParse({ password: 'goodpassword', confirmPassword: 'goodpassword' });
    expect(r.success).toBe(true);
  });

  it('rejects mismatch with error path ["confirmPassword"]', () => {
    const r = setPasswordSchema.safeParse({ password: 'a-good-password', confirmPassword: 'b-good-password' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('confirmPassword');
    }
  });

  it('rejects too-short matching pair on path ["password"]', () => {
    const r = setPasswordSchema.safeParse({ password: 'short', confirmPassword: 'short' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('password');
    }
  });
});
