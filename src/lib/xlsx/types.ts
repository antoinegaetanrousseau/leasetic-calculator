/**
 * Phase 19 Plan 01 — XLSX adapter type definitions.
 * Pure type file — no 'server-only', no runtime imports.
 *
 * ADMIN-09 boundary (D-05): XlsxExportRow intentionally has NO commission_pct,
 * commission_amount, or any commission-bearing field. The type IS the boundary —
 * any attempt to add commission data to the XLSX is caught at compile time.
 */

export interface XlsxExportRow {
  lcRef: string;
  clientName: string;
  projectName: string;
  /** Raw numeric value — rendered as Excel currency cell with numFmt '# ##0.00 €' */
  amountHt: number;
  durationMonths: number;
  /** Raw numeric value — rendered as Excel currency cell with numFmt '# ##0.00 €' */
  monthlyRent: number;
  /** Percent string e.g. "3.69%" — raw string per UI-SPEC D-09 to avoid LibreOffice decimal confusion */
  coefficient: string;
  /** i18n-resolved status label (e.g. "Actif", "Active") — caller resolves chip.* keys */
  status: string;
  createdAt: Date | null;
  expiresAt: Date | null;
}

export interface GenerateProposalsXlsxArgs {
  rows: XlsxExportRow[];
  locale: 'fr' | 'en';
}
