# Phase 9: Admin Surface — Pattern Map

**Mapped:** 2026-05-09
**Files analyzed:** 12 new/modified files
**Analogs found:** 12 / 12

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/admin/actions.ts` | service | request-response | `src/lib/auth/actions.ts` | exact |
| `app/(admin)/[adminSegment]/page.tsx` | page | request-response | `app/(authed)/page.tsx` | role-match |
| `app/(admin)/[adminSegment]/coefficients/page.tsx` | page | CRUD | `app/(authed)/proposals/new/page.tsx` | exact |
| `app/(admin)/[adminSegment]/coefficients/CoefficientsEditor.tsx` | component | CRUD | `src/components/proposal/ProposalForm.tsx` | exact |
| `app/(admin)/[adminSegment]/coefficients/HistoryTable.tsx` | component | CRUD | `src/components/proposals/ProposalsList.tsx` + `LoadMoreButton.tsx` | role-match |
| `app/(admin)/[adminSegment]/coefficients/ExplainTool.tsx` | component | request-response | `src/components/proposal/LiveLoyerPreview.tsx` | exact |
| `app/(admin)/[adminSegment]/accounts/page.tsx` | page | CRUD | `app/(authed)/page.tsx` | role-match |
| `app/(admin)/[adminSegment]/accounts/AccountsList.tsx` | component | CRUD | `src/components/proposals/ProposalsList.tsx` | role-match |
| `app/(admin)/[adminSegment]/accounts/CreatePartnerModal.tsx` | component | request-response | `src/components/InviteUrlModal.tsx` + `src/components/proposal/ProposalForm.tsx` | partial |
| `src/lib/db/queries/users.ts` | service | CRUD | `src/lib/db/queries/proposals.ts` | role-match |
| `src/lib/db/queries/audit-log.ts` (extend) | service | CRUD | self (existing file) | exact |
| `src/lib/db/queries/global-params.ts` (extend) | service | CRUD | `src/lib/db/queries/proposals.ts` (`listProposalsByUser`) | role-match |

---

## Pattern Assignments

### `src/lib/admin/actions.ts` (service, request-response)

**Analog:** `src/lib/auth/actions.ts`

This file wraps each Phase 6 auth primitive with `requireAdmin()` + `writeAuditLog()` per D-09-09. The Phase 6 file is the direct pattern to copy from — it already shows the `'use server'`, the import layout, the JSDoc conventions, and the `requireAdmin()` guard structure.

**Full file directive + imports pattern** (lines 1–34):
```typescript
'use server';

/**
 * Admin-layer action wrappers (Phase 9 ADMIN-08 / D-09-09).
 *
 * PITFALLS §7.3 ordering — every exported function calls requireAdmin() as
 * the FIRST await before any DB access or auth primitive call.
 *
 * D-09-09b ADMIN-09: ONLY 'global_params.update' payload may include
 * commission_pct. Every other wrapper payload MUST NOT echo it.
 */

import { requireAdmin } from '@/lib/auth/require';
import {
  disableUser,
  reEnableUser,
  createInvitation,
  createPasswordReset,
  type InviteResult,
  type ResetResult,
} from '@/lib/auth/actions';
import { insertGlobalParams } from '@/lib/db/queries/global-params';
import { writeAuditLog } from '@/lib/db/queries/audit-log';
import type { NewGlobalParamsRow } from '@/db/schema';
```

**Core wrapper pattern** (lines 58–95 in `src/lib/auth/actions.ts` — the `disableUser` and `reEnableUser` shapes):
```typescript
// Pattern: requireAdmin first, then primitive, then audit. Never reorder.
export async function adminDisableUser(
  userId: string,
  opts?: { note?: string },
): Promise<void> {
  const { session } = await requireAdmin();                      // FIRST — AUTH-15
  await disableUser(userId);                                     // Phase 6 primitive unchanged
  await writeAuditLog({
    actorId: session.user.id,
    action: 'user.disable',
    targetType: 'user',
    targetId: userId,
    payload: { note: opts?.note ?? null },
    // NOTE: payload MUST NOT include commission_pct — D-09-09b / ADMIN-09
  });
}
```

**`adminUpdateGlobalParams` shape** — unique to this file, modeled on the same wrapper skeleton:
```typescript
export interface AdminUpdateGlobalParamsArgs {
  commissionPct: string;
  maxAmount: string;
  validityDays: number;
  coefficients: { t1: ...; t2: ...; t3: ...; t4: ... };
  note?: string;
  before: GlobalParamsRow;   // diff source — caller (CoefficientsEditor) provides the latest loaded row
}

export async function adminUpdateGlobalParams(
  args: AdminUpdateGlobalParamsArgs,
): Promise<GlobalParamsRow> {
  const { session } = await requireAdmin();                      // FIRST
  const newRow = await insertGlobalParams({
    commissionPct: args.commissionPct,
    maxAmount: args.maxAmount,
    validityDays: args.validityDays,
    coefficients: args.coefficients,
    note: args.note ?? null,
    createdBy: session.user.id,
  });
  const changedFields = computeChangedFields(args.before, newRow); // helper below
  await writeAuditLog({
    actorId: session.user.id,
    action: 'global_params.update',
    targetType: 'global_params',
    targetId: newRow.id,
    payload: {
      changed_fields: changedFields,
      // D-09-09b: ONLY this action's payload may include commission_pct
      before: { commissionPct: args.before.commissionPct, /* … */ },
      after:  { commissionPct: newRow.commissionPct, /* … */ },
    },
  });
  return newRow;
}
```

**`requireAdmin()` return value access** (lines 74–79 of `src/lib/auth/require.ts`):
```typescript
// requireAdmin returns { session } — destructure and use session.user.id as actorId
export async function requireAdmin(): Promise<{ session: RequireUserResult['session'] }> {
  const { session, role } = await requireUser();
  if (role !== 'admin') { notFound(); }
  return { session };
}
```

---

### `app/(admin)/[adminSegment]/page.tsx` (page, request-response) — MODIFY EXISTING

**Analog:** existing `app/(admin)/[adminSegment]/page.tsx` (the placeholder being replaced) and `app/(authed)/page.tsx` for h1/p heading pattern.

**Full existing file to replace** (`app/(admin)/[adminSegment]/page.tsx`, lines 1–43):
```typescript
import { requireAdmin } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';   // PITFALLS §1.6 — KEEP

export default async function AdminHomePage() {
  await requireAdmin();                   // AUTH-15 independent check — KEEP
  const lang = await getCurrentLang();

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.5rem' }}>
        {t('shell.topbar.admin.badge', lang)}
      </h1>
      {/* Phase 9 replaces everything below this comment */}
    </div>
  );
}
```

**Target pattern** — add two card-style nav links (UI-SPEC §3.0.1). Copy heading pattern from `app/(authed)/page.tsx` lines 79–99:
```typescript
// From app/(authed)/page.tsx lines 79-99 — h1 + subtitle pattern:
<h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
  {t('admin.home.title', lang)}
</h1>
<p style={{ fontSize: '14.5px', fontWeight: 400, color: 'var(--muted)', marginBottom: 24 }}>
  {t('admin.home.subtitle', lang)}
</p>

// Two-card grid (UI-SPEC §3.0.1):
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
  <Link href={`/${adminSegment}/coefficients`}>
    <div className="card admin-nav-card">
      <Settings2 size={48} strokeWidth={1.4} color="var(--teal)" aria-hidden="true" />
      <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--ink)', marginTop: 12 }}>
        {t('admin.home.coefficients.title', lang)}
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 4 }}>
        {t('admin.home.coefficients.sub', lang)}
      </div>
    </div>
  </Link>
  {/* same for accounts card with Users icon */}
</div>
```

**Note:** `adminSegment` must be extracted from `params` (async, PITFALL §1.1). Copy from layout.tsx line 36:
```typescript
const { adminSegment } = await params;
```

---

### `app/(admin)/[adminSegment]/coefficients/page.tsx` (page, CRUD)

**Analog:** `app/(authed)/proposals/new/page.tsx`

This is the canonical server-component-reads-data → passes-as-props-to-client pattern.

**Full imports + directive pattern** (lines 1–18 of `app/(authed)/proposals/new/page.tsx`):
```typescript
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/require';   // → change to requireAdmin
import { getCurrentLang, t } from '@/lib/i18n';
import { getLatestGlobalParams } from '@/lib/db/queries';
// … + the new Phase 9 query for history:
import { listGlobalParamsHistory } from '@/lib/db/queries/global-params';

export const dynamic = 'force-dynamic';  // PITFALLS §1.6 — mandatory
```

**Auth + data-fetch pattern** (lines 41–57):
```typescript
export default async function CoefficientsPage({ params }: { params: Promise<{ adminSegment: string }> }) {
  const { adminSegment } = await params;       // PITFALL §1.1
  await requireAdmin();                        // AUTH-15 independent — not delegating to layout

  const lang = await getCurrentLang();
  const latestParams = await getLatestGlobalParams();
  const { rows: historyRows, hasMore, nextCursor } = await listGlobalParamsHistory({ limit: 20 });

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
        {t('admin.coefficients.page.title', lang)}
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: 24 }}>
        {t('admin.coefficients.page.sub', lang)}
      </p>

      {/* Client component — gets latestParams as props (no extra fetch) */}
      <CoefficientsEditor lang={lang} latestParams={latestParams} adminSegment={adminSegment} />

      {/* Pure-client explain tool — reuses latestParams from server component */}
      <ExplainTool lang={lang} latestParams={latestParams} />

      {/* History — server-rendered initial batch + client LoadMore */}
      <HistoryTable lang={lang} initialRows={historyRows} hasMore={hasMore} nextCursor={nextCursor} />
    </div>
  );
}
```

---

### `app/(admin)/[adminSegment]/coefficients/CoefficientsEditor.tsx` (component, CRUD)

**Analog:** `src/components/proposal/ProposalForm.tsx`

This is the RHF + Zod + sonner client component pattern. Copy it very closely.

**Full directive + imports pattern** (lines 1–19 of `src/components/proposal/ProposalForm.tsx`):
```typescript
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import type { z } from 'zod';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { adminUpdateGlobalParams } from '@/lib/admin/actions';
import type { GlobalParamsRow } from '@/db/schema';
```

**`useForm` initialization pattern** (lines 54–78 of `ProposalForm.tsx` — the `ProposalFormProvider`):
```typescript
// D-09 coefficient editor: same-schema-client+server discipline (SHELL-11)
// Define a Zod schema in a shared location (e.g. src/lib/admin/schemas.ts)
// and pass it to zodResolver here.
const form = useForm<CoeffEditorValues>({
  resolver: zodResolver(coeffEditorSchema),
  mode: 'onBlur',          // blur validation — same as ProposalForm
  shouldFocusError: true,
  defaultValues: {
    commissionPct: latestParams?.commissionPct ?? '',
    maxAmount: latestParams?.maxAmount ?? '',
    validityDays: latestParams?.validityDays ?? 30,
    coefficients: latestParams?.coefficients ?? { t1: {...}, t2: {...}, t3: {...}, t4: {...} },
    note: '',
  },
});
const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = form;
```

**Sonner promise pattern for server action** (lines 142–185 of `ProposalForm.tsx` — `onSubmit`):
```typescript
// Pattern: sonner.promise wraps the server action call (NOT a fetch — it IS the server action)
const onSubmit = (data: CoeffEditorValues): void => {
  const promise = (async () => {
    return adminUpdateGlobalParams({ ...data, before: latestParams });
  })();

  toast.promise(promise, {
    loading: t('admin.coefficients.save.loading', lang),
    success: () => {
      setShowConfirmModal(false);
      return t('admin.coefficients.save.success', lang);
    },
    error: () => t('admin.coefficients.save.error', lang),
  });
};
```

**Confirmation modal trigger pattern** — CoefficientsEditor opens the modal BEFORE calling the server action. Modal computes diff client-side at modal-open time (D-09-01). The actual server action fires when admin clicks "Confirmer":
```typescript
// onSubmit intercept: compute diff and open modal; server action fires on Confirm
const [showConfirmModal, setShowConfirmModal] = useState(false);
const [pendingData, setPendingData] = useState<CoeffEditorValues | null>(null);

const onOpenConfirm = (data: CoeffEditorValues) => {
  setPendingData(data);
  setShowConfirmModal(true);
};

const onConfirm = () => {
  if (!pendingData) return;
  // Now fire the sonner.promise + server action pattern above
  onSubmit(pendingData);
};
```

**`.fld` field pattern with `aria-invalid`** (lines 222–246 of `ProposalForm.tsx`):
```typescript
<div className="fld">
  <label htmlFor="commission-pct">
    {t('admin.coefficients.commission.label', lang)}
    <span className="req" aria-hidden="true">*</span>
  </label>
  <div className="ieu">
    <input
      id="commission-pct"
      type="text"
      inputMode="decimal"
      placeholder="5.00"
      aria-invalid={!!errors.commissionPct || undefined}
      aria-describedby={errors.commissionPct ? 'commission-pct-error' : undefined}
      className={errors.commissionPct ? 'invalid' : ''}
      {...register('commissionPct')}
    />
    <span className="suffix">%</span>
  </div>
  {errors.commissionPct && (
    <p id="commission-pct-error" role="alert" className="error-msg">
      {t(errors.commissionPct.message as DictKey, lang)}
    </p>
  )}
</div>
```

**`.card` section chrome** (lines 211–213 of `ProposalForm.tsx`):
```typescript
<section className="card" style={{ marginBottom: 16 }}>
  <div className="ctitle">
    <span className="dot" style={{ background: 'var(--gd)' }} aria-hidden="true" />
    <span>{t('admin.coefficients.editor.title', lang)}</span>
  </div>
  {/* fields here */}
</section>
```

**Save button disabled on no-change** (formState.isDirty check):
```typescript
<button
  type="submit"
  className="btn-green"
  disabled={isSubmitting || !isDirty}
  style={{ opacity: (isSubmitting || !isDirty) ? 0.6 : 1 }}
>
  {t('admin.coefficients.save.btn', lang)}
</button>
{!isDirty && (
  <span style={{ fontSize: 13, color: 'var(--muted)' }}>
    {t('admin.coefficients.save.noop', lang)}
  </span>
)}
```

---

### `app/(admin)/[adminSegment]/coefficients/HistoryTable.tsx` (component, CRUD)

**Analogs:** `src/components/proposals/ProposalsList.tsx` (cursor-paginated list orchestrator) + `src/components/proposals/LoadMoreButton.tsx` (Load more button pattern)

**Full directive + imports pattern** (lines 1–10 of `ProposalsList.tsx`):
```typescript
'use client';

import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { formatDate } from '@/lib/i18n/format';
import type { GlobalParamsHistoryRow } from '@/lib/db/queries/global-params';
```

**Cursor state + append pattern** (lines 29–37 of `ProposalsList.tsx`):
```typescript
// Re-mounts (key={}) are NOT needed here — admin doesn't have URL search filters
const [rows, setRows] = useState<GlobalParamsHistoryRow[]>(initialRows);
const [hasMore, setHasMore] = useState(initialHasMore);
const [cursor, setCursor] = useState(initialNextCursor);

const onAppend = (result: { rows: GlobalParamsHistoryRow[]; hasMore: boolean; nextCursor: string | null }) => {
  setRows((prev) => [...prev, ...result.rows]);
  setHasMore(result.hasMore);
  setCursor(result.nextCursor);
};
```

**Load more button implementation** (lines 17–67 of `LoadMoreButton.tsx`):
```typescript
// NOTE: Phase 9 history load-more fires a server action (not a fetch to /api/...)
// because there is no public API route — the call goes through an admin server action
// that calls listGlobalParamsHistory() with the cursor.
const onClick = async () => {
  if (!cursor || loading) return;
  setLoading(true);
  try {
    // Call admin server action directly (NOT a fetch) — stays inside admin auth layer
    const result = await listGlobalParamsHistoryAction({ cursor, limit: 20 });
    onAppend(result);
  } catch {
    toast.error(t('admin.coefficients.history.load.error', lang));
  } finally {
    setLoading(false);
  }
};

// Button renders as btn-out (same pattern as LoadMoreButton.tsx lines 47-67):
<button type="button" className="btn-out" onClick={onClick} disabled={loading}>
  {loading ? <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={17} />}
  {loading ? t('proposal.list.load.more.loading', lang) : t('admin.coefficients.history.load.more', lang)}
</button>
```

**History row `<table>` pattern** — copy from `ProposalRow.tsx` for the row structure but use `<tr>/<td>` instead of `<Link>`:
```typescript
// Each history row renders a <tr> inside a <table>
// Date cell uses formatDate (line 3 of ProposalRow.tsx import, line 66 use):
<td style={{ fontSize: 13, color: 'var(--ink)', padding: '14px 12px', verticalAlign: 'top' }}>
  {formatDate(new Date(row.effectiveFrom), lang, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })}
</td>
```

**Empty state pattern** (lines 39–89 of `ProposalsList.tsx` — `EmptyBlock` component):
```typescript
// Phase 9 history empty state:
function EmptyBlock({ lang }: { lang: Lang }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '40px 16px', textAlign: 'center', gap: 12 }}>
      <p style={{ fontSize: 14.5, color: 'var(--muted)' }}>
        {t('admin.coefficients.history.empty', lang)}
      </p>
    </div>
  );
}
```

---

### `app/(admin)/[adminSegment]/coefficients/ExplainTool.tsx` (component, request-response)

**Analog:** `src/components/proposal/LiveLoyerPreview.tsx`

This is the closest analog — pure-client compute via `computeLoyer()` with reactive form inputs + formatted output.

**Full directive + imports pattern** (lines 1–17 of `LiveLoyerPreview.tsx`):
```typescript
'use client';

import { useMemo, useState } from 'react';
import { computeLoyer, tKey, type ComputeLoyerResult } from '@/lib/calc';
import { formatCurrency, formatNumber } from '@/lib/i18n/format';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import type { GlobalParamsRow } from '@/db/schema';
```

**Props interface pattern** (lines 19–27 of `LiveLoyerPreview.tsx`):
```typescript
export interface ExplainToolProps {
  lang: Lang;
  /** Latest saved global_params — passed from the page server component; no extra fetch. */
  latestParams: GlobalParamsRow;  // D-09-08: reuses the editor's data flow
}
```

**`useMemo(computeLoyer, [...])` reactive compute pattern** (lines 76–89):
```typescript
const result: ComputeLoyerResult | null = useMemo(() => {
  if (!amountHT || !durationMonths) return null;  // idle: missing inputs
  return computeLoyer({
    amountHT,
    durationMonths: durationMonths as 36 | 48 | 60,
    validityDays: (validityDays ?? 30) as 15 | 30 | 60,
    // Phase 9 — pass actual global_params values (not seed defaults):
    coefficients: latestParams.coefficients,
    commissionPct: Number(latestParams.commissionPct),
    maxAmount: Number(latestParams.maxAmount),
  });
}, [amountHT, durationMonths, validityDays, latestParams]);
```

**State machine branches** (lines 137–151 of `LiveLoyerPreview.tsx`):
```typescript
// ExplainTool mirrors the idle / on-demand / computed branches:
{result === null && <PlaceholderBody lang={lang} />}
{result?.computed.state === 'on-demand' && <OnDemandBody lang={lang} />}
{result?.computed.state === 'computed' && (
  <FormulaTrail
    lang={lang}
    amountHT={amountHT}
    commissionPct={Number(latestParams.commissionPct)}  // ADMIN-09: visible here
    coeff={result.computed.coeff}
    loyerHT={result.computed.loyerHT}
    durationMonths={durationMonths as 36 | 48 | 60}
    validityDays={validityDays}
  />
)}
```

**`formatCurrency` + `formatNumber` usage** (lines 349–362 of `LiveLoyerPreview.tsx`):
```typescript
// FormulaTrail uses these to render the substituted-numeric result line:
const formattedLoyer = formatCurrency(Number(loyerHT), lang);       // "1 207,50 €" (fr) / "€1,207.50" (en-GB)
const formattedCoeff = formatNumber(Number(coeff), lang, {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});
```

**Tanche auto-derive** — `tKey()` from `@/lib/calc` (line 11 of `LiveLoyerPreview.tsx` imports it as `tKey`):
```typescript
// tranche is NOT a user input — auto-derived from amount:
const tranche = amountHT ? tKey(Number(amountHT)) : null;
// Displayed as .tbadge below the amount input (reuse existing CSS class)
{tranche && <span className="tbadge">{t(`admin.tranche.${tranche.slice(1)}.range`, lang)}</span>}
```

---

### `app/(admin)/[adminSegment]/accounts/page.tsx` (page, CRUD)

**Analog:** `app/(authed)/page.tsx`

**Full pattern** (lines 1–14 of `app/(authed)/page.tsx`):
```typescript
import type { Metadata } from 'next';
import { Plus } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/require';   // not requireUser
import { getCurrentLang, t } from '@/lib/i18n';
import { listPartnersWithCounts } from '@/lib/db/queries/users';  // NEW query
import { AccountsList } from './AccountsList';

export const dynamic = 'force-dynamic';   // PITFALLS §1.6

export default async function AccountsPage({ params }: { params: Promise<{ adminSegment: string }> }) {
  const { adminSegment } = await params;
  await requireAdmin();                              // AUTH-15 independent check
  const lang = await getCurrentLang();
  const partners = await listPartnersWithCounts();   // NEW helper
  // nowMs — not needed for accounts (no validity chips); omit

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
        {t('admin.accounts.page.title', lang)}
      </h1>
      {/* CTA + table — passed to client component */}
      <AccountsList lang={lang} initialPartners={partners} adminSegment={adminSegment} />
    </div>
  );
}
```

---

### `app/(admin)/[adminSegment]/accounts/AccountsList.tsx` (component, CRUD)

**Analog:** `src/components/proposals/ProposalsList.tsx`

**Full directive + imports pattern** (lines 1–10 of `ProposalsList.tsx`):
```typescript
'use client';

import { useState, useRef } from 'react';
import { Users, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { formatDate } from '@/lib/i18n/format';
import { InviteUrlModal } from '@/components/InviteUrlModal';
import { CreatePartnerModal } from './CreatePartnerModal';
import type { PartnerWithCount } from '@/lib/db/queries/users';
```

**Per-row state for action buttons** — pattern from `ProposalsList.tsx` (line 29 `useState` for rows):
```typescript
const [partners, setPartners] = useState<PartnerWithCount[]>(initialPartners);
const [inviteUrl, setInviteUrl] = useState<{ url: string; kind: 'invite' | 'reset' } | null>(null);
const [showCreateModal, setShowCreateModal] = useState(false);
```

**Row action: Disable/Re-enable** — server action call + toast + optimistic wait (D-09-11 no optimistic UI — wait for server):
```typescript
const onDisable = async (userId: string) => {
  try {
    await adminDisableUser(userId);
    toast.success(t('admin.accounts.disable.success', lang));
    // After server confirms: update local row state
    setPartners((prev) =>
      prev.map((p) => p.id === userId ? { ...p, deletedAt: new Date().toISOString() } : p)
    );
  } catch {
    toast.error(t('admin.accounts.disable.error', lang));
  }
};
```

**InviteUrlModal trigger** — reuse Phase 6 component (lines 44–300 of `src/components/InviteUrlModal.tsx`):
```typescript
// After successful adminCreateInvitation / adminCreatePasswordReset:
setInviteUrl({ url: result.url, kind: 'invite' });

// Render in JSX:
{inviteUrl && (
  <InviteUrlModal
    url={inviteUrl.url}
    kind={inviteUrl.kind}
    lang={lang}
    onClose={() => setInviteUrl(null)}
    triggerRef={createBtnRef}
  />
)}
```

**`.chip` pattern for status** (UI-SPEC §1.3 + Phase 8 chip):
```typescript
<span className={`chip ${partner.deletedAt ? '' : 'chip-active'}`}>
  {partner.deletedAt
    ? t('admin.accounts.status.disabled', lang)
    : t('admin.accounts.status.active', lang)}
</span>
```

**Empty state pattern** (lines 118–147 of `ProposalsList.tsx`):
```typescript
function EmptyBlock({ lang }: { lang: Lang }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '40px 16px', textAlign: 'center', gap: 12 }}>
      <Users size={38} strokeWidth={1.3} color="var(--muted)" style={{ opacity: 0.4 }} />
      <h2 style={{ fontSize: 16.5, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
        {t('admin.accounts.empty.title', lang)}
      </h2>
      <p style={{ fontSize: 14.5, color: 'var(--muted)', maxWidth: 480, margin: 0 }}>
        {t('admin.accounts.empty.body', lang)}
      </p>
    </div>
  );
}
```

---

### `app/(admin)/[adminSegment]/accounts/CreatePartnerModal.tsx` (component, request-response)

**Analogs:** `src/components/InviteUrlModal.tsx` (modal chrome, focus trap, backdrop) + `src/components/proposal/ProposalForm.tsx` (RHF + Zod form inside the modal)

**Modal chrome pattern** (lines 118–158 of `InviteUrlModal.tsx` — the overlay + panel structure):
```typescript
'use client';

// Backdrop:
<div
  aria-hidden="true"
  onClick={onClose}
  style={{
    position: 'fixed', inset: 0,
    background: 'rgba(17,44,59,0.5)',
    backdropFilter: 'blur(4px)',
    zIndex: 200,
  }}
/>

// Panel:
<div
  ref={panelRef}
  role="dialog"
  aria-modal="true"
  aria-labelledby="create-partner-modal-title"
  style={{
    position: 'fixed', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'calc(100% - 32px)', maxWidth: 520,
    background: 'var(--surface)',
    borderRadius: 16, padding: 28,
    boxShadow: '0 20px 60px rgba(17,44,59,0.25)',
    zIndex: 201,
  }}
>
```

**Focus trap + Escape key** (lines 83–116 of `InviteUrlModal.tsx` — `useEffect` with `onKey`):
```typescript
// Copy the entire focus trap useEffect from InviteUrlModal.tsx lines 83-116 verbatim —
// only change the element ref name (panelRef stays the same, titleKey changes)
useEffect(() => {
  closeButtonRef.current?.focus();
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
    if (e.key === 'Tab' && panelRef.current) {
      // … focus trap logic (copy verbatim)
    }
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}, [onClose]);
```

**RHF form inside the modal** — copy `.fld` pattern from `ProposalForm.tsx` lines 222–246:
```typescript
// Same zodResolver + useForm pattern as ProposalForm:
const form = useForm<CreatePartnerValues>({
  resolver: zodResolver(createPartnerSchema),
  mode: 'onBlur',
  shouldFocusError: true,
  defaultValues: { email: '', displayName: '', language: 'fr' },
});

const onSubmit = (data: CreatePartnerValues): void => {
  const promise = (async () => {
    const result = await adminCreateInvitation(data.email, data.displayName, data.language);
    onSuccess(result.url);   // parent opens InviteUrlModal with the URL
    return result;
  })();
  toast.promise(promise, {
    loading: t('admin.accounts.create.loading', lang),
    success: () => t('admin.accounts.create.success', lang),
    error: () => t('admin.accounts.create.error', lang),
  });
};
```

**Language segmented selector** — copy `.dg` / `.db` / `.db.on` pattern from `src/components/proposal/ValiditySegmented.tsx`:
```typescript
// From DurationSegmented / ValiditySegmented — the .dg segmented pill pattern:
<div className="dg" role="group" aria-label={t('admin.accounts.create.language.label', lang)}>
  {(['fr', 'en'] as const).map((lng) => (
    <button
      key={lng}
      type="button"
      className={`db${language === lng ? ' on' : ''}`}
      onClick={() => setValue('language', lng, { shouldDirty: true })}
    >
      {lng === 'fr' ? 'Français' : 'English'}
    </button>
  ))}
</div>
```

---

### `src/lib/db/queries/users.ts` (service, CRUD)

**Analog:** `src/lib/db/queries/proposals.ts`

**Full file header pattern** (lines 1–4 of `proposals.ts`):
```typescript
import 'server-only';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { UserRow } from '@/db/schema';
```

**JOIN/subquery pattern with proposals count** — modeled on `listProposalsByUser` (lines 151–188):
```typescript
export interface PartnerWithCount {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  deletedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  language: string;
  proposalsCount: number;
  // Re-issue invitation predicate fields:
  hasUnredeemedInvite: boolean;
}

export async function listPartnersWithCounts(): Promise<PartnerWithCount[]> {
  const dbi = db();
  // Drizzle subquery or lateral join for proposals count:
  const rows = await dbi
    .select({
      id: schema.users.id,
      email: schema.users.email,
      displayName: schema.users.displayName,
      role: schema.users.role,
      deletedAt: schema.users.deletedAt,
      lastLoginAt: schema.users.lastLoginAt,
      createdAt: schema.users.createdAt,
      language: schema.users.language,
      proposalsCount: sql<number>`COUNT(DISTINCT ${schema.proposals.id})`.as('proposals_count'),
    })
    .from(schema.users)
    .leftJoin(
      schema.proposals,
      and(
        eq(schema.proposals.userId, schema.users.id),
        isNull(schema.proposals.deletedAt),
      ),
    )
    .where(eq(schema.users.role, 'partner'))
    .groupBy(schema.users.id)
    .orderBy(desc(schema.users.createdAt));

  return rows.map((r) => ({ ...r, hasUnredeemedInvite: false /* filled by separate query */ }));
}
```

**Cursor encode/decode pattern** (lines 48–69 of `proposals.ts`) — replicate for global_params history cursor:
```typescript
// The same encodeCursor/decodeCursor pattern applies to global_params history pagination.
// Cursor key: (effective_from, id) — mirror of proposals (created_at, id) cursor.
export type GlobalParamsCursor = { effectiveFrom: string; id: string };

export function encodeGlobalParamsCursor(c: GlobalParamsCursor): string {
  return Buffer.from(JSON.stringify(c), 'utf8').toString('base64url');
}
export function decodeGlobalParamsCursor(encoded: string): GlobalParamsCursor | null {
  // … same pattern as decodeCursor in proposals.ts lines 52-69
}
```

---

### `src/lib/db/queries/audit-log.ts` (extend AuditAction union)

**Existing file** (`src/lib/db/queries/audit-log.ts` lines 1–42 — read in full above):

**Extension pattern** — only lines 5–11 change:
```typescript
// BEFORE (line 5-11):
export type AuditAction =
  | 'proposal.create'
  | 'proposal.create_failed'
  | 'proposal.delete'
  | 'proposal.restore'
  | 'proposal.purge'
  | 'proposal.duplicate';      // future Phase 9: 'global_params.update', 'user.disable', etc.

// AFTER (Phase 9 D-09-09a):
export type AuditAction =
  | 'proposal.create'
  | 'proposal.create_failed'
  | 'proposal.delete'
  | 'proposal.restore'
  | 'proposal.purge'
  | 'proposal.duplicate'
  | 'global_params.update'
  | 'user.disable'
  | 'user.re_enable'
  | 'user.create'
  | 'password_reset.create'
  | 'invitation.create'
  | 'role.grant';              // Phase 6 grant-admin CLI key — confirm scripts/grant-admin.ts
```

**`writeAuditLog()` signature unchanged** — no modifications to the function body, only the union type.

---

### `src/lib/db/queries/global-params.ts` (extend — add `listGlobalParamsHistory`)

**Existing file** (`src/lib/db/queries/global-params.ts` lines 1–37 — read in full above). Add a new export below `insertGlobalParams`.

**Pattern:** copy `listProposalsByUser` cursor pagination from `src/lib/db/queries/proposals.ts` lines 151–188:
```typescript
// Append to src/lib/db/queries/global-params.ts:

import { desc, sql } from 'drizzle-orm';

export type GlobalParamsCursor = { effectiveFrom: string; id: string };

export interface ListGlobalParamsHistoryArgs {
  cursor?: GlobalParamsCursor | null;
  limit?: number;
}

export interface GlobalParamsHistoryResult {
  rows: GlobalParamsRow[];
  hasMore: boolean;
  nextCursor: GlobalParamsCursor | null;
}

export async function listGlobalParamsHistory(
  args: ListGlobalParamsHistoryArgs = {},
): Promise<GlobalParamsHistoryResult> {
  const dbi = db();
  const limit = args.limit ?? 20;
  const fetchCount = limit + 1;

  // Cursor predicate: (effective_from, id) < (cursor.effectiveFrom, cursor.id)
  // Mirrors proposals.ts lines 165-167 tuple-compare pattern:
  const cursorPredicate = args.cursor
    ? sql`(${schema.globalParams.effectiveFrom}, ${schema.globalParams.id}) < (${args.cursor.effectiveFrom}::timestamptz, ${args.cursor.id}::uuid)`
    : undefined;

  const rows = await dbi.select().from(schema.globalParams)
    .where(cursorPredicate)
    .orderBy(desc(schema.globalParams.effectiveFrom), desc(schema.globalParams.id))
    .limit(fetchCount);

  const hasMore = rows.length > limit;
  const sliced = hasMore ? rows.slice(0, limit) : rows;
  const last = sliced[sliced.length - 1];
  const nextCursor = hasMore && last
    ? { effectiveFrom: last.effectiveFrom.toISOString(), id: last.id }
    : null;

  return { rows: sliced, hasMore, nextCursor };
}
```

---

## Shared Patterns

### Authentication guard — every admin server action and page

**Source:** `src/lib/auth/require.ts` (lines 74–80) + `app/(admin)/[adminSegment]/page.tsx` (lines 1–22)

**Apply to:** ALL new Phase 9 page files AND all new server actions in `src/lib/admin/actions.ts`

```typescript
// In server actions ('use server' files):
const { session } = await requireAdmin();   // FIRST — before any DB or primitive call

// In server component pages:
export const dynamic = 'force-dynamic';      // PITFALLS §1.6 — mandatory
await requireAdmin();                        // FIRST — AUTH-15 independent of layout
```

### Sonner toast discipline

**Source:** `src/components/proposal/ProposalForm.tsx` (lines 174–185) + `src/components/proposals/LoadMoreButton.tsx` (lines 29–43)

**Apply to:** `CoefficientsEditor.tsx`, `AccountsList.tsx`, `CreatePartnerModal.tsx`

```typescript
// Pattern A — server action via toast.promise:
toast.promise(serverActionPromise, {
  loading: t('...loading', lang),
  success: () => t('...success', lang),
  error: () => t('...error', lang),
});

// Pattern B — inline try/catch for non-form actions (disable/re-enable):
try {
  await adminDisableUser(userId);
  toast.success(t('admin.accounts.disable.success', lang));
} catch {
  toast.error(t('admin.accounts.disable.error', lang));
}
```

### i18n discipline

**Source:** `src/lib/i18n/dictionaries.ts` (lines 1–17) + `src/lib/i18n/format.ts` (lines 1–46)

**Apply to:** ALL Phase 9 components and pages

```typescript
// Every user-facing string:
t('key.here', lang)

// Every number/currency/date:
formatCurrency(value, lang)          // monetary amounts
formatNumber(value, lang, { minimumFractionDigits: 4, maximumFractionDigits: 4 })  // coefficients
formatDate(new Date(row.effectiveFrom), lang, { /* Intl.DateTimeFormatOptions */ })  // timestamps
// NEVER: new Date().toLocaleString() without explicit locale
```

### `.card` + `.ctitle` chrome

**Source:** `src/components/proposal/ProposalForm.tsx` (lines 211–224)

**Apply to:** `CoefficientsEditor.tsx`, `HistoryTable.tsx`, `ExplainTool.tsx`, `AccountsList.tsx`

```typescript
<section className="card" style={{ marginBottom: 16 }}>
  <div className="ctitle">
    <span className="dot" style={{ background: 'var(--gd)' }} aria-hidden="true" />
    <span>{t('section.title.key', lang)}</span>
  </div>
  {/* content */}
</section>
```

### `force-dynamic` + params async pattern

**Source:** `app/(admin)/[adminSegment]/layout.tsx` (lines 5, 36)

**Apply to:** ALL new Phase 9 page files

```typescript
export const dynamic = 'force-dynamic';
// …
const { adminSegment } = await params;   // PITFALL §1.1: params is a Promise in Next.js 16
```

### Error redaction discipline (ADMIN-09 / PITFALLS §9.4)

**Source:** `src/lib/auth/redeem.ts` (lines 133–139) — the `console.error` + bounded return pattern

**Apply to:** `src/lib/admin/actions.ts` server actions

```typescript
// In admin server actions — never expose raw DB errors to the caller:
try {
  // … mutation
} catch (e) {
  console.error('[adminUpdateGlobalParams] failed:', e);  // server-side only
  throw new Error('admin.action.error');                  // bounded, redacted
}
// NEVER log commission_pct in catch blocks or console.error calls
// outside of 'global_params.update' audit write (ADMIN-09 D-09-09b)
```

---

## No Analog Found

All 12 files have reasonably close analogs. No files require falling back entirely to RESEARCH.md patterns. The "new" file is `src/lib/db/queries/users.ts` which has no exact predecessor, but `proposals.ts` serves as a direct structural template for Drizzle query helpers.

---

## Metadata

**Analog search scope:** `app/(admin)/`, `app/(authed)/`, `src/components/proposal/`, `src/components/proposals/`, `src/lib/auth/`, `src/lib/db/queries/`, `src/lib/i18n/`, `src/lib/calc/`
**Files scanned:** 25 source files read in full
**Pattern extraction date:** 2026-05-09
