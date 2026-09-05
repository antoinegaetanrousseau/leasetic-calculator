# Phase 36: Gate Repair & Planning-Record Hygiene - Pattern Map

**Mapped:** 2026-09-05
**Files analyzed:** 10 units of work (1 deletion, 2 creations, 7 modifications)
**Analogs found:** 9 / 10

> This phase ships almost no application code. For the planning-record edits (items 5–7 below)
> the "pattern" that matters is the **literal current text shape** of the target, so the planner
> can specify an exact-match edit rather than a vague instruction. Those excerpts are verbatim.

---

## Corrections to CONTEXT.md (read these before planning)

Three counts / references in `36-CONTEXT.md` do not match the tree as it stands on 2026-09-05.
The planner must use the measured values, not the CONTEXT values.

| CONTEXT says | Measured on 2026-09-05 | Consequence |
|---|---|---|
| `src/components/blocks/` = **18 blocks, 104 files, 816K** (D-36-02) | **25 directories, 152 files, 1.1M** | The 2026-08-31 audit predates Phase 34 plan 34-03, which vendored 7 more blocks: `solution-crm-1` … `solution-crm-6` and `solution-users-2`. All 7 are equally unimported. The deletion is bigger than the decision text says; the audit's decision-record prepend must state the *real* number or it will read as false to a future auditor. |
| `31-CONTEXT.md` has **3** open questions | **5** open questions, and they live under a `## Open Questions (recorded, not guessed)` heading **inside the `<deferred>` block** (line 215), not inside an `<open_questions>` tag | Q3 (engine granularity) and Q5 (contact conflict across provenance) are not named in D-36-05. Planner must decide whether to annotate all 5 or only the 3 named; annotating only 3 leaves the file half-true. |
| `.planning/milestones/v1.1-REQUIREMENTS.md` **lines 81, 86 and 283** | CALC-07 body = **81**, PROP-01 body = **86**, CALC-07 traceability = **283**, PROP-01 traceability = **285**. A fourth mention of PROP-01's partial rationale sits at **line 345** | Four line edits, not three. Line 345 is prose explaining *why* PROP-01 was partial; it should be reconciled or it contradicts the flip. |

Also note: **only `08-CONTEXT.md` has a real `<open_questions>` XML block.** `06-CONTEXT.md` and
`07-CONTEXT.md` use a markdown `### Open questions ...` heading nested *inside* their
`<canonical_refs>` block. Three different shapes across four files — see the four verbatim
excerpts below.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| **DELETE** `src/components/blocks/` (25 dirs, 152 files) | vendored component tree | n/a | `docs/design/reui-blocks-audit.md` (record-then-delete precedent) | precedent-match |
| **CREATE** sentinel probe (script or one-shot) | script / gate | request-response (raw SQL round-trip) | `scripts/check-local-db-branch.sh` (safety posture) + `src/lib/db/queries/client-relationships.isolation.integration.test.ts` (raw client) | role-match ×2 |
| **CREATE** `.planning/phases/29-migration-safety-net/29-VALIDATION.md` | planning record | n/a | `.planning/phases/30-company-contact-registry/30-VALIDATION.md` | exact |
| **MODIFY** `package.json` (1 script) | config | n/a | `db:seed:reconciliation-fixtures` / `db:seed:pipeline-fixtures` entries | exact |
| **MODIFY** `.../06-auth-shell/06-CONTEXT.md` | planning record | n/a | its own line 161 (self-shape) | verbatim |
| **MODIFY** `.../07-calc-engine-port-proposal-form/07-CONTEXT.md` | planning record | n/a | its own lines 157–160 — **already carries the RESOLVED shape** | exact (in-repo precedent) |
| **MODIFY** `.../08-persistence-pdf-pipeline/08-CONTEXT.md` | planning record | n/a | its own lines 178–186 (self-shape) | verbatim |
| **MODIFY** `.../31-reconciliation-engine.../31-CONTEXT.md` | planning record | n/a | its own lines 215–232 (self-shape) | verbatim |
| **MODIFY** `.planning/milestones/v1.1-REQUIREMENTS.md` (4 lines) | planning record | n/a | adjacent `[x]` requirements on lines 80, 87 | verbatim |
| **MODIFY** `docs/design/reui-blocks-audit.md` (prepend record) | doc | n/a | **no analog** — no dated decision-record prepend exists anywhere in `docs/` | none |

---

## Pattern Assignments

### 1. DELETE `src/components/blocks/` (vendored component tree)

**Zero-importer verification — already run, reproduce it in the plan:**

```bash
grep -rn "components/blocks" --include="*.ts" --include="*.tsx" --include="*.mjs" \
  --include="*.cjs" --include="*.json" . \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git \
  | grep -v "^./src/components/blocks/"
```

On 2026-09-05 this returns exactly **four** non-`.planning` hits, none of them an import:

| Hit | What it is | Effect of deletion |
|---|---|---|
| `eslint.config.mjs:37` | `ignores` entry (global block) | becomes a dead path — harmless, but should be removed with the tree |
| `eslint.config.mjs:139` | `ignores` entry (second block) | same |
| `tests/container-radius.test.ts:72` | `EXCLUDED_DIRS` for a directory walk | walk simply stops matching; test stays green |
| `tests/server-action-error-contracts.test.ts:45` | `collectSourceFiles` skip condition | same |

**The two test references, verbatim** — the planner should decide explicitly whether to leave them
(dead but self-documenting) or remove them, and say which:

`tests/container-radius.test.ts` lines 68–72:
```typescript
// ── Assertion 1 allow-list — the literal sweep ──────────────────────────
//
// Excluded directories: vendored ReUI reference blocks (never imported —
// 31.1-04-PLAN.md § Scope line).
const EXCLUDED_DIRS = ['src/components/blocks'];
```

`tests/server-action-error-contracts.test.ts` lines 39–45:
```typescript
/** Recursively collect .ts/.tsx files, skipping vendored ReUI/shadcn code. */
function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    // Vendored code is re-imported wholesale on upgrade and is excluded from
    // ESLint for the same reason; house rules bind at call sites instead.
    if (full.includes('components/reui') || full.includes('components/blocks')) continue;
```

**Live/dead boundary — the ESLint entry that proves `reui/` is a different thing** (`eslint.config.mjs` lines 30–37):
```javascript
      // Vendor code imported verbatim from the ReUI registry (Base UI · Maia · Neutral).
      // Not hand-maintained: re-imported wholesale on upgrade, so house rules are enforced
      // at the call sites that consume these, not inside the vendored source.
      'src/components/ui/**',
      'src/components/reui/**',
      'src/components/blocks/**',
```
Delete **only** the `'src/components/blocks/**'` line from each of the two `ignores` arrays
(lines 37 and 139). `src/components/ui/**` and `src/components/reui/**` stay — the audit's own
"What is installed underneath" section confirms `frame`, `badge`, `alert`, `stepper`, `timeline`,
`phone-input`, `filters`, `data-grid/`, `gantt/` are the live layer.

**Precedent to follow (record-then-delete)** — `docs/design/reui-blocks-audit.md` lines 1–20:
```markdown
# ReUI Pro blocks — audit

> Audited 2026-08-31 against the live ReUI registry (Pro licence, `REUI_LICENSE_KEY`).
> Written because the finding is not visible from the tree: **all 18 vendored blocks
> under `src/components/blocks/` are dead.** Nothing outside that directory imports
> any of them. 816K across 104 files, zero wired.

Nothing was deleted. This is the record so the mapping, the two structural
blockers, and the mis-picks do not have to be rediscovered.

## Reinstalling is one command

Every block here comes back with:

```bash
npx shadcn@latest add @reui/<block-name>
```
```

Note the line `Nothing was deleted.` — it becomes false the moment this phase lands. The prepend
must supersede it, or that sentence must be edited in the same pass.

---

### 2. CREATE the INFRA-05 sentinel probe (script / gate, raw-SQL round-trip)

Two analogs combine: **posture** from the bash guard, **mechanics** from the integration suite.

#### Analog A — safety posture: `scripts/check-local-db-branch.sh`

**Header pattern (lines 1–20)** — the plan should copy this comment *structure* verbatim into
the probe: what it is, why it exists, why it is not in CI, and an explicit security note.
```bash
#!/usr/bin/env bash
# Local-only guard (INFRA-05, Phase 29): prints which Neon branch the local
# DATABASE_URL resolves to, and fails if it is the production endpoint.
#
# Why this is NOT wired into CI: CI has no `.env.local` file, and builds run
# against a placeholder DATABASE_URL — the check would be vacuous there. This
# guard is deliberately local-machine-only.
#
# Security note: this script extracts and prints the HOSTNAME ONLY from
# DATABASE_URL. It never echoes the full connection string, username, or
# password, because this output may be pasted into an issue or a transcript.
# It never `source`s .env.local (that would execute arbitrary shell and
# export the secret into this process's environment) — it parses the file
# as plain text instead.
set -euo pipefail
```

**Hostname-only extraction (lines 64–65)** — the exact sed pair to reuse for printing which
branch each side of the probe actually hit:
```bash
# Derive the hostname: the substring between '@' and the following '/' or ':'.
host=$(printf '%s' "$value" | sed -E 's#^[^@]*@##; s#[/:].*$##')
```

**Full-hostname matching, never a prefix (lines 72–93)** — reuse these two literals as the
probe's own assertion that dev-side ≠ main-side:
```bash
# Matched against the full hostnames in docs/operations/neon-branch-routing.md
# (not a prefix wildcard) so a lookalike host that merely shares an endpoint-ID
# prefix but resolves to an unrelated domain is rejected as unrecognised
# rather than misclassified as a known branch.
case "$host" in
  ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech)
    echo "OK: local DATABASE_URL → Neon development branch ($host)"
  ...
  ep-icy-boat-alx5o1tz-pooler.c-3.eu-central-1.aws.neon.tech)
    echo "ERROR: local DATABASE_URL → Neon main branch ($host) — PRODUCTION."
```

**Anti-pattern this file establishes (do NOT do the opposite):** the probe must not
`import './_load-env'`. `scripts/_load-env.ts` does exactly what D-36-03 forbids:
```typescript
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });
```
Every other `scripts/*.ts` entry point starts with `import './_load-env'`. The probe is the
**one script that must not** — `.env.local` is the local dev pointer and the probe needs both
connection strings passed explicitly inline. State this divergence in the probe's header, or a
future maintainer will "fix" it by adding the import.

#### Analog B — raw client mechanics: `src/lib/db/queries/client-relationships.isolation.integration.test.ts`

**Why a raw client is legitimate here** — `eslint.config.mjs` lines 50–56, the ignores entry that
authorises it:
```javascript
      // Integration tests open a RAW client to seed fixtures and to verify
      // results independently of the code under test — checking the row with
      // the same abstraction that wrote it proves nothing. This rule protects
      // the portability of SHIPPED code (BOOT-06); a test file never ships.
      // Deliberately narrow: only `*.integration.test.ts`, never `*.test.ts`.
      '**/*.integration.test.ts',
```
This is the same argument as the probe's: proving isolation with the app's own `db()` singleton
would prove nothing. **If the probe ships as a `.ts` file under `scripts/`, no ESLint exemption is
needed** — `scripts/**` is already in the second `ignores` array (`eslint.config.mjs:52`). If it
ships as `*.integration.test.ts`, the exemption above already covers it.

**Raw client construction (lines 118–122)** — copy this options object exactly; `max: 1` and
`prepare: false` are what make a one-shot pooled Neon connection behave:
```typescript
      sql = postgres(DATABASE_URL_TEST!, {
        max: 1,
        prepare: false,
        onnotice: () => {},
      });
```

**Skip-by-default env gate (lines 70–78)** — the "fails safe when unconfigured" shape:
```typescript
const DATABASE_URL_TEST = process.env.DATABASE_URL_TEST;
const shouldRun = !!DATABASE_URL_TEST;

if (!shouldRun) {
  console.log(
    '[integration] DATABASE_URL_TEST not set — skipping CRM-02/CRM-03 isolation test. '
    + 'Set it (and DATABASE_URL, to the same value) to your dev/preview DB to run.',
  );
}
```

**Docblock shape for a DB-touching, hand-invoked artifact (lines 25–42)** — copy this
Setup/Run/Caveat structure into the probe:
```typescript
 * Setup:
 *   1. Apply `drizzle/0007_phase30_crm_registry.sql` to a dev/preview
 *      Postgres (e.g. Neon development branch).
 *   2. Export BOTH `DATABASE_URL` and `DATABASE_URL_TEST` to that DB URL — ...
 *   3. Run:
 *        DATABASE_URL=$DEV_DB_URL DATABASE_URL_TEST=$DEV_DB_URL npx vitest run \
 *          src/lib/db/queries/client-relationships.isolation.integration.test.ts
 *
 * If `DATABASE_URL_TEST` is unset, the entire describe block SKIPS — CI
 * stays green even without the env var.
 *
 * Production caveat: do NOT point DATABASE_URL_TEST at production. ...
```

#### Concrete facts the probe needs

**`.env.test.local` holds exactly one key** (measured; mode `600`, gitignored):
```
DATABASE_URL_TEST=
```
There is **no** `main`-branch URL in it. The probe's `main` side must come from an inline operator-
supplied variable, never from `.env.local`. This is consistent with D-36-03 and is the reason the
probe is safe.

**Sentinel table recommendation — `schema_meta`** (`src/db/schema.ts` lines 8–30). It is the only
table in the schema whose stray row is provably harmless:
```typescript
/**
 * The `schema_meta` table here is a marker that records when the schema was
 * bootstrapped. ...
 *   2. Provides a stable place to record the application's deployed schema_version
 *      separately from migration state ...
 */
export const schemaMeta = pgTable('schema_meta', {
  id: serial('id').primaryKey(),
  label: text('label').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```
`label` (NOT NULL text) is the natural sentinel column: write `label = 'isolation-probe-36-<uuid>'`,
then on `main` run `SELECT count(*) FROM schema_meta WHERE label = '<same>'` — a count, never rows,
never customer data. Caveat for the plan: `/healthz` SELECTs from this table (schema.ts:16-17), so
verify the probe's `DELETE` runs in the same transaction or a guaranteed `finally`.

**UUID source** — the isolation test already imports it (`line 46`):
```typescript
import { randomUUID } from 'node:crypto';
```

---

### 3. CREATE `.planning/phases/29-migration-safety-net/29-VALIDATION.md` (planning record)

**Analog:** `.planning/phases/30-company-contact-registry/30-VALIDATION.md` — the only
`*VALIDATION*.md` in the repo, and it is itself a *reconstructed* one, which is exactly Phase 29's
situation. 157 lines.

**Frontmatter + reconstruction preamble (lines 1–16), verbatim:**
```markdown
---
phase: 30
slug: company-contact-registry
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-01
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

Reconstructed from artifacts (State B — no prior VALIDATION.md). All 9 plans and
8 summaries were read; 30-09 has no summary because it is parked at a blocking
human-verify checkpoint, but its code is landed (`8d2f06b`, `e86aec4`) and its
tests run green, so it is mapped below like any other plan.
```
Phase 29's version must set `nyquist_compliant:` honestly — D-36-04 says the dimensions are **not
derivable** (no `29-RESEARCH.md`). Consider `nyquist_compliant: not-derivable` with the body
explaining it, rather than `false` (which reads as a failure) or `true` (which is unearned).

**Gates table (lines 27–41)** — copy this block near-verbatim; all 9 gates still exist in
`package.json` today:
```markdown
Supporting gates, all exit-0 required:

| Gate | Command |
|------|---------|
| Types | `npm run typecheck` |
| Lint (zero-warning) | `npm run lint:check` |
| Migration ↔ journal parity | `npm run check:migration-journal-sync` |
| `drizzle-kit push` ban (BOOT-09/10) | `npm run check:no-drizzle-push` |
| DB smoke filter | `npm run check:db-smoke-filter` |
| Vercel-only import ban | `npm run check:no-vercel-imports` |
| v10 localStorage ban (CUT-03) | `npm run check:no-v10-localstorage` |
| Seed SQL parity | `npm run check:seed-sql` |
| Local DB branch safety | `npm run check:local-db-branch` |
```

**Sign-off block + scope note (lines 145–157)** — the closing shape:
```markdown
## Validation Sign-Off

- [x] All requirements have automated verification
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none — existing infrastructure sufficed)
- [x] No watch-mode flags
- [x] Feedback latency < 15 s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-01

> Scope note: this artifact certifies **automated requirement coverage**. Plan
> 30-09 still owes its human-verify checkpoint (steps 10–11), listed under
> Manual-Only above.
```
30-VALIDATION.md also demonstrates the tone D-36-04 asks for — its "Two near-misses that were NOT
gaps" section (lines 130–137) is exactly the "measurement gap, not coverage gap" argument, written
in the house voice.

**Source material for the body** — three excerpts already exist and should be cited rather than
paraphrased:
- `29-VERIFICATION.md:28` — `**Score:** 5/5 truths verified (truth 4 verified on the narrower, architecturally-inferred basis described below, not the stronger empirical claim in the original roadmap wording)` — this is the "closed on 5/5 verified must-haves" fact D-36-04 wants stated.
- `29-VERIFICATION.md:81` — `## Known Weak Link — INFRA-05 Evidentiary Basis (assessed honestly, per instructions)` — the section to update with the probe result.
- `29-SECURITY.md:63` — the T-29-06 Accepted Risks Log row, which already names its own upgrade path: *"**Cheap upgrade path:** restore a `development`-branch login (`grant-admin.ts` issues an invitation URL) and run the probe, which would move this from accepted to empirically closed."* The SQL-level probe is a *second*, cheaper upgrade path that sidesteps the login blocker; the row should say so.

---

### 4. MODIFY `package.json` — one new npm script (config)

**Analog: the three `db:seed:*` entries, lines 36–38, verbatim:**
```json
    "db:seed:reconciliation-fixtures": "tsx -r ./scripts/_preload-mock-server-only.cjs scripts/seed-reconciliation-fixtures.ts",
    "db:seed:pipeline-fixtures": "tsx -r ./scripts/_preload-mock-server-only.cjs scripts/seed-pipeline-fixtures.ts",
    "db:seed:fiche-fixtures": "tsx -r ./scripts/_preload-mock-server-only.cjs scripts/seed-fiche-fixtures.ts"
```

**Exact line the planner should add** (D-36-07 + discretion note; place it with the other
`db:seed:*` entries, and note the existing last entry needs a trailing comma):
```json
    "db:seed:partner-launch": "tsx -r ./scripts/_preload-mock-server-only.cjs scripts/seed-partner-launch.ts",
```

**Why the `-r` preload is required here** — `scripts/seed-partner-launch.ts` lines 135–136 lazily
imports the `server-only`-guarded app modules:
```typescript
  const { db } = await import('../src/lib/db/index');
  const { users, accounts } = await import('../src/db/schema');
```
and `scripts/_preload-mock-server-only.cjs` is what neutralises that guard:
```javascript
/**
 * CJS preload: mock 'server-only' in the require cache BEFORE anything loads it.
 * Used by: tsx -r ./scripts/_preload-mock-server-only.cjs <script>
 */
```

**Two gotchas the plan must carry into the script's usage note.** `seed-partner-launch.ts` is
env-gated (lines 20–35) and the npm script cannot pass its positional arg without `--`:
```
 * Run:
 *   CONFIRM=SEED-PARTNER-<email> \
 *   INITIAL_PASSWORD=<password> \
 *   DATABASE_URL=<...> \
 *     npx tsx scripts/seed-partner-launch.ts <email> [--display-name "Full Name"]
```
So the real invocation becomes `npm run db:seed:partner-launch -- <email> --display-name "..."`.
Verify that form actually reaches `process.argv` before declaring the task done — the existing
`db:seed:*` scripts take no positional args, so this is the first one that does.
(`purge:soft-deleted:dry` at line 33 is the in-repo precedent for prefixing an env var inside the
script value: `"CONFIRM= tsx -r ./scripts/... "`.)

---

### 5. MODIFY four planning records — annotate `<open_questions>` in place

**There is no single shape.** All four differ. Excerpts are verbatim as of 2026-09-05.

#### 5a. `.planning/milestones/v1.1-phases/06-auth-shell/06-CONTEXT.md` — line 161–162

Markdown heading **inside `<canonical_refs>`**, not an XML block:
```markdown
### Open questions (per STATE.md and REQUIREMENTS.md — do NOT block on these)
- Auth library version pinning matrix (Open Q4) — must be locked the moment Phase 6 plans are written. The planner must pin: `better-auth`, `@better-auth/drizzle-adapter` (or whatever the official Drizzle adapter package name is), `@node-rs/argon2`, `next` (already 16.2.4), `react` (already 19.0.0).
```
One question. Annotation attaches to the end of that single bullet.

#### 5b. `.planning/milestones/v1.1-phases/07-calc-engine-port-proposal-form/07-CONTEXT.md` — lines 157–160

**This file already contains the target shape** — its first bullet is the in-repo precedent for
D-36-05's wording. Match it exactly for the other three files:
```markdown
### Open questions (none blocking)
- Open Q2 ("v10 client_name field") — RESOLVED 2026-05-08 in 07-UI-SPEC §1.4 / D-7-06 / D-7-NN. No action needed.
- Seed coefficient canonical values (D-2 placeholder) — Antoine to provide before Phase 8 ships; CUT-06 verifies. Does not block Phase 7 plans.
```
The house shape is therefore: `<question> — RESOLVED <date> in <full relative ref>. <one clause>.`
Note bullet 1 is *already* annotated; only bullet 2 (seed coefficients) needs work. D-36-05 says
"2 questions" for this file — the planner should confirm whether bullet 1 counts as already done.
Also note the existing precedent uses a **bare ref** (`07-UI-SPEC §1.4`); D-36-05 requires a **full
relative path**, so new annotations should be stricter than this precedent, not identical to it.

#### 5c. `.planning/milestones/v1.1-phases/08-persistence-pdf-pipeline/08-CONTEXT.md` — lines 178–186

The only real `<open_questions>` XML block in the four:
```markdown
<open_questions>
## Open Questions Carried Forward (resolve before relevant phase)

- **Open Q1 (Cutover ownership)** — Antoine vs Thomas for partner comms (Phase 10 — fire request now).
- **Open Q3 (Legal counsel sign-off on 10-year retention — DATA-11)** — gates Phase 10 CUT-09. Recommend Antoine fires the legal-counsel ask alongside Phase 8 planning so the answer is in hand by Phase 10. Phase 8 itself is unblocked because soft-delete hard-purge handles the 30-day window without needing legal yet.
- **Open Q5 (OVH side stack — managed Postgres + S3-compatible)** — gates Phase 10 CUT-04. Recommend Antoine fires the Leasétic IT ask alongside Phase 8 planning.
- **Phase 7 carry-over: Antoine's canonical coefficients** — Phase 8 is unblocked (D-D1 ships placeholders; Phase 9 admin-edits before partner onboarding). Antoine's extraction work can happen any time before first partner onboard date. NOT a Phase 8 blocker.

</open_questions>
```
D-36-05 counts 3 for this file; there are **4 bullets** (Q1, Q3, Q5, plus the Phase 7 carry-over).
Bullets are `- **Bold label** — body.`, so an annotation appends to the body, preserving the bold
label. Note the coefficients carry-over here is the *same* item as 07-CONTEXT's bullet 2 — both
should resolve to the same reference.

#### 5d. `.planning/phases/31-reconciliation-engine-proposal-extraction/31-CONTEXT.md` — lines 215–232

Numbered list under a markdown heading, **inside the `<deferred>` block** (there is no
`<open_questions>` tag anywhere in this file), and there are **5**, not 3:
```markdown
## Open Questions (recorded, not guessed)

These were surfaced during discussion and deliberately left for the planner or a follow-up
conversation rather than silently assumed:

1. **Re-run idempotency.** What happens on a second *real* run over proposals already linked in
   Phase 30 or by a prior run? Proposals carrying a `client_relationship_id` could be skipped or
   re-checked. IMPORT-07 covers idempotency formally but lands in Phase 32.
2. **Canonical name selection.** When several proposals name the same company with different
   spellings that normalize identically, which spelling becomes `companies.name`? Oldest, newest,
   most frequent?
3. **Engine granularity.** Does the engine run globally in one pass across all partners, or
   per-partner? This interacts with D-11: a global pass can see pairs no single partner can.
4. **Provenance scope.** Does D-08's column belong on `contacts` only, or on `companies` and
   `client_relationships` too?
5. **Contact conflict across provenance.** If an extracted contact's email later collides with a
   partner-entered one, is it merged or left alone?
```
Shape here is `N. **Bold label.** Body sentences.` wrapped at ~95 cols with 3-space continuation
indent. An in-place annotation must preserve that wrapping or the diff will look like a rewrite.

**Authoritative source for every resolution** (do not invent statuses):
`.planning/STATE.md` § Deferred Items, and specifically its v1.1-close table which maps each of
06/07/08's questions to a RESOLVED or DEFERRED outcome. Cited by `36-CONTEXT.md:152-154`.

---

### 6. MODIFY `.planning/milestones/v1.1-REQUIREMENTS.md` — flip `[~]` → `[x]`

**Current text, lines 81 and 86, verbatim (the exact-match anchors):**
```markdown
- [~] **CALC-07**: Calc engine runs server-side on save; client-side calculations are for live preview only and are never trusted. PARTIAL (07-05): client-side preview seam grounded — `<LiveLoyerPreview>` calls `computeLoyer(...)` from `@/lib/calc` for live display only; no DB write, no persisted value (D-7-07: Phase-7 onSubmit is a no-op + info toast). Server-side recompute on save is Phase 8 territory (server route will call `proposalInputSchema.parse(req.body)` then `computeLoyer({...})` then write the resulting `params_snapshot + inputs + computed` jsonb to the proposals row — never trusting the client's display value).
```
```markdown
- [~] **PROP-01**: Authenticated partner sees a home page with a prominent "Create new proposal" CTA. PARTIAL (07-03): empty-state shell grounded (greeting + CTA Link + .card recent-proposals empty-state with FileText icon at `app/(authed)/page.tsx`). Full requirement (with populated row data) blocks on Phase 8 PROP-02..05.
```

**Established `[x]` annotation style — the immediate neighbours, lines 80 and 87, verbatim.**
Note the house convention: a completed-with-nuance requirement keeps its narrative *after* an em
dash, in the same bullet. CALC-05 (line 74) is the canonical long-form example.
```markdown
- [x] **CALC-06**: ≥30 representative golden test cases extracted from v10 (input → expected output pairs); CI fails on any drift — 30 cases land in `src/lib/calc/calc.golden.test.ts` (12 happy-path × 4 tranches × 3 durations + 8 boundaries + 4 on-demand + 6 edges); fixture coefficients embedded as local const (D-1 fixture/seed separation); ±0.01 € tolerance; static lexical gate `grep -c "  it(" ≥ 30` defends against silent case removal.
```
```markdown
- [x] **PROP-02**: Home page lists the partner's recent proposals (last 20 by default), sorted by creation date descending
```
So the flip is: `[~]` → `[x]`, and the `PARTIAL (07-05):` / `PARTIAL (07-03):` clause is rewritten
to name the phase that completed it (Phase 8, per D-36-06) in the `— <narrative>` form of CALC-06.

**Traceability table rows — lines 283 and 285, verbatim.** Note the neighbouring rows already
show the target `Complete` shape (with and without a plan ID):
```markdown
| CALC-07 | Phase 7 | Partial (07-05 — client preview seam shipped; server recompute is Phase 8) |
| CALC-08 | Phase 7 | Complete (07-01) |
| PROP-01 | Phase 7 | Partial (07-03 — empty-state shell shipped; populated rows block on Phase 8) |
| PROP-02 | Phase 8 | Complete |
```

**Fourth edit CONTEXT.md does not mention — line 345:**
```markdown
- **PROP-01 (home page CTA) lives in Phase 7**, not Phase 8, because the home page exists from Phase 7 onward as the landing for authenticated partners; Phase 8 then *populates* it (PROP-02..05). The empty CTA satisfies PROP-01; the populated list satisfies PROP-02..05.
```
This prose is the *reason* PROP-01 was marked partial. It says "the empty CTA satisfies PROP-01" —
arguably it already supports the `[x]`. Either leave it (it is consistent) or extend it; the plan
must state which, so the flip does not silently contradict a live sentence three hundred lines down.

**Note on the file's own `[~]` vocabulary:** `[~]` is used elsewhere in this file (line 24,
BOOT-03) and remains legitimate there. Do not sweep-replace `[~]`; edit only lines 81 and 86.

---

### 7. MODIFY `docs/design/reui-blocks-audit.md` — prepend a dated decision record

**No analog.** No dated decision-record prepend exists anywhere under `docs/`
(`grep -rn "^> \*\*Decision" docs/` → zero hits; no file matches "decision record"). The nearest
in-repo shapes are:

- **The audit's own existing header blockquote** (lines 3–9, excerpted in §1 above) — a `>` block
  carrying date + rationale, immediately under the `#` title. The new record should sit *above* or
  *replace* that blockquote and use the same `>` form for visual continuity.
- **Inline dated attribution** already used in this file, line 36:
  ```markdown
  Current decision: no blanket rule. Each block is previewed and judged on its own
  (Antoine, 2026-08-31).
  ```
  That `(Antoine, YYYY-MM-DD)` parenthetical is the house attribution form — reuse it for
  "by whose decision" per D-36-02.
- **`34-11-PLAN.md:173`** references a `<decision_record>` convention in plan files; that is a
  *plan* tag, not a docs one. Do not import it into `docs/`.

**Content the record must carry** (D-36-02) and the corrected numbers from the top of this file:
deleted 2026-09-05, by Antoine's decision (D-36-02, Phase 36), **25 blocks / 152 files / 1.1M** —
the 18/104/816K in the body is the 2026-08-31 count, before Phase 34 vendored the seven
`solution-*` blocks — reinstall with `npx shadcn@latest add @reui/<block-name>`. And the body's
sentence `Nothing was deleted.` (line 8) must be superseded or edited.

---

## Shared Patterns

### Comment-block-as-contract
**Source:** `scripts/check-local-db-branch.sh:1-19`, `scripts/_load-env.ts:1-37`,
`scripts/seed-partner-launch.ts:1-38`, `src/lib/db/queries/client-relationships.isolation.integration.test.ts:1-43`
**Apply to:** the sentinel probe

Every operationally-dangerous artifact in this repo opens with a long docblock stating: what it
does, **why it exists**, why it is *not* wired into CI, an explicit security note, and a literal
copy-pasteable run line. This is the single strongest convention in the codebase. A probe that
ships without one will not match.

### Honest-failure prose in planning records
**Source:** `29-VERIFICATION.md:81-108` ("Known Weak Link — INFRA-05 Evidentiary Basis"),
`29-SECURITY.md:63` (Accepted Risks Log), `30-VALIDATION.md:130-137` ("Two near-misses that were NOT gaps")
**Apply to:** `29-VALIDATION.md`, the `29-VERIFICATION.md` update, the T-29-06 revisit

The register is: state the weaker claim that IS supported, state precisely what is NOT proven,
name the upgrade path, and classify severity explicitly (`WARNING-level residual gap, not a
BLOCKER`). D-36-04's note must be written in this voice or it will read as an excuse.

### Full-verbatim-anchor edits in planning markdown
**Source:** the four `<open_questions>` excerpts and the four `v1.1-REQUIREMENTS.md` lines above
**Apply to:** every item in §5 and §6

These files are long, line-wrapped at inconsistent widths, and have near-duplicate bullets. Every
edit must be specified with its full current line as the match anchor and preserve the existing
wrap width, or the diff becomes unreviewable.

### Gate battery after any tree-level change
**Source:** `30-VALIDATION.md:27-41` (the 9-gate table), `.github/workflows/ci.yml`
**Apply to:** the block deletion (§1) and the `package.json` edit (§4)
```
npm run typecheck && npm run lint:check && npm test && npm run build
```
D-36-02 is explicit: a drop of 152 files must not move any of the four. CI additionally runs
`eslint . --max-warnings=0`, so an unused var or a dead ignores entry fails CI even when `tsc` and
`vitest` are green.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `docs/design/reui-blocks-audit.md` decision-record prepend | doc | n/a | No dated decision-record prepend exists anywhere under `docs/`. Nearest shapes are the audit's own header blockquote and its `(Antoine, 2026-08-31)` inline attribution — both excerpted in §7. This phase sets the precedent. |

---

## Metadata

**Analog search scope:** `src/components/blocks/`, `src/components/reui/`, `scripts/`,
`src/lib/db/queries/`, `tests/`, `docs/`, `.planning/phases/`, `.planning/milestones/`,
`eslint.config.mjs`, `package.json`, `vitest.config.ts`, `src/db/schema.ts`
**Files read in full or in targeted ranges:** 18
**Analogs excerpted:** 5 strong (`check-local-db-branch.sh`, `client-relationships.isolation.integration.test.ts`, `30-VALIDATION.md`, `package.json` scripts block, `reui-blocks-audit.md`) plus 6 verbatim text-shape anchors
**Pattern extraction date:** 2026-09-05
