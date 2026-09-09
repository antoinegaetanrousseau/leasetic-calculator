// @vitest-environment node
// jsdom polyfills shift @react-pdf/renderer output bytes — pin to node, same
// reason as render-fixtures.test.ts / commission-free-fixture.test.ts /
// inter-typography.test.ts.
/**
 * Phase 43 Plan 07 Task 2 — the layout proof suite closing DOC-10, DOC-11,
 * DOC-12, DOC-13 and FIELD-03 against the rendered document rather than
 * against source.
 *
 * Deviation from the plan's literal instruction (Rule 1 — auto-fix bug found
 * while writing this suite): the plan says to copy the two extraction
 * helpers from `no-commission.test.ts` verbatim (a single glyph-ID →
 * character map merged across every embedded font's ToUnicode CMap). 43-06's
 * own SUMMARY (Issues Encountered) already flagged that approach as
 * unreliable once a document embeds more than one font subset — glyph IDs
 * are renumbered per-subset, so the SAME short glyph ID can collide across
 * two fonts' CMaps and one silently overwrites the other. Empirically
 * reproduced while building this suite: a merged map reported ZERO em-dash
 * (U+2014) glyphs in a fixture whose raw ToUnicode data plainly contains
 * U+2014, because a later-parsed font's CMap happened to reuse the same
 * glyph-ID key. The fix (also 43-06's own documented pattern, "PDF
 * text-content verification, properly font-aware") is to build a *per-font*
 * glyph map keyed by the PDF's own `/Font << /Fx N 0 R >>` resource
 * dictionary, then decode the content stream tracking the active `/Fx N Tf`
 * selector so each glyph run is decoded with the font that actually painted
 * it. `reconstructVisibleTextFontAware` below is that decoder.
 *
 * A second, related finding while validating this decoder against a real
 * render: the EN/FR title text was line-wrapping INSIDE a single word under
 * real content width ("Equipment lease financing pro-posal", "Proposition
 * de location finan-cière") — a real react-pdf hyphenation break. This was
 * NOT accepted behavior, despite `43-05-SUMMARY.md`'s own verification note
 * calling it "already accepted" — it was a real defect, caught by Antoine's
 * D-15 human visual pass in 43-08 after two automated passes (43-05, 43-07)
 * absorbed it instead of fixing it. Plan 43-09 Task 1 fixes the render with
 * `Font.registerHyphenationCallback` in `document.tsx`, so the layout engine
 * can only break at spaces. A helper named `dehyphenate`, which joined
 * wrap-hyphen breaks back into a normal word before every phrase assertion
 * below ran, used to sit here — it was removed in 43-09 Task 2 rather than
 * left as dead code, because a normaliser that silently launders a
 * rendering defect out of the string it asserts on is worse than no helper
 * at all: it stops proving anything about the artifact it was written to
 * hide. The pattern to name and watch for: an automated gate normalising a
 * rendering artifact away (to keep an assertion passing) is not the same as
 * that artifact being correct.
 */
import { describe, it, expect, vi } from 'vitest';
import { inflateSync } from 'node:zlib';

vi.mock('server-only', () => ({}));

import { renderProposalPdf } from './render';
import type { ProposalDocumentProps } from './document';
import { formatCurrency } from '../i18n/format';
import { sanitizePdfNumber } from './sanitize-number';
import { EM_DASH } from './em-dash';
import { pdfFixtures } from '../../../__pdf-fixtures__/fixtures';

const FR_FIXTURE = pdfFixtures.find((f) => f.name === 'happy-path-fr')!;
const EN_FIXTURE = pdfFixtures.find((f) => f.name === 'happy-path-en')!;

// ── Shared extraction helpers ─────────────────────────────────────────────

function inflateMaybe(raw: Buffer): Buffer {
  try {
    return inflateSync(raw);
  } catch {
    return raw;
  }
}

/** Every `N 0 obj ... endobj` object in the PDF, keyed by object number. */
function extractObjects(rawBinary: string): Map<number, string> {
  const objRe = /(\d+)\s+0\s+obj([\s\S]*?)endobj/g;
  const objects = new Map<number, string>();
  for (const m of rawBinary.matchAll(objRe)) objects.set(Number(m[1]), m[2]);
  return objects;
}

/**
 * Build a per-font glyphId → codepoint[] map keyed by the PDF's own `/Fx`
 * resource name, per this file's header comment. Font-aware — never a
 * single map merged across every embedded font's ToUnicode CMap.
 */
function buildFontGlyphMaps(buffer: Buffer): Record<string, Record<string, number[]>> {
  const rawBinary = buffer.toString('binary');
  const objects = extractObjects(rawBinary);

  const fontDictMatch = rawBinary.match(/\/Font\s*<<([^>]*)>>/);
  const fontResources: Record<string, number> = {};
  if (fontDictMatch) {
    const re = /\/(F\d+)\s+(\d+)\s+0\s+R/g;
    let m;
    while ((m = re.exec(fontDictMatch[1])) !== null) fontResources[m[1]] = Number(m[2]);
  }

  const fontGlyphMaps: Record<string, Record<string, number[]>> = {};
  for (const [fname, fontObjNum] of Object.entries(fontResources)) {
    const fontBody = objects.get(fontObjNum) ?? '';
    const toUniMatch = fontBody.match(/\/ToUnicode\s+(\d+)\s+0\s+R/);
    if (!toUniMatch) continue;
    const toUniBody = objects.get(Number(toUniMatch[1])) ?? '';
    const streamMatch = toUniBody.match(/stream\r?\n([\s\S]*?)\r?\nendstream/);
    if (!streamMatch) continue;
    const decoded = inflateMaybe(Buffer.from(streamMatch[1], 'binary')).toString('latin1');
    const glyphMap: Record<string, number[]> = {};
    const bfcharRe = /<([0-9a-f]+)>\s*<([0-9a-f\s]+)>/gi;
    let bm;
    while ((bm = bfcharRe.exec(decoded)) !== null) {
      const src = bm[1].toLowerCase();
      const cps = bm[2]
        .trim()
        .split(/\s+/)
        .map((h) => parseInt(h, 16))
        .filter((n) => Number.isFinite(n));
      glyphMap[src] = cps;
    }
    fontGlyphMaps[fname] = glyphMap;
  }
  return fontGlyphMaps;
}

/** Every decompressed FlateDecode stream that looks like a page content stream. */
function findPageContentStreams(buffer: Buffer): string[] {
  const rawBinary = buffer.toString('binary');
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  const pageStreams: string[] = [];
  let m;
  while ((m = streamRe.exec(rawBinary)) !== null) {
    const decoded = inflateMaybe(Buffer.from(m[1], 'binary')).toString('latin1');
    if (decoded.includes('BT') && decoded.includes('TJ')) pageStreams.push(decoded);
  }
  return pageStreams;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Reconstruct the visible text of a rendered PDF, decoding each glyph run
 * with the ToUnicode CMap of the font that was ACTUALLY active (`/Fx N Tf`)
 * when that run was painted. See file header comment for why this replaces
 * the single-merged-map approach used elsewhere in this repo.
 */
function reconstructVisibleTextFontAware(buffer: Buffer): string {
  const fontGlyphMaps = buildFontGlyphMaps(buffer);
  const pageStreams = findPageContentStreams(buffer);

  const out: string[] = [];
  const tokenRe = /\/(F\d+)\s+[\d.]+\s+Tf|\[([^\]]*)\]\s*TJ|<([0-9a-f\s]+)>\s*Tj/g;
  for (const pageStream of pageStreams) {
    let activeFont = '';
    tokenRe.lastIndex = 0;
    let tok;
    while ((tok = tokenRe.exec(pageStream)) !== null) {
      if (tok[1]) {
        activeFont = tok[1];
        continue;
      }
      const body = tok[2] ?? tok[3] ?? '';
      const hexTokens = body.match(/<([0-9a-f\s]+)>/gi) ?? [];
      const glyphMap = fontGlyphMaps[activeFont] ?? {};
      for (const token of hexTokens) {
        const hex = token.replace(/[<>]/g, '').replace(/\s+/g, '').toLowerCase();
        for (let i = 0; i + 4 <= hex.length; i += 4) {
          const glyphId = hex.substr(i, 4);
          const cps = glyphMap[glyphId];
          if (cps) out.push(String.fromCodePoint(...cps));
        }
      }
      // Separate consecutive text-show runs — a line-wrap boundary or a
      // label/value join both fall here.
      out.push(' ');
    }
  }
  return normalizeWhitespace(out.join(''));
}

/**
 * Count occurrences of a specific codepoint across every text-show run,
 * font-aware (see file header). Used for the DOC-11 em-dash count — a count
 * is more robust than positional reconstruction because it doesn't depend
 * on run ordering, only on correctly resolving each glyph via its own font.
 */
function countCodepointOccurrences(buffer: Buffer, targetCp: number): number {
  const fontGlyphMaps = buildFontGlyphMaps(buffer);
  const pageStreams = findPageContentStreams(buffer);

  let count = 0;
  const tokenRe = /\/(F\d+)\s+[\d.]+\s+Tf|\[([^\]]*)\]\s*TJ|<([0-9a-f\s]+)>\s*Tj/g;
  for (const pageStream of pageStreams) {
    let activeFont = '';
    tokenRe.lastIndex = 0;
    let tok;
    while ((tok = tokenRe.exec(pageStream)) !== null) {
      if (tok[1]) {
        activeFont = tok[1];
        continue;
      }
      const body = tok[2] ?? tok[3] ?? '';
      const hexTokens = body.match(/<([0-9a-f\s]+)>/gi) ?? [];
      const glyphMap = fontGlyphMaps[activeFont] ?? {};
      for (const token of hexTokens) {
        const hex = token.replace(/[<>]/g, '').replace(/\s+/g, '').toLowerCase();
        for (let i = 0; i + 4 <= hex.length; i += 4) {
          const glyphId = hex.substr(i, 4);
          const cps = glyphMap[glyphId];
          if (cps && cps.length === 1 && cps[0] === targetCp) count++;
        }
      }
    }
  }
  return count;
}

/**
 * DOC-11's geometry claim, made checkable: track the PDF content-stream
 * graphics-state stack (`q`/`Q`/`cm`) plus the text matrix (`Tm`, reset at
 * every `BT`) to compute the actual DEVICE-SPACE y-coordinate where each
 * text run's origin lands. Necessary because react-pdf always resets `Tm`
 * to a constant (`1 0 0 1 0 <pageHeight> Tm`, empirically verified) inside
 * every `BT` block — the real vertical position comes entirely from the
 * accumulated `cm` translations in the surrounding graphics-state stack, not
 * from `Tm`'s own operands. The MINIMUM device-y across a page is its
 * lowest-drawn text, i.e. the legal footer's baseline (page origin is
 * bottom-left in PDF space).
 */
type Mat = [number, number, number, number, number, number];
const IDENTITY: Mat = [1, 0, 0, 1, 0, 0];

function multiplyMat(a: Mat, b: Mat): Mat {
  return [
    a[0] * b[0] + a[1] * b[2],
    a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2],
    a[2] * b[1] + a[3] * b[3],
    a[4] * b[0] + a[5] * b[2] + b[4],
    a[4] * b[1] + a[5] * b[3] + b[5],
  ];
}

function extractMinDeviceY(buffer: Buffer): number {
  const [pageStream] = findPageContentStreams(buffer);
  if (!pageStream) throw new Error('No page content stream found — extraction is broken.');

  const tokenRe =
    /(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+(cm|Tm)\b|(\bq\b)|(\bQ\b)|(\bBT\b)|(\bET\b)/g;
  const stack: Mat[] = [];
  let ctm: Mat = IDENTITY;
  let tm: Mat = IDENTITY;
  let minY = Infinity;
  let tok;
  while ((tok = tokenRe.exec(pageStream)) !== null) {
    if (tok[7] === 'cm') {
      ctm = multiplyMat(tok.slice(1, 7).map(Number) as Mat, ctm);
    } else if (tok[7] === 'Tm') {
      tm = tok.slice(1, 7).map(Number) as Mat;
    } else if (tok[8] !== undefined) {
      stack.push(ctm); // q
    } else if (tok[9] !== undefined) {
      const popped = stack.pop(); // Q
      if (popped) ctm = popped;
    } else if (tok[10] !== undefined) {
      tm = IDENTITY; // BT
    } else if (tok[11] !== undefined) {
      minY = Math.min(minY, multiplyMat(tm, ctm)[5]); // ET
    }
  }
  return minY;
}

/** The PDF's own declared page count, read from its `/Type /Pages /Count N` object. */
function extractPageCount(buffer: Buffer): number {
  const rawBinary = buffer.toString('binary');
  const objects = extractObjects(rawBinary);
  for (const body of objects.values()) {
    if (/\/Type\s*\/Pages\b/.test(body)) {
      const countMatch = body.match(/\/Count\s+(\d+)/);
      if (countMatch) return Number(countMatch[1]);
    }
  }
  throw new Error('No /Type /Pages object with /Count found — extraction is broken.');
}

// ── DOC-01 guard: title wrap-hyphenation (Gap 1, 43-VERIFICATION.md) ─────

describe('DOC-01: the title never wrap-hyphenates (Gap 1, 43-VERIFICATION.md)', () => {
  it('FR title renders "Proposition de location financière" with no wrap-hyphen break', async () => {
    const result = await renderProposalPdf({ data: FR_FIXTURE.data });
    const text = reconstructVisibleTextFontAware(result.buffer);

    expect(
      text,
      'DOC-01: FR title is missing the clean, unbroken phrase "Proposition de location financière"',
    ).toContain('Proposition de location financière');
    expect(
      text,
      'DOC-01: the hyphenator is back — FR title wrap-hyphenated "financière" into "finan- cière"',
    ).not.toContain('finan- cière');
    expect(
      text,
      'DOC-01: the hyphenator is back — a "finan-" wrap-hyphen break was found before a space',
    ).not.toMatch(/finan-\s/);
  });

  it('EN title renders "Equipment lease financing proposal" with no wrap-hyphen break', async () => {
    const result = await renderProposalPdf({ data: EN_FIXTURE.data });
    const text = reconstructVisibleTextFontAware(result.buffer);

    expect(
      text,
      'DOC-01: EN title is missing the clean, unbroken phrase "Equipment lease financing proposal"',
    ).toContain('Equipment lease financing proposal');
    expect(
      text,
      'DOC-01: the hyphenator is back — EN title wrap-hyphenated "proposal" into "pro- posal"',
    ).not.toContain('pro- posal');
    expect(
      text,
      'DOC-01: the hyphenator is back — a "pro-" wrap-hyphen break was found before a space',
    ).not.toMatch(/pro-\s/);
  });
});

// ── DOC-10: English / French parity, mutually exclusive ──────────────────

describe('DOC-10: language parity — EN and FR each render their own labels and legal paragraph, never the other', () => {
  it('EN fixture renders every English label and the English legal paragraph, never an FR string', async () => {
    const result = await renderProposalPdf({ data: EN_FIXTURE.data });
    const text = reconstructVisibleTextFontAware(result.buffer);

    const required = [
      'PROPOSAL NO.',
      'Issued',
      'Equipment lease financing proposal',
      'Partner ref.',
      'CLIENT COMPANY',
      'Recipient',
      'YOUR CONTACT',
      'Partner',
      'MONTHLY RENT EXCL. VAT',
      'FINANCIAL TERMS',
      'Financed amount excl. VAT',
      'Lease term',
      'Applied coefficient',
      'Total rents excl. VAT',
      'CLIENT ACCEPTANCE',
      'Place',
      'Name and role of signatory',
      'Company stamp',
      'registered office',
      'VAT FR06830733606',
      'subject to approval by Leasetic',
    ];
    for (const phrase of required) {
      expect(text, `EN render is missing required phrase "${phrase}"`).toContain(phrase);
    }

    const forbidden = [
      'SOCIÉTÉ CLIENTE',
      'VOTRE CONTACT',
      'Destinataire',
      'CONDITIONS FINANCIÈRES',
      'Total des loyers HT',
      'Fait à',
      'Cachet',
      'Partenaire',
      'Leasétic', // stale accented spelling — never reintroduced (D-01)
    ];
    for (const phrase of forbidden) {
      expect(text, `EN render leaked FR/stale phrase "${phrase}"`).not.toContain(phrase);
    }
  });

  it('FR fixture renders every French label and the French legal paragraph, never an EN string', async () => {
    const result = await renderProposalPdf({ data: FR_FIXTURE.data });
    const text = reconstructVisibleTextFontAware(result.buffer);

    const required = [
      'PROPOSITION N°',
      'Établie le',
      'Proposition de location financière',
      'Réf. partenaire',
      'SOCIÉTÉ CLIENTE',
      'Destinataire',
      'VOTRE CONTACT',
      'Partenaire',
      'LOYER MENSUEL HT',
      'CONDITIONS FINANCIÈRES',
      'Montant financé HT',
      'Durée de location',
      'Coefficient appliqué',
      'Total des loyers HT',
      'ACCEPTATION DU CLIENT',
      'Fait à',
      'Nom et qualité du signataire',
      'Cachet',
      'siège',
      'TVA FR06830733606',
    ];
    for (const phrase of required) {
      expect(text, `FR render is missing required phrase "${phrase}"`).toContain(phrase);
    }

    const forbidden = [
      'CLIENT COMPANY',
      'YOUR CONTACT',
      'Recipient',
      'FINANCIAL TERMS',
      'Total rents excl. VAT',
      'Place',
      'Company stamp',
      'Leasétic', // stale accented spelling — never reintroduced (D-01)
    ];
    for (const phrase of forbidden) {
      expect(text, `FR render leaked EN/stale phrase "${phrase}"`).not.toContain(phrase);
    }
  });
});

// ── DOC-03 guard: partner/advisor split in the VOTRE CONTACT card (Gap 2) ──
// This is the assertion that would have caught the original defect: the old
// card had no `Partenaire` label at all and put the advisor's name in a row
// rather than a headline, so this ordering chain could not have held.

describe('DOC-03: the VOTRE CONTACT card separates the partner from the Leasetic advisor (Gap 2, 43-VERIFICATION.md)', () => {
  it('FR: renders partner name, then Partenaire label, then advisor name, then Email — in that order', async () => {
    const result = await renderProposalPdf({ data: FR_FIXTURE.data });
    const text = reconstructVisibleTextFontAware(result.buffer);

    const partnerName = FR_FIXTURE.data.inputs.partnerName;
    const advisorName = FR_FIXTURE.data.advisor?.name;
    if (!partnerName) throw new Error('FR_FIXTURE.data.inputs.partnerName is missing — fixture rotated without updating this test');
    if (!advisorName) throw new Error('FR_FIXTURE.data.advisor?.name is missing — fixture rotated without updating this test');

    const partnerNameIndex = text.indexOf(partnerName);
    const partenaireIndex = text.indexOf('Partenaire');
    const advisorNameIndex = text.indexOf(advisorName);
    const emailIndex = text.lastIndexOf('Email');

    expect(partnerNameIndex, `DOC-03: partner name "${partnerName}" is missing from the FR render`).toBeGreaterThan(-1);
    expect(partenaireIndex, 'DOC-03: the "Partenaire" label is missing from the FR render').toBeGreaterThan(-1);
    expect(advisorNameIndex, `DOC-03: advisor name "${advisorName}" is missing from the FR render`).toBeGreaterThan(-1);
    expect(emailIndex, 'DOC-03: the "Email" label is missing from the FR render').toBeGreaterThan(-1);

    expect(partnerNameIndex, 'DOC-03: partner name must render before the "Partenaire" label').toBeLessThan(partenaireIndex);
    expect(partenaireIndex, 'DOC-03: the "Partenaire" label must render before the advisor name').toBeLessThan(advisorNameIndex);
    expect(advisorNameIndex, 'DOC-03: the advisor name must render before the final "Email" label').toBeLessThan(emailIndex);

    expect(text, 'DOC-03: deleted dictionary key "Conseiller" leaked into the FR render').not.toContain('Conseiller');
    expect(text, 'DOC-03: deleted dictionary key "Commercial" leaked into the FR render').not.toContain('Commercial');
  });

  it('EN: renders partner name, then Partner label, then advisor name — in that order', async () => {
    const result = await renderProposalPdf({ data: EN_FIXTURE.data });
    const text = reconstructVisibleTextFontAware(result.buffer);

    const partnerName = EN_FIXTURE.data.inputs.partnerName;
    const advisorName = EN_FIXTURE.data.advisor?.name;
    if (!partnerName) throw new Error('EN_FIXTURE.data.inputs.partnerName is missing — fixture rotated without updating this test');
    if (!advisorName) throw new Error('EN_FIXTURE.data.advisor?.name is missing — fixture rotated without updating this test');

    const partnerNameIndex = text.indexOf(partnerName);
    // Search starts at partnerNameIndex, not 0 — the header's "Partner ref." pill also
    // contains the substring "Partner" and renders before the contact card, which would
    // otherwise make this match the wrong occurrence.
    const partnerLabelIndex = partnerNameIndex > -1 ? text.indexOf('Partner', partnerNameIndex) : -1;
    const advisorNameIndex = text.indexOf(advisorName);

    expect(partnerNameIndex, `DOC-03: partner name "${partnerName}" is missing from the EN render`).toBeGreaterThan(-1);
    expect(partnerLabelIndex, 'DOC-03: the "Partner" label is missing from the EN render').toBeGreaterThan(-1);
    expect(advisorNameIndex, `DOC-03: advisor name "${advisorName}" is missing from the EN render`).toBeGreaterThan(-1);

    expect(partnerNameIndex, 'DOC-03: partner name must render before the "Partner" label').toBeLessThan(partnerLabelIndex);
    expect(partnerLabelIndex, 'DOC-03: the "Partner" label must render before the advisor name').toBeLessThan(advisorNameIndex);

    expect(text, 'DOC-03: deleted dictionary key "Advisor" leaked into the EN render').not.toContain('Advisor');
    expect(text, 'DOC-03: deleted dictionary key "Sales rep" leaked into the EN render').not.toContain('Sales rep');
  });

  it("Finding 3: an absent partnerCo renders an em dash under Partenaire, never the partner's own name", async () => {
    const baselineData = FR_FIXTURE.data;
    const noCompanyData: ProposalDocumentProps['data'] = {
      ...baselineData,
      inputs: { ...baselineData.inputs, partnerCo: '' },
    };

    const baselineResult = await renderProposalPdf({ data: baselineData });
    const noCompanyResult = await renderProposalPdf({ data: noCompanyData });

    const baselineEmDashCount = countCodepointOccurrences(baselineResult.buffer, EM_DASH.codePointAt(0)!);
    const noCompanyEmDashCount = countCodepointOccurrences(noCompanyResult.buffer, EM_DASH.codePointAt(0)!);
    expect(
      noCompanyEmDashCount,
      'Finding 3: an absent partnerCo must add exactly one em dash (the Partenaire value), nothing else moves',
    ).toBe(baselineEmDashCount + 1);

    const text = reconstructVisibleTextFontAware(noCompanyResult.buffer);
    expect(text, 'Finding 3: the "Partenaire" label must survive an absent partnerCo').toContain('Partenaire');

    // A metacharacter-safe occurrence counter — indexOf, not a regex, so a
    // rotated fixture value carrying a regex metacharacter can never break
    // the count (see file header rationale for reconstructVisibleTextFontAware).
    function countOccurrences(haystack: string, needle: string): number {
      let count = 0;
      let fromIndex = 0;
      for (;;) {
        const idx = haystack.indexOf(needle, fromIndex);
        if (idx === -1) break;
        count += 1;
        fromIndex = idx + needle.length;
      }
      return count;
    }

    const partnerName = FR_FIXTURE.data.inputs.partnerName;
    if (!partnerName) throw new Error('FR_FIXTURE.data.inputs.partnerName is missing — fixture rotated without updating this test');
    expect(
      countOccurrences(text, partnerName),
      `Finding 3: the partner's own name "${partnerName}" must appear exactly once (the headline), never under the Partenaire label`,
    ).toBe(1);
  });
});

// ── DOC-02: a populated SIRET renders (Gap 3, 43-VERIFICATION.md) ─────────

describe('DOC-02: a populated client SIRET renders in the SOCIÉTÉ CLIENTE card (Gap 3, 43-VERIFICATION.md)', () => {
  it('FR: renders the SIRET value after its own label', async () => {
    expect(
      FR_FIXTURE.data.inputs.clientSiret,
      'Gap 3 requires a populated clientSiret fixture — this stops the case going vacuous if a future fixture rotation drops the key',
    ).toBeDefined();
    const siretValue = FR_FIXTURE.data.inputs.clientSiret!;

    const result = await renderProposalPdf({ data: FR_FIXTURE.data });
    const text = reconstructVisibleTextFontAware(result.buffer);

    expect(text, 'DOC-02: the "SIRET" label is missing from the FR render').toContain('SIRET');
    expect(text, `DOC-02: the SIRET value "${siretValue}" is missing from the FR render`).toContain(siretValue);
    expect(
      text.indexOf('SIRET'),
      'DOC-02: the SIRET value must render after its own label, not merely somewhere on the page',
    ).toBeLessThan(text.indexOf(siretValue));
  });

  it('EN: renders the SIRET value after its own label', async () => {
    expect(
      EN_FIXTURE.data.inputs.clientSiret,
      'Gap 3 requires a populated clientSiret fixture — this stops the case going vacuous if a future fixture rotation drops the key',
    ).toBeDefined();
    const siretValue = EN_FIXTURE.data.inputs.clientSiret!;

    const result = await renderProposalPdf({ data: EN_FIXTURE.data });
    const text = reconstructVisibleTextFontAware(result.buffer);

    expect(text, 'DOC-02: the "SIRET" label is missing from the EN render').toContain('SIRET');
    expect(text, `DOC-02: the SIRET value "${siretValue}" is missing from the EN render`).toContain(siretValue);
    expect(
      text.indexOf('SIRET'),
      'DOC-02: the SIRET value must render after its own label, not merely somewhere on the page',
    ).toBeLessThan(text.indexOf(siretValue));
  });

  it('absent branch control (FIELD-03): a missing clientSiret renders SIRET followed by one more em dash than the populated render', async () => {
    const siretValue = FR_FIXTURE.data.inputs.clientSiret!;
    const populatedResult = await renderProposalPdf({ data: FR_FIXTURE.data });

    const absentData: ProposalDocumentProps['data'] = {
      ...FR_FIXTURE.data,
      inputs: { ...FR_FIXTURE.data.inputs, clientSiret: undefined },
    };
    const absentResult = await renderProposalPdf({ data: absentData });

    const populatedEmDashCount = countCodepointOccurrences(populatedResult.buffer, EM_DASH.codePointAt(0)!);
    const absentEmDashCount = countCodepointOccurrences(absentResult.buffer, EM_DASH.codePointAt(0)!);
    expect(
      absentEmDashCount,
      'DOC-02 control: an absent clientSiret must add exactly one em dash (the SIRET value), proving the populated branch genuinely replaced an em dash rather than adding a stray glyph elsewhere',
    ).toBe(populatedEmDashCount + 1);

    const absentText = reconstructVisibleTextFontAware(absentResult.buffer);
    expect(absentText, 'DOC-02 control: the "SIRET" label must survive an absent clientSiret').toContain('SIRET');
    expect(
      absentText,
      'DOC-02 control: the SIRET value must not appear when clientSiret is absent',
    ).not.toContain(siretValue);
  });
});

// ── DOC-11 / FIELD-03: the geometry guarantee ─────────────────────────────

describe('DOC-11 / FIELD-03: absent fields render em dashes with identical card geometry', () => {
  it('a maximum-absence FR proposal renders em dashes, keeps every label, keeps the footer baseline, stays one page', async () => {
    const fullData = FR_FIXTURE.data;
    const maxAbsenceData: ProposalDocumentProps['data'] = {
      ...fullData,
      advisor: null,
      partner: { companyTelephone: null },
      inputs: {
        ...fullData.inputs,
        clientSiret: undefined,
        partnerTel: undefined,
        clientName: undefined,
        clientRole: undefined,
        clientTel: undefined,
        clientEmail: undefined,
        clientSiren: undefined,
        projectDesc: undefined,
        partnerRef: undefined,
      },
    };

    const fullResult = await renderProposalPdf({ data: fullData });
    const maxAbsenceResult = await renderProposalPdf({ data: maxAbsenceData });

    // Renders without throwing, non-trivial size.
    expect(maxAbsenceResult.sizeBytes).toBeGreaterThan(4_000);

    // At least ten em dashes: clientSiren, clientSiret, clientName, clientRole,
    // clientTel, clientEmail (6, SOCIÉTÉ CLIENTE card) + partnerTel/companyTelephone,
    // advisor name headline, advisor role/telephone/email (5, VOTRE CONTACT card) +
    // partnerRef pill (1) = 12. Plan 43-10 moves the advisor's name from a labelled row
    // to its own headline, but it was already emDash-wrapped either way — this fixture's
    // partnerName/partnerCo are never nulled, so the VOTRE CONTACT count is unchanged at 5.
    const emDashCount = countCodepointOccurrences(maxAbsenceResult.buffer, EM_DASH.codePointAt(0)!);
    expect(
      emDashCount,
      `Expected at least 10 em dashes (${EM_DASH}) in the max-absence render, got ${emDashCount}.`,
    ).toBeGreaterThanOrEqual(10);

    // Labels never disappear — only values become em dashes.
    const text = reconstructVisibleTextFontAware(maxAbsenceResult.buffer);
    const labels = ['SIREN', 'SIRET', 'Destinataire', 'Fonction', 'Téléphone', 'Email', 'Partenaire'];
    for (const label of labels) {
      expect(text, `Label "${label}" disappeared from the max-absence render.`).toContain(label);
    }

    // Card/table/acceptance-block geometry is identical: the footer's
    // device-space baseline (the page's lowest-drawn text) is unchanged
    // regardless of which fields the record carries. toBeCloseTo tolerates
    // the ~1e-4pt floating-point drift from a differently-shaped matrix
    // multiplication chain (fewer/shorter glyph runs), not a real position
    // shift.
    const fullMinY = extractMinDeviceY(fullResult.buffer);
    const maxAbsenceMinY = extractMinDeviceY(maxAbsenceResult.buffer);
    expect(maxAbsenceMinY).toBeCloseTo(fullMinY, 2);

    // Both stay on exactly one page.
    expect(extractPageCount(fullResult.buffer)).toBe(1);
    expect(extractPageCount(maxAbsenceResult.buffer)).toBe(1);
  });
});

// ── DOC-13: determinism ───────────────────────────────────────────────────

describe('DOC-13: contentHash is deterministic across renders of the same fixture', () => {
  it('re-rendering the same fixture twice produces an identical contentHash', async () => {
    const first = await renderProposalPdf({ data: FR_FIXTURE.data });
    const second = await renderProposalPdf({ data: FR_FIXTURE.data });

    // src/lib/pdf/render.ts:16-34 — the raw `sha256` is NOT stable across
    // renders (the Fiber scheduler orders PDF objects differently on each
    // call). `contentHash` (sorted, inflated stream hashes) is the
    // deterministic contract. Do NOT assert `first.sha256 === second.sha256`
    // here — it is expected to differ and asserting on it would fail for a
    // reason unrelated to this phase.
    expect(first.contentHash).toBe(second.contentHash);
  });

  it('every committed fixture renders a well-formed 64-hex-char contentHash', async () => {
    for (const fixture of pdfFixtures) {
      const result = await renderProposalPdf({ data: fixture.data });
      expect(result.contentHash, `fixture "${fixture.name}"`).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});

// ── DOC-12: commission invisibility at the rendered layer, both languages ─

describe('DOC-12: no commission figure, rate or derived value in the rendered PDF, either language', () => {
  for (const fixture of pdfFixtures) {
    it(`fixture "${fixture.name}" — no commission string or derived amount in raw buffer or visible text`, async () => {
      const result = await renderProposalPdf({ data: fixture.data });
      const rawLatin1 = result.buffer.toString('latin1');
      const visibleText = reconstructVisibleTextFontAware(result.buffer);

      // Positive control (per no-commission.test.ts's own Layer-4 pattern):
      // the lcRef is plain-ASCII PDF metadata (Title/Keywords), never subject
      // to font subsetting — proves the raw-buffer scan actually works and
      // isn't vacuously passing on an empty/broken extraction.
      expect(rawLatin1.includes('LC-12345'), 'positive control: LC-12345 missing from raw buffer').toBe(true);

      expect(rawLatin1.toLowerCase()).not.toContain('commission');
      expect(visibleText.toLowerCase()).not.toContain('commission');

      // The derived commission amount (amountHT × 5 / 100) must not appear as
      // a formatted currency string in either language, regardless of which
      // language this fixture itself renders in.
      const amountHT = Number(fixture.data.inputs.amountHT);
      const derivedCommission = Math.round(((amountHT * 5) / 100) * 100) / 100;
      const frVariant = sanitizePdfNumber(formatCurrency(derivedCommission, 'fr'));
      const enVariant = sanitizePdfNumber(formatCurrency(derivedCommission, 'en'));

      expect(
        visibleText.includes(frVariant),
        `fixture "${fixture.name}": visible text contained the FR-formatted commission amount "${frVariant}"`,
      ).toBe(false);
      expect(
        visibleText.includes(enVariant),
        `fixture "${fixture.name}": visible text contained the EN-formatted commission amount "${enVariant}"`,
      ).toBe(false);
    });
  }
});
