import { describe, expect, it } from 'vitest';
import { advanceStageSchema, markLostSchema, markWonSchema } from './schemas';
import { PARTNER_SETTABLE_STAGES } from '@/lib/pipeline/stages';

const VALID_UUID = '11111111-1111-4111-8111-111111111111';

describe('advanceStageSchema', () => {
  it('accepts each of the five partner-settable stage values', () => {
    for (const stage of PARTNER_SETTABLE_STAGES) {
      const result = advanceStageSchema.safeParse({ relationshipId: VALID_UUID, toStage: stage });
      expect(result.success).toBe(true);
    }
  });

  it("rejects 'signe' — PIPE-02", () => {
    const result = advanceStageSchema.safeParse({ relationshipId: VALID_UUID, toStage: 'signe' });
    expect(result.success).toBe(false);
  });

  it("rejects 'debloque' — PIPE-02", () => {
    const result = advanceStageSchema.safeParse({ relationshipId: VALID_UUID, toStage: 'debloque' });
    expect(result.success).toBe(false);
  });

  it('rejects an arbitrary unknown stage string', () => {
    const result = advanceStageSchema.safeParse({ relationshipId: VALID_UUID, toStage: 'made-up-stage' });
    expect(result.success).toBe(false);
  });

  it('requires relationshipId to be a uuid', () => {
    const result = advanceStageSchema.safeParse({ relationshipId: 'not-a-uuid', toStage: 'prospect' });
    expect(result.success).toBe(false);
  });
});

describe('markWonSchema', () => {
  it('accepts an absent siren', () => {
    const result = markWonSchema.safeParse({ proposalId: VALID_UUID, date: '2026-09-03' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.siren).toBeUndefined();
    }
  });

  it('normalizes a formatted siren to digits-only', () => {
    const result = markWonSchema.safeParse({
      proposalId: VALID_UUID,
      date: '2026-09-03',
      siren: '123 456 789',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.siren).toBe('123456789');
    }
  });

  it('rejects a malformed siren', () => {
    const result = markWonSchema.safeParse({
      proposalId: VALID_UUID,
      date: '2026-09-03',
      siren: '12345',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('error.field.siren.invalid');
    }
  });

  it('requires date', () => {
    const result = markWonSchema.safeParse({ proposalId: VALID_UUID });
    expect(result.success).toBe(false);
  });
});

describe('markLostSchema', () => {
  it('has no siren member at all', () => {
    const result = markLostSchema.safeParse({
      proposalId: VALID_UUID,
      date: '2026-09-03',
      siren: '123456789',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.keys(result.data)).not.toContain('siren');
    }
  });

  it('rejects a reason of 501 characters', () => {
    const result = markLostSchema.safeParse({
      proposalId: VALID_UUID,
      date: '2026-09-03',
      reason: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('accepts a reason of exactly 500 characters', () => {
    const result = markLostSchema.safeParse({
      proposalId: VALID_UUID,
      date: '2026-09-03',
      reason: 'a'.repeat(500),
    });
    expect(result.success).toBe(true);
  });

  it('normalizes a blank reason to undefined', () => {
    const result = markLostSchema.safeParse({
      proposalId: VALID_UUID,
      date: '2026-09-03',
      reason: '   ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBeUndefined();
    }
  });
});
