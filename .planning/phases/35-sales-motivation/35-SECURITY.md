---
phase: 35-sales-motivation
audit_date: 2026-09-05
threats_total: 21
threats_closed: 21
threats_open: 0
asvs_level: not declared in phase artifacts (no <config> block found; treated as informational, not blocking)
block_on: not declared in phase artifacts
disposition: SECURED
---

# Phase 35 (sales-motivation) — Security Verification

## Scope

Verified against the actual implementation, not documentation:
- `src/lib/db/queries/momentum.ts`
- `app/(authed)/page.tsx`
- `app/(authed)/_components/MomentumCard.tsx`
- `src/lib/momentum/badges.ts`, `src/lib/momentum/window.ts`
- `src/lib/i18n/dictionaries.ts` (`dashboard.momentum.*` keys)
- `src/lib/db/queries/momentum.isolation.integration.test.ts`
- `app/(authed)/page.test.tsx`, `app/(authed)/_components/MomentumCard.test.tsx`

No implementation file was modified during this audit. Threat register was extracted from the five `<threat_model>` blocks in `35-01-PLAN.md` through `35-05-PLAN.md` (STRIDE register, `T-35-0N-xx` IDs). No `## Threat Flags` section was found in any `35-0N-SUMMARY.md` — this is recorded as an absence, not assumed to mean no new surface (see Unregistered Flags below).

## Threat Verification

| Threat ID | Category | Disposition | Evidence |
|---|---|---|---|
| T-35-01-01 | Info disclosure (cross-partner inference) | mitigate | `src/lib/momentum/badges.ts:56` `summarizeStreaks(weekKeys, nowMs)` and `:118` `deriveBadgeProgress(...)` — signatures take only already-scoped values, no ownerId/cohort/peer-set parameter exists to smuggle another partner's data through. |
| T-35-01-02 | Info disclosure | accept | `BADGE_THRESHOLDS` in `src/lib/momentum/badges.ts` is a fixed, identical-for-all-partners constant. Accepted-risk entry logged below. |
| T-35-01-03 | Tampering (window arithmetic) | mitigate | `src/lib/momentum/window.test.ts:36,43` — explicit 167h (spring DST) and 169h (autumn DST) week-length regression tests present and passing. |
| T-35-01-04 | Repudiation | mitigate | No write path in `src/lib/momentum/`; confirmed no `.insert(`/`.update(`/`.delete(` anywhere in `src/lib/momentum/*.ts` or `src/lib/db/queries/momentum.ts`. Everything is derived read-time from `relationship_events`. |
| T-35-01-SC | Supply chain | accept | `date-fns`/`@date-fns/tz` are pre-existing `package.json` dependencies; no install occurred in this phase. |
| T-35-02-01 | Info disclosure (cross-partner, direct) | mitigate | `grep -n "eq(schema.clientRelationships.ownerId" src/lib/db/queries/momentum.ts` → 3 hits (lines 130, 197, 231), one per exported function, each the first/only conjunct of the same `where(and(...))` as the selected columns — never a separate pre-check. |
| T-35-02-02 | Info disclosure (inference via aggregate) | mitigate | `getBadgeCountsForOwner` (`momentum.ts:~215-234`) computes both `COUNT(DISTINCT ...)` aggregates inside a statement whose only WHERE predicate is `eq(ownerId, ownerId)`; no cohort/comparison parameter exists on the function. |
| T-35-02-03 | Info disclosure (inference via timeline) | mitigate | `listProgressWeekKeysForOwner` joins through the same `clientRelationships.ownerId` predicate before grouping; verified in source. |
| T-35-02-04 | Tampering (gaming via Perdu) | mitigate | `IS_PROGRESS_EVENT` in `momentum.ts` includes `AND ${TO_STAGE_EXPR} <> 'perdu'` as a load-bearing conjunct — confirmed present in source, and confirmed load-bearing by mutation M2 (see T-35-04-03). |
| T-35-02-05 | Elevation of privilege (admin reaching query layer) | mitigate | No `role`/`isAdmin` branch exists inside `momentum.ts` (grep confirms only a doc comment references D-15); real control is the call-site gate verified under T-35-05-01. |
| T-35-02-06 | Repudiation / data loss (cascade delete) | accept | `relationship_events` is `ON DELETE CASCADE` from `client_relationships`; accepted-risk entry logged below. |
| T-35-02-SC | Supply chain | accept | No new dependency introduced by this plan; confirmed no install artifacts. |
| T-35-03-01 | Info disclosure (inference via wording) | mitigate | `MomentumCard.test.tsx:320-340`, test "8. GAME-04 vocabulary guard", asserts full rendered `container.textContent` does not match `/classement|leaderboard|moyenne|average|percentile|rank|top \d|par rapport|compared/i` across multiple axis states. Independently re-verified: current `dashboard.momentum.*` dictionary content (50 entries, both languages) contains none of these terms. |
| T-35-03-02 | Info disclosure (inference via dictionary) | mitigate, with a documentation-drift note | The plan's literal tripwire ("`grep -c` pins the count at 38 entries") is **no longer present as a durable, re-runnable gate** — no such count assertion exists in `MomentumCard.test.tsx` today, and the current dictionary carries 50 `dashboard.momentum.*` entries (25 keys × 2 languages), not 38, because the concurrent D-19a visual redesign (same-day, documented in-line in `dictionaries.ts`) added rungs/progress-track copy. The underlying security property is nonetheless independently enforced by T-35-03-01's broader runtime vocabulary-guard test, and manual re-verification of all 50 current entries found zero comparative/ranking terms. **Classified CLOSED on the strength of the surviving vocabulary-guard test, not the retired count pin** — recorded here so a future reviewer does not rely on the stale "38 entries" plan text. |
| T-35-03-03 | Info disclosure (admin tell) | mitigate | `MomentumCard.tsx` contains no `role`/`isAdmin` conditional and never returns `null` internally; the skip is exclusively `{!isAdmin && momentum && <MomentumCard .../>}` in `page.tsx` (verified under T-35-05-01). |
| T-35-03-04 | Tampering (metric framing) | mitigate | `ROW_LINK_CLASSNAME` is one frozen string constant applied unconditionally to every movement row (`MomentumCard.tsx`); no conditional class or inline style branches on `row.kind` or stage direction. |
| T-35-03-05 | DoS / degraded surface (truncated streak text) | mitigate | `splitStreakSentence` (`MomentumCard.tsx`) returns `{ head: sentence, rest: '' }` when no `'. '` separator is found — falls back to the whole string, confirmed in source. |
| T-35-03-06 | Elevation of privilege | accept | Component has no privileged operation; confirmed no `<button>`, `<form>`, or admin control anywhere in `MomentumCard.tsx` — only `<Link>` elements to owner-scoped relationship pages. |
| T-35-03-SC | Supply chain | accept | `Card`/`CardHeader`/`CardContent`/`CardTitle`/`CheckCircleIcon` etc. all pre-existing imports; no `shadcn add` invoked. |
| T-35-04-01 | Info disclosure (cross-partner, direct, integration-proven) | mitigate | `momentum.isolation.integration.test.ts` present, tests owner isolation through a shared-company fixture; `35-04-SUMMARY.md` Mutation Evidence table M1 shows deleting the owner predicate breaks 4 named assertions (1, 2, 4, 8), independently corroborated by `35-REVIEW.md`. |
| T-35-04-02 | Info disclosure (inference via aggregate, integration-proven) | mitigate | Same suite asserts B's badge counts are strictly B's own; covered by M1's assertion-7 failure when the owner predicate is removed. |
| T-35-04-03 | Tampering (Perdu gaming, integration-proven) | mitigate | Mutation M2 (delete Perdu exclusion) produced named failures "assertion 5 (D-11)" and "assertion 7" — confirmed in `35-04-SUMMARY.md`, reverted with `git diff --exit-code` clean. |
| T-35-04-04 | Tampering (window boundary drift, integration-proven) | mitigate | Mutation M3 (`lt`→`lte`) produced named failures on assertions 3 and 4 — confirmed in `35-04-SUMMARY.md`. |
| T-35-04-05 | Elevation of privilege (admin indistinguishable at query layer) | mitigate | Suite's assertion 8 (byte-identical admin-id vs. nonexistent-id results) is part of the 9/9 passing integration run reported in `35-VERIFICATION.md`. |
| T-35-04-06 | Destruction of production data (test harness) | mitigate | Suite is `describe.skipIf(!shouldRun)` gated on `DATABASE_URL_TEST`, confirmed in source (`momentum.isolation.integration.test.ts:84`); pre-existing `scripts/check-local-db-branch.sh` provides the hostname guard against the named production endpoint (`ep-icy-boat-alx5o1tz-pooler`), confirmed present and unmodified. `35-04-SUMMARY.md` records the operator ran this check against the `development` branch before mutation work. |
| T-35-04-07 | Info disclosure (secret in transcript) | mitigate | `scripts/check-local-db-branch.sh` is confirmed in source to print HOSTNAME only, never the full connection string; `35-04-SUMMARY.md` states no connection string appears anywhere in that file, the test file, or command output. |
| T-35-04-SC | Supply chain | accept | `postgres` and `vitest` are pre-existing dependencies. |
| T-35-05-01 | Info disclosure (admin inference tell) | mitigate | `app/(authed)/page.tsx`: `isAdmin ? null : Promise.all([listWeeklyMovementsForOwner(...), listProgressWeekKeysForOwner(...), getBadgeCountsForOwner(...)])` — queries never evaluated for an admin — AND `{!isAdmin && momentum && <MomentumCard .../>}` — no DOM node. Both halves independently confirmed in `app/(authed)/page.test.tsx` Test 6/7 area: `toHaveBeenCalledTimes(0)` on all three mocks (lines ~460-462) plus absence of momentum copy from rendered text. |
| T-35-05-02 | Spoofing / parameter injection (userId source) | mitigate | `HomePage()` takes no props/searchParams; `userId` is derived exclusively from `session.user.id` (`const u = session.user as {...}; const userId = u.id;`), passed directly into the three momentum queries — no header/query-string path exists to override it. |
| T-35-05-03 | Elevation of privilege (stale cached role) | mitigate | `src/lib/auth/require.ts` `requireUser()` performs the documented AUTH-16 secondary in-band DB re-check of role/deletedAt per request — confirmed in source; `role` returned to `page.tsx` is this re-read value, not a cookie-only claim. |
| T-35-05-04 | Tampering (regression in chase list / recent proposals) | mitigate | `RelanceCard` and the recent-proposals block remain present and wired unchanged in `page.tsx`; `35-VERIFICATION.md` reports full suite 172 files / 2317 tests passed, 0 regressions. |
| T-35-05-05 | Info disclosure (test-gate erosion) | mitigate | `page.test.tsx` Test 6 area (lines ~388-411) carries an explanatory comment recording why the retired source-regex assertion was replaced by the behavioural `toHaveBeenCalledWith`/`toHaveBeenCalledTimes` assertions — confirmed present in source, not merely claimed. |
| T-35-05-06 | DoS (added home-page latency) | accept | Three additional owner-scoped reads execute inside the page's existing single `Promise.all` round (confirmed: `listWeeklyMovementsForOwner`/`listProgressWeekKeysForOwner`/`getBadgeCountsForOwner` are nested inside the same outer `Promise.all` as the pre-existing queries, not a second round-trip). Accepted-risk entry logged below. |
| T-35-05-SC | Supply chain | accept | No new dependency introduced. |

### Cross-cutting checks (not tied to a single threat ID)

| Check | Result | Evidence |
|---|---|---|
| No `sql.raw` / string concatenation of untrusted data anywhere in the feature | PASS | `grep -rn "sql\.raw"` across `momentum.ts`, `src/lib/momentum/`, `MomentumCard.tsx`, `page.tsx` → no hits. All dynamic SQL fragments (`STAGE_ORDER_ARRAY`, `TO_STAGE_EXPR`, etc.) are built via Drizzle's tagged-template `sql` with bound parameters, never raw string interpolation of caller input. |
| No write path (INSERT/UPDATE/DELETE, migration, new column) | PASS | `grep -rn "\.insert(\|\.update(\|\.delete("` across the feature's non-test files → no hits. `drizzle/` directory's newest migration is `0010_phase34_fiche_client.sql` (phase 34); no phase-35 migration file exists. `src/db/schema.ts` git history's last touch is the phase-34 commit — untouched by phase 35. |
| No leaderboard / ranking / peer-benchmark / team-aggregate surface | PASS | No function anywhere in `src/lib/db/queries/momentum.ts` or `src/lib/momentum/` accepts a cohort, "all owners," or comparison parameter. Dictionary content manually re-checked for comparative vocabulary (see T-35-03-02). |
| `requireUser()` is the first `await` on the page path | PASS | `app/(authed)/page.tsx`: `const { session, role } = await requireUser();` is the first statement inside `HomePage()`, before `getCurrentLang()`, the clock read, or any query. |

## Accepted Risks Log

The following threats carry disposition `accept` per the phase's own threat model. Logged here per the audit's verification requirement for `accept`-dispositioned threats.

| Threat ID | Risk | Why accepted |
|---|---|---|
| T-35-01-02 | Badge thresholds are shared, discoverable constants | Identical for every partner; knowing them discloses nothing about any other partner's book (UI-SPEC § Access & Non-Leakage point 3). |
| T-35-01-SC, T-35-02-SC, T-35-03-SC, T-35-04-SC, T-35-05-SC | Supply-chain risk of new installs | No package-manager install occurred anywhere in this phase; all imports resolve to pre-existing dependencies or workspace modules. |
| T-35-02-06 | `ON DELETE CASCADE` on `relationship_events` can silently drop an already-earned badge's evidence if a client is deleted | Deletion is rare and deliberate; a reversal is neither. Mitigating would require persisting derived state, which D-03/D-23 forbid. |
| T-35-03-06 | `MomentumCard` has no engagement-gated control | Structural: the component has zero buttons/forms by construction, so there is nothing to gate (GAME-05 met by absence, not by a check). |
| T-35-05-06 | Three additional owner-scoped reads add latency to the home page | Reads are parallel (same `Promise.all` round), event volume is near-zero in production per ROADMAP's measured constraint #1. Revisit only if home-page TTFB regresses measurably. |

## Unregistered Flags

No `## Threat Flags` section was found in any of `35-01-SUMMARY.md` through `35-05-SUMMARY.md` (checked all five; none contain that heading). This is recorded as an **absence of the expected signal**, not interpreted as "no new attack surface" — the executor's summaries simply do not use this heading in this project's template. No new attack surface was independently identified during this audit beyond what the threat register already covers: the D-19a concurrent visual redesign (badge rungs, progress tracks, spoken-progress ARIA labels) adds new dictionary keys and new arithmetic (`value / nextThreshold`), but both were checked directly — the arithmetic operates only on the caller's own already-scoped `axis.value`/`tier.threshold`, and the added dictionary keys were manually verified to carry no comparative vocabulary (see T-35-03-02).

## Verdict

21/21 threats closed. 0 open. No implementation gap found in the declared mitigations for data isolation (GAME-04/CRM-02/D-21), the admin gate (D-15), the no-write-path constraint (D-03/D-23), or SQL composition safety. One documentation-drift item is recorded (T-35-03-02's stale key-count tripwire) — not a security gap, since the property it protected is independently covered by a surviving test, but flagged so the plan text is not relied upon in a future audit.
