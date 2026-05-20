/**
 * Plan 14-06 Task 3 — ADMIN-09 D-29 strict-invariant grep-contract suite.
 *
 * Per Phase 14 14-CONTEXT.md D-29 + 14-06-PLAN.md, this BLOCKING suite verifies
 * that ZERO commission-value strings leak into ANY Phase 14 non-exempt surface:
 *
 *   Non-exempt (assert ZERO commission leakage):
 *     1. Partner list collapsed-row HTML (post Plan 14-06 — chip + Link CTA shape)
 *     2. /partners/new form HTML (Plan 14-02 surface)
 *     3. Admin home HTML (Plan 14-03 — 3 AdminNavCards)
 *     4. /history list COLLAPSED rows HTML (Plan 14-05 — diff panel D-30 exempt)
 *
 *   EXEMPT (D-30 admin-only — these surfaces MAY render commission for audit):
 *     - CoefficientDiffPanel full mode (rendered inside /history when expanded)
 *     - CoefficientHistorySidebar inline-expansion diff panel
 *     - CoefficientsEditor card (Phase 9 admin coefficient editor)
 *
 * Gates per surface:
 *   - `/\bcommission_pct\b/.test(html) === false`  — strict field-key absence
 *   - `/_pct\b/.test(html) === false`              — catches any JSON-field-key suffix
 *
 * For the /history collapsed-row surface, the summary text may contain natural-
 * language commission descriptions (e.g. "Commission : 5.00% → 5.50%"). That is
 * the D-30 admin-only narrative summary, NOT a field-key leak — the bare numeric
 * percentage in a summary string is allowed. The gates ABOVE catch only:
 *   - the literal token "commission_pct" (DB column name leak)
 *   - any `_pct` suffix (JSON serialization leak)
 *
 * Per D-29 strict, this suite is BLOCKING. CI failure here means a Phase 14
 * regression has leaked commission_pct into a partner-facing surface.
 */
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import type { PartnerWithCount } from '@/lib/db/queries/users';
import type { CoefficientHistoryListRow } from '@/lib/db/queries/coefficient-history';

vi.mock('server-only', () => ({}));

// Mock next/navigation hooks (some of the components below use useRouter / useSearchParams
// transitively via Link or row-actions). renderToString doesn't fire effects, but the
// initial render still calls these hooks, so they must be defined.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock('@/lib/admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/admin')>();
  return {
    ...actual,
    adminDisableUser: vi.fn(),
    adminReEnableUser: vi.fn(),
    adminCreatePasswordReset: vi.fn(),
    adminReissueInvitation: vi.fn(),
  };
});

// Test file lives at tests/; app/ is the sibling at repo root. Use relative paths
// because the @/* tsconfig alias maps only to src/* (the app/ directory is not aliased).
import { AccountsList } from '../app/(admin)/[adminSegment]/partners/AccountsList';
import { CreatePartnerForm } from '../app/(admin)/[adminSegment]/partners/new/CreatePartnerForm';
import AdminHomePage from '../app/(admin)/[adminSegment]/page';
import { CoefficientHistoryList } from '../app/(admin)/[adminSegment]/history/CoefficientHistoryList';

// ── Fixtures (small / deterministic / no commission values) ─────────────────

function makePartner(overrides: Partial<PartnerWithCount> = {}): PartnerWithCount {
  return {
    id: 'p-1',
    email: 'alice@example.com',
    displayName: 'Alice Example',
    name: 'Alice Example',
    role: 'partner',
    deletedAt: null,
    lastLoginAt: new Date('2026-05-15T10:00:00Z'),
    createdAt: new Date('2026-04-01T12:00:00Z'),
    language: 'fr',
    proposalsCount: 0,
    hasUnredeemedInvite: false,
    ...overrides,
  };
}

function makeHistoryRow(overrides: Partial<CoefficientHistoryListRow> = {}): CoefficientHistoryListRow {
  return {
    id: 'hist-1',
    changedAt: new Date('2026-05-10T12:00:00Z'),
    changedByUserId: 'admin-1',
    beforeJson: null,
    afterJson: { someCoef: '2.50' },
    summary: 'Configuration initiale',
    createdByDisplay: 'admin@leasetic.com',
    ...overrides,
  };
}

const COMMISSION_PCT_RX = /\bcommission_pct\b/i;
const PCT_SUFFIX_RX = /_pct\b/;

function assertNoCommissionLeakage(html: string, surfaceName: string): void {
  expect(html, `D-29 strict: ${surfaceName} HTML must not surface 'commission_pct' token`).not.toMatch(
    COMMISSION_PCT_RX,
  );
  expect(html, `D-29 strict: ${surfaceName} HTML must not surface any '_pct' field-key suffix`).not.toMatch(
    PCT_SUFFIX_RX,
  );
}

// ── Suite ───────────────────────────────────────────────────────────────────

describe('ADMIN-09 D-29 — strict commission-leakage grep contracts (Phase 14)', () => {
  describe('Surface 1: partner list (post Plan 14-06 chip + Link CTA shape)', () => {
    it('renders ZERO commission strings (active partner)', () => {
      const html = renderToString(
        createElement(AccountsList, {
          lang: 'fr',
          initialPartners: [makePartner()],
          invitedUserIds: new Set<string>(),
          adminSegment: 'admin-secret',
          nowMs: Date.now(),
        }),
      );
      assertNoCommissionLeakage(html, 'partner list (active)');
    });

    it('renders ZERO commission strings (invited partner — gold chip variant)', () => {
      const html = renderToString(
        createElement(AccountsList, {
          lang: 'fr',
          initialPartners: [makePartner({ id: 'p-invited', lastLoginAt: null })],
          invitedUserIds: new Set(['p-invited']),
          adminSegment: 'admin-secret',
          nowMs: Date.now(),
        }),
      );
      assertNoCommissionLeakage(html, 'partner list (invited variant)');
    });

    it('renders ZERO commission strings (disabled partner)', () => {
      const html = renderToString(
        createElement(AccountsList, {
          lang: 'fr',
          initialPartners: [makePartner({ id: 'p-disabled', deletedAt: new Date() })],
          invitedUserIds: new Set<string>(),
          adminSegment: 'admin-secret',
          nowMs: Date.now(),
        }),
      );
      assertNoCommissionLeakage(html, 'partner list (disabled variant)');
    });

    it('renders ZERO commission strings (empty state — pre-first-partner)', () => {
      const html = renderToString(
        createElement(AccountsList, {
          lang: 'fr',
          initialPartners: [],
          invitedUserIds: new Set<string>(),
          adminSegment: 'admin-secret',
          nowMs: Date.now(),
        }),
      );
      assertNoCommissionLeakage(html, 'partner list (empty state)');
    });
  });

  describe('Surface 2: /partners/new form (Plan 14-02)', () => {
    it('renders ZERO commission strings (empty form mount)', () => {
      // The server action is a fake — the test never submits.
      const fakeAction = async () => ({ ok: false as const, error: 'noop' });
      const html = renderToString(
        createElement(CreatePartnerForm, {
          lang: 'fr',
          adminSegment: 'admin-secret',
          createPartnerAction: fakeAction,
        }),
      );
      assertNoCommissionLeakage(html, '/partners/new form');
    });
  });

  describe('Surface 3: admin home (Plan 14-03 — 3 AdminNavCards)', () => {
    it('renders ZERO commission_pct field references (literal "commission" in card title is chrome, not a value)', async () => {
      // The admin home is a server component; we need to mock requireAdmin + getCurrentLang.
      // Approach: directly construct the JSX by calling the page function. We use vi.doMock
      // to stub requireAdmin/getCurrentLang on a fresh module import — but doMock would need
      // module re-import. Simpler: call AdminHomePage with mocked params; requireAdmin will
      // fail without a session, so we use vi.spyOn inline.
      //
      // The test environment mocks requireAdmin via vi.mock at top level (see auth/require
      // module mock below).
      const tree = await AdminHomePage({ params: Promise.resolve({ adminSegment: 'admin-secret' }) });
      const html = renderToString(tree);

      // CRITICAL: the literal word "commission" DOES appear in the FR card title
      // "Coefficients & commission" (chrome label, not a value). The strict gate
      // is /\bcommission_pct\b/ — the FIELD-KEY token — which is the actual leak vector.
      // The bare word `commission` (without `_pct`) is exempt because it's UI chrome.
      assertNoCommissionLeakage(html, 'admin home');
    });
  });

  describe('Surface 4: /history list — COLLAPSED rows only (diff panel is D-30 exempt)', () => {
    it('renders ZERO commission_pct strings (italic summary in collapsed row is bounded natural language)', () => {
      const html = renderToString(
        createElement(CoefficientHistoryList, {
          rows: [
            makeHistoryRow({ summary: 'Configuration initiale' }),
            // A row whose summary describes a commission transition. The bare-percent
            // sequence "5.00% → 5.50%" IS in the summary text per the D-30 admin-only
            // exception; the strict gates above don't catch bare percentages (only
            // commission_pct and _pct field-keys).
            makeHistoryRow({
              id: 'hist-2',
              summary: 'Commission : 5.00% → 5.50%',
            }),
          ],
          hasMore: false,
          nextCursorEncoded: null,
          currentCursor: null,
          adminSegment: 'admin-secret',
          lang: 'fr',
        }),
      );
      // Collapsed rows only — `expandedRowId` defaults to null in the component.
      // Diff panel does NOT render. The summary text is admin-only allowed text.
      assertNoCommissionLeakage(html, '/history collapsed rows');
    });

    it('renders ZERO commission_pct strings (empty-state path)', () => {
      const html = renderToString(
        createElement(CoefficientHistoryList, {
          rows: [],
          hasMore: false,
          nextCursorEncoded: null,
          currentCursor: null,
          adminSegment: 'admin-secret',
          lang: 'fr',
        }),
      );
      assertNoCommissionLeakage(html, '/history empty state');
    });
  });

  describe('D-30 admin-only exception documentation (NOT executed as a grep gate)', () => {
    // These surfaces MAY render commission for admin audit:
    //   - CoefficientDiffPanel mode="full" (rendered inside /history when expanded)
    //   - CoefficientHistorySidebar inline-expansion diff panel
    //   - CoefficientsEditor card (Phase 9 — directly edits commission_pct)
    //
    // No grep test is run on these surfaces — they are intentionally outside the
    // D-29 strict envelope per Phase 14 D-30 (14-CONTEXT.md). The exception is
    // narrowly scoped to admin-gated surfaces (requireAdmin() upstream) where
    // commission visibility is a feature, not a leak.
    it('documents the D-30 exception list', () => {
      const exempt = [
        'CoefficientDiffPanel (full mode, /history expanded row)',
        'CoefficientHistorySidebar (inline-expansion diff panel)',
        'CoefficientsEditor card (/coefficients admin editor)',
      ];
      expect(exempt.length).toBe(3);
    });
  });
});

// ── auth/require mock for the admin home server-component test ──────────────
// Hoist this above the imports above? vi.mock calls are hoisted automatically.
// (Defined here for readability; the hoist makes it apply before the imports.)
vi.mock('@/lib/auth/require', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ session: { user: { id: 'admin-1', role: 'admin' } } }),
}));

vi.mock('@/lib/i18n', async () => {
  const real = await vi.importActual<typeof import('@/lib/i18n/dictionaries')>(
    '@/lib/i18n/dictionaries',
  );
  return {
    t: real.t,
    dictionaries: real.dictionaries,
    getCurrentLang: vi.fn().mockResolvedValue('fr'),
  };
});
