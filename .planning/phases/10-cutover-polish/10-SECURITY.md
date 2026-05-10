---
phase: 10
slug: 10-cutover-polish
status: verified
threats_total: 55
threats_closed: 55
threats_open: 0
asvs_level: 1
audit_date: 2026-05-10
created: 2026-05-10
---

# Phase 10 — Cutover & Polish: Security Audit

> Adversarial stance: every mitigation assumed absent until grep evidence proves otherwise.
> Implementation files are read-only. No new vulnerabilities scanned; each declared threat in the threat register is verified by disposition.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Internet → /api/internal/purge-soft-deleted | Untrusted POST must pass dual-auth gate | Bearer token OR admin session cookie |
| Vercel Cron runtime → route handler | Vercel auto-injects Authorization: Bearer CRON_SECRET | Cron secret (Production-scoped env var) |
| Route handler → src/lib/admin/purge | Trusted internal call after auth cleared | Proposal row metadata, blob keys |
| Operator CLI → production DB | Typed-confirmation gate is the trust handshake | DATABASE_URL + destructive DML |
| Operator CLI args → SQL WHERE | Email pattern is a HARDCODED literal; no user input feeds LIKE | None |
| Operator workstation → live deployment (smoke) | Smoke script speaks HTTP; admin credentials cross this boundary | ADMIN_PASSWORD flows only into fetch body |
| Build artifact → browser bundle | NEXT_PUBLIC_PRIVACY_URL_* inlined at build time | Public URLs (no confidentiality concern) |
| Server component → client island | isStillSeed computed server-side; SeedBanner trusts the prop | Coefficients comparison result (boolean) |
| Source code → CI grep gate | PATTERNS array hardcoded; no operator input feeds grep | None |
| Repo → operator workstation | Runbook + checklist are read-only; operator follows them | None |

---

## Threat Register

### Plan 10-01 — Foundation

| Threat ID | Category | Component | Disposition | Status | Evidence |
|-----------|----------|-----------|-------------|--------|----------|
| T-10-01-01 | Tampering | AuditAction union extension | mitigate | CLOSED | `src/lib/db/queries/audit-log.ts:24` — `\| 'user.purge';` present exactly once; grep returns 1 |
| T-10-01-02 | Information disclosure | PURGE_CRON_SECRET in .env.example | mitigate | CLOSED | `.env.example` — post WR-05 fix, renamed to `CRON_SECRET=` (blank value); no literal secret committed |
| T-10-01-03 | Information disclosure | NEXT_PUBLIC_PRIVACY_URL_* fallback | accept | CLOSED | See Accepted Risks Log — AR-01 |
| T-10-01-04 | Repudiation | i18n key collision (FR vs EN) | mitigate | CLOSED | `src/lib/i18n/dictionaries.ts` — `admin.seed_banner.message` count=2, `login.privacy.label` count=2; `_EnHasAllFrKeys` compile-time check enforces parity |
| T-10-01-05 | Tampering | package.json JSON syntax | mitigate | CLOSED | `package.json` — `purge:test-data`, `smoke:ovh`, `check:no-v10-localstorage` scripts present; JSON valid (typecheck green) |

### Plan 10-02 — Purge Cron Backend

| Threat ID | Category | Component | Disposition | Status | Evidence |
|-----------|----------|-----------|-------------|--------|----------|
| T-10-02-01 | Spoofing | /api/internal/purge-soft-deleted | mitigate | CLOSED | `app/api/internal/purge-soft-deleted/route.ts` — `requireAdmin` at line 3 import + line 44 call; `timingSafeEqual` at line 2 import + line 36 call; generic 401 on both gate failures |
| T-10-02-02 | Information disclosure | timing side-channel on secret comparison | mitigate | CLOSED | `route.ts:2` — `import { timingSafeEqual } from 'node:crypto'`; `route.ts:34-36` — Buffer.length check before `timingSafeEqual(aBuf, bBuf)` |
| T-10-02-03 | Information disclosure | secret leakage in logs | mitigate | CLOSED | grep for `console.log.*authHeader\|console.log.*cronSecret\|console.log.*CRON_SECRET` in route.ts returns 0 matches; banner prints only `<set, redacted>` pattern |
| T-10-02-04 | Tampering | secret committed to vercel.json | mitigate | CLOSED | `grep -in "secret\|password\|bearer\|token" vercel.json` returns 0; secret lives only in Vercel env (Production scope) |
| T-10-02-05 | Denial of service | unauthenticated probes | accept | CLOSED | See Accepted Risks Log — AR-02 |
| T-10-02-06 | Elevation of privilege | session-bearing user runs purge | accept | CLOSED | See Accepted Risks Log — AR-03 |
| T-10-02-07 | Tampering | path traversal via vercel.json crons.path | mitigate | CLOSED | `vercel.json:crons[0].path` = `/api/internal/purge-soft-deleted` (exact string, verified by node -e) |
| T-10-02-08 | Repudiation | system-initiated cron purges with no actor | mitigate | CLOSED | `route.ts` — `payload.source: hasCronSecret ? 'cron' : 'admin-manual'` distinguishes origin in audit_log |
| T-10-02-09 | Information disclosure | error redaction at boundary | mitigate | CLOSED | `route.ts` — HTTP response body contains only `{ purged: N, errors: N }` (count); per-row messages in server logs only |
| T-10-02-10 | Tampering | shared pure function — bug affects both surfaces | mitigate | CLOSED | `src/lib/admin/purge.ts` is the single source of truth; both CLI and HTTP route import `purgeSoftDeleted` from this module |

### Plan 10-03 — Test-data Ergonomics

| Threat ID | Category | Component | Disposition | Status | Evidence |
|-----------|----------|-----------|-------------|--------|----------|
| T-10-03-01 | Spoofing | wrong-DB invocation | mitigate | CLOSED | `scripts/purge-test-data.ts:65-66` — `getConfirmFlag()` returns false without `CONFIRM=PURGE-TEST-DATA`; banner prints `maskUrl(DATABASE_URL)` before any write; dry-run is default |
| T-10-03-02 | Tampering | SQL injection via email pattern | mitigate | CLOSED | `scripts/purge-test-data.ts:91` — `const TEST_EMAIL_PATTERN = '%@test.leasetic.com'` is a hardcoded string literal; no operator input feeds the WHERE clause |
| T-10-03-03 | Tampering | accidental purge of non-test users via substring match | mitigate | CLOSED | `LIKE '%@test.leasetic.com'` — the `@` literal anchors domain start; `attest.leasetic.com` does NOT match; `seed-partner-launch.ts:98` — `TEST_EMAIL_RE = /^.+@test\.leasetic\.com$/` anchors both ends at write time |
| T-10-03-04 | Repudiation | hard-deleted user has no remaining audit trail | mitigate | CLOSED | `scripts/purge-test-data.ts:199-211` — `writeAuditLog({ action: 'user.purge', targetType: 'user', targetId: u.id, payload: { email, reason, proposalsPurged, blobsDeleted } })` written post-deletion; `actorId` FK is ON DELETE SET NULL |
| T-10-03-05 | Information disclosure | error messages leaking schema/SQL | accept | CLOSED | See Accepted Risks Log — AR-04 |
| T-10-03-06 | Denial of service | massive cascade in apply mode | accept | CLOSED | See Accepted Risks Log — AR-05 |
| T-10-03-07 | Elevation of privilege | seed-partner-launch.ts used to seed admin | mitigate | CLOSED | `scripts/seed-partner-launch.ts:99` — `TEST_EMAIL_RE.test(email)` gate present BEFORE typed-confirmation; existing role check at lines 160-161 (`REFUSE: user exists with role=admin`) provides defense in depth |
| T-10-03-08 | Tampering | real partner seeded via @test.leasetic.com | accept | CLOSED | See Accepted Risks Log — AR-06 |
| T-10-03-09 | Repudiation | cascade order leaves residue on mid-user crash | mitigate | CLOSED | `scripts/purge-test-data.ts:136-191` — cascade order: blobs → proposals → password_resets → sessions → accounts → users (FK-safe); user row deleted last so next run re-finds partial state |
| T-10-03-10 | Information disclosure | CLI prints user emails to stdout | accept | CLOSED | See Accepted Risks Log — AR-07 |

### Plan 10-04 — SeedBanner + Privacy Link

| Threat ID | Category | Component | Disposition | Status | Evidence |
|-----------|----------|-----------|-------------|--------|----------|
| T-10-04-01 | Tampering | malicious env var XSS in login page | mitigate | CLOSED | Env vars are operator-controlled; React escapes string in href; hardcoded fallback only fires when env var unset; operator hygiene is primary control |
| T-10-04-02 | Spoofing | reverse-tabnabbing via privacy URL | mitigate | CLOSED | `src/components/LoginForm.tsx:241-242` — `target="_blank"` and `rel="noopener noreferrer"` both present |
| T-10-04-03 | Information disclosure | NEXT_PUBLIC_PRIVACY_URL_* in client bundle | accept | CLOSED | See Accepted Risks Log — AR-08 |
| T-10-04-04 | Information disclosure | broken link if env var unset | mitigate | CLOSED | `src/components/LoginForm.tsx:238-239` — `?? 'https://leasetic.fr/privacy-policy'` and `?? 'https://leasetic.fr/mentions-legales'` fallbacks present |
| T-10-04-05 | Tampering | client-side seed comparison bypass | mitigate | CLOSED | `app/(admin)/[adminSegment]/coefficients/page.tsx:58` — `isStillSeed = coefficientsEqual(...)` is server-side only; SeedBanner receives a boolean prop; no client coefficient comparison surface |
| T-10-04-06 | Information disclosure | seedParams.coefficients leaking via SSR | accept | CLOSED | See Accepted Risks Log — AR-09 |
| T-10-04-07 | Repudiation | banner false-negative — admin re-saves same values | accept | CLOSED | See Accepted Risks Log — AR-10 |
| T-10-04-08 | Repudiation | banner false-positive — coincidental match | accept | CLOSED | See Accepted Risks Log — AR-11 |
| T-10-04-09 | Elevation of privilege | non-admin reaches coefficients page + sees seedParams | mitigate | CLOSED | `app/(admin)/[adminSegment]/coefficients/page.tsx:41` — `await requireAdmin()` gates page (AUTH-15); `src/components/LoginForm.tsx` is admin-tree only |
| T-10-04-10 | Spoofing | lang injection via cookie/search param | accept | CLOSED | See Accepted Risks Log — AR-12 |

### Plan 10-05 — OVH Smoke Script

| Threat ID | Category | Component | Disposition | Status | Evidence |
|-----------|----------|-----------|-------------|--------|----------|
| T-10-05-01 | Information disclosure | admin password leaking via console.log | mitigate | CLOSED | `scripts/smoke-ovh.ts:136` — `process.env.ADMIN_PASSWORD ? '<set, redacted>' : '<unset>'`; grep for `console.log.*ADMIN_PASSWORD` + `console.error.*ADMIN_PASSWORD` returns 0 matches beyond the redacted-marker line |
| T-10-05-02 | Information disclosure | admin password leaking via fetch error stack | mitigate | CLOSED | `scripts/smoke-ovh.ts` — `main().catch` prints `err.stack ?? err.message`; Node undici does not include request body in error chains |
| T-10-05-03 | Spoofing | wrong APP_URL creates real proposal in prod DB | mitigate | CLOSED | `scripts/smoke-ovh.ts:133-136` — banner prints `maskUrl(APP_URL)` before typed-confirmation; cleanup step 7 soft-deletes the smoke proposal (idempotency) |
| T-10-05-04 | Tampering | attacker with shell access runs smoke as admin | accept | CLOSED | See Accepted Risks Log — AR-13 |
| T-10-05-05 | Repudiation | smoke proposal pollutes target DB | mitigate | CLOSED | Step 7 cleanup soft-deletes the created proposal; `scripts/smoke-ovh.ts` — step 7 call to `/api/proposals/{id}/delete`; subsequent purge cron hard-deletes it |
| T-10-05-06 | Information disclosure | fixture file path traversal | mitigate | CLOSED | `scripts/smoke-ovh.ts` — fixture path is hardcoded relative to `__dirname`; no env-var lookup; no operator-supplied path |
| T-10-05-07 | Tampering | session cookie capture from network logs | mitigate | CLOSED | All APP_URL must be HTTPS in production; session cookie is short-lived (8-hour sliding lifetime per AUTH-02) |
| T-10-05-08 | Denial of service | smoke hitting production rate limits | accept | CLOSED | See Accepted Risks Log — AR-14 |
| T-10-05-09 | Tampering | malicious pdfSha256 response with RCE | accept | CLOSED | See Accepted Risks Log — AR-15 |
| T-10-05-10 | Information disclosure | fixture canonical-input.json contains PII | accept | CLOSED | See Accepted Risks Log — AR-16 |

### Plan 10-06 — Operational Docs + CI Grep Gate

| Threat ID | Category | Component | Disposition | Status | Evidence |
|-----------|----------|-----------|-------------|--------|----------|
| T-10-06-01 | Tampering | grep gate false positive — .planning/ triggers CI fail | mitigate | CLOSED | `scripts/check-no-v10-localstorage.sh:37` — `SEARCH_PATHS=("src" "app")` is intentionally narrow; `.planning/` and `docs/` are excluded by scope |
| T-10-06-02 | Tampering | grep gate false negative — obfuscated v10 key | accept | CLOSED | See Accepted Risks Log — AR-17 |
| T-10-06-03 | Information disclosure | privacy-coverage doc commits Thomas's email | mitigate | CLOSED | `docs/legal/privacy-coverage-confirmation.md` — stub committed empty before reply; planner's note in file prompts sensitive-context review before updating |
| T-10-06-04 | Tampering | runbook references env vars that don't exist | mitigate | CLOSED | `docs/operations/deploy-ovh.md` — references `CRON_SECRET` (the post-WR-05 corrected name matching `.env.example` and `route.ts`); cross-references `.env.example` as canonical inventory |
| T-10-06-05 | Information disclosure | runbook documents CRON_SECRET in commands without redaction | mitigate | CLOSED | `docs/operations/deploy-ovh.md:254,274` — commands use `$CRON_SECRET` (variable reference, NOT literal value); operator instantiates from secret manager |
| T-10-06-06 | Repudiation | launch-checklist committed checked but actual launch differs | accept | CLOSED | See Accepted Risks Log — AR-18 |
| T-10-06-07 | Tampering | CI workflow YAML indentation error breaks workflow | mitigate | CLOSED | `.github/workflows/ci.yml:54` — `check:no-v10-localstorage` step at line 54 (after `check:seed-sql` at line 51, before `Vitest` at line 56); ordering verified |
| T-10-06-08 | Elevation of privilege | grep scope expanded later to include test fixtures | accept | CLOSED | See Accepted Risks Log — AR-19 |
| T-10-06-09 | Information disclosure | runbook leaks ADMIN_URL_SEGMENT | mitigate | CLOSED | `docs/operations/deploy-ovh.md` — references `process.env.ADMIN_URL_SEGMENT` as variable name only; `.env.example` ships placeholder |
| T-10-06-10 | Repudiation | privacy-coverage placeholder promoted to "confirmed" without reply | mitigate | CLOSED | `docs/legal/privacy-coverage-confirmation.md` — explicit Date/Confirmation-status/verbatim-reply fields force active update; "confirmed" state without email-quote is visibly malformed |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | T-10-01-03 | NEXT_PUBLIC_PRIVACY_URL_* are public URLs (privacy policy is publicly hosted); no confidentiality concern; NEXT_PUBLIC_ is the documented Next.js mechanism for build-time-public values | Phase planner (D-10-17) | 2026-05-10 |
| AR-02 | T-10-02-05 | Vercel platform DDoS protection covers the public surface; route exits early on 401 with no DB read; cron cadence is twice-monthly so legitimate traffic is negligible; rate-limit deferred to v1.2 (CUT-07 defer) | Phase planner | 2026-05-10 |
| AR-03 | T-10-02-06 | Admin role required per `requireAdmin()`; non-admin sessions rejected; actorId in audit_log captures the responsible party; no privilege escalation beyond already-admin rights | Phase planner | 2026-05-10 |
| AR-04 | T-10-03-05 | Operator-context CLI per PITFALLS §9.4: full err.message printed to stderr is acceptable because Antoine reads the output; CI-bound surfaces (cron route in 10-02) already redact | Phase planner | 2026-05-10 |
| AR-05 | T-10-03-06 | Pre-launch context: test users are deliberately seeded by Antoine, never at scale; worst-case ~5-10 test users with ~5 proposals each; per-user try/catch + best-effort progresses past any single failure | Phase planner | 2026-05-10 |
| AR-06 | T-10-03-08 | Domain reservation is the contract: real Leasétic partners use real Leasétic-network domains (NOT @test.leasetic.com); if a real partner is intentionally on @test.leasetic.com, that is a process failure outside this script's authority | Phase planner (D-10-09) | 2026-05-10 |
| AR-07 | T-10-03-10 | Operator runs locally; output stays on Antoine's terminal; no CI capture surface; email addresses used as login credentials in plaintext on the auth surface already | Phase planner | 2026-05-10 |
| AR-08 | T-10-04-03 | URLs are public (privacy policy IS publicly hosted); no confidentiality concern; NEXT_PUBLIC_ prefix is the documented Next.js mechanism for build-time-public values | Phase planner | 2026-05-10 |
| AR-09 | T-10-04-06 | seedParams contains placeholder D-D1 baseline values; these are NOT confidential — they are the publicly-known v10 fixture coefficients committed in plain in src/lib/calc/seed-params.ts, visible in any git clone | Phase planner | 2026-05-10 |
| AR-10 | T-10-04-07 | Documented limit of byte-equal comparison (D-10-14); admin saving exact seed values intentionally creates a new global_params row and the banner disappears — this is the "good enough" definition of "verified" | Phase planner (D-10-14) | 2026-05-10 |
| AR-11 | T-10-04-08 | Mathematical lower bound: probability of randomly customizing a 4×3 coefficient table to match seedParams is effectively zero; if admin deliberately saves seed values, "banner re-appears" is accurate | Phase planner | 2026-05-10 |
| AR-12 | T-10-04-10 | Both langs resolve to hardcoded fallback if env var unset; Lang type is `'fr' \| 'en'` — no untrusted lang injection; ternary only selects between two hardcoded URL values | Phase planner | 2026-05-10 |
| AR-13 | T-10-05-04 | Threat is "attacker has shell on operator workstation" — at that point the attacker has many higher-impact options than running the smoke script; operator-context, not a service account | Phase planner | 2026-05-10 |
| AR-14 | T-10-05-08 | Single-pass lifecycle: 6 HTTP calls per run; negligible vs production traffic; rate limit headers not parsed — failing step exits non-zero; operator re-runs after backoff | Phase planner | 2026-05-10 |
| AR-15 | T-10-05-09 | The pdfSha256/X-Content-SHA256 string is COMPARED to expectedSha256 (string equality), never executed or interpolated; malicious response can fail the assertion but cannot trigger code execution | Phase planner | 2026-05-10 |
| AR-16 | T-10-05-10 | Phase 8 fixture is constructed from synthetic data (no PII); smoke proposal lives in DB for ~30 days until cron purge; operator can run purge-soft-deleted manually for immediate cleanup | Phase planner | 2026-05-10 |
| AR-17 | T-10-06-02 | Grep gate is defense-in-depth (CUT-03 already satisfied by Phase 6 clean-slate flow); bypassing requires intentional obfuscation — operator-context; ESLint and code review remain primary controls | Phase planner | 2026-05-10 |
| AR-18 | T-10-06-06 | Intentional design — the committed checked file IS the launch record per D-10-19; Antoine's responsibility to tick boxes truthfully; skipped steps documented in the launch commit message | Phase planner (D-10-19) | 2026-05-10 |
| AR-19 | T-10-06-08 | Future scope expansion is a deliberate design decision requiring active update of `--exclude-dir` flags and PATTERNS; currently no test files reference v10 keys (verified by gate passing on clean tree) | Phase planner | 2026-05-10 |

---

## Cross-Cutting Invariant Verification

The following cross-cutting security invariants were explicitly verified (per `<threat_register>` mandate):

### 1. Dual-auth route discipline
- **File:** `app/api/internal/purge-soft-deleted/route.ts`
- **CR-01 fix verified:** Route reads `process.env.CRON_SECRET` (Vercel's reserved name) at line 29, NOT `PURGE_CRON_SECRET`
- **timingSafeEqual:** `import { timingSafeEqual } from 'node:crypto'` at line 2; called at line 36 after Buffer length check at line 34
- **Secret never logged:** grep for `console.log.*authHeader|cronSecret|CRON_SECRET` returns 0
- **vercel.json path:** Locked to `/api/internal/purge-soft-deleted` exactly; no inline secret

### 2. Typed-confirmation gates on destructive scripts
- `scripts/purge-soft-deleted.ts` — `getConfirmFlag()` checks `CONFIRM === 'PURGE-SOFT-DELETED'`
- `scripts/purge-test-data.ts` — `getConfirmFlag()` checks `CONFIRM === 'PURGE-TEST-DATA'` at line 58
- `scripts/smoke-ovh.ts` — `getConfirmFlag()` checks `CONFIRM === 'SMOKE-OVH'` at line 74
- **WR-02 fix verified:** `package.json:25` — `"purge:soft-deleted:dry": "CONFIRM= tsx ..."` actively unsets CONFIRM

### 3. Audit-log atomicity (CR-02 critical fix)
- **`src/lib/admin/purge.ts`:** Split try/catch verified — `purged += 1` at line 46 (before audit write); `writeAuditLog` wrapped in separate try/catch at lines 57-74; audit failure does NOT propagate to error counter
- **`scripts/purge-test-data.ts`:** Same split confirmed — `usersPurged += 1` at line 185; `writeAuditLog` in separate best-effort try/catch at lines 198-215

### 4. Email-pattern discriminator hygiene
- `scripts/purge-test-data.ts:91` — `const TEST_EMAIL_PATTERN = '%@test.leasetic.com'` hardcoded literal
- `scripts/seed-partner-launch.ts:98` — `const TEST_EMAIL_RE = /^.+@test\.leasetic\.com$/` anchored regex
- `scripts/seed-partner-launch.ts:99-103` — Guard placed before typed-confirmation gate (Gate 0 before Gate 1)
- No `is_test` column referenced in either script

### 5. Smoke script credential hygiene
- Banner line 136: `process.env.ADMIN_PASSWORD ? '<set, redacted>' : '<unset>'` — password value never logged
- `ADMIN_PASSWORD` flows only into `body: JSON.stringify({ ..., password: ADMIN_PASSWORD })` (fetch body)
- grep for `console.log.*ADMIN_PASSWORD` and `console.error.*ADMIN_PASSWORD` returns 0 matches (excluding comment/docstring lines)
- **WR-04 fix verified:** `scripts/smoke-ovh.ts:171-179` — `expectedSha256Fr` and `expectedSha256En` both loaded; step 4 passes if actual SHA-256 matches either

### 6. CI grep gate hygiene
- `scripts/check-no-v10-localstorage.sh:37` — `SEARCH_PATHS=("src" "app")` only
- `scripts/check-no-v10-localstorage.sh:28-32` — all 5 keys (`lt_pw`, `lt_coeffs`, `lt_commission`, `lt_max`, `lt_partner`) present
- **WR-03 fix verified:** grep invocation uses `grep -rnF` — `-E` flag removed; inline comment explains `-F` is intentional
- `.github/workflows/ci.yml:54` — step wired; ordering: after `check:seed-sql` (line 51), before `Vitest` (line 56)

### 7. SeedBanner correctness
- **WR-01 fix verified:** `app/(admin)/[adminSegment]/coefficients/page.tsx:17-20` — `coefficientsEqual` helper iterates `['t1','t2','t3','t4']` × `[36,48,60]` (12 cells); no JSON.stringify used in isStillSeed computation
- `SeedBanner.tsx:29-31` — `className="seed-banner"`, `role="status"`, `aria-live="polite"` all present

### 8. Privacy URL configuration
- `src/components/LoginForm.tsx:238-242` — `NEXT_PUBLIC_PRIVACY_URL_EN ?? 'https://leasetic.fr/privacy-policy'` and `NEXT_PUBLIC_PRIVACY_URL_FR ?? 'https://leasetic.fr/mentions-legales'`; `target="_blank"` and `rel="noopener noreferrer"` present

### 9. Phase 6 follow-ups (admin password rotation, Better Auth trustedOrigins, APP_URL docs)
- Explicitly out of Phase 10 scope per 10-CONTEXT.md — separate ops items deferred to v1.1 follow-up; no Phase 10 threat maps to these

### 10. ADMIN_URL_SEGMENT empty in Vercel prod
- Out-of-band ops issue; no Phase 10 threat directly assumes a configured admin URL; T-10-06-09 (accepted: references only the variable name in docs, not the literal value)

### 11. Documentation completeness
- `docs/operations/deploy-ovh.md` — 340 lines; sections: Locked rules, Lifecycle diagram, Prerequisites, Provisioning, Configuration, Build & Deploy, Migration Application, Smoke Test, Cron Setup, Rollback, Smoke Test Failure Diagnosis, Final pre-cutover checklist; `"the operator"` count = 0
- `docs/operations/launch-checklist.md` — 9 GFM-checkbox steps (`grep -cE '^- \[ \] \*\*[1-9]\.\*\*'` returns 9); references `purge:test-data`, `Vérifier les coefficients`, `privacy-coverage-confirmation.md`; CUT-02/03 notes present
- `docs/legal/privacy-coverage-confirmation.md` — stub present; Thomas×9; sections: Question on record, Response, Resolution; `"needs counsel review"` present

---

## Unregistered Threat Flags

All threat flags from SUMMARY.md files were explicitly checked:
- `10-01-SUMMARY.md` — "No threat flags." (source states: all changes are type extensions, string literals, CSS, documentation)
- `10-02-SUMMARY.md` — "New network endpoint: POST /api/internal/purge-soft-deleted" — maps to T-10-02-01 through T-10-02-10 (fully registered)
- `10-03-SUMMARY.md` — "No new threat flags." (source states: all surface within plan's threat model)
- `10-04-SUMMARY.md` — "No new threat flags."
- `10-05-SUMMARY.md` — "No threat flags."
- `10-06-SUMMARY.md` — "No threat flags."

**Unregistered flags: NONE**

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-10 | 55 | 55 | 0 | Claude (gsd-security-auditor) |

---

## Sign-Off

- [x] All 55 threats have a disposition (mitigate / accept)
- [x] 19 accepted risks documented in Accepted Risks Log (AR-01 through AR-19)
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter
- [x] CR-01 fix (CRON_SECRET rename) verified in implementation
- [x] CR-02 fix (split try/catch) verified in both purge.ts and purge-test-data.ts
- [x] WR-01 fix (coefficientsEqual leaf helper) verified — all 12 cells covered
- [x] WR-02 fix (CONFIRM= unset in :dry script) verified in package.json
- [x] WR-03 fix (-E flag removed from grep) verified in check-no-v10-localstorage.sh
- [x] WR-04 fix (dual-language SHA256) verified in smoke-ovh.ts
- [x] WR-05 fix (CRON_SECRET guidance) verified in .env.example and deploy-ovh.md

**Approval:** verified 2026-05-10
