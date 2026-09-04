# Phase 35: Sales Motivation - Pattern Map

**Mapped:** 2026-09-05
**Files analyzed:** 5 (1 new component, 1 modified page, 1 new query module, 1 modified i18n dictionary, plus a proposed integration test)
**Analogs found:** 5 / 5

**Note:** No RESEARCH.md for this phase (research disabled project-wide). File list and constraints
are drawn entirely from `35-CONTEXT.md` and `35-UI-SPEC.md`.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/(authed)/_components/MomentumCard.tsx` | component (server) | request-response (pure render of pre-fetched props) | `app/(authed)/_components/RelanceCard.tsx` | exact |
| `app/(authed)/_components/MomentumCard.test.tsx` | test | request-response | `app/(authed)/_components/RelanceCard.test.tsx` | exact |
| `app/(authed)/page.tsx` | route/page (server) | request-response | itself (already the integration point) | exact — modify in place |
| `src/lib/db/queries/momentum.ts` | service/query module | CRUD (read aggregate) | `src/lib/db/queries/relationship-events.ts` (`listRelationshipsNeedingFollowUp`) + `src/lib/db/queries/pipeline.ts` (`getConversionRateForOwner`) | exact (owner-scoped aggregate over `relationship_events`) |
| `src/lib/db/queries/momentum.test.ts` | test (unit, mocked driver) | CRUD | `src/lib/db/queries/pipeline.test.ts` | exact |
| `src/lib/db/queries/momentum.isolation.integration.test.ts` (or an added `describe` block inside `client-relationships.isolation.integration.test.ts`) | test (integration, real Postgres) | CRUD | `src/lib/db/queries/client-relationships.isolation.integration.test.ts` | exact |
| `src/lib/i18n/dictionaries.ts` (modified — add `dashboard.momentum.*`) | config/i18n data | request-response | itself, `dashboard.relance.*` / `dashboard.recent.*` blocks | exact — extend in place |

No migration file, no schema change, no new route. Confirmed no file in this phase touches
`src/db/schema.ts` or `drizzle/` — consistent with D-23.

---

## Pattern Assignments

### `app/(authed)/_components/MomentumCard.tsx` (component, request-response)

**Analog:** `app/(authed)/_components/RelanceCard.tsx` (full file read, 145 lines)

**Imports pattern** (RelanceCard.tsx lines 1-6):
```typescript
import Link from 'next/link';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { formatDate } from '@/lib/i18n/format';
import { ProposalListFrame } from '@/components/proposals/ProposalListFrame';
import { cn } from '@/lib/utils';
import type { FollowUpRow } from '@/lib/db/queries';
```
`MomentumCard` diverges here: the UI-SPEC composition mandates `Card`/`CardHeader`/`CardContent`/
`CardTitle` (already imported in `page.tsx`, see below), NOT `ProposalListFrame` — RelanceCard uses
`ProposalListFrame` but that is a list-frame wrapper the momentum card's three-part body doesn't fit.
Import `Card, CardContent, CardHeader, CardTitle` from `@/components/ui/card` and `CheckCircleIcon`
from `@/components/ui/icons` instead.

**Doc-comment discipline** (RelanceCard.tsx lines 8-36) — copy the shape, not the content:
a file-level comment naming (a) which phase/plan it belongs to, (b) the CRM-02 contract this
component itself does NOT enforce (it renders only what it's handed, computes no count/rank/total),
(c) the SERVER COMPONENT rationale (no client directive — literally state why, since a grep for the
directive is part of the acceptance check per RelanceCard's own comment), (d) the ABSENT-vs-EMPTY
reasoning is INVERTED here per UI-SPEC's Access & Non-Leakage point 2 — MomentumCard must document
that it is skipped via `{!isAdmin && <MomentumCard .../>}` at the call site (not `return null` from
inside the component), because an admin's "zero state" would otherwise be indistinguishable from a
real partner's zero-history state, which is itself a GAME-04-adjacent tell.

**Props shape pattern** (RelanceCard.tsx lines 56-68):
```typescript
export interface RelanceCardProps {
  rows: FollowUpRow[];
  lang: Lang;
  nowMs: number;
}
```
`MomentumCard` mirrors this exactly per the UI-SPEC's `MomentumCardProps` interface — `lang`,
`nowMs`, plus `streakWeeks`, `movements`, `badgeProgress`, `trackedSinceLabel`. All data pre-computed
server-side and passed in; the component performs zero queries.

**"now" read at server, never in render** (RelanceCard.tsx lines 60-67, and `page.tsx` lines 22-30):
```typescript
async function getNowMs(): Promise<number> {
  return Date.now();
}
```
`page.tsx` already has this exact helper — reuse it, do not add a second one. Week-boundary
computation (Europe/Paris) in `momentum.ts` should take this same `nowMs` value as an argument
rather than re-reading the clock — same discipline `statusLabel(row, lang, nowMs)` uses in
RelanceCard (lines 80-94), where every date computation takes `nowMs` as a parameter.

**Row-as-link pattern** (RelanceCard.tsx lines 121-140):
```typescript
<Link
  key={row.relationshipId}
  href={`/clients/${row.relationshipId}`}
  data-testid="relance-row"
  className="flex min-w-0 items-center gap-3 rounded-lg border-b border-border px-2.5 py-2.5 text-inherit no-underline transition-colors last:border-b-0 hover:bg-[var(--hover-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
>
  <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-foreground">
    {row.companyName}
  </span>
  <span className={cn('shrink-0 text-[13px] text-muted-foreground tabular-nums', overdue && 'font-semibold')}>
    {statusLabel(row, lang, nowMs)}
  </span>
</Link>
```
Copy verbatim for each movement row (`href="/clients/{relationshipId}"`, same padding/border/hover
classes, same `text-[14.5px] font-medium` company name / `text-[13px] text-muted-foreground` detail
split) — UI-SPEC's Typography table explicitly says movement rows "match `RelanceCard`'s row
treatment exactly." Critical divergence: **no `font-semibold` conditional for a backwards/Perdu
move** — D-11/UI-SPEC Color section forbids any distinguishing weight or color for that case; every
movement row renders identically regardless of direction. Use a stable key (event id, not
relationshipId — one relationship can have multiple movements in the window) and a distinct
`data-testid="momentum-row"`.

**Interpolation-at-call-site convention** (RelanceCard.tsx lines 80-94, `statusLabel`):
```typescript
return t('dashboard.relance.due', lang).replace('{0}', formatDate(...));
```
Dictionary values are never template literals — interpolation happens via `.replace('{0}', …)` /
`.replace('{1}', …)` chained at the call site. Apply identically for
`dashboard.momentum.streak.active`, `.move.stageChanged` ({0}=companyName, {1}=stageLabel,
{2}=weekday), `.move.proposalFinalized`, `.badge.entry.*`, `.moreCount`, `.trackedSince`.

**Empty-vs-populated branch precedent** (`page.tsx` lines 110-130, the recent-proposals card):
```tsx
{recentRows.length === 0 ? (
  <Card className="mt-0">
    <CardHeader className="pb-4">
      <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
        {t('dashboard.recent.title', lang)}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground text-[14.5px] m-0">{t('dashboard.recent.empty', lang)}</p>
    </CardContent>
  </Card>
) : ( /* ProposalListFrame with rows */ )}
```
This is the exact `CardTitle` className UI-SPEC's Typography table names verbatim for the card
eyebrow ("VOTRE PROGRESSION") — reuse the literal class string, do not re-derive it.
`MomentumCard` does NOT need this if/else split at the top level (it always renders the full
three-part `Card`, per D-18 "one heading, one empty state" — the empty/zero condition is handled
*inside* each part: the streak sentence branches on `streakWeeks === 0`, the movements list branches
on `movements.length === 0`, the badge ladder always renders all 9 rungs).

---

### `app/(authed)/page.tsx` (route/page, modify in place)

**Analog:** itself — read in full (157 lines)

**Integration point** (lines 46-70, 108):
```typescript
const u = session.user as { id: string; email: string; displayName?: string | null; name?: string | null };
...
const [countThisMonthVal, countTotalVal, countDraftsVal, recentList, relanceRows] =
  await Promise.all([
    countThisMonth(userId),
    countTotal(userId),
    countDrafts(userId),
    buildListResponse({ userId, limit: 5 }),
    listRelationshipsNeedingFollowUp(userId, 5),
  ]);
...
const nowMs = await getNowMs();
...
<RelanceCard rows={relanceRows} lang={lang} nowMs={nowMs} />
```
Required changes:
1. `const { session, role } = await requireUser();` — `role` is already returned by `requireUser()`
   (`src/lib/auth/require.ts` `RequireUserResult`), so **no new auth call is needed** (UI-SPEC
   confirms this explicitly). Currently `page.tsx` destructures only `{ session }` (line 36) —
   change to `{ session, role }`.
2. Compute `const isAdmin = role === 'admin';` before the `Promise.all`.
3. Fold the 2-3 new momentum queries into the SAME `Promise.all`, but **only when `!isAdmin`** —
   UI-SPEC's Access & Non-Leakage point 2 is explicit that an admin's request must never even
   resolve the momentum/streak/badge queries (not "resolve them and hide the result"). Pattern:
   conditionally build the array or branch before the `Promise.all` call — e.g.
   `const momentumData = isAdmin ? null : await Promise.all([...momentum queries...]);` folded
   into the same overall `Promise.all` structure as far as practical, or a second `Promise.all`
   gated by `!isAdmin`. Either is acceptable; what's non-negotiable is the query calls never fire
   for an admin session.
4. Insert `{!isAdmin && <MomentumCard lang={lang} nowMs={nowMs} ... />}` immediately after
   `<RelanceCard rows={relanceRows} lang={lang} nowMs={nowMs} />` (line 108) and before the
   recent-proposals block (line 110) — per UI-SPEC Assumption A-1 and CONTEXT D-17.
5. `Card`, `CardContent`, `CardHeader`, `CardTitle` are already imported (line 10) — no new import
   needed in `page.tsx` itself.

---

### `src/lib/db/queries/momentum.ts` (new query module, CRUD/aggregate)

**Analogs:**
- `src/lib/db/queries/relationship-events.ts` — `listRelationshipsNeedingFollowUp` (owner-scoped
  aggregate over a time window) and `listRelationshipEvents` (owner-in-same-statement join pattern).
- `src/lib/db/queries/pipeline.ts` — `getConversionRateForOwner` (owner-scoped `COUNT(*) FILTER`
  aggregate — the closest shape to a badge-tier count).

**File-level doc-comment contract** (relationship-events.ts lines 1-40) — copy this discipline
verbatim, adapted:
```typescript
import 'server-only';
/**
 * Phase 35 — the owner-scoped momentum/streak/badge read layer (GAME-01..05, CRM-02).
 *
 * CRM-02 CONTRACT: every exported function in this module takes an `ownerId`
 * that is a REQUIRED, non-optional, non-defaulted parameter, compiled directly
 * into the WHERE clause of the SQL statement the function issues. No function
 * accepts an "all owners" flag or a pre-checked boolean.
 *
 * D-03/D-07: everything here is DERIVED from `relationship_events` at READ
 * TIME. No write path exists in this module. No badge, streak, or momentum
 * row is ever persisted — recomputed from the event log on every call.
 *
 * NO ADMIN PATH — an admin is never expected to call this module at all
 * (D-15); the page checks role BEFORE calling anything here, unlike
 * `listRelationshipsNeedingFollowUp`'s "admin gets []" fallback, because an
 * admin's genuinely-empty result here is indistinguishable from a real
 * partner's zero-history zero state (UI-SPEC Access & Non-Leakage point 2).
 */
```

**Owner-in-same-statement join pattern** (relationship-events.ts lines 70-101,
`listRelationshipEvents`):
```typescript
.from(schema.relationshipEvents)
.innerJoin(schema.clientRelationships, eq(schema.clientRelationships.id, schema.relationshipEvents.clientRelationshipId))
.where(and(
  eq(schema.relationshipEvents.clientRelationshipId, relationshipId), // (per-relationship call only)
  eq(schema.clientRelationships.ownerId, ownerId),
))
```
For a book-wide aggregate (no single `relationshipId`), drop the first predicate and keep only
`eq(schema.clientRelationships.ownerId, ownerId)` — same join shape
`listRelationshipsNeedingFollowUp` (lines 274-293) uses for its book-wide query: inner-join
`relationship_events` → `client_relationships`, `ownerId` as the first, always-present `and(...)`
predicate. **Never** issue a bare `relationship_events` query filtered only by `client_relationship_id`
without also joining back to `client_relationships` for the owner check in the SAME statement — that
is the exact TOCTOU/pre-check pattern the header comments in both analogs forbid.

**Aggregate-count-with-FILTER pattern** (pipeline.ts lines 152-175, `getConversionRateForOwner`):
```typescript
const rows = await dbi
  .select({
    won: sql<number>`COUNT(*) FILTER (WHERE ${schema.proposals.outcome} = 'won')`,
    total: sql<number>`COUNT(*)`,
  })
  .from(schema.proposals)
  .where(and(eq(schema.proposals.userId, ownerId), /* ...locked predicates... */));

const won = Number(rows[0]?.won ?? 0);
const total = Number(rows[0]?.total ?? 0);
```
Reuse this exact `COUNT(*) FILTER (WHERE ...)` idiom for badge-tier counts — e.g. distinct clients
with a qualifying event, distinct won proposals — and the `Number(rows[0]?.x ?? 0)` coercion
pattern for every aggregate result (Postgres returns bigint-as-string via the driver; every analog
in this codebase re-coerces with `Number(...)`).

**Payload shape reference (for movement rows and badge derivation)** — confirmed by reading the
write sites in `src/lib/pipeline/actions.ts` and `app/api/proposals/finalize/route.ts`:
- `kind = 'stage_changed'`, `payload = { fromStage: PipelineStage | null, toStage: PipelineStage }`
  (`actions.ts` line 150). Forward vs. backward is determined by comparing each stage's index in
  `PIPELINE_STAGES` (`src/lib/pipeline/stages.ts`) — `toStage` index > `fromStage` index is forward;
  `toStage === 'perdu'` or a lower index is backward/no-count (D-11). `fromStage === null` (a
  relationship's first-ever stage write) has no prior stage to compare against — treat as forward
  (there is no "backward" without an origin) unless UI-SPEC's discretion note says otherwise.
- `kind = 'proposal_finalized'`, `payload = { proposalId, lcRef }` (`finalize/route.ts` line 123).
  Counts toward progress unconditionally (D-01: "a finalized proposal" always counts).
- `kind = 'outcome_set'`, `payload = { proposalId, outcome: 'won' | 'lost', outcomeDate }`
  (`actions.ts`, `markProposalWonAction`/lost equivalent). The **Wins** badge axis counts DISTINCT
  `payload->>'proposalId'` where `kind = 'outcome_set' AND payload->>'outcome' = 'won'` — this is a
  jsonb text-extraction filter in the WHERE, same pattern as `getConversionRateForOwner`'s
  `FILTER (WHERE ... = 'won')` but on a jsonb field: use `sql`${schema.relationshipEvents.payload}->>'outcome' = 'won'``.
- Client-count badge axis: distinct `client_relationship_id` where `kind IN ('stage_changed', 'proposal_finalized')`
  AND (for `stage_changed`) the move was forward, per `RELATIONSHIP_EVENT_KINDS` /
  `src/lib/relationship/kinds.ts`.

**Index note** (relationship-events.ts line 67, `relationship_events_relationship_id_occurred_at_idx`):
already exists and is composite on `(client_relationship_id, occurred_at)`. A book-wide query
filtering by `client_relationships.owner_id` and `relationship_events.occurred_at` (for the weekly
window) does NOT hit this index directly (it's per-relationship, not per-owner) — UI-SPEC leaves
"whether the weekly window scan needs an index beyond" this one as Claude's Discretion. Given the
low current event volume (D-14: near-zero rows in production) an additional index is very likely
unnecessary for this phase; flag as a discretion call in the plan rather than adding a migration
(which would also violate D-23).

**Result shape convention** — every analog returns a plain interface, never a Drizzle row type,
and maps `rows.map((r) => ({ ...explicit fields... }))` rather than passing the raw select result
through (`listRelationshipsNeedingFollowUp` lines 296-306, `listRelationshipEvents` lines 103-111).
Follow this for `MomentumRow`, `BadgeAxisProgress`, and the streak-computation return value.

---

### `src/lib/db/queries/momentum.test.ts` (unit test, mocked driver)

**Analog:** `src/lib/db/queries/pipeline.test.ts` (mocking harness read at lines 1-40; additional
`describe` blocks at 137-278 not fully re-read, but the harness pattern is fully captured)

**Mocking harness pattern** (pipeline.test.ts lines 1-40):
```typescript
vi.mock('server-only', () => ({}));
interface MockState { selectResult: unknown[]; }
const { mockState } = vi.hoisted(() => ({ mockState: { selectResult: [] } as MockState }));
const calls: Array<{ kind: string; payload: unknown }> = [];
vi.mock('@/lib/db', async () => {
  const real = await vi.importActual<typeof import('@/db/schema')>('@/db/schema');
  const stubBuilder: Record<string, unknown> = {};
  Object.assign(stubBuilder, {
    select: (cols: unknown) => { calls.push({ kind: 'select', payload: cols }); return stubBuilder; },
    // ...chainable .from/.innerJoin/.where/.orderBy/.limit, each recording into `calls`,
    // resolving via `.then` at any point in the chain with `mockState.selectResult`
  });
  return { db: () => stubBuilder, schema: real };
});
```
Reuse this exact harness. Assert (a) the WHERE clause is COMPOSED with the owner predicate
(`calls` inspection — this is what a mocked test CAN prove), and (b) the aggregate math
(won/total/pct-style rounding) against a fabricated `mockState.selectResult`. Do NOT claim this
proves isolation — see the integration test note below and the file's own header comment
discipline (pipeline.test.ts lines 1-12) explicitly says so.

**Source-guard pattern** (implied by `pipeline.test.ts`'s "ADMIN-09 — no commission/params_snapshot
in this module (source guard)" and "no admin path" describe blocks, lines 247-263): add an
equivalent guard test asserting the compiled `momentum.ts` module source never references
`requireAdmin`, an "all owners" flag, or a raw string literal bypass — grep the compiled/source
text, same technique those two blocks use.

---

### `src/lib/db/queries/momentum.isolation.integration.test.ts` (integration test, real Postgres)

**Analog:** `src/lib/db/queries/client-relationships.isolation.integration.test.ts` (full file
read, 899 lines — both describe blocks captured)

**Why this is mandatory, not optional, for this phase** — this repo's own established rule
(confirmed by the analog's header comment, lines 1-43, and repeated by the Phase 34 security
audit referenced in it): **every unit test in this repo mocks the DB driver**, so a mocked test
proves a WHERE clause was COMPOSED, never that a JOIN actually FILTERS. Two real production
defects shipped this exact way. A new owner-scoped aggregate over a week window (this phase's
`momentum.ts`) is explicitly named in the CONTEXT/spec as "a strong candidate for that treatment."

**Skip-by-default gate pattern** (lines 44-77):
```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';

vi.mock('server-only', () => ({}));

const { /* functions under test */ } = await import('./momentum');
const { __resetDbForTests } = await import('@/lib/db');

const DATABASE_URL_TEST = process.env.DATABASE_URL_TEST;
const shouldRun = !!DATABASE_URL_TEST;
if (!shouldRun) {
  console.log('[integration] DATABASE_URL_TEST not set — skipping ... Set it (and DATABASE_URL, to the same value) to your dev/preview DB to run.');
}

describe.skipIf(!shouldRun)('momentum — owner isolation and week-window correctness (real Postgres)', () => {
  let sql: ReturnType<typeof postgres>;
  beforeAll(async () => {
    sql = postgres(DATABASE_URL_TEST!, { max: 1, prepare: false, onnotice: () => {} });
    __resetDbForTests();
    // seed two partner users (A, B), a company + relationship each, and
    // relationship_events rows (stage_changed / proposal_finalized / outcome_set)
    // dated inside and outside the current Mon–Sun window, per the raw `postgres`
    // client (never the app's own query module) — same as the isolation analog.
  });
  afterAll(async () => {
    // FK-safe teardown order: relationship_events -> client_relationships -> companies -> users.
    await sql.end({ timeout: 5 });
  });
  // ...
});
```
This is the extendable pattern actually used in production: the SAME file already carries a SECOND
independent `describe.skipIf` block for Phase 33's pipeline invariants (lines 442-898), added
per that phase's own "extend it rather than writing a parallel one" instruction, with its own
`runId`-scoped fixtures and its own `afterAll`. **Planner's choice**: either add a third
`describe.skipIf` block to this same file (consistent with the established "one shared isolation
file" convention), or start a new `momentum.isolation.integration.test.ts` sibling file using the
identical skeleton — both are consistent with house style; the existing file is getting large
(899 lines) which may argue for a new sibling file this time.

**Mutation-verified assertion style to copy** (lines 335-374, "THE HEADLINE CLAIM"): pair a
positive assertion (owner sees their own data) with a negative assertion via
`JSON.stringify(result).not.toContain(OTHER_OWNER_PRIVATE_VALUE)` — this catches a leak through
a field the enumerated assertions didn't name. Apply this to a momentum/badge result: assert B's
result contains none of A's company names or event bodies, not just that specific fields are null.

**Indistinguishability assertion style to copy** (lines 272-278, 386-399): a nonexistent id and a
not-owned id must produce byte-identical results (`toStrictEqual`) — apply this to the "admin sees
nothing" boundary if any function in `momentum.ts` is ever called with a non-owner id, though per
D-15 the page-level gate means this may not be directly exercisable — cover it defensively anyway
(calling the query function directly with an admin's id, bypassing the page gate, must still
degrade to a safe empty answer, not throw or leak).

---

### `src/lib/i18n/dictionaries.ts` (modify — add `dashboard.momentum.*`)

**Analog:** itself — `dashboard.relance.*` (fr block lines 1259-1264, en block lines 2407-2412)
and `dashboard.recent.*` (fr lines 311, 318-325; en lines 1550, 1560-1561)

**Exact insertion pattern** (fr block, dashboard.relance, lines 1259-1264):
```typescript
'dashboard.relance.title': 'À relancer',
'dashboard.relance.empty': 'Aucune relance prévue.',
'dashboard.relance.viewAll': 'Voir tous mes clients',
'dashboard.relance.due': 'Le {0}',
'dashboard.relance.overdue': 'En retard',
'dashboard.relance.stale': 'Sans activité depuis {0} jour(s)',
```
And its EN mirror (lines 2407-2412):
```typescript
'dashboard.relance.title': 'To follow up',
'dashboard.relance.empty': 'No follow-ups scheduled.',
'dashboard.relance.viewAll': 'View all my clients',
'dashboard.relance.due': 'On {0}',
'dashboard.relance.overdue': 'Overdue',
'dashboard.relance.stale': 'No activity for {0} day(s)',
```
Add the full `dashboard.momentum.*` key set (enumerated in `35-UI-SPEC.md` § i18n Key Plan, 19 keys)
as flat `'dashboard.momentum.xxx': '...'` string-literal entries in BOTH the `fr` object (near the
existing `dashboard.relance.*` / `dashboard.recent.*` block, ~line 1259) and the `en` object (~line
2407). **Every value is a plain string literal with `{0}`/`{1}`/`{2}` placeholders** — never a
template literal — per the file's own header discipline (lines 12-16) and the `_EnHasAllFrKeys`
compile-time check (lines 2435-2437), which fails the build if any FR key is missing from EN. Do
NOT re-declare `pipeline.stage.*` keys — a movement row interpolates the EXISTING
`pipeline.stage.*` keys (fr lines 1098-1104, en lines 2273-2279) for the stage label fragment, per
UI-SPEC's explicit instruction.

**The "(s)" pluralization convention** (already shipped, per UI-SPEC's own citation) — reuse the
identical shorthand rather than inventing real plural-rule branching: `'{0} client(s)'`,
`'{0} semaine(s)'`, `'{0} victoire(s)'`.

---

## Shared Patterns

### Owner predicate in the same statement (CRM-02)
**Source:** `src/lib/db/queries/relationship-events.ts` (`listRelationshipEvents`,
`listRelationshipsNeedingFollowUp`), `src/lib/db/queries/pipeline.ts` (`getConversionRateForOwner`,
`listPipelineBoard`)
**Apply to:** every function in the new `momentum.ts` module.
```typescript
.where(and(
  eq(schema.clientRelationships.ownerId, ownerId), // ALWAYS first, always present, never optional
  /* ...other predicates... */
))
```
Never a pre-check SELECT followed by a filtered second query. `ownerId` is a required,
non-optional, non-defaulted TypeScript parameter on every export — enforced at compile time, and
mutation-tested at runtime by the isolation integration suite.

### "Now" resolved once, server-side, never in render
**Source:** `app/(authed)/page.tsx` lines 22-30 (`getNowMs`), consumed by `RelanceCard` via
`nowMs` prop.
**Apply to:** `MomentumCard` (via `nowMs` prop, already in its UI-SPEC interface) and `momentum.ts`
(the week-boundary/streak computation should accept `nowMs` as a parameter, not call `Date.now()`
or `new Date()` internally) — this is `react-hooks/purity`-driven in the component, and testability
/ determinism-driven in the query layer.

### No-admin-path / role-gate BEFORE query, not after
**Source:** `src/lib/auth/require.ts` `requireUser()` returns `{ session, role }`; UI-SPEC's Access
& Non-Leakage point 2 explicitly contrasts this with `RelanceCard`'s "query first, render null on
empty" pattern (acceptable there because empty IS the correct admin answer; NOT acceptable here
because an admin's non-render must be indistinguishable from "no such feature" rather than
collapsing into the partner zero-state UI).
**Apply to:** `app/(authed)/page.tsx` only — `momentum.ts` and `MomentumCard.tsx` themselves carry
no role branch; the gate is entirely at the call site.

### Dictionary interpolation via `.replace('{0}', …)` at the call site
**Source:** `RelanceCard.tsx` `statusLabel()`, lines 80-94.
**Apply to:** every dynamic `dashboard.momentum.*` string in `MomentumCard.tsx`.

### Aggregate coercion (`Number(rows[0]?.x ?? 0)`)
**Source:** `pipeline.ts` `getConversionRateForOwner`, lines 170-172; `listRelationshipsNeedingFollowUp`
line 304 (`bucket: Number(r.bucket)`).
**Apply to:** every count/aggregate value read out of `momentum.ts`'s SQL results — the Postgres
driver returns aggregate bigints as strings.

### Integration test skip-by-default gate
**Source:** `client-relationships.isolation.integration.test.ts` lines 44-77 and 442-462.
**Apply to:** the new momentum integration test — `DATABASE_URL_TEST` unset ⇒ entire `describe`
skips, CI stays green with no env var, raw `postgres` client for seeding/cleanup (never the app's
own query functions), `vi.mock('server-only', () => ({}))`, `__resetDbForTests()` in `beforeAll`.

---

## No Analog Found

None. Every file this phase touches has a direct, strong analog already in the codebase — this
phase is explicitly framed in `35-CONTEXT.md` as reusing `RelanceCard`'s shape, `page.tsx`'s
integration point, and the Phase 34 event-query layer rather than introducing a new pattern family.

---

## Metadata

**Analog search scope:** `app/(authed)/`, `app/(authed)/_components/`, `src/lib/db/queries/`,
`src/lib/relationship/`, `src/lib/pipeline/`, `src/lib/auth/`, `src/lib/i18n/`, `src/components/ui/`.
**Files read in full or targeted sections:** `RelanceCard.tsx`, `RelanceCard.test.tsx`, `page.tsx`,
`relationship-events.ts`, `kinds.ts`, `pipeline.ts` (getConversionRateForOwner + header comment),
`pipeline.test.ts` (mocking harness + describe index), `client-relationships.isolation.integration.test.ts`
(full, both describe blocks), `require.ts` (requireUser), `stages.ts`, `dictionaries.ts` (header +
dashboard.relance/recent blocks + parity-check footer), `pipeline/actions.ts` (stage_changed /
outcome_set payload write sites), `api/proposals/finalize/route.ts` (proposal_finalized payload
write site), `MetricTile.tsx` (label className precedent), `icons.tsx` (CheckCircleIcon export),
project `CLAUDE.md`.
**Pattern extraction date:** 2026-09-05.
