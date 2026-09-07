---
phase: 36
slug: gate-repair-planning-record-hygiene
status: verified
nyquist_compliant: false
wave_0_complete: true
created: 2026-09-07
---

# Phase 36 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

**Requirements:** HOUSE-01, HOUSE-02, HOUSE-03, HOUSE-04, CLOSE-05 (6 plans, 15 tasks, 4 waves)
**Reconstructed from artifacts** (State B — no VALIDATION.md existed at execution time), then the
automatable gaps were filled on 2026-09-07 by `/gsd-validate-phase 36`.

`nyquist_compliant: false` is deliberate and is **not** a coverage failure. Two of the five
requirements are structurally un-automatable in this repo — one because a recorded decision forbids
the test, one because the thing to assert against ships outside the repo. Both are recorded in
Manual-Only with their reasons. The three requirements that *could* be pinned, now are.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.8 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/seed-script-registration.test.ts tests/reui-blocks-deletion.test.ts tests/probe-write-isolation-contracts.test.ts` |
| **Full suite command** | `npm test` (→ `vitest run`) |
| **Estimated runtime** | ~1s quick · ~31s full suite (195 files, 2586 tests) |
| **CI gate** | `npm run lint:check` (`eslint . --max-warnings=0`) + `npm run typecheck` |

**Execution constraint for this phase's suites:** none of the three tests may execute
`scripts/probe-write-isolation.ts`, `npm run db:seed:partner-launch`, `npm run build` or
`npm run start`. The first two open real Neon branches; `build`/`start` resolve `DATABASE_URL`
against `.env.production.local`, which points at the **production** branch. All three suites are
static source-text and file-existence contracts by design.

---

## Sampling Rate

- **After every task commit:** Run the quick command above
- **After every plan wave:** `npm test`
- **Before `/gsd-verify-work`:** full suite green + `lint:check` + `typecheck` exit 0
- **Max feedback latency:** ~1s (quick) / ~31s (full)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| 36-01-01 | 01 | 1 | HOUSE-01 | N/A — gate hygiene | manual | — | n/a | ⚪ manual-only (D-36-01) |
| 36-01-02 | 01 | 1 | HOUSE-02 | N/A — planning record | manual | — | n/a | ⚪ manual-only (detector is out-of-repo) |
| 36-01-03 | 01 | 1 | HOUSE-02 | N/A — planning record | manual | — | n/a | ⚪ manual-only (detector is out-of-repo) |
| 36-02-01 | 02 | 1 | HOUSE-03 | A future sweep cannot silently revert CALC-07/PROP-01 or flip BOOT-03 | integration | `npx vitest run tests/seed-script-registration.test.ts` | ✅ | ✅ green |
| 36-02-02 | 02 | 1 | HOUSE-03 | The npm entry reaches the real script **through** `_preload-mock-server-only.cjs` — not merely a string that names it | integration | `npx vitest run tests/seed-script-registration.test.ts` | ✅ | ✅ green |
| 36-03-01 | 03 | 1 | HOUSE-04 | The dated delete decision + reinstall command survive, so the deletion stays reversible and attributed | integration | `npx vitest run tests/reui-blocks-deletion.test.ts` | ✅ | ✅ green |
| 36-03-02 | 03 | 1 | HOUSE-04 | `src/components/blocks/` cannot silently return via `npx shadcn add @reui/<block>`; `src/components/reui/` keeps all 13 entries; nothing under `src`/`app` imports the deleted tree | integration | `npx vitest run tests/reui-blocks-deletion.test.ts` | ✅ | ✅ green |
| 36-03-03 | 03 | 1 | HOUSE-04 | N/A — ledger amendment | manual | — | n/a | ⚪ covered by 36-VERIFICATION Truth 4 |
| 36-04-01 | 04 | 2 | CLOSE-05 | The probe opens no env file; its allow-list holds both full hostnames; refusal is **fail-closed** (hostname guard precedes `openClient(`); no `console.*` interpolates a credential; the `main` session issues exactly one `await mainSql\`` query and zero write verbs | integration | `npx vitest run tests/probe-write-isolation-contracts.test.ts` | ✅ | ✅ green |
| 36-04-02 | 04 | 2 | CLOSE-05 | `probe:write-isolation` reaches the script | integration | `npx vitest run tests/probe-write-isolation-contracts.test.ts` | ✅ | ✅ green |
| 36-05-01 | 05 | 3 | CLOSE-05 | Live probe run against real Neon branches | manual | — | n/a | ⚪ manual-only (operator credentials) |
| 36-05-02 | 05 | 3 | CLOSE-05 | Credential-free transcript recorded | manual | — | n/a | ⚪ manual-only (operator-attested) |
| 36-06-01 | 06 | 4 | CLOSE-05 | N/A — record update | manual | — | n/a | ⚪ covered by 36-VERIFICATION Truth 5 |
| 36-06-02 | 06 | 4 | CLOSE-05 | N/A — threat re-disposition | manual | — | n/a | ⚪ covered by 36-VERIFICATION Truth 5 |
| 36-06-03 | 06 | 4 | CLOSE-05 | `29-VALIDATION.md` exists and its frontmatter carries `nyquist_compliant` | integration | `npx vitest run tests/probe-write-isolation-contracts.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · ⚪ manual-only*

**Automated: 6 tasks / 3 requirements. Manual-only: 9 tasks / 2 requirements (+4 record-update tasks
already verified goal-backward in `36-VERIFICATION.md`).**

---

## Wave 0 Requirements

Existing infrastructure covered all phase requirements — Vitest was already installed and the repo
already carried the three house patterns these suites imitate
(`tests/npm-guard-hooks.test.ts`, `tests/vendored-ui-integrity.test.ts`,
`tests/load-env-contracts.test.ts`). No Wave 0 install was needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `npm run lint:check` reports zero errors on a clean tree; the `.claude/**` ignore at `eslint.config.mjs:44` is the recurrence guard | HOUSE-01 | **A recorded decision forbids the test.** `36-CONTEXT.md` D-36-01 says: close by evidence, change no code, and *explicitly reject* both a `.claude/worktrees/**` ignore and a pinning test. `36-VERIFICATION.md` confirms `eslint.config.mjs` carries a literal zero diff across the whole phase. Writing a pinning test here would override a human decision, not fill a gap. | `npm run lint:check` → expect exit 0. `git worktree list` → expect a single entry. `ls -la .claude/worktrees/` → expect empty. |
| The milestone audit reports no open v1.1-era context question | HOUSE-02 | **Nothing in-tree to assert against.** The detector (`auditOpenArtifacts`) ships in the GSD SDK at `~/.local/bin/gsd-sdk`, not in this repo. A test would pin a dependency the repo does not own or version. | `gsd-sdk` audit → read `.items.context_questions` (never the top level, which is `undefined`) → expect `[]`. Then read the four CONTEXT files and confirm each bullet carries an inline RESOLVED/DEFERRED with a full relative ref. |
| The write-isolation probe has been run once against the real Neon `development` and `main` branches | CLOSE-05 (36-05) | Requires live credentials for both branches. INFRA-05 forbids reading production from a local machine, and the probe's value is that it is a one-shot operator action. Operator-attested in `36-PROBE-TRANSCRIPT.md`; cannot be re-derived from the codebase. | See `36-VERIFICATION.md` § Human Verification, items 1 and 2. **Item 2 is still open** — see Known Limitations below. |

---

## Known Limitations

**1. The recorded probe verdict predates every hardening fix to the probe.** Carried unchanged from
`36-VERIFICATION.md` W-01. The transcript's run was committed at `e68b3a3`; all twelve review fixes
land after it (`git diff --stat e68b3a3..HEAD -- scripts/probe-write-isolation.ts` → +331/−29). CR-03
in particular was described by the reviewer as producing a false `PASS`. **The shipped script has
never completed an end-to-end live run.** The new `tests/probe-write-isolation-contracts.test.ts`
narrows this: the script's *safety* contracts are now pinned statically, so a regression in the
allow-list, the fail-closed ordering, or the credential hygiene fails in CI. It does not close the
item — only an operator with both sets of credentials can do that.

**2. The phase's own `mainSql` count criterion has gone stale a second time — and the test now
defends against it.** Recorded here because it is new information, discovered while filling this
gap, and it is not in any Phase 36 artifact:

- Plan 36-04's acceptance criterion asked that `mainSql` appear **exactly 3 times in code lines**.
- `36-VERIFICATION.md` § "Verification of the known `mainSql` measurement-gap claim" re-derived that
  as 3, at lines 400 / 433 / 508, after stripping both the `*` and `//` comment forms. Correct when
  written, at 2026-09-05 **16:29**.
- Commit `c76c294` ("downgrade the read-only gate to a warning") landed the same day at **19:18**,
  ~3 hours later, adding a `console.warn` string that contains the markdown code-span `` `mainSql` ``
  in prose at what is now line 551.
- Re-derived today, the identical technique yields **4** (lines 476, 509, 551, 609) — a *code* line
  whose token sits inside a user-facing string.

The security property is unchanged and still holds: there is exactly **one** `await mainSql\`` tagged
template in the file, it is a `SELECT count(*)`, and zero write verbs appear on any `mainSql`
template. The new test therefore anchors on `await\s+mainSql\`` — the actual call syntax — instead of
a blunt token count, and its docblock records why, so a future reader does not "fix" it back to a
number that is demonstrably false against the file as committed. **The probe is fine; the phase's
measurement technique was brittle.**

---

## Validation Audit 2026-09-07

| Metric | Count |
|--------|-------|
| Requirements assessed | 5 |
| Gaps found | 3 MISSING (HOUSE-01, HOUSE-02, HOUSE-03) + 2 PARTIAL (HOUSE-04, CLOSE-05) |
| Resolved | 3 (HOUSE-03, HOUSE-04, CLOSE-05) |
| Escalated | 0 |
| Recorded manual-only with reason | 2 (HOUSE-01, HOUSE-02) |
| Test files added | 3 |
| Tests added | 16 |

### Tests added

| File | Tests | Requirement | Modelled on |
|------|-------|-------------|-------------|
| `tests/seed-script-registration.test.ts` | 4 | HOUSE-03 | `tests/npm-guard-hooks.test.ts` (named-gate style) |
| `tests/reui-blocks-deletion.test.ts` | 4 | HOUSE-04 | `tests/vendored-ui-integrity.test.ts` (numbered on-disk integrity) |
| `tests/probe-write-isolation-contracts.test.ts` | 8 | CLOSE-05 | `tests/load-env-contracts.test.ts` (numbered source-text Contracts; reuses its Contract 5 credential-leak technique, and cross-references its Contract 3 rather than duplicating it) |

Each new test was proven non-vacuous by mutation against an isolated copy of its own detection logic
— never by editing a real repo file. Notably, contract E's first draft was itself wrong (a naive
token count returned 9) and was corrected before landing; that is what surfaced Known Limitation 2.

### Pre-existing coverage found during cross-reference

Three Phase 36 artifacts were already pinned incidentally by **Phase 39's** suites, unattributed
anywhere:

- `tests/load-env-contracts.test.ts` **Contract 3** pins D-36-03's first clause — the probe must not
  import `./_load-env`.
- **Contract 4**'s 14-consumer census includes `scripts/seed-partner-launch.ts`.
- `tests/container-radius.test.ts:73` (`EXCLUDED_DIRS: []`) and
  `tests/server-action-error-contracts.test.ts:48` were both edited by plan 36-03 and now walk all of
  `src`, so a returning `blocks/` tree would be scanned — but neither asserted the deletion held.
  `tests/reui-blocks-deletion.test.ts` closes that.

### Gates after the change

| Gate | Result |
|------|--------|
| `npx vitest run` (the 3 new suites) | 16/16 passed |
| `npm test` (full suite) | 189 passed, 6 skipped (195 files) · 2525 passed, 61 skipped (2586 tests) |
| `npm run lint:check` | exit 0 |
| `npm run typecheck` | exit 0 |

No implementation file was modified. No existing test was renumbered, reworded or restructured.

---

## Validation Sign-Off

- [x] Every task has an automated verify, a Wave 0 dependency, or a Manual-Only row naming its reason
- [x] Sampling continuity: no 3 consecutive automatable tasks without an automated verify
- [x] Wave 0 covers all MISSING references (none needed — infrastructure pre-existed)
- [x] No watch-mode flags
- [x] Feedback latency ~1s quick / ~31s full
- [ ] `nyquist_compliant: true` — **deliberately not set.** HOUSE-01 is barred from automation by
      D-36-01 and HOUSE-02 has no in-repo assertion target. Marking this phase compliant would
      require either overriding a recorded decision or pinning an out-of-repo dependency.

**Approval:** pending operator review
