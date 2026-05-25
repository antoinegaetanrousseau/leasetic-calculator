import 'server-only';
import ExcelJS from 'exceljs';
import { t } from '@/lib/i18n/dictionaries';
import type { GenerateProposalsXlsxArgs } from './types';

/**
 * Phase 19 Plan 01 — XLSX adapter wrapping exceljs Workbook generation.
 *
 * (a) D-02 — `exceljs` may ONLY be imported from src/lib/xlsx/. ESLint
 *     no-restricted-imports rule (eslint.config.mjs) blocks it everywhere else,
 *     mirroring the @react-pdf/renderer → src/lib/pdf/** guard.
 *     `import 'server-only'` on line 1 ensures bundler fails if this module
 *     is transitively imported by a Client Component.
 * (b) D-03 — consumed by exportProposalsAction which returns a binary Response
 *     with Content-Disposition: attachment. The Buffer is ephemeral (not stored).
 * (c) D-04 — no audit_log entry; export is a read operation on already-persisted
 *     data; Phase 12 lifecycle-only convention holds.
 * (d) D-05 / EXPORT-02 — generateProposalsXlsx MUST NOT write commission_pct or
 *     any commission value to any cell, header, or sheet name. The XlsxExportRow
 *     type IS the ADMIN-09 boundary — it has no commission-bearing field.
 *     Gate 10 in tests/admin-09-grep-contracts.test.ts (parser-based ExcelJS scan)
 *     asserts zero /commission/i matches in any cell/header/sheet name.
 * (e) D-09 — locale-aware column headers + date cell format. Currency uses Excel
 *     native numFmt '# ##0.00 €' (locale-independent; Excel handles separators).
 *     Dates use DD/MM/YYYY (FR) or MM/DD/YYYY (EN) as Excel native date cells.
 *     Column widths are fixed per UI-SPEC §XLSX Cell Formatting locked widths table.
 */

/** Column definitions in display order per UI-SPEC §XLSX Cell Formatting. */
const COLUMNS = [
  { key: 'lcRef',         i18nKey: 'proposals.export.column.reference',   width: 18 },
  { key: 'clientName',   i18nKey: 'proposals.export.column.client',       width: 30 },
  { key: 'projectName',  i18nKey: 'proposals.export.column.project',      width: 30 },
  { key: 'amountHt',     i18nKey: 'proposals.export.column.amountHt',     width: 16 },
  { key: 'durationMonths', i18nKey: 'proposals.export.column.duration',   width: 12 },
  { key: 'monthlyRent',  i18nKey: 'proposals.export.column.monthlyRent',  width: 16 },
  { key: 'coefficient',  i18nKey: 'proposals.export.column.coefficient',  width: 14 },
  { key: 'status',       i18nKey: 'proposals.export.column.status',       width: 14 },
  { key: 'createdAt',    i18nKey: 'proposals.export.column.createdAt',    width: 18 },
  { key: 'expiresAt',    i18nKey: 'proposals.export.column.expiresAt',    width: 18 },
] as const;

/** Excel native currency format — locale-independent; Excel handles separators. */
const CURRENCY_NUM_FMT = '# ##0.00 €';

/**
 * Generate an XLSX workbook buffer for the given proposal rows.
 *
 * Returns a `Buffer` suitable for use as a Response body with
 * `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
 *
 * Design choices (D-09 Claude's Discretion):
 *   - Worksheet name: `'Propositions'` (single-locale; partners open one sheet).
 *   - Header row frozen (ySplit: 1).
 *   - Column widths fixed per UI-SPEC §XLSX Cell Formatting table.
 *   - amountHt + monthlyRent: Excel numeric cells with currency numFmt.
 *   - durationMonths: string cell `"{N} mois"` for clarity in both FR/EN.
 *   - coefficient: raw percent string (e.g. "3.69%") — not Excel percent native,
 *     to avoid decimal confusion in LibreOffice.
 *   - createdAt/expiresAt: Excel Date cells with locale-aware short date numFmt.
 *   - expiresAt null → empty cell (not the string "null").
 *
 * @param args.rows   Array of XlsxExportRow (commission-scrubbed by caller).
 * @param args.locale Partner's current locale cookie value.
 */
export async function generateProposalsXlsx(
  args: GenerateProposalsXlsxArgs,
): Promise<Buffer> {
  const { rows, locale } = args;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Leasétic Matrice';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Propositions');

  // Freeze header row (D-09 Claude's Discretion).
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Set column definitions with locale-resolved headers + fixed widths.
  worksheet.columns = COLUMNS.map((col) => ({
    key: col.key,
    header: t(col.i18nKey, locale),
    width: col.width,
  }));

  // Apply currency numFmt to Montant HT and Loyer mensuel columns.
  // Column indices are 1-based in ExcelJS.
  const amountHtColIdx = COLUMNS.findIndex((c) => c.key === 'amountHt') + 1;
  const monthlyRentColIdx = COLUMNS.findIndex((c) => c.key === 'monthlyRent') + 1;
  worksheet.getColumn(amountHtColIdx).numFmt = CURRENCY_NUM_FMT;
  worksheet.getColumn(monthlyRentColIdx).numFmt = CURRENCY_NUM_FMT;

  // Date format strings — locale-aware short date per D-09.
  const dateFmt = locale === 'fr' ? 'DD/MM/YYYY' : 'MM/DD/YYYY';
  const createdAtColIdx = COLUMNS.findIndex((c) => c.key === 'createdAt') + 1;
  const expiresAtColIdx = COLUMNS.findIndex((c) => c.key === 'expiresAt') + 1;

  // Populate data rows.
  rows.forEach((row, i) => {
    // Row index is 2-based (row 1 is the header).
    const rowIdx = i + 2;

    worksheet.addRow({
      lcRef: row.lcRef,
      clientName: row.clientName,
      projectName: row.projectName,
      amountHt: row.amountHt,
      durationMonths: `${row.durationMonths} mois`,
      monthlyRent: row.monthlyRent,
      coefficient: row.coefficient,
      status: row.status,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt ?? null,
    });

    // Apply date numFmt to date cells.
    if (row.createdAt !== null) {
      worksheet.getCell(rowIdx, createdAtColIdx).numFmt = dateFmt;
    }
    if (row.expiresAt !== null) {
      worksheet.getCell(rowIdx, expiresAtColIdx).numFmt = dateFmt;
    }
  });

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}
