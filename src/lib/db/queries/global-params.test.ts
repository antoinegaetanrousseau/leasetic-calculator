import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/db', async () => {
  const real = await vi.importActual<typeof import('@/db/schema')>('@/db/schema');
  return {
    db: () => ({
      query: {
        globalParams: {
          findFirst: vi.fn(async () => null),
        },
      },
      insert: () => ({
        values: () => ({
          returning: async () => [{
            id: 'gp-1',
            effectiveFrom: new Date('2026-05-09T00:00:00Z'),
            createdBy: null,
            commissionPct: '5.0000',
            maxAmount: '500000.00',
            validityDays: 30,
            coefficients: {
              t1: { 36: '3.0000', 48: '2.3000', 60: '1.8765' },
              t2: { 36: '2.9000', 48: '2.2500', 60: '1.8500' },
              t3: { 36: '2.8000', 48: '2.2000', 60: '1.8000' },
              t4: { 36: '2.7000', 48: '2.1500', 60: '1.7500' },
            },
            note: null,
          }],
        }),
      }),
    }),
    schema: real,
  };
});

import { getLatestGlobalParams, insertGlobalParams } from './global-params';

describe('getLatestGlobalParams', () => {
  it('returns null when seed not yet applied', async () => {
    const row = await getLatestGlobalParams();
    expect(row).toBeNull();
  });
});

describe('insertGlobalParams', () => {
  it('returns the inserted row', async () => {
    const row = await insertGlobalParams({
      commissionPct: '5.0000',
      maxAmount: '500000.00',
      validityDays: 30,
      coefficients: {
        t1: { 36: '3.0000', 48: '2.3000', 60: '1.8765' },
        t2: { 36: '2.9000', 48: '2.2500', 60: '1.8500' },
        t3: { 36: '2.8000', 48: '2.2000', 60: '1.8000' },
        t4: { 36: '2.7000', 48: '2.1500', 60: '1.7500' },
      },
    });
    expect(row.id).toBe('gp-1');
    expect(row.commissionPct).toBe('5.0000');
  });
  it('preserves all coefficient tiers', async () => {
    const row = await insertGlobalParams({
      commissionPct: '5.0000',
      maxAmount: '500000.00',
      validityDays: 30,
      coefficients: {
        t1: { 36: '3.0000', 48: '2.3000', 60: '1.8765' },
        t2: { 36: '2.9000', 48: '2.2500', 60: '1.8500' },
        t3: { 36: '2.8000', 48: '2.2000', 60: '1.8000' },
        t4: { 36: '2.7000', 48: '2.1500', 60: '1.7500' },
      },
    });
    expect(row.coefficients.t1[36]).toBe('3.0000');
    expect(row.coefficients.t4[60]).toBe('1.7500');
    expect(row.validityDays).toBe(30);
  });
});
