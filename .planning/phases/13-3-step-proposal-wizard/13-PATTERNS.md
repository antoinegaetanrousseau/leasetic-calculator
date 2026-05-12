# Phase 13: 3-Step Proposal Wizard — Pattern Map

**Mapped:** 2026-05-12
**Files analyzed:** 13 new + 2 modified = 15
**Analogs found:** 15 / 15 (every new/modified file has a strong codebase analog)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/(authed)/proposals/new/parametres/page.tsx` | route (server component) | request-response (cookie/session reads) | `app/(authed)/proposals/new/page.tsx` | exact (same family) |
| `app/(authed)/proposals/new/calcul/page.tsx` | route (server component) | request-response + compute | `app/(authed)/proposals/[id]/page.tsx` | role-match (read-only render of computed row) |
| `app/(authed)/proposals/new/verification/page.tsx` | route (server component) | request-response (2-column read-only) | `app/(authed)/proposals/[id]/page.tsx` | role-match (2-column detail layout) |
| `app/(authed)/proposals/new/page.tsx` (MODIFIED → redirect) | route (server component) | redirect | `src/lib/auth/require.ts` (`redirect('/login')`) | role-match (pattern: `redirect(...)` from `next/navigation`) |
| `app/(authed)/proposals/new/_components/WizardActionBar.tsx` | client component (form actions) | event-driven (`useTransition` + server action) | `src/components/proposals/DeleteButtonClient.tsx` | role-match (busy-state button + toast + router push) |
| `app/(authed)/proposals/new/_components/PlusDeDetailsAccordion.tsx` | client component (collapsible) | event-driven (open/close toggle) | `src/components/UserMenu.tsx` | role-match (closest open-state component with `aria-expanded`) |
| `app/(authed)/proposals/new/_components/PdfPreviewMock.tsx` | component (presentational) | none (pure render) | `src/components/ui/BrandLogo.tsx` + `src/components/ui/AdminNavCard.tsx` | role-match (pure presentational card) |
| `app/(authed)/proposals/new/_components/RecapSection.tsx` | component (presentational) | none (pure render) | `app/(authed)/proposals/[id]/page.tsx` rows section (`<dt>/<dd>` pairs) | role-match (label/value pairs in `.card`) |
| `app/(authed)/proposals/new/_actions/saveAndAdvance.action.ts` (or similar) | server action | event-driven (mutation + redirect) | `app/(admin)/[adminSegment]/coefficients/history-load-more.action.ts` | exact (only `.action.ts` server-action file in repo) |
| `app/(authed)/proposals/new/_actions/saveAsDraft.action.ts` | server action | event-driven (mutation + redirect) | same as above + `src/lib/admin/actions.ts` (auth+mutate+log) | exact |
| `app/(authed)/proposals/new/_actions/finalize.action.ts` OR `app/api/proposals/finalize/route.ts` | server action or API route | event-driven (atomic mutation + PDF render + blob upload + audit) | `app/api/proposals/route.ts` + `src/lib/api/proposals/submit.ts` | exact (full create pipeline) |
| `src/lib/i18n/dictionaries.ts` (MODIFIED) | dictionary | data (static) | same file (existing `'sidebar.nav.*'` namespace) | exact (just add a new `wizard.*` namespace) |
| Vitest test files (`*.test.tsx` colocated) | test | n/a | `src/components/ui/Stepper.test.tsx` | exact (Phase 11 convention) |
| `app/(authed)/proposals/new/_components/RecapSection.test.tsx` | test | n/a | `src/components/ui/Stepper.test.tsx` | exact |
| Route page tests (e.g. `parametres/page.test.tsx`) | test | n/a | `app/api/proposals/route-list.test.ts` | role-match (Next route-level integration test) |

---

## Pattern Assignments

### `app/(authed)/proposals/new/parametres/page.tsx` (server component, request-response)

**Analog:** `app/(authed)/proposals/new/page.tsx` (the v1.1 file Phase 13 retires — the imports + auth chain + duplicate-prefill + `<ProposalFormProvider>` wrap is a copy-and-adapt source).

**Imports + dynamic + metadata pattern** (analog lines 1-18):
```typescript
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import {
  ProposalForm,
  ProposalFormProvider,
} from '@/components/proposal/ProposalForm';
import { getLatestGlobalParams, getProposalById } from '@/lib/db/queries';
import { DuplicatePrefillToast } from '@/components/proposals/DuplicatePrefillToast';
import { getDefaultValidityDays, type ProposalInput } from '@/lib/calc';

// PITFALLS §1.6 — every cookie/session-reading page opts out of static rendering.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Nouvelle proposition — Leasétic Matrice',
};
```
Phase 13 adds `createDraft, updateDraft, getDraftById` from `@/lib/db/queries` and `redirect` from `next/navigation`.

**Page signature + `requireUser` + session-derived prefill** (analog lines 37-93):
```typescript
interface PageProps {
  searchParams: Promise<{ duplicate?: string; draft_id?: string }>;
}

export default async function NewProposalPage({ searchParams }: PageProps) {
  const { session } = await requireUser();
  const lang = await getCurrentLang();
  const sp = await searchParams;

  const u = session.user as {
    email: string;
    displayName?: string | null;
    name?: string | null;
  };
  const partnerName = u.displayName ?? u.name ?? '';

  const params = await getLatestGlobalParams();
  const coefficientsExpired = params === null;
  // ... derive defaultValidityDays from params
```
Phase 13 keeps the exact partner-name fallback chain (D-07) and reuses the `?duplicate=` handling block lines 80-93 verbatim — but routes through `createDraft` + `updateDraft({ inputs: source.inputs })` per D-25.

**Draft lifecycle (NEW pattern for step 1 — no exact analog; pattern derived from D-02 + `createDraft` signature):**
```typescript
// D-02: no ?draft_id= → mint one and 302-redirect so the URL is bookmarkable.
if (!sp.draft_id) {
  const newDraft = await createDraft({ userId: session.user.id, language: lang });
  // If ?duplicate= was also present, spread source.inputs into the new draft
  // (D-25 + D-26 win-rule), then redirect dropping ?duplicate=.
  if (sp.duplicate) {
    const source = await getProposalById(sp.duplicate);
    if (source && source.userId === session.user.id && !source.deletedAt) {
      const sourceInputs = source.inputs as Partial<ProposalInput>;
      await updateDraft(newDraft.id, session.user.id, {
        inputs: { ...sourceInputs, partnerName, partnerCo: '' /* D-07 overlay */ },
      });
    }
  }
  redirect(`/proposals/new/parametres?draft_id=${newDraft.id}${sp.duplicate ? '&duplicate=1' : ''}`);
}

// Resume existing draft (D-03 self-heal — invalid id → fall through to mint).
const draft = await getDraftById(sp.draft_id, session.user.id);
if (!draft) {
  redirect('/proposals/new/parametres'); // self-heal: clears ?draft_id, mints new
}
```
Note: `redirect()` from `next/navigation` is already used in `src/lib/auth/require.ts` line 49 and `line 59` — same import surface.

**Form mount pattern** (analog lines 95-137):
```typescript
return (
  <div>
    {sp.duplicate && <DuplicatePrefillToast lang={lang} />}
    <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--ink)' }}>
      {t('wizard.step1.title', lang)}
    </h1>
    <p style={{ fontSize: '16px', color: 'var(--muted)' }}>{t('wizard.step1.subtitle', lang)}</p>
    <Stepper currentStep={1} completedSteps={draft.inputs._completedSteps ?? []} lang={lang}
      hrefForStep={(n) => `/proposals/new/${['parametres','calcul','verification'][n-1]}?draft_id=${draft.id}`} />
    <ProposalFormProvider prefill={prefillFromDraft}>
      {/* step-1-only fields organized into 2 sections inside a single .card per D-05 */}
      <ParametresFormCard lang={lang} draftId={draft.id} />
      <PlusDeDetailsAccordion defaultOpen={!!draft.inputs._uiAccordionOpen}
        onToggle={(open) => persistAccordionOpenAction(draft.id, open)} lang={lang}>
        {/* 5 optional fields */}
      </PlusDeDetailsAccordion>
      <WizardActionBar currentStep={1} draftId={draft.id} {...} />
    </ProposalFormProvider>
  </div>
);
```

---

### `app/(authed)/proposals/new/calcul/page.tsx` (server component, request-response + compute)

**Analog:** `app/(authed)/proposals/[id]/page.tsx` (read-only render of a computed proposal — closest "show computed values inside `.card`s" analog).

**Imports + auth chain + lookup-or-redirect** (analog lines 1-49):
```typescript
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { formatCurrency, formatNumber } from '@/lib/i18n/format';
import { getDraftById, getLatestGlobalParams } from '@/lib/db/queries';
import { computeLoyer } from '@/lib/calc';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Résultat du calcul — Leasétic' };

export default async function CalculPage({ searchParams }: { searchParams: Promise<{ draft_id?: string }> }) {
  const { session } = await requireUser();
  const lang = await getCurrentLang();
  const sp = await searchParams;
  if (!sp.draft_id) redirect('/proposals/new/parametres'); // D-03 self-heal
  const draft = await getDraftById(sp.draft_id, session.user.id);
  if (!draft) redirect('/proposals/new/parametres');       // D-03 self-heal
```

**Server-side compute pattern** (taken from `src/lib/api/proposals/submit.ts` lines 95-120):
```typescript
const params = await getLatestGlobalParams();
const computeResult = computeLoyer({
  amountHT: inputs.amountHT,
  durationMonths: inputs.durationMonths,
  validityDays: params?.validityDays ?? 30,
  coefficients: params!.coefficients,
  commissionPct: parseNumeric(params!.commissionPct),
  maxAmount: parseNumeric(params!.maxAmount),
});
// computeResult.computed exposes: state, loyer, tranche, coefficientPct, commission, ...
```
This is the same computeLoyer entry point Phase 7's `LiveLoyerPreview` (lines 84-89) uses, but called server-side.

**Read-only card layout pattern** (analog `proposals/[id]/page.tsx` lines 51-60 — derive flags then render `.card`s with `<dt>/<dd>` rows; Phase 13 wraps row clusters in `<RecapSection>`).

---

### `app/(authed)/proposals/new/verification/page.tsx` (server component, 2-column read-only)

**Analog:** same `app/(authed)/proposals/[id]/page.tsx` for 2-column layout discipline + `app/(authed)/proposals/new/page.tsx` lines 121-128 for the grid-template-columns idiom Phase 13 reuses but at 640px / 360px split.

**2-column grid pattern** (analog lines 121-136):
```typescript
<div
  style={{
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 640px) minmax(0, 360px)',
    gap: 24,
    alignItems: 'start',
  }}
>
  {/* left column — 3 RecapSection cards (CLIENT, PROJET, CALCUL) */}
  <div>
    <RecapSection sectionTitle={t('wizard.section.client', lang)} rows={...} modifierLink={...} />
    <RecapSection sectionTitle={t('wizard.section.projet', lang)} rows={...} modifierLink={...} />
    <RecapSection sectionTitle={t('wizard.section.calcul', lang)} rows={...} modifierLink={...} />
  </div>
  {/* right column — PdfPreviewMock */}
  <PdfPreviewMock loyerDisplay={...} validityDays={...} lang={lang} />
</div>
```

---

### `app/(authed)/proposals/new/page.tsx` (MODIFIED → server-side redirect)

**Analog:** `src/lib/auth/require.ts` lines 49-52, 58-60 (uses `redirect()` from `next/navigation`).

**New body (REPLACE entire file with):**
```typescript
import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default function NewProposalLegacyRoute() {
  redirect('/proposals/new/parametres');
}
```
Preserves bookmarks per D-04. No `requireUser()` needed because `/proposals/new/parametres` runs it on entry.

---

### `app/(authed)/proposals/new/_components/WizardActionBar.tsx` (client, event-driven)

**Analog:** `src/components/proposals/DeleteButtonClient.tsx` — closest existing "client component that runs an async mutation + toast + router push" pattern.

**Imports + busy state + async handler pattern** (analog lines 1-43):
```typescript
'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { t, type Lang } from '@/lib/i18n/dictionaries';

export function WizardActionBar({ currentStep, draftId, onSaveDraft, primary, lang }: WizardActionBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      try {
        await onSaveDraft(); // server action — returns void or throws
        toast.success(t('wizard.toast.draft.saved', lang)); // 'Brouillon enregistré ✓'
        router.push('/'); // D-17 — redirect to partner home
      } catch {
        toast.error(t('wizard.toast.draft.error', lang));
      }
    });
  };

  return (
    <section className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {currentStep > 1 && (
        <Link href={`/proposals/new/${currentStep === 2 ? 'parametres' : 'calcul'}?draft_id=${draftId}`}
              aria-label={t('wizard.action.prev.aria', lang)}
              style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: 14.5, fontWeight: 500 }}>
          ← {t('wizard.action.prev', lang)}
        </Link>
      )}
      <button type="button" className="btn-out" onClick={handleSave} disabled={isPending}>
        {t('wizard.action.saveDraft', lang)}
      </button>
      <div style={{ flex: 1 }} />
      {/* Primary CTA — Link (steps 1-2) OR button (step 3 finalize) */}
      {primary.kind === 'link' ? (
        <Link href={primary.href} className="btn-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {primary.label}
        </Link>
      ) : (
        <button type="button" className="btn-green" disabled={primary.isSubmitting} onClick={primary.onClick}
                aria-busy={primary.isSubmitting} style={{ filter: primary.isSubmitting ? 'brightness(0.9)' : undefined }}>
          {primary.isSubmitting && <Loader2 size={16} className="animate-spin" />}
          {primary.isSubmitting ? primary.spinnerLabel : primary.label}
        </button>
      )}
    </section>
  );
}
```
Pattern lifted from `DeleteButtonClient` lines 14-43 (`useState busy` + `try/catch/finally` + `toast.success` + `router.push`). For finalize on step 3, prefer `useTransition` (already common in repo via `RetractableSidebar.tsx` line 23) so the CTA's pending state survives the server-action round trip cleanly.

---

### `app/(authed)/proposals/new/_components/PlusDeDetailsAccordion.tsx` (client, event-driven)

**Analog:** `src/components/UserMenu.tsx` lines 23-92 (only existing component with `aria-expanded` + Open/Close state). No exact accordion analog exists — adapt the `useState(open)` + `aria-expanded={open}` + `aria-controls` triad.

**Core pattern from UserMenu.tsx lines 23-70:**
```typescript
'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { t, type Lang } from '@/lib/i18n/dictionaries';

export function PlusDeDetailsAccordion({ defaultOpen, onToggle, lang, children }: PlusDeDetailsAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    onToggle(next); // fire-and-forget server action — persists to draft.inputs._uiAccordionOpen
  };

  return (
    <div>
      <button
        type="button"
        role="button"
        aria-expanded={open}
        aria-controls="plus-de-details-region"
        onClick={handleToggle}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'transparent', border: 'none', color: 'var(--teal)',
          fontSize: 14.5, fontWeight: 500, cursor: 'pointer', padding: 0,
        }}
      >
        <Plus size={16} strokeWidth={2.25} style={{
          transform: open ? 'rotate(45deg)' : 'rotate(0)',
          transition: 'transform 200ms ease-out',
        }} aria-hidden="true" />
        <span>{t('wizard.accordion.plusDeDetails', lang)}</span>
      </button>
      <div
        id="plus-de-details-region"
        role="region"
        style={{
          height: open ? 'auto' : 0,
          opacity: open ? 1 : 0,
          overflow: 'hidden',
          transition: 'height 200ms ease-out, opacity 200ms ease-out',
          marginTop: open ? 16 : 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
```
The `aria-expanded={open}` + `aria-controls` pattern is taken from `UserMenu.tsx:68`. The button reset-styling (`background: transparent`, `border: none`, `padding: 0`) is repo idiom across `Topbar.tsx` and `UserMenu.tsx`.

---

### `app/(authed)/proposals/new/_components/PdfPreviewMock.tsx` (presentational)

**Analog:** `src/components/ui/BrandLogo.tsx` for the logo block + `src/components/ui/AdminNavCard.tsx` for the `.card`-styled presentational pattern.

**Pure-render component skeleton:**
```typescript
import { BrandLogo } from '@/components/ui/BrandLogo';
import { t, type Lang } from '@/lib/i18n/dictionaries';

export interface PdfPreviewMockProps {
  loyerDisplay: string;
  validityDays: 15 | 30 | 60;
  lang: Lang;
}

export function PdfPreviewMock({ loyerDisplay, validityDays, lang }: PdfPreviewMockProps) {
  return (
    <div
      role="img"
      aria-label={t('wizard.pdfPreview.aria', lang)}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 24, width: '100%', maxWidth: 360,
      }}
    >
      <BrandLogo width={140} />
      <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--navy)', margin: '20px 0 4px' }}>
        {t('wizard.pdfPreview.title', lang)}
      </h3>
      <p style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--muted)', margin: 0 }}>
        {t('wizard.pdfPreview.ref', lang).replace('{days}', String(validityDays))}
      </p>
      {/* Gray bars — bg: var(--border), aria-hidden */}
      <div aria-hidden="true" style={{ marginTop: 24 }}>
        <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, width: '100%' }} />
        <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, width: '92%', marginTop: 8 }} />
        <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, width: '78%', marginTop: 8 }} />
      </div>
      {/* LOYER MENSUEL block — UPPERCASE label + green value */}
      <div style={{ marginTop: 28 }}>
        <div className="ctitle" style={{ fontSize: 11.8 }}>
          <span>{t('wizard.pdfPreview.loyerLabel', lang)}</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gd)' }}>{loyerDisplay}</div>
      </div>
    </div>
  );
}
```
`BrandLogo` import comes from `src/components/ui/BrandLogo.tsx` (Phase 11 shipped). `.ctitle` is the existing label-section-title utility (Phase 7 `globals.css`).

---

### `app/(authed)/proposals/new/_components/RecapSection.tsx` (presentational)

**Analog:** `app/(authed)/proposals/[id]/page.tsx` lines 51-60 (`<dt>` / `<dd>` pair rendering inside `.card`) + the `<div className="ctitle"><span className="dot" /><span>...</span></div>` header pattern from `ProposalForm.tsx` lines 213-219.

**Header + rows pattern:**
```typescript
import Link from 'next/link';
import type { ReactNode } from 'react';

export interface RecapSectionProps {
  sectionTitle: string;
  rows: Array<{ label: string; value: string | ReactNode }>;
  modifierLink?: { href: string; label: string };
  rowSublabels?: Record<number, string>;
}

export function RecapSection({ sectionTitle, rows, modifierLink, rowSublabels }: RecapSectionProps) {
  return (
    <section className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        {/* Header reuses the .ctitle / .dot pattern from ProposalForm.tsx line 213 */}
        <div className="ctitle">
          <span className="dot" style={{ background: 'var(--gd)' }} aria-hidden="true" />
          <span>{sectionTitle}</span>
        </div>
        {modifierLink && (
          <Link href={modifierLink.href}
                style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--teal)', textDecoration: 'none' }}>
            ← {modifierLink.label}
          </Link>
        )}
      </div>
      {rows.map((row, idx) => (
        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginTop: idx === 0 ? 0 : 12 }}>
          <div>
            <div style={{ fontSize: 11.2, fontWeight: 500, color: 'var(--muted)' }}>{row.label}</div>
            {rowSublabels?.[idx] && (
              <div style={{ fontSize: 11.2, fontWeight: 400, color: 'var(--muted)', marginTop: 2 }}>
                {rowSublabels[idx]}
              </div>
            )}
          </div>
          <div style={{ fontSize: 14.5, color: 'var(--ink)', textAlign: 'right' }}>{row.value}</div>
        </div>
      ))}
    </section>
  );
}
```
The `<div className="ctitle"><span className="dot" />...</div>` triad is copied verbatim from `ProposalForm.tsx:213-219`. The label/value pair styling matches `proposals/[id]/page.tsx` row idiom.

---

### Server actions — `_actions/*.action.ts` files

**Analog:** `app/(admin)/[adminSegment]/coefficients/history-load-more.action.ts` (the only `.action.ts` server-action file in the repo). The pattern is: `'use server'` directive at line 1 → `requireUser()` first → mutation through a Phase 12 helper → return value or `redirect()`.

**`saveAndAdvance.action.ts` pattern (analog full file lines 1-42):**
```typescript
'use server';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/require';
import { updateDraft } from '@/lib/db/queries';
import { proposalInputSchema } from '@/lib/calc';

export async function saveAndAdvanceAction(
  draftId: string,
  nextInputs: Record<string, unknown>,
  fromStep: 1 | 2,
): Promise<void> {
  const { session } = await requireUser(); // PITFALLS §7.3 — auth FIRST
  // Compute D-21 _completedSteps invalidation
  // (read current inputs, compare, trim _completedSteps to numbers < lowestChangedStep)
  const merged = { ...nextInputs, _completedSteps: deriveCompletedSteps(nextInputs, fromStep) };
  const updated = await updateDraft(draftId, session.user.id, { inputs: merged });
  if (!updated) {
    // Cross-user, not-a-draft, or soft-deleted → self-heal redirect (D-03)
    redirect('/proposals/new/parametres');
  }
  const nextSlug = fromStep === 1 ? 'calcul' : 'verification';
  redirect(`/proposals/new/${nextSlug}?draft_id=${draftId}`);
}
```

**`saveAsDraft.action.ts` pattern (D-17):**
```typescript
'use server';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/require';
import { updateDraft } from '@/lib/db/queries';

export async function saveAsDraftAction(draftId: string, inputs: Record<string, unknown>): Promise<void> {
  const { session } = await requireUser();
  await updateDraft(draftId, session.user.id, { inputs });
  redirect('/'); // D-17 → partner home; toast surfaced from the client after revalidation
}
```

**`finalize` — server action OR API route (recommendation: API route mirrors Phase 8):**

If as a route: clone shape from `app/api/proposals/route.ts` (full file lines 1-95):
```typescript
// app/api/proposals/finalize/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/require';
import { getCurrentLang } from '@/lib/i18n';
// ... mirror the POST handler

export const runtime = 'nodejs';     // @react-pdf/renderer needs Node APIs (analog line 11)
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    const { session } = await requireUser();
    userId = session.user.id;
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  // ... call a new `finalizeWizard({ userId, draftId, language })` helper modelled on
  //     `src/lib/api/proposals/submit.ts` lines 60-120 — but the helper calls
  //     `finalizeDraft(draftId, userId, { lcRef, idempotencyKey, paramsSnapshot, computed,
  //      pdfBlobKey, pdfSha256, pdfSizeBytes, pdfGeneratedAt })` from
  //     `src/lib/db/queries/proposals.ts:450` INSTEAD of `createProposal`.
}
```
The 8-step pipeline (D-16) is essentially `src/lib/api/proposals/submit.ts` lines 60-120 with one substitution: replace `createProposal` + `finalizePdfBlobOnProposal` with the single-shot `finalizeDraft` call (which atomically flips status='draft'→'active' and writes all 8 columns + the `audit_log proposal.create` entry — see `proposals.ts:450-493`).

---

### `src/lib/i18n/dictionaries.ts` (MODIFIED — add ~30 wizard keys)

**Analog:** same file, existing `'sidebar.nav.*'` namespace (lines 41-54) and `'proposal.toast.*'` namespace.

**Pattern:**
```typescript
// Insert into both `fr` and `en` blocks (compile-time `_EnHasAllFrKeys` enforcement, file header comment lines 14-15):
'wizard.step1.title': 'Paramètres du projet',
'wizard.step1.subtitle': 'Renseignez les paramètres du projet pour calculer le loyer.',
'wizard.step2.title': 'Résultat du calcul',
'wizard.step2.subtitle': 'Voici le loyer mensuel calculé selon les paramètres du projet. Vérifiez avant de continuer.',
'wizard.step3.title': 'Vérifier la proposition',
'wizard.step3.subtitle': 'Vérifiez les informations puis cliquez pour générer le PDF.',
'wizard.section.informationsClient': 'INFORMATIONS CLIENT',
'wizard.section.detailsProjet': 'DÉTAILS DU PROJET',
'wizard.section.parametresSaisis': 'PARAMÈTRES SAISIS',
'wizard.section.detailCalcul': 'DÉTAIL DU CALCUL',
'wizard.section.client': 'CLIENT',
'wizard.section.projet': 'PROJET',
'wizard.section.calcul': 'CALCUL',
'wizard.accordion.plusDeDetails': '+ Plus de détails (facultatif)',
'wizard.action.prev': 'Précédent',
'wizard.action.prev.aria': 'Étape précédente',
'wizard.action.saveDraft': 'Enregistrer comme brouillon',
'wizard.action.continueToCalcul': 'Continuer vers le calcul →',
'wizard.action.continueToVerification': 'Continuer vers la vérification →',
'wizard.action.finalize': 'Confirmer & Générer le PDF',
'wizard.action.finalize.spinner': 'Génération en cours…',
'wizard.action.modifier': '← Modifier',
'wizard.toast.draft.saved': 'Brouillon enregistré ✓',
'wizard.toast.draft.error': 'Erreur lors de l\'enregistrement. Réessayez.',
'wizard.toast.finalize.success': 'Proposition générée ✓',
'wizard.toast.finalize.error': 'Erreur lors de la génération. Réessayez.',
'wizard.pdfPreview.title': 'Proposition de financement',
'wizard.pdfPreview.ref': 'Réf. LC-2026-XXX · {days} jours de validité',
'wizard.pdfPreview.loyerLabel': 'LOYER MENSUEL',
'wizard.pdfPreview.aria': 'Aperçu de la proposition à générer',
'wizard.loyer.mensuel.label': 'LOYER MENSUEL',
'wizard.loyer.mensuel.sub': 'par mois pendant {months} mois',
'wizard.commission.parenthetical': '(non visible client)',
```
EN parity required by the compile-time `_EnHasAllFrKeys` type check (file header lines 14-15).

---

### Vitest test files (colocated `*.test.tsx`)

**Analog:** `src/components/ui/Stepper.test.tsx` — Phase 11 convention is colocated tests.

**Test file skeleton (analog lines 1-33):**
```typescript
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { WizardActionBar } from './WizardActionBar';

afterEach(() => cleanup());

describe('WizardActionBar', () => {
  it('renders Précédent link on step 2', () => {
    const { container } = render(
      <WizardActionBar currentStep={2} draftId="abc" onSaveDraft={() => Promise.resolve()}
        primary={{ kind: 'link', href: '/x', label: 'Suivant' }} lang="fr" />
    );
    expect(screen.getByLabelText(/étape précédente/i)).toBeInTheDocument();
  });

  it('omits Précédent link on step 1', () => {
    render(<WizardActionBar currentStep={1} draftId="abc" onSaveDraft={() => Promise.resolve()}
        primary={{ kind: 'link', href: '/x', label: 'Suivant' }} lang="fr" />);
    expect(screen.queryByLabelText(/étape précédente/i)).not.toBeInTheDocument();
  });
});
```
The `afterEach(() => cleanup())` + `describe/it` + `aria-current`/`aria-disabled` assertion shape is copied verbatim from `Stepper.test.tsx`.

---

## Shared Patterns

### Authentication (every server-rendered wizard route + every server action)

**Source:** `src/lib/auth/require.ts:47-65` (`requireUser` redirects to `/login` on no session).
**Apply to:** All 3 wizard route pages + all 3 server actions + the finalize API route.

```typescript
const { session } = await requireUser(); // FIRST — before any DB read (PITFALLS §7.3)
```
For API routes, wrap in try/catch to translate the `redirect()` throw into 401 JSON (analog `app/api/proposals/route.ts:18-25`).

### `export const dynamic = 'force-dynamic'`

**Source:** `app/(authed)/proposals/new/page.tsx:14` ("PITFALLS §1.6 — every cookie/session-reading page opts out of static rendering").
**Apply to:** all 3 new wizard route pages + the finalize API route.

### Toast + redirect on mutation success

**Source:** `src/components/proposals/DeleteButtonClient.tsx:30-37` (sonner `toast.success` + `router.push`).
**Apply to:** `WizardActionBar` save-draft handler + finalize success branch.

```typescript
toast.success(t('wizard.toast.draft.saved', lang));
router.push('/');
```

### Error handling (mutation client side)

**Source:** `DeleteButtonClient.tsx:27-29, 38-42` (`try/catch/finally` + bounded error toast).
**Apply to:** every `WizardActionBar` mutation handler.

### `requireUser()` in API routes (redirect→401 translation)

**Source:** `app/api/proposals/route.ts:18-25` — wrap `requireUser()` in try/catch and translate the redirect-throw into a `NextResponse.json({ error: 'unauthorized' }, { status: 401 })`. Apply to the finalize API route.

### Server-action shape

**Source:** `app/(admin)/[adminSegment]/coefficients/history-load-more.action.ts:1-42` (`.action.ts` file with `'use server'` directive + auth-first + bounded throw on invalid input).
**Apply to:** all wizard `_actions/*.action.ts` files. Note: `src/lib/admin/actions.ts:96-130` is the deeper analog for "auth → primitive → writeAuditLog → return" — Phase 13's finalize follows that pattern but the audit-log write is INSIDE `finalizeDraft` (already done by Phase 12 — `proposals.ts:484-490`), so server-side wizard finalize must NOT write a second audit entry.

### RHF + `useFormContext` consumption inside step-1 sub-components

**Source:** `ProposalForm.tsx:126-134`:
```typescript
const form = useFormContext<ProposalFormValues>();
const { register, handleSubmit, control, setValue, reset, formState: { errors, isSubmitting } } = form;
```
Apply to: the step-1 form rendered inside `<ProposalFormProvider>`. Reuse the existing field components (`DurationSegmented`, `NumberInputAmount`, `PhoneInput`, `SirenInput`, `YesNoToggle`) per the Phase 7 idiom unchanged.

### `<DuplicatePrefillToast>` mount

**Source:** `app/(authed)/proposals/new/page.tsx:98`:
```typescript
{sp.duplicate && <DuplicatePrefillToast lang={lang} />}
```
Apply to: step-1 only. Phase 13 reuses verbatim; the toast strips the `?duplicate=` flag from URL on first read (existing behavior, `DuplicatePrefillToast.tsx:36-39`).

### `<Stepper>` mounting

**Source:** `src/components/ui/Stepper.tsx:47-156` ships shipped Phase 11.
**Apply to:** all 3 wizard route pages.

```typescript
<Stepper
  currentStep={1} // 1 | 2 | 3 per route
  completedSteps={(draft.inputs._completedSteps ?? []) as number[]}
  lang={lang}
  hrefForStep={(n) => `/proposals/new/${['parametres','calcul','verification'][n-1]}?draft_id=${draft.id}`}
/>
```
Default in-component labels (`['Paramètres', 'Calcul', 'Vérification']` FR / `['Parameters', 'Calculation', 'Verification']` EN) are sufficient — no `stepLabels` override per `13-CONTEXT.md` `<specifics>`.

### `.card` + `.ctitle` + `.dot` + `.fld` + `.btn-green` + `.btn-out` + `.error-msg`

**Source:** `app/globals.css` + `ProposalForm.tsx:212-220` (canonical `.card > .ctitle > .dot + .fld` rendering).
**Apply to:** every new wizard surface. NO new CSS in Phase 13 — only consume existing classes.

---

## No Analog Found

Every Phase 13 file has at least a role-match analog. The CSS-mock PDF preview's "gray placeholder bars" pattern has no exact precedent in the codebase (the closest is loading-skeleton-like rendering, which the repo does not currently use), but the pattern is trivially expressible with `var(--border)` backgrounds inline — no skeleton library needed.

The "in-component `useState`-driven open/close + smooth height animation" pattern for `<PlusDeDetailsAccordion>` has only `UserMenu.tsx`'s `useState(open)` + click-outside-to-close as a partial analog (the menu doesn't animate height). The 200ms ease-out height transition is a fresh-write per UI-SPEC §5.2.

---

## Metadata

**Analog search scope:**
- `/Users/antoinerousseau/Developer/leasetic-calculator/app/` (all route segments, API routes, dev components)
- `/Users/antoinerousseau/Developer/leasetic-calculator/src/components/` (all UI + proposal + proposals)
- `/Users/antoinerousseau/Developer/leasetic-calculator/src/lib/auth/`, `src/lib/admin/`, `src/lib/api/`, `src/lib/db/queries/`
- `/Users/antoinerousseau/Developer/leasetic-calculator/src/lib/i18n/dictionaries.ts`

**Files scanned (Read):** 12 (`new/page.tsx`, `ProposalForm.tsx`, `Stepper.tsx`, `Stepper.test.tsx`, `require.ts`, `proposals.ts:370-568`, `DuplicatePrefillToast.tsx`, `DeleteButtonClient.tsx`, `UserMenu.tsx`, `RetractableSidebar.tsx:1-120`, `LiveLoyerPreview.tsx:1-120`, `proposals/[id]/page.tsx:1-60`, `admin/actions.ts:1-120`, `history-load-more.action.ts`, `api/proposals/route.ts`, `api/proposals/submit.ts:1-120`, `i18n/dictionaries.ts:1-60`)

**Files grep-located but not fully read:** 4 (`globals.css` — already in CONTEXT, BrandLogo, AdminNavCard, EmbeddedPdfPreview — all role-match referenced)

**Pattern extraction date:** 2026-05-12
