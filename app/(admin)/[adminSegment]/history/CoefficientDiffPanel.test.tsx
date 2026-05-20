/**
 * Plan 14-04 Task 1 — CoefficientDiffPanel tests (RED → GREEN).
 *
 * 8 test cases per PLAN.md `<behavior>` block:
 *   T1: full mode — role=region + 2 column headers (AVANT / APRÈS).
 *   T2: changed-cell highlight — data-changed="true" + rgba(224, 133, 48 bg.
 *   T3: seed row (beforeJson=null) — AVANT header "(aucun)" + AVANT cells "—".
 *   T4: condensed mode — single-column rows with `before → after` arrow.
 *   T5: close button + Escape only in full mode (condensed has NO close).
 *   T6: summary line in italic in both modes.
 *   T7: i18n parity is enforced by the compile-time `_EnHasAllFrKeys` proof
 *       (asserted at module-import time — if the dictionary is missing keys,
 *       the file fails to typecheck and this file fails to import).
 *   T8: D-30 admin-only exception — diff panel DOES render commission_pct
 *       values in both AVANT and APRÈS cells.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/react';

vi.mock('server-only', () => ({}));

import { CoefficientDiffPanel } from './CoefficientDiffPanel';
import type { CoefficientHistoryListRow } from '@/lib/db/queries/coefficient-history';
import type { GlobalParamsSnapshot } from '@/lib/admin/coefficient-diff';

afterEach(() => cleanup());

const BEFORE_SNAPSHOT: GlobalParamsSnapshot = {
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

const AFTER_SNAPSHOT: GlobalParamsSnapshot = {
  commissionPct: '5.50', // CHANGED
  maxAmount: '50000.00', // unchanged
  validityDays: 30, // unchanged
  coefficients: {
    t1: { '36': '2.2500', '48': '2.5500', '60': '2.8500' },
    t2: { '36': '2.0500', '48': '2.9000', '60': '2.6500' }, // t2/48 CHANGED 2.85 → 2.90
    t3: { '36': '1.8500', '48': '2.1500', '60': '2.4500' },
    t4: { '36': '1.6500', '48': '1.9500', '60': '2.2500' },
  },
};

const MOCK_ROW: CoefficientHistoryListRow = {
  id: 'hist-1',
  changedAt: new Date('2026-05-12T10:00:00Z'),
  changedByUserId: 'user-1',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeJson: BEFORE_SNAPSHOT as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  afterJson: AFTER_SNAPSHOT as any,
  summary: 'Commission: 5.00% → 5.50%; T2/48m: 2.8500 → 2.9000',
  createdByDisplay: 'Marie Dupont',
};

const SEED_ROW: CoefficientHistoryListRow = {
  id: 'hist-seed',
  changedAt: new Date('2026-04-01T08:00:00Z'),
  changedByUserId: null,
  beforeJson: null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  afterJson: AFTER_SNAPSHOT as any,
  summary: 'Configuration initiale',
  createdByDisplay: null,
};

describe('CoefficientDiffPanel', () => {
  it('T1 (full mode): renders role="region" with AVANT + APRÈS headers', () => {
    const { container } = render(
      <CoefficientDiffPanel
        row={MOCK_ROW}
        mode="full"
        lang="fr"
        onClose={() => {}}
      />,
    );
    const region = container.querySelector('[role="region"]');
    expect(region).not.toBeNull();
    expect(region!.textContent).toContain('AVANT');
    expect(region!.textContent).toContain('APRÈS');
  });

  it('T2 (changed-cell highlight): commission_pct after value has data-changed="true" + gold-tint bg', () => {
    const { container } = render(
      <CoefficientDiffPanel
        row={MOCK_ROW}
        mode="full"
        lang="fr"
        onClose={() => {}}
      />,
    );
    const changedCells = container.querySelectorAll('[data-changed="true"]');
    expect(changedCells.length).toBeGreaterThan(0);
    // At least one changed cell has the gold-10% bg in its inline style
    const hasGoldBg = Array.from(changedCells).some((el) => {
      const style = (el as HTMLElement).getAttribute('style') ?? '';
      return /rgba\(224,\s*133,\s*48/.test(style);
    });
    expect(hasGoldBg).toBe(true);

    // And an unchanged cell exists with data-changed="false"
    const unchangedCells = container.querySelectorAll('[data-changed="false"]');
    expect(unchangedCells.length).toBeGreaterThan(0);
  });

  it('T3 (seed row, full mode): AVANT header becomes "(aucun)" and AVANT cells render em-dash', () => {
    const { container } = render(
      <CoefficientDiffPanel
        row={SEED_ROW}
        mode="full"
        lang="fr"
        onClose={() => {}}
      />,
    );
    expect(container.textContent).toContain('(aucun)');
    // Em-dash should appear in AVANT cells (U+2014). Multiple times because all 15 paths render em-dash.
    const dashCount = (container.textContent?.match(/—/g) || []).length;
    expect(dashCount).toBeGreaterThanOrEqual(15);
  });

  it('T4 (condensed mode): single-column rows render `before → after` arrow pattern', () => {
    const { container } = render(
      <CoefficientDiffPanel row={MOCK_ROW} mode="condensed" lang="fr" />,
    );
    // The arrow glyph U+2192 appears for every row
    expect(container.textContent).toContain('→');
    // Condensed mode renders the "diff-row-condensed" class wrappers
    const condensedRows = container.querySelectorAll('.diff-row-condensed');
    expect(condensedRows.length).toBeGreaterThan(0);
  });

  it('T5 (close button + Escape — full mode only): button calls onClose; Escape calls onClose; condensed has NO button', () => {
    const onClose = vi.fn();
    const { container, unmount } = render(
      <CoefficientDiffPanel
        row={MOCK_ROW}
        mode="full"
        lang="fr"
        onClose={onClose}
      />,
    );
    // Locate the close button via aria-label
    const closeBtn = within(container).getByLabelText('Fermer le détail');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Escape key
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
    unmount();

    // Condensed mode: NO close button
    const condensed = render(
      <CoefficientDiffPanel row={MOCK_ROW} mode="condensed" lang="fr" />,
    );
    const condensedClose = condensed.container.querySelector(
      '[aria-label="Fermer le détail"]',
    );
    expect(condensedClose).toBeNull();
  });

  it('T6 (summary line in italic): both modes render row.summary', () => {
    const full = render(
      <CoefficientDiffPanel
        row={MOCK_ROW}
        mode="full"
        lang="fr"
        onClose={() => {}}
      />,
    );
    expect(full.container.textContent).toContain(MOCK_ROW.summary);
    full.unmount();

    const condensed = render(
      <CoefficientDiffPanel row={MOCK_ROW} mode="condensed" lang="fr" />,
    );
    expect(condensed.container.textContent).toContain(MOCK_ROW.summary);
  });

  it('T7 (i18n parity): the module imports cleanly (compile-time _EnHasAllFrKeys proof guards this)', async () => {
    const mod = await import('@/lib/i18n/dictionaries');
    // sanity: all 10 NEW keys exist in BOTH dictionaries
    const KEYS = [
      'coefficients.history.title',
      'coefficients.history.aria.label',
      'coefficients.history.viewAll',
      'coefficients.history.empty',
      'history.diff.before',
      'history.diff.after',
      'history.diff.before.none',
      'history.diff.close',
      'history.diff.close.aria',
      'history.diff.panel.aria.label',
    ] as const;
    for (const k of KEYS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((mod.dictionaries.fr as any)[k]).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((mod.dictionaries.en as any)[k]).toBeDefined();
    }
  });

  it('T8 (D-30 admin-only exception): diff panel DOES render commission_pct values (5.00% and 5.50%)', () => {
    const { container } = render(
      <CoefficientDiffPanel
        row={MOCK_ROW}
        mode="full"
        lang="fr"
        onClose={() => {}}
      />,
    );
    // Both before (5.00%) and after (5.50%) commission values appear
    expect(container.textContent).toContain('5.00%');
    expect(container.textContent).toContain('5.50%');
  });
});
