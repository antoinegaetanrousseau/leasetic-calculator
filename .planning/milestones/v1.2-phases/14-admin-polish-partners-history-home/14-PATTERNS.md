# Phase 14: Admin Polish — Partners + History + Home - Pattern Map

**Mapped:** 2026-05-20
**Files analyzed:** 19 new + modified (12 new + 7 modified) + 4 renames
**Analogs found:** 19 / 19 (every new file has a strong analog in-repo)

This map binds every new file to a concrete existing file the planner should copy from. Where a fresh-write is unavoidable (e.g. `<CoefficientDiffPanel>` — no side-by-side diff in repo), the closest *partial* analog and the patterns to copy are noted.

---

## File Classification

| New / Modified File | Operation | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|---|
| `app/(admin)/[adminSegment]/partners/` (directory) | RENAME from `accounts/` | route-group | n/a | `app/(admin)/[adminSegment]/accounts/` itself | exact (1:1 rename) |
| `app/(admin)/[adminSegment]/partners/page.tsx` | MOVE+EDIT | server component, admin route | request-response | `app/(admin)/[adminSegment]/accounts/page.tsx` | exact |
| `app/(admin)/[adminSegment]/partners/AccountsList.tsx` | MOVE+EDIT | client component, list | request-response | `app/(admin)/[adminSegment]/accounts/AccountsList.tsx` (itself, edited in place) | exact |
| `app/(admin)/[adminSegment]/partners/CreatePartnerModal.tsx` | MOVE only (shelf code) | client component, form modal | n/a | itself; no edits beyond directory move | exact |
| `app/(admin)/[adminSegment]/partners/timeAgo.ts` | MOVE only | utility (pure) | transform | itself; no edits | exact |
| `app/(admin)/[adminSegment]/partners/new/page.tsx` | NEW | server component, admin route | request-response | `app/(admin)/[adminSegment]/accounts/page.tsx` (head/shape) + `app/(authed)/proposals/new/verification/page.tsx` (1040px outer container) | role+flow match |
| `app/(admin)/[adminSegment]/partners/new/page.test.tsx` | NEW | vitest test | n/a | `app/(authed)/proposals/new/verification/page.test.tsx` (server-page mock harness) | exact |
| `app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx` | NEW | client component, RHF form | request-response (server action) | `app/(admin)/[adminSegment]/accounts/CreatePartnerModal.tsx` (RHF + zodResolver pattern) **AND** `app/(authed)/proposals/new/parametres/ParametresFormCard.tsx` (●-bulleted section pattern + `<hr>` between sections) | composite (two analogs) |
| `app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.test.tsx` | NEW | vitest test, client form | n/a | `app/(authed)/proposals/new/parametres/ParametresFormCard.test.tsx` + `src/components/ui/AdminNavCard.test.tsx` | role match |
| `app/(admin)/[adminSegment]/coefficients/CoefficientHistorySidebar.tsx` | NEW | server component shell + client per-row | request-response | `app/(admin)/[adminSegment]/coefficients/HistoryTable.tsx` (history rows + expand state + listGlobalParamsHistory consumer; just narrower to 360px and `limit: 5`) | role+flow match |
| `app/(admin)/[adminSegment]/coefficients/CoefficientHistorySidebar.test.tsx` | NEW | vitest test | n/a | `src/components/ui/AdminNavCard.test.tsx` | role match |
| `app/(admin)/[adminSegment]/history/page.tsx` | NEW | server component, admin route, cursor pagination | request-response (paginated read) | `app/(authed)/page.tsx` (cursor URL param + buildListResponse pattern) + `app/(admin)/[adminSegment]/accounts/page.tsx` (admin header + requireAdmin + force-dynamic) | composite (two analogs) |
| `app/(admin)/[adminSegment]/history/page.test.tsx` | NEW | vitest test | n/a | `app/(authed)/proposals/new/verification/page.test.tsx` | role match |
| `app/(admin)/[adminSegment]/history/CoefficientHistoryList.tsx` | NEW (planner discretion to inline or extract) | client component, list with single-active expand | request-response | `app/(admin)/[adminSegment]/coefficients/HistoryTable.tsx` (per-row expand state — but Set→single id swap per D-25) | role+flow match |
| `app/(admin)/[adminSegment]/history/CoefficientDiffPanel.tsx` | NEW | client component, structured diff render | transform | **partial:** `app/(admin)/[adminSegment]/coefficients/HistoryDiff.tsx` (flatten params snapshot to rows; in-repo flatten helper exists in `computeDiffPairs`). No side-by-side analog exists — fresh-write the 2-column grid + condensed/full mode. | partial (flatten helper exists, layout is new) |
| `app/(admin)/[adminSegment]/history/CoefficientDiffPanel.test.tsx` | NEW | vitest test | n/a | `src/components/ui/StatusChip.test.tsx` (component variant tests) | role match |
| `app/(admin)/[adminSegment]/accounts/page.tsx` (legacy stub) | NEW (or `next.config.ts` route) | redirect | n/a | none in repo — fresh-write per Next.js 16 `redirect()` convention | no analog (1-liner) |
| `next.config.ts` redirect rule | MODIFY | config | n/a | none in repo (current `next.config.ts` has no `redirects` block) — fresh-write per Next.js docs | no analog (alternative D-02 path) |
| `app/globals.css` (`.chip-invited` class) | MODIFY | CSS utility | n/a | `.chip-draft` at globals.css:371-374 | exact (visually identical chrome) |
| `src/lib/i18n/dictionaries.ts` (~30 keys × 2) | MODIFY | i18n | n/a | existing `admin.accounts.*`, `admin.coefficients.history.*` keys | exact |
| `app/(admin)/[adminSegment]/page.tsx` (admin home) | MODIFY | server component, admin route | request-response | itself (existing 2-link layout) + `src/components/ui/AdminNavCard.test.tsx` (showing 3-variant rendering) | exact (in-place edit) |
| `app/(admin)/[adminSegment]/coefficients/page.tsx` | MODIFY | server component | request-response | itself + `app/(authed)/proposals/new/verification/page.tsx` (2-column grid 1040px) | composite |
| `src/components/ui/Shell.tsx` | MODIFY (revert) | server component, layout | n/a | itself (revert commit `6809b1f`) | exact |
| `src/components/proposals/ProposalsList.tsx` | MODIFY | client component, list | request-response | itself + `src/components/proposals/ProposalRow.tsx` (chip render slot) + `src/components/ui/StatusChip.tsx` | exact |
| `app/(authed)/proposals/[id]/page.tsx` | MODIFY | server component, detail page | request-response | itself (existing chip-slot in header at lines 129-145) | exact (in-place edit) |
| `src/components/ui/StatusChip.tsx` | MODIFY (extend union) | server component, primitive | n/a | itself (variant union extension) | exact |

---

## Pattern Assignments

### `app/(admin)/[adminSegment]/partners/new/page.tsx` (NEW — server component, admin route)

**Analogs:**
- Primary: `app/(admin)/[adminSegment]/accounts/page.tsx` (admin-route shell)
- Secondary: `app/(authed)/proposals/new/verification/page.tsx` (1040px outer wrapper)

**Imports pattern** (from `accounts/page.tsx` lines 1-8):
```tsx
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { listPartnersWithCounts } from '@/lib/db/queries';
import { AccountsList } from './AccountsList';

// PITFALLS §1.6 — opts out of static rendering.
export const dynamic = 'force-dynamic';
```

**Admin route pattern** (from `accounts/page.tsx` lines 19-36 — copy verbatim, swap component import + remove the `listPartnersWithCounts` call):
```tsx
export const metadata: Metadata = {
  title: 'Créer un partenaire — Leasétic Matrice',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ adminSegment: string }>;
}

export default async function CreatePartnerPage({ params }: PageProps) {
  const { adminSegment } = await params;
  await requireAdmin(); // AUTH-15 defense in depth
  const lang = await getCurrentLang();

  return (
    <div>
      <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
        {t('partners.new.title', lang)}
      </h1>
      <p style={{ fontSize: 16, color: 'var(--muted)', marginTop: 8, marginBottom: 32 }}>
        {t('partners.new.subtitle', lang)}
      </p>
      <CreatePartnerForm lang={lang} adminSegment={adminSegment} />
    </div>
  );
}
```

**1040px outer wrapper pattern** (from `verification/page.tsx` line 244):
```tsx
<div style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 0' }}>
  {/* page body */}
</div>
```

---

### `app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx` (NEW — client RHF form)

**Analog 1 (primary, RHF + zod + server action):** `app/(admin)/[adminSegment]/accounts/CreatePartnerModal.tsx`
**Analog 2 (●-bulleted sections + `<hr>` dividers):** `app/(authed)/proposals/new/parametres/ParametresFormCard.tsx`

**Imports + RHF setup** (from `CreatePartnerModal.tsx` lines 1-15, adapted to add InviteUrlModal + Link):
```tsx
'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminCreateInvitation, createPartnerSchema, type CreatePartnerValues } from '@/lib/admin';
import { t, type Lang, type DictKey } from '@/lib/i18n/dictionaries';
import { InviteUrlModal } from '@/components/InviteUrlModal';
```

**RHF config pattern** (from `CreatePartnerModal.tsx` lines 32-43 — `mode: 'onBlur'`, defaults string-init):
```tsx
const {
  register,
  handleSubmit,
  formState: { errors, isSubmitting },
  reset,
} = useForm<CreatePartnerInput, unknown, CreatePartnerValues>({
  resolver: zodResolver(createPartnerSchema), // extend schema with firstName/lastName/companyName/siret/phone/invitationMessage
  mode: 'onBlur',
  shouldFocusError: true,
  defaultValues: {
    firstName: '', lastName: '', email: '',
    companyName: '', siret: '', phone: '',
    invitationMessage: '',
  },
});
```

**●-bulleted section header pattern** (from `ParametresFormCard.tsx` lines 86-95 — replicate verbatim for each of the 3 sections):
```tsx
<section className="card">
  {/* ── Section 1: INFORMATIONS PERSONNELLES ────────────────────── */}
  <div className="ctitle">
    <span className="dot" style={{ background: 'var(--gd)' }} aria-hidden="true" />
    <span>{t('partners.new.section.personal', lang)}</span>
  </div>
  {/* … fields … */}
```

**`<hr>` divider between sections** (from `ParametresFormCard.tsx` lines 183-190 — verbatim, twice in this form):
```tsx
<hr
  style={{
    border: 'none',
    borderTop: '1px solid var(--border)',
    margin: '24px 0',
  }}
/>
```

**Field pattern with error + aria-invalid + aria-describedby** (from `CreatePartnerModal.tsx` lines 164-207 — copy per-field):
```tsx
<div className="fld">
  <label htmlFor="cpf-firstName">
    {t('partners.new.field.firstName', lang)}
    <span className="req" aria-hidden="true">*</span>
  </label>
  <input
    id="cpf-firstName"
    type="text"
    autoComplete="given-name"
    placeholder={t('partners.new.field.firstName.placeholder', lang)}
    aria-invalid={errors.firstName ? true : undefined}
    aria-describedby={errors.firstName ? 'cpf-firstName-error' : undefined}
    className={errors.firstName ? 'invalid' : ''}
    {...register('firstName')}
  />
  {errors.firstName?.message && (
    <p id="cpf-firstName-error" role="alert" className="error-msg">
      {t(errors.firstName.message as DictKey, lang)}
    </p>
  )}
</div>
```

**Submit button + spinner pattern** (from `CreatePartnerModal.tsx` lines 274-297):
```tsx
<button
  type="submit"
  className="btn-green"
  disabled={isSubmitting}
  aria-disabled={isSubmitting || undefined}
  aria-busy={isSubmitting || undefined}
  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, opacity: isSubmitting ? 0.7 : 1 }}
>
  {isSubmitting && (
    <Loader2 size={16} strokeWidth={1.6} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" />
  )}
  {isSubmitting ? t('partners.new.submit.spinner', lang) : t('partners.new.submit', lang)}
</button>
```

**Submit handler → InviteUrlModal pattern** (from `AccountsList.tsx` lines 137-151 — `onCreated` pattern):
```tsx
const onSubmit = async (data: CreatePartnerValues) => {
  try {
    const result = await adminCreateInvitation(data);
    toast.success(t('partners.new.toast.success', lang));
    setInviteUrl({ url: result.url, kind: 'invite' }); // opens InviteUrlModal
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'admin.accounts.modal.error.email.exists') {
      toast.error(t('partners.new.toast.error.duplicate', lang));
    } else {
      toast.error(t('partners.new.toast.error', lang));
    }
  }
};
```

**InviteUrlModal mount** (from `AccountsList.tsx` lines 507-515):
```tsx
{inviteUrl && (
  <InviteUrlModal
    url={inviteUrl.url}
    kind={inviteUrl.kind}
    lang={lang}
    onClose={() => {
      setInviteUrl(null);
      reset();
      router.push(`/${adminSegment}/partners`);
    }}
    triggerRef={submitBtnRef}
  />
)}
```

---

### `app/(admin)/[adminSegment]/coefficients/CoefficientHistorySidebar.tsx` (NEW)

**Analog:** `app/(admin)/[adminSegment]/coefficients/HistoryTable.tsx` (existing history surface) — adapt to narrow 360px sidebar + `limit: 5` + footer link.

**Server-fetch + render shape** (model on `HistoryTable.tsx` lines 22-35, but split server fetch from client expand):

```tsx
// Server component shell:
import { listCoefficientHistory } from '@/lib/db/queries/coefficient-history';
import Link from 'next/link';
import { CoefficientHistorySidebarRow } from './CoefficientHistorySidebarRow';

interface Props { lang: Lang; adminSegment: string; }

export async function CoefficientHistorySidebar({ lang, adminSegment }: Props) {
  const { rows } = await listCoefficientHistory({ limit: 5 });
  return (
    <section className="card" aria-label={t('coefficients.history.aria.label', lang)}>
      <div className="ctitle">
        <span className="dot" style={{ background: 'var(--gd)' }} aria-hidden="true" />
        <span>{t('coefficients.history.title', lang)}</span>
      </div>
      {rows.length === 0 ? (
        <p style={{ fontStyle: 'italic', color: 'var(--muted)', padding: 20 }}>
          {t('coefficients.history.empty', lang)}
        </p>
      ) : (
        rows.map((row) => (
          <CoefficientHistorySidebarRow key={row.id} row={row} lang={lang} />
        ))
      )}
      {rows.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 12 }}>
          <Link
            href={`/${adminSegment}/history`}
            style={{ color: 'var(--teal)', fontSize: '14.5px', fontWeight: 500, textDecoration: 'none' }}
          >
            {t('coefficients.history.viewAll', lang)} →
          </Link>
        </div>
      )}
    </section>
  );
}
```

**Per-row expand pattern** — copy the `Set<string>` toggle from `HistoryTable.tsx` lines 34, 50-57 (multi-expand allowed per D-20):
```tsx
const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
const toggleExpand = (id: string) => {
  setExpandedRows((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
};
```

---

### `app/(admin)/[adminSegment]/history/page.tsx` (NEW — standalone /history)

**Analogs:**
- Cursor URL pattern: `app/(authed)/page.tsx` lines 25-65 (`?cursor=base64`)
- Admin route shell: `app/(admin)/[adminSegment]/accounts/page.tsx`
- Cursor encode/decode: already shipped in `src/lib/db/queries/coefficient-history.ts` lines 119-147 (use `encodeCoefficientHistoryCursor` / `decodeCoefficientHistoryCursor`)

**Cursor URL extraction pattern** (from `app/(authed)/page.tsx` lines 25-52):
```tsx
interface PageProps {
  searchParams: Promise<{ cursor?: string }>;
}

export default async function HistoryPage({ searchParams, params }: PageProps & { params: Promise<{adminSegment:string}> }) {
  await params;
  await requireAdmin();
  const lang = await getCurrentLang();
  const sp = await searchParams;
  const cursorEncoded = sp.cursor ?? null;

  const cursor = cursorEncoded ? decodeCoefficientHistoryCursor(cursorEncoded) : null;
  const { rows, hasMore, nextCursor } = await listCoefficientHistory({
    cursor: cursor ?? undefined,
    limit: 20,
  });
  const nextCursorEncoded = nextCursor ? encodeCoefficientHistoryCursor(nextCursor) : null;
  // … render
}
```

**Pagination link pattern** (model on `app/(authed)/page.tsx` paginated SSR — `<Link href="?cursor=...">`):
```tsx
{hasMore && nextCursorEncoded && (
  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
    <Link
      href={`/${adminSegment}/history?cursor=${nextCursorEncoded}`}
      style={{ color: 'var(--teal)', fontSize: '14.5px', fontWeight: 500 }}
    >
      {t('history.pagination.next', lang)} →
    </Link>
  </div>
)}
```

---

### `app/(admin)/[adminSegment]/history/CoefficientDiffPanel.tsx` (NEW — fresh-write with partial analog)

**Partial analog:** `app/(admin)/[adminSegment]/coefficients/HistoryDiff.tsx` — contains the `computeDiffPairs(before, after)` helper that flattens snapshot rows. Reuse the flattening logic; the side-by-side 2-column layout is genuinely new.

**Reuse `computeDiffPairs` import** (from `HistoryTable.tsx` line 9):
```tsx
import { computeDiffPairs } from '../coefficients/HistoryDiff';
// OR extract to a shared helper module if cross-route import smells.
```

**Mode prop pattern** (fresh — Phase 14 UI-SPEC §5.4 contract):
```tsx
export interface CoefficientDiffPanelProps {
  row: { id: string; changedAt: Date; changedByDisplay: string | null; beforeJson: GlobalParamsSnapshot | null; afterJson: GlobalParamsSnapshot; summary: string };
  mode: 'condensed' | 'full';
  lang: Lang;
  onClose?: () => void;
}
```

**Diff-row highlight pattern** (fresh — UI-SPEC §4.3 binding):
```tsx
<div
  className="diff-row"
  data-changed={isChanged}
  style={isChanged ? {
    background: 'rgba(224, 133, 48, 0.10)',
    borderRadius: 6,
    padding: '2px 4px',
    fontWeight: 600,
  } : undefined}
>
  {value}
</div>
```

**Escape-key close pattern** (from `CreatePartnerModal.tsx` lines 49-78 — copy `useEffect` keydown handler, drop the focus-trap):
```tsx
useEffect(() => {
  if (!onClose) return;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}, [onClose]);
```

---

### `app/(admin)/[adminSegment]/page.tsx` (MODIFY — admin home)

**Analog:** itself (in-place edit) + `src/components/ui/AdminNavCard.tsx` (the consumed component) + `src/components/ui/AdminNavCard.test.tsx` (showing the 3-variant binding).

**Current layout** (lines 57-102 — REPLACE the 2-link `grid-template-columns: '1fr 1fr'` with 3-card grid):

**New imports** (replace `Settings2, Users` with the 3 lucide icons used by AdminNavCard variants):
```tsx
import { Sliders, Users, History } from 'lucide-react';
import { AdminNavCard } from '@/components/ui/AdminNavCard';
```

**3-card grid** (NEW shape, per UI-SPEC §5.5 — `grid-template-columns: repeat(3, 1fr)`):
```tsx
<div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 24,
    maxWidth: 1040,
    marginTop: 32,
  }}
>
  <AdminNavCard
    variant="coefficients"
    title={t('admin.nav.coefficients.title', lang)}
    description={t('admin.nav.coefficients.description', lang)}
    href={`/${adminSegment}/coefficients`}
    icon={Sliders}
    openLabel={t('admin.nav.open', lang)}
  />
  <AdminNavCard
    variant="partners"
    title={t('admin.nav.partners.title', lang)}
    description={t('admin.nav.partners.description', lang)}
    href={`/${adminSegment}/partners`}
    icon={Users}
    openLabel={t('admin.nav.open', lang)}
  />
  <AdminNavCard
    variant="history"
    title={t('admin.nav.history.title', lang)}
    description={t('admin.nav.history.description', lang)}
    href={`/${adminSegment}/history`}
    icon={History}
    openLabel={t('admin.nav.open', lang)}
  />
</div>
```

---

### `app/(admin)/[adminSegment]/coefficients/page.tsx` (MODIFY — 2-column layout)

**Analog:** `app/(authed)/proposals/new/verification/page.tsx` lines 281-341 (2-column 1040px grid with `minmax(0, 1fr) 360px`).

**Wrap the existing editor + sidebar in a 2-col grid:**
```tsx
<div style={{ maxWidth: 1040, margin: '0 auto' }}>
  {/* header (existing) */}
  <SeedBanner ... />
  <h1>...</h1>
  <p>...</p>

  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) 360px',
      gap: 24,
      alignItems: 'start',
      marginTop: 24,
    }}
  >
    <div>
      <CoefficientsEditor lang={lang} latestParams={latestParams} />
      <ExplainTool lang={lang} latestParams={latestParams} />
      {/* HistoryTable removed per UI-SPEC §5.6 recommendation — /history covers the full need */}
    </div>
    <CoefficientHistorySidebar lang={lang} adminSegment={adminSegment} />
  </div>
</div>
```

---

### `src/components/ui/Shell.tsx` (MODIFY — revert hotfix `6809b1f`)

**Analog:** itself. Lines 56-62 currently point `partners` and `history` at fallback routes; revert per D-03:

```tsx
// CURRENT (Phase 13 hotfix):
adminHrefs = {
  home: `/${adminSegment}`,
  coefficients: `/${adminSegment}/coefficients`,
  partners: `/${adminSegment}/accounts`,        // ← revert
  history: `/${adminSegment}/coefficients`,     // ← revert
};

// AFTER Phase 14 revert:
adminHrefs = {
  home: `/${adminSegment}`,
  coefficients: `/${adminSegment}/coefficients`,
  partners: `/${adminSegment}/partners`,
  history: `/${adminSegment}/history`,
};
```

Drop the 2 stale comment blocks at Shell.tsx lines 55-60 too.

---

### `src/components/ui/StatusChip.tsx` (MODIFY — extend union)

**Analog:** itself (line 14).

**Change:** extend the variant union to include `'invited'`. The render body templates `chip chip-${variant}` (line 19) so it automatically picks up the new `.chip-invited` CSS class.

```tsx
export interface StatusChipProps {
  variant: 'active' | 'draft' | 'expired' | 'disabled' | 'invited'; // ← added 'invited'
  label: string;
}
```

---

### `app/(admin)/[adminSegment]/partners/AccountsList.tsx` (MODIFY — moved + StatusChip + Link CTA)

**Analog:** itself (lines 354-371 for the chip; lines 276-291 for the button → Link swap).

**StatusChip integration** (REPLACE current chip rendering at lines 354-371):
```tsx
{/* Current (Phase 9): hand-rolled span */}
<span className={`chip ${isDisabled ? 'chip-disabled' : 'chip-active'}`}>
  {/* … icon + label … */}
</span>

{/* NEW Phase 14: */}
{invitedUserIds.has(p.id)
  ? <StatusChip variant="invited" label={t('chip.invited', lang)} />
  : isDisabled
    ? <StatusChip variant="disabled" label={t('admin.accounts.status.disabled', lang)} />
    : <StatusChip variant="active" label={t('admin.accounts.status.active', lang)} />}
```

**CTA button → Link swap** (REPLACE `<button onClick={openModal}>` at lines 276-290):
```tsx
{/* OLD: */}
<button ref={createBtnRef} type="button" className="btn-green" onClick={() => setShowCreate(true)}>
  <UserPlus … />
  {t('admin.accounts.create.btn', lang)}
</button>

{/* NEW: */}
<Link
  href={`/${adminSegment}/partners/new`}
  className="btn-green"
  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}
>
  <UserPlus size={16} strokeWidth={1.6} aria-hidden="true" />
  {t('admin.accounts.create.btn', lang)}
</Link>
```

D-10 disposition: keep the `CreatePartnerModal` import + the `{showCreate && <CreatePartnerModal …/>}` render block as shelf code (never triggered).

---

### `src/components/proposals/ProposalsList.tsx` + `app/(authed)/proposals/[id]/page.tsx` — StatusChip integration

**Analog:** `src/components/proposals/ProposalRow.tsx` lines 67-76 (chip render slot in ProposalRow already exists via `ValidityChip` / `DeletedChip`).

**ProposalsList.tsx** — replace ad-hoc chip rendering. The current `ProposalRow.tsx` renders `<ValidityChip>` / `<DeletedChip>` inline; Phase 14 D-27 swaps to `<StatusChip variant={deriveDisplayStatus(row)} label={…} />`. Add a new prop or extend `<ProposalRow>`:

```tsx
import { StatusChip } from '@/components/ui/StatusChip';
import { deriveDisplayStatus } from '@/lib/db/queries/proposals';

// inside ProposalRow (or ProposalsList map):
const display = deriveDisplayStatus(rowFull); // need full ProposalRow shape — extend ProposalRowDto if needed
<StatusChip variant={display} label={t(`chip.${display}` as DictKey, lang)} />
```

**`proposals/[id]/page.tsx`** — add chip next to title (header row already at lines 105-146, replace the existing chip block at 129-145 with StatusChip):
```tsx
<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
  <StatusChip
    variant={deriveDisplayStatus(proposal)}
    label={t(`chip.${deriveDisplayStatus(proposal)}` as DictKey, lang)}
  />
  <LanguageChip ... />
</div>
```

---

### `app/globals.css` (MODIFY — add `.chip-invited`)

**Analog:** `.chip-draft` at globals.css lines 371-374 (gold tint over 12% bg — identical chrome).

**Insert immediately after line 374 (after `.chip-draft` closing brace):**
```css
.chip-invited {
  background: rgba(224, 133, 48, 0.12);
  color: var(--gold);
}
```

---

### `next.config.ts` (MODIFY — 308 redirect for legacy /accounts URLs)

**No in-repo analog** — current `next.config.ts` (only 12 lines) has no `redirects` block. Reference Next.js 16 docs convention via `context7` if needed; the minimal idiom:

```ts
const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: { /* … */ },
  generateBuildId: async () => process.env.GIT_COMMIT_SHA ?? 'dev-build',
  async redirects() {
    return [
      {
        // D-02: 308 permanent redirect for v1.1 bookmarks
        source: '/:adminSegment/accounts/:path*',
        destination: '/:adminSegment/partners/:path*',
        permanent: true, // permanent: true emits 308 in Next.js
      },
    ];
  },
};
```

**Alternative path (per D-02):** add `app/(admin)/[adminSegment]/accounts/page.tsx` stub that calls `redirect()`:
```tsx
import { redirect } from 'next/navigation';
interface Props { params: Promise<{ adminSegment: string }>; }
export default async function AccountsRedirect({ params }: Props) {
  const { adminSegment } = await params;
  redirect(`/${adminSegment}/partners`); // Next.js default 307; for 308 use permanentRedirect
}
```

Planner picks one; UI-SPEC and CONTEXT both accept either approach.

---

### `src/lib/i18n/dictionaries.ts` (MODIFY — ~30 new keys × FR + EN)

**Analog:** the existing `admin.accounts.*`, `admin.coefficients.history.*`, `wizard.*` keys already in the dictionary. New keys live under the namespaces in 14-UI-SPEC.md §6.1-6.4:

- `admin.home.title` / `.subtitle`
- `admin.nav.coefficients.title` / `.description` (+ partners + history)
- `admin.nav.open`
- `partners.new.title` / `.subtitle` / `.section.personal` / `.section.company` / `.section.message`
- `partners.new.field.{firstName,lastName,email,companyName,siret,phone,message}` + `.placeholder` variants
- `partners.new.message.counter` / `.tooLong`
- `partners.new.cancel` / `.cancel.aria` / `.submit` / `.submit.spinner`
- `partners.new.toast.{success,error,error.duplicate}`
- `coefficients.history.{title,aria.label,empty,viewAll}`
- `history.{title,subtitle,view.detail,hide.detail,pagination.next,pagination.prev,close,empty,before.label,after.label,before.none,summary.label}`
- `chip.invited`

Add to BOTH `fr` and `en` dictionaries. Per UI-SPEC: i18n parity is enforced compile-time via `_EnHasAllFrKeys` (existing infrastructure).

---

## Shared Patterns (Cross-Cutting)

### Authentication / requireAdmin

**Source:** `src/lib/auth/require.ts` (existing)
**Apply to:** every Phase 14 admin route (`/partners/new`, `/history`, modified `/coefficients`, modified `/`, the legacy `/accounts` stub if used)

**Pattern** (from `accounts/page.tsx` lines 28-31):
```tsx
export default async function Page({ params }: PageProps) {
  await params; // PITFALL §1.1 — Next.js 16 async params
  await requireAdmin(); // AUTH-15 defense in depth
  const lang = await getCurrentLang();
  // … data fetches …
}
```

### Force-dynamic + metadata

**Source:** every admin server-component page (e.g. `accounts/page.tsx` lines 7-22, `coefficients/page.tsx` lines 24-30)
**Apply to:** every new admin route in Phase 14.

```tsx
// PITFALLS §1.6 — cookie/session-reading pages opt out of static rendering
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '… — Leasétic Matrice',
  robots: { index: false, follow: false }, // admin URL is hidden — defense in depth
};
```

### RHF + zodResolver + onBlur

**Source:** `CreatePartnerModal.tsx` lines 32-43 AND `ParametresFormCard.tsx` (consumed via outer `<ProposalFormProvider>`)
**Apply to:** `CreatePartnerForm.tsx`

```tsx
const form = useForm<Input, unknown, Values>({
  resolver: zodResolver(schema),
  mode: 'onBlur', // Phase 7 / 13 convention
  shouldFocusError: true,
  defaultValues: { /* all fields explicitly strung-initialized */ },
});
```

### ● bullet section header (.ctitle + .dot)

**Source:** `ParametresFormCard.tsx` lines 88-95 (matches Phase 11 chrome from globals.css)
**Apply to:** every new section header in Phase 14 (`/partners/new` 3 sections, `CoefficientHistorySidebar` header, etc.)

```tsx
<div className="ctitle">
  <span className="dot" style={{ background: 'var(--gd)' }} aria-hidden="true" />
  <span>{t('section.key', lang)}</span>
</div>
```

### Field error rendering pattern

**Source:** `CreatePartnerModal.tsx` lines 164-207 (consistent across all RHF forms in repo)
**Apply to:** every input on `CreatePartnerForm.tsx`

```tsx
aria-invalid={errors.field ? true : undefined}
aria-describedby={errors.field ? 'field-error-id' : undefined}
className={errors.field ? 'invalid' : ''}
{...register('field')}
// …
{errors.field?.message && (
  <p id="field-error-id" role="alert" className="error-msg">
    {t(errors.field.message as DictKey, lang)}
  </p>
)}
```

### Toast error / success pattern

**Source:** `AccountsList.tsx` lines 137-152 (sonner toast for create / reissue / reset)
**Apply to:** `CreatePartnerForm.tsx` submit handler, `/history` action errors.

```tsx
toast.success(t('partners.new.toast.success', lang));
// … or:
toast.error(t('partners.new.toast.error', lang));
```

### Cursor pagination

**Source:**
- Encode/decode: `src/lib/db/queries/coefficient-history.ts` lines 119-147 (`encodeCoefficientHistoryCursor` / `decodeCoefficientHistoryCursor`) — already shipped in Phase 12, just consume
- URL pattern: `app/(authed)/page.tsx` lines 25-65 (`?cursor=base64`)
- Server fetch: `src/lib/api/proposals/list.ts` `buildListResponse` (cursor in / hasMore + nextCursor out)

**Apply to:** `/history/page.tsx`. Sample shape already shown in §`/history/page.tsx` analog above.

### Vitest server-component test harness

**Source:** `app/(authed)/proposals/new/verification/page.test.tsx` lines 36-60 (hoisted mocks, redirect-throws pattern)
**Apply to:** `partners/new/page.test.tsx`, `history/page.test.tsx`, `CoefficientHistorySidebar.test.tsx`

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

vi.mock('server-only', () => ({}));

const { requireAdminMock, getCurrentLangMock, … } = vi.hoisted(() => ({ … }));

vi.mock('@/lib/auth/require', () => ({ requireAdmin: requireAdminMock }));
vi.mock('@/lib/i18n', () => ({ getCurrentLang: getCurrentLangMock, t: (k: string) => k }));
// …
```

### Vitest component test pattern

**Source:** `src/components/ui/AdminNavCard.test.tsx` lines 1-65, `src/components/ui/StatusChip.test.tsx` 1-50
**Apply to:** `CreatePartnerForm.test.tsx`, `CoefficientDiffPanel.test.tsx`

```tsx
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, within } from '@testing-library/react';
import { ComponentUnderTest } from './ComponentUnderTest';

afterEach(() => cleanup());

describe('ComponentUnderTest', () => {
  it('AC-XX-01: renders … with …', () => {
    const { container } = render(<ComponentUnderTest … />);
    const el = within(container).getByRole(…);
    expect(el).toHaveAttribute(…);
  });
});
```

### `force-dynamic` + admin metadata

(See §Force-dynamic + metadata above — repeat verbatim.)

---

## No-Analog (Fresh-Write) Files

| File | Role | Why fresh | Pattern source |
|---|---|---|---|
| `CoefficientDiffPanel.tsx` 2-column side-by-side layout | client component | no in-repo side-by-side diff; existing `HistoryDiff.tsx` is a single-column inline list | UI-SPEC §5.4 + reuse `computeDiffPairs` from `HistoryDiff.tsx` for the flatten step |
| `next.config.ts` `redirects()` block | config | repo's `next.config.ts` has no prior `redirects` block | Next.js 16 docs convention (planner: confirm via `context7` if signature ambiguous) |
| `CoefficientHistorySidebarRow` per-row inline expansion + Escape collapse | client component | `HistoryTable.tsx` does per-row expand but no per-row Escape handler | `CreatePartnerModal.tsx` lines 49-78 `Escape` keydown handler (focus-trap variant; drop the trap) |

---

## Metadata

**Analog search scope:**
- `app/(admin)/[adminSegment]/**` (existing admin routes)
- `app/(authed)/**` (wizard + proposal patterns; cursor URL convention)
- `src/components/ui/**` (Phase 11 primitives)
- `src/components/proposals/**` (StatusChip consumer pattern)
- `src/lib/db/queries/**` (cursor helpers, listInvitedPartners, listCoefficientHistory)
- `src/lib/admin/**` (server actions + createPartnerSchema)
- `src/lib/auth/require.ts` (requireAdmin)
- `app/globals.css` (.chip-* classes)

**Files scanned:** ~30 source files read or grepped.
**Pattern extraction date:** 2026-05-20
**Pattern coverage:** 19 / 19 new+modified files mapped (12 strong + 1 partial + 6 modifications-in-place).
