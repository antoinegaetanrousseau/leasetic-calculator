/**
 * Phase 19 Plan 01 — render.test.ts
 *
 * Tests for generateProposalsXlsx adapter covering:
 *   - Smoke import (function is async)
 *   - Valid workbook with exactly 1 worksheet named 'Propositions'
 *   - Header row shape: 10 cells in FR locale
 *   - Header row shape: 10 cells in EN locale
 *   - worksheet.views[0] frozen (ySplit: 1)
 *   - Column widths per UI-SPEC §XLSX Cell Formatting
 *   - Numeric cell types for amountHt + monthlyRent, string for durationMonths
 *   - expiresAt null → empty cell (not the string 'null')
 *   - ADMIN-09 commission scrub: /commission/i matches zero in any cell/sheet
 */

import { describe, expect, it, vi } from 'vitest';

// Phase 6 / CONVENTIONS.md pattern: mock server-only as no-op in Vitest.
vi.mock('server-only', () => ({}));

import type { XlsxExportRow } from './types';

/**
 * ExcelJS xlsx.load() is typed as accepting `Buffer` (the old unparameterized
 * Node.js type) but @types/node 22.x uses `Buffer<ArrayBufferLike>`.
 * This helper bridges the gap in test files without touching production code.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asExcelJSBuffer(buf: Buffer<ArrayBufferLike>): any { return buf; }

const FIXTURE_ROW: XlsxExportRow = {
  lcRef: 'LC-2026-001',
  clientName: 'Dupont SARL',
  projectName: 'Renouvellement postes',
  amountHt: 12000,
  durationMonths: 36,
  monthlyRent: 333.33,
  coefficient: '3.69%',
  status: 'Actif',
  createdAt: new Date('2026-05-01T00:00:00Z'),
  expiresAt: new Date('2026-06-01T00:00:00Z'),
};

describe('generateProposalsXlsx', () => {
  it('Test 1: importing generateProposalsXlsx returns an async function (smoke import)', async () => {
    const { generateProposalsXlsx } = await import('./render');
    expect(typeof generateProposalsXlsx).toBe('function');
    // Constructing a minimal call verifies it resolves to a Promise
    const result = generateProposalsXlsx({ rows: [], locale: 'fr' });
    expect(result).toBeInstanceOf(Promise);
    await result; // resolve cleanly
  });

  it('Test 2: empty rows produces a valid workbook with exactly 1 worksheet named Propositions', async () => {
    const { generateProposalsXlsx } = await import('./render');
    const buf = await generateProposalsXlsx({ rows: [], locale: 'fr' });
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(0);

    // Parse back with a fresh ExcelJS workbook.
    // Cast: ExcelJS xlsx.load() expects the older unparameterized Buffer type.
    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(asExcelJSBuffer(buf));

    expect(wb.worksheets).toHaveLength(1);
    expect(wb.worksheets[0].name).toBe('Propositions');
  });

  it('Test 3: header row 1 contains exactly 10 cells in FR locale in the correct order', async () => {
    const { generateProposalsXlsx } = await import('./render');
    const buf = await generateProposalsXlsx({ rows: [], locale: 'fr' });

    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(asExcelJSBuffer(buf));

    const ws = wb.worksheets[0];
    // ExcelJS header row is row 1
    const headerRow = ws.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: false }, (cell) => {
      headers.push(String(cell.value ?? ''));
    });

    expect(headers).toHaveLength(10);
    expect(headers).toEqual([
      'Référence',
      'Client',
      'Projet',
      'Montant HT',
      'Durée',
      'Loyer mensuel',
      'Coefficient',
      'Statut',
      'Date de création',
      "Date d'expiration",
    ]);
  });

  it('Test 4: header row 1 in EN locale contains EN equivalents', async () => {
    const { generateProposalsXlsx } = await import('./render');
    const buf = await generateProposalsXlsx({ rows: [], locale: 'en' });

    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(asExcelJSBuffer(buf));

    const ws = wb.worksheets[0];
    const headerRow = ws.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: false }, (cell) => {
      headers.push(String(cell.value ?? ''));
    });

    expect(headers).toHaveLength(10);
    expect(headers).toEqual([
      'Reference',
      'Client',
      'Project',
      'Amount (excl. VAT)',
      'Duration',
      'Monthly rent',
      'Coefficient',
      'Status',
      'Created on',
      'Expires on',
    ]);
  });

  it('Test 5: worksheet.views[0] equals { state: frozen, ySplit: 1 }', async () => {
    const { generateProposalsXlsx } = await import('./render');
    const buf = await generateProposalsXlsx({ rows: [], locale: 'fr' });

    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(asExcelJSBuffer(buf));

    const ws = wb.worksheets[0];
    expect(ws.views).toHaveLength(1);
    expect(ws.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
  });

  it('Test 6: column widths match UI-SPEC locked widths table', async () => {
    const { generateProposalsXlsx } = await import('./render');
    const buf = await generateProposalsXlsx({ rows: [], locale: 'fr' });

    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(asExcelJSBuffer(buf));

    const ws = wb.worksheets[0];
    const expectedWidths = [18, 30, 30, 16, 12, 16, 14, 14, 18, 18];

    expectedWidths.forEach((expectedWidth, idx) => {
      const col = ws.getColumn(idx + 1);
      expect(col.width, `Column ${idx + 1} width`).toBe(expectedWidth);
    });
  });

  it('Test 7: numeric cells have correct numFmt, durationMonths is a string "{N} mois"', async () => {
    const { generateProposalsXlsx } = await import('./render');
    const row: XlsxExportRow = {
      ...FIXTURE_ROW,
      amountHt: 12000,
      monthlyRent: 333.33,
      durationMonths: 36,
    };
    const buf = await generateProposalsXlsx({ rows: [row], locale: 'fr' });

    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(asExcelJSBuffer(buf));

    const ws = wb.worksheets[0];
    const dataRow = ws.getRow(2);

    // Col D (4) = amountHt, Col F (6) = monthlyRent
    const amountCell = dataRow.getCell(4);
    const monthlyCell = dataRow.getCell(6);
    const durationCell = dataRow.getCell(5);

    // Numeric values
    expect(amountCell.value).toBe(12000);
    expect(monthlyCell.value).toBe(333.33);

    // Currency numFmt
    expect(amountCell.numFmt).toBe('# ##0.00 €');
    expect(monthlyCell.numFmt).toBe('# ##0.00 €');

    // Duration is a string
    expect(durationCell.value).toBe('36 mois');
  });

  it('Test 8: expiresAt null results in empty cell (not the string "null")', async () => {
    const { generateProposalsXlsx } = await import('./render');
    const row: XlsxExportRow = {
      ...FIXTURE_ROW,
      expiresAt: null,
    };
    const buf = await generateProposalsXlsx({ rows: [row], locale: 'fr' });

    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(asExcelJSBuffer(buf));

    const ws = wb.worksheets[0];
    const dataRow = ws.getRow(2);
    // expiresAt is column 10
    const expiresCell = dataRow.getCell(10);

    // Value should be null or undefined (empty), NOT the string 'null'
    expect(expiresCell.value).not.toBe('null');
    expect(expiresCell.value === null || expiresCell.value === undefined).toBe(true);
  });

  it('Test 9: ADMIN-09 commission scrub — /commission/i matches zero in any cell, header, or sheet name', async () => {
    const { generateProposalsXlsx } = await import('./render');
    // Fixture row has no commission field (the type enforces this)
    const buf = await generateProposalsXlsx({ rows: [FIXTURE_ROW], locale: 'fr' });

    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(asExcelJSBuffer(buf));

    for (const sheet of wb.worksheets) {
      // Sheet name must not match /commission/i
      expect(sheet.name).not.toMatch(/commission/i);

      sheet.eachRow((row) => {
        row.eachCell({ includeEmpty: false }, (cell) => {
          const text = String(cell.value ?? '');
          expect(text).not.toMatch(/commission/i);
        });
      });
    }
  });
});
