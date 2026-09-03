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
      clientSiren: '123456789',
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
  clientSiren: '123 456 789',
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

  it('rejects a missing or blank SIREN (mandatory since 2026-09-03)', () => {
    expect(proposalInputSchema.safeParse({ ...validBase, clientSiren: '' }).success).toBe(false);
    const { clientSiren: _omit, ...withoutSiren } = validBase;
    void _omit;
    expect(proposalInputSchema.safeParse(withoutSiren).success).toBe(false);
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
      clientSiren: '123456789',
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

/**
 * Phase 34 Plan 02 Task 3 — D-23 / 33-REVIEW WR-15.
 *
 * `requiredSirenSchema` used to `.refine()` on a locally-written digit count
 * and never `.transform()`, so `proposals.inputs.clientSiren` was persisted
 * exactly as typed — with the SirenInput formatting spaces, and, for a caller
 * that is not the UI (POST /api/proposals parses this schema against a raw
 * body), with arbitrary junk around the digits. It now shares `normalizeSiren`
 * with `createClientSchema` and the reconciliation engine, so what gets stored
 * is what `companies_siren_check` and the matcher both expect: nine digits.
 *
 * FICHE-01 is what makes one rule load-bearing rather than cosmetic — the
 * SIREN is now the registry lookup key.
 */
describe('requiredSirenSchema converges on normalizeSiren (D-23 / WR-15)', () => {
  const base = {
    partnerCo: 'Société Informatique XY',
    partnerName: 'Antoine Rousseau',
    clientCo: 'ACME SARL',
    amountHT: '75000',
    durationMonths: 48 as const,
    validityDays: 30 as const,
  };

  const parseSiren = (clientSiren: unknown) =>
    proposalInputSchema.safeParse({ ...base, clientSiren });

  const messages = (r: ReturnType<typeof parseSiren>) =>
    r.success ? [] : r.error.issues.map((i) => i.message);

  it('test 1: a digits-only SIREN parses unchanged', () => {
    const r = parseSiren('552100554');
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.clientSiren).toBe('552100554');
  });

  it('test 2: formatting spaces are NORMALISED away, not merely tolerated', () => {
    const r = parseSiren('552 100 554');
    expect(r.success).toBe(true);
    // The old schema accepted this and stored it verbatim, spaces and all.
    if (r.success) expect(r.data.clientSiren).toBe('552100554');
  });

  it('test 3: WR-15’s counter-example no longer survives verbatim', () => {
    // WR-15's complaint is that `1a2b3c4d5e6f7g8h9` "strips to nine digits and
    // passes" — and was then PERSISTED AS TYPED. Sharing `normalizeSiren` is
    // what fixes that: the value still parses (nine digits are nine digits, in
    // this schema exactly as in `createClientSchema` and in the reconciliation
    // engine) but what reaches `proposals.inputs` is the normalised form. A
    // stricter rule here, and only here, would recreate the drift D-23 closes.
    const r = parseSiren('1a2b3c4d5e6f7g8h9');
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.clientSiren).toBe('123456789');
      expect(r.data.clientSiren).not.toBe('1a2b3c4d5e6f7g8h9');
    }
  });

  it('test 4: empty and blank stay error.field.required, not error.field.siren.invalid', () => {
    expect(messages(parseSiren(''))).toContain('error.field.required');
    expect(messages(parseSiren(''))).not.toContain('error.field.siren.invalid');
    expect(messages(parseSiren('   '))).toContain('error.field.required');
    expect(messages(parseSiren('   '))).not.toContain('error.field.siren.invalid');
    expect(messages(parseSiren(undefined))).toContain('error.field.required');
  });

  it('test 5: a digit count other than nine is error.field.siren.invalid', () => {
    expect(messages(parseSiren('55210055'))).toContain('error.field.siren.invalid');
    expect(messages(parseSiren('5521005541'))).toContain('error.field.siren.invalid');
    expect(messages(parseSiren('552 100 55'))).toContain('error.field.siren.invalid');
    expect(messages(parseSiren('SIREN inconnu'))).toContain('error.field.siren.invalid');
  });

  it('test 6: the full form output carries a digits-only clientSiren', () => {
    const parsed = proposalInputSchema.parse({
      ...base,
      clientSiren: '552 100 554',
      clientName: 'Jean Dupont',
      clientTel: '06 12 34 56 78',
    });
    expect(parsed.clientSiren).toBe('552100554');
    expect(/^[0-9]{9}$/.test(parsed.clientSiren)).toBe(true);
    // The SIREN is the registry lookup key (FICHE-01); the phone is NOT
    // normalised, so this is a deliberate difference, not an oversight.
    expect(parsed.clientTel).toBe('06 12 34 56 78');
  });
});
