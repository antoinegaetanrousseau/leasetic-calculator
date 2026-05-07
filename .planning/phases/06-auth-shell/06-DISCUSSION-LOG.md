# Phase 6: Auth & Shell - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-07
**Phase:** 6-auth-shell
**Areas discussed:** none (user explicitly skipped per "keep going" response)

---

## Setup before interaction

The orchestrator analyzed Phase 6 against PROJECT.md, REQUIREMENTS.md (32 active requirements: AUTH-01..18 + SHELL-01..14), STATE.md "Locked architectural decisions", ARCHITECTURE.md, PITFALLS.md, STACK.md, and the Phase 5 UI-SPEC. The vast majority of architectural decisions were already locked — most as hard locks, a few as soft locks that flagged "verify in Phase 6." The orchestrator surfaced four candidate gray areas for the user to multi-select.

**Candidate gray areas presented:**

| Option | Description |
|--------|-------------|
| Auth library re-verification | Better Auth 1.6.x soft-locked 2026-05-05 with "unless Phase 6 verification flips it"; check current state of Better Auth, confirm Drizzle adapter + Next.js 16.2.4 + React 19 alignment, OR research alternatives. |
| Schema scope for Phase 6 | Today `src/db/schema.ts` only has `schema_meta`. Phase 6 needs `users` + `password_resets` at minimum. Do we also create stubs for `global_params` / `audit_log` / `proposals` (jsonb DDL only, no app code) so downstream phases don't fight migrations, or keep this phase tight to AUTH/SHELL? |
| Invitation & reset URL UX | Admin generates invitation/reset tokens, shares out-of-band (no SMTP). What's the admin-side UX — modal with copy button? token TTL (24h per ARCH or longer)? expired-token landing page copy? what if admin loses the URL (re-issue button or "create new token" flow)? |
| CLI admin-grant script | AUTH-12: admin role granted only via CLI script run on prod DB by Antoine. Does the script (a) require user to already exist via invitation or (b) create the user + emit invitation URL in one step? Idempotent on re-run? Where does Antoine + Emmanuel get their initial password — invitation URL flow or hashed password baked in env? |

---

## User's response

> "none, I want to keep going with the build and commit to these changes"

The user explicitly accepted all soft-locks as final and chose to skip discussion. The orchestrator interpreted this as: lock in the existing soft-locks (Better Auth 1.6.x, env-driven hidden admin URL, JWT + session_version, no SMTP, cookie dark mode, hand-rolled i18n) as final, and apply sensible defaults grounded in ARCHITECTURE.md and PITFALLS.md for the four gray areas above.

## Defaults applied (in CONTEXT.md)

| Gray area | Default applied | Source |
|-----------|----------------|--------|
| Auth library | Better Auth 1.6.x final-locked. Pin exact version. | STATE.md soft-lock + STACK §3 |
| Schema scope | Phase 6 creates ONLY `users` + `password_resets`. Other tables deferred to their owning phases (8 + 9). | Minimum-needed principle; smaller migrations are safer per Phase 5 lessons |
| Invitation/reset UX | 24h TTL; admin sees URL once in a modal with copy-button + "won't be shown again" warning; re-issuance allowed and invalidates prior unused tokens; tokens are 32 random bytes URL-safe-base64, stored as sha256 hex; routes `/invite/{token}` and `/reset/{token}`. | ARCHITECTURE §4.3 (TTL) + standard rotatable-secret pattern |
| CLI grant-admin script | `scripts/grant-admin.ts` mirrors `scripts/migrate.ts` typed-confirmation pattern; idempotent (upgrade existing user OR create + emit invitation URL); Antoine + Emmanuel each set their own password via the invitation URL. | Phase 5 `scripts/migrate.ts` pattern + ARCHITECTURE §4.3 |

## Claude's Discretion

Areas left to the planner / researcher:
- Exact Better Auth API surface — confirm in Phase 6 research that `signIn`, JWT callback shape, and the Drizzle adapter still match the patterns in STACK.md §3 (training-data caveat from research session).
- ESLint rule implementation for "no hardcoded JSX strings" — plain `no-restricted-syntax` or a custom rule; both work.
- Audit-log writes during Phase 6 (admin-disable, grant-admin events) — defer to Phase 9 backfill OR emit structured server logs now. Either is acceptable; CONTEXT.md flags this in the Deferred Ideas section.
- Exact session cookie name (Better Auth's default vs. `lt_session` to match the `lt_*` namespace from Phase 5).
- argon2 work factor — must be tuned during Phase 6 acceptance testing on a cold Vercel function (PITFALLS §2.4).

## Deferred Ideas

(See CONTEXT.md `<deferred>` section.)

- `/settings` page (defer until self-service password change is in scope, likely v1.2)
- Self-service password reset via SMTP (already deferred to v1.2)
- Audit-log table writes for Phase 6 events (Phase 9 owns the table)
- 2FA / lockout / "Remember me" / CAPTCHA (Out of Scope per REQUIREMENTS.md)
- Admin partner-listing UI (Phase 9; the disable *primitive* lives in Phase 6, the UI calls it from Phase 9)
- Cross-partner "view as" tool (v1.2+ Future Requirements)
- Session revocation reason logging
