---
phase: 36-gate-repair-planning-record-hygiene
verified: 2026-09-05T16:29:57Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: n/a
  gaps_closed: []
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Confirm the 2026-09-05 probe run recorded in 36-PROBE-TRANSCRIPT.md happened as written (attempt 3 against the real Neon `development` and `main` pooled endpoints, verdict ISOLATED, exit 0)."
    expected: "Operator confirms the run occurred in their own shell on 2026-09-05 and that the transcript's four output blocks are verbatim."
    why_human: "Requires live Neon credentials for both branches. The verifier deliberately did not connect to production; INFRA-05 forbids reading production from a local machine, and the probe's value is precisely that it is a one-shot operator action. The verdict is operator-attested and cannot be re-derived from the codebase."
  - test: "Decide whether to re-run `npm run probe:write-isolation` with the CURRENT (post-review-fix) `scripts/probe-write-isolation.ts` against the real endpoints, and append the result to 36-PROBE-TRANSCRIPT.md."
    expected: "Either a second ISOLATED verdict from the hardened script, or an explicit operator note in the transcript that the recorded verdict predates the CR-01..CR-04 / WR-01..WR-05 / NEW-01..NEW-05 hardening and is accepted as-is."
    why_human: "The transcript's run (commit e68b3a3) predates all 12 review fixes to the probe. Two of them are material to the verdict's strength: CR-03 (allow-list validated a string the driver does not use — the reviewer's own words were 'producing a false PASS') and NEW-02 (main-side session read-only-ness is now measured in-band rather than assumed). The shipped script has therefore never completed an end-to-end live run. Only the operator can supply the credentials to close this."
---

# Phase 36: Gate Repair & Planning-Record Hygiene — Verification Report

**Phase Goal:** The gates and records that every later phase relies on to prove itself clean become trustworthy again — `lint:check` reports only real findings, no audit re-reports something already resolved, and Phase 29's coverage claim stops being an assertion with no record behind it.
**Verified:** 2026-09-05T16:29:57Z
**Status:** human_needed
**Re-verification:** No — initial verification
**Stance:** Adversarial / goal-backward. Every verdict below was re-derived by the verifier from the codebase, git history, or a command run in this session. SUMMARY.md prose was read only to locate claims to attack, never as evidence.

## Goal Achievement

### Observable Truths

Truths are the five ROADMAP § Phase 36 Success Criteria (the roadmap contract), merged with the six PLANs' `must_haves.truths`. No plan truth reduced roadmap scope.

| # | Truth | Status | Evidence (verifier-derived) |
|---|-------|--------|------------------------------|
| 1 | **SC1 / HOUSE-01** — `lint:check` on a clean tree exits zero, the stray `.claude/worktrees/*` copies contribute nothing, and the recurrence guard is written down | ✓ VERIFIED | `npm run lint:check` → **exit 0**, 4 lines of output (npm banner only), zero findings. `git worktree list` → single entry `/Users/antoinerousseau/Developer/leasetic-calculator [main]`. `.claude/worktrees/` → empty (`ls -la` shows only `.`/`..`). `.git/worktrees` does not exist, so no orphaned worktree metadata survives the code-review agent's temporary worktree. `git diff --stat 84f03e9..HEAD -- eslint.config.mjs` → **empty**, and `git log 84f03e9..HEAD -- eslint.config.mjs` → **no commits**: the file has a literal zero diff across the entire phase, so D-36-01's "close by evidence, change no code" held. The guard the closure note names (`'.claude/**'` at `eslint.config.mjs:44`, inside the global `ignores` array) exists and pre-dates the phase (`git log -S` traces it to `273a066 fix(lint): ignore .claude/** so worktree copies don't break lint:check`). |
| 2 | **SC2 / HOUSE-02** — a milestone audit across `.planning/` reports no open v1.1-era question; the blocks in 06/07/08/31-CONTEXT.md each carry their real status | ✓ VERIFIED | Ran the **real** detector: `auditOpenArtifacts(cwd).items.context_questions` → **`[]`** (read from `.items`, not the vacuous top level). Ran the same detector against a `git archive d92d070^` snapshot of the pre-phase tree in scratchpad → `["31-CONTEXT.md (3)","36-CONTEXT.md (3)"]`. The before/after gate claimed in 36-01-SUMMARY.md is therefore true and independently reproduced. Annotations are real, not scanner-dodges: 31-CONTEXT.md carries five `— RESOLVED 2026-09-02 — see .planning/phases/31-…/31-0N-SUMMARY.md` blocks with substantive one-line outcomes; 08-CONTEXT.md's four `<open_questions>` bullets, 07-CONTEXT.md's two and 06-CONTEXT.md's one each carry an inline RESOLVED/DEFERRED with a full relative ref. Verdicts cross-checked line-by-line against `.planning/STATE.md:369-378` (the v1.1-close resolution table) — every status matches; none invented. |
| 3 | **SC3 / HOUSE-03** — CALC-07 and PROP-01 read `[x]`, and `scripts/seed-partner-launch.ts` is reachable through an npm script | ✓ VERIFIED | All **four** sites flipped: `v1.1-REQUIREMENTS.md:81` `- [x] **CALC-07**`, `:86` `- [x] **PROP-01**`, traceability rows `:283` and `:285` both read `Complete` (not `Partial`). Line `:345` prose reconciled in place: "This is why PROP-01 is marked `[x]` as of 2026-09-05 (Phase 36, HOUSE-03) — this reasoning is reconciled with, not contradicted by, the flip." Nothing swept: `grep -n '\[~\]'` over the whole file returns **exactly one** remaining marker, BOOT-03 at line 24, which is the legitimate one. `package.json:40` → `"db:seed:partner-launch": "tsx -r ./scripts/_preload-mock-server-only.cjs scripts/seed-partner-launch.ts"`, matching the `db:backfill:*` convention at lines 26-27. **Executed** it (see Behavioral Spot-Checks) — the positional argument reaches the script intact. |
| 4 | **SC4 / HOUSE-04** — the dead vendored blocks carry a dated delete decision with rationale, `src/components/blocks/` is gone, `src/components/reui/` untouched | ✓ VERIFIED | `ls -d src/components/blocks` → **No such file or directory**. `ls src/components/reui \| wc -l` → **13** (alert, badge, cascader, data-grid, filters, filters.tsx, frame, gantt, icon-stack, kanban, phone-input, stepper, timeline). Measured figures re-derived from git rather than trusted: `git ls-tree -r --name-only 85c7304^ -- src/components/blocks` → **152 files**; unique first path segments → **25 directories**; `du`-equivalent block allocation → **1,200,128 B = 1.14 MiB**, i.e. the audit doc's **1.1M** is a defensible `du -sh` measurement (raw git byte sum is 794 KiB — the doc quotes the on-disk figure, which is the right one to quote). `docs/design/reui-blocks-audit.md` opens with `> **Decision: DELETED 2026-09-05** (Antoine, 2026-09-05 — D-36-02, Phase 36 HOUSE-04)`, states the measured 25/152/1.1M, explains why the body's 18/104/816K is stale, carries the reinstall command `npx shadcn@latest add @reui/<block-name>`, and records the two inert `eslint.config.mjs` globs as a known residual. `.planning/REQUIREMENTS.md:147-150` § Out of Scope amended in place — it no longer contradicts the deletion. |
| 5 | **SC5 / CLOSE-05** — `29-VALIDATION.md` exists and records Phase 29's Nyquist coverage; INFRA-05's write-isolation is empirically probed or recorded as a final architectural inference with the limitation stated | ✓ VERIFIED (probe verdict operator-attested — see Human Verification) | `.planning/phases/29-migration-safety-net/29-VALIDATION.md` exists, 136 lines, frontmatter `nyquist_compliant: not-derivable`. It does **not** invent retroactive dimensions: it states `workflow.research: false`, that no `29-RESEARCH.md` exists (independently confirmed — no file matching `research` in that directory), that dimensions have no source to derive from, that Phase 29 closed on **5/5 verified must-haves** citing `29-VERIFICATION.md` line 28 by quotation, and classifies the gap explicitly as *measurement, not coverage*. Its Supporting Gates table lists nine npm scripts — **all nine verified present in `package.json`**. `29-VERIFICATION.md` § Known Weak Link carries a dated `### Update 2026-09-05` subsection citing `36-PROBE-TRANSCRIPT.md` by path. `29-SECURITY.md` carries a dated, attributed `## T-29-06 Revisit — 2026-09-05` moving the disposition `accept` → `mitigate — empirically closed` with the residual stated precisely. The v1.6 audit's `nyquist.missing_phases: ["29-migration-safety-net"]` is a file-existence check and now has a real file to stop flagging. |

**Score:** 5/5 truths verified

### Honesty audit of the CLOSE-05 claim (requested scrutiny)

The claim was attacked specifically for overreach. It does not overclaim:

- `36-PROBE-TRANSCRIPT.md` § "What this does and does not prove" names four limits unprompted: one instant, one table (`schema_meta`), pooled endpoints only, no storage-layer/control-plane audit, and explicitly "says **nothing** about the Vercel production runtime's own connection routing beyond the fact that it shares the same `main` endpoint this probe queried."
- `29-VERIFICATION.md`'s update says the previously-unproven item is now "**partially observed**, not fully closed", and re-classifies the residual WARNING → INFORMATIONAL rather than deleting it. It does not claim Phase 29's original criterion ("a write made locally does not appear in the production deployment") is fully satisfied.
- `29-SECURITY.md`'s revisit says "'empirically closed' for the specific claim tested, not a blanket isolation guarantee", preserves the 2026-08-31 acceptance as history, and names the decider and date.
- One wording tension, recorded not blocked: `29-VERIFICATION.md` § Gaps Summary says "this open item was **closed** by a SQL-level sentinel probe", a stronger verb than the "partially observed" used in the detailed section it points to. The sentence immediately qualifies with "The residual is now informational, not a blocker" and cross-links the detail, so a reader is not misled. Also, the truth-4 row at `29-VERIFICATION.md:25` still reads "was **not empirically tested**" — the dated pointer was added at line 28 rather than in the row itself.
- The transcript's structural claims were checked against the script's source, not accepted: the `PASS:` line is emitted only on `mainCount === 0` (`probe-write-isolation.ts:456`); a dev read-back other than `1` takes the `INCONCLUSIVE` branch (`:410-416`); the cleanup-warning string the transcript cites by *absence* still exists verbatim in the current file (WR-01's fix deliberately preserved that wording — `36-REVIEW-FIX.md:225`).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `eslint.config.mjs` | unchanged (D-36-01) | ✓ VERIFIED | Zero diff, zero commits touching it across `84f03e9..HEAD`. Two inert `'src/components/blocks/**'` globs at :37/:139 — known, documented residual. |
| `.planning/phases/31.1-app-shell-refresh/deferred-items.md` | HOUSE-01 closure record in place | ✓ VERIFIED | `**Status: CLOSED 2026-09-05**` at the head of the original finding + a `## Closure — 2026-09-05` section with four labelled facts (a)-(d). Fact (c) names `'.claude/**'` as the pre-existing guard — independently confirmed at `eslint.config.mjs:44`. |
| `.planning/milestones/v1.1-phases/06-auth-shell/06-CONTEXT.md` | Q4 RESOLVED | ✓ VERIFIED | `— RESOLVED 2026-05-08 — see .planning/STATE.md § Decisions Log.` |
| `.../07-calc-engine-port-proposal-form/07-CONTEXT.md` | Q2 + D-2 annotated with full refs | ✓ VERIFIED | Q2's bare `07-UI-SPEC §1.4` upgraded to a full relative path; D-2 bullet gains `— DEFERRED — CUT-06 banner on first admin edit (Phase 10) — see …`. |
| `.../08-persistence-pdf-pipeline/08-CONTEXT.md` | all four `<open_questions>` bullets annotated | ✓ VERIFIED | Q1 RESOLVED (Phase 10 D-10-21), Q3 DEFERRED (→ OPS-04/Phase 39), Q5 DEFERRED (→ OPS-03/Phase 39), Phase-7 carry-over DEFERRED (→ same CUT-06 ref). All four match STATE.md. |
| `.planning/phases/31-.../31-CONTEXT.md` | all five numbered questions annotated | ✓ VERIFIED | Five `— RESOLVED 2026-09-02 — see …-SUMMARY.md` blocks, each with a substantive outcome sentence. |
| `.planning/milestones/v1.1-REQUIREMENTS.md` | 4 flips + line-345 reconciliation | ✓ VERIFIED | See Truth 3. |
| `package.json` | `db:seed:partner-launch` + `probe:write-isolation` | ✓ VERIFIED | Both present; both executed successfully in this session. |
| `docs/design/reui-blocks-audit.md` | dated delete decision, measured figures | ✓ VERIFIED | See Truth 4. Figures re-derived from git, not accepted. |
| `.planning/REQUIREMENTS.md` | § Out of Scope amended + HOUSE-04 figures | ✓ VERIFIED | `:117-121` HOUSE-04 carries 25/152/1.1M and explains the stale 18/816K; `:147-150` carries the dated D-36-02 amendment. |
| `tests/container-radius.test.ts` | dead `blocks` entry removed from `EXCLUDED_DIRS` | ✓ VERIFIED | `const EXCLUDED_DIRS: string[] = [];` — the literal sweep now covers strictly *more* files. Gate widened, not weakened. |
| `tests/server-action-error-contracts.test.ts` | blocks half removed, reui half intact | ✓ VERIFIED | `if (full.includes('components/reui')) continue;` — matches the plan's key-link pattern exactly; strictly fewer files skipped. |
| `scripts/probe-write-isolation.ts` | 525 lines, no env-file read, host allow-list | ✓ VERIFIED | Only imports are `node:crypto` and `postgres`. No `dotenv`, no `import './_load-env'`, no `readFileSync` of any env file — the only `.env` mentions are prose in the header explaining the divergence (`:28-35`). Both endpoint hostnames from `docs/operations/neon-branch-routing.md` present. `min_lines: 100` → 525. |
| `.planning/phases/36-.../36-PROBE-TRANSCRIPT.md` | credential-free run record, ≥25 lines | ✓ VERIFIED | 100+ lines, contains `PROBE_DEV_URL`, records three attempts verbatim, zero connection strings / usernames / passwords / `postgres://` schemes anywhere in the file. |
| `.planning/phases/29-.../29-VALIDATION.md` | real file, ≥60 lines, `nyquist_compliant` | ✓ VERIFIED | 136 lines. See Truth 5. |
| `.planning/phases/29-.../29-VERIFICATION.md` | Known Weak Link updated, cites Phase 36 | ✓ VERIFIED | Dated update subsection; cites `36-PROBE-TRANSCRIPT.md`. |
| `.planning/phases/29-.../29-SECURITY.md` | T-29-06 revisited, dated 2026-09-05 | ✓ VERIFIED | `## T-29-06 Revisit — 2026-09-05`, attributed to Antoine, disposition change explicit. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `08-CONTEXT.md` annotations | `.planning/STATE.md § Deferred Items` | statuses copied from the v1.1-close table | ✓ WIRED | Each of the six annotated bullets across 06/07/08 matches its row in `STATE.md:372-378` in substance and in date. Nothing invented. |
| `31.1-.../deferred-items.md` | `eslint.config.mjs` `.claude/**` | the closure note names the pre-existing guard | ✓ WIRED | `.claude/**` present at `eslint.config.mjs:44`, added by `273a066`, untouched by this phase. |
| `package.json` | `scripts/seed-partner-launch.ts` | `tsx -r ./scripts/_preload-mock-server-only.cjs` | ✓ WIRED | Pattern matches; verified by execution, not by grep. |
| `docs/design/reui-blocks-audit.md` | the deleted tree | reinstall command | ✓ WIRED | `npx shadcn@latest add @reui/<block-name>` present in the decision record. |
| `tests/server-action-error-contracts.test.ts` | `src/components/reui/` | surviving half of the skip condition | ✓ WIRED | `full.includes('components/reui')` present. |
| `scripts/probe-write-isolation.ts` | `schema_meta` (src/db/schema.ts `schemaMeta`) | raw SQL on the `label` column | ✓ WIRED | `INSERT INTO schema_meta (label, note)` / `SELECT count(*)::int … FROM schema_meta WHERE label = ${sentinel}`. |
| `scripts/probe-write-isolation.ts` | `docs/operations/neon-branch-routing.md` | full-hostname allow-list | ✓ WIRED | Both `ep-polished-band-alphc576-pooler.…` and `ep-icy-boat-alx5o1tz-pooler.…` present as exact-match constants; refusal behaviour exercised live (below). |
| `36-PROBE-TRANSCRIPT.md` | `scripts/probe-write-isolation.ts` | records the exact invocation + verdict line | ✓ WIRED | `probe:write-isolation` present; the transcript's `PASS:` / host / sentinel lines match the script's `console.log` statements at `:379-381` and `:456` byte-for-byte in format. |
| `29-VERIFICATION.md` | `36-PROBE-TRANSCRIPT.md` | cites the transcript rather than restating from memory | ✓ WIRED | Full relative path present in the dated update. |
| `29-VALIDATION.md` | `29-VERIFICATION.md` | the 5/5 score is cited, not asserted | ✓ WIRED | Quotes `29-VERIFICATION.md` line 28 verbatim, including its parenthetical caveat. |

### Data-Flow Trace (Level 4)

Not applicable in the usual sense — this phase ships no rendering surface and no dynamic data path. The one executable artifact (`scripts/probe-write-isolation.ts`) has its data flow traced under Probe Execution instead: env vars → URL parse → exact-host allow-list → driver-resolved-host re-check → sentinel INSERT on dev → single counted SELECT on main → guaranteed `finally` DELETE.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Lint gate clean | `npm run lint:check` | exit 0, no findings | ✓ PASS |
| Type gate clean | `npm run typecheck` | exit 0 | ✓ PASS |
| Test suite unchanged after a 152-file drop | `npm run test` | exit 0 — **Test Files 172 passed \| 6 skipped (178)**, **Tests 2320 passed \| 61 skipped (2381)** | ✓ PASS — exactly the stated pre-phase baseline |
| Build gate clean | `npm run build` | exit 0, full route map emitted | ✓ PASS |
| Seed script reachable with args intact | `npm run db:seed:partner-launch -- verifier-probe@test.leasetic.com` | `Expected: CONFIRM=SEED-PARTNER-verifier-probe@test.leasetic.com` / `Got: CONFIRM=(unset)` | ✓ PASS — the positional arg demonstrably reached the script; no DB touched (db import is lazy, after env validation) |
| `mainSql` read-only-ness is greppable | see Anti-Patterns note below | 3 executable lines, 0 write verbs, 1 `.end()` | ✓ PASS |
| No residual `components/blocks` reference | `grep -rn "components/blocks"` over `*.ts/tsx/mjs/json/css` excluding node_modules/.next/.planning | only `eslint.config.mjs:37,139` | ✓ PASS |
| Working tree / worktree cleanliness | `git status --porcelain`, `git worktree list`, `ls .git/worktrees` | clean; single worktree; no `.git/worktrees` dir | ✓ PASS |

### Probe Execution

I ran the probe's own safety gates myself. I deliberately did **not** run it against the live `main` endpoint — INFRA-05's whole point is that production is not read from a local machine, and the live run is by design a one-shot operator action.

| Probe | Command | Result | Status |
|-------|---------|--------|--------|
| No env vars → usage, connects to nothing | `env -u PROBE_DEV_URL -u PROBE_MAIN_URL npx tsx scripts/probe-write-isolation.ts` | exit **1**; usage message naming both expected hostnames; `grep -c 'postgres://\|postgresql://'` on the output → **0** | ✓ PASS |
| Wrong dev hostname → refuse before opening a connection | `PROBE_DEV_URL=postgresql://u:p@evil.example.com/db PROBE_MAIN_URL=<real main host form>` | exit **1**, `ERROR: PROBE_DEV_URL resolves to an unrecognised host: evil.example.com` — hostname only, instant, no socket | ✓ PASS |
| Wrong main hostname, credential-bearing URLs → refuse, no leak | `PROBE_DEV_URL=…u:secretpw@ep-polished-band-alphc576-pooler.… PROBE_MAIN_URL=…u:secretpw@bad.example.com/db` | exit **1**, hostname-only error; `grep -c secretpw` on output → **0** | ✓ PASS |
| npm entry reaches the script | `npm run probe:write-isolation` | tsx loads `scripts/probe-write-isolation.ts` | ✓ PASS |
| Pre-phase HOUSE-02 detector state | detector run against a `git archive d92d070^` snapshot | `["31-CONTEXT.md (3)","36-CONTEXT.md (3)"]` | ✓ PASS (before-state reproduced) |
| Post-phase HOUSE-02 detector state | `auditOpenArtifacts(cwd).items.context_questions` | `[]` | ✓ PASS |
| Live sentinel run against real Neon branches | `PROBE_DEV_URL=… PROBE_MAIN_URL=… npm run probe:write-isolation` | not run by verifier | ? SKIP — routed to Human Verification |

### Requirements Coverage

Every requirement ID declared in the six PLAN frontmatters cross-referenced against `.planning/REQUIREMENTS.md`. All five accounted for; no orphans (`.planning/REQUIREMENTS.md:188` maps exactly HOUSE-01..04 + CLOSE-05 to Phase 36, count 5, and lines 166/179-182 mark all five `Complete`).

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|-------------|--------|----------|
| HOUSE-01 | 36-01 | `lint:check` reports zero errors on a clean tree | ✓ SATISFIED | Truth 1 — closed by evidence with a literal zero code diff, as D-36-01 required |
| HOUSE-02 | 36-01 | A milestone audit no longer re-reports resolved v1.1-era questions | ✓ SATISFIED | Truth 2 — real detector returns `[]`; annotations verified substantive and traced to STATE.md |
| HOUSE-03 | 36-02 | `[~]` markers on CALC-07/PROP-01 read `[x]`; seed script has an npm entry | ✓ SATISFIED | Truth 3 — four sites + prose reconciled; npm script executed |
| HOUSE-04 | 36-03 | Dead vendored ReUI blocks carry a recorded keep-or-delete decision | ✓ SATISFIED | Truth 4 — deletion performed, decision record dated, figures re-derived from git |
| CLOSE-05 | 36-04, 36-05, 36-06 | `29-VALIDATION.md` records Nyquist coverage; INFRA-05 write-isolation probed or recorded as final inference | ✓ SATISFIED | Truth 5 — all three artifacts exist and are honest; probe verdict is operator-attested (Human Verification item 1) |

**Orphaned requirements:** none. No REQUIREMENTS.md entry maps to Phase 36 without a claiming plan.

### Deviation Checks Against 36-CONTEXT.md Decisions

| Decision | Honoured? | Verifier evidence |
|----------|-----------|-------------------|
| D-36-01 — close HOUSE-01 by evidence, change no code; explicitly reject a `.claude/worktrees/**` ignore and a pinning test | ✓ | `eslint.config.mjs` zero diff; `grep -n "worktree"` finds only the pre-existing `.claude/**` comment; no new test file in `tests/` references worktrees or eslint ignores |
| D-36-02 — delete all blocks, keep `src/components/reui/`, state the real figures | ✓ | 25/152 re-derived from git; 13 reui entries intact; audit doc states measured figures and flags the stale ones |
| D-36-03 — probe never reads an env file, main side is a single counted existence check, hostnames only | ✓ | Only `node:crypto`+`postgres` imported; exactly one `mainSql` statement returning `count(*)` + a GUC, zero write verbs; three live refusal runs leaked nothing |
| D-36-04 — do NOT hand-write a retroactive Nyquist validation | ✓ | `29-VALIDATION.md` has `nyquist_compliant: not-derivable` and an explicit refusal-with-reasons; no invented dimensions table anywhere in the file |
| D-36-05 — annotate in place, do not append below; archiving is not a substitute | ✓ | All annotations are inline continuations of the original bullets in all four files |
| D-36-06 — four line edits, not two; state whether line-345 prose is reconciled | ✓ | Lines 81/86/283/285 all flipped; line 345 explicitly reconciled; BOOT-03's `[~]` at line 24 untouched |
| D-36-07 — npm script following the existing convention | ✓ | `db:seed:partner-launch` sits in the `db:*` grouping with the `-r ./scripts/_preload-mock-server-only.cjs` invocation pattern |

### Anti-Patterns Found

Scanned all 35 files touched by `84f03e9..HEAD` (excluding the 152 deleted block files) for `TBD|FIXME|XXX|HACK|PLACEHOLDER|TODO`.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `.planning/ROADMAP.md` | 833, 864, 902, 927 | `**Plans:** TBD` | ℹ️ Info | Structural placeholders for unplanned phases 37-40. **Pre-existing** — `git diff 84f03e9..HEAD \| grep '^+' \| grep TBD` returns nothing, so this phase introduced none of them. Not a debt marker in this phase's work. |
| `.planning/STATE.md`, `07-CONTEXT.md`, `08-CONTEXT.md` | various | `TODO` / `PLACEHOLDER` inside historical prose | ℹ️ Info | All are quotations of 2026-05-era source comments inside decision-log narrative. All pre-existing lines; none added by this phase. |
| `.planning/phases/29-.../29-VERIFICATION.md` | 77 | `TODO\|FIXME\|XXX\|HACK\|PLACEHOLDER` | ℹ️ Info | The scan *pattern* quoted in Phase 29's own anti-pattern section. False positive. |
| `eslint.config.mjs` | 37, 139 | two inert `'src/components/blocks/**'` globs | ⚠️ Warning (accepted) | Deliberate — the file is read-only for this phase per D-36-01, and the residual is recorded in `docs/design/reui-blocks-audit.md`'s decision record. Match nothing; no behavioural effect. |

**Code files (`scripts/probe-write-isolation.ts`, `package.json`, both test files): zero debt markers of any kind.** No blocking debt-marker gate violation.

### Verification of the known `mainSql` measurement-gap claim

The handover asked me to verify the reasoning rather than accept it. Re-derived independently:

```
grep -c "mainSql" scripts/probe-write-isolation.ts                        → 8
grep -v "^[[:space:]]*\*"        … | grep -c "mainSql"                    → 4   (plan 36-04's criterion)
grep -v -E "^[[:space:]]*(\*|//)" … | grep -c "mainSql"                   → 3   (both comment forms stripped)
grep -c "mainSql.end(" …                                                  → 1
write verbs on a mainSql template literal                                 → 0
```

The four surviving lines under the plan's criterion are 400, 427, 433, 508. Line 427 is `      // Still exactly ONE statement on \`mainSql\`, still returning a count and a` — a `//` comment added by the NEW-02 fix. The three executable lines are exactly the contracted set: **400** (`const mainSql = await openClient(…)`), **433** (the single `SELECT count(*)::int AS n, current_setting('transaction_read_only') AS ro FROM schema_meta WHERE label = ${sentinel}`), **508** (`await mainSql.end({ timeout: 5 })`). **The reasoning in `36-REVIEW-FIX.md` is correct — this is a measurement gap in the acceptance criterion's regex, not drift in the code.** Not reported as a finding, per instruction, and independently confirmed rather than taken on trust.

### Findings

**W-01 (Warning — human decision requested): the recorded probe verdict predates every hardening fix to the probe.**
`36-PROBE-TRANSCRIPT.md`'s attempt 3 was committed at `e68b3a3`. All twelve review fixes to `scripts/probe-write-isolation.ts` (`c9cf981`, `60f803f`, `8bf1ab9`, `13695d6`, `f8a8789`, `999bda3`, `06e3b7a`, `4cfd5b7`, `1d8d7af`, `01f1332`, `23737cc`, `357dad1`) land **after** it — `git diff --stat e68b3a3..HEAD -- scripts/probe-write-isolation.ts` shows **+331/−29**. Two are material to how strongly the verdict reads:
- **CR-03**, which the reviewer described as allowing "a URL [to] pass the allow-list and connect somewhere else entirely, producing a **false `PASS`**". The run that produced the ISOLATED verdict used the pre-CR-03 code, which validated the URL string but never asserted the driver-resolved host.
- **NEW-02**, which now measures the `main` session's `transaction_read_only` in-band. At run time the main-side session was an ordinary read-write session issuing a `SELECT`; the read-only guarantee the shipped script advertises was not in force during the recorded run.

Mitigating facts, stated so the operator can weigh this fairly: the success-path console output is byte-identical between the two revisions (`console.log` at `:145-147/:176` then vs `:379-381/:456` now), so the transcript is not internally inconsistent with the current code; the isolation observation itself is unaffected by either fix; CR-03's false-PASS mode requires a deliberately-crafted URL (a `host=`/`options=` override), not a URL pasted from the Neon console; and the current script fails **closed** on both paths, so it cannot silently reproduce a false PASS. Neither `36-PROBE-TRANSCRIPT.md`, `29-VERIFICATION.md` nor `29-SECURITY.md` records this ordering. **Not a blocker** — the must-have ("the probe has been run once … verdict recorded") is literally and substantively satisfied — but it is the one residual the phase's own artifacts do not state.

**W-02 (Warning — informational): SC2's detector clearance is partly vacuous for three of the four files.**
`scanContextQuestions` only walks `<planDir>/phases/*`. `06/07/08-CONTEXT.md` moved to `.planning/milestones/v1.1-phases/` during the 2026-09-05 cleanup, **before** this phase, so the detector never saw them and would return `[]` for them whether or not they were annotated. The phase does not lean on that: D-36-05 anticipated exactly this ("archiving is not accepted as a substitute for annotating"), and I confirmed all seven bullets across those three files carry real inline statuses traced to STATE.md. Recording it so a future reader does not mistake the empty detector result for proof about those three files. Similarly, `31-CONTEXT.md`'s detector clearance comes from the heading retitle, not the annotations — but the retitle is honest (the questions are no longer open) and the annotations are the substance.

**I-01 (Info): three unrelated open artifacts remain in the audit.**
`auditOpenArtifacts` still reports `uat_gaps: 1` (`30-UAT.md`, status `testing`, 4 open scenarios) and `verification_gaps: 2` (`31.1-VERIFICATION.md` and `33-VERIFICATION.md`, both `human_needed`). None are CONTEXT open questions, so none are in HOUSE-02's scope; they belong to Phases 37/40. Not a Phase 36 gap.

**I-02 (Info): two small wording/consistency items in `29-VERIFICATION.md`.** The Gaps Summary uses "closed" where the detailed section says "partially observed"; and the truth-4 table row at line 25 still reads "not empirically tested" with the correction added at line 28 rather than in the row. Both are cross-linked and non-misleading.

### Human Verification Required

#### 1. Confirm the recorded live probe run

**Test:** Confirm that the run recorded in `.planning/phases/36-gate-repair-planning-record-hygiene/36-PROBE-TRANSCRIPT.md` happened as written — attempt 3, on 2026-09-05, in your own shell, against the real Neon `development` (`ep-polished-band-alphc576-pooler…`) and `main` (`ep-icy-boat-alx5o1tz-pooler…`) pooled endpoints — and that the four quoted output blocks are verbatim.
**Expected:** Verdict `ISOLATED`, exit `0`, sentinel `isolation-probe-36-a72d43b9-7b3d-44c6-bab2-19a6b588665a` absent from `main`, no `WARNING: cleanup deleted N row(s)` line.
**Why human:** Requires live credentials for both Neon branches. I deliberately did not connect to production — INFRA-05 forbids exactly that, and re-running would defeat the constraint the probe exists to honour. Everything *around* the verdict (the script's safety gates, the transcript's internal consistency with the script's source, the credential-freeness of the file) I verified myself; the verdict itself is operator-attested and cannot be re-derived from the codebase.

#### 2. Decide what to do about W-01

**Test:** Either re-run `npm run probe:write-isolation` with the current, hardened script and append the result to `36-PROBE-TRANSCRIPT.md`, or add one sentence to the transcript recording that the ISOLATED verdict was produced before the CR-01..CR-04 / WR-01..WR-05 / NEW-01..NEW-05 fixes and is accepted as-is.
**Expected:** Either a second `ISOLATED` / exit 0 from the shipped script, or an explicit dated acceptance note.
**Why human:** Needs live credentials for both branches. Note the re-run has a real chance of *not* reproducing exit 0: NEW-02 now refuses to certify if the pooled `main` endpoint discards the `default_transaction_read_only` startup parameter (a pgbouncer-family pooler can do this silently). That refusal would be the guard working correctly, not a regression — the script's error text already tells you to use the non-pooled endpoint. This is a bounded, honest choice, which is why it goes to you rather than being decided here.

### Gaps Summary

**No blocking gaps.** All five ROADMAP success criteria are achieved and all five requirement IDs are satisfied. The phase's central claim — that its own gates and records are now trustworthy — survives adversarial checking better than most: the three things it set out to fix were each re-derived independently rather than read from a summary. `lint:check` genuinely exits 0 with `eslint.config.mjs` carrying a literal zero diff, which is the strongest possible form of "closed by evidence, not by a change". The real audit detector genuinely returns `[]` from `.items.context_questions`, and I reproduced its non-empty pre-phase state from a git snapshot to confirm the change is causal rather than coincidental. The four annotated CONTEXT files tell the truth to a human reader and their verdicts match `STATE.md`'s resolution table line for line. The 25/152/1.1M figures are correct against git, not copied from a stale audit. `29-VALIDATION.md` refuses to fabricate a Nyquist table and says so in plain language, which is the outcome D-36-04 asked for.

Two items go to the operator. The first is structural: the live probe verdict is human-attested by construction and I declined to re-run it against production. The second is the one thing the phase's own artifacts do not record — that the transcript's ISOLATED verdict was produced by a revision of `scripts/probe-write-isolation.ts` that the code review subsequently found capable of a false `PASS` (CR-03) and that did not yet measure the main session's read-only-ness (NEW-02). The observation is almost certainly sound and the current script fails closed, so this is a documentation-completeness residual rather than a defect — but it is exactly the class of "claim with slightly less behind it than the wording implies" that this phase exists to eliminate, so it belongs in the record rather than in a verifier's private notes.

Test baseline is unchanged at **2320 passed / 61 skipped** despite 152 files being deleted, and `typecheck`, `lint:check` and `build` all exit 0. The tree is clean, there is exactly one git worktree, and `.git/worktrees` does not exist.

---

_Verified: 2026-09-05T16:29:57Z_
_Verifier: Claude (gsd-verifier)_
