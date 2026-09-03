---
phase: 34-fiche-client
plan: 09
subsystem: ui
tags: [react-server-components, home-page, follow-up, crm, i18n, tdd]

# Dependency graph
requires:
  - phase: 34-05
    provides: "listRelationshipsNeedingFollowUp — owner-scoped, bucket-ordered and row-limited in SQL, plus the FollowUpRow type on the queries barrel"
  - phase: 34-01
    provides: "the dashboard.relance.* dictionary keys (title, empty, viewAll, due, overdue, stale)"
  - phase: 17-03
    provides: "the home page's PageHero + metric tiles + recent-proposals card, and its four-entry Promise.all"
provides:
  - "RelanceCard — the à-relancer card as a server component that returns null on an empty list"
  - "the owner-scoped follow-up fetch joined to the home page's existing single round of queries"
  - "the card mounted above the recent-proposals card, with no role branch anywhere on the page"
  - "data-testid=\"relance-row\" as the addressable handle for the acceptance walkthrough"
affects: [34-12 acceptance walkthrough, 35-gamification, any future standalone Relances page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "absent-not-empty: a card whose emptiness is good news renders null rather than an empty-state twin"
    - "the admin case falls out of owning nothing, so a multi-role page needs no role branch"
    - "calendar comparisons (overdue / days-since) are made between local day boundaries, never between raw instants"

key-files:
  created:
    - "app/(authed)/_components/RelanceCard.tsx"
    - "app/(authed)/_components/RelanceCard.test.tsx"
  modified:
    - "app/(authed)/page.tsx"
    - "app/(authed)/page.test.tsx"

key-decisions:
  - "The card is absent, not empty: an empty follow-up list is good news, and a permanent 'Rien à relancer' panel is furniture reporting the absence of a problem. Returning null is also what lets the page stay free of a role branch."
  - "dashboard.relance.empty is deliberately left unused and undeleted — plan 34-01 owns dictionaries.ts and it is reserved for a future standalone Relances page."
  - "The row limit and the bucket ordering stay in SQL (34-05). The component re-sorts nothing and re-slices nothing, so the ordering the query established survives to the screen."
  - "nowMs is read once per request via a module-level async helper and passed as a prop; react-hooks/purity rejects the inline clock read, and the derived labels must not depend on the rendering client's clock."
  - "The 'voir tout' link does not use text-primary: UIC-03's accent reserve is asserted by grep in this plan's acceptance criteria, and the sibling card's text-primary treatment is therefore not copied."

patterns-established:
  - "Absent-not-empty card: return null from a server component when the empty state would report the absence of a problem rather than the absence of a surface."
  - "No-role-branch multi-role page: an admin gets an empty result from an owner-scoped query, so the surface disappears on its own — one surface to secure instead of two."
  - "Source-text assertion in a unit test: read page.tsx from process.cwd() and assert the absence of requireAdmin / role === , so a future role branch fails a test rather than only a checklist grep."

requirements-completed: [ACTV-04, ACTV-05]

# Metrics
duration: 12min
completed: 2026-09-03
---

# Phase 34 Plan 09: The "à relancer" home-page card — Summary

**A partner now opens the home page and sees the relationships they need to chase — due first, then stale — each a full-row link to its client page, fetched in the page's existing single round of queries and absent entirely when there is nothing to chase.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-09-03T20:23Z
- **Completed:** 2026-09-03T20:31Z
- **Tasks:** 2/2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- D-20 is now real code: the à-relancer list lives on the home page, not on `/clients/[id]` and not on the pipeline board.
- The follow-up query joined the home page's existing `Promise.all` rather than adding a second await — one more round-trip on the highest-traffic page, not one more round.
- The admin case is handled by absence rather than by a branch: `requireUser()` is unchanged, no `requireAdmin` and no `role ===` exists anywhere in `page.tsx`, and an admin sees no card because they own no relationships.

## Task Commits

1. **Task 1: The RelanceCard component (TDD)**
   - RED — `790036f` (`test(34-09): specify the à-relancer card before building it`)
   - GREEN — `da784c3` (`feat(34-09): render the à-relancer card from rows the caller already owns`)
2. **Task 2: Fetch the follow-up list on the home page and mount the card (TDD)**
   - RED — `d50bde8` (`test(34-09): pin the home page's follow-up fetch before wiring it`)
   - GREEN — `9b20c19` (`feat(34-09): fetch the caller's follow-up list on the home page and mount the card`)

No REFACTOR commit was needed on either task: neither GREEN implementation left duplication or dead shape behind.

## Files Created/Modified

- `app/(authed)/_components/RelanceCard.tsx` (new, 144 lines) — the card. Server component, no client directive. Returns `null` on an empty list; otherwise renders `ProposalListFrame` with the sibling card's row chrome copied verbatim, one `<Link href="/clients/{relationshipId}" data-testid="relance-row">` per row.
- `app/(authed)/_components/RelanceCard.test.tsx` (new) — 6 tests via `renderToString`.
- `app/(authed)/page.tsx` — one import pair, one entry added to the existing `Promise.all`, a module-level `getNowMs()` helper, and the card mounted directly above the recent-proposals card.
- `app/(authed)/page.test.tsx` — 6 new tests added; all 8 pre-existing tests still pass unchanged.

`app/(authed)/_components/` did not exist before this plan; it was created here.

## The three row-label branches

Interpolation happens at the CALL SITE via `.replace('{0}', …)` — the dictionary never holds a template literal (the house convention set by `dashboard.greeting`).

| Condition | Dictionary key | FR copy | `{0}` is |
|---|---|---|---|
| `bucket === 0` and `nextActionAt`'s local day is **before** today's | `dashboard.relance.overdue` | `En retard` | — |
| `bucket === 0` otherwise (due today or, defensively, later) | `dashboard.relance.due` | `Le {0}` | `formatDate(nextActionAt, lang, { year: 'numeric', month: 'short', day: 'numeric' })` |
| `bucket === 1` | `dashboard.relance.stale` | `Sans activité depuis {0} jour(s)` | whole days between `updatedAt`'s day boundary and today's |

Both comparisons are made between **local day boundaries**, not raw instants: an action due at 09:00 is not "late" at 17:00. The day count is `Math.round`ed rather than floored, because a DST-shifted day is 23 h or 25 h long and a floor would report 46 days where 47 elapsed.

`dashboard.relance.empty` is **deliberately unused**. Plan 34-01 owns `dictionaries.ts` and no later plan edits it; the key is reserved for a future standalone "Relances" page where an empty state would genuinely be informative.

## The `nowMs` prop

All three labels are calendar derivations. Computing them during render would tie them to whichever clock does the rendering, so the page reads the clock once per request and passes the value down — the same reason `ProposalRow` takes `nowMs` from the server.

The clock read goes through a module-level `async function getNowMs()` rather than an inline `Date.now()`: ESLint's `react-hooks/purity` rejects the inline form ("Cannot call impure function") even in a server component. `app/(authed)/proposals/[id]/page.tsx:24` already established exactly this helper shape, so it was copied rather than silenced with a disable comment (the alternative precedent, `app/(admin)/[adminSegment]/page.tsx:88`, uses an `eslint-disable-next-line`; the helper is the better of the two).

## Owner scoping (CRM-02, T-34-09-01…04)

- `listRelationshipsNeedingFollowUp(userId, 5)` is called with the session's `userId` and nothing else. Page test 1 asserts the first argument is `USER_ID` **exactly**, so threading a search param, header or cookie into it fails a test.
- The page accepts no `searchParams` at all.
- No count, ranking, total or comparison appears on the card. The component renders only the rows it is handed — it issues no query of its own. Component test 6 asserts a fixture "other partner" string never reaches the markup and that the rendered row count equals the input row count (no aggregate row).
- Page test 6 reads `page.tsx` as text and asserts `requireAdmin` and `role ===` / `role !==` are absent, so a future role branch fails a test rather than only a manual grep.

## Acceptance handle

The walkthrough (34-12) addresses rows by `data-testid="relance-row"` on each row `<Link>`. `href` is `/clients/{relationshipId}` — the relationship id, matching D-16's route contract.

## Deviations from Plan

### 1. [Rule 3 — Blocking] `react-hooks/purity` rejected the inline clock read

- **Found during:** Task 2, at `npm run lint:check`.
- **Issue:** The plan's action step 3 says "Compute `const nowMs = Date.now();` once, on the server, above the JSX". That exact line fails `lint:check` with `react-hooks/purity — Cannot call impure function`, and CI runs `eslint --max-warnings=0`, so it would have failed the build.
- **Fix:** Routed the read through a module-level `async function getNowMs()` and used `const nowMs = await getNowMs();`. The plan's *intent* — read the clock once, on the server, above the JSX — is preserved exactly; only the syntax changed.
- **Files modified:** `app/(authed)/page.tsx`
- **Commit:** `9b20c19`

### 2. [Rule 1 — Bug] Two acceptance greps were tripped by my own doc comments

- **Found during:** Task 1, running the acceptance criteria.
- **Issue:** `grep -c "'use client'"` and `grep -c "Date.now()"` on `RelanceCard.tsx` returned 1 each. Both matches were inside the file's header comment, which *explained* that the component is not a client component and does not read the clock. The criteria are literal greps, so a prose mention defeats them — and a checker running them later would have read a false positive as a real violation.
- **Fix:** Reworded both comments to state the same facts without the literal strings, and said so in the comment itself so a future editor does not reintroduce them. Both greps now return 0.
- **Files modified:** `app/(authed)/_components/RelanceCard.tsx`
- **Commit:** `da784c3` (fixed before the commit landed)

### 3. [Planner discretion] The `action` link does not copy the sibling card's `text-primary`

- **Found during:** Task 1.
- **Issue:** The plan says to render the frame with an `action` link "labelled `t('dashboard.relance.viewAll', lang)`", and the sibling recent-proposals card styles its equivalent link `text-sm font-medium text-primary no-underline hover:underline`. But the plan's own acceptance criteria require `grep -cE "text-destructive|bg-destructive|text-primary"` to return 0 on this file (UIC-03 accent reserve).
- **Resolution:** The acceptance criterion wins. The link is `text-sm font-medium text-foreground no-underline hover:underline`. Only the *row chrome* was required to be copied verbatim, and it was — it contains no accent class.
- **Files modified:** `app/(authed)/_components/RelanceCard.tsx`
- **Commit:** `da784c3`

### 4. [Prompt directive] `npm run build` was not run

- The plan's Task 2 `<verify>` and the `<verification>` block both call for `npm run build`. The orchestrator's instruction for this wave is explicit: a dev server is live on port 3000 and three other executors are writing the same tree, so a concurrent build would freeze the dev server's `globals.css` recompiles (a known, recorded incident). `typecheck`, `lint:check` and targeted vitest were run instead. The orchestrator builds once when the wave completes.

### 5. [Prompt directive] `requirements mark-complete`, STATE.md and ROADMAP.md were not touched

- The orchestrator instructed that `requirements mark-complete` not be run. `state advance-plan` / `roadmap update-plan-progress` were also skipped deliberately: four executors are running concurrently in this tree, and four independent `advance-plan` calls would advance the plan counter four times for one wave. The `requirements-completed` frontmatter above records ACTV-04/ACTV-05 for the orchestrator to reconcile.

### 6. [Test infrastructure] `import.meta.url` is not a `file:` URL under vitest's jsdom environment

- **Found during:** Task 2 GREEN.
- **Issue:** Page test 6 reads `page.tsx` as source text. `fileURLToPath(new URL('./page.tsx', import.meta.url))` throws `TypeError: The URL must be of scheme file` — under the jsdom environment `import.meta.url` is an http URL, not a file one.
- **Fix:** Resolved from the vitest cwd instead: `join(process.cwd(), 'app', '(authed)', 'page.tsx')`, with a comment saying why.
- **Commit:** `9b20c19`

## Known Stubs

None. Every rendered value flows from a real query result; nothing is hardcoded, mocked or placeholder.

## Threat Flags

None. This plan adds no network endpoint, no auth path, no file access and no schema change. It adds one read call to a query that already carried its own owner predicate, and a component with no data source of its own.

## TDD Gate Compliance

Both tasks carry a `test(...)` commit followed by a `feat(...)` commit, in that order. RED was verified failing before each GREEN:

- Task 1 RED: the suite failed to collect (`RelanceCard` did not resolve) — the correct RED for a component that does not exist.
- Task 2 RED: `5 failed | 9 passed`. The one new test that passed at RED (test 4, "an empty list renders no card") passes vacuously when no card exists at all, which is expected and is exactly why it is paired with test 5.
- After GREEN: Task 1 `6 passed`, Task 2 `14 passed` (8 pre-existing + 6 new).

## Self-Check

**Artifacts exist:**

- `app/(authed)/_components/RelanceCard.tsx` — FOUND (148 lines, min_lines 60 satisfied)
- `app/(authed)/_components/RelanceCard.test.tsx` — FOUND
- `app/(authed)/page.tsx` — FOUND, contains `listRelationshipsNeedingFollowUp`
- `app/(authed)/page.test.tsx` — FOUND

**Commits exist:** `790036f`, `da784c3`, `d50bde8`, `9b20c19` — all four FOUND in `git log`.

**Task 1 acceptance criteria:**

| Criterion | Result |
|---|---|
| `npx vitest run RelanceCard.test.tsx` ≥ 6 assertions | PASS — 6 tests, 19 assertions |
| `grep -c "'use client'"` = 0 | PASS — 0 |
| `grep -c "Date.now()"` = 0 | PASS — 0 |
| `grep -cE "text-destructive\|bg-destructive\|text-primary"` = 0 | PASS — 0 |
| `grep -cE "max-w-\[\|maxWidth"` = 0 | PASS — 0 (UIC-09: renders inside `Shell`'s capped `<main>`) |
| `npm run lint:check` exits 0 | PASS on every owned file (see repo-wide note below) |

**Task 2 acceptance criteria:**

| Criterion | Result |
|---|---|
| `npx vitest run page.test.tsx` incl. every pre-existing case | PASS — 14 passed (8 pre-existing + 6 new) |
| `grep -c "listRelationshipsNeedingFollowUp"` = 2 | PASS — 2 (import + call) |
| `grep -c "requireAdmin"` = 0 | PASS — 0 |
| `grep -cE "role ===\|role !=="` = 0 | PASS — 0 |
| `grep -c "Promise.all"` = 1 | PASS — 1 |
| `grep -c "userId"` ≥ 5 | PASS — 7 |
| `npm run build` exits 0 | NOT RUN — see deviation 4 |

**Plan-level verification:**

| Gate | Result |
|---|---|
| `npm run typecheck` | PASS on every owned file. The repo-wide run reports one error, `src/lib/crm/actions.test.ts(200,3): 'refreshCompanyRegistryAction' has no exported member` — a concurrent executor's file, mid-flight, not touched by this plan. `npx tsc --noEmit` filtered to exclude it is clean. |
| `npm run lint:check` | PASS on every owned file (`npx eslint` over the four owned paths with `--max-warnings=0` exits 0). The repo-wide run reports one warning in the same concurrent file. |
| `npm run test` | 155 files passed, 3 skipped, 1 failed — the failing file is `src/lib/crm/actions.test.ts` (same concurrent executor). Both owned suites pass. |
| `git diff package.json package-lock.json` empty (T-34-09-SC) | PASS — no dependency added, both files untouched |
| `git diff src/lib/i18n/dictionaries.ts src/lib/db/queries/` empty | PASS — untouched; plans 34-01 and 34-05 own them |

**Self-Check: PASSED** — with two gates qualified rather than green, both for reasons outside this plan's ownership: `npm run build` was withheld by orchestrator directive (deviation 4), and the repo-wide typecheck/lint/test runs each carry exactly one failure in `src/lib/crm/actions.test.ts`, a file owned by a concurrently running executor and untouched here.
