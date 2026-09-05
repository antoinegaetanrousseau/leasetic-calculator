# Phase 36: Gate Repair & Planning-Record Hygiene - Context

**Gathered:** 2026-09-05
**Status:** Ready for planning
**Amended:** 2026-09-05 — three figures corrected against the live tree after pattern mapping (block count, open-question shapes, marker line numbers). See `36-PATTERNS.md`.

<domain>
## Phase Boundary

The gates and records that every later v1.8 phase relies on to prove itself clean become
trustworthy. Nothing user-facing ships. Scope is exactly HOUSE-01, HOUSE-02, HOUSE-03,
HOUSE-04 and CLOSE-05 from `.planning/REQUIREMENTS.md`.

**Not in this phase:** any product capability, any UI surface, any schema change. The other
v1.8 phases (37 CRM stack, 38 shell/dialogs, 39 operational gates, 40 record closure) own
their own areas — do not reach into them.

</domain>

<decisions>
## Implementation Decisions

### HOUSE-01 — Lint gate

- **D-36-01: HOUSE-01 is already satisfied. Record it closed; change no code.**
  Verified during this discussion on 2026-09-05:
  - `npm run lint:check` (`eslint . --max-warnings=0`) exits `0` with no output.
  - `git worktree list` reports only `/Users/antoinerousseau/Developer/leasetic-calculator [main]`.
  - `.claude/worktrees/` exists but is **empty** (mtime `Sep 3 00:28`) — someone removed
    `inspiring-benz-337233/` and `recursing-jang-941dda/` the same night Phase 31.1 filed
    the note describing them.

  The requirement's criterion is "`lint:check` reports zero errors on a clean tree", and it
  does. **Explicitly rejected:** adding `.claude/worktrees/**` to `eslint.config.mjs`
  `ignores`, and adding a test pinning that entry. The plan must NOT add either — the phase
  closes this requirement with evidence, not with a change.

### HOUSE-04 — Vendored ReUI blocks

- **D-36-02: Delete all 18 dead vendored blocks at `src/components/blocks/`.**
  This supersedes the provisional "Delete nothing yet" of 2026-08-31. The rationale is the
  audit doc's own: reinstall is one command (`npx shadcn@latest add @reui/<block-name>`),
  so there is no cost to deleting and no value in keeping one "just in case" beyond the
  note already written in `docs/design/reui-blocks-audit.md`.
  - Scope of deletion: `src/components/blocks/` only — **25 block directories, 152 files,
    1.1M** (verified 2026-09-05), zero imports from anywhere outside that directory.
    **The audit doc's "18 blocks / 104 files / 816K" is stale**: it was written 2026-08-31,
    before Phase 34 plan 34-03 vendored seven more (`solution-crm-1`…`solution-crm-6`,
    `solution-users-2`). All seven are equally unimported, so deletion stays safe — but the
    decision record must state the real figures, not the audit's.
  - Two test files reference the directory as an **exclusion path**, not an import:
    `tests/container-radius.test.ts:72` (`EXCLUDED_DIRS`) and
    `tests/server-action-error-contracts.test.ts:45` (a `full.includes(...)` skip). Neither
    breaks when the directory disappears, but both become dead references — remove the
    `blocks` entry from each, keeping the `components/reui` half of the second one intact.
  - **`src/components/reui/` is NOT touched.** Those are live primitives (`alert`, `badge`,
    `cascader`, `data-grid`, `filters`, `frame`, `gantt`, `icon-stack`, `kanban`,
    `phone-input`, `stepper`, `timeline`) and several are wired into shipped surfaces.
  - `docs/design/reui-blocks-audit.md` is kept and gains a dated decision record at its head
    stating the blocks were deleted on this date, by whose decision, and the one-line
    reinstall command. The mapping, the two structural constraints and the mis-picks stay —
    that record is the whole reason deletion is safe.
  - Verify zero imports before deleting, then run `typecheck`, `lint:check`, `test` and
    `build` after. A drop of 104 files must not move any of those.

### CLOSE-05 — Phase 29's evidentiary gaps

- **D-36-03: Settle INFRA-05 write isolation with a SQL-level sentinel probe.**
  The original probe (ISOLATION-PROBE-29) was not merely skipped — it was attempted and
  **blocked**: app-level login against the `development` branch fails
  (`[Better Auth]: Invalid password`) because that branch is a copy-on-write fork frozen at
  2026-05-27, so its credential hashes predate every rotation since. A SQL-level probe never
  touches Better Auth, so the blocker does not apply.

  Shape: write a sentinel row carrying a fresh UUID to the `development` branch with a raw
  client, confirm it is absent from `main`, delete the sentinel.

  **Mandatory constraints on the probe — these are the reason it is safe to run at all:**
  - Connection strings are passed **explicitly and inline**. The probe must never read
    `.env.local`, and must never `source` any env file (same reasoning as
    `scripts/check-local-db-branch.sh`'s own security note).
  - The `main`-branch step is a single existence check — `SELECT count(*) ... WHERE
    <sentinel column> = '<uuid>'` — returning a count, never rows. **No customer data is
    read.** Reading production from a local machine is the exact thing INFRA-05 forbids;
    the probe is allowed only because it reads nothing but its own sentinel's absence.
  - The sentinel is written to a table where a stray row is harmless, and is deleted in the
    same run. Nothing is left behind on `development`.
  - Never print a full connection string, username or password to stdout — hostnames only.
  - `.env.test.local` already holds `development`-branch credentials for the integration
    suite and is the natural source for the dev side.

  Whatever the outcome, record it in Phase 29's artifacts: update
  `29-VERIFICATION.md`'s "Known Weak Link" section, and revisit T-29-06 in `29-SECURITY.md`
  (currently `accept`) in light of the observed result.

- **D-36-04: Do NOT hand-write a retroactive Nyquist validation for Phase 29.**
  Record instead *why* it is not derivable: Phase 29 ran with `workflow.research: false` and
  produced no `29-RESEARCH.md`, and `VALIDATION.md` derives its dimensions from `RESEARCH.md`.
  State that the phase closed on 5/5 verified must-haves instead, and that this is a
  measurement gap rather than a coverage gap. The note must be written so the v1.6 audit's
  `nyquist.missing_phases` finding stops recurring.

### HOUSE-02 / HOUSE-03 — Stale planning markers

- **D-36-05: Annotate in place. Do not append notes below the originals.**
  Each stale `<open_questions>` entry is edited so it carries its real status inline —
  `RESOLVED <date> — see <full relative ref>` or `DEFERRED — see <full relative ref>` — using
  the resolutions already traced in `.planning/STATE.md` § Deferred Items. The file should
  tell the truth to a human reader, not merely fall outside a scanner's path.

  Four files, and **they use three different shapes** — verified 2026-09-05, do not assume
  a uniform `<open_questions>` tag: `08-CONTEXT.md` has a real `<open_questions>` XML block
  (4 bullets, not 3); `06-CONTEXT.md` and `07-CONTEXT.md` use an Open-questions markdown heading
  nested inside `<canonical_refs>`; `31-CONTEXT.md` has **5** questions under a markdown
  heading inside its `<deferred>` block, with no `<open_questions>` tag at all. Note that 06/07/08
  moved into `.planning/milestones/v1.1-phases/` during the 2026-09-05 cleanup; only
  `31-CONTEXT.md` is still under `.planning/phases/`. Archiving is **not** accepted as a
  substitute for annotating — the questions are stale wherever they sit.

- **D-36-06: Flip the two `[~]` markers to `[x]` in the same in-place manner**, naming the
  phase that resolved each: CALC-07 and PROP-01 in
  `.planning/milestones/v1.1-REQUIREMENTS.md`, both satisfied by Phase 8 work.
  **Four line edits, not two** (verified 2026-09-05): the requirement bodies at lines 81 and
  86, and the traceability rows at lines 283 (CALC-07) and **285** (PROP-01) which repeat
  "Partial" independently. Line 345 additionally carries prose arguing PROP-01's partial
  status — the plan must state explicitly whether that prose is reconciled or left as a
  historical note.

- **D-36-07: Give `scripts/seed-partner-launch.ts` an npm script**, following the existing
  naming convention in `package.json` (`db:backfill:coefficient-history`,
  `db:backfill:partner-type`, `smoke:ovh`, `check:local-db-branch`) and the existing
  `tsx -r ./scripts/_preload-mock-server-only.cjs` invocation pattern.

### Claude's Discretion

- The exact npm script **name** for the seed script (`db:seed:partner-launch` fits the
  established `db:*` grouping).
- The exact **wording** of each in-place annotation, so long as it names a status, a date
  where one exists, and a full relative path to the resolving reference.
- **Where the Phase 29 Nyquist note lives.** Writing it as
  `.planning/phases/29-migration-safety-net/29-VALIDATION.md` — a real file whose body
  explains non-derivability — is preferred, because the audit's finding is a
  file-existence check and a note filed elsewhere will not clear it.
- Which table the sentinel row is written to, and the sentinel column/value shape, subject
  to the constraints in D-36-03.
- Whether the probe ships as a repeatable `scripts/` entry or a one-shot documented run.
  A repeatable script is preferred only if it can carry the D-36-03 constraints safely in
  code; a one-shot with its transcript recorded in the Phase 29 artifacts is acceptable.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` § Phase 36: Gate Repair & Planning-Record Hygiene — goal, the five
  success criteria, and the dependency statement that later phases close against this gate
- `.planning/REQUIREMENTS.md` § Housekeeping (HOUSE-01..04) and § Closure & Verification
  Debt (CLOSE-05) — the requirement text each criterion traces to

### HOUSE-01 — lint gate origin
- `.planning/phases/31.1-app-shell-refresh/deferred-items.md` — the note that created this
  requirement; describes the two stray worktrees and offers both remedies
- `eslint.config.mjs` — three separate `ignores` arrays; read before asserting anything
  about what is or is not excluded

### HOUSE-02 / HOUSE-03 — stale markers
- `.planning/STATE.md` § Deferred Items — the authoritative trace of what each stale
  CONTEXT question actually resolved to, including the v1.1-close table mapping every one
  of 06/07/08's questions to a RESOLVED or DEFERRED outcome
- `.planning/milestones/v1.1-phases/06-auth-shell/06-CONTEXT.md` — Q4, auth library pinning
- `.planning/milestones/v1.1-phases/07-calc-engine-port-proposal-form/07-CONTEXT.md` — Q2, D-2
- `.planning/milestones/v1.1-phases/08-persistence-pdf-pipeline/08-CONTEXT.md` — Q1, Q3, Q5
- `.planning/phases/31-reconciliation-engine-proposal-extraction/31-CONTEXT.md` — 3 open Qs
- `.planning/milestones/v1.1-REQUIREMENTS.md` lines 81, 86, 283 — the CALC-07 and PROP-01
  `[~]` markers and the traceability row that repeats the partial status
- `package.json` § scripts — the naming and invocation pattern the new script must follow

### HOUSE-04 — ReUI blocks
- `docs/design/reui-blocks-audit.md` — the full audit: 18 blocks, 104 files, 816K, zero
  imports; the reinstall command; the two structural constraints (Frame vs Card); the
  mis-picks; and the closing recommendation naming `auth-1` and `wizard-1`. This file is
  kept, not deleted — it is what makes deletion reversible.

### CLOSE-05 — Phase 29 evidentiary gaps
- `.planning/phases/29-migration-safety-net/29-VERIFICATION.md` § "Known Weak Link —
  INFRA-05 Evidentiary Basis" — the honest account of why the probe never completed
- `.planning/phases/29-migration-safety-net/29-SECURITY.md` — T-29-06, re-classified
  `mitigate` → `accept` by the plan owner; revisit after the probe
- `.planning/v1.6-MILESTONE-AUDIT.md` — `tech_debt` for phase 29 (ISOLATION-PROBE-29, no
  VALIDATION.md, no VERIFICATION.md) and `nyquist.missing_phases`
- `scripts/check-local-db-branch.sh` — the existing guard; its header documents the security
  rules the sentinel probe must also honour (hostname-only output, never `source` an env file)
- `docs/operations/neon-branch-routing.md` — the branch/endpoint table; `development` is
  `ep-polished-band-alphc576-pooler`, `main` (production) is `ep-icy-boat-alx5o1tz-pooler`
- `.planning/milestones/v1.6-REQUIREMENTS.md` line 53 — INFRA-05's exact wording, including
  the "locked rule 3 is NOT relaxed" clause

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/check-local-db-branch.sh` — a working model for the sentinel probe's safety
  posture: parses `.env.local` as plain text rather than sourcing it, prints hostnames only,
  matches full hostnames rather than prefixes. Reuse the posture, not the file.
- `.env.test.local` — already holds `development`-branch credentials, gitignored, mode 600,
  and is consumed by the integration suite. The natural dev-side source for the probe.
- `package.json` scripts — `db:backfill:*`, `smoke:ovh`, `check:local-db-branch` establish
  both the naming grouping and the `tsx -r ./scripts/_preload-mock-server-only.cjs` pattern.

### Established Patterns
- **Deletion is safe only because the record survives.** `docs/design/reui-blocks-audit.md`
  is the precedent: audit first, record the mapping, then delete. Keep that order.
- **`src/components/reui/` vs `src/components/blocks/` is the live/dead boundary.** Blocks
  are dead; reui primitives are wired. A plan that confuses the two breaks shipped surfaces.
- **Gates are pinned by tests in this repo** (`tests/radius-scale.test.ts`,
  `tests/server-action-error-contracts.test.ts`, the ADMIN-09 19-gate grep suite). D-36-01
  deliberately declines to add one here; that is a scoped exception, not a new convention.

### Integration Points
- CI (`.github/workflows/ci.yml`) runs `lint:check`, `typecheck`, `test` and `build`. The
  block deletion touches all four; nothing else in this phase touches code.
- Nothing in this phase touches `app/`, `src/lib/`, the schema, or any migration.

</code_context>

<specifics>
## Specific Ideas

- The probe's value is precisely that it proves what 2,320 tests cannot. Phase 35's own
  lesson applies directly: *a mocked test proves a WHERE clause was composed, never that it
  filters*. INFRA-05 has the same shape — endpoint separation is composition; a sentinel
  that fails to appear in `main` is the filter.
- HOUSE-01's outcome is worth stating plainly in the phase summary: a requirement written
  from a three-day-old deferral note described a condition that no longer held. That is an
  argument for scouting before planning, and it belongs in the record.

</specifics>

<deferred>
## Deferred Ideas

None — the discussion stayed inside the phase boundary. No new capability was proposed.

Adjacent items deliberately left to their own v1.8 phases: the `/proposals/[id]` admin
bypass and Phase 34's missing artifacts (Phase 37), the dark-theme and dialog work
(Phase 38), the credential and operational gates (Phase 39), and the v1.6 formal close plus
the phases 28-35 archive (Phase 40).

</deferred>

---

*Phase: 36-gate-repair-planning-record-hygiene*
*Context gathered: 2026-09-05*
