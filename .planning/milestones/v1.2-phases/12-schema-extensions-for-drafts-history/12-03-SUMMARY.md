---
phase: 12-schema-extensions-for-drafts-history
plan: 03
status: complete
completed: 2026-05-12
requirements: [DB-02]
files_changed:
  - src/lib/db/queries/users.ts (+57 lines — listInvitedPartners + InvitedPartnerRow)
  - src/lib/db/queries/users.test.ts (new, 100 lines)
commits:
  - feat(12-03) listInvitedPartners + 5 tests (single atomic commit)
---

# Plan 12-03 Summary — `listInvitedPartners()` helper

## What shipped

`listInvitedPartners(): Promise<InvitedPartnerRow[]>` in `src/lib/db/queries/users.ts`. Drizzle SELECT on `schema.users` with predicate composed via `and(eq(role, 'partner'), isNull(deletedAt), isNull(lastLoginAt))`, ordered `desc(createdAt)`. Returns the **bounded** column shape `{id, email, displayName, name, language, createdAt}` — narrower than `PartnerWithCount`. No pagination per CONTEXT recommendation.

## Verification

`npx vitest run src/lib/db/queries/users.test.ts` → 5 passing. Tests cover empty case, where-predicate composition, orderBy-call, fixture round-trip, and bounded-shape contract (asserts no `commissionPct` / `password` keys leak into the return type).

## Anti-pattern compliance

- ✅ `import 'server-only'` at top of file (unchanged from existing module)
- ✅ Existing `listPartnersWithCounts` preserved verbatim
- ✅ ADMIN-09: bounded SELECT — no `commission_pct` or password column referenced
- ✅ Uses existing `and / eq / isNull / desc` imports — no new imports

## Downstream contract

Phase 14 admin Liste des partenaires consumes this helper to render the gold `invited` `StatusChip`. **Plan 12-07's `session.create.after` hook (shipped earlier in Wave 1) is the load-bearing prerequisite** — without `last_login_at` being written on login, every partner forever satisfies the `IS NULL` predicate.

## Threat-model dispositions (per PLAN.md)

- T-12-03-01 (info disclosure via commission_pct) — mitigated by bounded SELECT shape; test asserts the bounded keyset
- T-12-03-02 (info disclosure via password) — mitigated; `accounts` table never joined
- T-12-03-03 (EoP non-admin caller) — mitigated by `import 'server-only'` + Phase 14 calling site's `requireAdmin()`
- T-12-03-04 (last_login_at write gap) — mitigated by Plan 12-07 closure

## Deferred

Pagination args (recommend deferring until partner count exceeds ~200 — currently bounded).

— Inline-executed by orchestrator.
