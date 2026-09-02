import { describe, expect, it } from 'vitest';
import { keepPairSeparateSchema, mergeCompanyPairSchema } from './schemas';

const PAIR_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SURVIVOR_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('mergeCompanyPairSchema', () => {
  it('parses a valid pairId + survivorCompanyId', () => {
    expect(mergeCompanyPairSchema.parse({ pairId: PAIR_ID, survivorCompanyId: SURVIVOR_ID })).toEqual({
      pairId: PAIR_ID,
      survivorCompanyId: SURVIVOR_ID,
    });
  });

  it('rejects a non-uuid pairId with error.field.required', () => {
    const result = mergeCompanyPairSchema.safeParse({ pairId: 'not-a-uuid', survivorCompanyId: SURVIVOR_ID });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('error.field.required');
    }
  });

  it('rejects a non-uuid survivorCompanyId with error.field.required', () => {
    const result = mergeCompanyPairSchema.safeParse({ pairId: PAIR_ID, survivorCompanyId: 'not-a-uuid' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('error.field.required');
    }
  });

  it('rejects a missing field', () => {
    const result = mergeCompanyPairSchema.safeParse({ pairId: PAIR_ID });
    expect(result.success).toBe(false);
  });
});

describe('keepPairSeparateSchema', () => {
  it('parses a valid pairId', () => {
    expect(keepPairSeparateSchema.parse({ pairId: PAIR_ID })).toEqual({ pairId: PAIR_ID });
  });

  it('rejects a non-uuid pairId with error.field.required', () => {
    const result = keepPairSeparateSchema.safeParse({ pairId: 'not-a-uuid' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('error.field.required');
    }
  });
});
