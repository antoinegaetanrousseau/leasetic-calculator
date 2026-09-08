/**
 * The single DOC-11 absence formatter.
 *
 * Phase 43 (D-01, D-09, D-13): the Claude Design layout's own device for an
 * absent value is the em dash — never a hidden row, a collapsed card, or an
 * invented placeholder string. Every optional field in the rendered document
 * (the advisor's four columns, the partner company telephone, the on-demand
 * coefficient / total-loyers cells) passes through `emDash` so card geometry
 * stays identical across proposals regardless of which fields a given record
 * carries. This is a geometry guarantee: DO NOT re-implement the ternary
 * inline at a call site — geometry guarantees decay when they are
 * re-implemented per field.
 */

/** U+2014 EM DASH, written as an escape (never a literal) — the DOC-11 absence glyph. */
export const EM_DASH = '\u2014';

/**
 * Format an optional value for rendering: `EM_DASH` when the value is
 * absent (`null`, `undefined`, or an all-whitespace string), otherwise the
 * original value coerced to a string.
 *
 * The passthrough is deliberately untrimmed — a legitimately padded value is
 * never silently reshaped. `0` is a real value, not an absence, and must
 * render as `'0'`.
 */
export function emDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return EM_DASH;
  }
  if (typeof value === 'string' && value.trim().length === 0) {
    return EM_DASH;
  }
  return String(value);
}
