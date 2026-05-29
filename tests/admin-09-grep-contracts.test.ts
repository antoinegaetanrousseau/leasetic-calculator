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
import type { PartnerRow } from '@/lib/db/queries/partners';
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

// Phase 18 Plan 02 — Admin Home now Promise.alls 5 DB queries on render.
// renderToString() in the ADMIN-09 gate runs the server component WITHOUT a
// live DB connection, so each helper must be stubbed. The mocks all return
// values that exercise the FULL render path (5 stat values + 5 activity
// rows) — maximizing the surface scanned by the grep contract.
vi.mock('@/lib/auth/require', () => ({
  requireAdmin: vi.fn(async () => ({ session: { user: { id: 'admin-1' } } })),
}));
vi.mock('@/lib/db/queries/partner-aggregates', () => ({
  getActivePartnerCount: vi.fn(async () => 7),
  getTotalPartnerAccountCount: vi.fn(async () => 9),
}));
vi.mock('@/lib/db/queries/proposal-aggregates', () => ({
  getMonthlyProposalCountAll: vi.fn(async () => 42),
}));
vi.mock('@/lib/db/queries/admin-activity', () => ({
  getRecentAdminActivity: vi.fn(async () => [
    {
      id: 'ch-1',
      source: 'coefficient_history' as const,
      actorName: 'Antoine R.',
      sentenceKey: 'admin.home.activity.sentence.coefficientModified',
      sentenceArgs: ['Antoine R.'],
      timestamp: new Date('2026-05-23T10:00:00Z'),
    },
    {
      id: 'ps-1',
      source: 'partner_status' as const,
      actorName: 'Admin',
      sentenceKey: 'admin.home.activity.sentence.partnerActivated',
      sentenceArgs: ['Marie Dupont'],
      timestamp: new Date('2026-05-22T10:00:00Z'),
    },
  ]),
}));
vi.mock('@/lib/db/queries/coefficient-history', () => ({
  listCoefficientHistory: vi.fn(async () => ({
    rows: [
      {
        id: 'row-1',
        changedAt: new Date('2026-05-20T10:00:00Z'),
        changedByUserId: 'admin-1',
        beforeJson: {},
        afterJson: {},
        summary: 'Update',
        createdByDisplay: 'Antoine R.',
      },
    ],
    hasMore: false,
    nextCursor: null,
  })),
}));

// Test file lives at tests/; app/ is the sibling at repo root. Use relative paths
// because the @/* tsconfig alias maps only to src/* (the app/ directory is not aliased).
// Phase 18 Plan 03 D-14 — Surface 1 now imports PartnersList (renamed from
// AccountsList) and uses the new PartnerRow shape from queries/partners.
import { PartnersList } from '../app/(admin)/[adminSegment]/partners/PartnersList';
import { CreatePartnerForm } from '../app/(admin)/[adminSegment]/partners/new/CreatePartnerForm';
import AdminHomePage from '../app/(admin)/[adminSegment]/page';
import { CoefficientHistoryList } from '../app/(admin)/[adminSegment]/history/CoefficientHistoryList';

// ── Fixtures (small / deterministic / no commission values) ─────────────────


/** Phase 18 Plan 03 D-14 — PartnerRow fixture for Surface 1 (post-rename PartnersList consumer). */
function makePartnerRow(overrides: Partial<PartnerRow> = {}): PartnerRow {
  return {
    id: 'p-1',
    email: 'alice@example.com',
    name: 'Alice Example',
    status: 'active',
    createdAt: new Date('2026-04-01T12:00:00Z'),
    lastActivityAt: new Date('2026-05-15T10:00:00Z'),
    // Phase 22 Plan 03: partnerType added to PartnerRow (PTYPE-01 D-07).
    partnerType: 'Partenaire',
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
  describe('Surface 1: partners list (post Plan 18-03 D-14 PartnersList rename + Figma 42:46 6-col table)', () => {
    it('renders ZERO commission strings (active partner row)', () => {
      const html = renderToString(
        createElement(PartnersList, {
          rows: [makePartnerRow()],
          nextCursor: null,
          lang: 'fr',
          adminSegment: 'admin-secret',
        }),
      );
      assertNoCommissionLeakage(html, 'partners list (active)');
    });

    it('renders ZERO commission strings (invited partner row — gold chip variant)', () => {
      const html = renderToString(
        createElement(PartnersList, {
          rows: [makePartnerRow({ id: 'p-invited', status: 'invited' })],
          nextCursor: null,
          lang: 'fr',
          adminSegment: 'admin-secret',
        }),
      );
      assertNoCommissionLeakage(html, 'partners list (invited variant)');
    });

    it('renders ZERO commission strings (inactive/disabled partner row)', () => {
      const html = renderToString(
        createElement(PartnersList, {
          rows: [makePartnerRow({ id: 'p-disabled', status: 'inactive' })],
          nextCursor: null,
          lang: 'fr',
          adminSegment: 'admin-secret',
        }),
      );
      assertNoCommissionLeakage(html, 'partners list (inactive variant)');
    });

    it('renders ZERO commission strings (D-13 empty state — pre-first-partner)', () => {
      const html = renderToString(
        createElement(PartnersList, {
          rows: [],
          nextCursor: null,
          lang: 'fr',
          adminSegment: 'admin-secret',
        }),
      );
      assertNoCommissionLeakage(html, 'partners list (empty state)');
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

// ── Gate 10: Phase 19 Plan 01 — parser-based ExcelJS commission scan ─────────
// This gate differs from gates 1-9: instead of grepping React-rendered HTML,
// it calls generateProposalsXlsx directly and walks every cell in the real
// ExcelJS workbook, asserting /commission/i matches zero cells, headers, or
// sheet names. The XlsxExportRow type is the ADMIN-09 boundary — it has no
// commission-bearing field, making any leakage a type error upstream.
// (D-05 / EXPORT-02 / 19-01-PLAN.md Task 3)

describe('Gate 10: XLSX export — /commission/i absent in all cells, headers, sheet names', () => {
  it('generates a workbook with ZERO /commission/i occurrences anywhere', async () => {
    const { generateProposalsXlsx } = await import('../src/lib/xlsx/render');
    // XlsxExportRow type is the ADMIN-09 boundary — no commission-bearing field exists.
    const fixtureRow = {
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

    const buf = await generateProposalsXlsx({ rows: [fixtureRow], locale: 'fr' });
    expect(buf).toBeInstanceOf(Buffer);

    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    // ExcelJS xlsx.load() expects the older unparameterized Buffer type.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await wb.xlsx.load(buf as any);

    for (const sheet of wb.worksheets) {
      expect(sheet.name, `Sheet name must not match /commission/i`).not.toMatch(/commission/i);

      sheet.eachRow((row) => {
        row.eachCell({ includeEmpty: false }, (cell) => {
          const text = String(cell.value ?? '');
          expect(text, `Cell value "${text}" must not match /commission/i`).not.toMatch(/commission/i);
        });
      });
    }
  });
});

// ── Gate 11: Phase 19 Plan 02 — LcReferencesList all 4 status variants ───────
// LcReferenceRow has no commission-bearing field (ADMIN-09 invariant).
// This gate renders all 4 DisplayStatus variants and asserts zero commission leakage.

describe('Gate 11: LcReferencesList — all 4 status variants, ZERO commission leakage', () => {
  it('renders active + draft + expired + deleted rows with ZERO /commission_pct/ or /_pct/ tokens', async () => {
    const { LcReferencesList } = await import('../app/(admin)/[adminSegment]/lc-references/_components/LcReferencesList');
    const statuses = ['active', 'draft', 'expired', 'deleted'] as const;
    for (const displayStatus of statuses) {
      const html = renderToString(
        createElement(LcReferencesList, {
          rows: [
            {
              id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
              lcRef: 'LC-2026-001',
              partnerName: 'Acme Corp',
              clientName: 'Jean Dupont',
              amountHt: 15000,
              displayStatus,
              createdAt: new Date('2026-04-12T10:00:00Z'),
            },
          ],
          nextCursor: null,
          lang: 'fr',
          adminSegment: 'admin-secret',
          currentQ: '',
        }),
      );
      assertNoCommissionLeakage(html, `LcReferencesList (displayStatus=${displayStatus})`);
    }
  });
});

// ── Gate 12: Phase 19 Plan 02 — LcReferencesList empty states ────────────────
// Both firstRun and search-empty states must have zero commission leakage.

describe('Gate 12: LcReferencesList — empty states, ZERO commission leakage', () => {
  it('firstRun empty state (no rows, no search) renders ZERO commission tokens', async () => {
    const { LcReferencesList } = await import('../app/(admin)/[adminSegment]/lc-references/_components/LcReferencesList');
    const html = renderToString(
      createElement(LcReferencesList, {
        rows: [],
        nextCursor: null,
        lang: 'fr',
        adminSegment: 'admin-secret',
        currentQ: '',
      }),
    );
    assertNoCommissionLeakage(html, 'LcReferencesList (firstRun empty state)');
  });

  it('search-empty state (no rows, with q) renders ZERO commission tokens', async () => {
    const { LcReferencesList } = await import('../app/(admin)/[adminSegment]/lc-references/_components/LcReferencesList');
    const html = renderToString(
      createElement(LcReferencesList, {
        rows: [],
        nextCursor: null,
        lang: 'fr',
        adminSegment: 'admin-secret',
        currentQ: 'acme',
      }),
    );
    assertNoCommissionLeakage(html, 'LcReferencesList (search-empty state)');
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
