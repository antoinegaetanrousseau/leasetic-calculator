# Phase 34: Fiche client - Pattern Map

**Mapped:** 2026-09-03
**Files analyzed:** 19 new/modified files across 9 workstreams
**Analogs found:** 18 / 19 (1 partial — no existing outbound HTTP integration module)

Every excerpt below is real code read from this repo at the cited path and line range.
Copy the shape, not the domain.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/registry/recherche-entreprises.ts` | service (outbound integration) | request-response | `src/lib/health.ts` (result discipline) + `src/lib/storage/vercel-blob.ts` (error wrapping) | **partial — no fetch analog exists** |
| `src/lib/registry/schema.ts` (zod parser for the API payload) | schema | transform | `src/lib/crm/schemas.ts` | role-match |
| `src/lib/registry/labels.ts` (headcount band + NAF section tables) | utility | transform | `src/lib/pipeline/stages.ts` / `constants.ts` | role-match |
| `src/db/schema.ts` (nullable cols on `companies`, `client_relationships`; new `relationshipEvents`) | model | — | `companies` / `clientRelationships` / `companyPairDecisions` in the same file | exact |
| `drizzle/0010_phase34_fiche_client.sql` | migration | — | `drizzle/0009_phase33_pipeline.sql` | exact |
| `src/lib/crm/actions.ts` (extend: registry hook in create, shared-tier edit) | service (server action) | CRUD | itself + `src/lib/pipeline/actions.ts` | exact |
| `src/lib/relationship/actions.ts` (private-tier edit, note, next-action, refresh) | service (server action) | CRUD | `src/lib/pipeline/actions.ts` | exact |
| `src/lib/relationship/schemas.ts` | schema | transform | `src/lib/pipeline/schemas.ts` | exact |
| `src/lib/relationship/constants.ts` (result union for refresh) | config | — | `src/lib/pipeline/constants.ts` | exact |
| `src/lib/db/queries/relationship-events.ts` (timeline, à-relancer) | model (query) | CRUD read | `src/lib/db/queries/client-relationships.ts` | exact |
| `src/lib/db/queries/index.ts` (barrel export) | config | — | itself (existing barrel blocks) | exact |
| `app/(authed)/clients/[id]/page.tsx` (rebuild as tabbed shell) | page (server component) | request-response | itself + `app/(admin)/[adminSegment]/partners/page.tsx` (searchParam tab) | exact |
| `app/(authed)/clients/[id]/ClientTabs.tsx` (tab rail) | component (server) | request-response | `app/(admin)/[adminSegment]/partners/_components/PartnersFilterPillTabs.tsx` | exact |
| `app/(authed)/clients/[id]/EditRelationDialog.tsx` | component (client) | request-response | `ContactFormDialog.tsx` (base) + `MarkWonDialog.tsx` (result branch) | exact |
| `app/(authed)/clients/[id]/EditCompanyDialog.tsx` (shared tier) | component (client) | request-response | `ContactFormDialog.tsx` | exact |
| `app/(authed)/clients/[id]/ActivityTimeline.tsx` | component (client) | event-driven read | `src/components/blocks/solution-crm-5/components/activity-timeline.tsx` | role-match (vendored, adapt by reuse) |
| `app/(authed)/page.tsx` (add "à relancer" card) | page (server component) | request-response | itself, lines 102-125 | exact |
| `src/lib/i18n/dictionaries.ts` (new keys) | config | — | itself | exact |
| `tests/*` + `*.test.ts(x)` | test | — | `src/lib/pipeline/actions.test.ts`, `app/(authed)/clients/[id]/page.test.tsx`, `tests/server-action-error-contracts.test.ts` | exact |

---

## Pattern Assignments

### 1. `src/lib/registry/recherche-entreprises.ts` (service, request-response)

**There is NO existing outbound HTTP call in server code in this repo.** Verified: every
`fetch(` in `src/` and `app/` is a *client-side* call to this app's own `/api/*` routes
(`src/components/proposal/ProposalForm.tsx:153`, `app/(authed)/proposals/_components/ExportButton.tsx`,
etc.). The only outbound traffic leaves through vendor SDKs (`@vercel/blob`, `@aws-sdk/client-s3`)
inside `src/lib/storage/`. `scripts/smoke-ovh.ts` fetches, but it is a CLI script, not app code.

So there is no timeout/abort precedent to copy — the abort timeout of D-08 is genuinely new.
Two analogs carry the disciplines that *do* exist:

**Analog A — failure classification + bounded result:** `src/lib/health.ts:1-61`

This is the closest thing in the repo to "call something that can fail, never leak why."
It is the shape D-09 needs: a failure is a *returned* value, not a thrown error, so the
caller (`createClientRelationshipAction`) can write `registry_status = 'pending'` and carry on.

```typescript
// src/lib/health.ts:18-43
export type HealthCheckResult = { ok: true } | { ok: false; message: string };

/** Map an unknown thrown value to a short bounded status string. */
function classifyError(e: unknown): string {
  if (e instanceof DbAuthError || e instanceof StorageAuthError) return 'auth failed';
  // Connection-level errors (network, DNS, refused). Match by error code/name when available
  // without ever returning the raw message.
  if (e && typeof e === 'object' && 'code' in e) {
    const code = String((e as { code?: unknown }).code ?? '');
    if (
      code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT' ||
      code === 'ENOTFOUND' ||
      code === 'EAI_AGAIN'
    ) {
      return 'connection failed';
    }
  }
  return 'unknown error';
}
```

```typescript
// src/lib/health.ts:52-61 — the try/catch + server-only log shape
export async function checkDatabaseHealth(): Promise<HealthCheckResult> {
  try {
    const d = db();
    await d.select({ id: schemaMeta.id }).from(schemaMeta).limit(0);
    return { ok: true };
  } catch (e) {
    console.error('[healthz] db check failed:', e); // server-side only
    return { ok: false, message: classifyError(e) };
  }
}
```

**What must be preserved:** the raw error never crosses the return boundary; only a bounded
classification does. Log with `console.error('[prefix] …')` server-side.

**Recommended result type for the registry lookup** (mirrors `MarkWonResult` in
`src/lib/pipeline/constants.ts`, so both discriminated unions in this codebase look alike):

```typescript
export type RegistryLookupResult =
  | { ok: true; data: RegistryIdentity }
  | { ok: false; reason: 'not_found' | 'timeout' | 'upstream_error' | 'malformed' };
```

**Analog B — driver-level error wrapping:** `src/lib/storage/vercel-blob.ts:48-59`

```typescript
  /** Map a thrown BlobError subclass (or anything else) to one of our StorageError types. */
  private wrap(e: unknown, op: string, key: string): StorageError {
    if (e instanceof StorageError) return e;
    if (e instanceof BlobNotFoundError) return new StorageNotFoundError(key);
    if (e instanceof BlobAccessError) {
      return new StorageAuthError(`Vercel Blob auth failed during ${op} for key=${key}`);
    }
    if (e instanceof BlobError) {
      return new StorageError(`Vercel Blob ${op} failed for key=${key}: ${e.message}`, e);
    }
    return new StorageError(`Vercel Blob ${op} failed for key=${key}`, e);
  }
```

Typed-error classes live in `src/lib/storage/errors.ts:1-25` (a `StorageError` base with
`cause`, plus narrow subclasses). If the registry module wants throwing internals, mirror
that file's shape — but the module's *exported* surface should return, not throw (D-09).

**The parser (D-05/D-06/D-08/D-10).** No `.passthrough()`/unknown-field precedent exists;
zod is `4.4.3`, where object schemas strip unknown keys by default — which is exactly D-08's
"ignore unknown fields." Length-cap every string the way `src/lib/pipeline/schemas.ts:44-51`
caps free text:

```typescript
// src/lib/pipeline/schemas.ts:44-51 — the .max() input-validation cap on DB-bound free text
  reason: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v === undefined || v.length === 0 ? undefined : v)),
```

**D-05's identity assertion has no analog and must be written fresh:** assert
`results[0].siren === requestedSiren` and map both a mismatch and an empty array to
`{ ok: false, reason: 'not_found' }`. Nothing in this codebase does this today; it is the
single highest-consequence line in the phase.

**D-07 (only the SIREN leaves):** build the URL from the *normalized* SIREN only. Reuse
`normalizeSiren` from `src/lib/crm/siren.ts:20-25` — do not write a second normalizer, that
file's doc comment exists precisely to forbid it.

**No ESLint restriction blocks `fetch`** — `eslint.config.mjs:57-113` restricts imports of
`@vercel/*`, `@aws-sdk/*`, `@neondatabase/serverless`, `postgres`, `@react-pdf/renderer`,
`exceljs`. Global `fetch` is unrestricted, so `src/lib/registry/` needs no config change.

---

### 2. `src/db/schema.ts` — new columns + `relationship_events` (model)

**Analog:** the Phase 33 stage column and the Phase 31 `companyPairDecisions` table, both in
this same file.

**Nullable-column-with-CHECK pattern** (`src/db/schema.ts:435-455`) — note the column is
declared in the table body with a phase-tagged comment, and its CHECK lives in the callback
array with the constraint name prefixed by the table name:

```typescript
// src/db/schema.ts:435-455
  // Phase 33 (PIPE-01/02, D-01/D-02/D-04): the pipeline stage. Fixed
  // seven-value vocabulary, TypeScript union + DB CHECK (src/lib/pipeline/stages.ts
  // is the single source of truth for the TS side). 'signe'/'debloque' are
  // system-owned — nothing in v1.6 writes them (D-04).
  stage: text('stage').notNull().default('prospect'),
}, (table) => [
  uniqueIndex('client_relationships_company_id_owner_id_uq').on(table.companyId, table.ownerId),
  ...
  // Phase 33 (D-01): the seven-value stage vocabulary, in vocabulary order.
  check(
    'client_relationships_stage_check',
    sql`${table.stage} IN ('prospect','qualifie','proposition_envoyee','negociation','perdu','signe','debloque')`,
  ),
  // Phase 33 (PIPE-04): the board query filters on owner_id and groups by stage.
  index('client_relationships_owner_id_stage_idx').on(table.ownerId, table.stage),
]);
```

**Nullable value with a "NULL is allowed" CHECK** — the exact shape for `source`,
`registry_status`, `etat_administratif` (`src/db/schema.ts:417` and `:447`):

```typescript
  check('companies_source_check', sql`${table.source} IS NULL OR ${table.source} IN ('proposal_extraction','hubspot_import')`),
```

**New-table pattern** — `companyPairDecisions` (`src/db/schema.ts:501-537`) is the template
for `relationshipEvents`: uuid PK with `defaultRandom()`, FK with an explicit `onDelete`,
nullable actor FK, jsonb payload, CHECKs and indexes in the callback array, and a block
comment above the table recording the decision the shape encodes.

```typescript
// src/db/schema.ts:501-522 (shape to copy)
export const companyPairDecisions = pgTable('company_pair_decisions', {
  id: uuid('id').defaultRandom().primaryKey(),
  ...
  // Nullable + ON DELETE SET NULL: D-12's merge deletes the loser company, and
  // the decision row must survive that deletion intact (not cascade-deleted).
  companyAId: uuid('company_a_id').references(() => companies.id, { onDelete: 'set null' }),
  decidedBy: text('decided_by').references(() => users.id, { onDelete: 'restrict' }),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  firstFlaggedAt: timestamp('first_flagged_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check('company_pair_decisions_reason_check', sql`${table.reason} IN ('differing','one_missing','both_missing')`),
  index('company_pair_decisions_pending_idx').on(table.firstFlaggedAt, table.id),
]);
```

**Nullable actor FK (D-14: "null means the system")** — the exact precedent is
`auditLog.actorId` (`src/db/schema.ts:336`) and `coefficientHistory.changedByUserId`
(`src/db/schema.ts:363`), both `text(...).references(() => users.id, { onDelete: 'set null' })`
because `users.id` is Better Auth **text**, not uuid. `relationship_events.actor_id` must be
`text`, never `uuid`.

**Composite DESC index (D-14's `(client_relationship_id, occurred_at DESC)`)** — copy
`src/db/schema.ts:480-481`, the one existing child-of-relationship DESC index:

```typescript
  index('contacts_client_relationship_id_created_at_idx')
    .on(table.clientRelationshipId, sql`${table.createdAt} DESC`),
```

**Cascade FK to the relationship** — `src/db/schema.ts:465-467`:

```typescript
  clientRelationshipId: uuid('client_relationship_id')
    .notNull()
    .references(() => clientRelationships.id, { onDelete: 'cascade' }),
```

**Type exports must be added at the bottom** — `src/db/schema.ts:539-561` keeps one
phase-labelled block per phase:

```typescript
// Type exports for Phase 31 reconciliation engine tables.
export type CompanyPairDecisionRow = typeof companyPairDecisions.$inferSelect;
export type NewCompanyPairDecisionRow = typeof companyPairDecisions.$inferInsert;
```

---

### 3. `drizzle/0010_phase34_fiche_client.sql` (migration)

**Analog:** `drizzle/0009_phase33_pipeline.sql` (the whole file, 44 lines).

**The header comment is mandatory** — it records that the file was generated then
hand-completed, and forbids later hand edits:

```sql
-- Plan 33-01 — Phase 33 Pipeline: stage column, outcome trio, and the D-07 SIREN gate.
-- Per 33-01-PLAN.md task 2. Hand-completed on top of `npm run db:generate` output:
--   1. Appends the trigger function ...
-- DO NOT EDIT BY HAND once committed — superseded by a follow-up migration if changes needed.
```

**Statement shape** — `--> statement-breakpoint` between every statement, table-name-prefixed
constraint names, CHECKs added by `ALTER TABLE … ADD CONSTRAINT`:

```sql
ALTER TABLE "client_relationships" ADD COLUMN "stage" text DEFAULT 'prospect' NOT NULL;--> statement-breakpoint
CREATE INDEX "client_relationships_owner_id_stage_idx" ON "client_relationships" USING btree ("owner_id","stage");--> statement-breakpoint
ALTER TABLE "client_relationships" ADD CONSTRAINT "client_relationships_stage_check" CHECK ("client_relationships"."stage" IN ('prospect','qualifie',...));--> statement-breakpoint
```

For the new table, `drizzle/0007_phase30_crm_registry.sql:29-36` shows the generated
`CREATE TABLE` form (tabs, quoted identifiers, `DEFAULT gen_random_uuid() NOT NULL`,
trailing inline `CONSTRAINT` lines), with FKs and indexes emitted as separate
`ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY` / `CREATE INDEX` statements afterwards.

**The journal gate — `scripts/check-migration-journal-sync.sh`.** It asserts 1:1 parity in
both directions between `drizzle/[0-9]*.sql` and `"tag"` entries in `drizzle/meta/_journal.json`.
Its own remedy text is the rule:

```
  echo "Remedy: never hand-author a migration file or journal entry. Regenerate with"
  echo "  npm run db:generate"
  echo "so the .sql file and its journal entry are always written together."
```

The journal's last entry is `{"idx": 9, "version": "7", "tag": "0009_phase33_pipeline"}` —
0010 must be produced by `npm run db:generate` (which writes both files), then hand-completed.
Run `npm run check:migration-journal-sync` before pushing.

**D-15 (no trigger for events).** If a trigger ever is proposed, the only precedents are
`proposals_won_requires_siren` (`drizzle/0009…:24-44`) and `coefficient_history_no_modify`
(`drizzle/0004…`) — both *validators*, neither writes rows. D-15 forbids a writing trigger
because it cannot see the session; keep that reasoning in the migration header.

---

### 4. Server actions (service, CRUD)

**Analogs:** `src/lib/crm/actions.ts` (321 lines) and `src/lib/pipeline/actions.ts` (314 lines).
Read both module headers verbatim — they are the security contract, not decoration.

**Module header shape** (`src/lib/pipeline/actions.ts:3-39`) records: PITFALLS §7.3 ordering,
bounded-error discipline plus any documented exception, the neon-http no-transaction note, and
the decoupling contract. A new actions module must carry the equivalent four paragraphs.

**Bounded error key** (`src/lib/crm/actions.ts:39-40`, `src/lib/pipeline/actions.ts:49-50`):

```typescript
/** Single bounded error key for every failure class in this module (T-30-05-03). */
const BOUNDED_ERROR = 'pipeline.toast.error';
```

**The canonical action body** — `advanceRelationshipStageAction`
(`src/lib/pipeline/actions.ts:69-108`). This is the exact template for
"edit private relationship fields" and "set a next-action date":

```typescript
export async function advanceRelationshipStageAction(raw: unknown): Promise<void> {
  const { session } = await requireRelationshipHolder(); // FIRST — PITFALLS §7.3
  try {
    const input = advanceStageSchema.parse(raw);
    const dbi = db();

    // Ownership re-proved inside the UPDATE's own WHERE — never a separate
    // SELECT (T-30-05-05). Zero rows returned is the only failure signal,
    // covering not-found and not-owned identically (T-30-05-04).
    const updated = await dbi
      .update(schema.clientRelationships)
      .set({ stage: input.toStage, updatedAt: new Date() })
      .where(and(
        eq(schema.clientRelationships.id, input.relationshipId),
        eq(schema.clientRelationships.ownerId, session.user.id),
      ))
      .returning();

    if (updated.length === 0) {
      throw new Error(BOUNDED_ERROR);
    }

    await writeAuditLog({ ... });

    revalidatePath('/pipeline');
  } catch (e) {
    if (e instanceof Error && e.message === BOUNDED_ERROR) {
      throw e; // already the bounded key — don't double-log or re-wrap
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[advanceRelationshipStageAction] failed:', msg);
    throw new Error(BOUNDED_ERROR);
  }
}
```

**Shared-tier edit on `companies` (D-01/D-02)** — `companies` has no `owner_id`, so ownership
is re-proved *through the join*, as a subquery inside the UPDATE's own WHERE. Copy
`markProposalWonAction`'s step 1 (`src/lib/pipeline/actions.ts:192-219`) exactly:

```typescript
      // Owner-scoped subquery: the company reachable through the caller's
      // OWN relationship for THIS proposal. `companies` is not owned by FK
      // the way `client_relationships` is, so the re-proof goes through the
      // join, not a direct column match.
      const reachableCompanyIds = dbi
        .select({ id: schema.clientRelationships.companyId })
        .from(schema.clientRelationships)
        .innerJoin(schema.proposals, eq(schema.proposals.clientRelationshipId, schema.clientRelationships.id))
        .where(and(
          eq(schema.proposals.id, input.proposalId),
          eq(schema.proposals.userId, session.user.id),
          eq(schema.clientRelationships.ownerId, session.user.id),
        ));

      const sirenSaved = await dbi
        .update(schema.companies)
        .set({ siren: input.siren })
        .where(and(
          isNull(schema.companies.siren),
          inArray(schema.companies.id, reachableCompanyIds),
        ))
        .returning();
```

For Phase 34 the subquery joins `clientRelationships` by `relationshipId` +
`ownerId = session.user.id` instead of via `proposals`. **D-02 structural rule:** the `.set({...})`
object must enumerate the shared-tier columns as literals (`name`, `website`, `phone`, `siren`).
No column name may come from the caller. That is why `.set()` is written inline, never spread
from parsed input.

**INSERT with ownership proved inside the statement** (for the note / event writes) —
`createContactAction` (`src/lib/crm/actions.ts:182-216`) uses `INSERT … SELECT` so there is no
TOCTOU window. Its warning comment must survive into any copy:

```typescript
    // Ownership is proved INSIDE the INSERT via `INSERT ... SELECT`: the source
    // row is the caller's own relationship, so a relationship the caller does not
    // own selects zero rows and inserts nothing. Zero rows returned is the only
    // failure signal (T-30-05-04 / T-30-05-05, ...).
    //
    // Do NOT reintroduce a standalone ownership SELECT followed by a separate
    // INSERT. That is what this code used to do, and it left a real TOCTOU window
    // between the two statements ...
    const inserted = await dbi
      .insert(schema.contacts)
      .select(
        dbi
          .select({
            clientRelationshipId: schema.clientRelationships.id,
            name: sql<string>`${input.name}`.as('name'),
            ...
          })
          .from(schema.clientRelationships)
          .where(and(
            eq(schema.clientRelationships.id, relationshipId),
            eq(schema.clientRelationships.ownerId, session.user.id),
          )),
      )
      .returning();
```

**This is the pattern for writing a `relationship_events` row** (note, `next_action_set`,
`registry_synced`, `stage_changed`): `INSERT … SELECT` from the caller's own relationship, so
an event can never be attached to a relationship the caller does not own.

**Returned discriminated result for a recoverable outcome (D-24)** — the refresh-registry
action's `not_found` / `upstream_error` outcomes are recoverable and must be RETURNED, per
`src/lib/pipeline/actions.ts:250-259`:

```typescript
    if (gateRow[0].siren === null) {
      // RETURNED, never thrown (33-REVIEW CR-01). Next.js replaces a Server
      // Function's thrown error message with a generic string plus a digest in
      // production builds, so the old `throw new Error(SIREN_REQUIRED)` +
      // `e.message === SIREN_REQUIRED` handshake worked in dev and silently
      // degraded to a generic toast in production ...
      return { ok: false, reason: 'siren_required' };
    }
```

The result *type* must live in a plain non-`'use server'` module. `src/lib/pipeline/constants.ts:1-16`
explains why and is the file to copy:

```
 * WHY IT EXISTS AT ALL: a `'use server'` file may export ONLY async
 * functions — Next.js fails the production build with "Only async functions
 * are allowed to be exported in a 'use server' file." the moment any module
 * imports a non-function export from one.
```

**D-09 (registry never blocks creation)** — hook the lookup into
`createClientRelationshipAction` *after* `companyId` is resolved
(`src/lib/crm/actions.ts:105`) and *outside* the path that reaches the outer
`catch → throw BOUNDED_ERROR` at `:150-154`. Practically: wrap the lookup in its own
`try`/`catch` (or rely on it returning, never throwing) and write `registry_status='pending'`
on any non-ok result.

**Audit rows (D-03/D-26)** — `writeAuditLog` is at `src/lib/db/queries/audit-log.ts:87-97`.
New action strings must be added to the `AuditAction` union at `audit-log.ts:7-52`, in a
phase-labelled block with the same "payload carries only ids and caller-submitted values,
never commission data" comment. Note the existing Phase 33 block already anticipates this
phase:

```typescript
  // ── Phase 33 — Pipeline (PIPE-01..05) ───────────────────────────────────
  // Payloads carry ids, the from/to stage strings and the caller-submitted
  // date/SIREN only — never commission or rate data (ADMIN-09). Phase 34's
  // ACTV-02 reads the stage-change action below for the activity timeline.
  | 'relationship.stage_change'
```

**D-21 (WR-16) is exactly here:** `src/lib/pipeline/actions.ts:96` writes
`payload: { toStage: input.toStage }` while the comment above claims from/to. The doc comment
at `:62-67` explains the omission was deliberate ("the origin value is recoverable from the
previous audit row, which is what Phase 34's timeline will read"). Phase 34 must either write
`fromStage` too — which needs the value the UPDATE replaced, obtainable via
`.returning()` on a second statement or by reading it in the same owner-scoped UPDATE — or
amend the `audit-log.ts` comment. Do not leave both claims standing.

---

### 5. Owner-scoped read queries (model, CRUD read)

**Analog:** `src/lib/db/queries/client-relationships.ts` — module header at `:1-35`, which is
the CRM-02 contract every new query in this phase inherits verbatim:

```typescript
import 'server-only';
import { and, asc, desc, eq, ilike, ne, or, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

/**
 * CRM-02 CONTRACT: every exported function in this module takes an `ownerId`
 * that is a REQUIRED, non-optional, non-defaulted parameter, and that value
 * is compiled directly into the WHERE (or HAVING) clause of the SQL statement
 * the function issues. No function here accepts an "include every owner"
 * flag, a pre-checked boolean, or any other bypass. There is NO admin path in
 * this module ...
 */
```

**Timeline read — copy `listContactsForRelationship`** (`client-relationships.ts:300-323`).
It is a child table joined back to `client_relationships` purely to carry the owner predicate:

```typescript
export async function listContactsForRelationship(
  relationshipId: string,
  ownerId: string,
): Promise<ContactListRow[]> {
  const dbi = db();
  return dbi
    .select({ id: schema.contacts.id, name: schema.contacts.name, ... })
    .from(schema.contacts)
    .innerJoin(
      schema.clientRelationships,
      eq(schema.clientRelationships.id, schema.contacts.clientRelationshipId),
    )
    .where(and(
      eq(schema.contacts.clientRelationshipId, relationshipId),
      eq(schema.clientRelationships.ownerId, ownerId),
    ))
    .orderBy(desc(schema.contacts.createdAt));
}
```

For events, swap `contacts` → `relationshipEvents` and order by
`desc(schema.relationshipEvents.occurredAt)` so the composite index is used.

**"À relancer" list — copy `listClientBook`'s owner-first predicate**
(`client-relationships.ts:158-162`) and, if it needs a proposals/contacts join for counts, the
`countDistinct` trap note in `src/lib/db/queries/pipeline.ts:48-53`:

```typescript
 * Correctness trap: joining BOTH `contacts` and `proposals` to the same
 * relationship produces a cartesian product of the two child sets, so a
 * plain `COUNT(contacts.id)` would report `contacts × proposals`. Both
 * counts use `countDistinct` to avoid this.
```

**D-22 (WR-06) is exactly here:** `listPipelineBoard`'s proposals join
(`src/lib/db/queries/pipeline.ts:80-86`) carries only
`eq(clientRelationshipId, …)` + `ne(status,'deleted')`, while
`listProposalsForRelationship` (`client-relationships.ts:412-416`) also carries
`eq(schema.proposals.userId, ownerId)` as defence in depth, documented at `:380-385`:

```typescript
/**
 * CRM-06 — every proposal made for this client, on one page. Filters on BOTH
 * `client_relationship_id` AND `proposals.user_id = ownerId` in the same
 * statement (defense in depth: even if a relationship id were somehow
 * cross-linked, the proposal's own owner must still match), and excludes
 * soft-deleted rows.
 */
```

The fix is to add `eq(schema.proposals.userId, args.ownerId)` inside `pipeline.ts`'s
`leftJoin` `and(...)` — inside the join condition, not the WHERE, or the LEFT JOIN degrades
to an INNER JOIN and relationships with zero owned proposals vanish from the board.

**ADMIN-09 projection discipline** — if any new row shape touches
`proposals.params_snapshot` or `computed`, narrow it with a `project*` helper as at
`client-relationships.ts:351-378`; never return the raw jsonb.

**Barrel export.** Pages import from `'@/lib/db/queries'`, never from a sibling file
(`src/lib/db/queries/index.ts:1-7`). Add a phase-labelled export block matching the existing
Phase 33 one at the file's tail:

```typescript
// Phase 33 Plan 03 — owner-scoped pipeline board + conversion rate (PIPE-03/04, CRM-02, D-12).
export { listPipelineBoard, getConversionRateForOwner } from './pipeline';
export type { PipelineCardRow, ConversionRate } from './pipeline';
```

---

### 6. Tabbed page shell + per-section dialogs (page / component)

**Tab rail analog:** `app/(admin)/[adminSegment]/partners/_components/PartnersFilterPillTabs.tsx`.
It is the repo's only search-param-driven tab surface. It is a **server component** — pills are
`<Link>` navigations, no client state — and the active tab is derived from a prop the page read
out of `searchParams`:

```typescript
/**
 * 4-tab variant (user-confirmed deviation from the Figma 3-tab default).
 * Server component — pills are <Link> navigations; no client state. Active
 * pill is derived from the `currentStatus` prop passed in from page.tsx
 * (which read it from `searchParams.status`).
 * ...
 *   - q is preserved across tab navigations when present.
 *   - data-testid="partner-filter-pill-{key}" on each pill.
 */
```

```typescript
// PartnersFilterPillTabs.tsx:71-79 — href builder; the default tab DROPS the param
function buildHref(key: TabKey, adminSegment: string, currentQ?: string): string {
  const base = `/${adminSegment}/partners`;
  const params = new URLSearchParams();
  if (key !== 'all') params.set('status', key);
  if (currentQ && currentQ.length > 0) params.set('q', currentQ);
  const qs = params.toString();
  return qs.length > 0 ? `${base}?${qs}` : base;
}
```

Note this component uses inline `style` objects and raw `rgba(18,150,87,0.10)`; that is Phase 18
legacy. **Do not copy the styling** — follow `.planning/codebase/UI-CONVENTIONS.md` (UIC-03
accent reserve, UIC-04 `rounded-container`, UIC-09 page width) and Tailwind classes as used in
`app/(authed)/clients/[id]/page.tsx`. Copy the *navigation architecture* only.

**Search-param validation on the page** — `app/(admin)/[adminSegment]/partners/page.tsx:47-60`
is the enum allowlist to copy for `?tab=`:

```typescript
const VALID_STATUSES: ReadonlySet<PartnerStatus> = new Set(['active','invited','inactive']);

/** Enum-validate `status` searchParam (T-18-03-01) — invalid values drop to undefined. */
function validateStatus(raw: string | undefined): PartnerStatus | undefined {
  if (raw && (VALID_STATUSES as Set<string>).has(raw)) {
    return raw as PartnerStatus;
  }
  return undefined;
}
```

An unrecognised `?tab=` must fall back to the default tab, never throw and never `notFound()`.

**Page shell analog:** `app/(authed)/clients/[id]/page.tsx` — its numbered order-of-operations
doc comment (`:32-53`) is the security contract to preserve *verbatim* through the rebuild:

```typescript
/**
 * `/clients/[id]` — Phase 30 Plan 07 (CRM-06, CRM-04). `[id]` is a
 * RELATIONSHIP id, never a company id — this is the phase's sharpest IDOR
 * surface (T-30-07-01).
 *
 * Order of operations is the security boundary, not a style preference:
 *   1. requireRelationshipHolder() — FIRST, before any data access (PITFALLS §7.3) ...
 *   2. getClientRelationshipForOwner(id, session.user.id) — returns null for BOTH ...
 *   3. `if (!relationship) notFound();` — not-found and not-owned render byte-identically ...
 *   4. ONLY THEN are contacts and proposals fetched, each re-scoped to session.user.id ...
 */
export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { session } = await requireRelationshipHolder(); // FIRST — auth before any data access
  const lang = await getCurrentLang();

  const relationship = await getClientRelationshipForOwner(id, session.user.id);

  if (!relationship) {
    notFound();
  }

  const [contacts, proposals] = await Promise.all([...]);
```

D-17 ("each tab fetches server-side") means the per-tab fetch goes *after* the `notFound()`
branch, inside the same `Promise.all` shape, selected on the validated tab.

`export const dynamic = 'force-dynamic'` (`page.tsx:22`) and the `Metadata` export must survive.

**Dialog analog:** `app/(authed)/clients/[id]/ContactFormDialog.tsx` — the base shape for every
section-edit dialog (D-18):

```typescript
'use client';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { z } from 'zod';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { t, type DictKey, type Lang } from '@/lib/i18n/dictionaries';
```

Load-bearing details, all from `ContactFormDialog.tsx`:

- Controlled by the parent — `open`/`onOpenChange` props, **no `DialogTrigger` inside** (`:12-16`).
- `type ContactFormValues = z.input<typeof contactSchema>;` — the **pre-transform** input type (`:57-59`).
- Required-field asterisk is `<span className="ml-0.5 text-destructive" aria-hidden="true">*</span>`;
  the doc comment at `:17-24` records that a narrower markup was a regression and must not return.
- Submit handler (`:85-100`):

```typescript
  const onSubmit = async (data: ContactFormValues) => {
    try {
      ...
      toast.success(t('clients.contact.toast.updated', lang));
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error(t('clients.toast.error', lang));
      // Dialog stays open so the caller can retry without re-entering data.
    }
  };
```

- Field errors render `t(errors.name.message as DictKey, lang)` in a `<FieldError role="alert">`
  with `aria-invalid` / `aria-describedby` wired (`:121-135`).
- `<form … noValidate aria-busy={isSubmitting || undefined}>`; every input `disabled={isSubmitting}`.

**Dialog that consumes a returned discriminated result** (registry refresh, or any recoverable
outcome) — `app/(authed)/clients/[id]/MarkWonDialog.tsx:95-122`:

```typescript
      if (!result.ok) {
        // D-08's gate arrives as a RETURNED value, not a thrown sentinel
        // (33-REVIEW CR-01) ... The in-dialog banner IS the
        // message — no toast on top of it, and the dialog stays open with
        // every field intact.
        setSirenRequired(true);
        return;
      }

      toast.success(t('pipeline.outcome.won.toast.success', lang));
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error(t('pipeline.toast.error', lang));
    }
```

Also copy its `onOpenChange` reset (`:126-136`): closing resets the recoverable-state flag and
calls `reset()`.

A date field is a plain `<Input type="date" {...register('date')} />` with
`z.coerce.date()` on the schema side (`MarkWonDialog.tsx:145-153`,
`src/lib/pipeline/schemas.ts:43`) — that is the analog for "set a next-action date".
A free-text note should use `@/components/ui/textarea`; `source` (a 5-value enum) should use
`@/components/ui/select`. Neither has a partner-facing precedent yet — the closest is
`ProposalOutcomeControl.tsx` for a select-like inline control.

**Timeline:** `src/components/blocks/solution-crm-5/components/activity-timeline.tsx` (380 lines)
+ `./data.tsx` (356 lines). It is already vendored. It composes `@/components/reui/timeline`
(`Timeline`, `TimelineItem`, `TimelineHeader`, `TimelineIndicator`, `TimelineSeparator`,
`TimelineContent`, `TimelineTitle`), `@/components/reui/frame`, `ToggleGroup` type filters, and
a `BUCKET_ORDER`/`bucketLabel` day-bucketing helper in `data.tsx`. D-19 says adapt by reuse:
the new `ActivityTimeline.tsx` lives under `app/(authed)/clients/[id]/`, imports the ReUI
primitives directly, and supplies real event data + `t()` labels — the block's `data.tsx`
demo fixtures are not shipped. **`solution-users-2` is NOT vendored** (`src/components/blocks/`
holds 24 blocks; that is not one of them) — importing it is a new ReUI registry install, and
the shadcn-init trap below applies.

---

### 7. Home-page "à relancer" card (page)

**Analog:** `app/(authed)/page.tsx:81-125` — the recent-proposals card, including its
empty-state twin.

Empty branch (`:82-101`) uses `Card`/`CardHeader`/`CardTitle`/`CardContent` with the exact
title class, plus a right-aligned "view all" link:

```tsx
        <Card className="mt-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              {t('dashboard.recent.title', lang)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-[14.5px] m-0">
              {t('dashboard.recent.empty', lang)}
            </p>
```

Populated branch (`:102-125`) uses a `*ListFrame` wrapper with a `title` + `action` link and maps
rows into full-row `<Link>`s carrying the shared row chrome:

```tsx
        <ProposalListFrame
          className="mt-0"
          title={t('dashboard.recent.title', lang)}
          action={<Link href="/proposals" className="text-sm font-medium text-primary no-underline hover:underline">…</Link>}
        >
          {recentRows.map((row) => (
            <Link
              key={row.id}
              href={`/proposals/${row.id}`}
              className="flex min-w-0 items-center gap-3 rounded-lg border-b border-border px-2.5 py-2.5 text-inherit no-underline transition-colors last:border-b-0 hover:bg-[var(--hover-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
```

The data fetch joins the existing `Promise.all` at `:36-41` — one more entry, owner-scoped,
using `userId` from `requireUser()`. Note this page uses `requireUser()`, not
`requireRelationshipHolder()`; the à-relancer query must therefore still take `ownerId`
explicitly and be safe for any role (return an empty list for an admin rather than throwing).

Row limit convention: `const recentRows = recentList.rows.slice(0, 5);` (`:43`).

---

### 8. i18n keys

**Analog:** `src/lib/i18n/dictionaries.ts` (2203 lines). Structure: `dictionaries.fr` then
`dictionaries.en`, flat dot-notation string keys grouped by `// ── namespace ──` comment
banners. Header rule at `:14-18`:

```
 * Discipline:
 *  - EN must have every key FR has (compile-time check via _EnHasAllFrKeys type below).
 *  - All values are string literals — no template literals at runtime, no interpolation.
 *  - Translatable JSX strings must use t() per D-26 / SHELL-06; the ESLint
 *    no-restricted-syntax rule (eslint.config.mjs) flags hardcoded JSXText.
```

**Parity is enforced three ways** and all three must pass:
1. The `_EnHasAllFrKeys` compile-time type in the same file (caught by `npm run typecheck`).
2. `src/lib/i18n/dictionaries.test.ts:13-25` — "every FR key exists in EN" **and** "every EN key
   exists in FR" (both directions).
3. `dictionaries.test.ts:8-11` — a floor assertion on key count
   (`expect(frKeys.length).toBeGreaterThanOrEqual(790)`), raised each phase that adds a namespace.
   Phase 34 should raise it again.

**Reuse before minting.** `src/lib/crm/schemas.ts:4-11` records the rule: `error.field.required`,
`error.field.siren.invalid` and `error.field.email.invalid` already exist and must be emitted by
name rather than duplicated. Zod messages ARE dictionary keys — `t(errors.x.message as DictKey, lang)`.

**Interpolation** is positional `{0}` replaced by `.replace('{0}', value)` at the call site
(`app/(authed)/page.tsx:50`), never a template literal in the dictionary.

Existing namespaces this phase extends: `clients.*` (detail sections, contact dialog, toasts) and
`pipeline.*`. New ones will be needed for the registry panel, timeline, and the à-relancer card.

---

### 9. Tests

**Action tests — `src/lib/pipeline/actions.test.ts:1-130`.** Its header states the harness is
"reused verbatim from `src/lib/crm/actions.test.ts`". Copy it again rather than inventing one:

```typescript
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { mockState } = vi.hoisted(() => ({
  mockState: { resultQueue: [] as unknown[], calls: [] as MockCall[] },
}));

function nextResult(): unknown {
  if (mockState.resultQueue.length === 0) {
    throw new Error('mock db: resultQueue exhausted — test queued too few results');
  }
  return mockState.resultQueue.shift();
}

vi.mock('@/lib/db', async () => {
  const real = await vi.importActual<typeof import('@/db/schema')>('@/db/schema');
  ...
  return { db: () => dbInstance, schema: real, DbError: class extends Error {}, ... };
});
```

Three properties make it work and must be preserved:
- The schema is the **real** module via `vi.importActual`, so `and`/`eq`/`inArray` build real
  Column trees the test can walk to assert `owner_id` is present in a WHERE.
- Builders record `{kind, payload}` calls in order, and terminal methods (`.limit()`,
  `.returning()`) shift from the queue.
- The select builder duck-types `getSQL()` so it can be embedded as a genuine subquery by the
  real `inArray()` (`:64-67`) — needed for every owner-scoped subquery in this phase.

Auth/audit are hoisted mocks (`:106-116`); the test then asserts
`requireRelationshipHolderMock` was the first call. A new actions module needs an
`INSERT` builder added to the harness (`makeInsertBuilder`) — `crm/actions.test.ts` already
has one for `createContactAction`.

**Page tests — `app/(authed)/clients/[id]/page.test.tsx:1-110`.** `renderToString` from
`react-dom/server` on the awaited server component. Its coverage list (`:12-33`) is the
checklist to extend, not replace — notably items 1-3 (notFound on null; non-owned and
nonexistent byte-identical; `session.user.id` passed as arg 2) are the IDOR gates and must
still pass after the rebuild. Mocks needed:

```typescript
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/i18n', async (importOriginal) => { const actual = await importOriginal…; return { ...actual, getCurrentLang: vi.fn(async () => 'fr') }; });
vi.mock('@/lib/db/queries', async (importOriginal) => { … partial mock, pure helpers left real … });
```

Note `:83-86`: pure derivation helpers are deliberately left **unmocked** so the real rule is
exercised. Child components are stubbed (`:99-110`) because they have their own test files.
`useSearchParams: () => new URLSearchParams()` is also needed once tabs land — see
`tests/admin-09-grep-contracts.test.ts:41-46`.

**Structural grep-contract suites in `tests/`.** Six exist. Two bind this phase directly:

- `tests/server-action-error-contracts.test.ts` (98 lines) — fails the build if any client
  component compares a caught error's `.message`. Its third case hard-codes
  `app/(authed)/clients/[id]/MarkWonDialog.tsx` and `src/lib/pipeline/actions.ts` paths
  (`:88-97`), so **moving or renaming either file breaks this suite** — update it in the same
  commit. New recoverable-result dialogs in Phase 34 are automatically covered by case 2.
- `tests/container-radius.test.ts`, `tests/radius-scale.test.ts`, `tests/dark-palette.test.ts` —
  UIC-04 / palette gates the new panels and dialogs must satisfy.

The suite template (file-walk + regex + `expect(offenders).toEqual([])`) is at
`server-action-error-contracts.test.ts:38-56`, and it skips vendored paths exactly as ESLint does:

```typescript
    if (full.includes('components/reui') || full.includes('components/blocks')) continue;
    if (full.includes('components/ui/')) continue;
```

Note the guard at `:76-78` — "the glob itself must not silently go empty" — copy it into any
new structural suite.

---

## Shared Patterns

### Auth gate — apply to every action and every page in this phase

**Source:** `src/lib/auth/require.ts` → `requireRelationshipHolder()`
**Called at:** `src/lib/crm/actions.ts:60,177,241,288`; `src/lib/pipeline/actions.ts:70,122,187`;
`app/(authed)/clients/[id]/page.tsx:56`

```typescript
  const { session } = await requireRelationshipHolder(); // FIRST — PITFALLS §7.3
```

It is the FIRST `await` in the function body, before any `db()` call, before `getCurrentLang()`
in actions. It refuses admins via `notFound()`; admins reach relationship data only through
`/[adminSegment]/companies`. The home page uses `requireUser()` instead
(`app/(authed)/page.tsx:24`) because it serves every role.

### Owner scoping — apply to every statement, never as a separate check

**Source:** `src/lib/pipeline/actions.ts:75-85` (UPDATE), `src/lib/crm/actions.ts:246-263`
(subquery + `inArray`), `src/lib/crm/actions.ts:193-210` (INSERT … SELECT)

```typescript
    const ownedRelationships = dbi
      .select({ id: schema.clientRelationships.id })
      .from(schema.clientRelationships)
      .where(eq(schema.clientRelationships.ownerId, session.user.id));

    const updated = await dbi
      .update(schema.contacts)
      .set({ ... })
      .where(and(
        eq(schema.contacts.id, contactId),
        inArray(schema.contacts.clientRelationshipId, ownedRelationships),
      ))
      .returning();

    if (updated.length === 0) {
      throw new Error('contact not owned by caller');
    }
```

Zero rows affected is the only failure signal, and not-found / not-owned collapse identically.

### Error handling — one bounded key per module

**Source:** `src/lib/crm/actions.ts:39-40,150-154`; `src/lib/pipeline/actions.ts:49-50,100-107`
**Apply to:** every server action added in this phase

```typescript
  } catch (e) {
    if (e instanceof Error && e.message === BOUNDED_ERROR) {
      throw e; // already the bounded key — don't double-log or re-wrap
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[actionName] failed:', msg);
    throw new Error(BOUNDED_ERROR);
  }
```

The bounded key is a dictionary key the client toasts directly. Recoverable outcomes are
RETURNED (D-24), never thrown.

### Cache revalidation after a write

**Source:** `src/lib/pipeline/actions.ts:156-157`

```typescript
    // No single client-detail path is derivable without a read — revalidate
    // the whole /clients subtree (list + every detail page) plus the board.
    revalidatePath('/clients', 'layout');
    revalidatePath('/pipeline');
```

Phase 34 writes also affect the home page's à-relancer card — add `revalidatePath('/')`.
Client dialogs additionally call `router.refresh()` after a success
(`ContactFormDialog.tsx:95`).

### SIREN normalisation — one rule, one function

**Source:** `src/lib/crm/siren.ts:20-25`, consumed by `src/lib/crm/schemas.ts:33-42` and
`src/lib/pipeline/schemas.ts:73-85` (which copies the transform+refine pair verbatim)

```typescript
export function normalizeSiren(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const digitsOnly = value.replace(/\D/g, '');
  if (digitsOnly.length === 0) return undefined;
  return /^[0-9]{9}$/.test(digitsOnly) ? digitsOnly : undefined;
}
```

**D-23 (WR-15) is exactly here:** `src/lib/calc/schema.ts:68-73` has a rival implementation
that neither normalises nor rejects interleaved non-digits:

```typescript
const requiredSirenSchema = z
  .string({ message: 'error.field.required' })
  .refine((s) => s.trim().length > 0, { message: 'error.field.required' })
  .refine((s) => s.trim().length === 0 || s.replace(/\D/g, '').length === 9, {
    message: 'error.field.siren.invalid',
  });
```

`"1a2b3c4d5e6f7g8h9"` passes this and reaches the wizard un-normalised. It is used at
`src/lib/calc/schema.ts:110` (`clientSiren`). Converge it onto the
`.transform((v) => normalizeSiren(v) ?? v).refine(/^[0-9]{9}$/…)` pair from
`crm/schemas.ts:36-42`. **Check the calc schema's snapshot implications first** — `clientSiren`
flows into `proposals.inputs`, which is immutable per DATA-01..04; normalising changes what
future rows store, not existing ones.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/lib/registry/recherche-entreprises.ts` (the fetch call itself) | service | request-response | **No server-side outbound `fetch` exists anywhere in `src/` or `app/`.** Every in-repo `fetch` is a client call to this app's own `/api/*` routes; all external traffic goes through vendor SDKs in `src/lib/storage/`. There is no `AbortController`/`AbortSignal.timeout` precedent in application code (the only occurrences are inside vendored ReUI async components). D-08's abort timeout, the `Accept`/User-Agent header choice, and the response-status branching must be written from RESEARCH.md, not copied. The **failure discipline** around it does have an analog — `src/lib/health.ts` — cited above. |

Partial gaps worth flagging to the planner (analog exists but is thin):

- **Tab rail** — only one search-param tab surface exists (`PartnersFilterPillTabs`), it is
  admin-only and uses Phase 18 inline styles. Architecture is copyable; styling is not.
- **`solution-users-2`** — referenced by D-19 but **not present** in `src/components/blocks/`.
  Treat as a new ReUI install, with the shadcn-init trap below.
- **Textarea / Select in a partner-facing dialog** — `@/components/ui/textarea` and
  `@/components/ui/select` exist and are used inside vendored blocks, but no hand-written
  partner-facing dialog uses either yet. `ContactFormDialog`'s `Field`/`FieldLabel`/`FieldError`
  wrapper applies unchanged.

---

## Traps a Planner Must Know

1. **No transactions.** The production driver is `drizzle-orm/neon-http`, whose `.transaction()`
   throws `"No transactions support in neon-http driver"` at runtime. Documented at
   `src/lib/crm/actions.ts:19-30` and `src/lib/pipeline/actions.ts:29-33`. Every multi-step
   sequence must be built from individually atomic, idempotent statements
   (`ON CONFLICT DO NOTHING` + re-select on the same unique index). **Direct consequence for
   Phase 34:** the "write the row, then append the event" pairs (note, next-action, registry
   sync, stage change) are two separate statements. Decide and record what a crash between
   them leaves behind — the acceptable answer, following `crm/actions.ts:28-30`, is a harmless
   orphan or a missing event, never a corrupted relationship.

2. **Never run `npm run db:migrate` locally.** `.env.local` points at a live Neon branch (D-12).
   Migrations are generated and committed locally (`npm run db:generate`) and applied through
   the `DB Migrate (Branch-Scoped)` GitHub workflow (`.github/workflows/db-migrate.yml`, which
   requires a typed confirmation phrase for `main`). Related guards already in the repo:
   `npm run check:no-drizzle-push`, `npm run check:local-db-branch`,
   `npm run check:migration-journal-sync`.

3. **Never hand-author a migration or a journal entry.** `scripts/check-migration-journal-sync.sh`
   fails the build on either an orphan `.sql` or a dangling journal tag. The Phase 12 incident it
   guards against ran production un-migrated for ~24h. Generate, then hand-complete the generated
   file, then re-run the check.

4. **Vendored ReUI is ESLint-excluded and re-imported wholesale.**
   `eslint.config.mjs:32-37` and `:122-125` ignore `src/components/ui/**`,
   `src/components/reui/**`, `src/components/blocks/**`, `src/hooks/use-mobile.ts`,
   `use-file-upload.ts`, `use-copy-to-clipboard.ts` — for both the no-restricted-imports layer
   and the SHELL-06 hardcoded-JSX-text layer. Consequences:
   - i18n and house rules bind at the **call sites**, not inside the vendored source. An
     adapted timeline living under `app/(authed)/clients/[id]/` IS linted, so every string in it
     must go through `t()`.
   - Any edit made inside vendored code must be recorded in the
     **"Vendored ReUI modifications to re-apply after any re-import"** table at
     `.planning/codebase/UI-CONVENTIONS.md:407-416`, or it is silently lost on the next import.
     That table currently holds exactly one row (`src/components/reui/kanban.tsx`, added
     2026-09-03 for 33-REVIEW WR-01). If Phase 34 touches `src/components/reui/timeline.tsx`,
     add a row in the same commit.
   - `tests/server-action-error-contracts.test.ts:47-49` mirrors the same skip list — a new
     vendored directory must be added there too.

5. **CI runs `eslint . --max-warnings=0`** (`package.json` `lint:check`). Unused vars are a
   *warning* rule (`eslint.config.mjs:167-178`) and therefore fail CI while passing `tsc` and
   `vitest`. Run `npm run lint:check` and `npm run build` before pushing, not just typecheck
   and test. The `^_` prefix is the sanctioned escape for intentionally-unused identifiers.

6. **A `'use server'` file may export only async functions.** Any shared type, constant or
   result union goes in a plain sibling module — `src/lib/pipeline/constants.ts:1-16` documents
   the exact build error. Phase 34's registry-refresh result type belongs there, not in the
   actions file.

7. **Server action thrown messages are redacted in production.** Recoverable outcomes must be
   RETURNED discriminated results (D-24). `tests/server-action-error-contracts.test.ts` fails
   the build if a client component branches on `error.message` again.

8. **`users.id` is Better Auth `text`, not `uuid`** (`src/db/schema.ts:39-44`). Any new actor FK
   must be `text('actor_id').references(() => users.id, …)`.

9. **Barrel-only imports for queries.** Pages and actions import from `'@/lib/db/queries'`
   (`src/lib/db/queries/index.ts:1-7`). A new query file that is not re-exported there will work
   in tests and fail review.

10. **`companies` is shared across partners.** A UNIQUE index sits on `companies.siren`
    (`src/db/schema.ts:396`). Any shared-tier write that touches `siren` can raise a
    unique-violation caused by *another partner's* data — it must collapse into `BOUNDED_ERROR`,
    never surface, per `src/lib/pipeline/actions.ts:208-211`. The same holds for registry writes.

---

## Metadata

**Analog search scope:** `src/lib/` (crm, pipeline, db/queries, storage, i18n, calc, auth),
`src/db/`, `drizzle/`, `app/(authed)/`, `app/(admin)/`, `app/api/`, `app/healthz/`,
`src/components/blocks/`, `tests/`, `scripts/`, `eslint.config.mjs`, `package.json`,
`.planning/codebase/UI-CONVENTIONS.md`
**Files scanned:** ~40 read in full or in targeted ranges; directory listings across `app/`,
`src/lib/`, `src/components/`, `drizzle/`, `tests/`
**Pattern extraction date:** 2026-09-03
