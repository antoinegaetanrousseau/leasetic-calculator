// @vitest-environment node
/**
 * Plan 23-01 Task 1 — PDF-scoped number sanitizer reproduction + unit tests.
 *
 * ROOT CAUSE (D-01): formatCurrency/formatNumber use Intl.NumberFormat('fr-FR')
 * which emits U+202F (NARROW NO-BREAK SPACE,  ) as the French thousands
 * grouping separator and as the space before "€". The Plus Jakarta Sans TTF
 * subset registered in document.tsx has no glyph for U+202F → .notdef overlap
 * artifact visible on the loyer feature card, montant HT row, and coefficient row.
 *
 * FIX: sanitizePdfNumber replaces every U+202F and U+00A0 (NO-BREAK SPACE) with
 * U+0020 (regular space) — the deterministic glyph the font supports.
 * format.ts is UNCHANGED: browsers have the U+202F glyph; the fix is PDF-only.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { sanitizePdfNumber } from './sanitize-number';
import { formatCurrency, formatNumber } from '@/lib/i18n/format';

describe('sanitizePdfNumber — unit tests', () => {
  it('replaces U+202F (\\u202F, NARROW NO-BREAK SPACE) with U+0020 (regular space)', () => {
    const input = '1 771,88 €'; // simulated fr-FR formatted string with U+202F
    const result = sanitizePdfNumber(input);
    expect(result).not.toContain(' ');
    expect(result).toContain(' ');  // regular space present
  });

  it('replaces U+00A0 (\\u00A0, NO-BREAK SPACE) with U+0020 (regular space)', () => {
    const input = '1 771,88 €';
    const result = sanitizePdfNumber(input);
    expect(result).not.toContain(' ');
    expect(result).toContain(' ');
  });

  it('leaves a string with only regular spaces unchanged (no mutation)', () => {
    const input = '1 771,88 €';
    expect(sanitizePdfNumber(input)).toBe(input);
  });

  it('does not strip the EUR symbol (\\u20AC)', () => {
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
    // Ensure no U+202F remains
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

describe('sanitizePdfNumber — reproduction guard (pre-fix failure mode)', () => {
  /**
   * REPRODUCTION TEST: formatCurrency(1771.88, 'fr') with modern ICU emits
   * U+202F as the thousands separator and before the € symbol.
   * This test asserts that after passing through sanitizePdfNumber, the result
   * contains NO U+202F and NO U+00A0 — proving the sanitizer eliminates the
   * root cause.
   *
   * NOTE: Without the sanitizer call, this assertion fails (the formatted
   * string DOES contain U+202F on Node.js with modern ICU). That is the
   * pre-fix failure mode documented here.
   */
  it('formatCurrency(1771.88, "fr") passed through sanitizePdfNumber contains no U+202F and no U+00A0', () => {
    const formatted = formatCurrency(1771.88, 'fr');
    const sanitized = sanitizePdfNumber(formatted);

    // The key assertion: no U+202F (NARROW NO-BREAK SPACE)
    expect(sanitized).not.toContain(' ');
    // Also no U+00A0 (NO-BREAK SPACE)
    expect(sanitized).not.toContain(' ');

    // Positive: the EUR symbol is still present
    expect(sanitized).toContain('€');
    // Positive: still contains the numeric digits
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
