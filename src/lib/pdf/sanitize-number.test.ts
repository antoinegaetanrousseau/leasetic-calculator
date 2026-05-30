// @vitest-environment node
/**
 * Plan 23-01 -- PDF-scoped number sanitizer: unit, reproduction, and binary tests.
 *
 * ROOT CAUSE (D-01): formatCurrency/formatNumber use Intl.NumberFormat('fr-FR')
 * which emits U+202F (NARROW NO-BREAK SPACE) as the French thousands grouping
 * separator and as the space before the EUR symbol. The Plus Jakarta Sans TTF
 * subset registered in document.tsx has no glyph for U+202F -> .notdef overlap
 * artifact visible on the loyer feature card, montant HT row, and coefficient row.
 *
 * FIX: sanitizePdfNumber replaces every U+202F and U+00A0 with U+0020 (regular
 * space) -- the deterministic glyph the font supports.
 * format.ts is UNCHANGED: browsers have the U+202F glyph; the fix is PDF-only.
 *
 * Task 2 adds: a binary repro test that renders a REAL PDF via renderProposalPdf,
 * decompresses the text streams, reconstructs visible text, and asserts it contains
 * no U+202F and no U+00A0 codepoints.
 * NOTE: This binary test FAILS before document.tsx is wired through sanitizePdfNumber
 * (the pre-fix failure mode), and PASSES once the wiring is in place.
 */
import { describe, it, expect, vi } from 'vitest';
import { inflateSync } from 'node:zlib';

vi.mock('server-only', () => ({}));

import { sanitizePdfNumber } from './sanitize-number';
import { formatCurrency, formatNumber } from '@/lib/i18n/format';
import { renderProposalPdf } from '@/lib/pdf/render';

// ---- Helpers reused from no-commission.test.ts (same inflate+bfchar/TJ pattern) ----

/**
 * Decompress all PDF text streams and return a concatenated string.
 * @react-pdf/renderer uses FlateDecode (zlib) for content streams.
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
      // Non-flate or non-text stream -- skip.
    }
    match = streamRe.exec(str);
  }
  return decoded.join('\n---\n');
}

/**
 * From a decompressed PDF dump, extract the ToUnicode CMap glyph->codepoint
 * mappings and the hex-encoded glyph runs in content streams. Returns the
 * reconstructed visible text the user would see when reading the PDF.
 */
function reconstructVisibleText(decompressed: string): string {
  const glyphMap: Record<string, string> = {};
  const bfcharRe = /<([0-9a-f]+)>\s*<([0-9a-f\s]+)>/gi;
  let bm = bfcharRe.exec(decompressed);
  while (bm !== null) {
    const src = bm[1].toLowerCase();
    const codepoints = bm[2]
      .trim()
      .split(/\s+/)
      .map((h) => parseInt(h, 16))
      .filter((n) => Number.isFinite(n));
    glyphMap[src] = String.fromCodePoint(...codepoints);
    bm = bfcharRe.exec(decompressed);
  }

  const out: string[] = [];
  const tjRe = /\[([^\]]*)\]\s*TJ|<([0-9a-f\s]+)>\s*Tj/gi;
  let sm = tjRe.exec(decompressed);
  while (sm !== null) {
    const body = sm[1] ?? sm[2] ?? '';
    const hexTokens = body.match(/<([0-9a-f\s]+)>/gi) ?? [];
    for (const token of hexTokens) {
      const hex = token.replace(/[<>]/g, '').replace(/\s+/g, '').toLowerCase();
      for (let i = 0; i + 4 <= hex.length; i += 4) {
        const glyphId = hex.substr(i, 4);
        out.push(glyphMap[glyphId] ?? '');
      }
    }
    sm = tjRe.exec(decompressed);
  }

  return out.join('');
}

// ---- Unit tests (Task 1) ----------------------------------------------------

describe('sanitizePdfNumber -- unit tests', () => {
  it('replaces U+202F (NARROW NO-BREAK SPACE) with U+0020 (regular space)', () => {
    // String with U+202F as thousands separator and before EUR symbol
    const narrowNbsp = ' ';
    const input = '1' + narrowNbsp + '771,88' + narrowNbsp + '€';
    const result = sanitizePdfNumber(input);
    expect(result).not.toContain(' ');
    expect(result).toContain(' ');
  });

  it('replaces U+00A0 (NO-BREAK SPACE) with U+0020 (regular space)', () => {
    const nbsp = ' ';
    const input = '1' + nbsp + '771,88' + nbsp + '€';
    const result = sanitizePdfNumber(input);
    expect(result).not.toContain(' ');
    expect(result).toContain(' ');
  });

  it('leaves a string with only regular spaces unchanged (no mutation)', () => {
    const input = '1 771,88 €';
    expect(sanitizePdfNumber(input)).toBe(input);
  });

  it('does not strip the EUR symbol (U+20AC)', () => {
    const input = '1 771,88 €';
    const result = sanitizePdfNumber(input);
    expect(result).toContain('€');
  });

  it('does not alter digits, comma, or period', () => {
    const input = '1 234 567,89';
    const result = sanitizePdfNumber(input);
    expect(result).toContain('1');
    expect(result).toContain('2');
    expect(result).toContain('3');
    expect(result).toContain('4');
    expect(result).toContain(',');
    expect(result).not.toContain(' ');
  });

  it('returns an empty string unchanged', () => {
    expect(sanitizePdfNumber('')).toBe('');
  });

  it('handles a string with both U+202F and U+00A0', () => {
    const input = '1 234 567,00 €';
    const result = sanitizePdfNumber(input);
    expect(result).not.toContain(' ');
    expect(result).not.toContain(' ');
  });
});

// ---- Reproduction guard (Task 1) --------------------------------------------

describe('sanitizePdfNumber -- reproduction guard (pre-fix failure mode)', () => {
  /**
   * REPRODUCTION TEST: formatCurrency(1771.88, 'fr') with modern ICU emits
   * U+202F as the thousands separator and before the EUR symbol.
   * After passing through sanitizePdfNumber the result must contain NO U+202F
   * and NO U+00A0 -- proving the sanitizer eliminates the root cause.
   *
   * NOTE: Without the sanitizer call, the formatCurrency result DOES contain
   * U+202F on Node.js with modern ICU -- that is the pre-fix failure mode.
   */
  it('formatCurrency(1771.88, "fr") passed through sanitizePdfNumber contains no U+202F and no U+00A0', () => {
    const formatted = formatCurrency(1771.88, 'fr');
    const sanitized = sanitizePdfNumber(formatted);

    expect(sanitized).not.toContain(' ');
    expect(sanitized).not.toContain(' ');
    expect(sanitized).toContain('€');
    expect(sanitized).toContain('1');
    expect(sanitized).toContain('7');
    expect(sanitized).toContain('8');
  });

  it('formatNumber(1234567.8901, "fr", {minimumFractionDigits:4,maximumFractionDigits:4}) passed through sanitizePdfNumber contains no U+202F and no U+00A0', () => {
    const formatted = formatNumber(1234567.8901, 'fr', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });
    const sanitized = sanitizePdfNumber(formatted);

    expect(sanitized).not.toContain(' ');
    expect(sanitized).not.toContain(' ');
  });
});

// ---- Binary reproduction test (Task 2) --------------------------------------

/**
 * Binary repro test: render a REAL PDF via renderProposalPdf with a fr fixture,
 * decompress the text streams (reusing the inflate + bfchar/TJ reconstruction
 * helpers proven in no-commission.test.ts), and assert the reconstructed visible
 * text contains NO U+202F and NO U+00A0.
 *
 * PRE-FIX FAILURE MODE (documented): before document.tsx wraps formatCurrency/
 * formatNumber calls with sanitizePdfNumber, the PDF glyph stream encodes
 * U+202F codepoints which the Plus Jakarta Sans subset cannot render (no glyph),
 * producing .notdef overlap artifacts. This test catches that regression.
 *
 * jsdom environment shifts @react-pdf bytes -- this file is pinned to node
 * environment via the @vitest-environment node directive at the top.
 */
describe('PDF binary repro -- no U+202F or U+00A0 in rendered visible text', () => {
  const FR_FIXTURE = {
    lcRef: 'LC-PDF-TEST',
    language: 'fr' as const,
    createdAt: new Date('2026-05-30T00:00:00.000Z'),
    inputs: {
      partnerCo: 'Leasetic SAS',
      partnerName: 'Bob Partner',
      clientCo: 'Acme Corp',
      amountHT: '75000',
      durationMonths: 48 as const,
      validityDays: 30 as const,
    },
    computed: {
      state: 'computed' as const,
      trancheKey: 't2' as const,
      // t2/48: 75000 * 1.05 * 2.25 / 100 = 1771.875 -> 1771.88
      loyerHT: '1771.88',
      coeff: '2.2500',
      isOnDemand: false,
    },
  };

  it('fr fixture: reconstructed PDF visible text contains no U+202F (\\u202F) and no U+00A0 (\\u00A0)', async () => {
    const result = await renderProposalPdf({ data: FR_FIXTURE });

    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.sizeBytes).toBeGreaterThan(4000);

    const decompressed = decompressPdfStreams(result.buffer);
    const visibleText = reconstructVisibleText(decompressed);

    // The load-bearing assertions: no U+202F and no U+00A0 in the visible
    // text encoded in the PDF glyph stream.
    // PRE-FIX: these fail because formatCurrency/formatNumber emit U+202F
    // which gets encoded into the TJ glyph stream.
    // POST-FIX: these pass because every numeric value is wrapped in
    // sanitizePdfNumber before reaching the <Text> nodes in document.tsx.
    expect(visibleText).not.toContain(' ');
    expect(visibleText).not.toContain(' ');

    // Positive control: the lcRef appears in PDF metadata (raw binary scan)
    const rawLatin1 = result.buffer.toString('latin1');
    expect(rawLatin1).toContain('LC-PDF-TEST');
  }, 30000);

  it('en fixture: reconstructed PDF visible text contains no U+202F (\\u202F) and no U+00A0 (\\u00A0)', async () => {
    const enFixture = {
      ...FR_FIXTURE,
      lcRef: 'LC-PDF-EN-TEST',
      language: 'en' as const,
    };

    const result = await renderProposalPdf({ data: enFixture });
    const decompressed = decompressPdfStreams(result.buffer);
    const visibleText = reconstructVisibleText(decompressed);

    expect(visibleText).not.toContain(' ');
    expect(visibleText).not.toContain(' ');
  }, 30000);
});
