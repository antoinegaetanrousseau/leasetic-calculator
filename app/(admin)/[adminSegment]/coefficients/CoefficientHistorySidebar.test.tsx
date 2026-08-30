/**
 * Plan 18-05 Task 2 — CoefficientHistorySidebar tests (D-21 chrome refresh,
 * D-22 click-to-diff removal).
 *
 * Replaces the Phase 14 click-to-diff suite. The diff modal now lives ONLY
 * on the /history full page (CoefficientDiffPanel.tsx remains intact, just
 * is no longer mounted from this sidebar).
 *
 * Behavior contract (per Plan 18-05 task 2 <behavior> block):
 *   T1: Rows have NO onClick handler / NO role="button" / NO cursor:pointer
 *       (D-22 click-to-diff removed). Clicking a row does not mount any
 *       diff panel.
 *   T2: Row style.cursor === 'default'.
 *   T3: 3-element vertical stack per row — top line (relative time + admin
 *       name), middle line (change summary), optional note line (italic).
 *   T4: Row chrome — padding:'12px 16px'; borderBottom:'1px solid var(--border)'.
 *   T5: /history link at bottom uses the Plan 18-01 NEW key
 *       admin.coefficients.history.viewAll = "Voir tout l'historique →".
 *   T6: Empty state still renders without the footer link (preserved from Phase 14).
 *   T7: Header chrome (● HISTORIQUE) preserved.
 *   T8 (META — D-22 enforcement): There is NO CoefficientDiffPanel reference
 *       in the sidebar source (test asserts via source-string read).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

vi.mock('server-only', () => ({}));

const { listCoefficientHistoryMock } = vi.hoisted(() => ({
  listCoefficientHistoryMock: vi.fn(),
}));

vi.mock('@/lib/db/queries/coefficient-history', () => ({
  listCoefficientHistory: (...args: unknown[]) =>
    listCoefficientHistoryMock(...args),
}));

import { CoefficientHistorySidebar } from './CoefficientHistorySidebar';
import { CoefficientHistorySidebarRow } from './CoefficientHistorySidebarRow';
import type { CoefficientHistoryListRow } from '@/lib/db/queries/coefficient-history';
import type { GlobalParamsSnapshot } from '@/lib/admin/coefficient-diff';

const SNAPSHOT: GlobalParamsSnapshot = {
  commissionPct: '5.00',
  maxAmount: '50000.00',
  validityDays: 30,
  coefficients: {
    t1: { '36': '2.2500', '48': '2.5500', '60': '2.8500' },
    t2: { '36': '2.0500', '48': '2.8500', '60': '2.6500' },
    t3: { '36': '1.8500', '48': '2.1500', '60': '2.4500' },
    t4: { '36': '1.6500', '48': '1.9500', '60': '2.2500' },
  },
};

function mkRow(
  id: string,
  summary: string,
  overrides: Partial<CoefficientHistoryListRow> = {},
): CoefficientHistoryListRow {
  return {
    id,
    changedAt: new Date('2026-05-12T10:00:00Z'),
    changedByUserId: 'user-1',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    beforeJson: SNAPSHOT as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    afterJson: SNAPSHOT as any,
    summary,
    createdByDisplay: 'Marie Dupont',
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  listCoefficientHistoryMock.mockReset();
});

describe('CoefficientHistorySidebar (server component) — Plan 18-05 D-21/D-22', () => {
  beforeEach(() => {
    listCoefficientHistoryMock.mockReset();
  });

  it('T5: footer link uses Plan 18-01 admin.coefficients.history.viewAll key', async () => {
    listCoefficientHistoryMock.mockResolvedValueOnce({
      rows: [mkRow('hist-1', 'Commission: 5.00% → 5.50%')],
      hasMore: false,
      nextCursor: null,
    });
    const ui = await CoefficientHistorySidebar({
      lang: 'fr',
      adminSegment: 'my-seg',
    });
    const { container } = render(ui);
    const link = container.querySelector('a');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('/my-seg/history');
    expect(link!.textContent).toContain("Voir tout l'historique →");
  });

  it('T6: empty state — empty copy + footer link hidden', async () => {
    listCoefficientHistoryMock.mockResolvedValueOnce({
      rows: [],
      hasMore: false,
      nextCursor: null,
    });
    const ui = await CoefficientHistorySidebar({
      lang: 'fr',
      adminSegment: 'admin-segment',
    });
    const { container } = render(ui);
    expect(container.textContent).toContain(
      'Aucun changement de coefficient pour le moment.',
    );
    expect(container.querySelectorAll('a').length).toBe(0);
  });

  it('T7: header chrome preserved (● HISTORIQUE + aria-label)', async () => {
    listCoefficientHistoryMock.mockResolvedValueOnce({
      rows: [mkRow('hist-1', 'Change 1')],
      hasMore: false,
      nextCursor: null,
    });
    const ui = await CoefficientHistorySidebar({
      lang: 'fr',
      adminSegment: 'admin-segment',
    });
    const { container } = render(ui);
    const section = container.querySelector('section[aria-label]');
    expect(section).not.toBeNull();
    expect(section!.getAttribute('aria-label')).toBe(
      'Historique des coefficients',
    );
    // Phase 5: `.ctitle` / `.dot` became <SectionTitle>; the header chrome
    // this test guards is unchanged, only the class names are.
    const header = section!.querySelector('[data-slot="section-title"]');
    expect(header).not.toBeNull();
    expect(
      header!.querySelector('[data-slot="section-title-bullet"]'),
    ).not.toBeNull();
    expect(header!.textContent).toContain('HISTORIQUE');
  });

  it('T8 (META — D-22): sidebar source contains NO CoefficientDiffPanel reference', () => {
    const sidebarSource = readFileSync(
      path.resolve(
        __dirname,
        'CoefficientHistorySidebar.tsx',
      ),
      'utf-8',
    );
    const rowSource = readFileSync(
      path.resolve(
        __dirname,
        'CoefficientHistorySidebarRow.tsx',
      ),
      'utf-8',
    );
    // D-22: the diff modal stays on /history only — neither the sidebar
    // nor its row component may IMPORT or MOUNT CoefficientDiffPanel.
    // (JSDoc comments mentioning the symbol for traceability are allowed —
    // we filter them out by stripping block comments before matching.)
    const stripComments = (s: string) =>
      s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const sidebarCode = stripComments(sidebarSource);
    const rowCode = stripComments(rowSource);
    expect(sidebarCode).not.toMatch(/CoefficientDiffPanel/);
    expect(rowCode).not.toMatch(/CoefficientDiffPanel/);
    // And no click-to-diff handler remains.
    expect(sidebarCode).not.toMatch(/openDiff|onClick.*diff/i);
    expect(rowCode).not.toMatch(/openDiff|onClick.*diff/i);
  });
});

describe('CoefficientHistorySidebarRow — Plan 18-05 D-21/D-22', () => {
  it('T1 (D-22): row has NO role="button" + clicking does NOT mount a diff panel', () => {
    const row = mkRow('hist-1', 'Coefficient 36 mois T2: 2.95 → 3.05');
    const { container } = render(
      <CoefficientHistorySidebarRow row={row} lang="fr" />,
    );
    // No interactive role — rows are now read-only.
    expect(container.querySelector('[role="button"]')).toBeNull();
    // Clicking the rendered root must not introduce any new DOM (i.e. no
    // diff panel mount, no aria-expanded toggle).
    const root = container.firstElementChild as HTMLElement;
    expect(root).not.toBeNull();
    const beforeHtml = root.outerHTML;
    fireEvent.click(root);
    expect(root.outerHTML).toBe(beforeHtml);
    // Defensive: even if a panel testid leaked, assert absence.
    expect(container.querySelector('[data-testid="diff-panel"]')).toBeNull();
  });

  it('T2 (D-22): row cursor is default, not pointer', () => {
    const row = mkRow('hist-1', 'Change 1');
    const { container } = render(
      <CoefficientHistorySidebarRow row={row} lang="fr" />,
    );
    const root = container.firstElementChild as HTMLElement;
    const inline = root.getAttribute('style') ?? '';
    // Must contain explicit cursor:default OR omit cursor entirely (browser
    // default is already 'default' on a non-button div). The D-22 contract
    // forbids cursor:pointer.
    expect(inline).not.toMatch(/cursor:\s*pointer/);
  });

  it('T3 (D-21): row contains 3-element vertical stack — top line (time + admin), middle line (summary), optional note', () => {
    const row = mkRow(
      'hist-1',
      'Coefficient 36 mois T2: 2.95 → 3.05',
    );
    const { container } = render(
      <CoefficientHistorySidebarRow row={row} lang="fr" />,
    );
    // Top line: time + admin name both rendered.
    expect(container.textContent).toContain('Marie Dupont');
    // Middle line: change summary.
    expect(container.textContent).toContain(
      'Coefficient 36 mois T2: 2.95 → 3.05',
    );
  });

  it('T4 (D-21): row chrome — padding 12px 16px + borderBottom var(--border)', () => {
    const row = mkRow('hist-1', 'Change 1');
    const { container } = render(
      <CoefficientHistorySidebarRow row={row} lang="fr" />,
    );
    const root = container.firstElementChild as HTMLElement;
    const inline = root.getAttribute('style') ?? '';
    expect(inline).toMatch(/padding:\s*12px\s+16px/);
    expect(inline).toMatch(/border-bottom:\s*1px solid var\(--border\)/);
  });
});
