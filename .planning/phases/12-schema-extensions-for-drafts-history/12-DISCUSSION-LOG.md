# Phase 12: Schema Extensions for Drafts + History - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `12-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-05-12
**Phase:** 12-schema-extensions-for-drafts-history
**Areas discussed:** Draft storage shape, Status surfacing (proposals + users), Append-only enforcement, Backfill + summary semantics

---

## Draft storage shape

### Where do drafts live?

| Option | Description | Selected |
|--------|-------------|----------|
| Same table, partial inputs only | Add `status` to `proposals`; for `status='draft'` rows, `inputs` mutable but `params_snapshot` and `computed` NULL until finalize. Single table, Phase 8 immutability preserved as a transition rule. | ✓ |
| Same table, all three jsonb nullable | Loosen NOT NULL on `inputs`, `params_snapshot`, `computed`; CHECK requires all three when status != 'draft'. Maximum flexibility but blurs wizard step semantics. | |
| Separate `proposal_drafts` table | New table for drafts; INSERT into `proposals` + DELETE the draft on finalize. Cleanest separation but `idempotency_key` checks against finalized rows only and Phase 14 "Brouillons" metric joins two tables. | |

**User's choice:** Same table, partial inputs only (Recommended).
**Notes:** Confirms single source of truth for the proposal lifecycle; Phase 8 immutability invariant becomes a draft → active transition rule rather than per-row.

### How many drafts can a partner have at once?

| Option | Description | Selected |
|--------|-------------|----------|
| Many drafts allowed | Multiple `status='draft'` rows simultaneously. New draft each visit without `?draft_id`. `idempotency_key` generated at finalize. | ✓ |
| At most one draft per partner | Always resumes the partner's single draft. Simpler "Brouillons" tile (0 or 1). | |
| Many drafts, with TTL | Many drafts allowed but auto-deleted after N days via cron. | |

**User's choice:** Many drafts allowed (Recommended).
**Notes:** No TTL, no auto-purge. Draft accumulation is acceptable risk; revisit only if observed in production.

---

## Status surfacing (proposals + users)

### How does `proposals.status` handle the 'expired' value?

| Option | Description | Selected |
|--------|-------------|----------|
| 3-value column + derived expired | Stored `status` is `('draft','active','deleted')`. 'expired' derived in query helpers from `pdf_generated_at + validity_days < now()`. No cron. 4 visual states still surface to UI via `deriveDisplayStatus()`. | ✓ |
| 4-value column + scheduled flip | Stored `status` is `('draft','active','expired','deleted')`. Daily cron flips active → expired. More explicit but adds cron path. | |
| Generated column | Postgres GENERATED ALWAYS column derived from `deleted_at` + `pdf_generated_at` + `validity_days`. Drizzle support shaky. | |

**User's choice:** 3-value column + derived expired (Recommended).
**Notes:** Avoids introducing a new cron path; expired is a function of time, not a state to transition into. `deriveDisplayStatus()` is the bridge to the 4-state `StatusChip`.

### How does partner 'invited' status surface?

| Option | Description | Selected |
|--------|-------------|----------|
| Derive from `lastLoginAt IS NULL` | No schema change. `listInvitedPartners()` query selects partners with no login. Single source of truth. | ✓ |
| Add `users.status` column | New text column `('actif','invited','désactivé')` with CHECK. Explicit but adds drift risk vs `deletedAt` + `lastLoginAt`. | |
| Add `invitedAt` timestamp | Track *when* the invite was sent. Adds a column for one bit of info already in `password_resets.kind='invite'`. | |

**User's choice:** Derive from `lastLoginAt IS NULL` (Recommended).
**Notes:** Phase 6 follow-up #3 / WR-AUDIT-01 must be closed inside Phase 12 (write `users.last_login_at` on every login) — otherwise every partner appears as "invited" forever and DB-02 silently fails.

---

## Append-only enforcement (DB-03)

### How is append-only enforced on `coefficient_history`?

| Option | Description | Selected |
|--------|-------------|----------|
| Postgres TRIGGER raising exception | `CREATE TRIGGER ... BEFORE UPDATE OR DELETE ... EXECUTE FUNCTION raise_append_only_violation()`. Clear, actionable error. Portable across Neon + OVH. | ✓ |
| Postgres RULE `DO INSTEAD NOTHING` | Silently swallows the mutation. Smaller migration but masks bugs (stale UPDATE returns 0 rows affected). | |
| Code discipline + ESLint grep gate | Match existing `global_params` convention. Lightweight, relies on contributor discipline. | |
| Trigger + RAISE NOTICE only | Trigger logs but allows the operation. Functionally equivalent to no enforcement. | |

**User's choice:** Postgres TRIGGER raising exception (Recommended).
**Notes:** Deliberate strengthening vs. Phase 8's `global_params` convention. The History sidebar audit feature relies on the data being honest; silent overwrites would defeat the purpose. Integration test verifies the trigger actually fires (D-20).

---

## Backfill + summary semantics

### Backfill `coefficient_history` from existing `global_params` rows?

| Option | Description | Selected |
|--------|-------------|----------|
| Backfill all prior rows | Pair adjacent `global_params` rows by `effective_from`; `before_json = NULL` for seed; auto-generated diff summary. Full timeline from day 1. | ✓ |
| Backfill only the latest N rows | Backfill 5-10 most recent rows. Smaller migration; older edits invisible. | |
| Start fresh from Phase 12 forward | No backfill. History sidebar shows "no history" until next admin edit. | |

**User's choice:** Backfill all prior rows (Recommended).
**Notes:** Migration creates table + trigger only; data backfill runs via a separate idempotent script `scripts/backfill-coefficient-history.ts` (D-14, D-15). Script uses typed-confirmation gate when targeting prod.

### How is `coefficient_history.summary` populated?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-generated diff + optional admin override | Server computes deterministic diff; admin form has optional text input that overrides if non-empty. Truth by default, intent when typed. | ✓ |
| Auto-generated only | Server always writes the deterministic diff. No admin input. | |
| Admin-typed only, required | Admin describes *why*; loses deterministic record (but `before_json`/`after_json` give that anyway). | |
| Reuse `global_params.note` | Mirror existing `note` column. Risk: spec'd `summary` semantics may diverge later. | |

**User's choice:** Auto-generated diff + optional admin override (Recommended).
**Notes:** `generateDiffSummary(before, after)` is a pure function in `src/lib/admin/coefficient-diff.ts`. Format: FR, semicolon-separated, only changed fields (D-17). The admin editor `summary` text input is Phase 14 work; Phase 12 only ships the parameter on `createCoefficientHistoryEntry()`.

---

## Claude's Discretion

The following decisions were left to the planner / executor:

- Exact column ordering in the migration (cosmetic).
- Whether to write an `audit_log` entry on `draft → active` finalize (recommend: yes, matching Phase 8's `proposal.create` semantics).
- Whether to audit-log every draft INSERT/UPDATE (recommend: no — drafts churn frequently).
- Whether `listInvitedPartners()` exposes pagination (recommend: no for v1.2; revisit if list grows past ~200).
- Whether `coefficient-diff.ts` outputs FR or i18n-keyed strings (recommend: FR only — audit log is admin-facing FR-primary).
- Exact name of the typed-confirmation env var for the backfill script (recommend: `BACKFILL_CONFIRM=YES`).
- Whether to colocate Vitest tests next to query helper files or use `__tests__` folder (follow existing `*.test.ts` colocated convention).
- Whether `softDeleteProposal` / `restoreProposal` accept the `status` flip as a side-effect or take an explicit arg (recommend: side-effect, lockstep with `deleted_at` per D-08).

## Deferred Ideas

- Admin coefficient editor `summary` input field (Phase 14).
- History sidebar component on Coefficients page (Phase 14).
- Liste des partenaires chip integration (Phase 14).
- 3-step wizard routes + form orchestration (Phase 13).
- `proposal.create_failed` audit semantics for draft promotion failures (Phase 13).
- TTL on stale drafts (rejected at D-02; revisit only if accumulation becomes ops problem).
- Generic audit-log viewer (v1.3+, already on `PROJECT.md` deferred list).
- Retrofitting append-only TRIGGER onto `global_params` (out of scope; Phase 8 convention has held).
- Better Auth `trustedOrigins` hardening / Phase 6 follow-up #2 (unrelated, milestone-level).
- Admin password rotation / Phase 6 follow-up #1 (milestone-level).
