import { describe, expect, it } from 'vitest';
import { contactSchema, createClientSchema, updateCompanyDisplaySchema } from './schemas';

describe('createClientSchema', () => {
  it('rejects a missing or blank siren (mandatory since 2026-09-03)', () => {
    const absent = createClientSchema.safeParse({ name: 'Dupont Menuiserie' });
    expect(absent.success).toBe(false);
    const blank = createClientSchema.safeParse({ name: 'Dupont Menuiserie', siren: '  ' });
    expect(blank.success).toBe(false);
    if (!blank.success) {
      expect(blank.error.issues[0].message).toBe('error.field.required');
    }
  });

  it('accepts a formatted siren and outputs digits-only', () => {
    const result = createClientSchema.safeParse({ name: 'X', siren: '123 456 789' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.siren).toBe('123456789');
    }
  });

  it('rejects a siren with the wrong digit count', () => {
    const result = createClientSchema.safeParse({ name: 'X', siren: '1234' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('error.field.siren.invalid');
    }
  });

  it('rejects an empty or whitespace-only name', () => {
    expect(createClientSchema.safeParse({ name: '' }).success).toBe(false);
    expect(createClientSchema.safeParse({ name: '   ' }).success).toBe(false);
  });
});

describe('contactSchema', () => {
  it('requires name, allows role/phone/email absent', () => {
    const result = contactSchema.safeParse({ name: 'Jean Dupont' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBeUndefined();
      expect(result.data.phone).toBeUndefined();
      expect(result.data.email).toBeUndefined();
    }
    expect(contactSchema.safeParse({}).success).toBe(false);
  });

  it('rejects an invalid email with the reused dictionary key', () => {
    const result = contactSchema.safeParse({ name: 'Jean', email: 'not-an-email' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('error.field.email.invalid');
    }
  });

  it('treats an empty-string email as absent, not invalid', () => {
    const result = contactSchema.safeParse({ name: 'Jean', email: '' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBeUndefined();
    }
  });
});

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Phase 34 Plan 07 — updateCompanyDisplaySchema (FICHE-03, D-01 shared tier)  */
/* ─────────────────────────────────────────────────────────────────────────── */

const REL_ID = '00000000-0000-4000-8000-000000000001';

describe('updateCompanyDisplaySchema', () => {
  it('accepts the four shared-tier fields with website and phone absent', () => {
    const result = updateCompanyDisplaySchema.safeParse({
      relationshipId: REL_ID,
      name: 'Dupont Menuiserie',
      siren: '552100554',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.website).toBeUndefined();
      expect(result.data.phone).toBeUndefined();
    }
  });

  it('rejects a name that trims to empty with the reused required key', () => {
    const result = updateCompanyDisplaySchema.safeParse({
      relationshipId: REL_ID,
      name: '   ',
      siren: '552100554',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('error.field.required');
    }
  });

  it('rejects a relationshipId that is not a uuid', () => {
    expect(
      updateCompanyDisplaySchema.safeParse({ relationshipId: 'nope', name: 'X', siren: '552100554' })
        .success,
    ).toBe(false);
  });

  it('normalises a formatted siren through the SAME normalizeSiren pair as createClientSchema', () => {
    const result = updateCompanyDisplaySchema.safeParse({
      relationshipId: REL_ID,
      name: 'X',
      siren: '552 100 554',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.siren).toBe('552100554');

    // Identical rule, identical output — the two schemas share one const.
    const viaCreate = createClientSchema.safeParse({ name: 'X', siren: '552 100 554' });
    expect(viaCreate.success && viaCreate.data.siren).toBe('552100554');
  });

  it('rejects a siren with the wrong digit count with the reused dictionary key', () => {
    const result = updateCompanyDisplaySchema.safeParse({
      relationshipId: REL_ID,
      name: 'X',
      siren: '1234',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('error.field.siren.invalid');
    }
  });

  it('STRIPS interleaved non-digits rather than rejecting them — measured behaviour of the shared rule', () => {
    // normalizeSiren() strips every non-digit and then checks the shape, so
    // "1a2b3c4d5e6f7g8h9" carries nine digits and normalises to 123456789.
    // 34-07-PLAN.md expected a rejection here; the shared rule (D-23: exactly
    // one normaliser in the codebase) says otherwise, and matching the plan
    // would have meant a second, divergent implementation. Pinned so the next
    // reader does not rediscover it.
    const result = updateCompanyDisplaySchema.safeParse({
      relationshipId: REL_ID,
      name: 'X',
      siren: '1a2b3c4d5e6f7g8h9',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.siren).toBe('123456789');
    expect(createClientSchema.safeParse({ name: 'X', siren: '1a2b3c4d5e6f7g8h9' }).success).toBe(true);
  });

  it('rejects a website that is not a plausible web address with the existing dictionary key', () => {
    const result = updateCompanyDisplaySchema.safeParse({
      relationshipId: REL_ID,
      name: 'X',
      siren: '552100554',
      website: 'not a url at all',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('error.field.url.invalid');
    }
  });

  it('accepts a bare-host website and an empty website as absent', () => {
    const bare = updateCompanyDisplaySchema.safeParse({
      relationshipId: REL_ID,
      name: 'X',
      siren: '552100554',
      website: 'dupont-menuiserie.fr',
      phone: '01 23 45 67 89',
    });
    expect(bare.success).toBe(true);

    const blank = updateCompanyDisplaySchema.safeParse({
      relationshipId: REL_ID,
      name: 'X',
      siren: '552100554',
      website: '   ',
    });
    expect(blank.success).toBe(true);
    if (blank.success) expect(blank.data.website).toBeUndefined();
  });
});
