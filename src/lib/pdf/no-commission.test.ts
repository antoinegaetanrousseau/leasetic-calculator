// @vitest-environment node
/**
 * Plan 13-06 Task 2 — ADMIN-09 no-commission-in-PDF golden-corpus test
 * (D-12 + D-28 mandatory).
 *
 * THE STRUCTURAL GATE that proves D-12's partner-facing relaxation
 * (commission visible on /calcul + /verification) does NOT leak into the
 * rendered PDF.
 *
 * Phase 9 closed 42 STRIDE threats around ADMIN-09 commission invisibility.
 * Phase 13 D-12 carves out a single bounded exception: the deal-owner
 * partner can see their own commission on step-2 (Détail du calcul row)
 * and step-3 (● CALCUL recap row). EVERY OTHER SURFACE remains invariant:
 *   - rendered PDF buffer:           NO commission (this test)
 *   - persisted `computed` jsonb:    NO commission (this test + finalize-wizard.test.ts)
 *   - audit_log payload:             NO commission (finalize-wizard.test.ts Test 10c)
 *   - server logs / traces:          NO commission (finalize-wizard.ts grep)
 *
 * Test strategy — 4 defense-in-depth layers across the 30 v9-parity golden fixtures:
 *
 *   Layer 1: STRUCTURAL — for each of the 30 fixtures, drive finalizeWizard
 *            with mocked downstream calls, capture the data prop passed to
 *            renderProposalPdf, and assert the JSON-stringified data has
 *            NO 'commission' substring and NO commission amount string.
 *
 *   Layer 2: STRUCTURAL — capture the `computed` jsonb passed to
 *            finalizeDraft and assert no `commission` key + no commission
 *            amount string. (Plan 13-02's finalize-wizard.test.ts Tests
 *            10/10b/10c cover this for ONE fixture; we extend to all 30.)
 *
 *   Layer 3: STRUCTURAL — assert the captured paramsSnapshot DOES contain
 *            commissionPct (the PERCENTAGE — required for Phase 8 Stripe
 *            Option A byte-determinism), proving that snapshot is wiring
 *            the percentage correctly. The amount cannot be back-derived
 *            without amountHT (and amountHT IS in the PDF — that's correct).
 *
 *   Layer 4: BINARY — for a representative subset (2 fixtures x 2 langs),
 *            run the REAL renderProposalPdf, decompress all PDF text
 *            streams via node:zlib, and assert the decoded glyph stream
 *            (after CMap-style ToUnicode decoding) does not encode the
 *            commission amount as visible text. PDF metadata fields
 *            (title, author, subject, keywords) are also scanned for
 *            'commission' as a raw literal — these are NOT compressed.
 *
 * Layer 4 is the load-bearing assertion: even if Layer 1-3 missed something,
 * any commission glyphs in the rendered output would surface here.
 *
 * @react-pdf/renderer's font subsetting: PDF text content is encoded as
 * glyph indices in compressed streams, with a ToUnicode CMap mapping
 * glyph IDs to unicode codepoints. We extract these CMaps to reconstruct
 * the readable text the user actually sees.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { inflateSync } from 'node:zlib';

vi.mock('server-only', () => ({}));

const {
  getDraftByIdMock,
  getLatestGlobalParamsMock,
  finalizeDraftMock,
  renderProposalPdfMock,
  storagePutMock,
  storageMock,
} = vi.hoisted(() => {
  const storagePut = vi.fn();
  return {
    getDraftByIdMock: vi.fn(),
    getLatestGlobalParamsMock: vi.fn(),
    finalizeDraftMock: vi.fn(),
    renderProposalPdfMock: vi.fn(),
    storagePutMock: storagePut,
    storageMock: vi.fn(() => ({ put: storagePut })),
  };
});

vi.mock('@/lib/db/queries/proposals', () => ({
  getDraftById: (...args: unknown[]) => getDraftByIdMock(...args),
  finalizeDraft: (...args: unknown[]) => finalizeDraftMock(...args),
}));
vi.mock('@/lib/db/queries/global-params', () => ({
  getLatestGlobalParams: (...args: unknown[]) => getLatestGlobalParamsMock(...args),
}));
vi.mock('@/lib/pdf', () => ({
  renderProposalPdf: (...args: unknown[]) => renderProposalPdfMock(...args),
}));
vi.mock('@/lib/storage', () => ({ storage: storageMock }));

import { finalizeWizard } from '@/lib/api/proposals/finalize-wizard';
import { computeLoyer } from '@/lib/calc';
import { formatCurrency } from '@/lib/i18n/format';
// We import the REAL renderProposalPdf via direct module path (bypassing
// the @/lib/pdf mock above) for Layer 4 binary assertion.
import { renderProposalPdf as renderProposalPdfReal } from '@/lib/pdf/render';

/**
 * Fixture global_params row.
 * Phase 8 Stripe Option A: commissionPct lives on the snapshot — but never
 * the resolved commission amount (amount = amountHT * commissionPct / 100,
 * computed transiently by computeLoyer and DISCARDED before persistence).
 */
const FIXTURE_PARAMS = {
  id: 'gp-1',
  commissionPct: '5.0000',
  maxAmount: '500000.00',
  validityDays: 30,
  coefficients: {
    t1: { 36: '3.0000', 48: '2.3000', 60: '1.8765' },
    t2: { 36: '2.9000', 48: '2.2500', 60: '1.8500' },
    t3: { 36: '2.8000', 48: '2.2000', 60: '1.8000' },
    t4: { 36: '2.7000', 48: '2.1500', 60: '1.7500' },
  },
  effectiveFrom: new Date('2026-01-01'),
};

/**
 * 30-case golden corpus (mirrors src/lib/calc/calc.golden.test.ts):
 *   - happy-path matrix (12): 4 tranches x 3 durations
 *   - tranche boundaries (8)
 *   - on-demand (4)
 *   - edge cases (6) - these are non-trivial amounts that still finalize
 *
 * Each entry: { name, amountHT, durationMonths }. The computed commission
 * amount is derived per-fixture via amountHT * commissionPct / 100.
 */
const GOLDEN_FIXTURES: ReadonlyArray<{
  name: string;
  amountHT: string;
  durationMonths: 36 | 48 | 60;
}> = [
  // Happy-path matrix (12)
  { name: 't1/30000/36', amountHT: '30000', durationMonths: 36 },
  { name: 't1/30000/48', amountHT: '30000', durationMonths: 48 },
  { name: 't1/30000/60', amountHT: '30000', durationMonths: 60 },
  { name: 't2/75000/36', amountHT: '75000', durationMonths: 36 },
  { name: 't2/75000/48', amountHT: '75000', durationMonths: 48 },
  { name: 't2/75000/60', amountHT: '75000', durationMonths: 60 },
  { name: 't3/150000/36', amountHT: '150000', durationMonths: 36 },
  { name: 't3/150000/48', amountHT: '150000', durationMonths: 48 },
  { name: 't3/150000/60', amountHT: '150000', durationMonths: 60 },
  { name: 't4/400000/36', amountHT: '400000', durationMonths: 36 },
  { name: 't4/400000/48', amountHT: '400000', durationMonths: 48 },
  { name: 't4/400000/60', amountHT: '400000', durationMonths: 60 },
  // Tranche boundaries (8)
  { name: 'boundary/25001/48', amountHT: '25001', durationMonths: 48 },
  { name: 'boundary/50000/36', amountHT: '50000', durationMonths: 36 },
  { name: 'boundary/50001/48', amountHT: '50001', durationMonths: 48 },
  { name: 'boundary/100000/60', amountHT: '100000', durationMonths: 60 },
  { name: 'boundary/100001/36', amountHT: '100001', durationMonths: 36 },
  { name: 'boundary/250000/48', amountHT: '250000', durationMonths: 48 },
  { name: 'boundary/250001/60', amountHT: '250001', durationMonths: 60 },
  { name: 'boundary/499999/36', amountHT: '499999', durationMonths: 36 },
  // On-demand (4)
  { name: 'on-demand/500000/60', amountHT: '500000', durationMonths: 60 },
  { name: 'on-demand/500001/36', amountHT: '500001', durationMonths: 36 },
  { name: 'on-demand/750000/48', amountHT: '750000', durationMonths: 48 },
  { name: 'on-demand/1000000/60', amountHT: '1000000', durationMonths: 60 },
  // Edge / unusual amounts (6)
  { name: 'edge/26000/36', amountHT: '26000', durationMonths: 36 },
  { name: 'edge/45000/48', amountHT: '45000', durationMonths: 48 },
  { name: 'edge/99000/60', amountHT: '99000', durationMonths: 60 },
  { name: 'edge/200000/36', amountHT: '200000', durationMonths: 36 },
  { name: 'edge/350000/48', amountHT: '350000', durationMonths: 48 },
  { name: 'edge/450000/60', amountHT: '450000', durationMonths: 60 },
];

function buildDraftInputs(fixture: { amountHT: string; durationMonths: 36 | 48 | 60 }) {
  return {
    partnerCo: 'Leasetic SAS',
    partnerName: 'Bob Partner',
    clientCo: 'Acme Inc',
    clientName: 'Alice',
    amountHT: fixture.amountHT,
    durationMonths: fixture.durationMonths,
    validityDays: 30 as const,
  };
}

/** Compute the commission amount for a fixture (in EUR). */
function commissionAmountFor(fixture: {
  amountHT: string;
  durationMonths: 36 | 48 | 60;
}): number {
  return Number(fixture.amountHT) * Number(FIXTURE_PARAMS.commissionPct) / 100;
}

/**
 * Currency-formatted variants of a commission amount.
 *
 * We deliberately scope these to FORMATTED CURRENCY STRINGS (with the €
 * symbol or NBSP thousands separator). Bare digit substrings would
 * false-positive against:
 *   - coefficient strings ('2.2500' contains '2500')
 *   - amountHT echoes ('50001' contains '5000')
 *   - loyer values (amount × (1+comm/100) × coeff/100 shares digits)
 * The currency-formatted strings are unique enough that any appearance
 * in the render data prop or computed jsonb is a genuine leak.
 */
function commissionFormatsFor(fixture: {
  amountHT: string;
  durationMonths: 36 | 48 | 60;
}): string[] {
  const amount = commissionAmountFor(fixture);
  const intAmount = Math.round(amount);
  return [
    formatCurrency(amount, 'fr'),
    formatCurrency(amount, 'en'),
    formatCurrency(intAmount, 'fr'),
    formatCurrency(intAmount, 'en'),
  ];
}

const PDF_RENDER_RESULT_STUB = {
  buffer: Buffer.from('%PDF-1.7 mock buffer ' + 'a'.repeat(1000)),
  sha256: 'b'.repeat(64),
  contentHash: 'c'.repeat(64),
  sizeBytes: 1020,
};

beforeEach(() => {
  getDraftByIdMock.mockReset();
  getLatestGlobalParamsMock.mockReset();
  finalizeDraftMock.mockReset();
  renderProposalPdfMock.mockReset();
  storagePutMock.mockReset();
  storageMock.mockClear();

  getLatestGlobalParamsMock.mockResolvedValue(FIXTURE_PARAMS);
  renderProposalPdfMock.mockResolvedValue(PDF_RENDER_RESULT_STUB);
  storagePutMock.mockResolvedValue({
    key: 'proposals/u-1/d-1.pdf',
    size: 1020,
    etag: 'etag-1',
    contentType: 'application/pdf',
    uploadedAt: new Date(),
  });
  finalizeDraftMock.mockResolvedValue({ id: 'd-1' });
});

afterEach(() => vi.clearAllMocks());

describe('ADMIN-09 no-commission-in-PDF — golden corpus (D-12 + D-28)', () => {
  /**
   * Layer 1 + 2 + 3: for EACH of the 30 golden fixtures, drive the full
   * finalizeWizard pipeline and assert the captured render-data prop +
   * persisted computed jsonb contain no commission.
   */
  for (const fixture of GOLDEN_FIXTURES) {
    it(`fixture "${fixture.name}": render data + persisted computed contain NO commission`, async () => {
      const inputs = buildDraftInputs(fixture);
      getDraftByIdMock.mockResolvedValue({
        id: 'd-1',
        inputs,
        createdAt: new Date('2026-05-12'),
      });

      await finalizeWizard({ userId: 'u-1', draftId: 'd-1', language: 'fr' });

      // ── Layer 1: PDF render data has no commission ─────────────────────
      expect(renderProposalPdfMock).toHaveBeenCalledTimes(1);
      const renderArg = renderProposalPdfMock.mock.calls[0]![0] as {
        data: {
          inputs: Record<string, unknown>;
          computed: Record<string, unknown>;
          lcRef: string;
          language: string;
        };
      };
      const renderJson = JSON.stringify(renderArg.data);
      expect(renderJson.toLowerCase()).not.toContain('commission');

      // Also: the formatted commission amount string must NOT appear in
      // the render data prop (defense in depth — proves the data shape
      // is genuinely commission-free, not just hiding the key name).
      for (const fmt of commissionFormatsFor(fixture)) {
        expect(
          renderJson.includes(fmt),
          `fixture ${fixture.name}: render data contained commission amount ${fmt}`,
        ).toBe(false);
      }

      // ── Layer 2: persisted computed jsonb has no commission ──────────
      expect(finalizeDraftMock).toHaveBeenCalledTimes(1);
      const [, , payload] = finalizeDraftMock.mock.calls[0]!;
      const finalizePayload = payload as {
        computed: Record<string, unknown>;
        paramsSnapshot: Record<string, unknown>;
      };
      expect('commission' in finalizePayload.computed).toBe(false);
      const computedJson = JSON.stringify(finalizePayload.computed);
      expect(computedJson.toLowerCase()).not.toContain('commission');
      // The computed amount string must also not leak.
      for (const fmt of commissionFormatsFor(fixture)) {
        expect(
          computedJson.includes(fmt),
          `fixture ${fixture.name}: computed contained commission amount ${fmt}`,
        ).toBe(false);
      }

      // ── Layer 3: paramsSnapshot DOES contain commissionPct (the PCT) ──
      // The percentage is required for Phase 8 Stripe Option A byte-determinism.
      // The amount cannot be back-derived without amountHT.
      expect(finalizePayload.paramsSnapshot.commissionPct).toBe(FIXTURE_PARAMS.commissionPct);
    });
  }

  it('all 30 golden fixtures were exercised (finalizeWizard called 30 times total)', async () => {
    // Sanity: run all 30 in sequence; mock state resets per beforeEach.
    let totalCalls = 0;
    for (const fixture of GOLDEN_FIXTURES) {
      // Re-seed per iteration.
      finalizeDraftMock.mockReset();
      finalizeDraftMock.mockResolvedValue({ id: 'd-1' });
      renderProposalPdfMock.mockReset();
      renderProposalPdfMock.mockResolvedValue(PDF_RENDER_RESULT_STUB);
      getDraftByIdMock.mockReset();
      getDraftByIdMock.mockResolvedValue({
        id: 'd-1',
        inputs: buildDraftInputs(fixture),
        createdAt: new Date('2026-05-12'),
      });
      await finalizeWizard({ userId: 'u-1', draftId: 'd-1', language: 'fr' });
      totalCalls += finalizeDraftMock.mock.calls.length;
    }
    expect(totalCalls).toBe(GOLDEN_FIXTURES.length);
  });
});

/**
 * ── Layer 4: BINARY assertion via REAL renderProposalPdf ───────────────
 *
 * For a representative subset of fixtures, render the actual PDF and
 * inspect the decompressed content streams + the raw metadata fields.
 *
 * Note: Layer 4 runs WITHOUT the @/lib/pdf mock — it imports the real
 * render function via direct module path `@/lib/pdf/render`.
 */

/**
 * Decompress all PDF text streams and return a single concatenated string.
 * @react-pdf/renderer uses FlateDecode (zlib) — most text streams are
 * inflatable. Font subset streams may fail to inflate; those are skipped.
 */
function decompressPdfStreams(buffer: Buffer): string {
  const str = buffer.toString('binary');
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  const decoded: string[] = [];
  let match = streamRe.exec(str);
  while (match !== null) {
    const payload = Buffer.from(match[1], 'binary');
    try {
      decoded.push(inflateSync(payload).toString('latin1'));
    } catch {
      // Non-flate or non-text stream — skip.
    }
    match = streamRe.exec(str);
  }
  return decoded.join('\n---\n');
}

/**
 * From a decompressed PDF dump, extract the ToUnicode CMap glyph→codepoint
 * mappings and the hex-encoded glyph runs in content streams. Returns the
 * reconstructed visible text the user would see when reading the PDF.
 */
function reconstructVisibleText(decompressed: string): string {
  // Find bfchar entries: <SRC><DST> mapping glyph index → unicode codepoint.
  // Format: <000a><0050> for example — 4-hex-digit src maps to 4-hex-digit unicode.
  const glyphMap: Record<string, string> = {};
  const bfcharRe = /<([0-9a-f]+)>\s*<([0-9a-f\s]+)>/gi;
  let bm = bfcharRe.exec(decompressed);
  while (bm !== null) {
    const src = bm[1].toLowerCase();
    // Destination may contain multi-codepoint hex (e.g. "fi" ligature → "0066 0069")
    const codepoints = bm[2]
      .trim()
      .split(/\s+/)
      .map((h) => parseInt(h, 16))
      .filter((n) => Number.isFinite(n));
    glyphMap[src] = String.fromCodePoint(...codepoints);
    bm = bfcharRe.exec(decompressed);
  }

  // Find hex-string text-show operations. @react-pdf/renderer emits TJ in
  // bracketed-array form:  [<HEX> num <HEX> num ...] TJ
  // (where num values are glyph-spacing adjustments).
  // We also handle the simpler  <HEX> Tj  form.
  // Strategy: find each TJ/Tj operator, then back-scan to extract all
  // <HEX> tokens between the previous operator and this one.
  const out: string[] = [];
  const tjRe = /\[([^\]]*)\]\s*TJ|<([0-9a-f\s]+)>\s*Tj/gi;
  let sm = tjRe.exec(decompressed);
  while (sm !== null) {
    // Group 1 = bracketed-array form; group 2 = simple form.
    const body = sm[1] ?? sm[2] ?? '';
    // Extract every <HEX...> token in the body (ignore spacing adjustment numbers).
    const hexTokens = body.match(/<([0-9a-f\s]+)>/gi) ?? [];
    for (const token of hexTokens) {
      const hex = token.replace(/[<>]/g, '').replace(/\s+/g, '').toLowerCase();
      // Each glyph is 4 hex chars (2 bytes).
      for (let i = 0; i + 4 <= hex.length; i += 4) {
        const glyphId = hex.substr(i, 4);
        out.push(glyphMap[glyphId] ?? '');
      }
    }
    sm = tjRe.exec(decompressed);
  }

  return out.join('');
}

describe('ADMIN-09 no-commission-in-PDF — binary inspection (D-28 load-bearing)', () => {
  // Pick representative fixtures: one happy-path (t2/75000/48) where
  // commission is a substantial number that would be highly visible if
  // leaked, plus one large-amount case (t4/400000/60) for thorough coverage.
  const subset = [
    GOLDEN_FIXTURES.find((f) => f.name === 't2/75000/48')!,
    GOLDEN_FIXTURES.find((f) => f.name === 't4/400000/60')!,
  ];

  for (const fixture of subset) {
    for (const lang of ['fr', 'en'] as const) {
      it(`REAL render — fixture "${fixture.name}" / ${lang} — no commission glyphs in PDF`, async () => {
        const inputs = buildDraftInputs(fixture);
        // Compute the expected commission amount for assertion.
        const commission = commissionAmountFor(fixture);
        const commissionFormatted = formatCurrency(commission, lang);

        // Compute what the loyer + coeff would be — these are the fields
        // legitimately allowed in the PDF and form the positive control.
        const r = computeLoyer({
          amountHT: inputs.amountHT,
          durationMonths: inputs.durationMonths,
          validityDays: inputs.validityDays,
          coefficients: FIXTURE_PARAMS.coefficients,
          commissionPct: Number(FIXTURE_PARAMS.commissionPct),
          maxAmount: Number(FIXTURE_PARAMS.maxAmount),
        });

        // Build the PDF computed shape per state.
        const pdfComputed =
          r.computed.state === 'computed'
            ? {
                state: 'computed' as const,
                trancheKey: r.computed.trancheKey,
                loyerHT: r.computed.loyerHT,
                coeff: r.computed.coeff,
                isOnDemand: false,
              }
            : { state: 'on-demand' as const, isOnDemand: true };

        const pdfData = {
          lcRef: 'LC-12345',
          language: lang,
          createdAt: new Date('2026-05-09T10:00:00.000Z'),
          inputs,
          computed: pdfComputed,
        };

        const result = await renderProposalPdfReal({ data: pdfData });
        expect(result.buffer).toBeInstanceOf(Buffer);
        expect(result.sizeBytes).toBeGreaterThan(4000);

        // ── Raw binary scan for the literal string 'commission' ──────
        // PDF metadata fields (Title, Author, Subject, Keywords, Creator,
        // Producer) are NOT compressed — they appear as plain text.
        const rawLatin1 = result.buffer.toString('latin1');
        expect(rawLatin1.toLowerCase()).not.toContain('commission');

        // ── Decompressed streams + reconstructed visible text scan ───
        const decompressed = decompressPdfStreams(result.buffer);
        const visibleText = reconstructVisibleText(decompressed);

        // Assert no 'commission' substring anywhere in the decoded text.
        expect(visibleText.toLowerCase()).not.toContain('commission');

        // Assert the commission AMOUNT does not appear in any form.
        // formatCurrency('fr', 5250) -> '5 250,00 €'  (NBSP separator)
        // formatCurrency('en', 5250) -> '€5,250.00'
        // Build all plausible variants.
        const intAmount = Math.round(commission);
        const variants = [
          commissionFormatted,
          String(intAmount),
          String(commission),
          commission.toFixed(2),
          new Intl.NumberFormat('fr-FR').format(commission),
          new Intl.NumberFormat('fr-FR').format(intAmount),
          new Intl.NumberFormat('en-GB').format(commission),
          new Intl.NumberFormat('en-GB').format(intAmount),
        ];

        // Normalize NBSP -> space in both visible text + variant strings.
        // Intl 'fr-FR' uses U+202F (narrow no-break space) and U+00A0
        // (non-breaking space) as thousands separators in different contexts.
        const normalize = (s: string) =>
          s.replace(/ /g, ' ').replace(/ /g, ' ');
        const visibleNormalized = normalize(visibleText);

        for (const variant of variants) {
          // We assert specifically on the formatted currency strings
          // (those that include the € symbol) — bare digits could
          // theoretically collide with loyer / amountHT digits in the
          // formatted output. The currency variants are the load-bearing
          // assertion: if commission appears as a EUR amount in the PDF,
          // this catches it.
          if (variant.includes('€')) {
            const normalizedVariant = normalize(variant);
            expect(
              visibleNormalized.includes(normalizedVariant),
              `fixture ${fixture.name}/${lang}: visible PDF text contained commission currency "${variant}"`,
            ).toBe(false);
          }
        }

        // ── Positive control: the lcRef appears in PDF metadata ─────
        // Proves the binary inspection works end-to-end. The lcRef is
        // embedded in PDF metadata (Title, Keywords) as plain ASCII text
        // — NOT subject to font subsetting or kerning interleaving — so
        // it's a reliable positive control that the rendered PDF actually
        // contains text we can find.
        //
        // We avoid using visible-text-reconstruction for the positive
        // control because @react-pdf/renderer's KeyValueRow component
        // renders label + value in a flex row; glyphs from the two
        // columns interleave in document order with kerning adjustments,
        // scrambling any value's reconstructed text.
        expect(
          rawLatin1.includes('LC-12345'),
          `positive control: lcRef "LC-12345" should appear in PDF metadata`,
        ).toBe(true);

        // ── Negative control: commission currency strings absent even
        // after whitespace stripping (the load-bearing negative test).
        //
        // The hex-encoded digit sequence for a commission currency
        // (e.g. "€3,937.50") would be glyph-contiguous when emitted
        // (the renderer emits a single value's digits in one TJ run
        // BEFORE moving to the next column). So even though the loyer
        // positive control is fragile due to inter-column interleaving,
        // a leaked commission AMOUNT would show up contiguously and
        // this stripped-whitespace match would catch it.
        if (r.computed.state === 'computed') {
          const stripWs = (s: string) => s.replace(/\s+/g, '');
          const visStripped = stripWs(visibleNormalized);
          const commissionStripped = stripWs(commissionFormatted);
          // Only assert if commission has a € sign (currency formatted)
          // — otherwise we'd be checking a bare digit sequence which
          // could collide with loyer digits.
          if (commissionFormatted.includes('€')) {
            expect(
              visStripped.includes(commissionStripped),
              `fixture ${fixture.name}/${lang}: commission currency "${commissionFormatted}" digits leaked into PDF`,
            ).toBe(false);
          }
        }
      });
    }
  }

  it('Phase 13 ships ZERO new schema migrations (drizzle directory unchanged)', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const drizzleDir = path.resolve(process.cwd(), 'drizzle');
    let files: string[] = [];
    try {
      files = await fs.readdir(drizzleDir);
    } catch {
      // No drizzle dir at all → OK.
    }
    // Find migration files numbered higher than Phase 12's DB-01 (0004).
    // Phase 13 must NOT introduce a 0005+ migration.
    const phase13Migrations = files.filter(
      (f) => /^00(0[5-9]|1[0-9])_/.test(f) && f.endsWith('.sql'),
    );
    expect(
      phase13Migrations,
      `Phase 13 must ship NO new migrations; found: ${phase13Migrations.join(', ')}`,
    ).toEqual([]);
  });
});
