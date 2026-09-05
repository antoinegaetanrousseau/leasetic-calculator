# Phase 17: Partner Surfaces — Pattern Map

**Mapped:** 2026-05-22
**Files analyzed:** 13 (3 create + 8 modify + 2 contrast/doc) — see Files Modified / Created in 17-UI-SPEC.md
**Analogs found:** 13 / 13 (100% — every file has at least one in-repo analog)

This document is the planner's per-file directive on **what existing file to copy patterns from** when writing each `<action>` block. All excerpts are verbatim from the codebase as of 2026-05-22; line numbers are stable references the planner should embed in `read_first` directives.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/(authed)/page.tsx` (REWRITE) | server-component route | request-response (SSR aggregate + render) | `app/(admin)/[adminSegment]/page.tsx` (Phase 16 PageHero adopter) + current `app/(authed)/page.tsx` (carry-forward of `requireUser` + `displayName` chain + `<DeleteJustToast>`) | **dual-analog** — chrome from admin, security/i18n boilerplate from current |
| `app/(authed)/proposals/page.tsx` (CREATE) | server-component route | request-response (SSR list) | `app/(authed)/page.tsx` (lines 38–141) — current list-bearing surface; copy `searchParams` shape, `buildListResponse` call, `nowMs`, `remountKey` pattern verbatim | **exact** (same role, same data flow) |
| `app/(authed)/proposals/_components/FilterPillRow.tsx` (CREATE) | client component (`'use client'`) | URL-driven navigation | `src/components/proposals/RecentlyDeletedToggle.tsx` (lines 1–58) — toggle-pill / URL-state pattern. **One inversion:** swap `<button onClick={router.replace}>` for `<Link href="…">` per D-11 (SSR re-render, not soft replace) | **exact** — same shape, same `searchParams.get` pattern; only the navigation primitive differs |
| `app/(authed)/proposals/_components/FilterPillRow.test.tsx` (CREATE) | colocated Vitest | render-and-assert | `src/components/ui/Stepper.test.tsx` (lines 1–40) for `cleanup` + `render` + `aria-*` assertions; `src/components/proposals/RecentlyDeletedToggle.test.tsx` (sibling, by convention) for URL-state assertions | role-match |
| `app/(authed)/proposals/page.test.tsx` (CREATE) | colocated Vitest (page-level) | mock-server-deps + render | `app/(authed)/proposals/new/verification/page.test.tsx` (lines 36–80) — full `vi.hoisted` + `vi.mock('next/navigation')` + redirect-throws pattern; reuse `buildListResponseMock` shape | **exact** (page-level test scaffolding) |
| `app/(authed)/proposals/new/parametres/page.tsx` (MODIFY repaint) | server-component route | request-response | itself + `app/(admin)/[adminSegment]/page.tsx` (PageHero adopter) — replace inline `<h1>+<p>` block (lines 178–197) with `<PageHero eyebrow=… title=… subtitle=… />`; Stepper as sibling **below** PageHero | **self+admin-home** |
| `app/(authed)/proposals/new/calcul/page.tsx` (MODIFY restructure) | server-component route | request-response | itself for compute pipeline (lines 90–172) + admin home for `<PageHero>` adoption; **new structure** for Détail/Paramètres-saisis cards via `RecapSection` (already present in file) | **self+restructure** |
| `app/(authed)/proposals/new/verification/page.tsx` (MODIFY repaint + 2 invariants) | server-component route | request-response | itself (lines 77–356) — preserve 2-column grid; **two inversions:** (1) add validity selector inside CALCUL recap, (2) thread real `lcRef` to `<PdfPreviewMock>` | **self-modify** |
| `src/lib/db/queries/proposals.ts` (MODIFY) | db query helper | CRUD | itself — `createDraft` (lines 375–387) gets lc_ref allocation; `finalizeDraft` (lines 450–493) loses it. Use Phase 8 `generateLcRef` (`src/lib/calc/formula.ts:93`) as the seed; uniqueness backstop = `proposals_user_id_lc_ref_uq` partial index (Phase 12 D-05) | **self-modify** with helper from formula.ts |
| `src/lib/api/proposals/list.ts` (MODIFY) | api helper | transform (db rows → DTO) | itself (lines 1–94) — add `archived?: boolean` to `BuildListParams`; route to a new `archived` branch in `listProposalsByUser`/`searchProposals` (which need a sibling param too) | **self-modify** |
| `src/components/proposals/PdfPreviewMock.tsx` (MODIFY) | client/server primitive | display | itself (lines 24–95) — add `lcRef: string` prop; replace `t('wizard.step3.pdf.ref.line', lang).replace('{0}', validityDays)` with inline `Réf. ${lcRef} · ${validityDays} jours de validité` construction | **self-modify** |
| `src/lib/i18n/dictionaries.ts` (MODIFY) | i18n dictionary | static lookup | itself (FR block lines 19–1086, EN block lines 1089–1340, parity proof lines 1353–1357) — add ~25 keys to BOTH FR and EN; rely on `_EnHasAllFrKeys` compile-time guard | **self-modify** |
| `docs/accessibility/16-contrast-audit.md` (MODIFY append rows 8–11) | documentation | append | itself (Phase 16 — file lives at the path; planner reads it to extend the existing measured-pairs table) | **self-modify** |

**Cardinality note:** `RecentlyDeletedToggle.tsx` is **RETIRED** from Partner Home (no longer mounted by `app/(authed)/page.tsx` after rewrite). The file is left on disk per `<deferred>` (Phase 17 CONTEXT). No code change to the component itself.

**Reused verbatim (zero change):** `src/components/ui/PageHero.tsx`, `src/components/ui/MetricTile.tsx`, `src/components/ui/StatusChip.tsx`, `src/components/ui/Stepper.tsx`, `src/components/proposals/ProposalsList.tsx`, `src/components/proposals/SearchBar.tsx`, `src/components/proposals/ProposalRow.tsx`, `app/(authed)/proposals/new/_components/RecapSection.tsx`, `app/(authed)/proposals/new/_components/WizardActionBar.tsx`.

---

## Pattern Assignments

### `app/(authed)/page.tsx` REWRITE (server-component route, request-response)

**Primary analog (NEW chrome):** `app/(admin)/[adminSegment]/page.tsx`
**Secondary analog (CARRY-FORWARD plumbing):** current `app/(authed)/page.tsx`

#### Imports pattern (copy from admin home, lines 1–14)

```tsx
import type { Metadata } from 'next';
import { Plus } from 'lucide-react';                       // for the CTA icon
import Link from 'next/link';
import { requireUser } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { PageHero } from '@/components/ui/PageHero';      // ← Phase 16 primitive
import { MetricTile } from '@/components/ui/MetricTile';  // ← Phase 11 primitive
import { StatusChip } from '@/components/ui/StatusChip';
// Drop in Phase 17:
//   - RecentlyDeletedToggle (no longer mounted here)
//   - SearchBar (moves to /proposals)
//   - ProposalsList (moves to /proposals — Partner Home renders only 5 abbreviated rows)
//   - DeleteJustToast — KEEP (decoupled from list — still fires on ?deleted_just=1)
import { DeleteJustToast } from '@/components/proposals/DeleteJustToast';
```

#### Top-of-file boilerplate (carry-forward from current page, lines 12–14)

```tsx
// PITFALLS §1.6: cookie-reading layout opts out of static rendering.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Accueil — Leasétic Matrice' };
```

#### Auth + displayName pattern (carry-forward from current page, lines 38–48)

```tsx
export default async function HomePage({ searchParams }: PageParams) {
  const { session } = await requireUser();
  const lang = await getCurrentLang();

  const u = session.user as {
    email: string;
    displayName?: string | null;
    name?: string | null;
  };
  const displayName = u.displayName ?? u.name ?? u.email;
```

#### PageHero adoption (copy from admin home lines 42–47; D-19 + 17-UI-SPEC `<PageHero>` call)

```tsx
<PageHero
  title={t('dashboard.greeting', lang).replace('{0}', displayName)}  // existing FR key 'Bonjour, {0} 👋' (dict line 296)
  subtitle={t('dashboard.home.subtitle', lang)}                       // NEW key per D-21
  actions={
    <Link
      href="/proposals/new/parametres"
      className="btn-green"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
    >
      <Plus size={17} strokeWidth={1.6} aria-hidden="true" />
      <span>{t('dashboard.cta.new', lang)}</span>
    </Link>
  }
/>
```

> **Note:** existing key `dashboard.cta.new.proposal` (line 298) may be reused or renamed to `dashboard.cta.new` per the Copywriting Contract — verify and choose, do not create duplicates.

#### MetricTile 3-up grid (UI-SPEC §Partner Home Layout step 2; D-05 inclusion rule)

```tsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
  <MetricTile
    variant="month"
    label={t('dashboard.metricTile.thisMonth', lang)}
    value={String(countThisMonth)}
  />
  <MetricTile
    variant="total"
    label={t('dashboard.metricTile.total', lang)}
    value={String(countTotal)}
  />
  <MetricTile
    variant="drafts"
    label={t('dashboard.metricTile.drafts', lang)}
    value={String(countDrafts)}
  />
</div>
```

#### Recent proposals card pattern (D-08, D-09; existing `.card` + `.ctitle` chrome)

Use the `.card` + `.ctitle` chrome already present in the current page (lines 117–141). Substitute the inline `ProposalsList` with 5 abbreviated rows built from `buildListResponse({ userId, limit: 5 })` (call directly server-side per `list.ts` line 51 pattern). Render each row using `<StatusChip variant={row.displayStatus} label={t(\`chip.${row.displayStatus}\`, lang)} />` (mirrors `ProposalRow.tsx:47, 87`).

#### Aggregate query call sites (D-05, D-06 — Europe/Paris month-start)

The planner may either inline the COUNT queries in this file or create `src/lib/db/queries/proposal-aggregates.ts`. The Drizzle pattern to imitate is `listProposalsByUser` (`src/lib/db/queries/proposals.ts:152–197`) — same `eq(schema.proposals.userId, …)` + `isNull(schema.proposals.deletedAt)` + `inArray(schema.proposals.status, …)` shape, with `count()` instead of `select()`. Compute `monthStartUtc` app-side (Date arithmetic on `Europe/Paris`-formatted now) and pass as a parametrized `gte(schema.proposals.createdAt, monthStartUtc)`.

---

### `app/(authed)/proposals/page.tsx` CREATE (server-component route, request-response)

**Primary analog:** `app/(authed)/page.tsx` (current — lines 1–144)

#### Direct copy: imports + `dynamic` + `metadata` + `searchParams` shape + auth + `buildListResponse` SSR pattern

```tsx
import type { Metadata } from 'next';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { buildListResponse } from '@/lib/api/proposals/list';
import { ProposalsList } from '@/components/proposals/ProposalsList';
import { SearchBar } from '@/components/proposals/SearchBar';
import { PageHero } from '@/components/ui/PageHero';
import { FilterPillRow } from './_components/FilterPillRow';
import { DeleteJustToast } from '@/components/proposals/DeleteJustToast';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Mes propositions — Leasétic Matrice' };

async function getNowMs(): Promise<number> { return Date.now(); }   // current page line 21

interface PageParams {
  searchParams: Promise<{ q?: string; archived?: string; cursor?: string }>;
  // Note: 'archived' replaces 'deleted' from the current Partner Home pattern (line 26).
  // The wire shape mirrors v1.1's ?deleted=1 precedent.
}

export default async function ProposalsListPage({ searchParams }: PageParams) {
  const { session } = await requireUser();
  const lang = await getCurrentLang();
  const sp = await searchParams;
  const q = sp.q ?? '';
  const archived = sp.archived === '1';
  const cursor = sp.cursor ?? null;

  const initial = await buildListResponse({
    userId: session.user.id,
    q,
    cursorEncoded: cursor,
    archived,              // NEW param — see list.ts modification below
    limit: 20,
  });

  const nowMs = await getNowMs();
  const remountKey = `${q}|${archived ? '1' : '0'}|${cursor ?? ''}`;
  // … render PageHero + FilterPillRow + SearchBar + <ProposalsList key={remountKey} …/>
}
```

#### PageHero call (UI-SPEC §`/proposals` route)

```tsx
<PageHero
  title={t('proposals.title', lang)}        // NEW
  subtitle={t('proposals.subtitle', lang)}  // NEW
  actions={<Link href="/proposals/new/parametres" className="btn-green">…</Link>}
/>
```

#### FilterPillRow + SearchBar row (UI-SPEC §`/proposals` Layout step 2)

```tsx
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 16 }}>
  <FilterPillRow archived={archived} lang={lang} />
  <SearchBar lang={lang} />
</div>
```

#### ProposalsList re-mount key (carry-forward from current page, lines 67–71, 140)

```tsx
<ProposalsList key={remountKey} lang={lang} initial={initial} nowMs={nowMs} />
```

> `ProposalsList` already reads `q` and `deleted` from `searchParams` internally (`ProposalsList.tsx:28-30`). For Phase 17 the planner has two choices: (a) leave `ProposalsList` unchanged and let the existing `deleted` read be a dead-branch on /proposals (acceptable — it returns `false` when `?archived=1` is the only param), or (b) extend `ProposalsList` to also read `archived` for empty-state copy switching. Recommendation: do (b) only if the empty-state copy must differ for `?archived=1` (it does — per UI-SPEC Copywriting Contract `proposals.empty.archived`); else inline an `if (archived && rows.length === 0)` empty block in the server page itself.

---

### `app/(authed)/proposals/_components/FilterPillRow.tsx` CREATE (client component)

**Primary analog:** `src/components/proposals/RecentlyDeletedToggle.tsx` (lines 1–58)

#### Critical inversion: `<button onClick={router.replace}>` → `<Link href="…">`

The analog uses an imperative `router.replace` driven by `onClick` (lines 15–24). Per D-11, Phase 17's `FilterPillRow` MUST use `<Link>` for full SSR re-render and shareable URLs. Copy the shell from `RecentlyDeletedToggle`, replace the buttons with Links:

**Copy verbatim (analog lines 1–6, 26–37):**

```tsx
'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { t, type Lang } from '@/lib/i18n/dictionaries';

export interface FilterPillRowProps {
  archived: boolean;
  lang: Lang;
}

export function FilterPillRow({ archived, lang }: FilterPillRowProps) {
  // Pattern from RecentlyDeletedToggle.tsx:11-13 — but use props for SSR-rendered active state
  // (matches the server-rendered `archived` boolean from searchParams in the page).

  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        border: '1px solid var(--border)',
        borderRadius: 9999,
        padding: 2,
        background: 'var(--paper)',
        gap: 0,
      }}
    >
      {/* Two Link pills — Actives (href="/proposals") + Archivées (href="/proposals?archived=1") */}
    </div>
  );
}
```

#### Active vs. inactive pill styling (UI-SPEC §`/proposals` Active/Inactive pill specs)

**Active pill (matches `.chip-active` chrome, `app/globals.css:365-368`):**
```
background: rgba(18, 150, 87, 0.10);
color: var(--gd-text);   /* #0e7544 light / #129657 dark */
fontWeight: 600;
```

**Inactive pill (matches `.toggle-pill` chrome, `app/globals.css:452-462`):**
```
background: transparent;
color: var(--muted);
fontWeight: 500;
```

**Shared layout (matches existing chip layout, `app/globals.css:355-363`):**
```
display: inline-flex; alignItems: center; padding: 6px 14px;
borderRadius: 9999px; fontSize: 13px;
textDecoration: none; transition: background 150ms, color 150ms;
```

**data-testid attributes (D-21 + UI-SPEC):**
```tsx
<Link href="/proposals"             data-testid="filter-pill-actives"  …>
<Link href="/proposals?archived=1"  data-testid="filter-pill-archived" …>
```

#### CONTRAST-02 Row 11 dark-mode caveat

UI-SPEC flags the dark-mode active state at ~3.9:1 — borderline. **Decision required by planner:** accept as-is (matches existing `.chip-active` baseline) OR introduce `--active-pill` token at higher dark opacity. Recommendation per UI-SPEC: Option 2. If Option 2, the active pill background becomes `var(--active-pill)` in dark only (declared in `app/globals.css` under `html[data-theme="dark"]`).

---

### `app/(authed)/proposals/_components/FilterPillRow.test.tsx` CREATE (Vitest)

**Primary analog:** `src/components/ui/Stepper.test.tsx` (lines 1–40)

#### Copy the boilerplate verbatim

```tsx
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FilterPillRow } from './FilterPillRow';

afterEach(() => cleanup());

describe('FilterPillRow', () => {
  it('AC-FPR-01: archived=false — Actives pill active styling, Archivées pill inactive', () => {
    const { container } = render(<FilterPillRow archived={false} lang="fr" />);
    // assertions on data-testid + inline styles + href attributes per UI-SPEC test cases 1-6
  });

  it('AC-FPR-02: archived=true — Archivées pill active, Actives pill inactive', () => { … });

  it('AC-FPR-03: Actives pill href = /proposals', () => { … });
  it('AC-FPR-04: Archivées pill href = /proposals?archived=1', () => { … });
  it('AC-FPR-05: both pills carry correct data-testid attributes', () => { … });
});
```

> UI-SPEC §FilterPillRow lists 6 test cases. The 5 above plus an `AC-FPR-06: both pills rendered` cover-all assertion.

---

### `app/(authed)/proposals/page.test.tsx` CREATE (page-level Vitest)

**Primary analog:** `app/(authed)/proposals/new/verification/page.test.tsx` (lines 36–80)

#### Copy verbatim: `vi.hoisted` + `vi.mock('next/navigation')` + redirect-throws pattern

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

vi.mock('server-only', () => ({}));

const {
  redirectMock,
  requireUserMock,
  getCurrentLangMock,
  buildListResponseMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => { throw new Error(`NEXT_REDIRECT:${path}`); }),
  requireUserMock: vi.fn(),
  getCurrentLangMock: vi.fn(),
  buildListResponseMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock('@/lib/auth/require', () => ({ requireUser: requireUserMock }));
vi.mock('@/lib/i18n', async () => {
  const real = await vi.importActual<typeof import('@/lib/i18n/dictionaries')>(
    '@/lib/i18n/dictionaries',
  );
  return { t: real.t, dictionaries: real.dictionaries, getCurrentLang: getCurrentLangMock };
});
vi.mock('@/lib/api/proposals/list', () => ({
  buildListResponse: (...args: unknown[]) => buildListResponseMock(...args),
}));
```

**Test cases** (planner derives from PROPS-01, PROPS-02 + D-13):
1. archived=false in searchParams → `buildListResponse` called with `archived: false`
2. archived=1 in searchParams → `buildListResponse` called with `archived: true`
3. q + archived combine cleanly
4. PageHero renders with `proposals.title` / `proposals.subtitle`
5. FilterPillRow + SearchBar mounted as siblings
6. ProposalsList rendered with `initial` from `buildListResponse`
7. requireUser called BEFORE buildListResponse (defense-in-depth order)

---

### `app/(authed)/proposals/new/parametres/page.tsx` MODIFY (repaint per D-15)

**Action:** Replace the inline `<h1>` block at lines 178–197 with a `<PageHero>` call. Stepper stays where it is (lines 199–208) but **becomes a sibling below PageHero**, not nested inside. JSX form structure (`<ProposalFormProvider>` + `WizardStep1Wiring`, lines 211–217) **UNCHANGED**.

#### Replacement excerpt

**BEFORE (lines 178–197):**
```tsx
<h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
  {t('wizard.step1.title', lang)}
</h1>
<p style={{ fontSize: 16, color: 'var(--muted)', marginTop: 8 }}>
  {t('wizard.step1.subtitle', lang)}
</p>
```

**AFTER (per D-15 + UI-SPEC §Wizard step 1):**
```tsx
<PageHero
  eyebrow="ÉTAPE 1 SUR 3"                       // or t('wizard.step1.eyebrow', lang) — planner's choice
  title={t('wizard.step1.title', lang)}         // existing key, dict line 574 equivalent for step 1
  subtitle={t('wizard.step1.subtitle', lang)}   // existing key (verify against current dict)
/>
```

> Existing keys `wizard.step1.title` and `wizard.step1.subtitle` may already exist (verify around `dictionaries.ts:574`); only `wizard.step1.eyebrow` is net-new per D-21.

#### Add import

```tsx
import { PageHero } from '@/components/ui/PageHero';
```

#### Stepper repositioning

The existing Stepper block (lines 199–208) stays. Wrap PageHero + Stepper as separate siblings. Per D-15 and UI-SPEC: **NO** composing Stepper inside PageHero.

---

### `app/(authed)/proposals/new/calcul/page.tsx` MODIFY (restructure per D-16)

**Action:** Replace inline `<h1>+<p>` (lines 292–311) with `<PageHero eyebrow="ÉTAPE 2 SUR 3" …/>`. Restructure the hero loyer card (currently lines 333–451 — a single `.card` with conditional state-based rendering) per UI-SPEC §Wizard step 2 — keep state branches but adopt the new layout (large `2 770 €` value + sublabel left, Tranche/Coefficient pill chip top-right via existing `.chip-language` chrome).

#### Critical: hero card pill chip pattern already exists

The Tranche/Coefficient chip is **already implemented** at lines 381–400 — copy this exact block, only relocating it from `position: absolute` to a flexbox layout matching UI-SPEC §Step-2 hero. The `.chip-language` class is from `app/globals.css:390-393` (`rgba(45,122,140,0.10)` bg + `var(--teal)` color). NO new CSS needed.

```tsx
{trancheNumber !== null && (
  <div
    className="chip-language"   // existing class — see globals.css:390
    style={{
      // UI-SPEC §Step-2 hero chip: replace position:absolute with alignSelf:flex-start
      // in a flex row with the loyer value on the left.
      fontSize: 11.8,
      fontWeight: 600,
      color: 'var(--teal)',
      background: 'color-mix(in srgb, var(--teal) 10%, transparent)',
      borderRadius: 999,
      padding: '4px 10px',
    }}
  >
    {t('wizard.step2.chip.tranche', lang)
      .replace('{0}', String(trancheNumber))
      .replace('{1}', coefficientNumber.toFixed(2))}
  </div>
)}
```

#### Détail du calcul card — use existing `RecapSection` (lines 459–472)

The existing JSX **already builds** the Détail du calcul card via `<RecapSection sectionTitle={…} rows={detailRows} rowSublabels={{ 1: …commission.sublabel }} />`. **No restructure needed** at the component-call level — only:
- Rename `sectionTitle` key from `wizard.section.detail.calcul` → `wizard.step2.detail.title` (per Copywriting Contract) OR keep existing key (verify).
- Optionally add `lastRowDivider?: boolean` prop to `RecapSection.tsx` OR render the last row (`loyer mensuel calculé`) as custom JSX wrapping `<RecapSection>` to add the separator (`borderTop: '1px solid var(--border)'; paddingTop: 12px; marginTop: 12px`) per UI-SPEC §Wizard step 2 step 4.

#### Paramètres saisis recap (already at lines 479–490) — UNCHANGED structurally

---

### `app/(authed)/proposals/new/verification/page.tsx` MODIFY (repaint + 2 invariants per D-17)

**Action:** Three changes.

#### Change 1 — Adopt `<PageHero>` (lines 245–263 → `<PageHero eyebrow="ÉTAPE 3 SUR 3" …/>`)

Same shape as step 1 modification above.

#### Change 2 — Inject validity selector inside CALCUL recap (D-01, WIZ-04)

**Where:** Inside the CALCUL `<RecapSection>` block (lines 313–327). The cleanest approach: render the validity selector as a `children`-passed element. Either (a) add a `children?` prop to `RecapSection`, or (b) render the validity selector as a sibling block **below** the CALCUL recap inside the same column wrapper (lines 291–328).

**Validity selector JSX (UI-SPEC §Left column — CALCUL recap validity selector):**

```tsx
'use client';   // requires a client-component sub-wrapper, e.g. <ValiditySelectorClient />

import { useTransition, useState } from 'react';

interface ValiditySelectorClientProps {
  draftId: string;
  defaultValidity: 15 | 30 | 60;
  inputs: Record<string, unknown>;   // current draft.inputs for the full-replace updateDraft call
  lang: Lang;
}

export function ValiditySelectorClient({ draftId, defaultValidity, inputs, lang }: ValiditySelectorClientProps) {
  const [selected, setSelected] = useState<15 | 30 | 60>(defaultValidity);
  const [, startTransition] = useTransition();

  const handleChange = (days: 15 | 30 | 60) => {
    setSelected(days);
    startTransition(async () => {
      // Call existing saveAsDraftAction with the merged inputs — D-22 full-replace semantics
      // Pattern: app/(authed)/proposals/new/_actions/saveAsDraft.action.ts
      await saveAsDraftAction(draftId, { ...inputs, validityDays: days });
      // NOTE: saveAsDraftAction redirects to '/' on success — for the in-place validity change,
      // create a NEW server action (or change saveAsDraftAction to take an optional `noRedirect: true`).
      // Planner decides; recommendation: new action `updateValidityAction(draftId, days)` that
      // calls updateDraft({ ...inputs, validityDays: days }) and does NOT redirect.
    });
  };

  return (
    <div className="dg" role="group" aria-label={t('proposal.validity.ariaLabel', lang)}
         data-testid="validity-selector">
      {[15, 30, 60].map((days) => (
        <button
          key={days}
          type="button"
          className={`db${selected === days ? ' on' : ''}`}
          onClick={() => handleChange(days as 15 | 30 | 60)}
          aria-pressed={selected === days}
        >
          {days}j
        </button>
      ))}
    </div>
  );
}
```

The `.dg` / `.db` / `.db.on` chrome already exists in `app/globals.css` (lines ~252–285 per UI-SPEC Pre-Population Source Map). NO new CSS.

#### Change 3 — Pass real `lcRef` to PdfPreviewMock (D-03, D-17)

**BEFORE (lines 335–339):**
```tsx
<PdfPreviewMock
  loyerDisplay={loyerDisplay}
  validityDays={params.validityDays as 15 | 30 | 60}
  lang={lang}
/>
```

**AFTER:**
```tsx
<PdfPreviewMock
  loyerDisplay={loyerDisplay}
  validityDays={selectedValidity}   // sourced from validity selector or draft.inputs.validityDays
  lcRef={draft.lcRef!}              // NEW — non-null because Phase 17 D-03 allocates at createDraft
  lang={lang}
/>
```

> `draft.lcRef!` is non-null because Phase 17 D-03 moves allocation to `createDraft`. The non-null assertion is safe in this code path because: (a) the route is reached via step-1 → step-2 → step-3 which can only happen after `createDraft` allocated, AND (b) the Phase 12 partial unique index doesn't reject NULL but the new `createDraft` flow always sets it. Add a defensive `if (!draft.lcRef) redirect('/proposals/new/parametres')` if the planner wants belt-and-suspenders.

---

### `src/lib/db/queries/proposals.ts` MODIFY (D-03 lc_ref allocation move)

**Two atomic changes — apply in the same commit:**

#### Change 1 — `createDraft` (lines 375–387) allocates `lcRef`

**Current:**
```tsx
export async function createDraft(args: CreateDraftArgs): Promise<ProposalRow> {
  const dbi = db();
  const insert: NewProposalRow = {
    userId: args.userId,
    language: args.language,
    status: 'draft',
    inputs: {},
    schemaVersion: '1.0.0',
    // lcRef, idempotencyKey, paramsSnapshot, computed all left undefined → NULL.
  };
  const [row] = await dbi.insert(schema.proposals).values(insert).returning();
  return row;
}
```

**After Phase 17 D-03:**
```tsx
import { generateLcRef } from '@/lib/calc';   // ← already exported per src/lib/calc/formula.ts:93

export async function createDraft(args: CreateDraftArgs): Promise<ProposalRow> {
  const dbi = db();
  // Phase 17 D-03 / D-04: allocate lcRef at draft creation. Sequential collisions
  // are guarded by `proposals_user_id_lc_ref_uq WHERE lc_ref IS NOT NULL`
  // (Phase 12 D-05); we accept the gap when a draft is abandoned (D-04).
  //
  // Algorithm options (planner picks):
  //   (a) Simple: call generateLcRef() — random 5-digit suffix, retry on
  //       unique-violation. Cheapest, no extra query.
  //   (b) Sequential: SELECT lcRef FROM proposals WHERE user_id=$1 AND lc_ref IS NOT NULL
  //       ORDER BY lc_ref DESC LIMIT 1, parse suffix, increment, format LC-2026-NNN,
  //       wrap in tx with SELECT FOR UPDATE. More accurate to v1.1 sequential per
  //       17-CONTEXT.md <specifics>.
  // Recommendation: (b) for fidelity with Phase 8 sequential semantics.
  const lcRef = await allocateNextLcRefForUser(args.userId);  // new helper, planner writes

  const insert: NewProposalRow = {
    userId: args.userId,
    language: args.language,
    status: 'draft',
    lcRef,                          // NEW: persisted at draft creation
    inputs: {},
    schemaVersion: '1.0.0',
    // idempotencyKey, paramsSnapshot, computed still NULL until finalize
  };
  const [row] = await dbi.insert(schema.proposals).values(insert).returning();
  return row;
}
```

#### Change 2 — `finalizeDraft` (lines 450–493) no longer allocates `lcRef`

**Inversion:** Phase 17 contract says `finalizeDraft` copies the pre-allocated `lcRef` from the draft row rather than receiving it as an arg. Change the signature:

**Current FinalizeDraftArgs (lines 424–433):**
```tsx
export interface FinalizeDraftArgs {
  lcRef: string;             // ← was passed from caller (finalize-wizard.ts:166)
  idempotencyKey: string;
  paramsSnapshot: Record<string, unknown>;
  computed: Record<string, unknown>;
  pdfBlobKey: string;
  pdfSha256: string;
  pdfSizeBytes: number;
  pdfGeneratedAt: Date;
}
```

**After:**
- Remove `lcRef` from `FinalizeDraftArgs`. The helper reads it from the draft row inside the same UPDATE.
- Update `src/lib/api/proposals/finalize-wizard.ts:166` — DELETE the `generateLcRef()` call. The draft already has `lcRef` set. Read `draft.lcRef` after `getDraftById` and use it in the PDF data prop construction (`pdfData.lcRef = draft.lcRef!`).
- The `audit_log` write at `finalizeDraft` line 484–490 should switch from `{ lcRef: args.lcRef }` to `{ lcRef: row.lcRef }` (where `row` is the pre-update SELECT — or post-update RETURNING result).

#### Audit trail invariant (per CONTEXT § Established Patterns)

`audit_log` STILL fires only at finalize, not at draft creation. WIZ-06 lc_ref allocation is a metadata pre-allocation, not a lifecycle event. Do NOT add an audit_log entry in `createDraft`.

#### Test impact

`src/lib/db/queries/proposals.test.ts` will need updates: the existing test around `finalizeDraft` (line 484-490 audit_log assertion) must be retargeted; `createDraft` tests get a new lcRef assertion.

---

### `src/lib/api/proposals/list.ts` MODIFY (D-13 archived filter)

**Action:** Extend `BuildListParams` and the underlying `listProposalsByUser` / `searchProposals` to accept `archived?: boolean`.

#### Current shape (lines 33–67)

```tsx
export interface BuildListParams {
  userId: string;
  q?: string;
  cursorEncoded?: string | null;
  deleted?: boolean;       // ← existing v1.1 param (Partner Home toggle, retiring on /proposals)
  limit?: number;
}

export async function buildListResponse(args: BuildListParams): Promise<ListResponse> {
  // … routes to listProposalsByUser({ deleted: args.deleted ?? false, … }) or searchProposals
}
```

#### After Phase 17 D-13

```tsx
export interface BuildListParams {
  userId: string;
  q?: string;
  cursorEncoded?: string | null;
  deleted?: boolean;     // KEEP for backward compat (Partner Home was the only consumer; retiring)
  archived?: boolean;    // NEW — D-12 Archivées = expired OR soft-deleted within 30d window
  limit?: number;
}

// Then in listProposalsByUser (src/lib/db/queries/proposals.ts:152), extend ListProposalsArgs
// with archived?: boolean and add a new SQL branch:
//
//   archived === true: WHERE user_id=$1 AND (
//     (status='active' AND (pdf_generated_at + INTERVAL validityDays day) < NOW())  -- expired derivation
//     OR (status='deleted' AND deleted_at >= NOW() - INTERVAL '30 days')
//   )
//
// Expired derivation is tricky — Phase 12's deriveDisplayStatus (proposals.ts:551-568) is a JS
// function that reads paramsSnapshot.validityDays + pdfGeneratedAt. For an SQL filter, the
// recommended approach: SQL filters on (status IN ('active','deleted') AND deleted_at_window)
// to get a CANDIDATE set, then app-side filter via deriveDisplayStatus to keep only those whose
// displayStatus is 'expired' or 'deleted'. This avoids re-implementing deriveDisplayStatus in
// SQL (the paramsSnapshot jsonb path makes the SQL ugly).
//
// Alternative: lift the SQL filter to (status='active' AND pdf_generated_at + (inputs->>'validityDays')::int * interval '1 day' < NOW())
// OR (status='deleted' AND deleted_at >= NOW() - INTERVAL '30 days'). The validityDays lives in
// inputs jsonb post-Phase 13. Same row in `params_snapshot` per Phase 8 + 13.
//
// Recommendation: candidate-set + app-side filter. Simpler, matches deriveDisplayStatus single
// source of truth.
```

The downstream `result.rows.map((row) => …)` block (lines 70–90) is **unchanged**; `displayStatus: deriveDisplayStatus(row)` already handles the 4-state derivation for the client (Phase 14 D-27).

---

### `src/components/proposals/PdfPreviewMock.tsx` MODIFY (D-17 real lcRef)

**Action:** Add `lcRef: string` prop. Replace the dictionary-sourced ref line (lines 46–49) with inline construction.

**Current (lines 24–49):**
```tsx
export interface PdfPreviewMockProps {
  loyerDisplay: string;
  validityDays: 15 | 30 | 60;
  lang: Lang;
}

export function PdfPreviewMock({ loyerDisplay, validityDays, lang }: PdfPreviewMockProps) {
  // D-15: the mock reference placeholder is baked into the i18n key
  // `wizard.step3.pdf.ref.line` …
  const refLine = t('wizard.step3.pdf.ref.line', lang).replace('{0}', String(validityDays));
```

**After Phase 17:**
```tsx
export interface PdfPreviewMockProps {
  loyerDisplay: string;
  validityDays: 15 | 30 | 60;
  lcRef: string;          // NEW (D-17, D-03)
  lang: Lang;
}

export function PdfPreviewMock({ loyerDisplay, validityDays, lcRef, lang }: PdfPreviewMockProps) {
  // Phase 17 D-03 / D-17: render the REAL lc_ref allocated at createDraft.
  // Inline construction — no longer routes through wizard.step3.pdf.ref.line.
  const refLine = lang === 'fr'
    ? `Réf. ${lcRef} · ${validityDays} jours de validité`
    : `Ref. ${lcRef} · ${validityDays} days validity`;
  // (Alternative: new i18n key wizard.step3.pdf.refLine with two {0}/{1} placeholders.
  //  Planner's choice — per UI-SPEC §<PdfPreviewMock>.)
```

#### ADMIN-09 note (preserved, no test impact)

The 9-gate grep-contract suite (`tests/admin-09-grep-contracts.test.ts`) gates on `commission_pct` and `_pct` substrings (lines 11–32 in the test file). `lcRef` is not commission-related — the modification trivially passes. Tests at `app/(authed)/proposals/new/_components/PdfPreviewMock.test.tsx` will need updates to pass `lcRef` prop in all render calls.

---

### `src/lib/i18n/dictionaries.ts` MODIFY (~25 new keys × FR + EN per D-21)

**Action:** Add the keys listed in UI-SPEC §Copywriting Contract to BOTH the FR block (around line 296 for `dashboard.*`, around line 574 for `wizard.step3.*`) AND the EN block (around line 964 for `dashboard.*`, around line 1226 for `wizard.step3.*`).

#### Compile-time parity proof (lines 1353–1357) — DO NOT TOUCH

```tsx
type _EnHasAllFrKeys = {
  [K in DictKey]: K extends keyof typeof dictionaries.en ? true : never;
};
type _EnParityProof = _EnHasAllFrKeys; // fails compile if any K maps to never
```

This catches missing EN keys at compile time. The planner just needs to add both halves; the proof catches drift mechanically.

#### Existing keys to verify (avoid duplication)

- `dashboard.greeting` (line 296) — REUSE for Partner Home hero title
- `dashboard.subtext` (line 297) — may be subsumed by new `dashboard.home.subtitle` key
- `dashboard.cta.new.proposal` (line 298) — verify if renaming to `dashboard.cta.new` per UI-SPEC
- `dashboard.recent.title` (line 299) — REUSE
- `dashboard.empty.title` / `dashboard.empty.body` (lines 300–301) — REUSE for Partner Home zero-state
- `wizard.step1.title` / `wizard.step1.subtitle` (around line 574 — verify position) — likely already present
- `wizard.step3.title` / `wizard.step3.subtitle` (lines 574–575) — already present, REUSE
- `wizard.step3.pdf.ref.line` (line 612) — RETIRED post-Phase 17 D-17 (PdfPreviewMock no longer reads it)
- `wizard.step3.pdf.title`, `wizard.step3.pdf.loyer.label` (lines 611, 614) — REUSE

---

### `docs/accessibility/16-contrast-audit.md` MODIFY (append rows 8–11 per CONTRAST-02)

**Action:** Append 4 rows for the new token pairs introduced in Phase 17. UI-SPEC §Contrast Audit pre-computes the values:

| # | Composite | Mode | Ratio | Pass? |
|---|-----------|------|-------|-------|
| 8 | Tranche/Coefficient chip `--teal` on tint | Light | ~4.8:1 | Verify ≥4.5 |
| 9 | Tranche/Coefficient chip `--teal` on tint | Dark | ~9.2:1 | Verify ≥4.5 |
| 10 | Active filter pill `--gd-text` on tint | Light | 4.96:1 (calculated) | PASS |
| 11 | Active filter pill `--gd-text` on tint | Dark | ~3.9:1 (calculated) | **BORDERLINE — see decision** |

Row 11 requires the planner's decision (see FilterPillRow section above). If Option 2 chosen, the row reflects the post-mitigation `--active-pill` ratio.

---

## Shared Patterns

### Auth + page boilerplate (applies to all 5 partner surfaces)

**Source:** `app/(authed)/page.tsx` lines 12–14, 38–48; `app/(admin)/[adminSegment]/page.tsx` lines 8–14, 36–47

```tsx
// Top of file
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';

// PITFALLS §1.6: cookie-reading route opts out of static rendering.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Page Name — Leasétic Matrice' };

export default async function MyPage(props: PageProps) {
  const { session } = await requireUser();   // defense-in-depth even though (authed)/layout.tsx also calls it
  const lang = await getCurrentLang();
  // …
}
```

### PageHero adoption (D-19 — all 5 partner surfaces)

**Source:** `app/(admin)/[adminSegment]/page.tsx:42-47` (only existing adopter)

```tsx
<PageHero
  eyebrow={t('…eyebrow', lang)}     // optional — wizard steps use 'ÉTAPE N SUR 3'
  title={t('…title', lang)}
  subtitle={t('…subtitle', lang)}
  actions={ /* optional right-aligned CTA */ }
/>
```

The PageHero primitive (`src/components/ui/PageHero.tsx`) renders with `marginBottom: 32` baked in (line 19) — siblings below get spacing for free. **DO NOT** wrap PageHero in additional padding.

### Stepper + PageHero composition (D-19, D-15, D-16, D-17)

**Source:** existing wizard step 1 (`app/(authed)/proposals/new/parametres/page.tsx:199-208`) — Stepper as standalone sibling

```tsx
return (
  <div style={{ maxWidth: 840, margin: '0 auto', padding: '32px 0' }}>
    <PageHero eyebrow="ÉTAPE N SUR 3" title={…} subtitle={…} />
    <div style={{ marginTop: 24 }}>
      <Stepper currentStep={N} completedSteps={completedSteps} lang={lang} hrefForStep={…} />
    </div>
    {/* card content */}
  </div>
);
```

> Step 3 uses `maxWidth: 1040` (line 244) — preserve.

### i18n: `t(key, lang)` + compile-time parity proof

**Source:** `src/lib/i18n/dictionaries.ts:1345-1357`

```tsx
export function t(key: DictKey, lang: Lang): string {
  return dictionaries[lang][key] ?? dictionaries.fr[key];
}

type _EnHasAllFrKeys = { [K in DictKey]: K extends keyof typeof dictionaries.en ? true : never };
type _EnParityProof = _EnHasAllFrKeys;   // fails compile if EN missing any FR key
```

Apply: **add every new key to BOTH `dictionaries.fr` and `dictionaries.en`** — drift is a compile-time error.

### URL-state pattern via `<Link>` (D-11)

**Source:** Server-rendered `archived` boolean derived from `searchParams`, threaded as a prop to `FilterPillRow`. The component renders **two `<Link>` elements** (one per state). Browser back/forward + shareable URLs work natively.

**Pattern is NOT:** the existing `RecentlyDeletedToggle` imperative `router.replace` (lines 16–24). Phase 17 intentionally diverges per D-11.

### ADMIN-09 commission invariant (preserved by D-18)

**Source:** `src/lib/api/proposals/finalize-helpers.ts` (the isolation barrier), `src/lib/api/proposals/finalize-wizard.ts:13-35` (header comment explaining the invariant), `tests/admin-09-grep-contracts.test.ts:1-32` (the 9-gate suite)

**Phase 17 surfaces that touch commission:**
- Wizard step 2: `app/(authed)/proposals/new/calcul/page.tsx:212-217` (Détail du calcul row 2 — D-12 partner-facing relaxation, preserved)
- Wizard step 3: `app/(authed)/proposals/new/verification/page.tsx:225-233` (CALCUL recap row 3 — D-12, preserved)

**All other Phase 17 surfaces are commission-FREE by construction:**
- Partner Home `/` — MetricTiles aggregate counts only, no commission data
- `/proposals` — list rows already strip commission via `ProposalRowDto` projection (`list.ts:8-24`)
- FilterPillRow — pure URL navigation
- Validity selector — pure metadata (15/30/60 day enum)
- lc_ref — presentation identifier, not commission

The grep-contract suite stays green automatically.

### Server-component test scaffolding (page-level)

**Source:** `app/(authed)/proposals/new/verification/page.test.tsx:36-80`

The `vi.hoisted` + `vi.mock('next/navigation')` + `redirect throws NEXT_REDIRECT:` pattern is the established way to test server components in this project. Copy the boilerplate verbatim for `proposals/page.test.tsx`.

### Vitest colocation + `cleanup()` discipline

**Source:** `src/components/ui/Stepper.test.tsx:1-5`, `src/components/ui/PageHero.test.tsx:1-5`

```tsx
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';

afterEach(() => cleanup());
```

Every component test file does this. Phase 17 component tests follow.

---

## No Analog Found

All 13 files have at least one in-repo analog. The two areas where the planner must improvise within the existing patterns:

| File | Improvisation | Existing Pattern To Adapt |
|------|---------------|---------------------------|
| `src/lib/db/queries/proposals.ts` — lc_ref allocation algorithm | Sequential SELECT-DESC + parse + increment with tx isolation | `listProposalsByUser` SQL composition (lines 152–197) for the SELECT shape; Phase 8 `generateLcRef` (`src/lib/calc/formula.ts:93`) for the format constant; **no existing per-user sequential allocator** — planner picks (a) simple random+retry or (b) SELECT FOR UPDATE sequential |
| `src/lib/api/proposals/list.ts` — archived SQL filter | Candidate set (status IN ('active','deleted') + 30d window) + app-side `deriveDisplayStatus` filter for expired derivation | `listProposalsByUser` SQL composition (lines 152–197); `deriveDisplayStatus` (lines 551–568) for the JS-side filter. **No existing query combines them** — planner writes the composition |

Both are inside files Phase 17 already plans to modify, so no new analog file is needed.

---

## Metadata

**Analog search scope:**
- `app/(authed)/**` — all authed routes + colocated components/tests
- `app/(admin)/**` — admin home (PageHero adopter) + admin partners list pattern
- `src/components/ui/**` — primitives (PageHero, MetricTile, StatusChip, Stepper, AdminNavCard)
- `src/components/proposals/**` — list-side components (ProposalsList, SearchBar, RecentlyDeletedToggle, ProposalRow)
- `src/lib/db/queries/**` — Drizzle query helpers (proposals.ts, audit-log.ts, global-params.ts)
- `src/lib/api/proposals/**` — request-shaping helpers (list.ts, submit.ts, finalize-wizard.ts, finalize-helpers.ts)
- `src/lib/i18n/**` — dictionaries + `t()` helper
- `src/lib/calc/**` — for `generateLcRef` reference
- `tests/admin-09-grep-contracts.test.ts` — the ADMIN-09 enforcement suite
- `app/globals.css` — for `.chip-*`, `.toggle-pill`, `.dg`/`.db`, `.list-row`, `.search-bar`, `.card`, `.ctitle` chrome

**Files scanned:** ~50 (sample-read 18 verbatim; the rest by `Bash` + `Grep` for membership / pattern verification)

**Pattern extraction date:** 2026-05-22

**Project skills loaded:** none (no `.claude/skills/` or `.agents/skills/` present in repo)

**Project instructions:** Top-level `CLAUDE.md` in `/Users/antoinerousseau/Developer/leasetic-calculator/` is NOT present (the working-directory `CLAUDE.md` at `/Users/antoinerousseau/Documents/Claude Code/CLAUDE.md` describes a different project — Memento Hub — and was NOT applied to Leasétic patterns). Phase 17 conventions came from `17-CONTEXT.md` + `17-UI-SPEC.md` + the explored repo, which encode all relevant Leasétic project rules (PITFALLS, ADMIN-09, i18n parity proof, Vitest colocation, `requireUser` defense-in-depth).
