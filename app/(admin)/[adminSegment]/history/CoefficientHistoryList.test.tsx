/**
 * Plan 14-05 Task 1 — CoefficientHistoryList tests (RED → GREEN).
 *
 * 8 test cases per PLAN.md `<behavior>` block (Tests 4-11):
 *   T4: 3-row render — 3 rows produces 3 <CoefficientHistoryRow> mounts
 *   T5: single-active expand (D-25) — clicking row B closes row A
 *   T6: Escape closes the expanded row
 *   T7: diff panel mounts in 'full' mode when row is expanded
 *   T8: pagination next link (hasMore=true) — href = /<seg>/history?cursor=<enc>
 *   T9: pagination previous link (currentCursor !== null) — href = /<seg>/history
 *   T10: empty state — rows=[] + currentCursor=null → empty card renders
 *   T11: i18n parity (7 NEW keys exist in BOTH FR + EN) — compile-time proof
 *       is asserted indirectly via successful module import; this test does
 *       a runtime sanity check on the 7 NEW keys this plan introduces.
 *
 * The <CoefficientDiffPanel> is mocked to a stub div so the list test asserts
 * prop-passing (mode='full', row.id) without re-running Plan 14-04 coverage.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/react';

vi.mock('server-only', () => ({}));

// Mock the CoefficientDiffPanel — assert prop-passing only.
vi.mock('./CoefficientDiffPanel', () => ({
  CoefficientDiffPanel: ({
    mode,
    row,
    onClose,
  }: {
    mode: string;
    row: { id: string };
    onClose?: () => void;
  }) => (
    <div
      data-testid="diff-panel-full"
      data-mode={mode}
      data-row-id={row.id}
    >
      <button
        type="button"
        data-testid="diff-panel-close"
        onClick={onClose}
        aria-label="Fermer le détail"
      >
        Fermer ×
      </button>
    </div>
  ),
}));

// Import AFTER mocks.
import { CoefficientHistoryList } from './CoefficientHistoryList';
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

afterEach(() => cleanup());

describe('CoefficientHistoryList', () => {
  it('T4: 3-row render produces 3 trigger buttons + 3 summary lines', () => {
    const rows = [
      mkRow('row-1', 'Change 1'),
      mkRow('row-2', 'Change 2'),
      mkRow('row-3', 'Change 3'),
    ];
    const { container } = render(
      <CoefficientHistoryList
        rows={rows}
        hasMore={false}
        nextCursorEncoded={null}
        currentCursor={null}
        adminSegment="my-seg"
        lang="fr"
      />,
    );
    const triggers = container.querySelectorAll('button[aria-expanded]');
    expect(triggers.length).toBe(3);
    expect(container.textContent).toContain('Change 1');
    expect(container.textContent).toContain('Change 2');
    expect(container.textContent).toContain('Change 3');
  });

  it('T5: single-active expand (D-25) — clicking row B closes row A', () => {
    const rows = [
      mkRow('row-1', 'Change 1'),
      mkRow('row-2', 'Change 2'),
    ];
    const { container } = render(
      <CoefficientHistoryList
        rows={rows}
        hasMore={false}
        nextCursorEncoded={null}
        currentCursor={null}
        adminSegment="my-seg"
        lang="fr"
      />,
    );
    const triggers = container.querySelectorAll('button[aria-expanded]');
    expect(triggers.length).toBe(2);

    // Initially: both collapsed
    expect(triggers[0]!.getAttribute('aria-expanded')).toBe('false');
    expect(triggers[1]!.getAttribute('aria-expanded')).toBe('false');

    // Click row 1 → row 1 expanded, row 2 collapsed
    fireEvent.click(triggers[0]!);
    expect(triggers[0]!.getAttribute('aria-expanded')).toBe('true');
    expect(triggers[1]!.getAttribute('aria-expanded')).toBe('false');
    let panels = container.querySelectorAll('[data-testid="diff-panel-full"]');
    expect(panels.length).toBe(1);
    expect(panels[0]!.getAttribute('data-row-id')).toBe('row-1');

    // Click row 2 → row 2 expanded, row 1 closed (single-active per D-25)
    fireEvent.click(triggers[1]!);
    expect(triggers[0]!.getAttribute('aria-expanded')).toBe('false');
    expect(triggers[1]!.getAttribute('aria-expanded')).toBe('true');
    panels = container.querySelectorAll('[data-testid="diff-panel-full"]');
    expect(panels.length).toBe(1);
    expect(panels[0]!.getAttribute('data-row-id')).toBe('row-2');
  });

  it('T6: Escape key collapses the currently expanded row', () => {
    const rows = [mkRow('row-1', 'Change 1')];
    const { container } = render(
      <CoefficientHistoryList
        rows={rows}
        hasMore={false}
        nextCursorEncoded={null}
        currentCursor={null}
        adminSegment="my-seg"
        lang="fr"
      />,
    );
    const trigger = container.querySelector('button[aria-expanded]')!;
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    // Dispatch Escape on document
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(
      container.querySelectorAll('[data-testid="diff-panel-full"]').length,
    ).toBe(0);
  });

  it('T7: diff panel mounts in mode="full" when row is expanded', () => {
    const rows = [mkRow('row-1', 'Change 1')];
    const { container } = render(
      <CoefficientHistoryList
        rows={rows}
        hasMore={false}
        nextCursorEncoded={null}
        currentCursor={null}
        adminSegment="my-seg"
        lang="fr"
      />,
    );
    const trigger = container.querySelector('button[aria-expanded]')!;
    fireEvent.click(trigger);
    const panel = container.querySelector('[data-testid="diff-panel-full"]');
    expect(panel).not.toBeNull();
    expect(panel!.getAttribute('data-mode')).toBe('full');
    expect(panel!.getAttribute('data-row-id')).toBe('row-1');
  });

  it('T7b: clicking the diff panel close button collapses the row (onClose wired)', () => {
    const rows = [mkRow('row-1', 'Change 1')];
    const { container } = render(
      <CoefficientHistoryList
        rows={rows}
        hasMore={false}
        nextCursorEncoded={null}
        currentCursor={null}
        adminSegment="my-seg"
        lang="fr"
      />,
    );
    const trigger = container.querySelector('button[aria-expanded]')!;
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    // Click the panel's close button (onClose === list's setExpandedRowId(null))
    const closeBtn = container.querySelector('[data-testid="diff-panel-close"]')!;
    fireEvent.click(closeBtn);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('T8: pagination — hasMore=true && nextCursorEncoded set → next-page link with /<seg>/history?cursor=<enc>', () => {
    const rows = [mkRow('row-1', 'Change 1')];
    const { container } = render(
      <CoefficientHistoryList
        rows={rows}
        hasMore={true}
        nextCursorEncoded="ABC123"
        currentCursor={null}
        adminSegment="my-seg"
        lang="fr"
      />,
    );
    const links = container.querySelectorAll('a');
    const nextLink = Array.from(links).find((a) =>
      a.getAttribute('href')?.includes('cursor=ABC123'),
    );
    expect(nextLink).not.toBeUndefined();
    expect(nextLink!.getAttribute('href')).toBe('/my-seg/history?cursor=ABC123');
    expect(nextLink!.textContent).toContain('Page suivante →');
  });

  it('T9: pagination — currentCursor !== null → previous-page link to bare /<seg>/history', () => {
    const rows = [mkRow('row-1', 'Change 1')];
    const { container } = render(
      <CoefficientHistoryList
        rows={rows}
        hasMore={false}
        nextCursorEncoded={null}
        currentCursor="SOME_CURSOR"
        adminSegment="my-seg"
        lang="fr"
      />,
    );
    const links = container.querySelectorAll('a');
    const prevLink = Array.from(links).find(
      (a) => a.getAttribute('href') === '/my-seg/history',
    );
    expect(prevLink).not.toBeUndefined();
    expect(prevLink!.textContent).toContain('← Page précédente');
  });

  it('T9b: pagination — currentCursor === null → NO previous-page link rendered', () => {
    const rows = [mkRow('row-1', 'Change 1')];
    const { container } = render(
      <CoefficientHistoryList
        rows={rows}
        hasMore={false}
        nextCursorEncoded={null}
        currentCursor={null}
        adminSegment="my-seg"
        lang="fr"
      />,
    );
    // No previous-page link present
    expect(container.textContent).not.toContain('← Page précédente');
  });

  it('T10: empty state — rows=[] + currentCursor=null renders the empty-state card', () => {
    const { container } = render(
      <CoefficientHistoryList
        rows={[]}
        hasMore={false}
        nextCursorEncoded={null}
        currentCursor={null}
        adminSegment="my-seg"
        lang="fr"
      />,
    );
    expect(container.textContent).toContain(
      'Aucun changement de coefficient pour le moment.',
    );
    // No trigger buttons
    expect(container.querySelectorAll('button[aria-expanded]').length).toBe(0);
    // No pagination links
    expect(container.querySelectorAll('a').length).toBe(0);
  });

  it('T10b: empty state past last page — rows=[] + currentCursor !== null still renders empty copy + previous link', () => {
    const { container } = render(
      <CoefficientHistoryList
        rows={[]}
        hasMore={false}
        nextCursorEncoded={null}
        currentCursor="SOME_CURSOR"
        adminSegment="my-seg"
        lang="fr"
      />,
    );
    expect(container.textContent).toContain(
      'Aucun changement de coefficient pour le moment.',
    );
    // Previous-page link present
    const links = container.querySelectorAll('a');
    const prevLink = Array.from(links).find(
      (a) => a.getAttribute('href') === '/my-seg/history',
    );
    expect(prevLink).not.toBeUndefined();
  });

  it('T11: i18n parity — 7 NEW Plan 14-05 history.* keys exist in BOTH FR and EN dictionaries', async () => {
    const mod = await import('@/lib/i18n/dictionaries');
    const NEW_KEYS = [
      'history.title',
      'history.subtitle',
      'history.row.viewDetail',
      'history.row.hideDetail',
      'history.pagination.next',
      'history.pagination.previous',
      'history.empty',
      'history.diff.summary.label',
    ] as const;
    for (const k of NEW_KEYS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((mod.dictionaries.fr as any)[k]).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((mod.dictionaries.en as any)[k]).toBeDefined();
    }
  });

  it('row meta renders formatted date + createdByDisplay below the summary', () => {
    const row = mkRow('row-1', 'Commission: 5.00% → 5.50%');
    const { container } = render(
      <CoefficientHistoryList
        rows={[row]}
        hasMore={false}
        nextCursorEncoded={null}
        currentCursor={null}
        adminSegment="my-seg"
        lang="fr"
      />,
    );
    expect(container.textContent).toContain('Commission: 5.00% → 5.50%');
    expect(container.textContent).toContain('Marie Dupont');
  });

  it('trigger button label toggles between viewDetail and hideDetail when row expands/collapses', () => {
    const row = mkRow('row-1', 'Change 1');
    const { container } = render(
      <CoefficientHistoryList
        rows={[row]}
        hasMore={false}
        nextCursorEncoded={null}
        currentCursor={null}
        adminSegment="my-seg"
        lang="fr"
      />,
    );
    const trigger = within(container).getByRole('button', {
      name: /Voir le détail/,
    });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(trigger);
    // Same trigger element now reports the "hide" label
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.textContent).toContain('Masquer le détail');
  });
});
