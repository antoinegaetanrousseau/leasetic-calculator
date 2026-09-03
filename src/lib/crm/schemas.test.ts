import { describe, expect, it } from 'vitest';
import { contactSchema, createClientSchema } from './schemas';

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
