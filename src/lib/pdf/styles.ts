/**
 * PDF-only style tokens. UI-SPEC §3.3.13.
 *
 * @react-pdf/renderer does NOT read CSS variables. All colors must be hex
 * literals. Keep this file in sync with the token spine in app/globals.css —
 * the comments cite the matching token name.
 *
 * Typography scale (UI-SPEC §3.3 + Path A trim): 8 / 9 / 10 / 22 / 32 pt.
 */

export const pdfColors = {
  ink: '#1a2832',           // body text — matches [data-pdf-surface] dark fallback
  muted: '#6e7191',         // captions / labels
  navy: '#112c3b',          // headings / big numbers — matches --navy
  border: '#d9dbe9',        // 1pt rules — matches --border light
  green: '#129657',         // accent (loyer card border) — matches --gd
  greenTint: '#f0f9f4',     // 5% --gd flattened on white (loyer card bg)
  surface: '#ffffff',       // page bg — PDF-print invariant
} as const;

export const pdfFontSizes = {
  footer: 8,
  caption: 9,
  body: 10,
  title: 22,             // wordmark + title + on-demand value
  loyer: 32,             // big-number climax
} as const;

export const pdfFontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/**
 * Margins inside <Page>. UI-SPEC §3.3.1 — generous left/right white space
 * (~20mm), tight top/bottom for header + footer rooms.
 */
export const pdfPageMargins = {
  top: 48,
  bottom: 32,
  horizontal: 56,
} as const;
