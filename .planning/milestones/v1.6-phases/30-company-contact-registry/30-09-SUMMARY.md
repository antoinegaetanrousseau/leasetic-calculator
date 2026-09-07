---
phase: 30-company-contact-registry
plan: 09
subsystem: crm
tags: [proposals, wizard, crm, snapshot-invariant, human-verify]

# Dependency graph
requires:
  - phase: 30-company-contact-registry
    plan: 01
    provides: "proposals.client_relationship_id nullable FK + cursor index"
  - phase: 30-company-contact-registry
    plan: 04
    provides: "getClientRelationshipForOwner / listProposalsForRelationship (owner-scoped reads)"
  - phase: 30-company-contact-registry
    plan: 07
    provides: "/clients/[id] Propositions card, the surface the link populates"
provides:
  - "createDraft accepting an optional clientRelationshipId (the single write path to the FK)"
  - "Ownership-validated ?clientRelationshipId= handling and client-field prefill on wizard step 1"
  - "End-to-end proof that the inputs JSONB snapshot is untouched by the link (CRM-05)"
  - "Operator sign-off on the phase's five ROADMAP success criteria against a running instance"
affects: [31, 32, 33, 34]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Silent graceful degradation as a security property: a non-owned or malformed id is dropped and the wizard proceeds unlinked, so an owned and a non-owned id are indistinguishable from the caller's side (T-30-09-01)"

key-files:
  created: []
  modified:
    - src/lib/db/queries/proposals.ts
    - src/lib/db/queries/proposals.test.ts
    - app/(authed)/proposals/new/parametres/page.tsx
    - app/(authed)/proposals/new/parametres/page.test.tsx
    - src/lib/api/proposals/finalize-wizard.test.ts

key-decisions:
  - "The FK is written from exactly one path (createDraft). finalizeDraft's set-object is asserted by test to contain no inputs key, so the link cannot disturb the snapshot (CRM-05)"
  - "A clientRelationshipId the caller does not own is dropped silently — no error, no 404, no toast — because any divergence would turn the param into an existence oracle (T-30-09-01)"

requirements-completed: [CRM-05, CRM-06]

# Metrics
duration: "Tasks 1-2 landed 2026-09-01 (8d2f06b, e86aec4); Task 3 human-verify checkpoint resolved 2026-09-02"
completed: 2026-09-02
---

# Phase 30 Plan 09: Proposal ↔ Relationship Link + Phase Human Verification Summary

**A proposal started from a client record now carries `client_relationship_id` and appears on that client's page, with the `inputs` snapshot provably untouched — and an operator has confirmed the phase's isolation guarantees on a running instance.**

## Performance

- **Tasks:** 3/3
- **Completed:** 2026-09-02
- **Files modified:** 5

## Accomplishments

- `createDraft` accepts an optional `clientRelationshipId` and is the only write path to the column; a grep gate asserts there is no second one (T-30-09-02).
- Wizard step 1 validates `?clientRelationshipId=` through `getClientRelationshipForOwner(id, session.user.id)` and prefills the client fields from owner-scoped reads only. A `null` result is handled identically to a malformed value — the wizard proceeds unlinked with no error, no 404 and no toast, so an owned and a non-owned id are indistinguishable from the caller's side (T-30-09-01, T-30-09-04).
- CRM-05's invariant is asserted at two levels: a unit assertion that `finalizeDraft`'s set-object contains no `inputs` key, and an end-to-end deep-equal in `finalize-wizard.test.ts`.
- **Task 3 (blocking human-verify checkpoint) resolved** — see below.

## Task Commits

1. **Task 1: createDraft accepts optional clientRelationshipId** - `8d2f06b` (feat)
2. **Task 2: wizard step 1 accepts ?clientRelationshipId= with ownership validation and prefill** - `e86aec4` (feat)
3. **Task 3: human verification of the phase's isolation guarantees** - no code; verdict recorded below

## Task 3 — Operator Verdict

Automated layer reported green to the operator before the manual pass, as the task requires:

| Gate | Result |
|------|--------|
| `npm run typecheck` | exit 0 |
| `npm run lint:check` | exit 0 |
| `npm test` | exit 0 — 1437 passed, 18 skipped |
| `npm run build` | exit 0, `.next/standalone/server.js` present, all 5 Phase 30 routes emitted |
| `check:migration-journal-sync` / `check:no-drizzle-push` / `check:db-smoke-filter` | all exit 0 |
| isolation integration suite (real Postgres) | 8/8 — executed by the Phase 30 verifier against the Neon dev branch, recorded in 30-VERIFICATION.md |

**Operator verdict (Antoine, 2026-09-02), verbatim:**

- Steps 1–7 and the list half of step 8: *"I ran tests on the previous session and it worked."* Step 8's registry row was additionally evidenced by screenshot — Dupont Menuiserie, SIREN 123456789, RELATIONS 2 — matching the plan's expected values exactly.
- Steps 10 and 11: *"all correct for steps 10 and 11"*
- Step 8 (second half) and step 9: *"both correct"*

No step failed. All eleven steps behave as described, including the four the plan singles out as security-critical: steps 5, 6, 7 and 8 showed no cross-partner signal of any kind — partner B sees the empty state rather than partner A's client, a forged relationship id is indistinguishable from a nonexistent one, a duplicate SIREN creates silently, and the admin company page exposes contact counts only, never names, phones or emails.

## Decisions Made

None beyond those in frontmatter `key-decisions`.

## Deviations from Plan

None. Tasks 1–2 executed as written; Task 3 is a verification gate with no code.

## Issues Encountered

**The checkpoint was blocked for ~45 minutes by local environment state, not by the code under test.** Sign-out appeared dead (`TypeError: Load failed`, no server log). Root cause: `NEXT_PUBLIC_APP_URL` is `http://localhost:3000` and is inlined into the client bundle at build time, but the dev server had been bounced onto 3001 and then 3002 by Next's automatic port fallback — a wedged `next-server` from 19:15 was squatting on 3000 and ignoring SIGTERM. Every restart landed on a fresh port, so `authClient.signOut()` posted cross-origin to an address with nothing behind it and failed at the network layer, producing a dead button with no error surface anywhere in the app.

Contributing factor: a `npm run build` was run mid-session against the same `.next/` directory the dev server was using, which clobbered its chunks and triggered the restart cycle in the first place.

Resolved by clearing the stale processes and starting the dev server back on port 3000. No application code was changed.

## User Setup Required

None.

## Next Phase Readiness

- Phase 30 closes at 9/9. CRM-05 and CRM-06 are complete and human-confirmed.
- Two items carry forward, both already logged, neither blocking:
  - `app/(authed)/proposals/[id]/page.tsx` has no admin bypass, so an admin clicking through from the admin relationship detail to a full proposal detail gets a 404 (`deferred-items.md`, deferred to Phase 33/34). Relationship-level data is fully visible, so CRM-03's promise holds.
  - A dev-only guard warning when `window.location.origin !== NEXT_PUBLIC_APP_URL` would have reduced the 45-minute blockage above to one console line. Proposed, not implemented — out of Phase 30's scope.
- Phase 31 (Reconciliation Engine & Proposal Extraction) is unblocked.

---
*Phase: 30-company-contact-registry*
*Completed: 2026-09-02*
