---
phase: 39
slug: database-guard-correctness
status: verified
threats_open: 0
asvs_level: 1
created: 2026-09-07
---

# Phase 39 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

**Requirement:** OPS-05
**Register authored at plan time:** yes — verify-only audit against the `<threat_model>`
blocks in `39-01-PLAN.md` … `39-05-PLAN.md`. No new threats were scanned for; no register
entries were added.

**Method.** For every `mitigate` threat the declared mitigation pattern was grepped or read
directly in the cited implementation file, not inferred from SUMMARY/REVIEW prose. Where a
plan's acceptance criteria specified an exact grep and expected count, that grep was re-run
against the post-`39-REVIEW-FIX.md` tree and the actual count recorded. For the two `accept`
dispositions the stated residual-risk bound was independently re-verified. The phase-relevant
hermetic suites (144 tests) were executed fresh during the audit rather than read from a
prior report.

Note: this repo's `grep` is a ugrep wrapper — `grep -c` exits 1 on a zero count, so counts
below were read from stdout, never inferred from exit status.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| `scripts/_neon-endpoints.list` on disk → guard/seeder process | a tampered or malformed record changes which hosts are classified dangerous | endpoint ids, hostnames, scope labels (non-secret) |
| dotenv file on disk → resolver process | a malformed or hostile line must not execute | live DB credentials |
| `DATABASE_URL` string → hostname classification | a mistyped or pasted value must never be waved through | live DB credential |
| `EnvResolution.url` → caller's log output | anything printing it is an information disclosure | live DB credential |
| `.env.production.local` on disk → 14 write-capable `tsx` entry points | the OPS-05 hazard itself; the guard closes it in the same edit | production DB credential |
| CI / Vercel / `MIGRATE PROD` runner → guard | these legitimately target production; blocking them is a self-inflicted outage | production DB credential (injected as secrets, never via `.env*`) |
| guard refusal message → transcript / issue tracker | refusal output is designed to be pasteable | hostname + source filename only |
| npm lifecycle hook → guarded command | hook and `next build`/`next start` not sharing a NODE_ENV is a silent fail-open | NODE_ENV |
| test fixture dir → repo working tree | a repo-relative path would read (and could clobber) real developer secrets | fixture placeholders |
| vitest process env → spawned guard | an inherited `DATABASE_URL` makes precedence cases pass for the wrong reason | ambient env |
| test output → CI logs | vitest prints assertion diffs on failure | fixture placeholders |
| `scripts/probe-write-isolation.ts` → shared loader | forcing it onto the shared loader would make it read a stored credential (violates D-36-03) | production DB credential |

---

## Threat Register

### 39-01 — `scripts/_neon-endpoints.list` + `.ts`

| Threat ID | Category | Component | Disposition | Mitigation (verified) | Status |
|-----------|----------|-----------|-------------|------------------------|--------|
| T-39-01-01 | Elevation of Privilege | endpoints list accessor | mitigate | `grep -Ec 'require\(|child_process|eval\(' scripts/_neon-endpoints.ts` → **0**. `readFileSync` + `split`/`trim` only; never sourced, required or eval'd. | closed |
| T-39-01-02 | Tampering | endpoint table drift | mitigate | `tests/neon-endpoints.test.ts` asserts `toHaveLength(3)` (L115) and per-record `hostname.startsWith(prefix)` (L126). 18/18 pass. | closed |
| T-39-01-03 | Spoofing | prefix vs full-hostname matching | mitigate | `scripts/_neon-target.ts:49` keeps the `endsWith('.neon.tech')` pre-gate; list carries both `prefix` and full `hostname`. | closed |
| T-39-01-04 | Information Disclosure | seeder guard output | mitigate | All three seeders log only hostname + scope — `seed-fiche-fixtures.ts:538`, `seed-pipeline-fixtures.ts:270`, `seed-reconciliation-fixtures.ts:241`. No `databaseUrl`, user, password or query string. | closed |
| T-39-01-05 | Repudiation / fail-open | unrecognised endpoint id | mitigate | `_neon-endpoints.ts` throws on malformed records (line-numbered); `_neon-target.ts:65-66` returns `branch:'unknown'` + `isProductionSeverity:true`. `tests/neon-target.test.ts` 7/7 pass. | closed |
| T-39-01-06 | Elevation of Privilege | rewired seeder guard | mitigate | No `ALLOW_PROD`/`FORCE`/`SKIP_GUARD`/`--force` hatch in any seeder (only unrelated prose hits). **Strengthened beyond plan:** CR-03's fix replaced the planned `startsWith` denylist with an exact-hostname-equality allowlist in `scripts/_development-target.ts`, imported by all three seeders. | closed |
| T-39-01-SC | Tampering | npm/pip/cargo installs | mitigate | `git show --stat` on every phase-39 commit touching `package.json` shows no `package-lock.json` diff. | closed |

### 39-02 — `scripts/_env-precedence.ts`

| Threat ID | Category | Component | Disposition | Mitigation (verified) | Status |
|-----------|----------|-----------|-------------|------------------------|--------|
| T-39-02-01 | Elevation of Privilege | env file parsing | mitigate | `import { parse } from 'dotenv'` is the only value path. The 3 grep hits for `source` are the `source:` field name / `'process.env'` string literal, not a shell builtin. | closed |
| T-39-02-02 | Information Disclosure | `EnvResolution.url` | mitigate | `grep -Ec 'console\.(log|error|warn)' scripts/_env-precedence.ts` → **0**. | closed |
| T-39-02-03 | Information Disclosure | test fixtures | mitigate | `fixture:fixture` ×2; `process.cwd` → **0**; the single `process.env` hit is the assertion string literal `expect(resolution?.source).toBe('process.env')`. | closed |
| T-39-02-04 | Tampering | repo `.env*` files | mitigate | `mkdtempSync`/`rmSync` present (2 each) in `tests/env-precedence.test.ts`. | closed |
| T-39-02-05 | DoS / fail-open | missing or empty files | mitigate | `scripts/_env-precedence.ts:108` — `return { resolution: null, filesFound }`. Explicit null, never a guess. | closed |
| T-39-02-06 | Spoofing | ambient `DATABASE_URL` | mitigate | `processEnv` is a required parameter destructured from `opts`; module never reads ambient `process.env`. | closed |
| T-39-02-SC | Tampering | npm/pip/cargo installs | mitigate | No package installed; `dotenv` pre-existing. | closed |

### 39-03 — `scripts/_load-env.ts` + `scripts/_db-branch-guard.ts`

| Threat ID | Category | Component | Disposition | Mitigation (verified) | Status |
|-----------|----------|-----------|-------------|------------------------|--------|
| T-39-03-01 | Elevation of Privilege | corrected `_load-env.ts` precedence | mitigate | `envFileOrder(...)` and `assertSafeDatabaseTarget({ processEnv: preLoadEnv })` co-located in one file. `load-env-contracts.test.ts` Contract 1 (L70) asserts both; 6/6 pass. | closed |
| T-39-03-02 | Denial of Service | sanctioned production paths | mitigate | Guard returns immediately when `filesFound.length === 0`. `db-migrate.yml` and `ci.yml` inject `DATABASE_URL` as secrets/outputs, never via `.env*`. Empty-temp-dir SKIP test passes. *Scope note: the narrower `NODE_ENV=test` SKIP direction is tracked separately as WR-07 below and does not fall inside this threat's declared text.* | closed |
| T-39-03-03 | Information Disclosure | refusal / warning output | mitigate | `db-branch-guard.test.ts:185` asserts the refusal carries hostname + source and none of the fixture credential material (`secretmarker=MUSTNOTAPPEAR`). | closed |
| T-39-03-04 | Information Disclosure | uncaught rejection path | mitigate | `defaultOnRefuse` does `console.error(message)` + `process.exit(1)`, never throws; `classifyDatabaseTarget` catches `new URL()` failures itself (`refuse-malformed`), so `ERR_INVALID_URL.input` never reaches Node's default handler. | closed |
| T-39-03-05 | Spoofing | lookalike Neon domain | mitigate | `.neon.tech` `endsWith` pre-gate in `classifyDatabaseTarget`; `db-branch-guard.test.ts:90` FAIL-SAFE lookalike test passes. | closed |
| T-39-03-06 | Tampering | prefix match vs port suffix | mitigate | `grep -c 'URL.host\b' scripts/_db-branch-guard.ts` → **0** (`.hostname` only). Explicit `:5432` case at `db-branch-guard.test.ts:49` passes. | closed |
| T-39-03-07 | Elevation of Privilege | `probe-write-isolation.ts` | **accept** | Bound re-verified: the script does not import `./_load-env` (stdlib + `postgres` only). Contract 3 (L110) asserts `hasRealLoadEnvImport === false` and that the stricter inline gates `extractHostname`/`DEV_HOSTS`/`MAIN_HOSTS` are present. | closed |
| T-39-03-08 | Repudiation | silent removal of guard coverage | mitigate | Contract 4 (L126) hardcodes the 14-consumer census and diffs it against the filesystem; passes. | closed |
| T-39-03-SC | Tampering | npm/pip/cargo installs | mitigate | No package installed. | closed |

### 39-04 — `scripts/check-local-db-branch.sh` + `package.json` hooks

| Threat ID | Category | Component | Disposition | Mitigation (verified) | Status |
|-----------|----------|-----------|-------------|------------------------|--------|
| T-39-04-01 | Elevation of Privilege | env file reading | mitigate | `grep -E`/`sed -E`/`while IFS='\|' read` only; `grep -cE '^\s*(source|\.|eval)\s'` → **0**. | closed |
| T-39-04-02 | Information Disclosure | guard stdout | mitigate | Every `echo` interpolates only `$host`/`$source` (full read, L260-350). | closed |
| T-39-04-03 | Spoofing | port-suffix prefix bypass | mitigate | L240-242 isolate authority at `/`,`?`,`#`, then strip at last `@` then `:` — the bash equivalent of `URL.hostname`. | closed |
| T-39-04-04 | Spoofing | lookalike endpoint id | mitigate | `[ "$host" = "$record_hostname" ]` — exact equality on the FULL hostname, never prefix (~L298). | closed |
| T-39-04-05 | Denial of Service | Vercel / CI builds | mitigate | SKIP branch (~L108) keyed solely on file existence; no `CI`/`VERCEL` detection logic that could itself be spoofed. | closed |
| T-39-04-06 | Tampering / fail-open | NODE_ENV mismatch hook↔command | mitigate | `package.json:7` and `:9` — both `prebuild` and `prestart` pass `--node-env production` explicitly. This is the specific fail-open behind the 2026-09-06 incident. | closed |
| T-39-04-07 | Elevation of Privilege | `--root` bypass | **accept** | Bound re-verified: `grep -c -- '--root' package.json` → **0**. Neither npm hook passes `--root`. Advisory gate, not a privilege boundary. | closed |
| T-39-04-08 | Tampering | malformed `_neon-endpoints.list` | mitigate | `while IFS='\|' read -r field_1..field_4` (~L278) is per-record; unmatched records fall to the `*) verdict="unrecognised"` fail-safe arm (~L326). | closed |
| T-39-04-09 | Repudiation | unknown flag silently ignored | mitigate | Unknown-flag `case` arm (~L65) calls `usage; exit 2`. | closed |
| T-39-04-SC | Tampering | npm/pip/cargo installs | mitigate | `grep -c '"jq"' package.json` → **0**. No package installed. | closed |

### 39-05 — `tests/db-guard-differential.test.ts` + fixtures + docs

| Threat ID | Category | Component | Disposition | Mitigation (verified) | Status |
|-----------|----------|-----------|-------------|------------------------|--------|
| T-39-05-01 | Information Disclosure | fixture credentials in CI logs | mitigate | `db-guard-exit-codes.test.ts:96` asserts no case's output contains `MUSTNOTAPPEAR`; `_db-guard-fixtures.ts:39` sets `FIXTURE_QUERY = 'sslmode=require&secretmarker=MUSTNOTAPPEAR'`. | closed |
| T-39-05-02 | Tampering | repo `.env*` files | mitigate | `process.cwd` → **0** across all three files; `mkdtempSync(join(tmpdir(), 'db-guard-'))` at `_db-guard-fixtures.ts:65`; `cleanupFixtureDir` after every case and in `afterEach`. | closed |
| T-39-05-03 | Spoofing | inherited `DATABASE_URL` | mitigate | `...process.env` spread count → **0**; `toProcessEnv()` builds an explicit object from case-supplied vars only. | closed |
| T-39-05-04 | Elevation of Privilege | spawning a shell from a test | mitigate | `_db-guard-fixtures.ts:103` — `execFileSync('bash', [GUARD_PATH, '--root', dir, '--node-env', nodeEnv])`, argv array; `GUARD_PATH` resolved from module URL, not cwd. | closed |
| T-39-05-05 | Tampering | resolver drift after this phase | mitigate | `39-05-SUMMARY.md` "Negative-Control Results" records the mandated perturb→fail→revert cycle (suite failed `expected false to be true`, reverted, `git diff --exit-code` clean). 29/29 pass live including WR-01's Agreement 5/6. | closed |
| T-39-05-06 | Repudiation | documentation drifting from behaviour | mitigate | `grep -c 'prebuild' docs/operations/neon-branch-routing.md` → **1**; `grep -c -- '--node-env'` → **2**. | closed |
| T-39-05-07 | Denial of Service | temp-dir leakage | mitigate | `rmSync(dir, { recursive: true, force: true })` in `afterEach` (`db-guard-exit-codes.test.ts:39-41`) and per-case in the differential suite. | closed |
| T-39-05-SC | Tampering | npm/pip/cargo installs | mitigate | Only `node:*` stdlib imports in the new test files. | closed |

**Score: 41/41 closed** — 39 `mitigate`, 2 `accept` with bounds re-verified.

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Post-plan-time critical defects (CR-01 / CR-02 / CR-03)

Found by `39-REVIEW.md` *after* the register was authored. Not separate register entries,
but they bear on T-39-01-02/05/06, T-39-03-01/02 and T-39-04-01/03/08, so each was
re-checked against the live file rather than accepted on `39-REVIEW-FIX.md`'s narrative:

- **CR-01** — bash guard took `head -n1` of duplicate `DATABASE_URL=` lines while dotenv
  takes the last. Now `tail -n 1` at `check-local-db-branch.sh:191`, with the rationale
  comment at L172 citing CR-01 by name.
- **CR-02** — `parseNeonEndpointList` accepted an empty `prefix`, and `startsWith('')`
  matches everything. Now throws on empty `prefix`/`hostname`/`scope`, on a `hostname` not
  starting with its own `prefix`, and on overlapping prefixes.
- **CR-03** — seeders gated on a denylist, permitting an unrecognised or uppercase
  production endpoint. Replaced by `scripts/_development-target.ts`, a case-insensitive
  allowlist keyed on the `development` record, imported and called by all three seeders.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-39-01 | T-39-03-07 | `probe-write-isolation.ts` stays outside the shared loader per D-36-03. Its inline gates are *stricter* than the shared guard — exact equality against a two-element hostname set plus a driver-resolved-host re-check — so coverage is not reduced. Contract 3 fails if the import returns. | Antoine (plan-time, 39-03-PLAN.md) | 2026-09-06 |
| AR-39-02 | T-39-04-07 | An operator could point `--root` at an empty directory to force a SKIP. This guard is a local advisory gate, not a privilege boundary — the same operator can simply not run it. Residual risk bounded by `grep -c -- '--root' package.json` === 0. | Antoine (plan-time, 39-04-PLAN.md) | 2026-09-06 |

*Accepted risks do not resurface in future audit runs.*

---

## Residual Risks — Tracked (not accepted)

### WR-07 — DB guard `NODE_ENV=test` SKIP fail-open

**Status: open · tracked · deliberately not accepted.**

`scripts/_db-branch-guard.ts` computes its SKIP rule against `envFileOrder(nodeEnv)` for the
*caller's* node-env, and `envFileOrder('test')` deliberately excludes `.env.local`. On a
machine holding only `.env.local` and `.env.production.local`, running any of the 14
`import './_load-env'` consumers under `NODE_ENV=test` with a production `DATABASE_URL` in
the ambient environment or `.env.local` leaves `filesFound` empty — the guard returns
silently, unguarded.

Real and currently shipping. Pinned by `tests/db-branch-guard.test.ts:137`
(`'KNOWN GAP (pinned): nodeEnv test with .env.local on disk skips…'`, passing today) and
documented in `scripts/_db-branch-guard.ts`'s "KNOWN NARROWNESS OF THE SKIP RULE" docstring.

It is **not** one of the 41 registered threats — T-39-03-02's declared scope is "sanctioned
production paths are not blocked", which is fully mitigated. WR-07 is a distinct fail-open
direction found during implementation review.

The gsd-security-auditor proposed logging this as an accepted risk. That was declined at the
2026-09-07 audit: `.planning/todos/pending/wr-07-db-guard-skip-rule.md` states the change
"needs an operator decision", and accepting it here would stop it resurfacing in future
audits while the fail-open still ships. It therefore stays **open and tracked** until the
narrow bash+TS fix lands.

Mitigating context (why it does not block the phase): no sanctioned `npm run` script or
`.github/workflows/*.yml` sets `NODE_ENV=test` for a guarded command, so no automated path
reaches it. The obvious broadening — "skip only when no `.env*` exists in cwd" — is worse,
not better: `.env.example` is committed, so it would refuse inside `MIGRATE PROD` and CI's
ephemeral-branch step.

**Owner:** `.planning/todos/pending/wr-07-db-guard-skip-rule.md` (status: pending)
**Recommendation:** schedule the narrow fix as its own reviewed change with the CI paths
exercised, before Phase 39 is considered closed without caveat.

---

## Unregistered Flags

None. All five `39-0N-SUMMARY.md` files were checked for a `## Threat Flags` section; none
contains one — no executor self-reported new attack surface.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-07 | 41 | 41 | 0 | gsd-security-auditor (verify-only) + orchestrator spot-check |

Orchestrator spot-check re-ran the four most load-bearing greps independently
(T-39-04-06 hooks, T-39-04-07 `--root`, T-39-03-06 `URL.host`, T-39-04-01 `source`/`eval`)
plus the WR-07 pinned-test and CR-01 `tail -n 1` assertions. No discrepancies with the
auditor's reported counts.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter
- [ ] WR-07 residual risk remediated (tracked separately — does not gate this phase)

**Approval:** verified 2026-09-07
