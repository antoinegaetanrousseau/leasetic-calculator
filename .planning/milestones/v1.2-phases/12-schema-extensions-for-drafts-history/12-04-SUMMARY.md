---
phase: 12-schema-extensions-for-drafts-history
plan: 04
status: complete
completed: 2026-05-12
requirements: [DB-03]
files_changed:
  - src/lib/db/queries/coefficient-history.ts (new, ~180 lines)
  - src/lib/db/queries/coefficient-history.test.ts (new, ~250 lines, 19 tests)
commits:
  - feat(12-04) coefficient-history query helpers + 19 tests (single atomic commit)
---

# Plan 12-04 Summary — `coefficient_history` query helpers

## What shipped

Two server-only helpers in new file:

1. **`createCoefficientHistoryEntry({before, after, userId, summary?})`** — INSERT-only. Auto-falls-back to `generateDiffSummary(before, after)` when `summary` is undefined / empty / whitespace-only (D-16). Admin-provided text wins verbatim. Returns the newly-inserted `CoefficientHistoryRow` via `.returning()`.

2. **`listCoefficientHistory({cursor?, limit?})`** — cursor-paginated newest-first, mirrors `listGlobalParamsHistory` exactly. Default limit 20, fetches limit+1 for hasMore. LEFT JOIN to users surfaces `createdByDisplay = COALESCE(displayName, email)`. Returns `{rows, hasMore, nextCursor}`.

Plus `encodeCoefficientHistoryCursor` / `decodeCoefficientHistoryCursor` with ISO-date + UUID-v4 regex validation (returns null on malformed input).

## LEFT JOIN decision

Included the `LEFT JOIN users` (createdByDisplay augmentation) **now** rather than deferring to Phase 14 — matches `listGlobalParamsHistory` exactly so the Phase 14 sidebar consumer has zero migration friction. For backfilled seed rows (changedByUserId is NULL), `createdByDisplay` is NULL.

## Verification

`npx vitest run src/lib/db/queries/coefficient-history.test.ts` → **19 passing**:
- 8 createCoefficientHistoryEntry cases (4 summary fallback variants + persistence assertions)
- 6 listCoefficientHistory cases (default limit, explicit limit, orderBy, leftJoin, cursor predicate, empty result)
- 5 cursor encode/decode cases (round-trip + 4 validation negatives)

## Anti-pattern compliance

- ✅ `import 'server-only'` at top of file
- ✅ Zero `db.update(schema.coefficientHistory)` or `db.delete(schema.coefficientHistory)` call sites — the absence is the documentation
- ✅ ADMIN-09 not applicable: `coefficient_history` is admin-only by route gating; commission values ARE the audit point
- ✅ Mirrors existing `global-params.ts` cursor / encode / decode patterns verbatim

## Downstream contract

- Phase 14 admin Coefficients editor form will call `createCoefficientHistoryEntry(...)` with the admin-supplied `summary` (or undefined → auto-diff)
- Phase 14 History sidebar consumes `listCoefficientHistory({cursor})` with `encode/decodeCoefficientHistoryCursor` for URL-safe page tokens
- Plan 12-06's backfill script calls `createCoefficientHistoryEntry({before, after, userId: null, summary: undefined})` for each existing `global_params` row pair

## Threat-model dispositions

All from PLAN.md, all held:
- T-12-04-01 (Tampering circumvent append-only) — mitigated by DB TRIGGER + absence of UPDATE/DELETE helpers in this module
- T-12-04-02 (Repudiation no actor) — mitigated by `changedByUserId` FK
- T-12-04-03 (Info disclosure of commission) — accepted: admin-only audit surface, commission IS the audit value
- T-12-04-04 (DoS unbounded result set) — mitigated by cursor pagination
- T-12-04-05 (Spoofing malformed cursor) — mitigated by ISO + UUID regex validation
- T-12-04-06 (Tampering via summary HTML injection) — accepted: text-only field, React JSX escaping at render

— Inline-executed by orchestrator.
