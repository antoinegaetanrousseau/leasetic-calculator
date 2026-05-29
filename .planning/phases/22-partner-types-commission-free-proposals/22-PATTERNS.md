# Phase 22: Partner Types & Commission-Free Proposals — Pattern Map

**Mapped:** 2026-05-29
**Files analyzed:** 14 new/modified files
**Analogs found:** 14 / 14

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/db/schema.ts` (modify) | model | CRUD | `src/db/schema.ts` (users additionalFields block) | exact |
| `drizzle/0006_phase22_partner_type.sql` (new) | migration | batch | `drizzle/0004_phase12_drafts_and_history.sql` | exact |
| `scripts/backfill-partner-type.ts` (new) | utility | batch | `scripts/backfill-coefficient-history.ts` | exact |
| `src/lib/calc/formula.ts` (modify) | utility | transform | `src/lib/calc/formula.ts` (commissionPct seam) | exact |
| `src/lib/calc/calc.golden.test.ts` (modify) | test | transform | `src/lib/calc/calc.golden.test.ts` | exact |
| `src/lib/admin/schemas.ts` (modify) | utility | request-response | `src/lib/admin/schemas.ts` (createPartnerFormSchema) | exact |
| `src/lib/admin/actions.ts` (modify) | service | request-response | `src/lib/admin/actions.ts` (adminCreateInvitation + audit pattern) | exact |
| `app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx` (modify) | component | request-response | `app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx` | exact |
| `app/(admin)/[adminSegment]/partners/PartnersList.tsx` (modify) | component | CRUD | `app/(admin)/[adminSegment]/partners/PartnersList.tsx` | exact |
| `app/(admin)/[adminSegment]/partners/page.tsx` (modify) | controller | request-response | `app/(admin)/[adminSegment]/partners/new/page.tsx` | role-match |
| `app/(authed)/proposals/new/calcul/page.tsx` (modify) | controller | request-response | `app/(authed)/proposals/new/calcul/page.tsx` | exact |
| `app/(authed)/proposals/new/verification/page.tsx` (modify) | controller | request-response | `app/(authed)/proposals/new/verification/page.tsx` | exact |
| `src/lib/pdf/no-commission.test.ts` (modify) | test | transform | `src/lib/pdf/no-commission.test.ts` | exact |
| `tests/admin-09-grep-contracts.test.ts` (modify) | test | request-response | `tests/admin-09-grep-contracts.test.ts` | exact |

---

## Pattern Assignments

### `src/db/schema.ts` — add `partner_type` column to `users`

**Analog:** `src/db/schema.ts` lines 44–64 (the `users` table definition)

**additionalFields column pattern** (lines 53–58):
```typescript
// Our additionalFields (registered via betterAuth user.additionalFields in Plan 06-03)
role: text('role').notNull().default('partner'),
displayName: text('display_name'),
language: text('language').notNull().default('fr'),
theme: text('theme').notNull().default('system'),
sessionVersion: integer('session_version').notNull().default(1),
```

**CHECK constraint pattern** (line 63):
```typescript
}, (table) => [
  check('users_role_check', sql`${table.role} IN ('partner', 'admin')`),
]);
```

**What to copy for `partner_type`:**
Add `partnerType: text('partner_type').notNull().default('Partenaire')` alongside the existing `additionalFields` block, then add a check constraint `check('users_partner_type_check', sql\`${table.partnerType} IN ('Agent', 'Commercial', 'Partenaire')\`)` in the table constraints array. The column must have a `default('Partenaire')` to satisfy the PTYPE-02 backfill invariant (existing accounts become Partenaire). The `paramsSnapshot` jsonb type on `proposals` (lines 212–222) must also gain `partnerType: string` and `commissionApplied: boolean` fields.

**Type export pattern** (lines 121–135):
```typescript
export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
```
Add no new exported table; only modify existing type exports.

---

### `drizzle/0006_phase22_partner_type.sql` (new migration)

**Analog:** `drizzle/0004_phase12_drafts_and_history.sql`

**Migration header comment pattern** (lines 1–4):
```sql
-- Plan 12-01 — schema extensions for drafts (DB-01) + ...
-- Per 12-CONTEXT.md decisions D-01..D-09, D-12..D-13, D-18.
-- DDL ONLY. ...
-- DO NOT EDIT BY HAND once committed — superseded by a follow-up migration if changes needed.
```

**ALTER TABLE ADD COLUMN + CHECK pattern** (lines 6–8):
```sql
ALTER TABLE "proposals" ADD COLUMN "status" text NOT NULL DEFAULT 'active';
--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_status_check" CHECK ("status" IN ('draft','active','deleted'));
```

**What to copy for phase 22:**
```sql
-- Plan 22-XX — add partner_type to users; extend proposals.params_snapshot type (jsonb).
-- Per 22-CONTEXT.md decisions D-01/D-02.
-- DDL ONLY. Backfill of existing users → 'Partenaire' is performed by
-- scripts/backfill-partner-type.ts AFTER this migration applies.
-- DO NOT EDIT BY HAND once committed.

ALTER TABLE "users" ADD COLUMN "partner_type" text NOT NULL DEFAULT 'Partenaire';
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_partner_type_check" CHECK ("partner_type" IN ('Agent', 'Commercial', 'Partenaire'));
```
No migration is needed for `proposals.params_snapshot` — it is `jsonb` and the TypeScript type annotation update is sufficient (jsonb has no DB-level column constraint on shape).

**Drizzle guard in `no-commission.test.ts`:** The `KNOWN_MIGRATIONS` set (lines 578–586) must be extended to include `'0006_phase22_partner_type.sql'` when this migration is added.

---

### `scripts/backfill-partner-type.ts` (new — PTYPE-02)

**Analog:** `scripts/backfill-coefficient-history.ts`

**File structure pattern** (lines 1–184):
```typescript
import 'dotenv/config';

const REQUIRED_CONFIRM_VALUE = 'YES';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[backfill] FATAL: DATABASE_URL is not set');
    process.exit(2);
  }

  // Neon-prod typed-confirmation gate (use URL.hostname, NOT URL.host — bug_011)
  let hostname: string;
  try {
    hostname = new URL(databaseUrl).hostname;
  } catch {
    console.error('[backfill] FATAL: DATABASE_URL is malformed');
    process.exit(2);
  }
  const isNeonProd = hostname.endsWith('.neon.tech');
  if (isNeonProd) {
    if (process.env.BACKFILL_CONFIRM !== REQUIRED_CONFIRM_VALUE) {
      console.error(`[backfill] FATAL: Production Neon DB detected (${hostname}). Re-run with BACKFILL_CONFIRM=YES to confirm.`);
      process.exit(2);
    }
  }

  // Lazy imports — env validation runs first.
  const { db, schema } = await import('../src/lib/db/index');
  // ... idempotency check, then UPDATE users SET partner_type='Partenaire' WHERE partner_type IS NULL or similar
}

main().catch((err: unknown) => {
  console.error('[backfill] FATAL:', err);
  process.exit(1);
});
```

**Idempotency check pattern** (lines 116–131):
```typescript
// Idempotency (D-15).
const countRows = (await dbi.select().from(schema.coefficientHistory).limit(1)) as unknown[];
if (countRows.length > 0) {
  console.log(`[backfill] Already backfilled — N rows exist. Exiting 0.`);
  process.exit(0);
}
```

**What differs for PTYPE-02:** Instead of inserting rows into a history table, this script does a single `UPDATE users SET partner_type = 'Partenaire' WHERE partner_type IS NULL OR partner_type = ''` (or, given the column has `DEFAULT 'Partenaire'`, simply a count-check that all rows have a non-null value). The idempotency check tests `SELECT count(*) FROM users WHERE partner_type IS NULL` — if 0 rows, exit 0 (already backfilled). The `changedAt` timestamp preservation trick is not needed here.

---

### `src/lib/calc/formula.ts` — commission-free variant (PTYPE-04)

**Analog:** `src/lib/calc/formula.ts` itself — the `commissionPct` override seam

**The frozen formula** (lines 113–121):
```typescript
/**
 * Apply the v10 frozen formula. Pure arithmetic — no lookups, no state.
 * loyer = amount × (1 + commissionPct/100) × coefficient / 100
 */
export function applyFormula(args: {
  amount: number;
  commissionPct: number;
  coefficient: number;
}): number {
  const { amount, commissionPct, coefficient } = args;
  return (amount * (1 + commissionPct / 100) * coefficient) / 100;
}
```

**The commissionPct override seam** (lines 33–35):
```typescript
/** Override commission percent. Defaults to seedParams.commissionPct. */
commissionPct?: number;
```

**Used in computeLoyer** (lines 143–144):
```typescript
const commissionPct = input.commissionPct ?? seedParams.commissionPct;
```

**Commission-free branch implementation:** Pass `commissionPct: 0` into `computeLoyer`. This resolves to `applyFormula({ amount, commissionPct: 0, coefficient: coeff })`, which expands to `(amount * (1 + 0/100) * coeff) / 100 = amount * coeff / 100` — exactly the `montant HT × coefficient / 100` formula required by PTYPE-04. **The formula function itself is FROZEN and must not change.** The seam already exists; the commission-free branch is purely a call-site decision (pass 0). No modification to `formula.ts` is needed. The change lives in `finalize-wizard.ts` (and the helpers that build `computeArgs`) and in the wizard step-2/3 server compute.

---

### `src/lib/calc/calc.golden.test.ts` — extend golden corpus (PTYPE-04)

**Analog:** `src/lib/calc/calc.golden.test.ts` lines 1–56

**Fixture and call pattern** (lines 32–56):
```typescript
const fixtureCoeffs: Coefficients = {
  t1: { 36: '3.0000', 48: '2.3000', 60: '1.8765' },
  t2: { 36: '2.9000', 48: '2.2500', 60: '1.8500' },
  t3: { 36: '2.8000', 48: '2.2000', 60: '1.8000' },
  t4: { 36: '2.7000', 48: '2.1500', 60: '1.7500' },
};
const fixtureComm = 5;
const fixtureMax = 500_000;

function expectedLoyer(amount: number, coeffStr: string): number {
  return +((amount * (1 + fixtureComm / 100) * Number(coeffStr)) / 100).toFixed(2);
}

function call(amount: number | string, durationMonths: 36 | 48 | 60) {
  return computeLoyer({
    amountHT: typeof amount === 'string' ? amount : String(amount),
    durationMonths,
    validityDays: 30,
    coefficients: fixtureCoeffs,
    commissionPct: fixtureComm,
    maxAmount: fixtureMax,
  });
}
```

**What to add for PTYPE-04:** Add a parallel fixture set with `commissionPct: 0` and a second `expectedLoyerFree` helper using `amount * coeff / 100`. Add a new `describe` block for the commission-free corpus covering the same 4-tranche × 3-duration matrix (12 cases minimum), verifying that `commissionPct: 0` produces `loyer = amount * coeff / 100` to ±0.01 €. Individual `it()` calls (not a for-loop) to preserve the static-count grep gate.

---

### `src/lib/admin/schemas.ts` — add `partnerType` to create-partner form schema

**Analog:** `src/lib/admin/schemas.ts` lines 75–95 (`createPartnerFormSchema`)

**Existing schema pattern** (lines 75–95):
```typescript
export const createPartnerFormSchema = z.object({
  firstName: z.string().min(1, 'error.field.required').max(100),
  lastName: z.string().min(1, 'error.field.required').max(100),
  email: z.string().min(1, 'error.field.required').email('error.field.email.invalid'),
  companyName: z.string().min(1, 'error.field.required').max(200),
  siret: z.string().regex(/^\d{14}$/, 'error.field.siret.invalid').optional().or(z.literal('')),
  phone: z.string().min(1, 'error.field.required').regex(/^[\d\s+()-]{6,20}$/, 'error.field.phone.invalid'),
  invitationMessage: z.string().max(1000, 'partners.new.message.tooLong').optional(),
});
export type CreatePartnerFormValues = z.infer<typeof createPartnerFormSchema>;
```

**What to add for D-03/D-04:** Add a required `partnerType` field with no default (per D-03 "force explicit choice"):
```typescript
partnerType: z.enum(['Agent', 'Commercial', 'Partenaire'], {
  errorMap: () => ({ message: 'error.field.required' }),
}),
```
This field has no `.default()` — the `z.enum` without a default will fail validation when absent, which enforces D-03. The error message key follows the existing `'error.field.required'` convention already used for `firstName`/`lastName`/etc. Update `CreatePartnerFormValues` type accordingly (inferred automatically by Zod).

---

### `src/lib/admin/actions.ts` — thread `partnerType` through invitation + add `adminUpdatePartnerType`

**Analog:** `src/lib/admin/actions.ts`

**requireAdmin-first pattern** (lines 103–104, 136–138, 161–162 — consistent across all actions):
```typescript
export async function adminSomeAction(...): Promise<...> {
  const { session } = await requireAdmin();   // FIRST — PITFALLS §7.3
  try {
    // ... primitive calls ...
    await writeAuditLog({
      actorId: session.user.id,
      action: 'user.some_action',
      targetType: 'user',
      targetId: null,
      payload: { userId, /* no commission fields */ },
      // D-09-09b: ADMIN-09 redaction — this payload intentionally excludes financial rate fields.
    });
  } catch (e) {
    console.error('[adminSomeAction] failed:', e);
    throw new Error('admin.some.error.key');
  }
}
```

**audit_log write pattern for type change** (mirrors `adminDisableUser` lines 143–155):
```typescript
await writeAuditLog({
  actorId: session.user.id,
  action: 'user.partner_type_change',
  targetType: 'user',
  targetId: null,
  payload: {
    userId,
    before: previousType,   // specific type string, not boolean (D-02)
    after: newType,          // specific type string
  },
  // D-09-09b: ADMIN-09 redaction — partner_type is not a commission/rate value.
});
```

**`createPartnerInvitationAction` extension** (lines 485–513): Thread `partnerType` from `CreatePartnerFormValues` through the same path that `companyName`/`siret`/`phone` travel — pass to `adminCreateInvitation` which persists it via a DB `UPDATE users SET partner_type = args.partnerType WHERE id = userRow.id` (alongside the existing `language` update at lines 252–255). The audit `profile` sub-key already captures this shape.

---

### `app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx` — add Type de partenaire selector (D-03/D-04)

**Analog:** `app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx`

**RHF field registration pattern** (lines 99–118, 127–139):
```typescript
const {
  register,
  handleSubmit,
  formState: { errors, isSubmitting, isDirty },
  control,
  reset,
} = useForm<CreatePartnerFormValues>({
  resolver: zodResolver(createPartnerFormSchema),
  mode: 'onBlur',
  shouldFocusError: true,
  defaultValues: {
    firstName: '',
    // ... other fields
  },
});
```

**Field markup pattern** (lines 180–200, the `cpf-firstName` block):
```tsx
<div className="fld">
  <label htmlFor="cpf-firstName">
    {t('partners.new.field.firstName', lang)}
    <span className="req" aria-hidden="true">*</span>
  </label>
  <input
    id="cpf-firstName"
    type="text"
    aria-invalid={errors.firstName ? true : undefined}
    aria-describedby={errors.firstName ? 'cpf-firstName-error' : undefined}
    className={errors.firstName ? 'invalid' : ''}
    disabled={isSubmitting}
    {...register('firstName')}
  />
  {errors.firstName?.message && (
    <p id="cpf-firstName-error" role="alert" className="error-msg">
      {t(errors.firstName.message as DictKey, lang)}
    </p>
  )}
</div>
```

**What to add for D-03/D-04:** Add a `<select>` field for `partnerType` with no default selected value (a disabled placeholder option with `value=""` forces an explicit choice). The field belongs in Section 1 (INFORMATIONS PERSONNELLES) or its own section depending on UX decision. The pattern is:
```tsx
<div className="fld">
  <label htmlFor="cpf-partnerType">
    {t('partners.new.field.partnerType', lang)}
    <span className="req" aria-hidden="true">*</span>
  </label>
  <select
    id="cpf-partnerType"
    aria-invalid={errors.partnerType ? true : undefined}
    aria-describedby={errors.partnerType ? 'cpf-partnerType-error' : undefined}
    className={errors.partnerType ? 'invalid' : ''}
    disabled={isSubmitting}
    {...register('partnerType')}
  >
    <option value="" disabled>—</option>
    <option value="Agent">Agent</option>
    <option value="Commercial">Commercial</option>
    <option value="Partenaire">Partenaire</option>
  </select>
  {errors.partnerType?.message && (
    <p id="cpf-partnerType-error" role="alert" className="error-msg">
      {t(errors.partnerType.message as DictKey, lang)}
    </p>
  )}
</div>
```
Also add `partnerType: ''` (or omit — Zod will catch missing) to `defaultValues`. ADMIN-09: this field is a type enum, not a commission/rate value; the grep gate stays clean.

---

### `app/(admin)/[adminSegment]/partners/PartnersList.tsx` — add type badge/column (D-07)

**Analog:** `app/(admin)/[adminSegment]/partners/PartnersList.tsx`

**Column header pattern** (lines 159–175):
```tsx
<th scope="col" style={{ ...TH_BASE_STYLE, width: 110, textAlign: 'center' }}>
  {t('admin.partners.col.status', lang)}
</th>
```

**Cell render pattern** (lines 220–230):
```tsx
<td style={{ ...TD_BASE_STYLE, borderBottom: lastBorder, textAlign: 'center' }}>
  <StatusChip variant={chipVariant(row.status)} label={chipLabel(row.status, lang)} />
</td>
```

**PartnerRow shape** (imported from `@/lib/db/queries/partners`, line 25). The `PartnerRow` type must gain `partnerType: 'Agent' | 'Commercial' | 'Partenaire'` from the DB query, and the table gains a 7th column. Column styling follows `TH_BASE_STYLE` with appropriate width. For the badge, a small colored chip (matching the `StatusChip` CSS-class approach or an inline `chip-*` class) is the pattern; exact styling is at planner's discretion (see Claude's Discretion in CONTEXT.md).

**ADMIN-09 surface:** `partnerType` is a business-classification field, not a commission/rate value. Adding it to the rendered HTML does not trigger the `commission_pct` or `_pct` grep gates in `tests/admin-09-grep-contracts.test.ts`.

---

### `app/(authed)/proposals/new/calcul/page.tsx` — commission row conditional on `partnerType` (D-05)

**Analog:** `app/(authed)/proposals/new/calcul/page.tsx`

**D-12 commission row** (lines 211–222):
```typescript
const detailRows = [
  { label: t('wizard.step2.detail.montantHT', lang), value: amountHTDisplay },
  {
    // D-12: ADMIN-09 partial relaxation — partner-facing step-2 surface only.
    label: t('wizard.step2.detail.commission', lang),
    value: commissionDisplay,
  },
  { label: `${t('wizard.step2.detail.coefficient', lang)} (tranche ...)`, value: coefficientDisplay },
  { label: t('wizard.step2.detail.duree', lang), value: ... },
  { label: t('wizard.step2.detail.loyer', lang), value: ... },
];
```

**Server compute pattern using commissionPct** (lines 131–142):
```typescript
result = computeLoyer({
  amountHT: parsedData.amountHT,
  durationMonths: parsedData.durationMonths,
  validityDays: parsedData.validityDays,
  coefficients: params.coefficients,
  commissionPct: parseNumeric(params.commissionPct),
  maxAmount: parseNumeric(params.maxAmount),
});
```

**What to change for D-05:** Load `session.user.partnerType` from the user session (Better Auth `additionalFields`). Then:
1. Pass `commissionPct: partnerType === 'Partenaire' ? parseNumeric(params.commissionPct) : 0` to `computeLoyer`.
2. Conditionally include the commission row: only push the commission row into `detailRows` when `partnerType === 'Partenaire'`. For Agent/Commercial: the array skips that entry entirely (structural absence, not CSS display:none). The surrounding rows close up naturally.
3. The `commissionDisplay` and `commissionAmount` variables should not be computed at all when `partnerType !== 'Partenaire'` to avoid materializing the value even in dead code on those paths.

---

### `app/(authed)/proposals/new/verification/page.tsx` — commission row conditional on `partnerType` (D-05)

**Analog:** `app/(authed)/proposals/new/verification/page.tsx`

**D-12 commission row in calculRows** (lines 233–247):
```typescript
const calculRows = [
  { label: 'Coefficient appliqué', value: coefficientDisplay },
  { label: 'Tranche', value: trancheNumber !== null ? String(trancheNumber) : '—' },
  {
    // D-12: ADMIN-09 partial relaxation — partner-facing step-3 review surface.
    label: t('wizard.step2.row.commission', lang),
    value: commissionDisplay,
  },
];
```

**rowSublabels for commission** (lines 326–329):
```tsx
rowSublabels={{
  2: t('wizard.step2.row.commission.sublabel', lang),
}}
```

**What to change for D-05:** Same pattern as calcul/page.tsx. Load `partnerType` from session. Only add the commission entry to `calculRows` when `partnerType === 'Partenaire'`; `rowSublabels` index `2` is only passed when the commission row is included. For Agent/Commercial, the array is 2 rows instead of 3 — clean reflow with no gap (D-05 literal requirement). The `computeLoyer` call passes `commissionPct: 0` for Agent/Commercial.

---

### `src/lib/api/proposals/finalize-wizard.ts` — thread `partnerType` + `commissionApplied` into snapshot (PTYPE-06)

**Analog:** `src/lib/api/proposals/finalize-wizard.ts`

**buildParamsSnapshot call site** (line 197):
```typescript
paramsSnapshot: buildParamsSnapshot(params),
```

**buildComputeArgs call site** (line 172 — the ADMIN-09-sensitive call):
```typescript
const compute = computeLoyer(buildComputeArgs(parsed, params));
```

**What to change for PTYPE-06:** `buildComputeArgs` (in `finalize-helpers.ts`, which hides the commission parameter name from this file per the ADMIN-09 grep-isolation strategy) must accept `partnerType` and pass `commissionPct: partnerType === 'Partenaire' ? params.commissionPct : 0`. Similarly `buildParamsSnapshot` must be extended to include `partnerType` and `commissionApplied` in its return shape (aligning with the `paramsSnapshot` jsonb type extension in `schema.ts`). The `finalizeWizard` function receives `partnerType` from the route handler (which reads it from the authenticated user session).

---

### `src/lib/pdf/no-commission.test.ts` — extend 4-layer corpus for Agent/Commercial (PTYPE-07)

**Analog:** `src/lib/pdf/no-commission.test.ts`

**The 4-layer structural gate pattern** (lines 248–306):
```typescript
// Layer 1: no 'commission' in render data JSON
const renderJson = JSON.stringify(renderArg.data);
expect(renderJson.toLowerCase()).not.toContain('commission');

// Layer 2: no 'commission' in persisted computed jsonb
expect('commission' in finalizePayload.computed).toBe(false);
const computedJson = JSON.stringify(finalizePayload.computed);
expect(computedJson.toLowerCase()).not.toContain('commission');

// Layer 3: paramsSnapshot DOES contain commissionPct (the percentage — required
// for byte-determinism)
expect(finalizePayload.paramsSnapshot.commissionPct).toBe(FIXTURE_PARAMS.commissionPct);
```

**commissionFormatsFor helper** (lines 199–211):
```typescript
function commissionFormatsFor(fixture: ...): string[] {
  const amount = commissionAmountFor(fixture);
  const intAmount = Math.round(amount);
  return [
    formatCurrency(amount, 'fr'),
    formatCurrency(amount, 'en'),
    formatCurrency(intAmount, 'fr'),
    formatCurrency(intAmount, 'en'),
  ];
}
```

**Drizzle migration guard** (lines 565–592):
```typescript
it('no unanticipated schema migrations beyond known set (drizzle guard)', async () => {
  const KNOWN_MIGRATIONS = new Set([
    '0000_striped_metal_master.sql',
    '0001_kind_doctor_faustus.sql',
    '0002_phase8_persistence.sql',
    '0003_seed_global_params.sql',
    '0004_phase12_drafts_and_history.sql',
    '0005_partner_company_name.sql',
  ]);
  // ...
});
```

**What to add for PTYPE-07:** Two additions:
1. Add `partnerType: 'Agent'` and `partnerType: 'Commercial'` variants to the existing 30-fixture loop — or add a new `describe` block that drives `finalizeWizard` with a mock user carrying `partnerType: 'Agent'` and asserts the same 4-layer invariants. The commission amount for Agent/Commercial is `0 × anything = 0`; the `commissionFormatsFor` helper would return `'0,00 €'` / `'€0.00'`, which the test should NOT contain (a `0` loyer would still be fine since it can appear legitimately in other contexts — the test should assert no `'commission'` substring as Layer 1+2 already do).
2. Add `'0006_phase22_partner_type.sql'` to `KNOWN_MIGRATIONS`.

---

### `tests/admin-09-grep-contracts.test.ts` — extend for partner_type surfaces (PTYPE-07)

**Analog:** `tests/admin-09-grep-contracts.test.ts`

**assertNoCommissionLeakage helper** (lines 154–164):
```typescript
const COMMISSION_PCT_RX = /\bcommission_pct\b/i;
const PCT_SUFFIX_RX = /_pct\b/;

function assertNoCommissionLeakage(html: string, surfaceName: string): void {
  expect(html, `D-29 strict: ${surfaceName} HTML must not surface 'commission_pct' token`).not.toMatch(COMMISSION_PCT_RX);
  expect(html, `D-29 strict: ${surfaceName} HTML must not surface any '_pct' field-key suffix`).not.toMatch(PCT_SUFFIX_RX);
}
```

**makePartnerRow fixture** (lines 129–139):
```typescript
function makePartnerRow(overrides: Partial<PartnerRow> = {}): PartnerRow {
  return {
    id: 'p-1',
    email: 'alice@example.com',
    name: 'Alice Example',
    status: 'active',
    createdAt: new Date('2026-04-01T12:00:00Z'),
    lastActivityAt: new Date('2026-05-15T10:00:00Z'),
    ...overrides,
  };
}
```

**Surface 1 test pattern** (lines 170–182):
```typescript
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
```

**What to add for PTYPE-07:** 
1. Update `makePartnerRow` to include `partnerType: 'Partenaire'` in the default fixture (required once `PartnerRow` gains the field).
2. Add new gate(s) as additional `it()` cases within the existing Surface 1 `describe` block — one for each of the three `partnerType` values (`'Agent'`, `'Commercial'`, `'Partenaire'`) — verifying that the partner-type badge/column does not introduce `commission_pct` or `_pct` tokens.
3. Add a new Surface / Gate for the partner detail/edit page (PTYPE-03 type-change surface) following the identical `createElement` + `assertNoCommissionLeakage` shape used for Surfaces 1–4.
4. Add a gate for `CreatePartnerForm` with the `partnerType` field populated (Surface 2 already exists — extend the existing test to pass `partnerType` in the fixture data prop if the form exposes it, and assert the selector renders no commission strings).

---

## Shared Patterns

### requireAdmin() first — all admin server actions
**Source:** `src/lib/admin/actions.ts` lines 103, 136, 161, 234, 316, 357
**Apply to:** `adminUpdatePartnerType` (new action), `createPartnerInvitationAction` extension
```typescript
const { session } = await requireAdmin();   // FIRST — PITFALLS §7.3
```

### writeAuditLog — append-only audit trail on every user mutation
**Source:** `src/lib/admin/actions.ts` lines 114–122, 142–155
**Apply to:** `adminUpdatePartnerType` type-change action (PTYPE-03)
```typescript
await writeAuditLog({
  actorId: session.user.id,
  action: 'user.partner_type_change',
  targetType: 'user',
  targetId: null,
  payload: {
    userId,
    before: previousType,   // the specific type string (D-02)
    after: newType,          // the specific type string (D-02)
  },
  // D-09-09b: partner_type is not a commission/rate field; ADMIN-09 redaction note preserved.
});
```

### ADMIN-09 redaction comment — mandatory on every audit payload write
**Source:** `src/lib/admin/actions.ts` — appears on every `writeAuditLog` call
**Apply to:** all new `writeAuditLog` calls in Phase 22
```typescript
// D-09-09b: ADMIN-09 redaction — this payload intentionally excludes financial rate fields.
```

### Error handling — bounded error keys, no raw DB errors
**Source:** `src/lib/admin/actions.ts` lines 123–129, 150–155
**Apply to:** `adminUpdatePartnerType`, any new server action
```typescript
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error('[actionName] failed:', msg);
  throw new Error('admin.partners.error.type_change');  // stable i18n key
}
```

### commissionPct: 0 seam — commission-free compute
**Source:** `src/lib/calc/formula.ts` lines 33–35, 143–144
**Apply to:** `finalize-wizard.ts` + both wizard step pages for Agent/Commercial
```typescript
// Commission-free branch: pass commissionPct: 0 to computeLoyer.
// applyFormula({ amount, commissionPct: 0, coefficient }) = amount * coefficient / 100
// — the frozen formula is NOT changed; 0 is a valid argument.
commissionPct: partnerType === 'Partenaire' ? parseNumeric(params.commissionPct) : 0
```

### Structural absence (not CSS hiding) — commission for Agent/Commercial
**Source:** `app/(authed)/proposals/new/calcul/page.tsx` lines 211–243 (the `detailRows` array)
**Apply to:** calcul/page.tsx, verification/page.tsx, PDF render path, `buildComputedJson`, `buildPdfComputed`
The commission entry is simply not added to the rows array or to the data objects. There is no `display: none`, no conditional JSX that renders an empty slot, no empty string placeholder. The array is shorter.

### window.confirm for type-change confirmation dialog (D-08)
**Source:** `app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx` lines 151–159
**Apply to:** partner type-change UI (D-08 confirmation before committing the change)
```typescript
// window.confirm is the UI-SPEC line 443 baseline.
// No project-wide ConfirmDialog primitive exists — use window.confirm.
const confirmed = window.confirm(t('admin.partners.type.change.confirm', lang));
if (!confirmed) return;
```

### `force-dynamic` on every cookie/session-reading page
**Source:** `app/(authed)/proposals/new/calcul/page.tsx` line 64; `app/(admin)/[adminSegment]/partners/new/page.tsx` line 34
**Apply to:** any new admin page that reads `requireAdmin()` or session data
```typescript
export const dynamic = 'force-dynamic';
```

### Zod schema — `z.enum` with no default for required selector (D-03)
**Source:** `src/lib/admin/schemas.ts` lines 51–55 (`createPartnerSchema.language`)
**Pattern to follow for `partnerType`:** Unlike `language` which has `.default('fr')`, `partnerType` must have no default. A `z.enum(...)` without `.default()` will fail parse when the field is absent, enforcing D-03's "force explicit choice."

---

## No Analog Found

All files in Phase 22 have close analogs in the codebase. No file requires falling back to RESEARCH.md external patterns.

---

## Metadata

**Analog search scope:** `src/db/`, `src/lib/calc/`, `src/lib/pdf/`, `src/lib/admin/`, `src/lib/api/proposals/`, `app/(admin)/[adminSegment]/partners/`, `app/(authed)/proposals/new/`, `tests/`, `drizzle/`, `scripts/`
**Files scanned:** 22
**Pattern extraction date:** 2026-05-29
