---
phase: 34-fiche-client
reviewed: 2026-09-05T20:52:35Z
depth: scoped
files_reviewed: 21
files_reviewed_list:
  - src/lib/db/queries/client-relationships.ts
  - src/lib/db/queries/relationship-events.ts
  - src/lib/db/queries/companies.ts
  - src/lib/auth/require.ts
  - app/(authed)/clients/[id]/page.tsx
  - app/(authed)/clients/page.tsx
  - app/(authed)/clients/CreateClientDialog.tsx
  - app/(admin)/[adminSegment]/companies/[id]/page.tsx
  - app/(admin)/[adminSegment]/companies/[id]/relations/[relationshipId]/page.tsx
  - src/lib/crm/actions.ts
  - src/lib/crm/schemas.ts
  - src/lib/crm/registry-sync.ts
  - src/lib/crm/siren.ts
  - src/lib/relationship/actions.ts
  - src/lib/relationship/schemas.ts
  - src/lib/relationship/kinds.ts
  - src/lib/db/queries/audit-log.ts
  - src/db/schema.ts
  - src/lib/pipeline/actions.ts
  - tests/server-action-error-contracts.test.ts
  - next.config.ts
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
status: issues_found
reviewed_at_commit: eec4948e33b085ce22f9a39e0027574168a595cf
---

# Phase 34: Fiche client Code Review Report

**Reviewed:** 2026-09-05T20:52:35Z
**Depth:** scoped
**Files Reviewed:** 21
**Status:** issues_found

## Summary

**This is a SCOPED review, not a phase-wide one.** Per D-37-03 it covers exactly three risk
areas Phase 34 shipped: the authorization and ownership boundary, the `relationship_events`
write path, and the server actions (`src/lib/crm/actions.ts`, `src/lib/relationship/actions.ts`
and their schemas). It does **NOT** examine the remainder of the 13-plan diff: the UI components
and dialogs (`IdentityPanel`, `RelationPanel`, `ClientHeader`, `EditRelationDialog`,
`EditCompanyDialog`, `NextActionDialog`, `RegistryRefreshButton`, `ActivityTimeline`,
`NoteComposer`, `ClientTabs`), tab layout, i18n strings, styling, or the SIREN registry client's
HTTP/formatting layer (`src/lib/registry/recherche-entreprises.ts`, `src/lib/registry/schema.ts`,
`src/lib/registry/labels.ts`). Phase 36's code review of a single 223-line script produced 4
Critical and 8 Warning findings across two fix-and-re-review rounds; a phase-wide review here
could plausibly swallow Phase 37, which is the cost D-37-03 explicitly declined to absorb. **A
future reader must not treat this document as a full review of Phase 34** — for the surfaces it
does not cover, `34-SECURITY.md` (2026-09-04, adversarial audit, 118-item threat register) and
`34-VERIFICATION.md` (2026-09-05, goal-backward requirement re-derivation) are the applicable
records. Where this review's own read overlaps `34-SECURITY.md`'s already-closed findings
(WARNING-01 audit-swallow, LOW-01 `website` scheme, the `createContactAction` /
`insertRelationshipEventForOwner` INSERT…SELECT projection defect), this document confirms the
fix is present at the cited line rather than re-litigating the finding — cited explicitly below,
not silently reused.

Risk-priority order, matching D-37-03: (1) authorization/ownership, because an admin-bypass or a
missing owner predicate here is a cross-tenant confidentiality break; (2) the
`relationship_events` write path, because it is the newest write surface and the one that
already broke once in production (the `62e26fa` INSERT…SELECT outage, `34-SECURITY.md`
BLOCKER-01/§0); (3) the server actions, because they are the trust boundary between an untrusted
client and every write below.

**Risk area 1 — authorization and ownership: no defect found here.** Every partner-facing read
(`getClientRelationshipForOwner`, `listContactsForRelationship`, `listProposalsForRelationship`,
`listRelationshipEvents`, `listRelationshipsNeedingFollowUp`) compiles `ownerId` into the SAME
statement as the entity lookup — never a pre-check, never a post-fetch filter in TypeScript
(`src/lib/db/queries/client-relationships.ts:349-352`, `src/lib/db/queries/
relationship-events.ts:97-100, 288-292`). `getClientRelationshipForOwner` returns `null` for
both "no such id" and "exists but not yours," and `app/(authed)/clients/[id]/page.tsx:85-99`
calls `requireRelationshipHolder()` first, branches to `notFound()` on `null` **before**
`searchParams` is even read, and only then validates `?tab=` against an enum allowlist
(`ClientTabs.validateTab`) that selects a JSX branch and composes no query — a forged
`/clients/{someone-elses-id}?tab=activity` produces the byte-identical 404 a nonexistent id
would, with or without the tab param. Role is read exclusively through `requireUser()`'s
per-request DB check (`src/lib/auth/require.ts:54-77`) and never from `params`, `searchParams`,
headers or a client prop anywhere in the eight files this risk area covers — confirmed by direct
read, not by grep alone. The shared-vs-private split holds structurally: `companies.ts`
(admin-only, no owner column, no `ownerId` parameter on any exported function) is a physically
separate module from `client-relationships.ts` (owner-scoped, no admin path), so an accidental
partner-facing import of an unscoped admin query is visible on the import line, exactly as the
module's own header states. The admin relationship-detail page
(`app/(admin)/[adminSegment]/companies/[id]/relations/[relationshipId]/page.tsx:114-153`) renders
contacts as plain text with no add/edit/delete affordance, matching Phase 34's read-only
decision for admin oversight. **The "guard that does not guard" shape named by `37-CONTEXT.md`
(Phase 35's IN-01) was checked for explicitly and not found**: every ownership predicate reviewed
is computed from `session.user.id` at the call site and is the same value the query's WHERE
consumes — there is no case in this surface where a check is computed independently of the thing
it verifies, and no role gate sits beside a query that ignores it.

**Risk area 2 — the `relationship_events` write path: no defect found here.** Every write goes
through `insertRelationshipEventForOwner` (`src/lib/db/queries/relationship-events.ts:153-202`),
whose `INSERT … SELECT` derives `clientRelationshipId` from a source row scoped to
`eq(id, args.relationshipId) AND eq(ownerId, args.ownerId)` — the id is never taken raw from
caller input and written directly; a relationship the caller does not own selects zero rows and
inserts nothing. `actorId: string | null` is a required field with no default (D-14: `null`
means "the system," never "unknown"), and every one of the five call sites reviewed
(`src/lib/relationship/actions.ts:172-179, 257-266`; `src/lib/crm/registry-sync.ts:133-141`)
passes an explicit value, confirming ACTV-02's attribution requirement. `kind` is constrained
twice, not once: a TypeScript union (`RELATIONSHIP_EVENT_KINDS`, `src/lib/relationship/
kinds.ts:29-36`) and an identical DB CHECK (`relationship_events_kind_check`, `src/db/
schema.ts:598-601`) — a caller cannot reach the query layer with a free-form kind string. On
transaction boundaries: this module has no transactions by design (the `neon-http` driver throws
on `.transaction()`), and every caller documents which half is allowed to be lost — the row
always goes first where the row is the fact (`setNextActionAction`), the event goes first where
the event IS the fact (`addRelationshipNoteAction`) — and the accepted failure mode is a missing
narration or a harmless orphan event, never a corrupted relationship; this is a documented,
reviewed design choice, not an inconsistency. SQL composition is parameterised throughout with
one exception, flagged below as IN-01 rather than Critical because the interpolated value is a
compile-time module constant never influenced by any input, not a caller- or DB-derived value.
The read path (`listRelationshipEvents`) applies the identical owner predicate the write path
proves, in the same statement shape.

**Risk area 3 — the server actions: one Warning found (WR-01), otherwise no defect.** Every
exported action in both files calls `requireRelationshipHolder()` as its literal first `await`,
before any input-derived identifier is touched (`src/lib/crm/actions.ts:85, 248, 324, 469, 554,
601, 668`; `src/lib/relationship/actions.ts:97, 163, 232`) — no action trusts a client-supplied
id without re-proving ownership inside the write statement itself. Every action validates its
raw input against the canonical schema (`createClientSchema`, `updateCompanyDisplaySchema`,
`contactSchema` from `src/lib/crm/schemas.ts`; `updateRelationDetailsSchema`, `addNoteSchema`,
`setNextActionSchema` from `src/lib/relationship/schemas.ts`) — none duplicates a rule inline
that could drift from its canonical definition (the one small inline schema,
`refreshCompanyRegistrySchema` at `src/lib/crm/actions.ts:232-234`, validates a single UUID and
has no twin elsewhere to drift from). FICHE-03's audit-log write is present on every shared-field
edit path, including the SIREN-correction branch (`src/lib/crm/actions.ts:404-420`), and reads
`writeAuditLog`'s own header contract confirming private-tier writes are deliberately excluded
(D-03) — `grep -c writeAuditLog src/lib/relationship/actions.ts` returns 0, matching the module's
own claim. FICHE-01's outage behaviour was verified in the catch, not the comment:
`createClientRelationshipAction` (`src/lib/crm/actions.ts:208-216`) calls `syncCompanyRegistry`
with no guard and no branch on the result, and `syncCompanyRegistry` itself
(`src/lib/crm/registry-sync.ts:74-173`) has a single outer try/catch that can only return a
bounded result, never throw. Errors are returned as values on the action's return type where
recoverable (`RegistryRefreshResult`, `DeleteClientResult`) and thrown as the single bounded key
otherwise (`BOUNDED_ERROR` / `RELATIONSHIP_BOUNDED_ERROR`) — `tests/
server-action-error-contracts.test.ts` (re-run live, see Behavioral confirmation below) proves no
client component in the tree branches on a caught error's `.message`. No action in either file
returns or logs another partner's private relationship facts in an error payload — every catch
block logs a bounded, ids-only message server-side and throws/returns a fixed string. Cache
invalidation is where the one Warning lives: see WR-01.

A fourth `companies` write site exists outside this review's file list —
`src/lib/pipeline/actions.ts:305-312` (`markProposalWonAction`'s inline SIREN-fill, Phase 33). It
was noticed only because a repo-wide grep for `update(schema.companies)` was run to confirm
`updateCompanyDisplayAction` and `registry-sync.ts` are the only Phase 34 writers of that table.
It is out of this plan's scope (not a Phase 34 file, not in the read-first list) and is
mentioned only so FICHE-03's "not reachable-around" claim is not read as broader than what this
review actually checked: that site only fills a NULL `siren` (never overwrites), is audit-logged
(`company.siren_add`), and was not re-derived here beyond confirming those two facts by reading
it.

## Warnings

### WR-01: `createClientRelationshipAction` performs no cache invalidation, unlike every sibling write

**File:** `src/lib/crm/actions.ts:219` (the action's return statement; the write it follows spans
lines 95-216)
**Issue:** Every other Phase 34 write that changes data rendered on `/clients` or `/pipeline`
calls `revalidatePath` before returning — `updateCompanyDisplayAction` (`:439-440`),
`refreshCompanyRegistryAction` (`:287`), `deleteClientRelationshipAction` (`:730-731`),
`updateRelationDetailsAction` and `addRelationshipNoteAction` and `setNextActionAction`
(`src/lib/relationship/actions.ts:128-129, 202-203, 277-278`). `createClientRelationshipAction`
does not:
```ts
    // Unchanged and unconditional, whatever the registry did.
    return { relationshipId };
  } catch (e) {
```
A newly created relationship changes exactly the two lists every sibling action above
revalidates — the client book (`/clients`) and the pipeline board (`/pipeline`), where a
fresh relationship lands at its default stage. `CreateClientDialog.tsx:77` (`router.push(
/clients/${relationshipId})`) always navigates to a brand-new route the Router Cache cannot
already hold, so the immediate create flow is unaffected; the exposure is a partner who creates
a client, then navigates back to `/clients` or over to `/pipeline` via a soft (`<Link>` / router)
navigation within the same session before either page is revisited fresh. This is currently
inert under this project's Next.js 16.2.4 defaults (`next.config.ts` sets no `experimental.
staleTimes` override, and Next 15+'s default `staleTimes.dynamic` is `0`, so the Router Cache
does not hold a dynamic page's RSC payload at all) — but it is an inconsistency against every
sibling write in the same two files, and would become a real staleness bug the moment a future
edit adds a `staleTimes` override for legitimate reasons elsewhere in the app.
**Fix:** add the same two calls every sibling action already makes, immediately before the
return:
```ts
    revalidatePath('/clients', 'layout');
    revalidatePath('/pipeline');
    return { relationshipId };
  } catch (e) {
```

## Info

### IN-01: `sql.raw()` used for a value that never needed it

**File:** `src/lib/db/queries/relationship-events.ts:226, 270`
**Issue:** `listRelationshipsNeedingFollowUp`'s staleness predicate uses `sql.raw()` to splice in
a module-level string constant:
```ts
const STALE_AFTER = "interval '30 days'";
// ...
const isStale = sql`(${schema.clientRelationships.nextActionAt} IS NULL AND ${schema.clientRelationships.updatedAt} < now() - ${sql.raw(STALE_AFTER)})`;
```
This is not exploitable — `STALE_AFTER` is a hardcoded compile-time literal, never derived from
caller input, a DB read, or any request-scoped value, so there is no injection vector here
(this is why it is Info, not Critical, despite risk area 2's rule that a string-interpolated SQL
value is normally Critical: the rule targets values that can vary per call, and this one cannot).
It is, however, the only `sql.raw()` call across every file this review opened, and `sql.raw()`
is the one Drizzle primitive that bypasses parameter binding entirely — a future edit that
parameterises `STALE_AFTER` (e.g. making the staleness window configurable per tenant) could
carry the `sql.raw()` call over by copy-paste and turn a currently-safe pattern into a real one
with no compiler signal.
**Fix:** the interval literal does not need interpolation at all — it can be written directly
inside the template, which stays exactly as safe and removes the one `sql.raw()` in this module:
```ts
const isStale = sql`(${schema.clientRelationships.nextActionAt} IS NULL AND ${schema.clientRelationships.updatedAt} < now() - interval '30 days')`;
```

---

## Behavioral confirmation

`tests/server-action-error-contracts.test.ts` (cited in risk area 3) was re-run live during this
review, not taken on a prior claim: `npx vitest run tests/server-action-error-contracts.test.ts`
→ 1 file / 3 tests passed. This confirms the discriminated-result contract this review's Task 2
verdict relies on is enforced today, at the reviewed commit, not merely at some earlier commit
this document cites secondhand.

---

_Reviewed: 2026-09-05T20:52:35Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: scoped_
