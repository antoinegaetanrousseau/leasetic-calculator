/**
 * Phase 19 Plan 01 — XLSX adapter barrel re-export.
 *
 * Per CONVENTIONS.md §Imports barrel discipline: all Phase 19 consumers MUST
 * import from '@/lib/xlsx', never directly from '@/lib/xlsx/render' or
 * '@/lib/xlsx/types'.
 *
 * ESLint guard (D-02): 'exceljs' is restricted to src/lib/xlsx/**. The
 * barrel itself does NOT import exceljs directly — it only re-exports the
 * adapter function and types from their respective modules.
 */

export { generateProposalsXlsx } from './render';
export type { XlsxExportRow, GenerateProposalsXlsxArgs } from './types';
