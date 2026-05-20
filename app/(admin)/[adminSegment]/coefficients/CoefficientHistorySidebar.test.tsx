/**
 * Plan 14-04 Task 2 — CoefficientHistorySidebar + Row tests (RED → GREEN).
 *
 * 6 automated test cases per PLAN.md `<behavior>` block:
 *   T1: sidebar renders 5 rows when listCoefficientHistory returns 5
 *   T2: empty state — sidebar renders empty copy AND footer link is hidden
 *   T3: footer link — href is `/<seg>/history` + i18n text
 *   T4: header — outer card has the `● HISTORIQUE` chrome + aria-label
 *   T5: row toggle — clicking the row toggles aria-expanded and reveals/hides
 *       the CoefficientDiffPanel mount
 *   T6: multi-expand — multiple rows can be expanded simultaneously (D-20)
 *
 * The CoefficientDiffPanel is mocked to a stub div to keep prop-passing
 * assertions tight without exercising the full panel (already covered in
 * Plan 14-04 Task 1's test file).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';

vi.mock('server-only', () => ({}));

const { listCoefficientHistoryMock } = vi.hoisted(() => ({
  listCoefficientHistoryMock: vi.fn(),
}));

vi.mock('@/lib/db/queries/coefficient-history', () => ({
  listCoefficientHistory: (...args: unknown[]) =>
    listCoefficientHistoryMock(...args),
}));

// Mock the CoefficientDiffPanel — the Row test asserts the panel mounts
// when expanded; it does NOT re-verify the panel internals.
vi.mock('../history/CoefficientDiffPanel', () => ({
  CoefficientDiffPanel: ({
    mode,
    row,
  }: {
    mode: string;
    row: { id: string };
  }) => (
    <div data-testid="diff-panel" data-mode={mode} data-row-id={row.id} />
  ),
}));

// Import AFTER all mocks are in place.
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

function mkRow(id: string, summary: string): CoefficientHistoryListRow {
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
  };
}

afterEach(() => {
  cleanup();
  listCoefficientHistoryMock.mockReset();
});

describe('CoefficientHistorySidebar (server component)', () => {
  beforeEach(() => {
    listCoefficientHistoryMock.mockReset();
  });

  it('T1: renders 5 rows when listCoefficientHistory returns 5', async () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      mkRow(`hist-${i}`, `Change ${i}`),
    );
    listCoefficientHistoryMock.mockResolvedValueOnce({
      rows,
      hasMore: false,
      nextCursor: null,
    });

    const ui = await CoefficientHistorySidebar({
      lang: 'fr',
      adminSegment: 'admin-segment',
    });
    const { container } = render(ui);
    // Each row's summary text should appear in the DOM
    for (let i = 0; i < 5; i++) {
      expect(container.textContent).toContain(`Change ${i}`);
    }
    // listCoefficientHistory must have been called with { limit: 5 }
    expect(listCoefficientHistoryMock).toHaveBeenCalledWith({ limit: 5 });
  });

  it('T2: empty state — renders empty copy AND footer link is hidden', async () => {
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
    // Footer link MUST NOT be in the DOM when rows are empty
    const links = container.querySelectorAll('a');
    expect(links.length).toBe(0);
  });

  it('T3: footer link has href `/<seg>/history` + i18n text', async () => {
    listCoefficientHistoryMock.mockResolvedValueOnce({
      rows: [mkRow('hist-1', 'Change 1')],
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

  it('T4: outer card has ● HISTORIQUE header chrome + aria-label', async () => {
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
    // .ctitle + .dot chrome
    const ctitle = section!.querySelector('.ctitle');
    expect(ctitle).not.toBeNull();
    const dot = ctitle!.querySelector('.dot');
    expect(dot).not.toBeNull();
    expect(ctitle!.textContent).toContain('HISTORIQUE');
  });
});

describe('CoefficientHistorySidebarRow (client component)', () => {
  it('T5: clicking the row toggles aria-expanded + mounts CoefficientDiffPanel in condensed mode', () => {
    const row = mkRow('hist-1', 'Commission changed');
    const { container } = render(
      <CoefficientHistorySidebarRow row={row} lang="fr" />,
    );
    const trigger = container.querySelector('[role="button"]')!;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    // No diff panel yet
    expect(container.querySelector('[data-testid="diff-panel"]')).toBeNull();

    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    // Diff panel mounted in condensed mode
    const panel = container.querySelector('[data-testid="diff-panel"]');
    expect(panel).not.toBeNull();
    expect(panel!.getAttribute('data-mode')).toBe('condensed');
    expect(panel!.getAttribute('data-row-id')).toBe('hist-1');

    // Re-click collapses
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('[data-testid="diff-panel"]')).toBeNull();
  });

  it('T6: multi-expand — multiple rows can be expanded simultaneously (D-20)', () => {
    const rowA = mkRow('row-a', 'Change A');
    const rowB = mkRow('row-b', 'Change B');
    const { container } = render(
      <div>
        <CoefficientHistorySidebarRow row={rowA} lang="fr" />
        <CoefficientHistorySidebarRow row={rowB} lang="fr" />
      </div>,
    );
    const triggers = container.querySelectorAll('[role="button"]');
    expect(triggers.length).toBe(2);

    fireEvent.click(triggers[0]!);
    fireEvent.click(triggers[1]!);

    expect(triggers[0]!.getAttribute('aria-expanded')).toBe('true');
    expect(triggers[1]!.getAttribute('aria-expanded')).toBe('true');

    const panels = container.querySelectorAll('[data-testid="diff-panel"]');
    expect(panels.length).toBe(2);
    const panelRowIds = Array.from(panels).map((p) =>
      p.getAttribute('data-row-id'),
    );
    expect(panelRowIds).toContain('row-a');
    expect(panelRowIds).toContain('row-b');
  });

  it('T5b: row meta renders formatted date + createdByDisplay; summary renders too', () => {
    const row = mkRow('hist-1', 'Commission: 5.00% → 5.50%');
    const { container } = render(
      <CoefficientHistorySidebarRow row={row} lang="fr" />,
    );
    expect(container.textContent).toContain('Commission: 5.00% → 5.50%');
    expect(container.textContent).toContain('Marie Dupont');
  });
});
