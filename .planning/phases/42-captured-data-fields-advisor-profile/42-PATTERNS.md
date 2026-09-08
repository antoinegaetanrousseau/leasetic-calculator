# Phase 42: Captured Data — Fields & Advisor Profile - Pattern Map

**Mapped:** 2026-09-08
**Files analyzed:** 19 (create + modify)
**Analogs found:** 19 / 19

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/db/schema.ts` (users.telephone, users.companyTelephone, new `leasetic_advisor` table) | model | CRUD | `users.companyName`/`partnerType` column block (`src/db/schema.ts:67-75`) for the two columns; `globalParams` (`src/db/schema.ts:159-176`) for the new singleton table shape | exact (columns) / role-match (table — deliberately NOT append-only like `globalParams`) |
| `src/lib/auth/index.ts` (2 new `additionalFields` entries) | config | request-response | `partnerType` entry (`src/lib/auth/index.ts:172`) | exact |
| `src/lib/calc/schema.ts` (`clientSiret` field + cross-field refine) | model/utility | transform | `requiredSirenSchema` (`src/lib/calc/schema.ts:93-100`) for the shape; `optionalPhoneSchema` (`:56-61`) for both new telephone schemas | exact |
| `src/lib/registry/schema.ts` (parse `siege.siret`) | utility | transform | `registrySiegeSchema`'s `adresse`/`code_postal`/`libelle_commune` fields (`src/lib/registry/schema.ts:63-67`) and `toRegistryIdentity` (`:169-187`) | exact |
| `src/components/proposal/SiretInput.tsx` (new) | component | transform | `src/components/proposal/SirenInput.tsx` (whole file, 67 lines) | exact |
| `app/(authed)/proposals/new/parametres/ParametresFormCard.tsx` (SIRET field) | component | request-response | Its own `clientSiren` `Field`/`Controller` block (lines 111-141) | exact |
| `app/(authed)/proposals/new/parametres/page.tsx` (hydrate `companyTelephone`) | route (server component) | request-response | Its own `partnerCo`/`partnerName` session-hydration block (lines 99-107, 240-258) | exact |
| `app/(authed)/parametres/ParametresForm.tsx` (+ `page.tsx`) — téléphone (editable) + fonction (read-only) rows | component | request-response | Its own Prénom/Nom 2-col row (lines 371-416, editable-input pattern) + its own email read-only row (lines 418-453, read-only pattern) | exact |
| `src/lib/api/proposals/finalize-wizard.ts` (D-05 pre-check + D-17 gate) | service | request-response | Its own existing `ZodError` → `'ValidationFailed'` catch (lines 146-155) and `FinalizeWizardArgs.partnerType` threading (lines 60-64, 177) | exact |
| `app/api/proposals/finalize/route.ts` (`SAFE_ERROR_CODES` + telephone threading) | route (API) | request-response | Its own `SAFE_ERROR_CODES` Set (lines 58-63) and `partnerType` session-extraction block (lines 70-85) | exact |
| `app/(authed)/proposals/new/verification/FinalizeButton.tsx` (dialog branch) | component | request-response | Its own `handleFinalize` `!res.ok` branch (lines 76-79) — the gap to close, not a pattern to copy | exact (as the file to extend; needs new `Dialog` primitive wiring) |
| `src/lib/admin/schemas.ts` (`phone` → optional/relabeled; new `telephone` field) | model | CRUD | `createPartnerFormSchema`'s own `phone` field (lines 88-91) and `partnerType` enum (lines 96-100) | exact |
| `src/lib/admin/actions.ts` (real `UPDATE users SET company_telephone/telephone`) | service | CRUD | `adminCreateInvitation`'s existing `.update(schema.users).set({ language, partnerType, ...roleUpdate })` (lines 351-358) | exact |
| `app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx` (relabel + new field) | component | request-response | Its own `phone` `Field` (lines 346-376) and Section 1/2 structure (lines 174-297) | exact |
| `src/lib/db/queries/advisor.ts` (new — `getAdvisor`/`upsertAdvisor`) | model/service | CRUD | `src/lib/db/queries/global-params.ts`'s `getLatestGlobalParams` (lines 14-20) — read shape; deliberately diverges on write (fixed-id `UPDATE`, not append-only `INSERT`) | role-match (deliberate divergence, documented) |
| `app/(admin)/[adminSegment]/advisor/page.tsx` + `AdvisorForm.tsx` (new route) | route + component | CRUD | `app/(admin)/[adminSegment]/partners/new/page.tsx` (21-49) + `CreatePartnerForm.tsx` (whole file) for form/page split; `ParametresForm.tsx`'s `handleCancel` (line 315) for the "reset, don't navigate" cancel semantics | exact |
| `src/lib/i18n/dictionaries.ts` (new FR/EN keys) | config | transform | Existing `form.client.siren*` / `error.field.*` key pairs (lines 90-96, 358-368) | exact |
| `drizzle/0011_phase42_captured_data.sql` (generated) | migration | batch | `drizzle/0010_phase34_fiche_client.sql` + its `_journal.json` entry (idx 10, tag `0010_phase34_fiche_client`) | exact |
| SIRET registry-lookup call site (new server action, e.g. `app/(authed)/proposals/new/_actions/lookupSiret.action.ts`) | route/service | request-response | `app/(authed)/proposals/new/_actions/saveAsDraft.action.ts` (whole file, 49 lines) for the `'use server'` + `requireUser()`-first shape; `src/lib/registry/recherche-entreprises.ts`'s `lookupCompanyBySiren` for the call itself | exact |

---

## Pattern Assignments

### `src/db/schema.ts`

**Analog:** its own `users` table block + `globalParams` table

**Columns pattern** (lines 67-75, existing — copy shape verbatim):
```typescript
// PTYPE-01: partner type dimension — Agent / Commercial / Partenaire.
// DEFAULT 'Partenaire' ensures existing rows stay Partenaire on migration (PTYPE-02).
partnerType: text('partner_type').notNull().default('Partenaire'),
}, (table) => [
  check('users_role_check', sql`${table.role} IN ('partner', 'admin', 'sales')`),
  check('users_partner_type_check', sql`${table.partnerType} IN ('Agent', 'Commercial', 'Partenaire')`),
]);
```
New columns follow the SAME nullable-text shape as `companyName` (no CHECK needed — RESEARCH.md's own Code Examples section gives the exact two-line addition: `companyTelephone: text('company_telephone')` and `telephone: text('telephone')`, both nullable, no default).

**Singleton table pattern** (mirrors `globalParams`'s shape at lines 159-176, but diverges deliberately):
```typescript
export const globalParams = pgTable('global_params', {
  id: uuid('id').defaultRandom().primaryKey(),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull().defaultNow(),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  // ...
}, (table) => [
  index('global_params_effective_from_idx').on(sql`${table.effectiveFrom} DESC`),
]);
```
**Deliberate divergence (D-08, D-09, A1 in RESEARCH.md):** `leasetic_advisor` must be a **plain single-row table with a fixed/known id**, updated in place via `UPDATE ... WHERE id = <fixed>` — NOT an append-only history table like `globalParams`. Do not copy `effectiveFrom`/`defaultRandom()` id semantics; seed one row with a literal fixed id in the migration and target that id on every write.

---

### `src/lib/auth/index.ts`

**Analog:** `partnerType` additionalField (line 172)

**Registration pattern** (lines 160-173, existing — copy shape verbatim):
```typescript
additionalFields: {
  // ...existing entries unchanged...
  partnerType: { type: 'string', required: false, defaultValue: 'Partenaire', input: false },

  // NEW — D-19: admin-only write, company-level fact, nullable (D-13 — never blocks finalize)
  companyTelephone: { type: 'string', required: false, input: false },

  // NEW — D-19/PROF-01: partner-writable via authClient.updateUser({ telephone })
  telephone: { type: 'string', required: false, input: true },
},
```
**Critical ordering constraint (this repo's own incident history):** the `partner_type` additionalField was deployed before its migration reached prod once, and every authed page 500'd with `APIError: Failed to get session` (Better Auth's Drizzle adapter SELECTs every registered column regardless of whether the DB has it). Sequence: (1) merge the migration PR, (2) run `MIGRATE PROD` via the GitHub Action and confirm green in the Actions log, (3) only then merge the PR adding these two `additionalFields` entries.

---

### `src/lib/calc/schema.ts`

**Analog:** `requiredSirenSchema` (lines 93-100) + `optionalPhoneSchema` (lines 56-61)

**Imports** (line 1, 17 — existing):
```typescript
import { z } from 'zod';
import { normalizeSiren } from '@/lib/crm/siren';
```

**Shape-validation transform+refine pattern to mirror for `requiredSiretSchema`** (lines 93-100):
```typescript
const requiredSirenSchema = z
  .string({ message: 'error.field.required' })
  .trim()
  .min(1, { message: 'error.field.required' })
  .transform((v) => normalizeSiren(v) ?? v)
  .refine((v) => /^[0-9]{9}$/.test(v), {
    message: 'error.field.siren.invalid',
  });
```
The comment block above this (lines 63-92) records the exact failure mode of two schemas encoding one rule — read it before writing `requiredSiretSchema`; SIRET normalisation must not duplicate `normalizeSiren`'s digit-stripping logic under a new name.

**Phone reuse — do not write a new phone rule** (lines 56-61):
```typescript
const optionalPhoneSchema = z
  .string()
  .optional()
  .refine((s) => s === undefined || s === '' || s.replace(/\D/g, '').length === 10, {
    message: 'error.field.phone.invalid',
  });
```
Both new telephone Zod schemas (partner's own, and the advisor's, if validated at that layer) reuse this exact schema per CONTEXT.md's own Claude's Discretion note.

**Cross-field refine (D-02) — NEW shape, not in the codebase yet** (per RESEARCH.md Pattern 3, verified against zod@4.4.3's `path` option):
```typescript
export const proposalInputSchema = z
  .object({
    // ...existing 15 fields...
    clientSiret: requiredSiretSchema,
  })
  .refine(
    (data) => data.clientSiret.slice(0, 9) === data.clientSiren,
    {
      message: 'error.field.siret.mismatch',
      path: ['clientSiret'], // redirects the ZodError to the SIRET field, not the object root
    },
  );
```
Note `proposalInputSchema` is currently a plain `z.object({...})` ending at line 126+ (15 fields, no `.refine()` chained yet) — this is the first `.refine()` on the whole object in this file; field-level `.refine()` (e.g. `optionalPhoneSchema`) is the only precedent that exists today, so `path: ['clientSiret']` is new syntax for this codebase (flagged Assumption A4 in RESEARCH.md — low risk, standard Zod behavior, but write a unit test asserting `error.issues[0].path === ['clientSiret']`).

---

### `src/lib/registry/schema.ts`

**Analog:** `registrySiegeSchema`'s three existing fields (lines 63-67) + `toRegistryIdentity` (lines 169-187)

**Parser extension** (add a 4th field to the existing object, same `truncated()` pipe shape):
```typescript
const registrySiegeSchema = z.object({
  adresse: truncated(ADDRESS_MAX).pipe(z.string().max(ADDRESS_MAX)).nullish(),
  code_postal: truncated(CODE_MAX).pipe(z.string().max(CODE_MAX)).nullish(),
  libelle_commune: truncated(COMMUNE_MAX).pipe(z.string().max(COMMUNE_MAX)).nullish(),
  // NEW — components.schemas.siege.properties.siret (type: string, not required)
  siret: truncated(CODE_MAX).pipe(z.string().max(CODE_MAX)).nullish(),
});
```
`.nullish()`, never `.optional()` — the module's own comment (lines 52-56) explains why: the API sends explicit `null`, and `.optional()` would reject it, failing the whole payload for one absent field.

**`RegistryIdentity`/`toRegistryIdentity` extension** — add `siret: string | null` to the type (line 106-117) and to the returned object (lines 175-186), following the exact `orNull(...)` pattern every other field already uses:
```typescript
export type RegistryIdentity = {
  legalName: string | null;
  // ...existing 9 fields...
  siret: string | null, // NEW
};
```
**Scoping decision the plan must make explicit (A3 in RESEARCH.md):** `toRegistryIdentity` today is consumed only by `registry-sync.ts` (the CRM `companies.*` write path). The wizard's SIRET prefill is a NEW, second reader of the same lookup result — not a second writer of `companies.*`, so extending the shared type is safe per the module's own D-02 write-only restriction, but the plan should read `result.data.siret` at the new wizard call site rather than inventing a parallel mapper.

---

### `src/components/proposal/SiretInput.tsx` (new)

**Analog:** `src/components/proposal/SirenInput.tsx` (entire file — mirror structurally, do not restyle)

```typescript
'use client';

import { Input } from '@/components/ui/input';
import { type ChangeEvent, type FocusEvent, useId } from 'react';

export interface SiretInputProps {
  value: string;
  onChange: (next: string) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  invalid?: boolean;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  inputId?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Format raw input to "XXX XXX XXX XXXXX" — 3-3-3-5 grouping, 14 digits.
 * Strip non-digits, slice to 14 digits, group every 3 (last group is 5).
 */
export function formatSiret(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 14);
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (i === 3 || i === 6 || i === 9)) out += ' ';
    out += digits[i];
  }
  return out;
}

export function SiretInput({ value, onChange, onBlur, invalid = false, ariaInvalid, ariaDescribedBy, inputId, placeholder, disabled = false }: SiretInputProps) {
  const id = useId();
  const finalId = inputId ?? id;
  const handle = (e: ChangeEvent<HTMLInputElement>) => onChange(formatSiret(e.target.value));
  return (
    <Input
      id={finalId}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      aria-invalid={ariaInvalid || invalid || undefined}
      aria-describedby={ariaDescribedBy}
      placeholder={placeholder}
      disabled={disabled}
      value={value}
      onChange={handle}
      onBlur={onBlur}
      maxLength={17} /* 14 digits + 3 spaces per 3-3-3-5 grouping — UI-SPEC placeholder "123 456 789 00012" */
    />
  );
}
```
This is a mechanical copy of `SirenInput.tsx`'s structure with the grouping changed from every-3/9-digit to 3-3-3-5/14-digit (UI-SPEC's placeholder `123 456 789 00012` confirms the grouping). Storage stays digits-only per D-04 — the `Zod` `.transform()` on `requiredSiretSchema`, not this component, is responsible for stripping formatting before persistence (this component is display-only formatting, exactly like `SirenInput`).

---

### `app/(authed)/proposals/new/parametres/ParametresFormCard.tsx`

**Analog:** its own `clientSiren` `Field` block (lines 111-141)

```tsx
{/* clientSiren — required since 2026-09-03 (operator decision); Controller-bound SirenInput */}
<Field>
  <FieldLabel htmlFor="client-siren">
    {t('form.client.siren', lang)}
    <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>
  </FieldLabel>
  <Controller
    name="clientSiren"
    control={control}
    render={({ field }) => (
      <SirenInput
        inputId="client-siren"
        placeholder={t('form.client.siren.placeholder', lang)}
        value={field.value ?? ''}
        onChange={field.onChange}
        onBlur={field.onBlur}
        invalid={!!errors.clientSiren}
        ariaDescribedBy={errors.clientSiren ? 'client-siren-error' : undefined}
      />
    )}
  />
  {errors.clientSiren && (
    <FieldError id="client-siren-error" role="alert">
      {t((errors.clientSiren.message as DictKey) ?? 'error.field.siren.invalid', lang)}
    </FieldError>
  )}
</Field>
```
The new `clientSiret` `Field` is inserted immediately after this block (still inside the same "INFORMATIONS CLIENT" `FieldGroup`, per UI-SPEC — "SIRET reads as SIREN's sibling, not a separate section"), using `SiretInput` in place of `SirenInput` and `field.value` prefilled by the (new) registry-lookup call rather than typed from scratch. Reuse `error.field.siret.invalid` (already exists in dictionaries.ts) for shape errors and the new `error.field.siret.mismatch` key for D-02's cross-field refine.

---

### `app/(authed)/proposals/new/parametres/page.tsx`

**Analog:** its own `partnerCo`/`partnerName` session-hydration block (lines 91-107, 240-258)

```typescript
const u = session.user as {
  email: string;
  displayName?: string | null;
  name?: string | null;
  companyName?: string | null;
  // ADD: companyTelephone?: string | null;
};
const nameFallback = u.displayName?.trim() || u.name?.trim() || u.email;
const partnerName = nameFallback;
const partnerCo = u.companyName?.trim() || nameFallback;
// ADD: const companyTel = u.companyTelephone?.trim() || undefined;
```
```typescript
const prefill: Partial<ProposalInput> = {
  // ...existing fields...
  // Session-hydrated / server-resolved (NEVER user-editable)
  partnerName,
  partnerCo,
  validityDays: defaultValidityDays,
  // ADD: companyTelephone/partnerTel-equivalent here — same "session-derived
  // attribution always wins" discipline as partnerName/partnerCo (D-25's overlay
  // logic at lines 184-188 and 201-207 both re-assert these two fields last).
};
```
D-11 explicitly extends this exact pattern — `companyTelephone` is NEVER a wizard field, never read back from the form, always written server-side into `draft.inputs`.

---

### `app/(authed)/parametres/ParametresForm.tsx` (+ `page.tsx`)

**Analog A — editable row pattern** (its own Prénom/Nom block, lines 371-393):
```tsx
<Field>
  <FieldLabel htmlFor="pf-firstName">
    {t('parametres.identity.firstName.label', lang)}
  </FieldLabel>
  <Input
    id="pf-firstName"
    type="text"
    autoComplete="given-name"
    placeholder={t('parametres.identity.firstName.placeholder', lang)}
    aria-invalid={!!identityErrors.firstName}
    {...identityForm.register('firstName')}
  />
  {identityErrors.firstName && (
    <FieldError role="alert">{t('parametres.error.required', lang)}</FieldError>
  )}
</Field>
```
The new téléphone `Field` copies this shape — but per UI-SPEC uses `PhoneInput` (Controller-bound), not a plain `register()`'d `Input`, since `PhoneInput` auto-formats. Add it as a full-width `Field` (not inside the 2-col `FieldGroup`) directly beneath the Prénom/Nom row, per UI-SPEC's placement instruction.

**Analog B — read-only row pattern** (its own email row, lines 418-453 — **box only, not the text size**):
```tsx
<Field className="mb-4">
  <FieldLabel htmlFor="pf-email">{t('parametres.identity.email.label', lang)}</FieldLabel>
  <>
    <p
      id="pf-email"
      className="m-0 rounded-xl border border-border bg-[var(--hover-overlay)] px-3 py-2.5 text-[14.5px] text-ink"
    >
      {initialEmail}
    </p>
    <p className="mt-1.5 mb-0 text-[12px] text-muted-foreground">
      {t('parametres.identity.email.readonly.notice', lang)}
    </p>
  </>
</Field>
```
**UI-SPEC's explicit correction:** the new fonction `<p>` copies this box class **verbatim except the text size** — use `text-sm` (14px), NOT `text-[14.5px]` (that would push the phase's type-scale count to 5, breaking UIC-02's cap). So the fonction row's class string is:
```
"m-0 rounded-xl border border-border bg-[var(--hover-overlay)] px-3 py-2.5 text-ink text-sm"
```
Value is the raw `partnerType` string ("Agent"/"Commercial"/"Partenaire") — do not translate on this surface (D-16 is PDF-only).

**Auth write call** (existing, line 192):
```typescript
const { error } = await authClient.updateUser({ name: fullName });
```
Extend to `authClient.updateUser({ name: fullName, telephone: identityValues.telephone })` inside the same identity-save branch — `telephone` is `input: true` so this call is permitted by Better Auth; `companyTelephone` (`input: false`) would be silently rejected if attempted here, which is the structural enforcement of D-13's admin-only rule.

**Schema extension** (`src/lib/auth/schemas.ts`, `identitySchema`, lines 77-80):
```typescript
export const identitySchema = z.object({
  firstName: z.string().min(1, 'Prénom requis').max(60),
  lastName: z.string().min(1, 'Nom requis').max(60),
  // ADD: telephone: optionalPhoneSchema-equivalent (reuse the calc/schema.ts rule per Discretion)
});
```

---

### `src/lib/api/proposals/finalize-wizard.ts`

**Analog:** its own existing `ZodError` catch (lines 146-155) + `FinalizeWizardArgs.partnerType` threading (lines 53-64, 177)

**D-05 pre-check — MUST run BEFORE the generic catch, not inside it** (Pitfall 5):
```typescript
// D-16 step 1 — load draft + server-side re-validation.
const draft = await getDraftById(args.draftId, args.userId);
if (!draft) {
  throw new Error('DraftNotFound');
}

// NEW — D-05: independent pre-check, never inspects ZodError internals.
if (!('clientSiret' in draft.inputs)) {
  throw new Error('LegacyDraftIncomplete');
}

let parsed: ProposalInput;
try {
  parsed = proposalInputSchema.parse(draft.inputs);
} catch (err) {
  if (err instanceof z.ZodError) {
    throw new Error('ValidationFailed');
  }
  throw err;
}
```

**D-17 gate — arg-threading shape to copy from `partnerType`** (existing, lines 53-64):
```typescript
export interface FinalizeWizardArgs {
  userId: string;
  draftId: string;
  language: 'fr' | 'en';
  /** PTYPE-06: the proposal author's partner type ... Passed opaquely ... */
  partnerType: 'Agent' | 'Commercial' | 'Partenaire';
  // NEW — D-17: threaded from the route handler's session read, same shape as partnerType.
  telephone: string | null;
}
```
Per RESEARCH.md's Open Question 3 recommendation: do NOT add a new DB query inside `finalizeWizard` for this — `finalizeWizard` today has zero direct `users` reads (only `proposals`/`global_params`); extend the arg instead, matching `partnerType`'s existing precedent exactly. Insert the gate after schema validation, before compute/render (fail fast):
```typescript
// D-17 gate.
if (!args.telephone) {
  throw new Error('MissingPartnerTelephone');
}
```

---

### `app/api/proposals/finalize/route.ts`

**Analog:** its own `SAFE_ERROR_CODES` Set (lines 58-63) + `partnerType` session-extraction block (lines 70-85)

**`SAFE_ERROR_CODES` extension:**
```typescript
const SAFE_ERROR_CODES = new Set([
  'DraftNotFound',
  'NoGlobalParams',
  'ValidationFailed',
  'FinalizeFailed',
  'MissingPartnerTelephone', // NEW — D-17/D-18
  'LegacyDraftIncomplete',    // NEW — D-05
]);
```

**Session extraction to mirror for telephone** (lines 70-85, existing):
```typescript
let userId: string;
let partnerType: 'Agent' | 'Commercial' | 'Partenaire';
try {
  const { session } = await requireUser();
  userId = session.user.id;
  const rawType = (session.user as { partnerType?: unknown }).partnerType;
  partnerType = rawType === 'Agent' || rawType === 'Commercial' ? rawType : 'Partenaire';
} catch {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}
```
Extend the same `try` block to also read `telephone`:
```typescript
const rawTelephone = (session.user as { telephone?: unknown }).telephone;
const telephone = typeof rawTelephone === 'string' && rawTelephone.length > 0 ? rawTelephone : null;
```
Then thread both into the existing call site (line 103):
```typescript
const result = await finalizeWizard({ userId, draftId, language, partnerType, telephone });
```

---

### `app/(authed)/proposals/new/verification/FinalizeButton.tsx`

**Analog:** its own `handleFinalize` `!res.ok` branch (lines 76-79) — **this is the gap, not a pattern to reuse**:
```typescript
if (!res.ok) {
  // Bounded error code from the route — never echo body to the partner.
  throw new Error(`finalize_failed_${res.status}`);
}
```
This NEVER calls `res.json()` on failure today (Pitfall 3 — the majority of D-18's actual work is here, not on the route side). New shape (per RESEARCH.md Pattern 4):
```typescript
if (!res.ok) {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  if (body?.error === 'MissingPartnerTelephone') {
    setDialogOpen(true); // NEW state — D-18 dialog, not a toast
    setIsSubmitting(false);
    return;
  }
  if (body?.error === 'LegacyDraftIncomplete') {
    toast.error(t('wizard.finalize.toast.legacyMissingSiret', lang));
    setIsSubmitting(false);
    router.push(`/proposals/new/parametres?draft_id=${draftId}`);
    return;
  }
  throw new Error(`finalize_failed_${res.status}`); // existing generic path, unchanged
}
```
The `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogDescription`/`DialogFooter` primitives come from `@/components/ui/dialog` (UI-SPEC Component Inventory) — no existing dialog usage in this file to copy from; use the primitive's own documented composition (shadcn `Dialog`, never `AlertDialog` — informational block, not a destructive confirmation).

---

### `src/lib/admin/schemas.ts`

**Analog:** `createPartnerFormSchema`'s existing `phone` field (lines 88-91) + `partnerType` enum (lines 96-100)

```typescript
export const createPartnerFormSchema = z.object({
  // ...
  phone: z
    .string()
    .min(1, 'error.field.required')
    .regex(/^[\d\s+()-]{6,20}$/, 'error.field.phone.invalid'),
  // ...
});
```
Loosen to optional (D-13 — this field becomes the **company** telephone, nullable, never blocking):
```typescript
phone: z
  .string()
  .regex(/^[\d\s+()-]{6,20}$/, 'error.field.phone.invalid')
  .optional()
  .or(z.literal('')), // mirrors the existing `siret` field's optional-or-empty shape (line 84-87)
```
Add a NEW `telephone` field (D-19 — the partner's own, in Section 1), same permissive regex, also optional:
```typescript
telephone: z
  .string()
  .regex(/^[\d\s+()-]{6,20}$/, 'error.field.phone.invalid')
  .optional()
  .or(z.literal('')),
```

---

### `src/lib/admin/actions.ts`

**Analog:** `adminCreateInvitation`'s existing `.update(schema.users)` call (lines 351-358) — **this is the exact gap Pitfall 4 describes: `phone` is threaded through today but only reaches `audit_log.payload.profile`, never a real column.**

```typescript
// Set the partner's language preference and partner_type (createInvitation does not set them).
await db()
  .update(schema.users)
  .set({
    language: args.language,
    ...(args.partnerType ? { partnerType: args.partnerType } : {}),
    ...roleUpdate,
  })
  .where(eq(schema.users.id, userRow.id));
```
Extend this SAME `.set({...})` object (do not add a second `.update()` call) with the two new columns:
```typescript
.set({
  language: args.language,
  ...(args.partnerType ? { partnerType: args.partnerType } : {}),
  ...roleUpdate,
  ...(args.companyTelephone ? { companyTelephone: args.companyTelephone } : {}),
  ...(args.telephone ? { telephone: args.telephone } : {}),
})
```
`AdminCreateInvitationArgs` (lines 265-282) already has a `phone?: string` field threaded from `buildProfilePayload` — rename/repurpose per the plan's column-naming decision, and keep the existing `buildProfilePayload()`/`audit_log.payload.profile` write (compliance trail) in addition to, not instead of, this new real-column write.

---

### `app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx`

**Analog:** its own `phone` `Field` (lines 346-376) + Section 1/2 structure (lines 174-297)

**Existing company-phone field to relabel** (lines 346-376, in Section 2 "INFORMATIONS SOCIÉTÉ"):
```tsx
<Field>
  <FieldLabel htmlFor="cpf-phone">
    {t('partners.new.field.phone', lang)}  {/* → relabel key value to "Téléphone (société)" */}
    <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>  {/* → remove asterisk, now optional */}
  </FieldLabel>
  {/* Comment explains WHY plain Input, not PhoneInput — keep this reasoning, it still applies */}
  <Input
    id="cpf-phone"
    type="tel"
    inputMode="tel"
    autoComplete="tel"
    aria-invalid={errors.phone ? true : undefined}
    aria-describedby={errors.phone ? 'cpf-phone-error' : undefined}
    className={errors.phone ? 'invalid' : ''}
    disabled={isSubmitting}
    {...register('phone')}
  />
  {errors.phone?.message && (
    <FieldError id="cpf-phone-error" role="alert">{t(errors.phone.message as DictKey, lang)}</FieldError>
  )}
</Field>
```
New `telephone` field (D-19) is inserted into Section 1 "INFORMATIONS PERSONNELLES" (after `email`, before `partnerType` — see lines 223-297 for that section's existing `Field` sequence to insert between), copying this SAME shape but as `PhoneInput` (Controller-bound, per UI-SPEC's Component Inventory — this is the genuinely new field, unlike the company phone which stays a plain `Input`).

---

### `src/lib/db/queries/advisor.ts` (new)

**Analog:** `src/lib/db/queries/global-params.ts`'s `getLatestGlobalParams` (lines 14-20) — **read shape only; write deliberately diverges**

```typescript
// Read pattern to mirror (existing, global-params.ts:14-20):
export async function getLatestGlobalParams(): Promise<GlobalParamsRow | null> {
  const dbi = db();
  const row = await dbi.query.globalParams.findFirst({
    orderBy: [desc(schema.globalParams.effectiveFrom)],
  });
  return row ?? null;
}
```
```typescript
// NEW shape for advisor.ts — fixed-id read, not "most recent":
import 'server-only';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

const ADVISOR_ROW_ID = '<fixed-uuid-literal-seeded-by-migration>';

export async function getAdvisor() {
  const dbi = db();
  return (await dbi.query.leasetivAdvisor.findFirst({
    where: eq(schema.leasetivAdvisor.id, ADVISOR_ROW_ID),
  })) ?? null;
}

export async function upsertAdvisor(args: { name: string; fonction: string; telephone: string; email: string }) {
  const dbi = db();
  const [row] = await dbi
    .update(schema.leasetivAdvisor)
    .set(args)
    .where(eq(schema.leasetivAdvisor.id, ADVISOR_ROW_ID))
    .returning();
  return row;
}
```
**Why the divergence is deliberate (Don't Hand-Roll table, RESEARCH.md):** a fixed-id `UPDATE` is race-safe without needing a lock or a uniqueness constraint; an "is there already a row" branch (which `getLatestGlobalParams`'s `ORDER BY ... LIMIT 1` pattern implicitly tolerates via appends) would let two concurrent admin saves each INSERT a competing "singleton" row.

---

### `app/(admin)/[adminSegment]/advisor/page.tsx` + `AdvisorForm.tsx` (new route)

**Analog A — page/form split** (`app/(admin)/[adminSegment]/partners/new/page.tsx`, lines 1-60):
```typescript
import { requireAdmin } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { PageHero } from '@/components/ui/PageHero';

export const dynamic = 'force-dynamic';

export default async function AdvisorPage({ params }: PageProps) {
  const { adminSegment } = await params;
  await requireAdmin(); // AUTH-15 defence-in-depth, page-level secondary guard
  const lang = await getCurrentLang();
  const advisor = await getAdvisor(); // NEW — server-fetch current row for form defaults

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>
      <PageHero
        title={t('admin.advisor.hero.title', lang)}
        subtitle={t('admin.advisor.hero.subtitle', lang)}
      />
      <AdvisorForm lang={lang} initial={advisor} />
    </main>
  );
}
```

**Analog B — form/section structure** (`CreatePartnerForm.tsx`'s Section 1 pattern, lines 174-297, and `SectionTitle` import at line 48): use ONE `SectionTitle` (`accent="gd"`) + ONE `.card` containing the 4 required fields (Nom, Fonction, Téléphone, Email) in that order, no divider (single section, unlike the partner form's 3-section layout).

**Analog C — "cancel resets, doesn't navigate" semantics** (`ParametresForm.tsx`'s `handleCancel`, line 315):
```typescript
const handleCancel = () => {
  identityForm.reset();
  // ...
};
```
The advisor page's "Annuler" mirrors this — it is a singleton upsert page with nothing to navigate back to (per UI-SPEC's Interaction & State Notes), so Cancel resets the form to last-saved values in place, same as `/parametres`.

**Server action to write** — mirrors `adminCreateInvitation`'s pattern of `requireAdmin()` + a `db().update(...)` call + a `writeAuditLog(...)` entry (lines 319-403), but targeting `upsertAdvisor()` instead of `users`.

---

### `src/lib/i18n/dictionaries.ts`

**Analog:** existing `form.client.siren*` / `error.field.*` FR/EN key pairs (lines 90-96 FR, ~1376 EN; 358-368 FR, ~1639-1647 EN)

```typescript
// FR block (existing shape to copy):
'form.client.siren': 'SIREN',
'form.client.siren.placeholder': '123 456 789',
// ...
'error.field.siren.invalid': 'SIREN invalide (9 chiffres requis).',
'error.field.siret.invalid': 'SIRET invalide (14 chiffres requis).', // ALREADY EXISTS — reuse verbatim, do not re-add
```
New keys needed (all listed with FR/EN pairs in `42-UI-SPEC.md` §Copywriting Contract — copy verbatim from there): `error.field.siret.mismatch`, `parametres.identity.telephone.label` + `.placeholder`, `parametres.identity.fonction.label` + `.readonly.notice`, `partners.new.field.telephone` + `.placeholder`, relabeled `partners.new.field.phone` (FR "Téléphone (société)" / EN "Company phone"), `admin.advisor.*` (11 keys), `wizard.finalize.dialog.missingPhone.*` (4 keys), `wizard.finalize.toast.legacyMissingSiret`.

---

### `drizzle/0011_phase42_captured_data.sql` (generated)

**Analog:** `drizzle/0010_phase34_fiche_client.sql` + its `_journal.json` entry — **generate-only discipline, never hand-author DDL**

```json
// drizzle/meta/_journal.json — existing entry shape (idx 10, tag 0010_phase34_fiche_client):
{
  "idx": 10,
  "version": "7",
  "when": 1788456049104,
  "tag": "0010_phase34_fiche_client",
  "breakpoints": true
}
```
New migration is ordinal `0011` (confirmed next by RESEARCH.md's direct read of `drizzle/*.sql` listing + `_journal.json`), generated via `npm run db:generate` after `src/db/schema.ts` edits land — the SQL file itself gets a hand-written HEADER COMMENT ONLY (mirroring `0010`'s header, lines 1-33) explaining the singleton-table divergence and the seed-row insert for `leasetic_advisor`; the DDL body is generator output, never hand-typed. **Never run `db:migrate` locally** — `.env.local` points at the production Neon branch; apply only via the `MIGRATE PROD` GitHub Action per `docs/operations/migrations.md`.

---

### SIRET registry-lookup call site (new — `app/(authed)/proposals/new/_actions/lookupSiret.action.ts` or similar)

**Analog:** `app/(authed)/proposals/new/_actions/saveAsDraft.action.ts` (entire file, 49 lines) for the `'use server'` + `requireUser()`-first shape:
```typescript
'use server';
import { requireUser } from '@/lib/auth/require';
// ...

export async function saveAsDraftAction(
  draftId: string,
  nextInputs: Record<string, unknown>,
): Promise<void> {
  const { session } = await requireUser();
  // ...
}
```
The new SIRET-lookup action follows the same `'use server'` + `requireUser()`-first + sibling-directory placement (`app/(authed)/proposals/new/_actions/`), but calls `lookupCompanyBySiren(siren)` (`src/lib/registry/recherche-entreprises.ts`) instead of `updateDraft`, and returns `{ ok: true; siret: string | null } | { ok: false }` rather than redirecting — this is a data-fetch action invoked on the SIREN field's `onBlur`, not a mutation. Per RESEARCH.md's Open Question 1, this is the recommended shape over a new `app/api/registry/lookup/route.ts` route handler, matching the codebase's established `.action.ts` convention.

**The call itself — do not build a new registry client:**
```typescript
export type RegistryLookupResult =
  | { ok: true; data: RegistryIdentity }
  | { ok: false; reason: 'not_found' | 'timeout' | 'upstream_error' | 'malformed' };
```
`lookupCompanyBySiren` (already wired for the CRM's SIREN lookup) "RETURNS ITS FAILURES, IT DOES NOT RAISE THEM" (module's own D-09 comment) — the new SIRET prefill call site reuses this unchanged; on `ok: false`, silently fall back to manual entry (D-03 — no inline notice, no spinner, no retry).

---

## Shared Patterns

### Session-hydration over typed input (D-11 discipline)
**Source:** `app/(authed)/proposals/new/parametres/page.tsx:91-107, 240-258`
**Apply to:** `companyTelephone` hydration into the draft's `inputs`.
```typescript
const partnerCo = u.companyName?.trim() || nameFallback;
// Session-derived attribution always wins — never trust a stored/prefilled value.
```

### Better Auth `additionalFields` registration + migration-ordering
**Source:** `src/lib/auth/index.ts:160-173`
**Apply to:** `src/db/schema.ts`, `src/lib/auth/index.ts` — both new telephone columns.
```typescript
partnerType: { type: 'string', required: false, defaultValue: 'Partenaire', input: false },
```
Sequence migration-before-registration across two deploys, never one PR.

### Bounded safeCode extension (ADMIN-09 contract)
**Source:** `app/api/proposals/finalize/route.ts:58-63`
**Apply to:** `finalize-wizard.ts`, `route.ts`, `FinalizeButton.tsx`.
```typescript
const SAFE_ERROR_CODES = new Set(['DraftNotFound', 'NoGlobalParams', 'ValidationFailed', 'FinalizeFailed']);
```
New codes are bare string literals, no interpolated data — additive and safe by construction; the client-side body-parsing is the real work (Pitfall 3).

### Single-source Zod schema (D-29 discipline)
**Source:** `src/lib/calc/schema.ts` module header (lines 1-15)
**Apply to:** `clientSiret` + its cross-field refine — imported identically by the RHF resolver (`ParametresFormCard.tsx`) and the server-side re-parse (`finalizeWizard`). Never write a second, drifting validation rule at either call site.

### Admin write-path completeness (Pitfall 4 discipline)
**Source:** `src/lib/admin/actions.ts:351-358`
**Apply to:** `companyTelephone`/`telephone` on the admin partner form. A schema/copy change alone (loosening `.min(1)`, relabeling) does NOT persist data — the `.update(schema.users).set({...})` call must be extended explicitly, or the field silently continues writing only to `audit_log.payload.profile`.

---

## No Analog Found

None — every file in this phase's scope has at least a role-match analog already in the codebase, per RESEARCH.md's own conclusion ("every mechanism this phase needs already has a working precedent somewhere in this exact codebase, at the exact granularity needed"). The two role-match-not-exact entries (`leasetic_advisor` table vs. `globalParams`, `advisor.ts` vs. `global-params.ts`) are documented above as DELIBERATE divergences, not gaps — copying `globalParams`'s append-only/most-recent-row shape verbatim would violate D-08/D-09.

---

## Metadata

**Analog search scope:** `src/db/`, `src/lib/auth/`, `src/lib/calc/`, `src/lib/registry/`, `src/lib/admin/`, `src/lib/db/queries/`, `src/lib/api/proposals/`, `src/lib/crm/`, `src/components/proposal/`, `src/lib/i18n/`, `app/(authed)/proposals/new/`, `app/(authed)/parametres/`, `app/(admin)/[adminSegment]/`, `app/api/proposals/finalize/`, `drizzle/`.
**Files scanned (read directly):** 24 (`src/db/schema.ts`, `src/lib/db/queries/global-params.ts`, `src/lib/auth/index.ts`, `src/lib/auth/schemas.ts`, `src/lib/calc/schema.ts`, `src/lib/registry/schema.ts`, `src/lib/registry/recherche-entreprises.ts`, `src/lib/crm/siren.ts`, `src/components/proposal/SirenInput.tsx`, `src/components/proposal/PhoneInput.tsx`, `app/(authed)/proposals/new/parametres/ParametresFormCard.tsx`, `app/(authed)/proposals/new/parametres/page.tsx`, `app/(authed)/proposals/new/_actions/saveAsDraft.action.ts`, `app/(authed)/parametres/ParametresForm.tsx`, `src/lib/api/proposals/finalize-wizard.ts`, `app/api/proposals/finalize/route.ts`, `app/(authed)/proposals/new/verification/FinalizeButton.tsx`, `src/lib/admin/schemas.ts`, `src/lib/admin/actions.ts`, `app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx`, `app/(admin)/[adminSegment]/partners/new/page.tsx`, `src/lib/i18n/dictionaries.ts`, `drizzle/meta/_journal.json`, `drizzle/0010_phase34_fiche_client.sql`).
**Pattern extraction date:** 2026-09-08
