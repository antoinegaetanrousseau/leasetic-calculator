/**
 * PDF-only style tokens. UI-SPEC §3.3.13.
 *
 * @react-pdf/renderer does NOT read CSS variables. All colors must be hex
 * literals. Keep this file in sync with the token spine in app/globals.css —
 * the comments cite the matching token name.
 *
 * Typography scale (D-10, Claude Design layout, Phase 43): 6.8 / 7.5 / 8 / 8.5 /
 * 9 / 9.5 / 10 / 11 / 13 / 21 pt. The pre-Phase-43 five-role scale (8/9/10/22/32pt)
 * is fully retired.
 */

// --- Phase 43 (D-10/D-11) unit rules for the design's token set below ---
//
// The design file (`Quote-FR-A.dc.html`) states font sizes in **pt**, but
// every spacing, radius and border width in **CSS px**. Convert px→pt at
// 1 CSS px = 0.75pt when transcribing a new geometry value from the design:
// a `14px` radius is `10.5`, a `1px` hairline is `0.75`, a `1.5px` hero
// border is `1.125`, a `2px` rule is `1.5`, and a `10px` gap is `7.5`.
//
// `react-pdf`'s `letterSpacing` is in points, not em, so the design's em
// tracking converts as: `.06em` at 7.5pt eyebrows = `0.45`; `-.01em` at
// 11pt = `-0.11` and at 13pt = `-0.13`; `-.025em` at 21pt h1 = `-0.525`;
// `-.03em` at the 21pt hero value = `-0.63`.

export const pdfColors = {
  navy: '#112C3B',          // headings / big numbers — matches --navy (D-11: uppercased to match the design; same colour as today's '#112c3b')
  surface: '#ffffff',       // page bg — PDF-print invariant

  // D-11 — the design's extended palette, transcribed from Quote-FR-A.dc.html / colors.css.
  labelTeal: '#3a6a75',     // eyebrows, key labels, footer
  bodyBlue: '#2A4F6E',      // values, description, table labels
  cardFill: '#F8FAFF',      // card background fill
  hairline: '#D6DCE5',      // pills, table rows, acceptance card, top rules
  stampBorder: '#BAC4D0',   // dashed stamp border
  stampText: '#94A7B6',     // stamp placeholder text
  brandGreen: '#01CC72',    // D-08: brand green enters the document through the logo marks only — no other consumer in the document body.
} as const;

export const pdfFontSizes = {
  // D-10 — the design's ten-step type scale, transcribed from Quote-FR-A.dc.html / typography.css.
  // Today's five legacy roles (footer/caption/body/title/loyer at 8/9/10/22/32) are replaced
  // wholesale — 32pt disappears entirely, the hero drops to match the 21pt title.
  legalFooter: 6.8,      // legal footer line
  eyebrow: 7.5,           // uppercase eyebrows (PROPOSITION N°, card titles)
  pill: 8,                // pills, "Établie le", the conditions paragraph, acceptance labels
  cardKv: 8.5,            // card key/value rows
  heroCaption: 9,         // hero caption + the financial table
  pageBase: 9.5,          // page base size
  projectDesc: 10,        // project description line
  cardHeadline: 11,       // card headline (VOTRE CONTACT / SOCIÉTÉ CLIENTE headline row)
  propositionNo: 13,      // proposition number
  h1: 21,                 // the title AND the hero value (32pt disappears — hero drops to match the title)
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
 *
 * D-11 — replaced in place with the design's `padding:14mm 15mm 10mm`
 * (top / horizontal / bottom), converted mm→pt at 1mm = 72/25.4pt. Horizontal
 * is uniform at 15mm both sides, so no fourth key is added.
 */
export const pdfPageMargins = {
  top: 39.6850,       // 14mm
  bottom: 28.3465,    // 10mm
  horizontal: 42.5197, // 15mm
} as const;

/**
 * D-10/D-11 — page-level values `<section class="page">` sets in the design.
 * `fontSize` is applied on `<Page>` directly. `lineHeight` is NOT applied at
 * the `<Page>` (or any single shared ancestor) level — see the comment at
 * `<Page style={{...}}>` in `document.tsx` for the reproduced
 * @react-pdf/renderer 4.5.1 defect this works around (an inherited
 * `lineHeight` anywhere in this document's ancestor chain silently drops
 * every dynamic `render`-prop `<Text>`). Every Text node that needs this
 * exact 1.45 value sets it explicitly; this constant documents the design's
 * intended base value for that purpose and for any future consumer.
 */
export const pdfPageBase = {
  fontSize: 9.5,
  lineHeight: 1.45,
} as const;
