---
phase: 33-pipeline
reviewed: 2026-09-03T00:00:00Z
depth: standard
files_reviewed: 43
files_reviewed_list:
  - app/(authed)/clients/ClientsGrid.tsx
  - app/(authed)/clients/CreateClientDialog.tsx
  - app/(authed)/clients/[id]/MarkLostDialog.tsx
  - app/(authed)/clients/[id]/MarkWonDialog.tsx
  - app/(authed)/clients/[id]/ProposalOutcomeControl.tsx
  - app/(authed)/clients/[id]/page.tsx
  - app/(authed)/page.tsx
  - app/(authed)/pipeline/PipelineBoard.tsx
  - app/(authed)/pipeline/PipelineCard.tsx
  - app/(authed)/pipeline/PipelineColumnHeader.tsx
  - app/(authed)/pipeline/PipelineMobileList.tsx
  - app/(authed)/pipeline/page.tsx
  - app/(authed)/proposals/new/_components/RecapSection.tsx
  - app/(authed)/proposals/new/_components/WizardActionBar.tsx
  - app/(authed)/proposals/new/_components/WizardCard.tsx
  - app/(authed)/proposals/new/calcul/page.tsx
  - app/(authed)/proposals/new/parametres/ParametresFormCard.tsx
  - app/(authed)/proposals/new/parametres/WizardStep1Wiring.tsx
  - app/(authed)/proposals/new/parametres/page.tsx
  - app/(authed)/proposals/new/verification/page.tsx
  - app/globals.css
  - drizzle/0009_phase33_pipeline.sql
  - scripts/seed-pipeline-fixtures.ts
  - src/components/proposals/ProposalListFrame.tsx
  - src/components/proposals/ProposalRow.tsx
  - src/components/proposals/ProposalsList.tsx
  - src/components/ui/AppSidebar.tsx
  - src/components/ui/Stepper.tsx
  - src/db/schema.ts
  - src/lib/calc/schema.ts
  - src/lib/crm/schemas.ts
  - src/lib/db/queries/audit-log.ts
  - src/lib/db/queries/client-relationships.ts
  - src/lib/db/queries/companies.ts
  - src/lib/db/queries/index.ts
  - src/lib/db/queries/pipeline.ts
  - src/lib/db/queries/proposals.ts
  - src/lib/i18n/dictionaries.ts
  - src/lib/pipeline/actions.ts
  - src/lib/pipeline/constants.ts
  - src/lib/pipeline/format.ts
  - src/lib/pipeline/schemas.ts
  - src/lib/pipeline/stages.ts
  - src/lib/route-meta.ts
findings:
  critical: 5
  warning: 16
  info: 10
  total: 31
status: partially_remediated
---

# Phase 33: Code Review Report

**Reviewed:** 2026-09-03
**Depth:** standard
**Files Reviewed:** 43 (+ `drizzle/0009_phase33_pipeline.sql`, read as the DB half of D-07)
**Status:** issues_found

## Remediation status (2026-09-03)

| Finding | Status |
|---|---|
| CR-01 D-08's SIREN gate dead in production | **fixed** — `8b58470`, plus `tests/server-action-error-contracts.test.ts` as the recurrence guard |
| CR-02 `--remove` guard always aborted | **fixed** — `8b58470` |
| CR-03 `unanswered` fixture unreachable | **fixed** — `8b58470` |
| CR-04 outcome on a draft | **fixed** — `8b58470` |
| CR-05 `--remove` could destroy real data | **fixed** — `8b58470` |
| WR-01 reserved-lane refusal unreachable | **fixed** — `52d03e1` |
| WR-02 arrow + keyboard drag double-write | **fixed** — `52d03e1` |
| WR-03..WR-16 (14 findings), IN-01..IN-10 | **open, unclaimed** |

Steps 3, 10 and 14 of the 33-09 acceptance walkthrough were re-walked after the
fixes and pass. See `33-09-SUMMARY.md` § "Post-Review Re-Verification".

## Summary

The four things the review brief singled out come back mixed.

**Owner scoping holds.** Every exported function in `src/lib/db/queries/pipeline.ts` takes a
required `ownerId` compiled into its own WHERE; `/pipeline/page.tsx` sources it from
`session.user.id` only, reads no `searchParams`, and the auth gate is the first await in all three
server actions and both pages. No admin bypass, no cross-partner aggregate. One defence-in-depth
gap remains (WR-06).

**The stage-write path holds.** `client_relationships.stage` is written from exactly one statement
(`actions.ts:91`), reached from exactly two call sites, both going through `handleKanbanMove` /
`handleMobileStageChange`. `advanceStageSchema` derives its enum from `PARTNER_SETTABLE_STAGES`,
so `'signe'`/`'debloque'` are unreachable at parse time, and the seed script honours the same
restriction. D-04 is intact.

**The SIREN change mostly holds** — `createClientSchema` normalises then refines on `^[0-9]{9}$`,
and `finalize-wizard.ts` re-parses `proposalInputSchema` server-side — but `requiredSirenSchema`
in `src/lib/calc/schema.ts` is materially looser than its `crm/schemas.ts` sibling and admits
interleaved junk (WR-15).

**The seed script does not hold.** Its `--remove` guard is built on a SQL operator that means the
opposite of what was intended, so the revert path aborts unconditionally (CR-02); once that is
fixed, the delete underneath it can take real data with it (CR-05); and the fixture built to
exercise D-06's derived `unanswered` state cannot ever reach that state (CR-03).

The most consequential finding is CR-01: D-08's entire inline SIREN gate is dead in a production
build, because it depends on a server-action error *message* crossing the RSC boundary — which
Next.js deliberately redacts. Every test that covers it mocks the action module, so the suite is
structurally incapable of catching it. This is the same class of failure recorded in
`.planning` history as "unit tests pass but production fails".

---

## Critical Issues

### CR-01: D-08's inline SIREN gate is unreachable in a production build

**File:** `app/(authed)/clients/[id]/MarkWonDialog.tsx:102-108`, `src/lib/pipeline/actions.ts:262,304`
**Issue:** The gate depends on the client comparing a thrown server-action error's `.message`
against the `SIREN_REQUIRED` sentinel:

```ts
} catch (e) {
  if (e instanceof Error && e.message === SIREN_REQUIRED) {
    setSirenRequired(true);
    return;
  }
```

Next.js does not send server-action error messages to the client in production. An uncaught
rejection from a Server Function is serialised with a `digest` and a fixed generic message
("An error occurred in the Server Components render. The specific message is omitted in
production builds…"). `next.config.ts` contains no error-serialisation customisation, and Next is
pinned at `16.2.4`. Consequently `e.message === SIREN_REQUIRED` is always false in production, the
dialog falls through to `toast.error(t('pipeline.toast.error'))`, and the partner is given a
generic failure with **no way to supply the SIREN** — the exact dead-end D-08 was written to
prevent. `BOUNDED_ERROR` comparisons in the same file are unaffected because every client caller
of those actions uses a bare `catch` (`PipelineBoard.tsx:195`, `MarkLostDialog.tsx:66`).

The three tests that cover this path (`MarkWonDialog.test.tsx:96`, `ProposalOutcomeControl.test.tsx:31`,
`actions.test.ts:263`) all `vi.mock` the action module and reject with a real `Error`, so they
exercise the in-process throw and never cross the serialisation boundary. Passing tests are not
evidence here.

**Fix:** Return a discriminated result instead of throwing for the one recoverable failure class.
Throwing stays correct for the unrecoverable ones.

```ts
// src/lib/pipeline/actions.ts
export type MarkWonResult = { ok: true } | { ok: false; reason: 'siren_required' };

export async function markProposalWonAction(raw: unknown): Promise<MarkWonResult> {
  const { session } = await requireRelationshipHolder();
  try {
    // …
    if (gateRow[0].siren === null) {
      return { ok: false, reason: 'siren_required' };  // survives serialisation
    }
    // …
    return { ok: true };
  } catch (e) { /* … still throws BOUNDED_ERROR */ }
}
```

```tsx
// MarkWonDialog.tsx
const res = await markProposalWonAction({ /* … */ });
if (!res.ok) { setSirenRequired(true); return; }
```

Then add one integration-level test that does **not** mock the action module, or the same defect
recurs. `src/lib/pipeline/constants.ts` can be deleted along with the sentinel.

---

### CR-02: `--remove`'s contact guard uses `<> ANY(...)`, which is always true — the revert path can never run

**File:** `scripts/seed-pipeline-fixtures.ts:283-296`
**Issue:**

```sql
where (co.siren = any(${FIXTURE_SIRENS}) or co.name = any(${FIXTURE_SIRENLESS_NAMES}))
  and c.name <> any(${FIXTURES.map((f) => f.contactName)})
```

In PostgreSQL, `x <> ANY (array)` is true when `x` differs from **at least one** element, not from
all of them. `FIXTURES` yields nine distinct contact names, so for any contact whatsoever
(including the script's own `'Hélène Verrier'`) the predicate is true. `handEntered[0].n` is
therefore ≥ 1 the moment the seeder has run once, and `--remove` always exits with
"hand-entered contact(s) live on fixture relationships. Refusing to revert."

The documented revert workflow (`--remove`, advertised in the module header at lines 30-31 and in
`package.json`) does not work at all, and the guard it was supposed to implement — detect
hand-added contacts — is not implemented.

**Fix:** Use `<> ALL` (or negate the `= ANY`):

```sql
and c.name <> all(${FIXTURES.map((f) => f.contactName)})
```

Add a regression assertion: seed, then `--remove --dry-run`, and require `n === 0`.

---

### CR-03: seeded proposals never set `pdf_generated_at`, so the `unanswered` fixture cannot reach `unanswered`

**File:** `scripts/seed-pipeline-fixtures.ts:455-465`; `src/lib/db/queries/proposals.ts:944`
**Issue:** The insert lists `… inputs, params_snapshot, computed, client_relationship_id,
created_at` and nothing else. `pdf_generated_at` is left NULL, and `ageDays` is applied to
`created_at`, which no derivation reads.

`deriveProposalOutcome` short-circuits on exactly that column:

```ts
if (row.outcome === 'won' || row.outcome === 'lost') return row.outcome;
if (row.pdfGeneratedAt == null) return null;      // ← always taken for every seeded row
```

Fixture `08a` exists solely to prove step 14 ("past validity, no outcome: 'Sans réponse'") with
`validityDays: 15, ageDays: 40`. It will render `outcome === null` — no badge — forever.
`deriveDisplayStatus` (`proposals.ts:900`) takes the same NULL branch and returns `'active'`, so
no seeded row can ever read as `expired` either. Every seeded row is also written with
`status = 'active'` while carrying NULL PDF columns, which is a state the finalize path never
produces.

**Fix:** Set the PDF columns the derivations actually read, and drive the age off
`pdf_generated_at`:

```sql
insert into proposals
  (user_id, status, language, lc_ref, idempotency_key, schema_version,
   inputs, params_snapshot, computed, client_relationship_id,
   created_at, pdf_generated_at, pdf_blob_key, pdf_sha256, pdf_size_bytes)
values
  (…, ${daysAgo(p.ageDays)}, ${daysAgo(p.ageDays)},
   ${'seed/' + idem + '.pdf'}, ${'0'.repeat(64)}, 1024)
```

---

### CR-04: an outcome can be recorded on a **draft** proposal — no lifecycle guard in either write

**File:** `src/lib/pipeline/actions.ts:140-151` and `275-287`; `app/(authed)/clients/[id]/page.tsx:156-169`
**Issue:** Neither outcome UPDATE constrains `proposals.status`:

```ts
.where(and(
  eq(schema.proposals.id, input.proposalId),
  eq(schema.proposals.userId, session.user.id),
))
```

and `/clients/[id]` renders `ProposalOutcomeControl` for **every** row returned by
`listProposalsForRelationship`, which includes `status = 'draft'` (it filters only
`ne(status, 'deleted')`, `client-relationships.ts:415`). A draft started from the client page
carries `client_relationship_id`, so the D-07 trigger passes too if the company has a SIREN.

Result: a partner can mark an unfinalised draft `won`. The row then

- renders a green "Gagné" badge on a draft (`ProposalOutcomeControl.tsx:68`), and
- is silently excluded from **both** sides of the conversion rate, because
  `getConversionRateForOwner` (`pipeline.ts:155-162`) requires `status = 'active'` —
  which is the query's own documented rationale ("Drafts are excluded (not quotes yet)").

The board's headline metric and the row badge disagree about the same proposal, and there is no
path to undo the stored outcome.

**Fix:** Add the lifecycle predicate to both mutations and hide the control for drafts.

```ts
.where(and(
  eq(schema.proposals.id, input.proposalId),
  eq(schema.proposals.userId, session.user.id),
  eq(schema.proposals.status, 'active'),          // ← add to BOTH actions
  isNull(schema.proposals.deletedAt),
))
```

```tsx
// app/(authed)/clients/[id]/page.tsx
actionsSlot={
  row.displayStatus === 'draft' ? null : (
    <ProposalOutcomeControl proposalId={row.id} outcome={outcomes.get(row.id) ?? null} lang={lang} />
  )
}
```

Consider mirroring the invariant in the DB, alongside `proposals_outcome_completeness_check`:
`outcome IS NULL OR status <> 'draft'`.

---

### CR-05: `--remove` deletes every relationship on a fixture company regardless of owner, and matches one fixture by company **name**

**File:** `scripts/seed-pipeline-fixtures.ts:314-328` (and `236`, `395-397`)
**Issue:** Two compounding problems in the delete, currently masked by CR-02 and live the moment
CR-02 is fixed.

1. The relationship delete is scoped to the **company**, not to the seeded owners:
   ```sql
   delete from client_relationships r using companies co
   where co.id = r.company_id
     and (co.siren = any(${FIXTURE_SIRENS}) or co.name = any(${FIXTURE_SIRENLESS_NAMES}))
   ```
   Any relationship a third partner has since created against a fixture company is deleted, and
   `contacts.client_relationship_id` has `onDelete: 'cascade'` (`schema.ts:467`), so that
   partner's contacts go with it. The reassuring comment on line 322 ("never one another partner
   has since attached to") describes only the *companies* delete two statements later.

2. The SIREN-less fixture is identified by exact company name (`'Pépinières Vaugelas'`). Company
   name is not unique — `companies.name` has no unique index, only the generated
   `name_normalized` for matching. A real company entered under that name is selected by the
   `select`/`insert` path (line 396) and destroyed by the delete path.

**Fix:** Scope the revert to the two seeded owners, and identify the SIREN-less fixture by the id
recorded at insert time rather than by name.

```sql
delete from client_relationships r
using companies co
where co.id = r.company_id
  and r.owner_id = any(${[ownerIds.partnerA, ownerIds.partnerB]})
  and (co.siren = any(${FIXTURE_SIRENS}) or co.name = any(${FIXTURE_SIRENLESS_NAMES}))
returning r.id
```

For the name-matched company, refuse to touch a row whose `created_at` predates the first fixture
run, or give the SIREN-less fixture a reserved-range SIREN and delete the "no SIREN" state with a
targeted `UPDATE … SET siren = NULL` instead.

---

## Warnings

### WR-01: the reserved-lane drop-refusal toast (D-09.1 layer 3) is unreachable

**File:** `app/(authed)/pipeline/PipelineBoard.tsx:169-172` and `312`
**Issue:** `<KanbanColumn value={stage} disabled={reserved}>` forwards `disabled` straight into
`useSortable({ id: value, disabled })` (`src/components/reui/kanban.tsx:645-653`). dnd-kit's
`useSortable` disables the **droppable** as well as the draggable, so a reserved lane is not a
collision target. Reserved lanes also render no `KanbanColumnContent` (`PipelineBoard.tsx:322-328`),
so there is no inner droppable either. A drag released over `Signé` therefore produces `over ===
null`, `handleDragEnd` returns at `kanban.tsx:443` and `onMove` is never invoked — so
`handleKanbanMove`'s `isReservedStage(overContainer)` branch, and its explanatory toast, never run.

The card silently snaps back, which D-09.1 explicitly calls out as worse than a lane that reads as
unreachable. The branch is also untestable through a real drag; only the exported function's
direct unit test covers it.

**Fix:** Keep the lane droppable and refuse at drop time, e.g.
`disabled={{ draggable: true, droppable: false }}` if the vendored primitive is widened to accept
dnd-kit's object form, or drop `disabled` on the column and rely on `handleKanbanMove`'s existing
refusal branch (layers 1 and 2 already provide the visual muting and the drag-time ring).

### WR-02: the ArrowLeft/ArrowRight handler double-fires with dnd-kit's `KeyboardSensor`

**File:** `app/(authed)/pipeline/PipelineBoard.tsx:264-270`, `276-282`
**Issue:** `KanbanItem` is composed as `render={<KanbanItemHandle cursor />}` precisely so
dnd-kit's activator `listeners` (which include `onKeyDown`) land on the same DOM node as the
component's own `onKeyDown`. `mergeProps` composes both. Once a keyboard drag is active
(Space on the card), an ArrowRight fires **both** dnd-kit's drag-move **and**
`moveByKeyboard` → `handleKanbanMove` → `advanceRelationshipStageAction`. Committing the drag with
Space then fires `onMove` a second time, from indices computed against the pre-move `columns`
closure. Net effect: two `relationship.stage_change` audit rows and a final stage the partner did
not choose. The `event.target !== event.currentTarget` guard on line 265 does not help — during a
keyboard drag the card itself is the focused element.

**Fix:** Gate the direct-arrow path on there being no active drag:

```tsx
const onItemKeyDown = (row, stage) => (event: React.KeyboardEvent<HTMLDivElement>) => {
  if (event.target !== event.currentTarget) return;
  if (event.currentTarget.dataset.dragging === 'true') return;  // dnd-kit owns the arrows
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { /* … */ }
};
```

### WR-03: an audit-log failure after a committed mutation reports failure and rolls the UI back

**File:** `src/lib/pipeline/actions.ts:104-120`, `157-176`, `293-310`
**Issue:** There are no transactions (Neon HTTP). `writeAuditLog` runs *after* the UPDATE has
already committed. If the audit insert fails, the outer catch converts it to `BOUNDED_ERROR`, the
client rolls the optimistic move back (`PipelineBoard.tsx:196`) or shows the generic outcome error
— while the database holds the new stage/outcome. The partner sees a failure, retries, and (for
the outcome actions) may open a second dialog against a proposal that is already `won`.

**Fix:** Do not let a best-effort audit write fail the action:

```ts
try {
  await writeAuditLog({ /* … */ });
} catch (auditErr) {
  console.error('[advanceRelationshipStageAction] audit write failed (mutation committed):', auditErr);
}
revalidatePath('/pipeline');
```

### WR-04: an invalid outcome date renders an empty `role="alert"` error

**File:** `app/(authed)/clients/[id]/MarkWonDialog.tsx:147-151`; `MarkLostDialog.tsx:101-105`;
`src/lib/pipeline/schemas.ts:48`
**Issue:** `date: z.coerce.date()` carries no `message`, so a blank/unparseable date fails with
zod's own English default. That string is then passed through `t(errors.date.message as DictKey,
lang)`, and `t` is `dictionaries[lang][key] ?? dictionaries.fr[key]`
(`dictionaries.ts:2192-2194`) — both undefined for a non-key. `FieldError` renders nothing. The
form refuses to submit and shows an empty red box.

**Fix:** Give the schema a dictionary key, as every other field in the phase does:

```ts
date: z.coerce.date({ message: 'error.field.required' }),
```

### WR-05: a >500-character `reason` blocks submit with no feedback at all

**File:** `src/lib/pipeline/schemas.ts:49-54`; `MarkWonDialog.tsx:154-165`; `MarkLostDialog.tsx:108-119`
**Issue:** `reason` is capped at 500 characters, but neither dialog renders a `FieldError` for it
and the field has no `aria-invalid`. A partner who pastes a long note clicks the confirm button
and nothing happens — no toast, no inline error, no console output.

**Fix:** Add a message to the cap (`.max(500, { message: 'error.field.required' })` or a new
`error.field.tooLong` key) and render the `FieldError` beside the reason input in both dialogs,
mirroring the date field's markup.

### WR-06: the board's `proposalsCount` join omits the `proposals.user_id` defence-in-depth predicate

**File:** `src/lib/db/queries/pipeline.ts:81-87`
**Issue:** The proposals join matches on `client_relationship_id` and `status <> 'deleted'` only.
`listProposalsForRelationship` in the sibling module deliberately adds
`eq(proposals.userId, ownerId)` and documents why ("defense in depth: even if a relationship id
were somehow cross-linked, the proposal's own owner must still match" —
`client-relationships.ts:382-385`). Phase 30's security review treats CRM-02 as an *inference*
property where even counts matter, and Phase 31's merge is exactly the kind of operation that can
re-point a `client_relationship_id`. As written, one mis-linked row inflates another partner's
card count.

**Fix:**

```ts
.leftJoin(
  schema.proposals,
  and(
    eq(schema.proposals.clientRelationshipId, schema.clientRelationships.id),
    eq(schema.proposals.userId, args.ownerId),   // ← same predicate the sibling module carries
    ne(schema.proposals.status, 'deleted'),
  ),
)
```

### WR-07: the desktop optimistic move keeps the card's stale `stage` value

**File:** `app/(authed)/pipeline/PipelineBoard.tsx:176-187`
**Issue:** `movedRow` is spliced into the destination lane unchanged, so `columns['negociation']`
holds a `PipelineCardRow` whose `.stage` still says `'qualifie'` until `router.refresh()` lands.
The mobile handler patches it correctly (`PipelineMobileList.tsx:75`), which shows the omission
was not a considered decision. Any future consumer of `row.stage` on the board — including the
`KanbanOverlay` lookup at lines 359-361 — reads a lie for the duration of the round-trip.

**Fix:**

```ts
const nextOver = [...overRows];
nextOver.splice(overIndex, 0, { ...movedRow, stage: overContainer as PipelineStage });
```

### WR-08: relationships parked in a reserved stage are invisible and uncounted on the board

**File:** `app/(authed)/pipeline/PipelineBoard.tsx:322-328`; `PipelineMobileList.tsx:131-136`;
`PipelineColumnHeader.tsx:32-44`
**Issue:** `listPipelineBoard` returns rows for all seven stages, but the desktop board renders a
static caption instead of `KanbanColumnContent` for reserved lanes, the mobile list hard-codes
`count={0}`, and the header replaces the count with a "Réservé" badge. Today nothing writes those
stages (D-04), so nothing is lost. The moment the contract tool starts writing `'signe'` — the
whole reason the lanes exist — those relationships vanish from the board with no signal, while
`totalCards` on `page.tsx:57` still counts them (so the empty state does not fire either).

**Fix:** Render the real count in the reserved header (keeping the "Réservé" badge alongside it)
and list the cards read-only inside the lane, or at minimum surface a "N dossiers" line so the
disappearance is visible rather than silent.

### WR-09: pressing Enter on an outcome trigger navigates away from the page

**File:** `src/components/proposals/ProposalRow.tsx:164-171`; `ProposalOutcomeControl.tsx:66`
**Issue:** `ProposalRow`'s root is `role="button"` with an unguarded
`onKeyDown={(e) => { if (e.key === 'Enter') router.push(href) }}`. `ProposalOutcomeControl` stops
propagation for `onClick` only. A keyboard user who tabs to "Marquer gagné" and presses Enter
fires the inner button's activation **and** bubbles the keydown to the row, which pushes
`/proposals/{id}` — the dialog opens on a page that is already navigating away. The very same file
family gets this right elsewhere: `PipelineBoard.tsx:265` guards with
`event.target !== event.currentTarget`.

**Fix:**

```tsx
onKeyDown={(e) => {
  if (e.target !== e.currentTarget) return;
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(href); }
}}
```

(Adding `' '` also fixes the missing Space activation that `role="button"` requires.)

### WR-10: the seeder's production refusal is a two-entry hostname denylist — it fails open

**File:** `scripts/seed-pipeline-fixtures.ts:67-74`
**Issue:** The script refuses only two hard-coded Neon endpoint prefixes. Any other host — a new
production endpoint after a Neon branch reset, a restored branch, a self-hosted Postgres, a
colleague's `DATABASE_URL` — is treated as safe and seeded. The header claims "It hard-refuses the
production and preview Neon branches with no override flag", which is only true for today's two
endpoint ids. A fixture seeder is exactly the tool where fail-closed matters.

**Fix:** Invert to an allowlist. Require an explicit opt-in that cannot be satisfied by accident:

```ts
const DEV_ENDPOINT_PREFIX = 'ep-…';                       // the development branch
if (!hostname.startsWith(DEV_ENDPOINT_PREFIX)) {
  fail(`refusing to seed into ${hostname}: only the development Neon branch is permitted.`);
}
```

Keep the existing denylist as a second layer.

### WR-11: reserved lanes render at 280px, not the 220px the UI-SPEC declares

**File:** `app/(authed)/pipeline/PipelineBoard.tsx:89`, `305`, `312`
**Issue:** `33-UI-SPEC.md` § Column widths declares 280px for active stages and **220px** for the
two system-owned lanes, and closes with "Exceptions: none beyond the two column-width literals
above" — the narrowing is named as part of the reserved-lane de-emphasis D-04 depends on. The
implementation applies one literal to every column (`COLUMN_WIDTH = 'w-[17.5rem] min-w-[17.5rem]'`)
and a uniform `auto-cols-[17.5rem]` on the grid.

**Fix:** Split the constant and drive the grid off the per-column class rather than `auto-cols`:

```ts
const COLUMN_WIDTH = 'w-[17.5rem] min-w-[17.5rem] rounded-container';
const RESERVED_COLUMN_WIDTH = 'w-[13.75rem] min-w-[13.75rem] rounded-container';
// …
<KanbanColumn className={reserved ? RESERVED_COLUMN_WIDTH : COLUMN_WIDTH} …>
```

### WR-12: new Phase 33 code ships sub-4px-grid spacing literals (UIC-01)

**File:** `app/(authed)/pipeline/PipelineBoard.tsx:92,315,334`; `PipelineCard.tsx:49,51,66,78`;
`PipelineColumnHeader.tsx:34,54,56`; `ProposalRow.tsx:54`; `ClientsGrid.tsx:84,115,207,228`;
`ProposalListFrame.tsx:25,28`; `Stepper.tsx:100,119`
**Issue:** UIC-01 is "a rule for new and edited code, not a description of the current tree", and
every sanctioned step divides by 4. New code here uses `p-2.5` / `px-2.5` / `py-2.5` (10px),
`gap-1.5` (6px), `px-0.5` (2px), `p-1.5!` (6px), `py-0.25` (1px), `mx-2.5` (10px). Icon optical
nudges (`mt-0.5`, `mt-1` on the arrow) are exempt; none of the above are optical nudges — they are
container padding and layout gaps. The provenance ("adopted from ReUI's `list-2` / `kanban-board-1`
block") is not an exemption; UIC-03 explicitly says a phase may declare a stricter budget, not a
looser one, and the same logic applies to UIC-01.

**Fix:** Round to the sanctioned steps — `p-2.5` → `p-3` (12px) or `p-2` (8px), `gap-1.5` →
`gap-2`, `px-0.5` → `px-1`, `p-1.5!` → `p-2!`. Where a ReUI literal must be preserved verbatim for
visual parity, record it as a named exception in `33-UI-SPEC.md` rather than leaving it silent.

### WR-13: `todayIso()` is UTC, so the default outcome date is yesterday for part of the day in CET

**File:** `app/(authed)/clients/[id]/MarkWonDialog.tsx:68-70`; `MarkLostDialog.tsx:43-45`
**Issue:** `new Date().toISOString().slice(0, 10)` takes the UTC calendar date. The product is
operated from CET/CEST (UTC+1/+2), so between local midnight and 01:00 (02:00 in summer) the
dialog pre-fills **yesterday's** date as the signature date. The value is persisted verbatim into
`proposals.outcome_date`.

**Fix:**

```ts
function todayIso(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}
```

### WR-14: admin and owner views derive different outcomes for the same proposal

**File:** `src/lib/db/queries/companies.ts:352-355`
**Issue:** `listProposalsForRelationshipAdmin` hard-codes `validityDays: null`, so
`deriveProposalOutcome` falls back to 30 days for admin-viewed rows while the owner-facing
`listProposalsForRelationship` projects the real `params_snapshot.validityDays`
(`client-relationships.ts:370-378`). A proposal issued with `validityDays: 15` and now 20 days old
reads `unanswered` to the partner and `null` to the admin. The comment presents this as an
ADMIN-09 consequence, but `projectValidityDays` already demonstrates that a validity **duration**
is not commission data — that is the exact argument written into
`client-relationships.ts:361-369`.

**Fix:** Select `params_snapshot` and reuse `projectValidityDays` (export it from
`client-relationships.ts`), so both surfaces derive the same value. The raw jsonb still never
reaches a returned row shape.

### WR-15: `requiredSirenSchema` neither normalises nor rejects interleaved non-digits

**File:** `src/lib/calc/schema.ts:68-73`
**Issue:**

```ts
.refine((s) => s.trim().length === 0 || s.replace(/\D/g, '').length === 9, { … })
```

There is no `.transform`, so the value is persisted into `proposals.inputs.clientSiren` exactly as
typed — with the `SirenInput` formatting spaces, and, for any non-UI caller, with arbitrary junk:
`"1a2b3c4d5e6f7g8h9"` strips to nine digits and passes. `POST /api/proposals`
(`src/lib/api/proposals/submit.ts:71`) parses this schema against a raw request body, so the UI's
`formatSiren` is not a backstop. The sibling written for the same operator decision on the same day
does it correctly (`crm/schemas.ts:37-44`): `normalizeSiren(v) ?? v` then `.refine(/^[0-9]{9}$/)`.
Two schemas for one rule is how the two drift — the exact reasoning `src/lib/crm/siren.ts`'s header
gives for existing at all.

**Fix:** Reuse the shared normaliser:

```ts
import { normalizeSiren } from '@/lib/crm/siren';

const requiredSirenSchema = z
  .string({ message: 'error.field.required' })
  .trim()
  .min(1, { message: 'error.field.required' })
  .transform((v) => normalizeSiren(v) ?? v)
  .refine((v) => /^[0-9]{9}$/.test(v), { message: 'error.field.siren.invalid' });
```

Note this changes the stored `inputs.clientSiren` to digits-only, which is what
`companies_siren_check` and the reconciliation engine both expect.

### WR-16: the audit contract and the stage-change payload disagree; `/clients` is not revalidated

**File:** `src/lib/pipeline/actions.ts:104-112`; `src/lib/db/queries/audit-log.ts:49-52`
**Issue:** `audit-log.ts` documents the Phase 33 actions as carrying "the from/to stage strings",
and names `relationship.stage_change` as what Phase 34's ACTV-02 timeline will read. The payload
actually written is `{ toStage }` only. `actions.ts:76-80` argues the origin is "recoverable from
the previous audit row" — which is false for the first ever stage change on a relationship (no
prior row exists; the origin was the `'prospect'` default), and for any row whose predecessor
audit write failed (see WR-03).

Separately, `advanceRelationshipStageAction` revalidates only `/pipeline`, while the two outcome
actions also revalidate `/clients` with `'layout'`. A stage change is not currently rendered on
`/clients`, so this is latent rather than broken — but the asymmetry is undocumented.

**Fix:** Either record the origin (`.returning()` already returns the updated row; capture the old
value with a `sql` expression or accept a `fromStage` in the schema and re-prove it in the WHERE,
which is TOCTOU-safe and additionally rejects a stale drag), or correct the audit-log comment to
say `toStage` only, so Phase 34 does not plan against a payload that is not there.

---

## Info

### IN-01: dead clause in `requiredSirenSchema`

**File:** `src/lib/calc/schema.ts:71`
**Issue:** `s.trim().length === 0 ||` can only be reached for a value the preceding refine has
already rejected as required. It is residue from the pre-2026-09-03 optional schema.
**Fix:** Delete the clause (subsumed by the WR-15 rewrite).

### IN-02: `pipeline.card.counts` is defined in both locales and used nowhere

**File:** `src/lib/i18n/dictionaries.ts:1101`, `2146`
**Issue:** `PipelineCard.tsx:38-39` uses `pipeline.card.contacts` / `pipeline.card.proposals`
instead. The combined string is dead.
**Fix:** Remove both entries.

### IN-03: `SIREN_REQUIRED`'s value is shaped like a `DictKey` but has no dictionary entry

**File:** `src/lib/pipeline/constants.ts:23`
**Issue:** `'pipeline.error.sirenRequired'` matches the dictionary's naming convention exactly but
is absent from both locales. Anyone who passes it to `t()` gets `undefined` rendered.
**Fix:** Use a non-key-shaped sentinel (`'SIREN_REQUIRED'`), or delete it entirely under CR-01's
result-object fix.

### IN-04: `restoreOnCancel` on `<Kanban>` is a no-op

**File:** `app/(authed)/pipeline/PipelineBoard.tsx:298`; `src/components/reui/kanban.tsx:415`
**Issue:** `handleDragCancel` guards with `restoreOnCancel && origin && !onMove`, and `onMove` is
always set here. The prop misleads a reader into thinking Escape restores state.
**Fix:** Drop the prop, or comment why it is retained.

### IN-05: `pipeline-keyboard-hint` has an id nothing references

**File:** `app/(authed)/pipeline/PipelineBoard.tsx:301-303`
**Issue:** The sr-only paragraph is announced only if a screen reader happens to traverse it; no
element carries `aria-describedby="pipeline-keyboard-hint"`.
**Fix:** Add `aria-describedby="pipeline-keyboard-hint"` to each `KanbanItem`, next to the existing
`aria-keyshortcuts`.

### IN-06: `PipelineColumnHeader`'s `count` is ignored for reserved lanes, and the mobile list passes a literal 0

**File:** `app/(authed)/pipeline/PipelineColumnHeader.tsx:32-44`; `PipelineMobileList.tsx:133`
**Issue:** `count` is a required prop the reserved branch never reads, so `count={0}` on mobile and
`count={rows.length}` on desktop are indistinguishable — which is what makes WR-08 invisible.
**Fix:** Make `count` optional and omit it at reserved call sites, or render it (see WR-08).

### IN-07: `/pipeline` route matching is prefix-based

**File:** `src/lib/route-meta.ts:200`
**Issue:** `pathname.startsWith('/pipeline')` also matches `/pipelines`, `/pipeline-archive`, etc.
Consistent with the neighbouring `/clients` branch, so this is a house-style note, not a
regression.
**Fix:** `pathname === '/pipeline' || pathname.startsWith('/pipeline/')`.

### IN-08: draft rows on `/clients/[id]` render `0 €`

**File:** `app/(authed)/clients/[id]/page.tsx:96`
**Issue:** `amountHT: p.computedClientMonthly != null ? String(...) : '0'` — a draft has NULL
`computed`, so `ProposalRow` renders `formatCurrency(0)`. A fabricated zero reads as a real
amount; UIC-08's "a meaningful zero renders as a zero" cuts the other way here.
**Fix:** Extend `ProposalRowDto.amountHT` to accept `null` and render `'—'`, or hide the amount
block when the row is a draft.

### IN-09: `Stepper` renders `pending` and `done` titles identically

**File:** `src/components/ui/Stepper.tsx:83`
**Issue:** `state === 'active' ? 'font-medium text-foreground' : 'text-foreground'` — a completed
step and a not-yet-reached step get the same title treatment; only the 24px indicator differs.
**Fix:** `state === 'pending' ? 'text-muted-foreground' : 'text-foreground'`, keeping the
`font-medium` on active.

### IN-10: the mobile pipeline sections use `rounded-lg`, the desktop lanes use `rounded-container`

**File:** `app/(authed)/pipeline/PipelineMobileList.tsx:132`, `145`; cf. `PipelineBoard.tsx:89`, `315`
**Issue:** Both are the same conceptual surface (a stage lane container). UIC-04's container tier
is the named `--radius-container` token; `rounded-lg` is not part of either tier.
**Fix:** Use `rounded-container` on the mobile stage sections.

---

_Reviewed: 2026-09-03_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
