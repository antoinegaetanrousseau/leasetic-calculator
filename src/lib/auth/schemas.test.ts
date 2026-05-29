import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  setPasswordSchema,
  changePasswordSchema,
  identitySchema,
} from './schemas';

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

// ── Phase 21 / Plan 21-01 (D-06, D-06d, D-07 rev 2) ─────────────────────────
// changePasswordSchema is the resolver for the /parametres password section
// (Ancien mot de passe + Nouveau mot de passe). Rev 2 dropped the
// "Confirmer le nouveau mot de passe" field — schema enforces only the two
// fields Better Auth's changePassword endpoint needs. No client-side equality
// refine (CONTEXT.md D-07 accepted UX risk).

describe('changePasswordSchema (Phase 21)', () => {
  it('accepts a well-formed pair (currentPassword + newPassword ≥ 8 chars)', () => {
    const r = changePasswordSchema.safeParse({
      currentPassword: 'abc',
      newPassword: 'newpass12',
    });
    expect(r.success).toBe(true);
  });

  it('rejects empty currentPassword on path ["currentPassword"]', () => {
    const r = changePasswordSchema.safeParse({
      currentPassword: '',
      newPassword: 'newpass12',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('currentPassword');
    }
  });

  it('rejects newPassword.length < 8 on path ["newPassword"]', () => {
    const r = changePasswordSchema.safeParse({
      currentPassword: 'abc',
      newPassword: 'short',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('newPassword');
    }
  });

  it('rejects newPassword.length > 128 on path ["newPassword"]', () => {
    const r = changePasswordSchema.safeParse({
      currentPassword: 'abc',
      newPassword: 'x'.repeat(129),
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('newPassword');
    }
  });

  it('does NOT enforce confirmNewPassword (rev 2 — no equality refine)', () => {
    // The schema must NOT have a `confirmNewPassword` key — extra fields are
    // stripped by Zod's default object behavior. The schema parses with only
    // the two declared fields and ignores anything else.
    const r = changePasswordSchema.safeParse({
      currentPassword: 'abc',
      newPassword: 'newpass12',
      // No confirm field — the schema would fail at this assertion if rev 1's
      // confirmNewPassword field were present (it would be required).
    });
    expect(r.success).toBe(true);
  });
});

// identitySchema is the resolver for the Prénom + Nom (and conditionally Email)
// identity section. Per the Task 1 Step A DB probe, D-06d resolved to
// "email READ-ONLY" — the schema OMITS the email field. The Paramètres form
// renders the email as static text + an admin-contact notice.

describe('identitySchema (Phase 21)', () => {
  it('accepts well-formed firstName + lastName', () => {
    const r = identitySchema.safeParse({
      firstName: 'Antoine',
      lastName: 'Rousseau',
    });
    expect(r.success).toBe(true);
  });

  it('rejects empty firstName on path ["firstName"]', () => {
    const r = identitySchema.safeParse({
      firstName: '',
      lastName: 'Rousseau',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('firstName');
    }
  });

  it('rejects empty lastName on path ["lastName"]', () => {
    const r = identitySchema.safeParse({
      firstName: 'Antoine',
      lastName: '',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('lastName');
    }
  });

  it('rejects firstName.length > 60 on path ["firstName"]', () => {
    const r = identitySchema.safeParse({
      firstName: 'x'.repeat(61),
      lastName: 'Rousseau',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('firstName');
    }
  });

  it('rejects lastName.length > 60 on path ["lastName"]', () => {
    const r = identitySchema.safeParse({
      firstName: 'Antoine',
      lastName: 'x'.repeat(61),
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('lastName');
    }
  });
});
