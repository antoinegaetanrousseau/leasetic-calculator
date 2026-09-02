# Phase 31: Reconciliation Engine & Proposal Extraction - Pattern Map

**Mapped:** 2026-09-02
**Files analyzed:** 19 (new/modified)
**Analogs found:** 17 / 19 (2 have no close analog — engine core logic is genuinely new)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `scripts/reconcile-proposals.ts` (or similar, D-13) | CLI script | batch | `scripts/backfill-coefficient-history.ts` | exact (idempotency-gated backfill shape) |
| `scripts/_load-env.ts` | utility | — | unchanged, imported as-is | n/a — reused verbatim |
| `src/db/schema.ts` (add `provenance`/`source` column on `contacts`, new pair-decision table) | model (Drizzle schema) | CRUD | `src/db/schema.ts` companies/clientRelationships/contacts block (lines 350-438) | exact |
| `drizzle/00NN_phase31_reconciliation.sql` (generated) | migration | batch | `drizzle/0007_phase30_crm_registry.sql` | exact |
| `drizzle/meta/_journal.json` (regenerated entry) | config | — | existing journal entries | exact |
| `src/lib/reconcile/engine.ts` (or similar — dedup/match core, Phase 32-reusable) | service | transform/batch | *(no close analog — first dedup/matching engine in codebase)* | none |
| `src/lib/reconcile/report.ts` (dry-run MD+JSON writer) | utility | file-I/O | *(no close analog — first file-writing report in codebase)* | none |
| `src/lib/db/queries/reconciliation.ts` (admin-side: list flagged pairs, resolve pair) | service (query module) | CRUD | `src/lib/db/queries/companies.ts` (admin, non-owner-filtered) | exact |
| `src/lib/db/queries/audit-log.ts` (extend `AuditAction`/`AuditTargetType` union) | model/utility | event-driven | same file, Phase 30 CRM block (lines 29-37) | exact (extend, don't invent) |
| `src/lib/crm/schemas.ts` or new `src/lib/reconcile/schemas.ts` (merge/keep-separate input validation) | utility (zod schema) | — | `src/lib/crm/schemas.ts` (whole file) | exact |
| `src/lib/reconcile/actions.ts` (`mergeCompanyPairAction`, `keepPairSeparateAction`) | service (server actions) | request-response | `src/lib/crm/actions.ts` (whole file) | exact |
| `app/(admin)/[adminSegment]/companies/review/page.tsx` | route (server component page) | request-response | `app/(admin)/[adminSegment]/companies/page.tsx` | exact |
| `app/(admin)/[adminSegment]/companies/review/PairReviewList.tsx` (or embedded in page) | component | request-response | `app/(admin)/[adminSegment]/companies/CompaniesList.tsx` | role-match (list/cursor shape; card-not-table divergence noted in UI-SPEC) |
| `app/(admin)/[adminSegment]/companies/review/PairReviewCard.tsx` | component | request-response | `app/(admin)/[adminSegment]/companies/[id]/CompanyRelationsTable.tsx` (owner badge + counts rendering) | role-match |
| `app/(admin)/[adminSegment]/companies/review/MergeDialog.tsx` | component | request-response | `app/(authed)/clients/[id]/ContactFormDialog.tsx` | role-match (Dialog + form + RHF/zod, but this one uses RadioGroup not text Fields) |
| `app/(admin)/[adminSegment]/companies/review/KeepSeparateDialog.tsx` | component | request-response | `app/(authed)/clients/[id]/DeleteContactDialog.tsx` | exact (pure-confirm AlertDialog, non-destructive-colored variant) |
| `src/components/ui/AppSidebar.tsx` (add `admin-reconciliation` nav entry) | component | — | same file, `adminNavItems()` (lines 128-138) | exact |
| `src/components/ui/Shell.tsx` (add `reconciliation` to `adminHrefs`) | component | — | same file, `adminHrefs` object (lines 63-72) | exact |
| `src/lib/route-meta.ts` (extend `ActiveNav`, add `/companies/review` tail match before `/companies`) | utility | — | same file, `getRouteMeta()` (lines 37-56) | exact |
| `src/lib/i18n/dictionaries.ts` (add `admin.reconciliation.*` + `sidebar.nav.adminReconciliation` keys, fr+en) | config (i18n) | — | same file, `admin.companies.*` block (lines 1000-1023 fr / 1947-1968 en) | exact |

## Pattern Assignments

### `scripts/reconcile-proposals.ts` (CLI script, batch)

**Analog:** `scripts/backfill-coefficient-history.ts` (full file read; `scripts/backfill-partner-type.ts` corroborates the shorter shape), plus `scripts/migrate.ts` for the `--dry-run` flag convention.

**Imports / entry-point pattern** (backfill-coefficient-history.ts lines 1, 40, 81-83):
```typescript
import './_load-env';   // MUST be the first import — see scripts/_load-env.ts

// ... typed-confirmation gate (below) runs BEFORE any DB import ...

// Lazy imports — env validation runs first.
const { db, schema } = await import('../src/lib/db/index');
const dbi = db();
```

**Neon-prod typed-confirmation gate** (backfill-coefficient-history.ts lines 84-108, verbatim-reusable):
```typescript
const REQUIRED_CONFIRM_VALUE = 'YES';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[backfill] FATAL: DATABASE_URL is not set');
    process.exit(2);
  }
  // bug_011: use URL.hostname (bare DNS name) NOT URL.host (includes port).
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
  // ...
}
```
Rename the env var / gate name for this script (e.g. `RECONCILE_CONFIRM`), but keep the `hostname` (not `host`) check and the `*.neon.tech` suffix test — this is a documented bug-class fix (bug_011), not stylistic.

**Dry-run flag pattern** (`scripts/migrate.ts` lines 41, 61-64):
```typescript
const dryRun = process.argv.includes('--dry-run');
// ... later ...
if (dryRun) {
  console.log('\n[dry-run] ...');
  process.exit(0);
}
```
D-13/D-14/D-15 require this script to support at minimum `--dry-run` (writes the two-form report, zero DB writes) and a real-run mode that diffs against the last dry-run report before writing. `migrate.ts`'s `process.argv.includes('--dry-run')` is the established flag-parsing idiom in this codebase (no CLI-args library is used anywhere in `scripts/`).

**Idempotency check pattern** (backfill-coefficient-history.ts lines 116-129):
```typescript
const countRows = (await dbi.select().from(schema.someTable).limit(1)) as unknown[];
if (countRows.length > 0) {
  const { sql } = await import('drizzle-orm');
  const result = (await dbi.execute(sql`SELECT COUNT(*)::int AS count FROM some_table`)) as ...;
  const rows = Array.isArray(result) ? result : result.rows;
  const n = rows[0]?.count ?? 0;
  console.log(`[backfill] Already backfilled — ${n} rows exist. Exiting 0.`);
  process.exit(0);
}
```
Note the `postgres-js` vs `@neondatabase/serverless` result-shape unwrap (`Array.isArray(result) ? result : result.rows`) — required any time `dbi.execute(sql\`...\`)` is used directly instead of the query builder, because the driver differs between local/OVH (postgres-js) and Neon prod (`@neondatabase/serverless` HTTP driver).

**Progress logging pattern** (backfill-coefficient-history.ts lines 143-172):
```typescript
console.log(`[backfill] Found ${allRows.length} row(s). Inserting...`);
let inserted = 0;
for (let i = 0; i < allRows.length; i++) {
  // ... per-row work ...
  inserted++;
  console.log(`[backfill] + inserted ... id=${current.id} ...`);
}
console.log(`[backfill] Done. Inserted ${inserted} rows.`);
process.exit(0);
```

**Fatal error pattern** (every backfill script, verbatim):
```typescript
main().catch((err: unknown) => {
  console.error('[backfill] FATAL:', err);
  process.exit(1);
});
```

**package.json wiring** (mirrors `db:backfill:coefficient-history` / `db:backfill:partner-type`):
```json
"db:reconcile:dry-run": "tsx -r ./scripts/_preload-mock-server-only.cjs scripts/reconcile-proposals.ts --dry-run",
"db:reconcile": "tsx -r ./scripts/_preload-mock-server-only.cjs scripts/reconcile-proposals.ts"
```

---

### `src/db/schema.ts` (provenance column + pair-decision table, D-08/D-09)

**Analog:** same file, Phase 30 CRM registry block (`src/db/schema.ts:350-438`).

**Table + index + generated-column pattern** (schema.ts lines 366-388, `companies`):
```typescript
export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  nameNormalized: text('name_normalized')
    .notNull()
    .generatedAlwaysAs(sql`leasetic_normalize_company_name(name)`),
  siren: text('siren').unique(),
  // ...
}, (table) => [
  check('companies_siren_check', sql`${table.siren} IS NULL OR ${table.siren} ~ '^[0-9]{9}$'`),
  index('companies_name_normalized_idx').on(table.nameNormalized),
  uniqueIndex('companies_hubspot_company_id_uq')
    .on(table.hubspotCompanyId)
    .where(sql`${table.hubspotCompanyId} IS NOT NULL`),
]);
```

**D-08 provenance column** — follow the `contacts` table's simple nullable-with-default-null-meaning-"human" text/enum column shape (schema.ts lines 418-438), commented with the same "cheap column now" framing CRM-08 used for `hubspotContactId`/`syncedAt` (schema.ts lines 373-376, 427-429).

**D-09 pair-decision table** — model on `clientRelationships` (schema.ts lines 396-410): a small table with a `uniqueIndex` on the natural key (D-10: the normalized-name PAIR, not company ids — likely `uniqueIndex(...).on(nameNormalizedA, nameNormalizedB)` with a canonical ordering, e.g. lexicographically sorted, enforced at write time since Postgres can't enforce "unordered pair uniqueness" directly), plus a `verdict` text/enum column, `decidedBy` (text, FK to `users.id`, mirrors `ownerId` FK style at schema.ts:400), and `decidedAt` timestamp. Use the same `text('...').references(() => users.id, { onDelete: '...' })` FK idiom as `clientRelationships.ownerId`.

**Type export pattern** (schema.ts lines 452-458, append after):
```typescript
export type CompanyRow = typeof companies.$inferSelect;
export type NewCompanyRow = typeof companies.$inferInsert;
```

---

### `drizzle/00NN_phase31_reconciliation.sql` (migration, D-08/D-09)

**Analog:** `drizzle/0007_phase30_crm_registry.sql` (full file read).

**Critical constraint (from orchestrator hints, verified in `drizzle.config.ts` header):**
```
NEVER USE: drizzle-kit push. Push is forbidden in this codebase per BOOT-09/10
(see STATE.md locked decision). Migrations are applied to production ONLY via
the explicit GitHub Action workflow (.github/workflows/db-migrate.yml).

Workflow:
  1. Edit src/db/schema.ts
  2. Run `npm run db:generate` — produces drizzle/{NNNN}_*.sql
  3. Review the SQL, commit it
  4. Apply locally: `npx drizzle-kit migrate` (reads committed SQL, does NOT diff schema)
```
Enforced by `scripts/check-no-drizzle-push.sh` (git-tracked-files-only grep gate for the literal phrase).

**Journal-parity gate** (`scripts/check-migration-journal-sync.sh`, INFRA-06): every `.sql` file under `drizzle/[0-9]*.sql` MUST have a matching `"tag"` entry in `drizzle/meta/_journal.json`, in both directions. This is generated automatically by `npm run db:generate` — **never hand-author the SQL file or journal entry**. The Phase 30 migration required one hand-edit AFTER `db:generate` (prepending the `leasetic_normalize_company_name()` function before `CREATE TABLE companies`, and reordering the role-CHECK-drop/backfill/CHECK-re-add sequence) — if Phase 31's migration needs similar hand-completion (e.g. because the pair-decision table's uniqueness-on-unordered-pair can't be expressed as a plain Drizzle unique index and needs a raw `CREATE UNIQUE INDEX ... (LEAST(a,b), GREATEST(a,b))` or a `CHECK` constraint), follow the same "hand-completed on top of generate output, DO NOT EDIT BY HAND once committed" comment convention at the top of the file (0007's line 1-6).

**FK + index declaration pattern** (0007_phase30_crm_registry.sql, representative lines):
```sql
ALTER TABLE "client_relationships" ADD CONSTRAINT "client_relationships_company_id_companies_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "client_relationships_company_id_owner_id_uq"
  ON "client_relationships" USING btree ("company_id","owner_id");
```

---

### `src/lib/db/queries/reconciliation.ts` (admin-side query module — list flagged pairs, resolve pair)

**Analog:** `src/lib/db/queries/companies.ts` (full file read).

**Module-header discipline to copy verbatim** (companies.ts lines 6-24):
```typescript
/**
 * ADMIN-ONLY query module. Every function here MUST be called behind
 * requireAdmin() — this module performs NO authorization of its own. Kept
 * separate from owner-scoped modules so an accidental import of an unscoped
 * admin query into a partner-facing page is visible on the import line.
 * No function here takes an ownerId filter.
 *
 * ADMIN-09: no function here selects proposals.params_snapshot, anything
 * from global_params, or proposals.computed beyond the single client-facing
 * monthly scalar.
 */
```

**Cursor pagination pattern** (companies.ts lines 46-145, `listCompaniesForAdmin`) — base64url-encoded `{createdAt, id}` cursor, `sql\`(${col1}, ${col2}) < (${decoded.a}::timestamptz, ${decoded.b}::uuid)\`` composite comparison, `fetchCount = limit + 1` / `hasMore` / `slice`. Reuse this exact shape for the pair-review queue's cursor (FIFO oldest-flagged-first per UI-SPEC §1, so order by the pair-decision-candidate's first-flagged timestamp ASC instead of `createdAt DESC`).

**Aggregation/count pattern** (companies.ts lines 97-126) — `leftJoin` + `COUNT(DISTINCT ...)` + `.groupBy(...)` for the relations/contacts/proposals counts shown per side of a `PairReviewCard`.

**Admin relationship-with-owner-identity join** (companies.ts lines 185-236, `listRelationshipsForCompany`) — the exact join shape (`innerJoin(users, ...)`, `isInternal: role === 'sales'`, `ownerDisplayName` fallback to email) needed for each side's owner-badge rendering, and for computing D-12's compound-merge-warning owner name (UI-SPEC Assumption A-4: `compoundMergeWarning: { ownerName, ownerType }`).

**No analog exists yet for:** the "list flagged pairs" query itself (joins the new pair-decision table to `companies` twice, once per side) — this is genuinely new, but should follow the same cursor + aggregation conventions above.

---

### `src/lib/db/queries/audit-log.ts` (extend action vocabulary, D-08/D-09/D-12)

**Analog:** same file, Phase 30 extension block (lines 8-37).

**Extension pattern** (audit-log.ts lines 29-37, the precedent to follow exactly):
```typescript
export type AuditAction =
  | 'proposal.create'
  // ...
  // ── Phase 30 — Company & Contact Registry write layer (CRM-01/02/04) ───────
  // Payloads carry only ids and caller-submitted values — never commission
  // data, never the pre-existing/new-company distinction (T-30-05-02/07).
  | 'client_relationship.create'
  | 'contact.create'
  | 'contact.update'
  | 'contact.delete';

export type AuditTargetType = 'proposal' | 'user' | 'global_params' | 'client_relationship' | 'contact';
```
Phase 31 should append a new commented section (`// ── Phase 31 — Reconciliation engine (IMPORT-01..06) ──`) with actions such as `'company.merge'`, `'company_pair.keep_separate'`, `'client_relationship.merge'`, plus whatever extraction-created rows need (`'client_relationship.extract'`, `'contact.extract'`, `'company.extract'` — or reuse `'client_relationship.create'`/`'contact.create'` with a `payload.source` discriminator; planner's call, matches D-08's "provenance marker" spirit). Extend `AuditTargetType` with `'company'` and the pair-decision target type if pairs themselves get audited.

**`writeAuditLog` call-site pattern** (crm/actions.ts lines 138-147, 218-224):
```typescript
await writeAuditLog({
  actorId: session.user.id,
  action: 'client_relationship.create',
  targetType: 'client_relationship',
  targetId: relationshipId,
  payload: { companyId },  // ids only — never business data
});
```
For the CLI script (system-initiated, no session), use `actorId: null` per the existing convention documented at audit-log.ts:40 (`// null when system-initiated (e.g., 'proposal.purge' via cron)`).

---

### `src/lib/reconcile/schemas.ts` (merge / keep-separate input validation)

**Analog:** `src/lib/crm/schemas.ts` (full file read).

**Zod schema + reuse-discipline pattern** (crm/schemas.ts lines 1-11, 22-32):
```typescript
import { z } from 'zod';

/**
 * Reuse discipline: [existing i18n keys] already exist in the dictionary —
 * these schemas emit those exact keys rather than minting new strings.
 */
export const createClientSchema = z.object({
  name: z.string().trim().min(1, { message: 'error.field.required' }),
  siren: z
    .string()
    .optional()
    .transform((v) => (v ? v.replace(/\D/g, '') : undefined))
    .transform((v) => (v === undefined || v.length === 0 ? undefined : v))
    .refine((v) => v === undefined || /^[0-9]{9}$/.test(v), { message: 'error.field.siren.invalid' }),
});
```
**D-03 reuse note (load-bearing):** the SIREN-to-digits-only transform above (`v.replace(/\D/g, '')` → `/^[0-9]{9}$/` check → `undefined` if malformed) is EXACTLY D-03's required behavior for the extraction engine — the CONTEXT.md orchestrator hint says D-03 "should reuse it rather than write a second normalizer." Import/reuse this transform (or factor it into a shared helper both `crm/schemas.ts` and the engine import) rather than reimplementing SIREN digit-stripping in `src/lib/reconcile/`.

**Survivor-selection input for `mergeCompanyPairAction`** — a small schema like `z.object({ pairKey: z.string(), survivorCompanyId: z.string().uuid() })`, following the flat-object, message-key-only-errors convention above.

---

### `src/lib/reconcile/actions.ts` (`mergeCompanyPairAction`, `keepPairSeparateAction`)

**Analog:** `src/lib/crm/actions.ts` (full file read, including the `1d763b9` TOCTOU fix).

**Module header / auth-first / bounded-error discipline** (crm/actions.ts lines 1-40, verbatim pattern to copy):
```typescript
'use server';

/**
 * PITFALLS §7.3 ordering — every exported function calls requireAdmin() as
 * the FIRST await, before any DB access.
 *
 * Bounded-error discipline: every failure class in every action throws the
 * single key 'admin.reconciliation.toast.error' (mirrors clients.toast.error).
 * The raw error is logged server-side only (console.error).
 */
const BOUNDED_ERROR = 'admin.reconciliation.toast.error';

export async function mergeCompanyPairAction(pairKey: string, survivorCompanyId: string): Promise<void> {
  await requireAdmin(); // FIRST — PITFALLS §7.3, admin not requireRelationshipHolder (D-11)
  try {
    // ...
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[mergeCompanyPairAction] failed:', msg);
    throw new Error(BOUNDED_ERROR);
  }
}
```
Difference from `crm/actions.ts`: this module gates with `requireAdmin()` (D-11), not `requireRelationshipHolder()` — copy the auth-first *shape*, swap the guard function. Import from `@/lib/auth/require`.

**Non-transactional multi-step write discipline** (crm/actions.ts lines 19-30, load-bearing constraint to inherit):
```
Non-transactional by design: Neon production driver is drizzle-orm/neon-http,
whose .transaction() throws "No transactions support in neon-http driver" at
runtime. Every multi-step sequence is built from individually-atomic,
idempotent statements: ON CONFLICT DO NOTHING + a re-select on the same
unique index, so a crash between steps leaves at worst a harmless orphan row
and a retry is always safe.
```
D-12's merge is inherently multi-step (repoint relationships → repoint contacts → repoint proposal links → handle the compound-relationship-merge case → delete loser company) and MUST be decomposed the same way — each step independently safe to retry, no `db().transaction()`.

**INSERT...SELECT ownership-proof pattern (T-30-05-05 TOCTOU fix, commit `1d763b9`)** — directly applicable to any repoint/merge statement that must re-verify a precondition (e.g. "this pair is still unresolved" / "this company still exists") in the same statement as the write, not a separate SELECT-then-UPDATE:
```typescript
// Do NOT: SELECT to check, then a separate UPDATE/INSERT based on that check.
// DO: compile the check into the write statement's own WHERE/source-SELECT so
// a failed check yields zero affected rows — the only failure signal, and
// "already resolved" stays indistinguishable from a race with another admin.
const updated = await dbi
  .update(schema.clientRelationships)
  .set({ companyId: survivorCompanyId })
  .where(and(
    eq(schema.clientRelationships.companyId, loserCompanyId),
    /* re-prove the pair is still flagged/unresolved here */
  ))
  .returning();
```
This directly answers D-15's "compares against the last dry-run and reports drift" concern for the *real script run* too — the same one-statement-proves-precondition discipline prevents a stale dry-run assumption from silently double-applying.

**`ON CONFLICT DO NOTHING` + re-select idempotency pattern** (crm/actions.ts lines 66-105) — needed for the "two proposals create the same company" case inside the extraction engine itself (D-04's non-flagged happy path):
```typescript
const inserted = await dbi.insert(schema.companies)
  .values({ name: input.name, siren: input.siren })
  .onConflictDoNothing({ target: schema.companies.siren })
  .returning();
if (inserted[0]) {
  companyId = inserted[0].id;
} else {
  // A concurrent creator won the race — re-select rather than branch outcome.
  const reselected = await dbi.select({ id: schema.companies.id })
    .from(schema.companies).where(eq(schema.companies.siren, input.siren)).limit(1);
  companyId = reselected[0].id;
}
```

---

### `app/(admin)/[adminSegment]/companies/review/page.tsx` (route)

**Analog:** `app/(admin)/[adminSegment]/companies/page.tsx` (full file read).

**Full page-component pattern to copy** (page.tsx entire 76 lines):
```typescript
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { PageHero } from '@/components/ui/PageHero';

export const dynamic = 'force-dynamic'; // PITFALLS §1.6 — cookie/session-reading route

export const metadata: Metadata = {
  title: 'Réconciliation — Leasétic Matrice',
  robots: { index: false, follow: false },
};

export default async function ReconciliationReviewPage({ params, searchParams }: PageProps) {
  const { adminSegment } = await params;
  await requireAdmin(); // FIRST — auth before any data access (AUTH-15 defense in depth), notFound() not 403 (D-18)
  const lang = await getCurrentLang();
  // ... fetch flagged pairs via cursor, render PageHero (no actions prop per UI-SPEC) + list/empty-state ...
}
```
Note UI-SPEC §1 explicitly says **no `actions` prop** on `PageHero` (no page-level CTA) — this is a deliberate divergence from the `companies` page's likely future CTA additions, not an oversight.

---

### `PairReviewList` / `PairReviewCard` (components)

**Analog:** `CompaniesList.tsx` for the cursor/empty-state shell shape; `CompanyRelationsTable.tsx` for the per-row owner-badge + counts rendering that becomes per-*side* rendering inside a card.

**Cursor "Charger plus" footer pattern** (CompaniesList.tsx lines 141-152, reuse verbatim):
```tsx
{nextCursor && (
  <div className="px-5 py-4 text-center">
    <Link
      href={`/${adminSegment}/companies/review?cursor=${encodeURIComponent(nextCursor)}`}
      className="btn-out inline-flex items-center gap-2 text-[13px] no-underline"
    >
      {t('proposal.list.load.more', lang)}
    </Link>
  </div>
)}
```
(UI-SPEC §1 confirms: reuse `proposal.list.load.more`, no new key needed for this string.)

**Owner badge pattern** (CompanyRelationsTable.tsx lines 96-105, reuse verbatim — UI-SPEC explicitly says "reused verbatim from `admin.companies.relation.type.*`, same chrome, same tokens, no new badge variant"):
```tsx
<Badge
  variant="secondary"
  className="rounded-full border-transparent bg-border text-[11.5px] font-semibold tracking-[0.02em] text-ink shadow-none"
>
  {r.isInternal ? t('admin.companies.relation.type.sales', lang) : t('admin.companies.relation.type.partner', lang)}
</Badge>
```

**Literal counts, never em-dash, never for real zero** (CompanyRelationsTable.tsx lines 108-115 comment + code) — apply identically to the "{n} relations · {n} contacts · {n} propositions" line UI-SPEC specifies per side.

**Stretched-link row-to-detail navigation** (CompaniesList.tsx lines 111-120) — the per-side company-name link to `/${adminSegment}/companies/${id}` should use the same `text-foreground hover:text-primary` internal-link convention (UI-SPEC §1: "matching the existing internal-link convention").

**Empty/success state** (ContactList.tsx / page.tsx pattern, `Empty`/`EmptyMedia`/`EmptyTitle`/`EmptyDescription` from `@/components/ui/empty`, `variant="icon"` on `EmptyMedia`) — UI-SPEC §1 gives the exact JSX to use with `CheckCircleIcon` (imported from `@/components/ui/icons`, re-exported from `../icons/CheckCircleIcon`).

**No analog for:** the two-column side-by-side comparison grid itself (`grid grid-cols-2 gap-5`) — genuinely new composition per UI-SPEC's own note ("bespoke composition of existing primitives... no `@reui` block matches this shape").

---

### `MergeDialog.tsx`

**Analog:** `ContactFormDialog.tsx` (full file read) for the Dialog + RHF/zod + submit/error/toast shape; **first real use of `radio-group.tsx`** outside primitive-internal usage (UI-SPEC Component Inventory), so the `RadioGroup`/`RadioGroupItem` composition itself has no page-level precedent — read `src/components/ui/radio-group.tsx`'s own props/exports directly when implementing.

**Dialog shell + RHF submit/error pattern** (ContactFormDialog.tsx lines 85-100, 106-113, 178-186):
```tsx
const onSubmit = async (data: FormValues) => {
  try {
    await mergeCompanyPairAction(pairKey, data.survivorCompanyId);
    toast.success(t('admin.reconciliation.merge.toast.success', lang));
    onOpenChange(false);
    router.refresh();
  } catch {
    toast.error(t('admin.reconciliation.toast.error', lang));
    // Dialog stays open so the caller can retry without re-entering data.
  }
};

<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="rounded-[24px]"> {/* Container Radius contract, first dialog adopter */}
    <DialogHeader><DialogTitle>{t('admin.reconciliation.merge.title', lang)}</DialogTitle></DialogHeader>
    <form onSubmit={handleSubmit(onSubmit)} noValidate aria-busy={isSubmitting || undefined}>
      {/* RadioGroup here instead of Field/Input */}
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" disabled={isSubmitting} />}>
          {t('admin.reconciliation.merge.cancel', lang)}
        </DialogClose>
        <Button type="submit" variant="destructive" disabled={isSubmitting || !survivorSelected}>
          {t('admin.reconciliation.merge.confirm', lang)}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```
Per UI-SPEC: `DialogContent` gets a `rounded-[24px]` className override (Container Radius exception, first application to dialog chrome in the app — flag this explicitly to the planner as new, not a copy of any existing dialog's radius).

---

### `KeepSeparateDialog.tsx`

**Analog:** `DeleteContactDialog.tsx` (full file read) — near-exact structural match, confirm-only `AlertDialog`, **but NOT destructive-colored** (UI-SPEC §3: `AlertDialogAction` stays at primitive default `variant="outline"`, no override, unlike `DeleteContactDialog`'s `variant="destructive"`).

**Pattern to copy, with the one variant difference called out** (DeleteContactDialog.tsx lines 47-88):
```tsx
const onConfirm = async () => {
  if (!pair) return;
  setIsSubmitting(true);
  try {
    await keepPairSeparateAction(pair.pairKey);
    toast.success(t('admin.reconciliation.keepSeparate.toast.success', lang));
    onOpenChange(false);
    router.refresh();
  } catch {
    toast.error(t('admin.reconciliation.toast.error', lang));
  } finally {
    setIsSubmitting(false);
  }
};

<AlertDialog open={open} onOpenChange={onOpenChange}>
  <AlertDialogContent className="rounded-[24px]">
    <AlertDialogHeader>
      <AlertDialogTitle>{t('admin.reconciliation.keepSeparate.title', lang)}</AlertDialogTitle>
      <AlertDialogDescription>{/* interpolated with both company names */}</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isSubmitting}>{t('admin.reconciliation.keepSeparate.cancel', lang)}</AlertDialogCancel>
      {/* NO variant="destructive" override here — differs from DeleteContactDialog */}
      <AlertDialogAction disabled={isSubmitting} onClick={onConfirm}>
        {t('admin.reconciliation.keepSeparate.confirm', lang)}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

### `src/components/ui/AppSidebar.tsx` (add nav entry)

**Analog:** same file, `adminNavItems()` (lines 128-138).

**Exact insertion point** (immediately after `admin-companies`, per UI-SPEC §4):
```typescript
function adminNavItems(hrefs: NonNullable<AppSidebarProps['adminHrefs']>): NavItem[] {
  return [
    { key: 'admin-home', icon: HomeIcon, labelKey: 'sidebar.nav.home', href: hrefs.home },
    { key: 'proposals-new', icon: PlusIcon, labelKey: 'sidebar.nav.proposalsNew', href: '/proposals/new/parametres' },
    { key: 'proposals', icon: ProposalIcon, labelKey: 'sidebar.nav.proposals', href: '/proposals' },
    { key: 'admin-partners', icon: UsersIcon, labelKey: 'sidebar.nav.adminPartners', href: hrefs.partners },
    { key: 'admin-companies', icon: BuildingIcon, labelKey: 'sidebar.nav.adminCompanies', href: hrefs.companies },
    { key: 'admin-reconciliation', icon: AlertTriangleIcon, labelKey: 'sidebar.nav.adminReconciliation', href: hrefs.reconciliation },
    { key: 'admin-coefficients', icon: SlidersIcon, labelKey: 'sidebar.nav.adminCoefficients', href: hrefs.coefficients },
    { key: 'help', icon: HelpIcon, labelKey: 'sidebar.nav.help', href: '/aide' },
  ];
}
```
Also extend the `adminHrefs` prop type (AppSidebar.tsx lines 72-78) with `reconciliation: string`. `AlertTriangleIcon` needs importing into AppSidebar.tsx (currently imported in `app/error.tsx`, `SaveConfirmModal.tsx`, `CoefficientWarningBanner.tsx` — same `@/components/ui/icons` barrel).

**partnerNavItems() must NOT change** — UI-SPEC Access & Non-Leakage Contract point 2 is explicit: no partner-facing trace of this surface anywhere.

---

### `src/components/ui/Shell.tsx` (add href)

**Analog:** same file, `adminHrefs` object (lines 63-72).

```typescript
const adminHrefs =
  isAdmin && adminSegment
    ? {
        home: `/${adminSegment}`,
        coefficients: `/${adminSegment}/coefficients`,
        partners: `/${adminSegment}/partners`,
        companies: `/${adminSegment}/companies`,
        reconciliation: `/${adminSegment}/companies/review`,  // NEW
        history: `/${adminSegment}/history`,
      }
    : undefined;
```

---

### `src/lib/route-meta.ts` (extend ActiveNav, order-sensitive tail match)

**Analog:** same file, `getRouteMeta()` (lines 37-56).

**Critical ordering constraint (UI-SPEC §4, explicit planner warning):**
```typescript
export type ActiveNav =
  | 'home' | 'proposals-new' | 'proposals' | 'clients' | 'history' | 'help'
  | 'admin-home' | 'admin-coefficients' | 'admin-partners' | 'admin-companies'
  | 'admin-reconciliation'  // NEW
  | 'admin-history';

// Inside getRouteMeta(), the tail check for '/companies/review' MUST come
// BEFORE the existing '/companies' check, or it resolves to admin-companies:
if (tail.startsWith('/companies/review')) {
  return { titleKey: 'sidebar.nav.adminReconciliation', activeNav: 'admin-reconciliation' };
}
if (tail.startsWith('/companies')) {
  return { titleKey: 'sidebar.nav.adminCompanies', activeNav: 'admin-companies' };
}
```
This is the same prefix-collision class the existing `/coefficients` vs `/partners` vs `/companies` chain already avoids by ordering — just one level deeper for `/companies` vs `/companies/review`.

---

### `src/lib/i18n/dictionaries.ts` (new `admin.reconciliation.*` namespace + `sidebar.nav.adminReconciliation`)

**Analog:** same file, `admin.companies.*` block (fr: lines 1000-1023, en: lines 1947-1968) — single source-of-truth file, `fr` object first (~line 20-1026), then `en` object (~line 1027-1974), `DictKey = keyof typeof dictionaries.fr` (line 1975), and a compile-time `_EnHasAllFrKeys` check (lines 1993-1996) that fails the build if any `en` key is missing.

**Insertion pattern** — add a new commented block mirroring the Phase 30 one, in BOTH the `fr` and `en` objects, keys in the same order in each (not required by the type check, but this file's convention throughout):
```typescript
// fr object:
// ── Phase 31 — Reconciliation review queue (IMPORT-04/05) ──────────────────
'admin.reconciliation.page.title': 'File de réconciliation',
'admin.reconciliation.page.subtitle':
  "Paires de sociétés signalées lors de l'extraction — fusionnez-les ou marquez-les définitivement séparées.",
'admin.reconciliation.reason.differing': 'SIREN différents',
// ... full key list per 31-UI-SPEC.md "i18n Key Plan" section (verbatim FR/EN copy already
// specified there — do not re-derive strings, copy the Copywriting Contract table directly) ...
'sidebar.nav.adminReconciliation': 'Réconciliation',
```
The exact ~20 key pairs and their FR/EN strings are already fully specified in `31-UI-SPEC.md`'s "Copywriting Contract" and "i18n Key Plan" sections — this is a copy task, not a drafting task. Reused (not re-declared) keys: `admin.companies.relation.type.partner`, `admin.companies.relation.type.sales`, `proposal.list.load.more`.

---

## Shared Patterns

### Admin auth (defense-in-depth)
**Source:** `src/lib/auth/require.ts` lines 86-92 (`requireAdmin`)
**Apply to:** `app/(admin)/[adminSegment]/companies/review/page.tsx`, `src/lib/reconcile/actions.ts` (both server actions)
```typescript
export async function requireAdmin(): Promise<{ session: RequireUserResult['session'] }> {
  const { session, role } = await requireUser();
  if (role !== 'admin') {
    notFound();  // 404, never 403 — D-18 URL-secrecy
  }
  return { session };
}
```
Call as the FIRST `await` in every route/action touching this surface — matches `CompaniesPage`'s explicit comment "auth before any data access (AUTH-15 defense in depth)" even though the parent `(admin)` layout already gates.

### Bounded-error toast discipline
**Source:** `src/lib/crm/actions.ts` (BOUNDED_ERROR pattern, all 4 exported functions)
**Apply to:** `src/lib/reconcile/actions.ts`
```typescript
const BOUNDED_ERROR = 'admin.reconciliation.toast.error';
// ... catch (e) { console.error('[fnName] failed:', e); throw new Error(BOUNDED_ERROR); }
```
Every failure class collapses to one generic toast key server-side; the raw error is logged via `console.error` only, never surfaced to the client. Client-side dialogs (`MergeDialog`, `KeepSeparateDialog`) catch and `toast.error(t('admin.reconciliation.toast.error', lang))`, leaving the dialog open for retry (same as `ContactFormDialog`/`DeleteContactDialog`).

### Audit logging on every write
**Source:** `src/lib/db/queries/audit-log.ts` + call sites in `src/lib/crm/actions.ts`
**Apply to:** every merge/keep-separate/extraction write
```typescript
await writeAuditLog({
  actorId: session.user.id,   // or null for the CLI script (system-initiated)
  action: 'client_relationship.create',  // extend AuditAction union, don't invent a parallel log
  targetType: 'client_relationship',
  targetId: relationshipId,
  payload: { companyId },  // ids/caller-submitted values only — never business data (ADMIN-09)
});
```

### Non-transactional multi-step writes (Neon HTTP driver constraint)
**Source:** `src/lib/crm/actions.ts` lines 19-30 (module header)
**Apply to:** the extraction engine, the merge action, the CLI script
Neon production uses `drizzle-orm/neon-http`, whose `.transaction()` throws at runtime. Every multi-statement write sequence (create-company-if-missing, bind-relationship, D-12's repoint-and-merge cascade) must be built from individually-atomic, idempotent statements (`ON CONFLICT DO NOTHING` + re-select, or `INSERT/UPDATE ... WHERE <precondition>` returning zero rows on failure) so a crash mid-sequence never leaves corrupted state and any step is safely retryable.

### TOCTOU-safe precondition checks (single-statement check+write)
**Source:** commit `1d763b9`, `src/lib/crm/actions.ts` `createContactAction`
**Apply to:** `mergeCompanyPairAction`, `keepPairSeparateAction`, and any engine write that must re-verify "still unresolved" / "still owned" / "still exists" before writing
Never SELECT-to-check then a separate write. Compile the precondition into the write statement itself (`INSERT ... SELECT ... WHERE <precondition>` or `UPDATE ... WHERE <precondition>`) so zero-rows-affected is the one and only failure signal, and a race with another admin/process is handled for free.

### Company-name normalization (D-03/D-10, do not reimplement)
**Source:** `leasetic_normalize_company_name()` SQL function, `drizzle/0007_phase30_crm_registry.sql` (top of file); driven from Drizzle via `sql\`leasetic_normalize_company_name(name)\`` (`src/db/schema.ts:371`)
**Apply to:** the engine's name-matching logic AND the pair-decision table's key (D-10: `name_normalized` STORED generated column, so the key is DB-computed)
The engine MUST query through `companies.name_normalized` (or call the SQL function directly via `sql\`leasetic_normalize_company_name(${input})\`` for pre-insert comparison) rather than porting the normalization regex to TypeScript — the function is versioned in the migration precisely so app code and stored data can never drift.

### SIREN digit-only normalization (D-03, reuse from crm/schemas.ts)
**Source:** `src/lib/crm/schemas.ts` lines 24-31 (`createClientSchema.siren` transform chain)
**Apply to:** the extraction engine's `clientSiren` handling
```typescript
.transform((v) => (v ? v.replace(/\D/g, '') : undefined))
.transform((v) => (v === undefined || v.length === 0 ? undefined : v))
.refine((v) => v === undefined || /^[0-9]{9}$/.test(v), { message: 'error.field.siren.invalid' })
```
D-03 requires exactly this behavior (malformed → absent, never stored) — factor out a shared helper if both `crm/schemas.ts` and the engine need it, rather than duplicating the regex.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/lib/reconcile/engine.ts` (dedup/matching core: name+SIREN matching, D-04 ambiguity detection, D-06 contact-merge-by-email-or-name) | service | transform/batch | First fuzzy/dedup-matching engine in the codebase — Phase 30's `createClientRelationshipAction` only does exact-SIREN lookup, never name-based matching across partners (explicitly deferred to this phase per its own comment at `crm/actions.ts:98-99`). No source-abstraction (interface/union/param) precedent exists either — Claude's Discretion per CONTEXT.md. |
| `src/lib/reconcile/report.ts` (dry-run Markdown + JSON report writer, D-14) | utility | file-I/O | No existing script in `scripts/` writes a structured report file to disk — all existing scripts only `console.log` progress. `scripts/build-seed-sql.ts` writes a single SQL file (worth a quick look for Node `fs.writeFileSync` conventions if the planner wants a filesystem-write idiom), but its purpose and shape (one SQL file, not a paired MD+JSON report with a diffable schema) don't transfer directly. |

## Metadata

**Analog search scope:** `scripts/`, `drizzle/`, `src/db/schema.ts`, `src/lib/db/queries/`, `src/lib/crm/`, `src/lib/auth/`, `src/lib/i18n/`, `src/lib/route-meta.ts`, `src/components/ui/` (AppSidebar, Shell, dialog/alert-dialog/empty/radio-group primitives), `app/(admin)/[adminSegment]/companies/`, `app/(authed)/clients/[id]/`.
**Files scanned (read in full or targeted):** `scripts/_load-env.ts`, `scripts/backfill-coefficient-history.ts`, `scripts/backfill-partner-type.ts`, `scripts/migrate.ts`, `drizzle.config.ts`, `drizzle/0007_phase30_crm_registry.sql`, `drizzle/meta/_journal.json`, `scripts/check-migration-journal-sync.sh`, `scripts/check-no-drizzle-push.sh`, `src/db/schema.ts` (lines 300-459), `src/lib/db/queries/companies.ts` (full), `src/lib/db/queries/audit-log.ts` (full), `src/lib/db/queries/index.ts` (full, barrel discipline), `src/lib/db/queries/proposals.ts` (targeted: `finalizeDraft`), `src/lib/crm/schemas.ts` (full), `src/lib/crm/actions.ts` (full, + `git show 1d763b9`), `src/lib/auth/require.ts` (full), `src/lib/route-meta.ts` (full), `src/lib/calc/schema.ts` (targeted: client fields), `src/components/ui/AppSidebar.tsx` (targeted), `src/components/ui/Shell.tsx` (targeted), `src/lib/i18n/dictionaries.ts` (targeted: admin.companies.* + type structure), `app/(admin)/[adminSegment]/companies/page.tsx` (full), `app/(admin)/[adminSegment]/companies/CompaniesList.tsx` (full), `app/(admin)/[adminSegment]/companies/[id]/CompanyRelationsTable.tsx` (full), `app/(authed)/clients/[id]/DeleteContactDialog.tsx` (full), `app/(authed)/clients/[id]/ContactFormDialog.tsx` (full).
**Pattern extraction date:** 2026-09-02
