# Phase 33: Pipeline - Pattern Map

**Mapped:** 2026-09-03
**Files analyzed:** 17 (creates + modifies) — schema, migration, queries, actions, routes, components, sidebar/route-meta, styles
**Analogs found:** 15 / 17 (2 flagged as no-close-analog below)

There is no RESEARCH.md for this phase (research disabled project-wide). File list is derived
from `33-CONTEXT.md` (decisions D-01..D-12) and `33-UI-SPEC.md` (Component Inventory, Route map,
Surface-by-Surface Contract).

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/db/schema.ts` (add `stage` col + CHECK on `clientRelationships`; add `outcome`/`outcomeDate`/`outcomeReason` cols + CHECK on `proposals`) | model (schema) | CRUD | `src/db/schema.ts` — `proposals.status`/`company_pair_decisions.verdict` blocks (same file, same pattern) | exact |
| `drizzle/00XX_phase33_pipeline.sql` (+ hand-completed trigger) | migration | batch | `drizzle/0008_phase31_reconciliation.sql` (hand-completed CHECK/index) + `drizzle/0004_phase12_drafts_and_history.sql` (trigger) | exact (structure) / role-match (trigger content) |
| `src/lib/db/queries/pipeline.ts` (new — board read: owner's relationships grouped by stage + conversion-rate aggregate) | model/query | CRUD | `src/lib/db/queries/client-relationships.ts` (`listClientBook`) | exact |
| `src/lib/pipeline/actions.ts` (new — `advanceRelationshipStageAction`, `markProposalWonAction`, `markProposalLostAction`, inline-SIREN save) | service (server action) | request-response | `src/lib/crm/actions.ts` (`updateContactAction`, `createContactAction`) | exact |
| `src/lib/pipeline/schemas.ts` (new — zod schemas for stage/outcome/SIREN input) | utility | transform | `src/lib/crm/schemas.ts` | exact |
| `app/(authed)/pipeline/page.tsx` (new route) | route (server component page) | request-response | `app/(authed)/clients/[id]/page.tsx` | exact |
| `app/(authed)/pipeline/PipelineBoard.tsx` (new, client) | component | event-driven | `src/components/blocks/solution-crm-2/components/deal-pipeline.tsx` (`DealPipeline`) | role-match (unvetted reference block, not app code) |
| `app/(authed)/pipeline/PipelineMobileList.tsx` (new, client) | component | event-driven | none in-tree (accordion+picker composition is new) — nearest primitive-level analog is shadcn `Accordion`/`Select` usage elsewhere (e.g. `ContactList.tsx`) | partial |
| `app/(authed)/pipeline/PipelineCard.tsx` (new) | component | transform | `src/components/blocks/solution-crm-2/components/deal-pipeline.tsx` (`DealCard`) for structure; `ClientsGrid.tsx` row for real-data card conventions | role-match |
| `app/(authed)/pipeline/PipelineColumnHeader.tsx` (new) | component | transform | `deal-pipeline.tsx` (`DealColumnView`'s header block) | role-match |
| `app/(authed)/clients/[id]/ProposalOutcomeControl.tsx` (new) | component | event-driven | `app/(authed)/clients/[id]/ContactList.tsx` (row-level action buttons opening a dialog) | role-match |
| `app/(authed)/clients/[id]/MarkWonDialog.tsx` (new) | component | request-response | `app/(authed)/clients/CreateClientDialog.tsx` | exact (chrome) |
| `app/(authed)/clients/[id]/MarkLostDialog.tsx` (new) | component | request-response | `app/(authed)/clients/[id]/ContactFormDialog.tsx` | exact (chrome) |
| `app/(authed)/pipeline/access.test.tsx` (new) | test | request-response | `app/(admin)/[adminSegment]/companies/review/access.test.tsx` | exact (invert admin/non-admin) |
| `src/lib/db/queries/pipeline.isolation.integration.test.ts` (new, or extend `client-relationships.isolation.integration.test.ts`) | test | CRUD | `src/lib/db/queries/client-relationships.isolation.integration.test.ts` | exact |
| `src/components/ui/AppSidebar.tsx` (modify — add `pipeline` nav entry) | component (modify) | transform | same file, `clients` entry (lines 111-121) | exact |
| `src/lib/route-meta.ts` (modify — add `'pipeline'` to `ActiveNav` + branch) | utility (modify) | transform | same file, `/clients` branch (lines 184-198) | exact |
| `app/globals.css` (modify — reserved-lane drag-refusal ring rule) | config (modify) | transform | **none** — first plain-CSS `[data-slot=...]` combinator rule in this file | no analog (flagged below) |

---

## Pattern Assignments

### `src/db/schema.ts` — `clientRelationships.stage` + `proposals.outcome*` (model, CRUD)

**Analog:** same file — `proposals.status` (lines 197-268) and `company_pair_decisions.verdict`
(lines 465-494). Both establish "TypeScript union backed by a text column + DB CHECK, never a
lookup table" — exactly D-02's instruction.

**Enumerated-value pattern** (`src/db/schema.ts:197-205, 259-265`):
```typescript
export const proposals = pgTable('proposals', {
  // ...
  status: text('status').notNull().default('active'),
  // ...
}, (table) => [
  check('proposals_status_check', sql`${table.status} IN ('draft','active','deleted')`),
]);
```
Apply identically for `stage` on `clientRelationships`:
```typescript
stage: text('stage').notNull().default('prospect'),
// ...
check('client_relationships_stage_check',
  sql`${table.stage} IN ('prospect','qualifie','proposition_envoyee','negociation','perdu','signe','debloque')`),
```
And for `outcome` on `proposals` (nullable — D-06: `unanswered` is never stored):
```typescript
outcome: text('outcome'),
outcomeDate: timestamp('outcome_date', { withTimezone: true }),
outcomeReason: text('outcome_reason'),
// ...
check('proposals_outcome_check', sql`${table.outcome} IS NULL OR ${table.outcome} IN ('won','lost')`),
```
Note: only `'won'`/`'lost'` are ever stored per D-06 — `'unanswered'` must NOT appear in this
CHECK's value list; it is derived, matching how `'expired'` is absent from
`proposals_status_check`'s list.

**Nullable-pair completeness precedent** (companion to `outcomeDate`/`outcomeReason`), same shape
as `company_pair_decisions_resolution_check` (`src/db/schema.ts:491-494`):
```typescript
check(
  'company_pair_decisions_resolution_check',
  sql`(${table.verdict} IS NULL AND ${table.decidedBy} IS NULL AND ${table.decidedAt} IS NULL) OR (${table.verdict} IS NOT NULL AND ${table.decidedBy} IS NOT NULL AND ${table.decidedAt} IS NOT NULL)`,
),
```
Apply the same shape to `proposals`: outcome set requires `outcomeDate` set (reason stays optional
per D-08's dialog fields — "Motif (facultatif)" — so do not require it in the pairing check).

**Immutability boundary (CRM-05) — where NOT to touch:** `src/db/schema.ts:220-239` — `inputs`,
`paramsSnapshot`, `computed`, `schemaVersion` are the invariant-protected columns. The new outcome
columns must be added as fresh top-level columns alongside `clientRelationshipId` (lines 253-258),
not nested inside any jsonb blob.

**D-07 finding — a plain CHECK cannot express the SIREN gate.** `companies.siren` and
`proposals` are different tables; Postgres `CHECK` constraints cannot reference another table
(no subqueries, no cross-table joins). The DB-level half of D-07's "belt and braces" therefore
cannot be a `CHECK` — it needs a trigger. The one existing trigger precedent in this codebase:

**Trigger pattern** (`drizzle/0004_phase12_drafts_and_history.sql:43-47`):
```sql
CREATE OR REPLACE FUNCTION "coefficient_history_no_modify"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'coefficient_history is append-only — UPDATE and DELETE forbidden'; END; $$;
--> statement-breakpoint
CREATE TRIGGER "coefficient_history_no_update" BEFORE UPDATE ON "coefficient_history" FOR EACH ROW EXECUTE FUNCTION "coefficient_history_no_modify"();
```
A `BEFORE UPDATE OR INSERT ON proposals FOR EACH ROW` trigger that, when `NEW.outcome = 'won'`,
looks up the company's `siren` via `NEW.client_relationship_id → client_relationships.company_id →
companies.siren` and `RAISE EXCEPTION` if null, is the shape to follow. This is a genuinely new
kind of trigger for this codebase (the existing one guards immutability, not a cross-table
business rule) — flag this to the planner as the phase's least-precedented piece of DDL, hand-
written directly in the migration SQL exactly as the 0008 migration's LEAST/GREATEST index and
self-pair CHECK were (not expressible via Drizzle's schema builder either).

---

### `drizzle/00XX_phase33_pipeline.sql` (migration, batch)

**Analog:** `drizzle/0008_phase31_reconciliation.sql` (header comment convention) +
`drizzle/0004_phase12_drafts_and_history.sql` (trigger).

**Authoring/naming/journalling convention** (`drizzle/meta/_journal.json`, tail):
```json
{ "idx": 8, "version": "7", "when": 1788336690418, "tag": "0008_phase31_reconciliation", "breakpoints": true }
```
Next migration is `0009_phase33_pipeline` (or drizzle-kit's own generated slug if `npm run
db:generate` is run first, per this repo's actual practice — 0008's tag came from `db:generate`,
then was hand-edited per its own header comment). Workflow, verbatim from 0008's header
(`drizzle/0008_phase31_reconciliation.sql:1-14`):
```sql
-- Plan 31-01 — Phase 31 Reconciliation Engine & Proposal Extraction (D-08, D-09, D-10).
-- Per 31-01-PLAN.md task 2. Hand-completed on top of `npm run db:generate` output:
--   1. Appends the unordered-pair unique index ... — drizzle-kit
--      cannot generate a LEAST/GREATEST expression index from a schema definition ...
--   2. Appends a CHECK guarding against a degenerate self-pair ... not expressible as a Drizzle
--      column-level check across two sibling columns without a raw SQL escape hatch ...
-- DO NOT EDIT BY HAND once committed — superseded by a follow-up migration if changes needed.
```
Apply the identical convention: run `npm run db:generate` for the column/CHECK additions Drizzle
CAN express, then hand-append the cross-table trigger (which it cannot express) with a comment
explaining why, following this exact precedent.

**Apply path — hard constraint, cite verbatim, never a `push` command**
(`.github/workflows/db-migrate.yml:1-9, 130-146`):
```yaml
# MANUAL TRIGGER ONLY. No on:push, no on:pull_request, no on:schedule.
# Per BOOT-10 + STATE.md: migrations apply only via this gated, human-approved path.
...
      - name: Apply migrations
        env:
          DATABASE_URL: ${{ (github.event.inputs.branch == 'main' && secrets.DATABASE_URL_MAIN) || ... }}
        run: npm run db:migrate
```
`npm run db:migrate` → `tsx scripts/migrate.ts` (`package.json:23`). `drizzle-kit push` is
forbidden repo-wide, enforced by `scripts/check-no-drizzle-push.sh` scoped to `git ls-files`. Do
not reference `push` anywhere in phase planning artifacts as an execution step.

---

### `src/lib/db/queries/pipeline.ts` (model/query, CRUD) — new

**Analog:** `src/lib/db/queries/client-relationships.ts` — `listClientBook` (lines 136-238) and
`getClientRelationshipForOwner` (lines 257-278).

**Owner-scoping contract** (module header, `client-relationships.ts:5-32`, apply verbatim to the
new module):
```typescript
/**
 * CRM-02 CONTRACT: every exported function in this module takes an `ownerId`
 * that is a REQUIRED, non-optional, non-defaulted parameter, and that value
 * is compiled directly into the WHERE (or HAVING) clause of the SQL statement
 * the function issues. No function here accepts an "include every owner"
 * flag, a pre-checked boolean, or any other bypass. There is NO admin path in
 * this module ...
 */
```

**Query shape to copy** (`client-relationships.ts:154-211`):
```typescript
const where = and(
  eq(schema.clientRelationships.ownerId, args.ownerId),
  searchPredicate,
);
// ... .from(schema.clientRelationships).innerJoin(schema.companies, ...).leftJoin(schema.proposals, ...)
// ... .where(where).groupBy(...)
```
The board query is the same shape, `GROUP BY stage` instead of a cursor-paginated list — no
cursor/pagination is needed for a 7-lane board (bounded row count per partner), so the cursor
machinery (`encodeCursor`/`decodeCursor`, lines 77-91) is NOT applicable here; keep the query
simpler than `listClientBook`, closer to a plain `SELECT ... WHERE owner_id = $1 ORDER BY stage`.

**D-18 null-collapse precedent** — reuse for a single-relationship stage-change source read
(`client-relationships.ts:250-256`):
```typescript
/**
 * Fetch a single relationship, scoped to `ownerId` in the SAME statement.
 * Returns `null` for both "no such relationship" and "exists but is owned by
 * someone else" ...
 */
```

**Conversion-rate aggregate (PIPE-03, own-book only, D-12):** no existing aggregate-over-outcome
query exists yet (first one in this codebase) — build it as a `COUNT(*) FILTER (WHERE outcome =
'won')` / `COUNT(*) FILTER (WHERE outcome IS NOT NULL)` (or whatever denominator A-2 resolves to)
scoped by `eq(proposals.userId, ownerId)`, following `lastActivityMax`'s `sql<T>` aggregate-column
convention (`client-relationships.ts:96`):
```typescript
const lastActivityMax = sql<Date | null>`MAX(${schema.proposals.createdAt})`;
```

---

### `src/lib/pipeline/actions.ts` (service/server action, request-response) — new

**Analog:** `src/lib/crm/actions.ts` — `updateContactAction` (lines 240-281) for the stage-advance
UPDATE, `createContactAction` (lines 173-232) for the TOCTOU discipline comment, and
`src/lib/reconcile/actions.ts` (lines 45-99) for the bounded-error/try-catch skeleton.

**Module header / bounded-error contract** (`crm/actions.ts:1-40`):
```typescript
'use server';
/**
 * PITFALLS §7.3 ordering — every exported function calls
 * requireRelationshipHolder() as the FIRST await, before any DB access.
 *
 * Bounded-error discipline (T-30-05-03): every failure class in every action
 * throws the single key 'clients.toast.error'. The raw error is logged
 * server-side only (console.error) ...
 *
 * Non-transactional by design (T-30-05-09 note): ... drizzle-orm/neon-http ...
 * whose .transaction() throws "No transactions support in neon-http driver" ...
 */
const BOUNDED_ERROR = 'pipeline.toast.error'; // new key, same discipline
```

**Stage-advance UPDATE — direct single-table analog, even closer than the INSERT...SELECT one**
(`crm/actions.ts:240-267`, `updateContactAction`):
```typescript
export async function updateContactAction(contactId: string, raw: unknown): Promise<void> {
  const { session } = await requireRelationshipHolder(); // FIRST — PITFALLS §7.3
  try {
    const input = contactSchema.parse(raw);
    const dbi = db();
    const updated = await dbi
      .update(schema.contacts)
      .set({ /* fields */ })
      .where(and(
        eq(schema.contacts.id, contactId),
        inArray(schema.contacts.clientRelationshipId, ownedRelationships),
      ))
      .returning();
    if (updated.length === 0) {
      throw new Error('contact not owned by caller');
    }
    // ...
  } catch (e) { /* bounded error */ }
}
```
`advanceRelationshipStageAction` is SIMPLER than this: `clientRelationships` carries `ownerId`
directly (no join/`inArray` needed), so the WHERE is a plain two-predicate AND, exactly the
TOCTOU-safe shape T-30-05-05 requires:
```typescript
const updated = await dbi
  .update(schema.clientRelationships)
  .set({ stage: input.toStage })
  .where(and(
    eq(schema.clientRelationships.id, relationshipId),
    eq(schema.clientRelationships.ownerId, session.user.id),
  ))
  .returning();
if (updated.length === 0) throw new Error('relationship not owned by caller');
```
D-04 constraint: this action must be the ONLY write path that ever sets `stage`, and must never
also write `signe`/`debloque` as a side effect of a proposal outcome (see the Decoupling Contract
in `33-UI-SPEC.md`).

**INSERT...SELECT TOCTOU-proof pattern** (`crm/actions.ts:173-216`, `createContactAction`) — cite
if the inline-SIREN-save path needs to write `companies.siren` scoped through the relationship:
```typescript
// Ownership is proved INSIDE the INSERT via `INSERT ... SELECT`: the source
// row is the caller's own relationship, so a relationship the caller does not
// own selects zero rows and inserts nothing. Zero rows returned is the only
// failure signal (T-30-05-04 / T-30-05-05...).
```
Note `companies.siren` is NOT owner-scoped by FK the way `clientRelationships` is — the SIREN
write is actually `UPDATE companies SET siren = $1 WHERE id = (SELECT company_id FROM
client_relationships WHERE id = $2 AND owner_id = $3)` or an `UPDATE ... FROM` re-proving
ownership through the join in the same statement, same discipline, different join shape than the
INSERT...SELECT precedent (which inserts a NEW row; this UPDATEs an EXISTING row through a
relationship the caller doesn't own outright — `companies` is the shared registry, CRM-01). Flag
to the planner: this is the one write in the phase that touches a row NOT scoped 1:1 by
`owner_id`, so the ownership re-proof must go through the join, not a direct column match.

**`markProposalWonAction`/`markProposalLostAction` — UPDATE on `proposals`, ownership re-proved
through `client_relationship_id`'s owner, same `inArray`-through-join shape as
`updateContactAction`'s `ownedRelationships` subquery** (`crm/actions.ts:246-249`):
```typescript
const ownedRelationships = dbi
  .select({ id: schema.clientRelationships.id })
  .from(schema.clientRelationships)
  .where(eq(schema.clientRelationships.ownerId, session.user.id));
```
Adapt: `.where(and(eq(schema.proposals.id, proposalId), eq(schema.proposals.userId,
session.user.id)))` is actually sufficient and simpler — `proposals.userId` is already the direct
owner column (no join needed), matching `listProposalsForRelationship`'s own double-scoping
comment (`client-relationships.ts:349-354`: "Filters on BOTH `client_relationship_id` AND
`proposals.user_id = ownerId` in the same statement — defense in depth").

**Server action shape with revalidation** (`reconcile/actions.ts:45-73`):
```typescript
export async function mergeCompanyPairAction(pairId: string, survivorCompanyId: string): Promise<void> {
  const { session } = await requireAdmin(); // FIRST
  try {
    const input = mergeCompanyPairSchema.parse({ pairId, survivorCompanyId });
    const result = await mergeCompanyPair({ ...input, actorId: session.user.id });
    if (!result.ok) { console.error(...); throw new Error(BOUNDED_ERROR); }
    const path = reviewQueuePath();
    if (path) revalidatePath(path);
  } catch (e) {
    if (e instanceof Error && e.message === BOUNDED_ERROR) throw e;
    console.error(...); throw new Error(BOUNDED_ERROR);
  }
}
```
The correct auth gate for every pipeline action is **`requireRelationshipHolder()`**, not
`requireAdmin()` — this surface is partner-facing (D-10, UI-SPEC Access Contract §2).

**Audit-log union — a closed enum that needs new members** (`src/lib/db/queries/audit-log.ts`,
`AuditAction` type, currently enumerates `contact.create`/`contact.update`/etc. under the "Phase
30" comment block). Add `relationship.stage_change`, `proposal.outcome_won`,
`proposal.outcome_lost` (or similar) to this union alongside the existing Phase 30/31 entries —
`writeAuditLog` itself (imported the same way `crm/actions.ts:36` does) needs no changes beyond
the type union. This log is also what Phase 34's ACTV-02 will read from later (per D-09.2 point
4), so naming these actions clearly now matters beyond this phase.

---

### `app/(authed)/pipeline/page.tsx` (route, request-response) — new

**Analog:** `app/(authed)/clients/[id]/page.tsx` (full file read).

**Auth-first ordering + `dynamic = 'force-dynamic'`** (`clients/[id]/page.tsx:19-20, 52-56`):
```typescript
export const dynamic = 'force-dynamic';
// ...
export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { session } = await requireRelationshipHolder(); // FIRST — auth before any data access
  const lang = await getCurrentLang();
  const relationship = await getClientRelationshipForOwner(id, session.user.id);
  if (!relationship) { notFound(); }
  const [contacts, proposals] = await Promise.all([ /* owner-scoped fetches, ONLY after the guard */ ]);
```
`/pipeline` has no `[id]` segment and no `notFound()` branch (a partner with zero relationships is
a valid, renderable empty state per UI-SPEC §1.2, not a 404) — so the shape simplifies to: guard →
fetch board data (already owner-scoped) → render. The **order** (guard first, data access only
after) is the load-bearing part to copy, not the `notFound()` branching.

**Empty-state composition** (`clients/[id]/page.tsx:119-132`, adapt `Empty`/`EmptyMedia`/
`EmptyDescription`/`EmptyContent` composition for the zero-relationships state UI-SPEC §1.2
specifies, swapping `FileTextIcon` for `BuildingIcon` and the CTA target for `/clients`).

---

### `app/(authed)/pipeline/PipelineBoard.tsx` (component, event-driven) — new

**Analog:** `src/components/blocks/solution-crm-2/components/deal-pipeline.tsx` — a *vetted
reference block*, not app code (per UI-SPEC's Registry Safety note: "previously used only inside
the unused `solution-crm-2` reference block"). Composition pattern to copy, several concrete
divergences required — do not copy verbatim:

**BoardScrollArea — copy near-verbatim** (`deal-pipeline.tsx:78-109`):
```typescript
function BoardScrollArea({ children }: { children: ReactNode }) {
  return (
    <ScrollAreaPrimitive.Root data-slot="scroll-area" className="relative w-full min-w-0 overflow-hidden pb-3">
      <ScrollAreaPrimitive.Viewport data-slot="scroll-area-viewport" className="focus-visible:ring-ring/50 w-full overflow-x-auto overflow-y-hidden ...">
        <ScrollAreaPrimitive.Content data-slot="scroll-area-content" className="w-max min-w-full">
          {children}
        </ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar data-slot="scroll-area-scrollbar" data-orientation="horizontal" orientation="horizontal" className="...">
        <ScrollAreaPrimitive.Thumb data-slot="scroll-area-thumb" className="bg-foreground/15 relative flex-1 rounded-full" />
      </ScrollAreaPrimitive.Scrollbar>
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}
```
This is exactly UI-SPEC's prescribed horizontal-scroll-inside-capped-`<main>` mechanism.

**Divergences from the reference (do NOT copy these parts):**
1. Reference uses `<Kanban value={dealsByColumn} onValueChange={setDealsByColumn} ...>`
   (`deal-pipeline.tsx:530-534`) — uncontrolled-style, auto-reshuffling. Phase 33 MUST use
   `onMove` instead (per D-09.2 / UI-SPEC "the consumer owns applying the item move" comment
   found in `kanban.tsx:474`), with `setColumns` called explicitly inside the handler after
   calling `advanceRelationshipStageAction`.
2. Reference renders `KanbanColumnHandle` + `AddStageButton` (`deal-pipeline.tsx:477-494,
   400-415`) for reorderable/addable columns — **do not render either**; D-02's stages are fixed.
3. Reference colors each column with a dot (`column.dotClassName`,
   `deal-pipeline.tsx:446-452`) — UI-SPEC explicitly forbids per-stage color dots (single-accent
   system). Drop this entirely.
4. Reference's `KanbanColumn` has no `disabled` prop passed — the two reserved lanes need
   `disabled` set (see kanban.tsx excerpt below) plus the `bg-muted/40`/`BanIcon`/"Réservé" badge
   treatment UI-SPEC specifies, which has no reference-block precedent at all (new render branch).
5. Reference's `DealCard` splits `KanbanItem`/`KanbanItemHandle` onto two nodes
   (`deal-pipeline.tsx:346-353`) — UI-SPEC flags this exact split as the keyboard-drag risk (§
   "Item drag must be keyboard-operable"). Verify/fix per that section; do not copy this split
   blindly.

**Kanban primitive's `onMove` contract** (`src/components/reui/kanban.tsx:452-478`):
```typescript
if (onMove && !isColumn(active.id)) {
  const activeContainer = findContainer(active.id)
  const overContainer = findContainer(over.id)
  if (activeContainer && overContainer) {
    // ... compute activeIndex/overIndex
    onMove({ event, activeContainer, activeIndex, overContainer, overIndex })
  }
  // In onMove mode the consumer owns applying the item move, so do not
  // fire onValueCommit for item moves; column reorders still commit below.
  dragOriginRef.current = null
  return
}
```

**`KanbanColumn`'s `disabled` prop and its `data-disabled`/`data-dragging` attributes** (needed for
the reserved-lane CSS rule) (`src/components/reui/kanban.tsx:629-687`):
```typescript
export interface KanbanColumnProps extends useRender.ComponentProps<"div"> {
  value: string
  disabled?: boolean
}
// ...
"data-slot": "kanban-column",
"data-value": value,
"data-dragging": isSortableDragging,
"data-disabled": disabled,
```
Root `Kanban`'s own `data-dragging` (referenced by the CSS rule in UI-SPEC): grep confirmed at
`kanban.tsx:580`, `"data-dragging": activeId !== null` — the selector `[data-slot="kanban"]
[data-dragging="true"] [data-slot="kanban-column"][data-disabled="true"]` UI-SPEC specifies is
consistent with the primitive's real attribute names.

**Toolbar/count-badge convention worth reusing for column headers** (`deal-pipeline.tsx:152-154,
461-463` — both header instances use the identical badge classes UI-SPEC's Active-lane row
prescribes):
```typescript
<Badge variant="outline" className="bg-background">
  {opportunities.length}
</Badge>
```

---

### `app/(authed)/pipeline/PipelineMobileList.tsx` (component) — no strong in-tree analog

No existing accordion-per-stage + inline-`Select`-stage-picker composition exists anywhere in this
codebase. Nearest primitive-level precedents: `ContactList.tsx`'s row-with-inline-action-button
pattern (structurally distant — no accordion there) and shadcn `Select` usage in
`CreateClientDialog.tsx`/`ContactFormDialog.tsx` (form-context `Select`, not a stage-picker outside
a form). Treat this component as net-new composition from shadcn primitives (`Accordion` if
installed — confirm in `components.json`/`src/components/ui/` before assuming; not listed in
UI-SPEC's Component Inventory table under "Reuse", so it is unclear whether `accordion.tsx` is
even present — **flag to planner: verify `src/components/ui/accordion.tsx` exists before
depending on it**).

---

### `app/(authed)/clients/[id]/MarkWonDialog.tsx` / `MarkLostDialog.tsx` (component, request-response) — new

**Analog:** `app/(authed)/clients/CreateClientDialog.tsx` (full file) for the RHF/zod + Dialog
chrome + retry-without-re-entering-data discipline; `app/(authed)/clients/[id]/ContactFormDialog.tsx`
for the controlled-`open`/`onOpenChange`-from-parent variant (`MarkWonDialog`/`MarkLostDialog` are
triggered from `ProposalOutcomeControl`, not self-triggering, matching `ContactFormDialog`'s
shape, not `CreateClientDialog`'s own `DialogTrigger`).

**Form + submit + retry-on-failure pattern** (`CreateClientDialog.tsx:69-82`):
```typescript
const onSubmit = async (data: CreateClientFormValues) => {
  try {
    const { relationshipId } = await createClientRelationshipAction(data);
    toast.success(t('clients.toast.created', lang));
    setOpen(false);
    reset();
    router.push(`/clients/${relationshipId}`);
  } catch {
    toast.error(t('clients.toast.error', lang));
    // Dialog stays open so the partner can retry without re-entering data.
  }
};
```
`MarkWonDialog` diverges at exactly one point per D-08: the SIREN-gate failure is NOT the generic
catch-all — it needs a distinguishable failure signal from `markProposalWonAction` (e.g. a typed
error / discriminated result, not just `BOUNDED_ERROR`) so the dialog can reveal the inline SIREN
sub-form instead of just toasting. None of the existing bounded-error actions in this codebase
return a distinguishable failure reason to the client on purpose (T-30-05-03's whole point is
collapsing failure classes) — **this is a deliberate, narrow exception to that discipline that the
planner must design explicitly**, e.g. `markProposalWonAction` throwing a distinct
`SIREN_REQUIRED` sentinel error (still not leaking the raw cause) rather than the single
`BOUNDED_ERROR` key every other action in this phase uses. Flag this as a one-off pattern
deviation, not a project-wide relaxation.

**Inline SIREN field composition** (`CreateClientDialog.tsx:123-153`):
```typescript
<Controller
  name="siren"
  control={control}
  render={({ field }) => (
    <SirenInput
      inputId="create-client-siren"
      value={field.value ?? ''}
      onChange={field.onChange}
      onBlur={field.onBlur}
      invalid={!!errors.siren}
      ariaDescribedBy={errors.siren ? 'create-client-siren-error' : 'create-client-siren-helper'}
      disabled={isSubmitting}
    />
  )}
/>
```
`SirenInput` (`src/components/proposal/SirenInput.tsx`, full file) is reusable as-is — same
9-digit format/mask behavior UI-SPEC's "SIREN helper — 9 chiffres, sans espaces" describes.

**Required-asterisk accessibility convention** (`ContactFormDialog.tsx:17-23` header note +
line 117-119):
```typescript
<span className="ml-0.5 text-destructive" aria-hidden="true">*</span>
```
Use for the Won dialog's required "Date de signature" field.

**Asymmetric confirm-button variant** — no existing dialog in this codebase has TWO differently-
styled confirm buttons across sibling dialogs on the same feature the way Won (`variant="default"`,
the phase's one accent-filled control) vs. Lost (`variant="outline"`) do. `31-UI-SPEC.md`'s Merge
dialog used `destructive` for its own confirm (a real deletion) — not directly reusable since
Lost deletes nothing. This is new judgment, not a copy — UI-SPEC already resolves it explicitly,
flagging only that no button-variant precedent exists to lean on beyond the Merge dialog's
different-reasoned `destructive` choice.

---

### `app/(authed)/clients/[id]/page.tsx` (modify — thread `actionsSlot` through `ProposalRow`)

**Analog:** the `actionsSlot` prop already exists on `ProposalRow` (`src/components/proposals/
ProposalRow.tsx:35, 86, 142`) but the current `clients/[id]/page.tsx` (lines 136-138) does NOT
pass it:
```typescript
{proposalRows.map((row) => (
  <ProposalRow key={row.id} row={row} lang={lang} />
))}
```
This is the exact extension point (Phase 26's `draftActionsSlot`/`actionsSlot`, cited by UI-SPEC)
— confirmed present, confirmed currently unused on this page. Task is additive:
`<ProposalRow key={row.id} row={row} lang={lang} actionsSlot={<ProposalOutcomeControl .../>} />`.
No change to `ProposalRow.tsx` itself needed — its slot rendering (`{actionsSlot}` at line 142)
already exists.

---

### `src/components/ui/AppSidebar.tsx` (modify, transform)

**Analog:** same file, the existing `clients` conditional entry (`AppSidebar.tsx:111-121`):
```typescript
function partnerNavItems(isAdmin: boolean): NavItem[] {
  return [
    { key: 'home', icon: HomeIcon, labelKey: 'sidebar.nav.home', href: '/' },
    { key: 'proposals-new', icon: PlusIcon, labelKey: 'sidebar.nav.proposalsNew', href: '/proposals/new/parametres' },
    { key: 'proposals', icon: ProposalIcon, labelKey: 'sidebar.nav.proposals', href: '/proposals' },
    ...(isAdmin
      ? []
      : [{ key: 'clients' as const, icon: BuildingIcon, labelKey: 'sidebar.nav.clients' as DictKey, href: '/clients' }]),
    { key: 'help', icon: HelpIcon, labelKey: 'sidebar.nav.help', href: '/aide' },
  ];
}
```
Add `pipeline` inside the SAME `isAdmin ? [] : [...]` array (both `clients` and `pipeline` are
`requireRelationshipHolder()`-gated and empty-by-construction for admins, per the comment at
lines 100-109), positioned directly after `clients` per UI-SPEC's ordering — do not add a second,
separate `isAdmin` conditional.

---

### `src/lib/route-meta.ts` (modify, transform)

**Analog:** same file, the `/clients` branch (`route-meta.ts:184-198`):
```typescript
if (pathname.startsWith('/clients')) {
  const tail = pathname.slice('/clients'.length);
  const hasDetail = tail !== '' && tail !== '/';
  return {
    titleKey: 'sidebar.nav.clients',
    activeNav: 'clients',
    breadcrumb: hasDetail
      ? [{ labelKey: 'sidebar.nav.clients', href: '/clients' }, { labelKey: 'shell.breadcrumb.clientDetail' }]
      : [{ labelKey: 'sidebar.nav.clients' }],
  };
}
```
`/pipeline` has no child detail route (UI-SPEC §0: "a single non-link crumb"), so the new branch
is simpler — no `hasDetail` fork:
```typescript
if (pathname.startsWith('/pipeline')) {
  return {
    titleKey: 'sidebar.nav.pipeline',
    activeNav: 'pipeline',
    breadcrumb: [{ labelKey: 'sidebar.nav.pipeline' }],
  };
}
```
Also add `'pipeline'` to the `ActiveNav` union (`route-meta.ts:9-20`, alongside `'clients'`,
`'admin-reconciliation'`, etc.).

---

### `app/(authed)/pipeline/access.test.tsx` (test, request-response) — new

**Analog:** `app/(admin)/[adminSegment]/companies/review/access.test.tsx` (full file) — the
strongest access-boundary test shape in the repo, proving BOTH refusal AND that the data query
never ran, with real-throw `notFound()` semantics (not the no-op `vi.fn()` `require.test.ts` uses).

**Structure to copy, inverted:** that test refuses non-admins and admits admins
(`requireAdmin`-gated). The pipeline route is inverted — `requireRelationshipHolder()`-gated,
so it must refuse **admin** and admit `partner`/`sales`:
```typescript
const { notFoundMock, roleRef } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => { throw new (class extends Error { digest = 'NEXT_HTTP_ERROR_FALLBACK;404'; })('NEXT_NOT_FOUND'); }),
  roleRef: { current: 'admin' as string },
}));
vi.mock('next/navigation', () => ({ notFound: notFoundMock, useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }) }));

const { requireRelationshipHolderMock } = vi.hoisted(() => ({ requireRelationshipHolderMock: vi.fn() }));
vi.mock('@/lib/auth/require', () => ({ requireRelationshipHolder: requireRelationshipHolderMock }));

// mock the pipeline board query the same way listPendingPairsForAdminMock is mocked,
// and assert it was NEVER called when role === 'admin':
describe('pipeline access boundary (D-10 / CRM-02)', () => {
  it('refuses role "admin" — and never reaches the board data', async () => {
    roleRef.current = 'admin';
    await expect(callPage()).rejects.toMatchObject({ digest: 'NEXT_HTTP_ERROR_FALLBACK;404' });
    expect(notFoundMock).toHaveBeenCalled();
    expect(listPipelineBoardMock).not.toHaveBeenCalled(); // THE security assertion
  });
  // 'partner' / 'sales' — admitted, board query DOES run (ROLE-02).
});
```
Same 404-not-403 assertion (`access.test.tsx:149-156`) applies unchanged — this repo's status-code
discipline is universal, not admin-specific.

---

### `src/lib/db/queries/pipeline.isolation.integration.test.ts` (test, CRUD) — new or extend

**Analog:** `src/lib/db/queries/client-relationships.isolation.integration.test.ts` (header read,
lines 1-50) — real-Postgres, `DATABASE_URL_TEST`-gated, skip-by-default pattern. UI-SPEC's D-10
explicitly says "extend it rather than writing a parallel one" — the two partner users / shared +
private company fixture already exists there; the pipeline board query can likely reuse the same
`beforeAll` seed data rather than duplicating it. Planner should read the full file (387 lines
elsewhere in this same directory listing) before deciding extend-vs-new.

---

## Shared Patterns

### Auth gate — `requireRelationshipHolder()`, never `requireAdmin()`
**Source:** `src/lib/auth/require.ts:106-112`
**Apply to:** `app/(authed)/pipeline/page.tsx`, every action in `src/lib/pipeline/actions.ts`,
`ProposalOutcomeControl`'s dialogs' submit actions, `access.test.tsx`.
```typescript
export async function requireRelationshipHolder(): Promise<RequireUserResult> {
  const { session, role } = await requireUser();
  if (role === 'admin') {
    notFound();
  }
  return { session, role };
}
```

### Bounded-error discipline
**Source:** `src/lib/crm/actions.ts:39-40` (`clients.toast.error`), `src/lib/reconcile/actions.ts:32`
(`admin.reconciliation.toast.error`)
**Apply to:** every server action in `src/lib/pipeline/actions.ts` — new key `pipeline.toast.error`,
following the "small per-namespace duplication over cross-namespace key reuse" precedent UI-SPEC's
i18n section already cites.

### TOCTOU-safe mutation — ownership re-proved inside the write statement
**Source:** `src/lib/crm/actions.ts:173-232` (`createContactAction`, `INSERT...SELECT`) and
`:240-281` (`updateContactAction`, `UPDATE...WHERE inArray(...)`); commit `1d763b9` is the original
fix.
**Apply to:** `advanceRelationshipStageAction`, `markProposalWonAction`, `markProposalLostAction`,
the inline-SIREN save. No function may do a standalone ownership `SELECT` followed by a separate
write statement.

### No database transactions — multi-step writes must be idempotent, not atomic
**Source:** `src/lib/crm/actions.ts:19-30` (header comment, Neon HTTP driver has no `.transaction()`)
**Apply to:** any pipeline action touching more than one table in one call (e.g. inline-SIREN-save
+ won-outcome-write, if the planner composes them as one action rather than two round trips as
UI-SPEC's dialog flow implies — UI-SPEC's own two-step "save SIREN, then resubmit" design already
sidesteps this by making it two idempotent, separately-retryable calls rather than one
multi-statement write).

### Derive-don't-store — `unanswered` extends `deriveDisplayStatus`'s established rule
**Source:** `src/lib/db/queries/proposals.ts:896-913` (`deriveDisplayStatus`), plus the
UNION-then-filter query pattern at `proposals.ts:205-239` (`archived` branch) as the shape for any
query that needs to select "past validity, no explicit outcome" rows.
```typescript
export function deriveDisplayStatus(row: ProposalRow): DisplayStatus {
  if (row.status === 'deleted') return 'deleted';
  if (row.status === 'draft') return 'draft';
  if (row.pdfGeneratedAt == null || row.paramsSnapshot == null) return 'active';
  const validityDays = (row.paramsSnapshot as { validityDays?: number } | null)?.validityDays ?? 30;
  const expiresAt = new Date(row.pdfGeneratedAt.getTime() + validityDays * 24 * 60 * 60 * 1000);
  if (new Date() > expiresAt) return 'expired';
  return 'active';
}
```
A new pure function, e.g. `deriveProposalOutcome(row)`, returning `'won' | 'lost' | 'unanswered' |
null` (null = "active, still within window, no outcome yet") should live beside or reuse this
function's validity-window math — same `pdfGeneratedAt + validityDays` calculation, gated by
`row.outcome == null` before falling through to the expiry check.

### Enumerated values — TS union + DB CHECK, never a lookup table
**Source:** `src/db/schema.ts:265` (`proposals_status_check`), `:488` (`company_pair_decisions_verdict_check`)
**Apply to:** `clientRelationships.stage`, `proposals.outcome` (see schema section above).

### Server action shape
**Source:** `src/lib/crm/actions.ts` (`'use server'`, guard-first, try/catch → bounded error) and
`src/lib/reconcile/actions.ts:45-73` (revalidatePath-on-success variant)
**Apply to:** all of `src/lib/pipeline/actions.ts`.

### Migrations — authored via `db:generate`, hand-completed for what Drizzle can't express, applied only via the gated workflow
**Source:** `drizzle/0008_phase31_reconciliation.sql:1-14` (header convention),
`.github/workflows/db-migrate.yml` (apply path), `scripts/check-no-drizzle-push.sh` (guard).
**Apply to:** the phase's single new migration file.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `app/globals.css` reserved-lane drag-refusal ring rule (`[data-slot="kanban"][data-dragging="true"] [data-slot="kanban-column"][data-disabled="true"] { ... }`) | config | transform | No existing rule in `app/globals.css` uses a plain-CSS two-element `data-*` descendant-attribute selector — every other styling decision in this codebase is a Tailwind utility class at the call site. This is the first such rule; nothing to copy structurally, only the destructive-token/2px-ring values themselves (already in the app's vocabulary per UI-SPEC). |
| `app/(authed)/pipeline/PipelineMobileList.tsx` (accordion-per-stage + inline `Select` stage-picker composition) | component | event-driven | No accordion-of-cards-with-inline-action-select composition exists anywhere in-tree. Nearest relatives (`ContactList.tsx` row actions, form-bound `Select` in `CreateClientDialog`/`ContactFormDialog`) are structurally distant. Also unverified whether `src/components/ui/accordion.tsx` is even installed — check `components.json`/`src/components/ui/` before the planner assumes it exists. |

Additionally flagged (not "no analog" but worth the planner's attention as genuinely new ground,
not full role-matches):
- **The cross-table SIREN-gate trigger** (D-07) has only one, weakly-related trigger precedent in
  this codebase (`coefficient_history_no_modify`, an immutability guard, not a business-rule
  gate) — see the schema section above.
- **The SIREN-gate dialog's two-phase submit** (D-08) requires a server action to return a
  distinguishable failure reason to the client, which is a narrow, deliberate exception to this
  codebase's otherwise-universal single-bounded-error-key discipline (T-30-05-03) — flagged above
  under `MarkWonDialog`.

---

## Metadata

**Analog search scope:** `src/db/schema.ts`, `drizzle/*.sql` + `drizzle/meta/`, `src/lib/db/queries/`,
`src/lib/crm/`, `src/lib/reconcile/`, `src/lib/auth/require.ts`, `app/(authed)/clients/`,
`app/(authed)/clients/[id]/`, `app/(admin)/[adminSegment]/companies/review/`,
`src/components/reui/kanban.tsx`, `src/components/blocks/solution-crm-2/`, `src/components/ui/`
(`MetricTile.tsx`, `AppSidebar.tsx`), `src/lib/route-meta.ts`, `.github/workflows/db-migrate.yml`,
`scripts/check-no-drizzle-push.sh`.
**Files scanned:** ~30 read in full or targeted sections; stopped once 3-5 strong analogs were
confirmed per file class (schema/migration, query module, server action, route page, dialog,
board component, sidebar/route-meta, test).
**Pattern extraction date:** 2026-09-03
