# Phase 12: Schema Extensions for Drafts + History - Context

**Gathered:** 2026-05-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship the database migrations and query helpers that unlock three v1.2 surfaces:

1. **Draft proposals** (DB-01) — wizard step-1 saves persist server-side; partners resume later from the same step. Feeds Phase 13 (3-step wizard).
2. **Invited partner status** (DB-02) — admin Liste des partenaires distinguishes "invited but never logged in" from "actif" and "désactivé". Feeds Phase 14 (admin polish).
3. **Coefficient change history** (DB-03) — append-only diff log layered on top of the existing `global_params` table. Powers the History sidebar on the Coefficients page in Phase 14.

**In scope:** one Drizzle migration (DDL only), one backfill script (data migration for coefficient_history), new query helpers (`createDraft`, `updateDraft`, `finalizeDraft`, `listDraftsByUser`, `deriveDisplayStatus`, `listInvitedPartners`, `createCoefficientHistoryEntry`, `listCoefficientHistory`), one pure diff function (`generateDiffSummary`), Vitest unit tests for every new helper + one integration test verifying the append-only TRIGGER actually rejects UPDATE/DELETE.

**Out of scope:** wizard form orchestration (Phase 13), admin coefficient editor `summary` input integration (Phase 14), History sidebar component (Phase 14), Liste des partenaires chip integration (Phase 14), wizard page routes (Phase 13).

</domain>

<decisions>
## Implementation Decisions

### Draft storage shape

- **D-01:** Drafts live in the existing `proposals` table — a single source of truth across the draft → active lifecycle. A new `status` text column (CHECK in `('draft','active','deleted')`) flags the row's lifecycle position. No separate `proposal_drafts` table.
- **D-02:** Many drafts allowed per partner — no TTL, no auto-purge, no "at most one in progress" constraint. Hitting `/proposals/new/parametres` without a `?draft_id=` param creates a fresh draft row. The "Brouillons" `MetricTile` (Phase 14) shows the count.
- **D-03:** To accommodate drafts, loosen `lc_ref`, `idempotency_key`, `params_snapshot`, and `computed` to nullable. `inputs` stays NOT NULL — a fresh draft INSERTs with `inputs = {}` (the jsonb empty object), then accumulates fields as the partner progresses. `language` stays NOT NULL — partner picks it before the first save.
- **D-04:** Add `proposals_finalized_completeness_check` CHECK constraint: `status = 'draft' OR (lc_ref IS NOT NULL AND idempotency_key IS NOT NULL AND params_snapshot IS NOT NULL AND computed IS NOT NULL)`. Mechanically prevents an "active proposal with NULL snapshot" anomaly.
- **D-05:** Convert the two existing UNIQUE indexes on `proposals` to partial: `WHERE lc_ref IS NOT NULL` and `WHERE idempotency_key IS NOT NULL`. Drafts coexist without colliding on each other's NULLs; finalized rows still get the exact same uniqueness guarantees as Phase 8.
- **D-06:** Phase 8's `params_snapshot` immutability invariant is preserved as a **transition rule**, not a per-row rule. Draft rows mutate freely (it's their purpose); on `finalizeDraft()`, the server writes `snapshot + computed + lc_ref + idempotency_key` once and sets `status='active'`. Subsequent updates of those columns on a non-draft row are caught by the same transaction discipline as Phase 8 (no helper exists that updates them; ESLint blocks direct `db.update(proposals).set({ paramsSnapshot: ... })` outside `finalizeDraft`).

### Status surfacing

- **D-07:** Stored `proposals.status` is the source of truth; `('draft','active','deleted')` are the three values. **'expired' is derived** at query/render time as: `status='active' AND pdf_generated_at + ((params_snapshot->>'validityDays')::int) * INTERVAL '1 day' < now()`. No cron flips active→expired. No generated column. The UI's 4-state `StatusChip` (Phase 11) is fed by a new `deriveDisplayStatus(row)` helper returning `'draft' | 'active' | 'expired' | 'deleted'`.
- **D-08:** On soft-delete, the server sets BOTH `status='deleted'` AND `deleted_at = now()`. On restore, BOTH `status='active'` AND `deleted_at = NULL`. Two columns stay in lockstep — no derivation needed for `deleted`. The existing `deleted_at IS NULL` query predicates in Phase 8 helpers (proposals.ts:157-162, 213-218) continue to work unchanged; new code paths may filter on `status` directly.
- **D-09:** Existing Phase 8 rows all get `status='active'` automatically via the migration's `ADD COLUMN status text NOT NULL DEFAULT 'active'`. A one-shot `UPDATE proposals SET status='deleted' WHERE deleted_at IS NOT NULL` runs in the same migration to align soft-deleted rows.

### Partner "invited" status

- **D-10:** No new column on `users`. `invited` is **fully derived** from existing columns: `role='partner' AND deleted_at IS NULL AND last_login_at IS NULL`. New query helper `listInvitedPartners()` encapsulates this. The admin Liste des partenaires (Phase 14) calls this helper; partners NOT in this set fall back to the existing `is_disabled ? 'chip-disabled' : 'chip-active'` rendering in `app/(admin)/[adminSegment]/accounts/AccountsList.tsx:356`.
- **D-11:** Phase 6 follow-up #3 / WR-AUDIT-01 (`users.last_login_at` write at login time) **must be closed inside Phase 12**, not deferred. If `last_login_at` is never written, every partner forever appears as "invited" and DB-02 silently fails. The fix lives in the Better Auth onLogin hook (or the equivalent server action wrapper); approximately 3-5 lines of code + a Vitest test.

### Append-only enforcement (DB-03)

- **D-12:** `coefficient_history` enforces append-only at the DB level via a Postgres TRIGGER. The migration creates `coefficient_history_no_modify()` function that `RAISE EXCEPTION 'coefficient_history is append-only — UPDATE and DELETE forbidden'`, plus two triggers (`BEFORE UPDATE` and `BEFORE DELETE`, FOR EACH ROW). Portable across Neon + OVH (no Neon-specific features). Any attempt to `UPDATE` or `DELETE` returns a clear error with the table name in it.
- **D-13:** This is a deliberate **strengthening** vs. Phase 8's `global_params` table (which is append-only by convention only, no DB-level enforcement). The History sidebar relies on the data being honest — a silent UPDATE that overwrites history would defeat the audit feature.

### Coefficient history backfill + summary

- **D-14:** Backfill all prior `global_params` rows into `coefficient_history` on Phase 12 launch. Migration creates the table + trigger but does NOT do the data backfill. A separate one-shot script `scripts/backfill-coefficient-history.ts` runs after `npm run db:migrate`, iterating `global_params` rows ordered by `effective_from ASC` and inserting one `coefficient_history` row per `global_params` row (the first/seed row gets `before_json = NULL`).
- **D-15:** Backfill script is **idempotent**: it first `SELECT count(*) FROM coefficient_history` and exits 0 with a "Already backfilled" message if the table is non-empty. Safe to re-run; safe to run locally and again in prod. Production run uses the same typed-confirmation pattern as `scripts/seed-admins-launch.ts` (env-var `BACKFILL_CONFIRM=YES` required when `DATABASE_URL` host matches `*.neon.tech`).
- **D-16:** `coefficient_history.summary` is **auto-generated diff + optional admin override**:
  - `createCoefficientHistoryEntry(before, after, userId, summary?)` accepts an optional summary parameter.
  - If `summary` is provided and non-empty → store it verbatim.
  - If `summary` is undefined or empty → call `generateDiffSummary(before, after)` and store the result.
  - The admin editor form (Phase 14 work) renders an optional text input; blank input → auto-diff wins.
- **D-17:** `generateDiffSummary(before, after)` is a **pure function** in `src/lib/admin/coefficient-diff.ts`. Signature: `(before: GlobalParamsSnapshot | null, after: GlobalParamsSnapshot) => string`. Output format: semicolon-separated list of only-changed fields in French, e.g. `"Commission: 3.5000% → 3.7000%; T2/48m: 2.85 → 2.90; Validité: 30 → 60 jours"`. When `before` is NULL (seed row), returns `"Configuration initiale"`. No DB access; fully unit-testable.

### Verification approach

- **D-18:** A single migration file `drizzle/0004_phase12_drafts_and_history.sql` covers all DDL:
  1. ALTER `proposals` (status column + nullability loosening + CHECK + partial unique indexes)
  2. Backfill existing rows (`UPDATE proposals SET status='deleted' WHERE deleted_at IS NOT NULL`)
  3. CREATE `coefficient_history` table + index + function + 2 triggers
- **D-19:** SC4 ("Drizzle migration runs cleanly through `scripts/migrate.ts --dry-run`") is the load-bearing gate before merge. CI runs dry-run against a throwaway Postgres in GitHub Actions; production apply happens via the existing `.github/workflows/db-migrate.yml` typed-confirmation workflow (BOOT-10 — never auto-runs on Vercel deploy).
- **D-20:** Vitest tests cover every new helper with mocked DB (existing pattern from `src/lib/db/queries/proposals.test.ts`). PLUS one integration test (`src/lib/db/queries/coefficient-history.integration.test.ts`) that spins up a real Postgres (via the existing test infra or `pg-mem` if available) and verifies the TRIGGER actually raises an exception on UPDATE and on DELETE. The integration test is the empirical proof that D-12 works as intended.

### Claude's Discretion

- Exact column ordering in the migration (cosmetic).
- Whether to write a separate audit_log entry on `draft → active` finalize (recommend: yes; matches Phase 8's `proposal.create` semantics, just gated on the status transition).
- Whether to add an audit_log entry on every draft `INSERT` and `UPDATE` (recommend: NO — drafts can churn frequently as partners click around; audit only the final transition).
- Whether `listInvitedPartners()` exposes pagination (recommend: no; admin list is bounded to ~tens of partners; add cursor pagination only if it grows past ~200).
- Whether `coefficient-diff.ts` outputs FR or i18n-keyed strings (recommend: FR only — `summary` is stored at write time and viewed in admin, which is FR-primary; localizing the historical string post-hoc creates drift).
- The exact name of the typed-confirmation env var for the backfill script (recommend: `BACKFILL_CONFIRM=YES`).
- Whether to colocate Vitest tests next to the query helper files or use a `__tests__` folder (follow whatever Phase 8 and Phase 9 chose — the `*.test.ts` colocated convention is already in use).
- Whether `softDeleteProposal` / `restoreProposal` accept the `status` flip as a side-effect of writing `deleted_at`, or take an explicit `status` arg (recommend: side-effect, since the two columns are always in lockstep per D-08).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements + design contract
- `.planning/REQUIREMENTS.md` — full text of DB-01, DB-02, DB-03 and the v1.2 traceability table (Phase 12 covers 3 requirements)
- `.planning/milestones/v1.2-CONTEXT.md` — milestone design contract; `StatusChip` variant semantics (active/draft/expired/disabled); "Brouillons" `MetricTile` color (gold) and label conventions
- `.planning/ROADMAP.md` §"Phase 12: Schema Extensions for Drafts + History" — 5 success criteria; depends-on chain (Phase 11 ships StatusChip; Phase 13/14 consume Phase 12 helpers)
- `.planning/PROJECT.md` §Constraints — `params_snapshot` immutability invariant; portability constraint (no Vercel/Neon-only primitives); commission invisibility (does not apply to coefficient_history since admin-facing only)

### Prior-phase decisions Phase 12 must respect
- `.planning/phases/08-persistence-pdf-pipeline/08-CONTEXT.md` — DATA-05 (global_params append-only by convention), DATA-06 (params_snapshot read pattern at proposal-creation time), Option A snapshot pattern, D-A1..D3 / D-B1..B3 / D-C1..C3 / D-D1..D3 (the proposals table shape Phase 12 is extending), idempotency_key + lc_ref UNIQUE-per-user contract
- `.planning/phases/09-admin-surface/09-CONTEXT.md` — admin coefficient editor structure (extended in Phase 14, not Phase 12); ADMIN-09 commission invisibility (not relevant here — coefficient_history is admin-facing, no commission leak risk)
- `.planning/phases/11-design-system-foundation-brand-assets/11-CONTEXT.md` — StatusChip 4 variants + `.chip-draft` class shipped in `app/globals.css`; existing `MetricTile` API ready to receive Brouillons count; `RetractableSidebar` not relevant here

### Source files Phase 12 extends or reads
- `src/db/schema.ts` — current schema; Phase 12 extends `proposals` and adds `coefficient_history` here. Read lines 132-286 (Phase 8 application tables) to understand the shape Phase 12 is modifying.
- `drizzle/0002_phase8_persistence.sql` — migration shape reference (CHECK constraints, partial index syntax, FK syntax for `references()` mapped to ALTER TABLE)
- `drizzle/0003_seed_global_params.sql` — seed/data-migration pattern reference for the Phase 12 backfill script
- `scripts/migrate.ts` — Phase 5 migration runner; SC4 binds to its `--dry-run` flag. Read top 80 lines for the lockdown discipline.
- `src/lib/db/queries/proposals.ts` lines 30-320 — existing query helpers Phase 12 extends with `createDraft`, `updateDraft`, `finalizeDraft`, `listDraftsByUser`, `deriveDisplayStatus`; the `softDeleteProposal` / `restoreProposal` functions are modified to also write `status`
- `src/lib/db/queries/global-params.ts` — pattern reference for the new `src/lib/db/queries/coefficient-history.ts` (the existing global-params queries do not need to change in Phase 12; they continue reading the same table)
- `scripts/seed-admins-launch.ts` — typed-confirmation pattern that the new `scripts/backfill-coefficient-history.ts` mirrors
- `app/(admin)/[adminSegment]/accounts/AccountsList.tsx` line 356 — current 2-state rendering Phase 14 will extend with the `invited` chip; Phase 12 only ships the query helper, not the UI

### Operational
- `docs/operations/launch-checklist.md` — Phase 12 adds one step: "run `npm run db:backfill:coefficient-history` after migrate" (or equivalent npm script name decided by planner)
- `.github/workflows/db-migrate.yml` — production migration runner (typed-confirmation gate); Phase 12's new migration goes through this path on the v1.2 ship day

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `proposals` table (src/db/schema.ts:185-245) — extend with `status` column and nullability changes. The 2 existing UNIQUE indexes (`proposals_user_id_idempotency_key_uq`, `proposals_user_id_lc_ref_uq`) get rebuilt as partial WHERE NOT NULL. The 2 existing CHECK constraints (`proposals_language_check`, `proposals_schema_version_check`) stay as-is.
- `users.last_login_at` (src/db/schema.ts:61) — already a `timestamp with time zone` nullable column. Phase 6 follow-up #3 / WR-AUDIT-01 noted the write-on-login is missing in v1.1 — Phase 12 closes this gap as a prerequisite for DB-02 to work.
- `globalParams` table (src/db/schema.ts:147-164) — Phase 12 does NOT modify this table. `coefficient_history` is a NEW table; the diff log layers on top of `global_params` without changing its shape.
- `StatusChip` component (`src/components/ui/StatusChip.tsx`, Phase 11) — 4 variants already supported (`active`, `draft`, `expired`, `disabled`). Phase 12 supplies the right variant via `deriveDisplayStatus()` from the new query helpers.
- `app/globals.css` lines 361-376 + 505 — `.chip-active`, `.chip-expired`, `.chip-draft`, `.chip-deleted`, `.chip-disabled` all shipped in Phase 11. **No CSS work in Phase 12.**
- `scripts/migrate.ts` lines 1-80 — Drizzle migration runner with `--dry-run`. Phase 12's success criterion SC4 binds to this exact script + flag.

### Established Patterns
- **Postgres CHECK for enum-like text columns** — see `proposals.language` CHECK `IN ('fr', 'en')` (schema.ts:229) and `passwordResets.kind` CHECK `IN ('reset', 'invite')` (schema.ts:117). Apply the same pattern for `proposals.status`.
- **Partial unique indexes** — see `proposals_deleted_at_idx WHERE deleted_at IS NOT NULL` (schema.ts:243-244). Use the same `WHERE` clause technique when converting `proposals_user_id_idempotency_key_uq` and `proposals_user_id_lc_ref_uq` to partial.
- **Append-only by convention** — `global_params` (DATA-05 in Phase 8) ships ZERO DB-level enforcement; it relies on code discipline + the ESLint grep gate. Phase 12 deliberately strengthens this for `coefficient_history` via DB-level TRIGGER + RAISE EXCEPTION (D-12). The two patterns coexist; Phase 12 does NOT retrofit triggers onto `global_params`.
- **Snapshot immutability as transition rule** — Phase 8 locked `params_snapshot` as a "written once on proposal create, never UPDATEd". Phase 12 preserves this by making `draft → active` the only valid path for writing snapshot. Drafts have NULL snapshot; once written by `finalizeDraft()`, no helper exists that UPDATEs it.
- **Migration naming** — `drizzle/NNNN_phaseN_<topic>.sql`. Phase 8 → `0002_phase8_persistence.sql`. Phase 12 → `0004_phase12_drafts_and_history.sql` (the next free number; 0003 was the seed migration).
- **No `drizzle-kit push`** — only `scripts/migrate.ts` applies migrations; `scripts/check-no-drizzle-push.sh` is the CI grep gate. Phase 12 respects this.
- **Server-only helpers** — `src/lib/db/queries/proposals.ts` is `import 'server-only'`; new helper files follow the same convention.

### Integration Points
- `src/db/schema.ts` — extend `proposals` (status column, nullability, partial unique indexes, completeness CHECK); add new `coefficientHistory` table definition + type exports
- `src/lib/db/queries/proposals.ts` — extend with draft CRUD (`createDraft`, `updateDraft`, `finalizeDraft`, `listDraftsByUser`) + `deriveDisplayStatus`; modify `softDeleteProposal` and `restoreProposal` to write `status` alongside `deleted_at`
- `src/lib/db/queries/users.ts` (NEW FILE) — `listInvitedPartners()` helper
- `src/lib/db/queries/coefficient-history.ts` (NEW FILE) — `createCoefficientHistoryEntry()`, `listCoefficientHistory()`
- `src/lib/admin/coefficient-diff.ts` (NEW FILE) — pure `generateDiffSummary(before, after)` function
- `drizzle/0004_phase12_drafts_and_history.sql` (NEW FILE) — the single migration covering all DDL
- `scripts/backfill-coefficient-history.ts` (NEW FILE) — one-shot idempotent backfill of `global_params` rows into `coefficient_history`
- `src/lib/auth/actions.ts` (or wherever the Better Auth login hook lives) — write `users.last_login_at = now()` on every successful login; closes Phase 6 follow-up #3 / WR-AUDIT-01 (prerequisite for DB-02)
- `package.json` scripts — add `db:backfill:coefficient-history` invoking the new script
- `docs/operations/launch-checklist.md` — add a single-line item: "after migrate, run `npm run db:backfill:coefficient-history`"

</code_context>

<specifics>
## Specific Ideas

- **`generateDiffSummary` output format**: French, semicolon-separated, only changed fields, e.g. `"Commission: 3.5000% → 3.7000%; T2/48m: 2.85 → 2.90; Validité: 30 → 60 jours"`. For the seed row (no `before`), return `"Configuration initiale"`. Field labels follow the existing admin form labels in `src/lib/admin/schemas.ts` (commissionPct, maxAmount, validityDays, coefficients.tN.MM) — translation table inside the diff module, no i18n key indirection.
- **Draft `inputs` shape**: starts as `{}` (jsonb empty object). The Phase 13 wizard updates this jsonb incrementally — step 1 might write `{clientCo, clientContact, amountHT}`, step 2 adds `{duration, tranche}`, step 3 reviews. Phase 12 enforces nothing about the shape — Zod schemas in Phase 13 wizard validate per-step. Phase 12's `updateDraft` accepts an arbitrary jsonb merge or replace (planner's call; recommend full replace per step to keep the server stateless).
- **`status='deleted'` redundancy with `deleted_at`**: deliberate. Two columns always move together (D-08). The motivation is read-path ergonomics — code that filters on `status` doesn't need to know about the `deleted_at IS NULL` predicate. Drift is prevented by the same `softDeleteProposal` and `restoreProposal` helpers being the only call sites that write either column.
- **`last_login_at` write timing**: Better Auth's session lifecycle has a clear "session created" hook. Write `users.last_login_at = now()` from inside that hook on every successful login (not just first). For DB-02 we only care whether it's ever been written; for future analytics we may want every login, so write every time.
- **Backfill SQL vs. TypeScript**: the diff computation is non-trivial (multi-tranche × multi-duration nested jsonb diff). Doing it in Postgres `plpgsql` is possible but brittle. The TypeScript script wins on clarity; the migration only ships DDL; the script is run once after migrate.

</specifics>

<deferred>
## Deferred Ideas

- **Admin coefficient editor `summary` input field** — Phase 14 work. Phase 12 ships the parameter on `createCoefficientHistoryEntry()` but the form UI lives in Phase 14.
- **History sidebar component on Coefficients page** — Phase 14 work. Phase 12 ships `listCoefficientHistory()` but the React component consuming it is Phase 14.
- **Liste des partenaires chip integration** — Phase 14 work. Phase 12 ships `listInvitedPartners()` but the chip rendering in `AccountsList.tsx` is Phase 14.
- **3-step wizard routes + form orchestration** — Phase 13 work. Phase 12 ships the draft CRUD helpers; the wizard pages and step transitions are Phase 13.
- **`proposal.create_failed` audit semantics for draft promotion failures** — likely Phase 13 work, depends on the wizard's error handling.
- **TTL on stale drafts** — explicitly rejected (D-02). If draft accumulation becomes an ops problem, revisit in v1.3+.
- **Generic audit-log viewer beyond coefficient history** — already on `PROJECT.md` deferred list (v1.3+).
- **Retrofitting append-only TRIGGER onto `global_params`** — out of scope; the Phase 8 convention has held in production. Phase 12's strengthening is targeted at the new `coefficient_history` table only.
- **Better Auth `trustedOrigins` hardening + Phase 6 follow-up #2** — completely unrelated; carried forward at the milestone level.
- **Admin password rotation (Phase 6 follow-up #1)** — milestone-level work item; not Phase 12 scope.
- **Auto-purge stale drafts via the existing cron job** — rejected (D-02); reconsider only if observation shows draft accumulation.

</deferred>

---

*Phase: 12-schema-extensions-for-drafts-history*
*Context gathered: 2026-05-12*
