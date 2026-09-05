# Phase 19: New Capabilities — Pattern Map

**Mapped:** 2026-05-25
**Files analyzed:** 13 new/modified files + 6 modified files
**Analogs found:** 19 / 19

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/xlsx/render.ts` | server-only adapter | transform (in-memory) | `src/lib/pdf/render.ts` | exact |
| `src/lib/xlsx/types.ts` | type definition | — | `src/lib/api/proposals/list.ts` (DTO types) | role-match |
| `src/lib/xlsx/render.test.ts` | test | — | `__pdf-fixtures__/render-fixtures.test.ts` (pattern) | role-match |
| `app/(authed)/proposals/_actions/exportProposals.ts` | Server Action | request-response (binary) | `app/(authed)/proposals/new/_actions/saveAsDraft.action.ts` | role-match + shape from CONTEXT.md D-03 |
| `app/(authed)/proposals/_actions/exportProposals.test.ts` | test | — | `app/(authed)/proposals/new/verification/FinalizeButton.test.tsx` | role-match |
| `app/(authed)/proposals/_components/ExportButton.tsx` | client component | request-response | `app/(authed)/proposals/new/verification/FinalizeButton.tsx` | exact |
| `app/(authed)/proposals/_components/ExportButton.test.tsx` | test | — | `app/(authed)/proposals/new/verification/FinalizeButton.test.tsx` | role-match |
| `app/(admin)/[adminSegment]/lc-references/page.tsx` | SSR route | request-response | `app/(admin)/[adminSegment]/partners/page.tsx` (via page.tsx analog) | exact |
| `app/(admin)/[adminSegment]/lc-references/page.test.tsx` | test | — | `app/(admin)/[adminSegment]/page.test.tsx` | role-match |
| `app/(admin)/[adminSegment]/lc-references/_components/LcReferencesList.tsx` | server component (table) | CRUD + cursor | `app/(admin)/[adminSegment]/partners/PartnersList.tsx` | exact |
| `app/(admin)/[adminSegment]/lc-references/_components/LcReferencesList.test.tsx` | test | — | `tests/admin-09-grep-contracts.test.ts` | role-match |
| `src/lib/db/queries/lc-references.ts` | DB query helper | CRUD + cursor | `src/lib/db/queries/proposal-aggregates.ts` | role-match |
| `eslint.config.mjs` (MODIFY) | config | — | `eslint.config.mjs` lines 77-81, 130-141 | exact (self-reference) |
| `tests/admin-09-grep-contracts.test.ts` (MODIFY) | integration test | — | existing gates 1-9 in same file | exact |
| `app/(authed)/proposals/page.tsx` (MODIFY) | SSR route | request-response | itself (self-modify) | exact |
| `app/(admin)/[adminSegment]/page.tsx` (MODIFY) | SSR route | — | itself (self-modify) | exact |
| `src/lib/api/proposals/list.ts` (MODIFY) | service | CRUD | itself (self-modify) | exact |
| `src/lib/i18n/dictionaries.ts` (MODIFY) | config/dictionary | — | existing FR+EN key structure in same file | exact |
| `src/components/ui/AdminNavCard.tsx` (MODIFY) | UI component | — | itself (self-modify) | exact |

---

## Pattern Assignments

---

### `src/lib/xlsx/render.ts` (server-only adapter, transform)

**Analog:** `src/lib/pdf/render.ts`

**Imports pattern** (lines 1-6):
```typescript
import 'server-only';
import { createHash } from 'node:crypto';
import { inflateRawSync, inflateSync } from 'node:zlib';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import React, { type ReactElement } from 'react';
import { ProposalDocument, type ProposalDocumentProps } from './document';
```

Copy the structure exactly — `import 'server-only'` is always line 1. Swap `@react-pdf/renderer` for `exceljs` (which must only be imported here, inside `src/lib/xlsx/**`, per the new ESLint guard D-02).

**Module-level JSDoc pattern** (lines 8-36 of pdf/render.ts as template):
```typescript
/**
 * Phase 19 Plan 01 — XLSX adapter wrapping exceljs Workbook generation.
 *
 * (a) PITFALLS §9.x — `import 'server-only'` line 1; exceljs may ONLY be
 *     imported from this directory (eslint.config.mjs no-restricted-imports,
 *     mirrors @react-pdf/renderer → src/lib/pdf/** guard, D-02).
 * (b) D-03 — consumed by exportProposalsAction which returns a binary Response.
 * (c) D-09 — locale-aware column headers + date/currency formatting.
 * (d) D-05 — EXPORT-02 gate: generateProposalsXlsx MUST NOT write commission_pct
 *     or any commission value to any cell/header/sheet name.
 */
```

**Core adapter pattern** (pdf/render.ts lines 90-104 as template shape):
```typescript
export async function generateProposalsXlsx(
  args: GenerateProposalsXlsxArgs,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Propositions');
  // freeze header row (D-09 Claude discretion)
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  // column definitions with fixed widths (19-UI-SPEC §XLSX Cell Formatting)
  sheet.columns = [ /* ... per UI-SPEC column width table */ ];
  // populate rows ...
  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}
```

**Key differences from pdf analog:**
- No SHA-256 / contentHash (XLSX is ephemeral per D-03 — never stored).
- No `React.createElement` — exceljs is a pure Node API.
- Return type is `Promise<Buffer>` not `Promise<RenderProposalPdfResult>`.

---

### `src/lib/xlsx/types.ts` (type definitions)

**Analog:** `src/lib/api/proposals/list.ts` lines 8-82 (DTO + params interfaces)

**Pattern:**
```typescript
/**
 * Phase 19 Plan 01 — XLSX adapter type definitions.
 * Pure type file — no 'server-only', no runtime imports.
 */

export interface XlsxExportRow {
  lcRef: string;
  clientName: string;
  projectName: string;
  amountHt: number;      // raw numeric (Excel currency cell)
  durationMonths: number;
  monthlyRent: number;   // raw numeric (Excel currency cell)
  coefficient: string;   // percent string e.g. "3.69%"
  status: string;        // i18n-resolved e.g. "Actif"
  createdAt: Date | null;
  expiresAt: Date | null;
}

export interface GenerateProposalsXlsxArgs {
  rows: XlsxExportRow[];
  locale: 'fr' | 'en';
}
```

Follow the DTO pattern: types are separated from runtime code, no directives, PascalCase interfaces with `*Args` / `*Row` suffixes.

---

### `app/(authed)/proposals/_actions/exportProposals.ts` (Server Action, request-response binary)

**Analog:** `app/(authed)/proposals/new/_actions/saveAsDraft.action.ts`

**Imports + directive pattern** (saveAsDraft.action.ts lines 1, 25-28):
```typescript
'use server';
/**
 * Phase 19 Plan 01 — XLSX export Server Action (D-03).
 *
 * (a) requireUser() FIRST — PITFALLS §7.3 auth-first ordering invariant.
 * (b) D-08 — reads archived + q params; runs unbounded export query
 *     (no cursor, limit = MAX_EXPORT_ROWS).
 * (c) D-04 — no audit_log entry; export is a read operation.
 * (d) D-09 — locale from session.user.locale for column headers + dates.
 */
import { requireUser } from '@/lib/auth/require';
import { buildExportQuery } from '@/lib/api/proposals/list';  // unbounded variant
import { generateProposalsXlsx } from '@/lib/xlsx/render';
```

**Server Action signature + auth-first + binary Response** (shape from CONTEXT.md D-03 specifics):
```typescript
export async function exportProposalsAction({
  archived,
  q,
}: {
  archived?: boolean;
  q?: string;
}): Promise<Response> {
  // PITFALLS §7.3: requireUser FIRST.
  const { session } = await requireUser();
  const rows = await buildExportQuery({
    userId: session.user.id,
    archived,
    q,
    limit: MAX_EXPORT_ROWS,
  });
  const buf = await generateProposalsXlsx({
    rows,
    locale: (session.user as { locale?: string }).locale as 'fr' | 'en' ?? 'fr',
  });
  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="propositions-${todayIso()}.xlsx"`,
    },
  });
}
```

Note: No `'use client'` (this is `'use server'`). No `redirect()`. Returns a binary `Response` — Next.js 16 Server Action binary Response support (verify via context7 docs if needed during execution).

---

### `app/(authed)/proposals/_components/ExportButton.tsx` (client component, stateful button)

**Analog:** `app/(authed)/proposals/new/verification/FinalizeButton.tsx`

**Directive + imports pattern** (FinalizeButton.tsx lines 1-43):
```typescript
'use client';

/**
 * Phase 19 Plan 01 — ExportButton (D-06, D-07, D-10).
 *
 * 3-state machine: default → loading → default (success/error).
 * Disabled when resultCount === 0 (SSR-derived, D-10).
 * Toast feedback via sonner (D-07).
 */

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { t, type Lang } from '@/lib/i18n/dictionaries';
import { exportProposalsAction } from '../_actions/exportProposals';
```

**State machine + handler pattern** (FinalizeButton.tsx lines 65-95 as template):
```typescript
export function ExportButton({ resultCount, archived, q, lang }: ExportButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await exportProposalsAction({ archived, q });
      toast.success(t('proposals.export.toast.success', lang));
    } catch {
      toast.error(t('proposals.export.toast.error', lang));
    } finally {
      setIsLoading(false);  // always re-enable (unlike FinalizeButton which stays disabled on success)
    }
  };

  const isDisabled = resultCount === 0 || isLoading;

  return (
    <button
      className="btn-out"
      onClick={handleExport}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      title={resultCount === 0 ? t('proposals.export.disabled.tooltip', lang) : undefined}
    >
      {isLoading && (
        <Loader2
          size={14}
          strokeWidth={2}
          style={{ color: 'var(--teal)' }}
          aria-hidden={true}
          className="animate-spin"
        />
      )}
      <span>{isLoading ? t('proposals.export.loading', lang) : t('proposals.export.cta', lang)}</span>
    </button>
  );
}
```

**Key differences from FinalizeButton:**
- No `useRouter` (no redirect — browser handles file download via Response headers).
- `finally { setIsLoading(false) }` always resets (FinalizeButton intentionally keeps `isSubmitting=true` during redirect window; export has no redirect).
- Uses `.btn-out` class (secondary outline) not `.btn-green` (primary teal fill).
- `Loader2` with `animate-spin` Tailwind class instead of WizardActionBar spinner.
- Props: `{ resultCount: number; archived: boolean; q: string; lang: Lang }`.

---

### `app/(admin)/[adminSegment]/lc-references/page.tsx` (SSR route, admin-gated)

**Analog:** `app/(admin)/[adminSegment]/page.tsx`

**Imports + dynamic export + auth-first pattern** (admin page.tsx lines 1-26, 58-62):
```typescript
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { PageHero } from '@/components/ui/PageHero';
import { LcReferencesList } from './_components/LcReferencesList';
import { listLcReferences } from '@/lib/db/queries/lc-references';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Références LC — Leasétic Matrice',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ adminSegment: string }>;
  searchParams: Promise<{ q?: string; cursor?: string }>;
}
```

**SSR body pattern** (admin page.tsx lines 58-62 as template):
```typescript
export default async function LcReferencesPage({ params, searchParams }: PageProps) {
  const { adminSegment } = await params;    // PITFALL §1.1
  await requireAdmin();                      // AUTH-15 independent check
  const lang = await getCurrentLang();
  const sp = await searchParams;
  const q = sp.q ?? '';
  const cursor = sp.cursor ?? null;

  const { rows, hasMore, nextCursor } = await listLcReferences({ q, cursorEncoded: cursor });

  return (
    <div>
      <PageHero
        eyebrow={t('admin.home.eyebrow', lang)}
        title={t('admin.lcReferences.title', lang)}
        subtitle={t('admin.lcReferences.subtitle', lang)}
      />
      <LcReferencesList
        rows={rows}
        nextCursor={nextCursor}
        lang={lang}
        adminSegment={adminSegment}
        currentQ={q}
      />
    </div>
  );
}
```

Note: No `actions` prop on PageHero (LC dashboard is read-only per D-13). No `adminSegment` parameter used in `requireAdmin()` — the layout already gates the URL segment; `requireAdmin()` here is defense-in-depth per AUTH-15.

---

### `app/(admin)/[adminSegment]/lc-references/_components/LcReferencesList.tsx` (server component, styled table)

**Analog:** `app/(admin)/[adminSegment]/partners/PartnersList.tsx` (entire file, 277 lines)

**Module JSDoc + imports** (PartnersList.tsx lines 1-26):
```typescript
/**
 * Phase 19 Plan 02 Task 1 — LcReferencesList (D-17, D-13, D-16).
 *
 * Mirrors PartnersList.tsx table chrome exactly (TH_BASE_STYLE / TD_BASE_STYLE
 * constants). 6 columns: Référence | Partenaire | Client | Montant HT | Statut | Créée le.
 * Read-only rows — no overflow menu, no link wrappers (D-13, ADMIN-FUT-01 deferred).
 * Cursor pagination reuses Phase 18 nextCursor prop + Link pattern (D-16).
 *
 * ADMIN-09: LcReferenceRow shape has no commission_pct field. deriveDisplayStatus
 * is called per-row; only the bounded DisplayStatus union ("active"/"draft"/
 * "expired"/"deleted") reaches the render layer.
 */
import React from 'react';
import Link from 'next/link';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { formatDate, formatCurrency } from '@/lib/i18n/format';
import { StatusChip } from '@/components/ui/StatusChip';
import type { LcReferenceRow } from '@/lib/db/queries/lc-references';
```

**TH/TD style constants** (copy verbatim from PartnersList.tsx lines 41-59 — identical per UI-SPEC):
```typescript
const TH_BASE_STYLE: React.CSSProperties = {
  fontSize: '11.2px',
  fontWeight: 700,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  textAlign: 'left',
  padding: '12px 20px',
  borderBottom: '1px solid var(--border)',
  background: 'transparent',
};

const TD_BASE_STYLE: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: '1px solid var(--border)',
  fontSize: 13,
  color: 'var(--muted)',
  verticalAlign: 'middle',
};
```

**Props interface pattern** (PartnersList.tsx lines 28-39):
```typescript
export interface LcReferencesListProps {
  rows: LcReferenceRow[];
  nextCursor: string | null;
  lang: Lang;
  adminSegment: string;
  currentQ?: string;
}
```

**Empty-state pattern** (PartnersList.tsx lines 96-147 as template — adapt copy):
```typescript
if (rows.length === 0) {
  const isSearchEmpty = Boolean(currentQ && currentQ.length > 0);
  if (isSearchEmpty) {
    return (
      <section className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
        <p style={{ color: 'var(--muted)', fontSize: '14.5px', margin: 0 }}>
          {t('admin.lcReferences.empty.search', lang)}
        </p>
        <p style={{ marginTop: 16 }}>
          <Link
            href={`/${adminSegment}/lc-references`}
            style={{ color: 'var(--teal)', fontSize: '12.5px', fontWeight: 500, textDecoration: 'none' }}
          >
            {t('admin.lcReferences.empty.search.clear', lang)}
          </Link>
        </p>
      </section>
    );
  }
  return (
    <section className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
      <p style={{ color: 'var(--muted)', fontSize: '14.5px', margin: 0 }}>
        {t('admin.lcReferences.empty.firstRun', lang)}
      </p>
    </section>
  );
}
```

**Table chrome pattern** (PartnersList.tsx lines 149-275 as template):
```typescript
return (
  <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
      <thead>
        <tr>
          <th scope="col" style={{ ...TH_BASE_STYLE, width: 160 }}>
            {t('admin.lcReferences.col.reference', lang)}
          </th>
          {/* ... remaining 5 columns ... */}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => {
          const lastBorder = idx === rows.length - 1 ? 'none' : '1px solid var(--border)';
          return (
            <tr key={row.id}>
              {/* Col 1 — Référence: monospace font per UI-SPEC */}
              <td style={{ ...TD_BASE_STYLE, borderBottom: lastBorder,
                fontFamily: "ui-monospace, 'Courier New', monospace",
                fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                {row.lcRef}
              </td>
              {/* Col 5 — Statut: StatusChip, same as PartnersList col 5 */}
              <td style={{ ...TD_BASE_STYLE, borderBottom: lastBorder }}>
                <StatusChip variant={displayStatusToChipVariant(row.displayStatus)}
                            label={t(`chip.${row.displayStatus}`, lang)} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    {/* Cursor pagination — copy PartnersList.tsx lines 257-274 */}
    {nextCursor && (
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 20px',
                    borderTop: '1px solid var(--border)' }}>
        <Link
          href={`/${adminSegment}/lc-references?cursor=${encodeURIComponent(nextCursor)}${currentQ ? `&q=${encodeURIComponent(currentQ)}` : ''}`}
          style={{ color: 'var(--teal)', fontWeight: 500, fontSize: 14, textDecoration: 'none' }}
        >
          {t('proposal.list.load.more', lang)}
        </Link>
      </div>
    )}
  </section>
);
```

**Key differences from PartnersList:**
- No overflow menu column (LC dashboard is read-only per D-13, no `PartnerRowActions`).
- No `<Link>` wrapper on rows (D-13 — no row-click affordance).
- Monospace font on Référence column cell (`fontFamily: "ui-monospace, 'Courier New', monospace"`).
- StatusChip uses `displayStatus` variants (`active`/`draft`/`expired`/`deleted`) not partner-status variants (`active`/`invited`/`disabled`).
- Column 4 (`Montant HT`) uses `formatCurrency(row.amountHt, lang)` and is right-aligned.
- Empty-state first-run has no CTA button (no first-run invite action exists for LC dashboard).

---

### `src/lib/db/queries/lc-references.ts` (DB query helper, CRUD + cursor)

**Analog:** `src/lib/db/queries/proposal-aggregates.ts`

**Imports + server-only pattern** (proposal-aggregates.ts lines 1-3):
```typescript
import 'server-only';
import { and, isNotNull, or, ilike, desc, lt } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
```

**Module JSDoc pattern** (proposal-aggregates.ts lines 6-42 as template):
```typescript
/**
 * Phase 19 Plan 02 — Cross-partner LC reference query helpers.
 *
 * (a) T-19-02-01: no userId scoping — admin-only consumer. Upstream
 *     gate is requireAdmin() in the SSR route + layout. This helper
 *     intentionally drops per-partner userId filtering (mirrors
 *     getMonthlyProposalCountAll — the Phase 18 cross-partner aggregate).
 * (b) D-14 — search: `lc_ref ILIKE %q%` OR `users.name ILIKE %q%`
 *     OR `inputs->>'clientName' ILIKE %q%`.
 * (c) D-15 — default sort: created_at DESC.
 * (d) D-16 — cursor pagination via (created_at, id) composite key.
 * (e) D-11/D-12 — includes ALL lc_ref IS NOT NULL rows regardless of
 *     status, including soft-deleted (deletedAt IS NOT NULL) and drafts.
 */
```

**Query helper pattern** (proposal-aggregates.ts countThisMonth lines 131-147 as structural template, adapted for join + cursor):
```typescript
export interface LcReferenceRow {
  id: string;
  lcRef: string;
  partnerName: string;
  clientName: string;
  amountHt: number;
  displayStatus: DisplayStatus;
  createdAt: Date;
}

export interface ListLcReferencesParams {
  q?: string;
  cursorEncoded?: string | null;
  limit?: number;
}

export async function listLcReferences(
  params: ListLcReferencesParams,
): Promise<{ rows: LcReferenceRow[]; hasMore: boolean; nextCursor: string | null }> {
  const dbi = db();
  const limit = params.limit ?? 20;
  // cursor: (created_at, id) composite for (created_at DESC, id DESC) ordering
  const cursor = params.cursorEncoded ? decodeCursor(params.cursorEncoded) : null;
  const q = params.q?.trim() ?? '';

  const conditions = [
    isNotNull(schema.proposals.lcRef),    // only issued references (D-11)
    ...(q.length > 0 ? [or(
      ilike(schema.proposals.lcRef, `%${q}%`),
      ilike(schema.users.name, `%${q}%`),
      // inputs->>'clientName' ILIKE — use sql`` for jsonb path
    )] : []),
    ...(cursor ? [/* (created_at, id) < (cursorCreatedAt, cursorId) */] : []),
  ];
  // ... drizzle select with JOIN users ON users.id = proposals.userId
}
```

Note: Use `deriveDisplayStatus(row)` per row at the map-projection step (same as `buildListResponse` in `list.ts` lines 143-148). The raw `paramsSnapshot` (commission_pct bearing) must never appear in `LcReferenceRow`.

---

### `eslint.config.mjs` (MODIFY — add exceljs guard)

**Analog:** `eslint.config.mjs` lines 77-81 (`@react-pdf/renderer` rule) and lines 130-141 (allow-list block)

**Rule to add in the `no-restricted-imports` paths array** (after line 81 in the existing block):
```javascript
{
  name: 'exceljs',
  message:
    '`exceljs` may only be imported from src/lib/xlsx/. XLSX generation goes through src/lib/xlsx/render.ts (generateProposalsXlsx). (D-02)',
},
```

**Allow-list block to add after line 141** (mirrors the `src/lib/pdf/**` exemption at lines 130-141):
```javascript
{
  // Allow exceljs imports only inside the XLSX adapter directory.
  // All other app code must go through generateProposalsXlsx() from '@/lib/xlsx'.
  // no-restricted-syntax also off: xlsx adapter has no JSX text literals.
  files: ['src/lib/xlsx/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': 'off',
    'no-restricted-syntax': 'off',
  },
},
```

The `ignores` block on the first rule object (lines 36-42) already excludes `scripts/**` — `src/lib/xlsx/**` is NOT in the ignores, so the allow-list block is the correct approach (same as pdf).

---

### `tests/admin-09-grep-contracts.test.ts` (MODIFY — add gates 10, 11)

**Analog:** existing gates 1-9 in same file (lines 169-315)

**Mock pattern to add** (mirrors `vi.mock('@/lib/auth/require', ...)` at line 68-70):
```typescript
// Gate 10/11 require mocking the new lc-references query helper
vi.mock('@/lib/db/queries/lc-references', () => ({
  listLcReferences: vi.fn(async () => ({
    rows: [
      {
        id: 'lc-1',
        lcRef: 'LC-2026-042',
        partnerName: 'Memento Music',
        clientName: 'Dupont SARL',
        amountHt: 12000,
        displayStatus: 'active' as const,
        createdAt: new Date('2026-05-12T10:00:00Z'),
      },
    ],
    hasMore: false,
    nextCursor: null,
  })),
}));
```

**Gate 10 — XLSX byte-inspection** (D-05, from CONTEXT.md §Specifics):
```typescript
describe('Gate 10: XLSX export — commission leakage scan (EXPORT-02)', () => {
  it('generateProposalsXlsx output contains zero commission strings in any cell/header/sheet name', async () => {
    const { generateProposalsXlsx } = await import('../src/lib/xlsx/render');
    const buf = await generateProposalsXlsx({
      rows: [{
        lcRef: 'LC-2026-001',
        clientName: 'Test Client',
        projectName: 'Project A',
        amountHt: 10000,          // no commission_pct anywhere
        durationMonths: 36,
        monthlyRent: 300,
        coefficient: '3.69%',
        status: 'Actif',
        createdAt: new Date('2026-05-01T00:00:00Z'),
        expiresAt: null,
      }],
      locale: 'fr',
    });
    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    for (const sheet of wb.worksheets) {
      expect(sheet.name).not.toMatch(/commission/i);
      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          const text = String(cell.value ?? '');
          expect(text).not.toMatch(/commission/i);
        });
      });
    }
    assertNoCommissionLeakage(buf.toString('utf-8'), 'XLSX raw bytes');
  });
});
```

**Gate 11 — LC dashboard render scan** (LCDASH-02):
```typescript
import { LcReferencesList } from '../app/(admin)/[adminSegment]/lc-references/_components/LcReferencesList';

describe('Gate 11: LC dashboard — commission leakage scan (LCDASH-02)', () => {
  it('renders ZERO commission strings (active LC row)', () => {
    const html = renderToString(
      createElement(LcReferencesList, {
        rows: [{ id: 'lc-1', lcRef: 'LC-2026-042', partnerName: 'Memento Music',
                  clientName: 'Dupont SARL', amountHt: 12000,
                  displayStatus: 'active' as const, createdAt: new Date() }],
        nextCursor: null,
        lang: 'fr',
        adminSegment: 'admin-secret',
      }),
    );
    assertNoCommissionLeakage(html, 'LC dashboard (active row)');
  });

  it('renders ZERO commission strings (empty state)', () => {
    const html = renderToString(
      createElement(LcReferencesList, {
        rows: [], nextCursor: null, lang: 'fr', adminSegment: 'admin-secret',
      }),
    );
    assertNoCommissionLeakage(html, 'LC dashboard (empty state)');
  });
});
```

---

### `app/(authed)/proposals/page.tsx` (MODIFY — mount ExportButton)

**Analog:** itself (current file, lines 107-128 for the PageHero `actions` slot)

**Modification pattern** — extend the `actions` prop of `<PageHero>`:
```typescript
// Add to imports:
import { ExportButton } from './_components/ExportButton';

// Modify PageHero actions slot (current lines 107-128):
actions={
  <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
    <Link
      href="/proposals/new/parametres"
      className="btn-green"
      aria-label={t('dashboard.cta.new', lang)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
    >
      <Plus size={17} strokeWidth={1.6} aria-hidden="true" />
      <span>{t('dashboard.cta.new', lang)}</span>
    </Link>
    <ExportButton
      resultCount={initial.rows.length}  // SSR-derived count (D-10)
      archived={archived}
      q={q}
      lang={lang}
    />
  </div>
}
```

Note: `resultCount` uses `initial.rows.length` but this is cursor-page count, not total count. Planner must decide during execution whether to add a separate count query for `total` or accept page-count semantics (CONTEXT.md D-10 says "page already knows count from SSR query" — the first-page count suffices for the disabled-state heuristic; if page has results, export will too).

---

### `app/(admin)/[adminSegment]/page.tsx` (MODIFY — extend grid 3 → 4 cards)

**Analog:** itself (current file, lines 160-193)

**Grid wrapper change** (lines 162-165, from `repeat(3, 1fr)` to responsive Tailwind + inline gap):
```tsx
// BEFORE (lines 162-165):
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>

// AFTER (UI-SPEC §Surface 3 responsive grid):
<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" style={{ gap: 24, marginBottom: 32 }}>
```

**4th AdminNavCard** (add after line 192, the existing `history` card):
```tsx
// Add to imports (line 3):
import { Sliders, Users, History, Plus, Hash } from 'lucide-react';

// 4th card (after the history AdminNavCard):
<AdminNavCard
  variant="lc-references"
  title={t('admin.nav.lcReferences.title', lang)}
  description={t('admin.nav.lcReferences.description', lang)}
  href={`/${adminSegment}/lc-references`}
  icon={Hash}
  openLabel={t('admin.nav.open', lang)}
/>
```

---

### `src/components/ui/AdminNavCard.tsx` (MODIFY — add `lc-references` variant)

**Analog:** itself (current file, lines 16-32)

**Variant extension pattern** (lines 16-32):
```typescript
// BEFORE:
type Variant = 'coefficients' | 'partners' | 'history';

// AFTER:
type Variant = 'coefficients' | 'partners' | 'history' | 'lc-references';

// Add to ACCENT_BY_VARIANT (lines 28-32):
const ACCENT_BY_VARIANT: Record<Variant, { rgb: string; token: string }> = {
  coefficients: { rgb: '18, 150, 87', token: 'var(--gd)' },
  partners: { rgb: '45, 122, 140', token: 'var(--teal)' },
  history: { rgb: '17, 44, 59', token: 'var(--navy)' },
  'lc-references': { rgb: '45, 122, 140', token: 'var(--teal)' },  // teal per UI-SPEC
};
```

Note: UI-SPEC §Color mentions the executor may instead add a generic `accent` prop. If chosen, that refactor changes the approach. The variant-union extension is the minimal-change path; the planner should prefer it unless the file has other reasons to refactor.

---

### `src/lib/api/proposals/list.ts` (MODIFY — add unbounded export query path)

**Analog:** itself (current file, lines 94-153 — `buildListResponse`)

**Unbounded export query** — add a parallel helper rather than modifying `buildListResponse` (preserves cursor + limit path for SSR render):
```typescript
export const MAX_EXPORT_ROWS = 10000;

/**
 * Phase 19 D-08 — unbounded export query for generateProposalsXlsx.
 * Mirrors buildListResponse but without cursor pagination and with
 * MAX_EXPORT_ROWS limit as a safety ceiling.
 *
 * T-19-01-01: userId is from requireUser() session in the Server Action,
 * never from request params. Same IDOR discipline as buildListResponse.
 */
export async function buildExportQuery(args: {
  userId: string;
  q?: string;
  archived?: boolean;
  limit?: number;
}): Promise<XlsxExportRow[]> {
  const q = args.q?.trim() ?? '';
  const archived = args.archived ?? false;
  const result: ListResult = q.length > 0
    ? await searchProposals({
        userId: args.userId, q, archived,
        limit: args.limit ?? MAX_EXPORT_ROWS,
        // no cursor — unbounded export
      })
    : await listProposalsByUser({
        userId: args.userId, archived,
        limit: args.limit ?? MAX_EXPORT_ROWS,
        // no cursor
      });
  // Map to XlsxExportRow — same commission-scrubbing discipline as buildListResponse
  // (paramsSnapshot bearing commission_pct MUST NOT appear in the return shape)
  return result.rows.map((row) => ({ /* ... */ }));
}
```

---

### `src/lib/i18n/dictionaries.ts` (MODIFY — add ~22 new keys)

**Analog:** itself (existing FR+EN key structure)

**Pattern to follow:** add keys under the `proposals.export.*` namespace and `admin.lcReferences.*` namespace in both `fr` and `en` branches. The `_EnHasAllFrKeys` compile-time proof (Phase 17 D-21) will fail at `tsc` if any key is added to `fr` but not `en`. Add keys in the same alphabetical/grouped order as existing keys in their namespace.

Verify-and-reuse before adding (from 19-UI-SPEC §i18n Keys Summary):
- **Reuse confirmed:** `admin.home.eyebrow`, `admin.nav.open`, `chip.active`, `chip.draft`, `chip.expired`, `chip.deleted`
- **Net-new:** all `proposals.export.*` and `admin.lcReferences.*` keys listed in UI-SPEC §i18n Keys Summary

---

## Shared Patterns

### `'use server'` + `requireUser()` / `requireAdmin()` first

**Source:** `app/(authed)/proposals/new/_actions/saveAsDraft.action.ts:1` + `app/(admin)/[adminSegment]/page.tsx:60`
**Apply to:** `exportProposals.ts` (Server Action), `lc-references/page.tsx`
```typescript
// Server Action:
'use server';
// ...
const { session } = await requireUser();  // ALWAYS first await — PITFALLS §7.3

// Admin SSR route:
export const dynamic = 'force-dynamic';
// ...
await requireAdmin();  // AUTH-15 independent of layout check
```

### `import 'server-only'` guard

**Source:** `src/lib/pdf/render.ts:1` + `src/lib/db/queries/proposal-aggregates.ts:1`
**Apply to:** `src/lib/xlsx/render.ts`, `src/lib/db/queries/lc-references.ts`
```typescript
import 'server-only';  // Line 1, always — build fails if transitively imported by a Client Component
```

### Sonner toast success/error pattern

**Source:** `app/(authed)/proposals/new/verification/FinalizeButton.tsx:85-93`
**Apply to:** `ExportButton.tsx`
```typescript
toast.success(t('proposals.export.toast.success', lang));
toast.error(t('proposals.export.toast.error', lang));
```

### i18n `t(key, lang)` — no hardcoded JSX text

**Source:** all existing components — enforced by ESLint `no-restricted-syntax` JSXText rule
**Apply to:** `ExportButton.tsx`, `LcReferencesList.tsx`
```typescript
// ALL user-facing text via t():
{t('proposals.export.cta', lang)}
{t('admin.lcReferences.col.reference', lang)}
// NEVER: <button>Exporter en XLSX</button>
```

### `formatCurrency` / `formatDate` — no zero-arg Intl

**Source:** CONVENTIONS.md + `eslint.config.mjs:118-124`
**Apply to:** `LcReferencesList.tsx` (Montant HT column + Créée le column), `src/lib/xlsx/render.ts` (date formatting)
```typescript
import { formatCurrency, formatDate } from '@/lib/i18n/format';

// In component:
{formatCurrency(row.amountHt, lang)}         // not: new Intl.NumberFormat()
{formatDate(row.createdAt, lang)}             // not: new Intl.DateTimeFormat()
```

### Module-level JSDoc with phase/decision references

**Source:** `src/lib/pdf/render.ts:39-88`, `app/(authed)/proposals/new/_actions/saveAsDraft.action.ts:2-23`
**Apply to:** all new files
```typescript
/**
 * Phase 19 Plan {N} — {purpose}.
 *
 * (a) Decision reference (D-NN).
 * (b) Security boundary reference (T-19-NN-NN or PITFALLS §N.M).
 * (c) ADMIN-09 invariant note — commission absence guarantee.
 */
```

### Drizzle `db()` lazy singleton access

**Source:** `src/lib/db/queries/proposal-aggregates.ts:133`
**Apply to:** `src/lib/db/queries/lc-references.ts`
```typescript
const dbi = db();  // singleton factory, not direct `db` — lazy to avoid next build env issues
```

---

## No Analog Found

All Phase 19 files have analogs. No files fall into this category.

The closest gap is the `exportProposals.ts` Server Action returning a binary `Response` — there is no existing Server Action in the codebase that returns `Response` (all existing actions return `void` or redirect). The binary Response shape comes from CONTEXT.md D-03 specifics, not from a codebase analog. Planner should verify Next.js 16 Server Action binary Response API surface via `mcp__context7__*` docs during execution.

---

## Metadata

**Analog search scope:** `src/lib/pdf/`, `src/lib/db/queries/`, `app/(authed)/proposals/`, `app/(admin)/[adminSegment]/`, `src/components/ui/`, `eslint.config.mjs`, `tests/`
**Files scanned:** 13 (read in full)
**Pattern extraction date:** 2026-05-25
