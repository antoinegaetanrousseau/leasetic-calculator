/**
 * Phase 44 Plan 02 — `buildBackfillPdfData` tests (MIG-03, MIG-04, D-05,
 * D-02, FIELD-03).
 *
 * No `server-only` mock needed: `pdf-data.ts` carries no runtime import of
 * any server-only module (`ProposalDocumentProps` is imported as a type
 * only) — asserted directly below rather than assumed.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { proposalInputSchema } from '@/lib/calc';
import { buildBackfillPdfData } from './pdf-data';
import type { AdvisorIdentity, BackfillCandidate } from './types';

const ADVISOR: AdvisorIdentity = {
  name: 'Jeanne Dupont',
  fonction: 'Directrice commerciale',
  telephone: '0102030405',
  email: 'jeanne@leasetic.fr',
};

const BASE_INPUTS: Record<string, unknown> = {
  partnerName: 'Marc Partner',
  clientCo: 'ACME SAS',
  amountHT: '75000',
  durationMonths: 36,
  validityDays: 30,
};

const BASE_COMPUTED: Record<string, unknown> = {
  state: 'computed',
  trancheKey: 't2',
  loyerHT: '1234',
  coeff: '0.0321',
  isOnDemand: false,
};

function makeRow(overrides: Partial<BackfillCandidate> = {}): BackfillCandidate {
  return {
    id: 'proposal-1',
    userId: 'user-1',
    lcRef: 'LC-2026-0001',
    language: 'fr',
    status: 'active',
    createdAt: new Date('2026-01-15T10:00:00Z'),
    inputs: BASE_INPUTS,
    computed: BASE_COMPUTED,
    pdfBlobKey: 'proposals/user-1/proposal-1.pdf',
    partnerCompanyTelephone: '0611223344',
    ...overrides,
  };
}

describe('buildBackfillPdfData — computed is carried verbatim (D-05, MIG-04)', () => {
  it('the returned data.computed deep-equals the stored computed jsonb', () => {
    const result = buildBackfillPdfData({ row: makeRow(), advisor: ADVISOR });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.computed).toEqual(BASE_COMPUTED);
    }
  });

  it('falsification: changing one stored figure changes the returned prop with it', () => {
    const changed = { ...BASE_COMPUTED, loyerHT: '9999' };
    const result = buildBackfillPdfData({ row: makeRow({ computed: changed }), advisor: ADVISOR });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.computed).toEqual(changed);
      expect(result.data.computed).not.toEqual(BASE_COMPUTED);
    }
  });
});

describe('buildBackfillPdfData — language is never substituted (MIG-03)', () => {
  it('a row with language "en" yields data.language === "en"', () => {
    const result = buildBackfillPdfData({ row: makeRow({ language: 'en' }), advisor: ADVISOR });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.language).toBe('en');
    }
  });

  it('a row with language "fr" yields data.language === "fr"', () => {
    const result = buildBackfillPdfData({ row: makeRow({ language: 'fr' }), advisor: ADVISOR });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.language).toBe('fr');
    }
  });

  it('a row with an unsupported language returns invalid-language', () => {
    const result = buildBackfillPdfData({ row: makeRow({ language: 'de' }), advisor: ADVISOR });
    expect(result).toEqual({
      ok: false,
      reason: 'invalid-language',
      detail: expect.any(String),
    });
  });
});

describe('buildBackfillPdfData — legacy rows are not rejected (FIELD-03)', () => {
  it('a row missing clientSiret and partnerTel returns ok: true, and the same object is rejected by the strict wizard schema', () => {
    const legacyInputs: Record<string, unknown> = { ...BASE_INPUTS };
    expect('clientSiret' in legacyInputs).toBe(false);
    expect('partnerTel' in legacyInputs).toBe(false);

    const result = buildBackfillPdfData({ row: makeRow({ inputs: legacyInputs }), advisor: ADVISOR });
    expect(result.ok).toBe(true);

    // Pin the divergence as intentional: the strict schema used at proposal
    // WRITE time rejects this exact legacy shape (no clientSiren/clientSiret,
    // amountHT below the write-time floor is not even reached).
    const strict = proposalInputSchema.safeParse(legacyInputs);
    expect(strict.success).toBe(false);
  });
});

describe('buildBackfillPdfData — invalid inputs are bounded and redacted', () => {
  it('a row missing amountHT returns invalid-inputs with a field-name-only detail', () => {
    const { amountHT: _omit, ...withoutAmount } = BASE_INPUTS;
    void _omit;
    const result = buildBackfillPdfData({ row: makeRow({ inputs: withoutAmount }), advisor: ADVISOR });
    expect(result).toEqual({
      ok: false,
      reason: 'invalid-inputs',
      detail: expect.stringContaining('amountHT'),
    });
    if (!result.ok) {
      expect(result.detail).not.toMatch(/75000/);
    }
  });
});

describe('buildBackfillPdfData — invalid/missing computed', () => {
  it('computed: null returns invalid-computed', () => {
    const result = buildBackfillPdfData({ row: makeRow({ computed: null }), advisor: ADVISOR });
    expect(result).toEqual({
      ok: false,
      reason: 'invalid-computed',
      detail: expect.any(String),
    });
  });

  it('a malformed computed shape returns invalid-computed', () => {
    const result = buildBackfillPdfData({
      row: makeRow({ computed: { state: 'nonsense' } }),
      advisor: ADVISOR,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('invalid-computed');
    }
  });
});

describe('buildBackfillPdfData — missing lc_ref is a bounded failure, not a crash (D-10)', () => {
  it('lcRef: null returns missing-lc-ref', () => {
    const result = buildBackfillPdfData({ row: makeRow({ lcRef: null }), advisor: ADVISOR });
    expect(result).toEqual({
      ok: false,
      reason: 'missing-lc-ref',
      detail: expect.any(String),
    });
  });
});

describe('buildBackfillPdfData — a null advisor is a valid render (Phase 43 D-13)', () => {
  it('advisor: null returns ok: true with data.advisor === null', () => {
    const result = buildBackfillPdfData({ row: makeRow(), advisor: null });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.advisor).toBeNull();
    }
  });
});

describe('buildBackfillPdfData — D-02 live-read bindings', () => {
  it('partner.companyTelephone is the row live-read value, passed through unchanged', () => {
    const result = buildBackfillPdfData({
      row: makeRow({ partnerCompanyTelephone: '0699887766' }),
      advisor: ADVISOR,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.partner.companyTelephone).toBe('0699887766');
    }
  });
});

describe('pdf-data.ts source assertions (executable form of D-05 and the runtime-import contract)', () => {
  it('the module source never matches computeLoyer/getLatestGlobalParams/params_snapshot/paramsSnapshot', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, 'pdf-data.ts'), 'utf8');
    expect(src).not.toMatch(/computeLoyer|getLatestGlobalParams|params_snapshot|paramsSnapshot/);
  });

  it('the module source carries no server-only import', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, 'pdf-data.ts'), 'utf8');
    expect(src).not.toMatch(/^import ['"]server-only['"]/m);
  });
});
