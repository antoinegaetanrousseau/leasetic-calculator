import { describe, it, expect } from 'vitest';
import {
  proposalInputSchema,
  validityDaysSchema,
  amountHTSchema,
  durationMonthsSchema,
  coefficientsSchema,
} from './index';

/**
 * v10 assertValidity port — CALC-05 suite 2/3.
 *
 * v10 (Matrice_2026_THE_Leasetic-v10.html lines 2027-2053):
 *   accepted: 15 / 30 / 60
 *   default on missing or invalid: 30
 *
 * The Phase 7 schema enforces the literal-union { 15 | 30 | 60 } at parse
 * time, with `.default(30)` applied at the proposalInputSchema level so the
 * form ALWAYS submits a valid validityDays. The 6 v10 cases below verify
 * the safeParse behaviour matches v10's getValidity() semantics in spirit
 * (parser-rejected vs parser-defaulted is the 1:1 mapping).
 */
describe('validityDaysSchema (v10 assertValidity port — CALC-05 2/3)', () => {
  it('case 1: missing input → schema field default 30 (proposalInputSchema)', () => {
    // Supply a complete object with validityDays omitted; .default(30) fires.
    const r = proposalInputSchema.parse({
      partnerCo: 'p',
      partnerName: 'pn',
      clientCo: 'cc',
      amountHT: '75000',
      durationMonths: 48,
    });
    expect(r.validityDays).toBe(30);
  });
  it('case 2: valid 15 accepted', () => {
    expect(validityDaysSchema.safeParse(15).success).toBe(true);
  });
  it('case 3: valid 30 accepted', () => {
    expect(validityDaysSchema.safeParse(30).success).toBe(true);
  });
  it('case 4: valid 60 accepted', () => {
    expect(validityDaysSchema.safeParse(60).success).toBe(true);
  });
  it('case 5: invalid 999 rejected (parser fails — caller falls back to 30 in form default)', () => {
    expect(validityDaysSchema.safeParse(999).success).toBe(false);
  });
  it('case 6: non-numeric "abc" rejected', () => {
    expect(validityDaysSchema.safeParse('abc').success).toBe(false);
  });
});

describe('amountHTSchema (PROP-08 + D-4 string-boundary)', () => {
  it('rejects empty', () => {
    expect(amountHTSchema.safeParse('').success).toBe(false);
  });
  it('rejects non-digit characters (e.g., spaces or letters)', () => {
    // Form-side formatter strips U+202F before submit; schema sees digits only.
    expect(amountHTSchema.safeParse('75 000').success).toBe(false);
    expect(amountHTSchema.safeParse('abc').success).toBe(false);
    expect(amountHTSchema.safeParse('75.000').success).toBe(false);
  });
  it('rejects amount === 25000 (v10 line 1196: amount > 25000)', () => {
    const r = amountHTSchema.safeParse('25000');
    expect(r.success).toBe(false);
  });
  it('accepts amount === 25001', () => {
    expect(amountHTSchema.safeParse('25001').success).toBe(true);
  });
  it("accepts large amounts (e.g., 999_999_999) — Zod schema does not enforce upper bound; on-demand check is computeLoyer's job (D-7-11)", () => {
    expect(amountHTSchema.safeParse('999999999').success).toBe(true);
  });
});

describe('durationMonthsSchema (v10 lines 577-581)', () => {
  it('accepts 36, 48, 60', () => {
    expect(durationMonthsSchema.safeParse(36).success).toBe(true);
    expect(durationMonthsSchema.safeParse(48).success).toBe(true);
    expect(durationMonthsSchema.safeParse(60).success).toBe(true);
  });
  it('rejects 24, 72, 0, "48", null', () => {
    expect(durationMonthsSchema.safeParse(24).success).toBe(false);
    expect(durationMonthsSchema.safeParse(72).success).toBe(false);
    expect(durationMonthsSchema.safeParse(0).success).toBe(false);
    expect(durationMonthsSchema.safeParse('48').success).toBe(false);
    expect(durationMonthsSchema.safeParse(null).success).toBe(false);
  });
});

describe('proposalInputSchema (PROP-06 + UI-SPEC §4 15-field inventory)', () => {
  const validBase = {
    partnerCo: 'Société Informatique XY',
    partnerName: 'Antoine Rousseau',
    clientCo: 'ACME SARL', // PROP-06 required
    amountHT: '75000',
    durationMonths: 48 as const,
    validityDays: 30 as const,
  };

  it('accepts the minimal valid payload', () => {
    expect(proposalInputSchema.safeParse(validBase).success).toBe(true);
  });

  it('rejects when clientCo is empty (PROP-06 / D-7-06)', () => {
    const r = proposalInputSchema.safeParse({ ...validBase, clientCo: '' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msgs = r.error.issues.map((i) => i.message);
      expect(msgs).toContain('error.field.client.co.required');
    }
  });

  it('rejects when amountHT is empty', () => {
    const r = proposalInputSchema.safeParse({ ...validBase, amountHT: '' });
    expect(r.success).toBe(false);
  });

  it('rejects when amountHT ≤ 25000', () => {
    const r = proposalInputSchema.safeParse({ ...validBase, amountHT: '25000' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msgs = r.error.issues.map((i) => i.message);
      expect(msgs).toContain('error.field.amount.too.small');
    }
  });

  it('accepts optional fields as empty strings or omitted', () => {
    expect(
      proposalInputSchema.safeParse({
        ...validBase,
        clientName: '',
        clientRole: '',
        clientTel: '',
        clientEmail: '',
        clientSiren: '',
        slb: false,
        evalParc: false,
        projectDesc: '',
        partnerRef: '',
      }).success,
    ).toBe(true);
  });

  it('rejects malformed email when client-email is non-empty', () => {
    const r = proposalInputSchema.safeParse({ ...validBase, clientEmail: 'not-an-email' });
    expect(r.success).toBe(false);
  });

  it('rejects phone with !==10 digits when non-empty', () => {
    const r = proposalInputSchema.safeParse({ ...validBase, clientTel: '06 12' });
    expect(r.success).toBe(false);
  });

  it('rejects SIREN with !==9 digits when non-empty', () => {
    const r = proposalInputSchema.safeParse({ ...validBase, clientSiren: '123 456' });
    expect(r.success).toBe(false);
  });

  it('accepts well-formed phone "06 12 34 56 78"', () => {
    expect(
      proposalInputSchema.safeParse({ ...validBase, clientTel: '06 12 34 56 78' }).success,
    ).toBe(true);
  });

  it('accepts well-formed SIREN "123 456 789"', () => {
    expect(
      proposalInputSchema.safeParse({ ...validBase, clientSiren: '123 456 789' }).success,
    ).toBe(true);
  });

  it('applies default validityDays=30 when omitted (D-7-05)', () => {
    const r = proposalInputSchema.parse({
      partnerCo: 'p',
      partnerName: 'pn',
      clientCo: 'cc',
      amountHT: '75000',
      durationMonths: 48,
    });
    expect(r.validityDays).toBe(30);
  });
});

describe('coefficientsSchema (D-2 typed constant validator)', () => {
  it('accepts the v10 fixture-shaped coefficient table', () => {
    const ok = coefficientsSchema.safeParse({
      t1: { 36: '3.0000', 48: '2.3000', 60: '1.8765' },
      t2: { 36: '2.9000', 48: '2.2500', 60: '1.8500' },
      t3: { 36: '2.8000', 48: '2.2000', 60: '1.8000' },
      t4: { 36: '2.7000', 48: '2.1500', 60: '1.7500' },
    });
    expect(ok.success).toBe(true);
  });
  it('rejects when a tranche row is missing', () => {
    const r = coefficientsSchema.safeParse({
      t1: { 36: '3.0', 48: '2.3', 60: '1.87' },
      // t2 missing
      t3: { 36: '2.8', 48: '2.2', 60: '1.8' },
      t4: { 36: '2.7', 48: '2.15', 60: '1.75' },
    });
    expect(r.success).toBe(false);
  });
});
