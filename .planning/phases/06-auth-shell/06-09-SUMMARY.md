---
phase: 06-auth-shell
plan: "09"
subsystem: auth-cli
tags: [auth, cli, admin, security, idempotent]
dependency_graph:
  requires:
    - 06-01  # schema (users + passwordResets tables)
    - 06-03  # tokens.ts (generateToken + hashToken)
  provides:
    - scripts/grant-admin.ts — the ONLY path for admin role assignment (AUTH-12)
    - package.json grant:admin npm script
  affects:
    - v1.1 launch operational runbook (D-15: run twice for Antoine + Emmanuel)
tech_stack:
  added: []
  patterns:
    - postgres-js CLI pattern (mirrors scripts/migrate.ts: max=1, prepare=false, hostname masking, SIGINT-safe cleanup)
    - Typed-confirmation gate (CONFIRM=GRANT-ADMIN-<email>) per D-16
    - randomBytes(16).base64url.slice(0,21) for Better Auth-compatible user IDs
    - generateToken() from tokens.ts for SHA-256-hashed invitation tokens
key_files:
  created:
    - scripts/grant-admin.ts
  modified:
    - package.json
decisions:
  - key: user-id-generation
    choice: randomBytes(16).toString('base64url').slice(0,21)
    rationale: Better Auth nanoid is an internal library detail not exported as a standalone function; randomBytes(16).base64url gives the same ~21-char URL-safe alphanumeric ID with equivalent entropy. No external nanoid package needed.
  - key: display-name-fallback
    choice: capitalize each segment of email local-part split by . _ -
    rationale: D-14 specified this exact pattern. Example — antoine.rousseau@memento.eco → "Antoine Rousseau". Admin can edit displayName later via Phase 9 partner-edit UI.
  - key: disabled-user-token-invalidation
    choice: DELETE all prior passwordResets rows for the user before inserting the new invite token
    rationale: D-11 specifies re-issuance invalidates prior unused tokens. Simple DELETE avoids partial-state edge cases where an old invite token remains active after re-enable.
metrics:
  duration: "1 minute"
  completed: "2026-05-08T16:53:52Z"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 1
  commits: 1
---

# Phase 06 Plan 09: Grant-Admin CLI Summary

**One-liner:** Production CLI `scripts/grant-admin.ts` that is the sole AUTH-12-authorized path for granting admin role — idempotent 4-branch decision tree, D-16 typed-confirmation gate, 24h invitation URL emission via the same `generateToken` + `passwordResets` machinery as the app.

## What Was Built

### `scripts/grant-admin.ts`

A tsx-runnable CLI script that grants admin role on the production database. Mirrors `scripts/migrate.ts` boilerplate precisely:

- `import 'dotenv/config'` for `.env` file loading
- `postgres(url, { max: 1, prepare: false, onnotice: () => {} })` connection
- URL hostname masking via `new URL(url).hostname` — never logs credentials
- `main().catch()` top-level error handler
- `await client.end({ timeout: 5 })` in `finally` block

**D-16 typed-confirmation gate (before any mutation):**
```
CONFIRM=GRANT-ADMIN-<email>   # required env var, must match email exactly
```
Without it, exits with code 2 and a clear FATAL message.

**Idempotent 4-branch decision tree:**

| Branch | Condition | Action |
|--------|-----------|--------|
| 1 | User exists, role=admin, deletedAt=null | No-op log, exit 0 |
| 2 | User exists, role=partner, deletedAt=null | UPDATE role='admin', log, exit 0 |
| 3 | User exists, deletedAt IS NOT NULL (disabled) | UPDATE role=admin + deletedAt=null + DELETE prior tokens + INSERT new invite token + print invitation URL |
| 4 | User does not exist | INSERT users row (id=nanoid, role=admin) + INSERT invite token + print invitation URL |

**`--display-name` flag:** Optional. If omitted, `defaultDisplayName()` capitalizes each segment of the email local-part split by `.`, `_`, `-`. Example: `antoine.rousseau@memento.eco` → `Antoine Rousseau`.

**User ID generation:** `randomBytes(16).toString('base64url').slice(0, 21)` — produces a ~21-char URL-safe alphanumeric ID identical in entropy and format to Better Auth's nanoid. Better Auth's nanoid function is an internal detail not exported as a standalone utility; this approach avoids any dependency on library internals.

**Invitation URL shape:** `${APP_URL ?? 'http://localhost:3000'}/invite/${plaintext}` — the 43-char URL-safe base64 plaintext from `generateToken()`. The DB stores `sha256(plaintext)` in `passwordResets.token_hash`. TTL = 24 hours. Single-use (Plan 06-05's redemption flow sets `usedAt`).

### `package.json` — new `grant:admin` script

```json
"grant:admin": "tsx scripts/grant-admin.ts"
```

Invocation at v1.1 launch (D-15):
```bash
CONFIRM=GRANT-ADMIN-antoine.rousseau@memento.eco \
  npm run grant:admin -- antoine.rousseau@memento.eco --display-name "Antoine Rousseau"
# Copy invitation URL, share out-of-band

CONFIRM=GRANT-ADMIN-<emmanuel-email> \
  npm run grant:admin -- <emmanuel-email> --display-name "Emmanuel ..."
# Copy invitation URL, share out-of-band
```

## Smoke Test Outputs

**Smoke test 1 — no CONFIRM env var:**
```
$ npm run grant:admin -- bad@example.com
[grant-admin] FATAL: typed-confirmation gate not satisfied.
[grant-admin] Expected:  CONFIRM=GRANT-ADMIN-bad@example.com
[grant-admin] Received:  CONFIRM=(unset)
EXIT=2
```

**Smoke test 2 — CONFIRM set but no DATABASE_URL:**
```
$ DATABASE_URL='' CONFIRM=GRANT-ADMIN-bad@example.com npm run grant:admin -- bad@example.com
[grant-admin] FATAL: DATABASE_URL is not set
EXIT=2
```

Both gate-failure modes exit with code 2 as required by the acceptance criteria.

## Verification Results

| Check | Result |
|-------|--------|
| `ls scripts/grant-admin.ts` | FOUND |
| `grep -c '"grant:admin"' package.json` | 1 |
| Smoke test (no CONFIRM) exits 2 | PASS |
| Smoke test (no DATABASE_URL) exits 2 | PASS |
| `npm run typecheck` | exit 0 |
| `npm run lint:check` | exit 0 |
| `npm run check:no-drizzle-push` | exit 0 (OK: no 'drizzle-kit push' invocations found) |
| `grep -c "GRANT-ADMIN-" scripts/grant-admin.ts` | 4 |
| `grep -c "generateToken" scripts/grant-admin.ts` | 3 |
| `grep -c "max: 1" scripts/grant-admin.ts` | 1 |

## Threat Model Coverage

All STRIDE mitigations from the plan's `<threat_model>` are implemented:

| Threat ID | Mitigation | Implemented |
|-----------|-----------|-------------|
| T-06-09-01 | D-16 typed-confirmation gate (`CONFIRM=GRANT-ADMIN-<email>`) | Yes — exits 2 without it |
| T-06-09-02 | DATABASE_URL hostname masking | Yes — `new URL(url).hostname` |
| T-06-09-05 | No-op on active admin; never touches `accounts` table | Yes — branch 1 is explicit no-op |
| T-06-09-07 | argv[2] string + Drizzle parameterization prevents injection | Yes — Drizzle postgres-js prepared params |

Accepted threats (T-06-09-03/04/06/08/09) require no code implementation.

## Deviations from Plan

None — plan executed exactly as written. The script code in the plan's `<action>` block was used as the authoritative template. Minor adjustments made for consistency:

- Added `[grant-admin]` prefix to the DATABASE_URL FATAL message (matches other log lines)
- Kept the plan's exact 4-branch structure and variable names

## Known Stubs

None. The script is complete and operational. No placeholder text or empty data sources.

## Threat Flags

None. No new network endpoints, auth paths, or schema changes introduced. The script accesses `users` and `passwordResets` tables which are already in the Phase 6 threat model.

## Self-Check: PASSED

- `scripts/grant-admin.ts` — FOUND
- `package.json` grant:admin entry — FOUND (1 occurrence)
- Commit b058463 — FOUND in git log
- typecheck, lint:check, check:no-drizzle-push — all exit 0
