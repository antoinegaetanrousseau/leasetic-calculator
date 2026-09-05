---
phase: 29
slug: migration-safety-net
status: approved
nyquist_compliant: not-derivable
wave_0_complete: true
created: 2026-09-05
reconstructed: true
reconstructed_by: Phase 36 / CLOSE-05 / D-36-04
---

# Phase 29 — Validation Strategy (Reconstructed)

> Per-phase validation contract for feedback sampling during execution.

Reconstructed from artifacts (State B — no prior `29-VALIDATION.md` existed). Read in full to
produce this file: `29-01-PLAN.md`, `29-01-SUMMARY.md`, `29-02-PLAN.md`, `29-02-SUMMARY.md`,
`29-VERIFICATION.md`, `29-SECURITY.md`, `29-REVIEW.md`, `29-REVIEW-FIX.md`, `29-UAT.md`. Written
2026-09-05, under Phase 36 plan 36-06 (CLOSE-05, D-36-04) — the audit's `nyquist.missing_phases`
finding is a file-existence check against Phase 29's own directory, so this file lives here rather
than anywhere in Phase 36.

---

## Why the Nyquist dimensions are not derivable

This is the substance of D-36-04, and it is written in the house honest-failure register: state
the weaker claim that IS supported, state precisely what is NOT proven, name why, classify the
gap explicitly.

- Phase 29 ran with `workflow.research: false` (confirmed by the absence of any `29-RESEARCH.md`
  in this directory — there is no plan, summary, or config artifact that names one).
- A GSD `VALIDATION.md` derives its sampling dimensions — the axes a Nyquist-style coverage table
  samples across — from `RESEARCH.md`. With no `29-RESEARCH.md`, those dimensions have no source
  to derive from.
- Therefore this file does **not** hand-write a retroactive Nyquist validation. Inventing sampling
  dimensions after the fact, nine days after the phase closed, would fabricate a record of a
  planning process that never happened. A fabricated record is strictly worse than a missing one:
  a missing file is an honest gap; a backfilled dimensions table would misrepresent how Phase 29
  was actually planned and verified.
- What the phase DID close on, as the substitute evidence: **5/5 verified must-have truths**,
  per `29-VERIFICATION.md` line 28 — `**Score:** 5/5 truths verified (truth 4 verified on the
  narrower, architecturally-inferred basis described below, ...)`. Truth 4's narrower basis was
  itself revisited on 2026-09-05 by the Phase 36 sentinel probe; see `29-VERIFICATION.md`'s
  `### Update 2026-09-05` subsection under "Known Weak Link" for the outcome (verdict ISOLATED),
  and this same date's revisit of T-29-06 in `29-SECURITY.md`.
- **Classification: this is a measurement gap, not a coverage gap.** No requirement went
  unverified — INFRA-04, INFRA-05 and INFRA-06 are all covered in `29-VERIFICATION.md`'s
  Requirements Coverage table, and all three plans' must-have truths scored 5/5. What is missing
  is the *record* of the sampling frame that would let a future auditor reconstruct which axes
  were deliberately tested versus incidentally covered — and that frame never existed to be
  recorded, because the phase's `workflow.research` flag was off. The distinction matters: a
  coverage gap means something was never checked; a measurement gap means it was checked, but the
  checking process left no dimensional trace behind.

---

## Supporting gates

Verified present in `package.json` at time of writing (2026-09-05). Gates marked **(Phase 29)**
were created by this phase's own plans; the rest predate it.

| Gate | Command | Origin |
|------|---------|--------|
| Types | `npm run typecheck` | pre-existing |
| Lint (zero-warning) | `npm run lint:check` | pre-existing |
| Migration ↔ journal parity | `npm run check:migration-journal-sync` | **(Phase 29, plan 29-01)** |
| `drizzle-kit push` ban (BOOT-09/10) | `npm run check:no-drizzle-push` | pre-existing |
| DB smoke filter anti-rot | `npm run check:db-smoke-filter` | **(Phase 29, plan 29-01)** |
| Vercel-only import ban | `npm run check:no-vercel-imports` | pre-existing |
| v10 localStorage ban (CUT-03) | `npm run check:no-v10-localstorage` | pre-existing |
| Seed SQL parity | `npm run check:seed-sql` | pre-existing |
| Local DB branch safety | `npm run check:local-db-branch` | **(Phase 29, plan 29-02)** |

Three of the nine gates — `check:migration-journal-sync`, `check:db-smoke-filter`,
`check:local-db-branch` — were shipped BY Phase 29 itself, not merely used by it. They are the
phase's own deliverables, independently verified live in `29-VERIFICATION.md`'s "Required
Artifacts" and "Probe / Behavioral Verification" tables.

---

## Per-plan automated verification

### 29-01 — Migration Safety Net (CI gates)

| Task | Automated verification | Result |
|------|------------------------|--------|
| Task 1: Journal/SQL parity gate | `npm run check:migration-journal-sync && touch drizzle/9999_zz_orphan_probe.sql && ! npm run check:migration-journal-sync` (orphan-file negative probe, self-cleaning) | ✅ per 29-01-SUMMARY.md, independently reproduced by 29-VERIFICATION.md |
| Task 2: Anti-rot filter guard | `bash -n scripts/check-db-smoke-filter.sh && ! npm run check:db-smoke-filter` (syntax check + fail against pre-fix `ci.yml`) | ✅ per 29-01-SUMMARY.md |
| Task 3: Rewire `ci.yml` + scenario matrix | `npm run check:db-smoke-filter && npm run check:migration-journal-sync && npm run check:no-drizzle-push && grep -q "drizzle/\*\.sql" .github/workflows/ci.yml && ! grep -q "drizzle/migrations" .github/workflows/ci.yml` | ✅ per 29-01-SUMMARY.md |

### 29-02 — Local Neon Branch Isolation

| Task | Automated verification | Result |
|------|------------------------|--------|
| Task 1: Mandate development branch + local guard | `bash -n scripts/check-local-db-branch.sh && npm run check:no-drizzle-push && grep -q "ep-polished-band-alphc576-pooler" .env.example && ! grep -q "any of the three pooled URLs works" .env.example` | ✅ per 29-02-SUMMARY.md |
| Task 2: Antoine repoints `.env.local` (`checkpoint:human-verify`, `gate="blocking"`) | `npm run check:local-db-branch` | ✅ exit 0, `OK: local DATABASE_URL → Neon development branch (...)` — the human-action half of this task (editing `.env.local` itself) had **no** automated verification by construction; only the resulting state was checked |

No task in either plan lacked automated verification of its resulting on-disk state; Task 2 of
29-02 is the one case where the *action itself* (a human editing a gitignored file) was
necessarily manual, stated plainly rather than omitted.

---

## Manual-only

| Item | Why manual | Outcome |
|------|-----------|---------|
| ISOLATION-PROBE-29 (app-level write-then-check via a `development`-branch admin login) | Requires an authenticated Better Auth session against the `development` branch | Blocked — `[Better Auth]: Invalid password` (×4); the branch is a copy-on-write fork frozen at 2026-05-27, predating every password rotation since. Never completed under this name. |
| Its Phase 36 successor — SQL-level sentinel probe (D-36-03) | Requires a live Neon connection string supplied by the operator; the probe itself is scripted (`scripts/probe-write-isolation.ts`) but its real run needed a human to supply both pooled URLs | Run 2026-09-05, verdict **ISOLATED**, exit 0 — see `.planning/phases/36-gate-repair-planning-record-hygiene/36-PROBE-TRANSCRIPT.md` and `29-VERIFICATION.md`'s `### Update 2026-09-05` subsection |

---

## Validation Sign-Off

- [ ] All requirements have automated verification — **not fully true**: INFRA-04/05/06 all have
      automated *artifact* verification (guard scripts, CI wiring), but INFRA-05's strongest claim
      (empirical write-isolation) required the manual probe above; that gap is now closed by the
      Phase 36 sentinel probe, not by an automated test in this phase's own suite.
- [x] Wave 0 covers all MISSING references — existing infrastructure (bash, `package.json`
      scripts convention) sufficed; no new test framework or tooling was installed.
- [x] No watch-mode flags used in any gate command.
- [ ] Feedback latency < 15 s — not measured; Phase 29 predates this project's latency-tracking
      convention (first seen in `30-VALIDATION.md`).
- [x] `nyquist_compliant: not-derivable` set in frontmatter, honestly, rather than `true` (unearned)
      or `false` (misrepresents a measurement gap as a coverage failure).

**Approval:** approved 2026-09-05 (reconstruction), citing 5/5 verified must-haves in
`29-VERIFICATION.md` and the T-29-06 revisit in `29-SECURITY.md` dated the same day.

> Scope note: this artifact certifies **automated requirement coverage** to the extent it is
> reconstructible from Phase 29's own plans, summaries, verification and security artifacts. It is
> a **reconstruction**, not a contemporaneous plan — Phase 29 shipped 2026-08-31 with
> `workflow.research: false`, and this file was written 2026-09-05 under Phase 36 CLOSE-05 /
> D-36-04 specifically to give the v1.6 audit's `nyquist.missing_phases` finding a real file to
> stop flagging, without inventing a planning history that did not occur.
