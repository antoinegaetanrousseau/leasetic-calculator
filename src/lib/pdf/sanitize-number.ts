/**
 * PDF-scoped number sanitizer — Plan 23-01 fix for PDF-01.
 *
 * WHY THIS EXISTS (and why it is NOT a fix in format.ts):
 * ───────────────────────────────────────────────────────
 * `src/lib/i18n/format.ts` uses `new Intl.NumberFormat('fr-FR', …)` which,
 * on Node.js with modern ICU, emits U+202F (NARROW NO-BREAK SPACE,  )
 * as the French thousands-grouping separator AND as the space before the
 * "€" symbol. It may also emit U+00A0 (NO-BREAK SPACE,  ) in some
 * Node/ICU versions.
 *
 * Browsers have glyphs for both codepoints — web rendering is correct.
 * The Plus Jakarta Sans TTF subset committed in public/fonts/ lacks U+202F
 * and U+00A0. @react-pdf/renderer (PDFKit/fontkit) therefore falls back to
 * the .notdef glyph, producing visible overlap/artifact on:
 *   - the loyer feature card (formatCurrency of loyerHT)
 *   - the montant HT row (formatCurrency of amountHT)
 *   - the coefficient row (formatNumber of coeff)
 *
 * Mutating format.ts globally would change the formatting for ALL surfaces —
 * including web components where U+202F renders correctly. The fix is
 * deliberately PDF-scoped: wrap every formatCurrency/formatNumber call that
 * feeds a <Text> in document.tsx with this sanitizer.
 *
 * The sanitizer does ONE thing: replace U+202F and U+00A0 with U+0020
 * (REGULAR SPACE — codepoint 0x20), which IS present in the font subset.
 * It never alters digits, commas, periods, or the EUR symbol (U+20AC).
 *
 * Pure string function — no I/O, no framework imports, importable anywhere.
 */

/** NARROW NO-BREAK SPACE — the primary root-cause codepoint. */
const NARROW_NBSP = ' ';

/** NO-BREAK SPACE — fallback replacement in some ICU versions. */
const NBSP = ' ';

/** REGULAR SPACE — the replacement; present in the Plus Jakarta Sans subset. */
const SPACE = ' ';

/**
 * Replace every U+202F (NARROW NO-BREAK SPACE) and U+00A0 (NO-BREAK SPACE)
 * in `value` with U+0020 (regular space). All other characters — digits,
 * comma, period, EUR symbol — pass through unchanged.
 *
 * Use this wrapper around every formatCurrency / formatNumber call that feeds
 * a `<Text>` or `KeyValueRow valueText` in document.tsx.
 */
export function sanitizePdfNumber(value: string): string {
  // Two-pass replace: U+202F first, then U+00A0.
  // Using split/join instead of regex to avoid any regex-engine overhead and
  // to keep the intent maximally readable.
  return value
    .split(NARROW_NBSP).join(SPACE)
    .split(NBSP).join(SPACE);
}
