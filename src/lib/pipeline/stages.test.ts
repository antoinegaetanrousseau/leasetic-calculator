import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STAGE,
  isReservedStage,
  PARTNER_SETTABLE_STAGES,
  PIPELINE_STAGES,
  RESERVED_STAGES,
  STAGE_DICT_KEY,
} from './stages';

describe('PIPELINE_STAGES', () => {
  it('has exactly 7 entries in D-01 order', () => {
    expect(PIPELINE_STAGES).toEqual([
      'prospect',
      'qualifie',
      'proposition_envoyee',
      'negociation',
      'perdu',
      'signe',
      'debloque',
    ]);
    expect(PIPELINE_STAGES).toHaveLength(7);
  });
});

describe('RESERVED_STAGES / PARTNER_SETTABLE_STAGES partition', () => {
  it('are disjoint', () => {
    const overlap = RESERVED_STAGES.filter((s) => (PARTNER_SETTABLE_STAGES as readonly string[]).includes(s));
    expect(overlap).toHaveLength(0);
  });

  it('their union equals PIPELINE_STAGES', () => {
    const union = new Set([...RESERVED_STAGES, ...PARTNER_SETTABLE_STAGES]);
    expect(union).toEqual(new Set(PIPELINE_STAGES));
  });
});

describe('isReservedStage', () => {
  it('is true for exactly "signe" and "debloque"', () => {
    for (const stage of PIPELINE_STAGES) {
      expect(isReservedStage(stage)).toBe(stage === 'signe' || stage === 'debloque');
    }
  });

  it('is false for an arbitrary non-stage string', () => {
    expect(isReservedStage('not_a_stage')).toBe(false);
  });
});

describe('STAGE_DICT_KEY', () => {
  it('has a key for every member of PIPELINE_STAGES', () => {
    for (const stage of PIPELINE_STAGES) {
      expect(STAGE_DICT_KEY[stage]).toBeDefined();
      expect(STAGE_DICT_KEY[stage].startsWith('pipeline.stage.')).toBe(true);
    }
  });
});

describe('DEFAULT_STAGE', () => {
  it('is "prospect", matching the DB column default', () => {
    expect(DEFAULT_STAGE).toBe('prospect');
  });
});
