---
phase: 12-schema-extensions-for-drafts-history
plan: 05
status: complete
completed: 2026-05-12
requirements: [DB-01]
files_changed:
  - src/lib/db/queries/proposals.ts (+220 lines — 6 new exports + 4 modified functions + writeAuditLog import)
  - src/lib/db/queries/proposals.test.ts (+250 lines — 21 new tests, vi.hoisted() mock pattern for audit-log)
  - src/lib/api/proposals/list.ts (1 line — narrow row.lcRef!)
  - src/lib/api/proposals/submit.ts (2 lines — narrow row.lcRef!)
  - app/(authed)/proposals/[id]/page.tsx (3 lines — ?? '' fallback for nullable lcRef)
commits:
  - feat(12-05) draft CRUD + D-08 lockstep + display-status derivation
  - fix(12-05) typecheck cleanup for audit-log assertion
---

# Plan 12-05 Summary — Proposals draft CRUD lifecycle

## What shipped

The application-layer surface for Phase 12's DB-01 schema. Six new exports in `src/lib/db/queries/proposals.ts`:

| Export | Purpose |
|---|---|
| `createDraft({userId, language})` | INSERT `status='draft', inputs={}` — leaves the 4 D-03 columns NULL |
| `updateDraft(id, userId, {inputs})` | Full-replace `inputs` jsonb on draft rows only (no cross-user, no active/deleted) |
| `finalizeDraft(id, userId, args)` | Sole writer of `draft → active`. One UPDATE writes status + 4 nullable columns + 4 PDF columns. Writes `audit_log` entry with `action='proposal.create'`. Returns null on no-match. |
| `listDraftsByUser(userId)` | Scoped to userId; ORDER BY createdAt DESC; no pagination (drafts bounded) |
| `getDraftById(id, userId)` | Scoped to userId; cross-user returns null |
| `deriveDisplayStatus(row)` | Pure function bridging stored 3-state to UI 4-state (per D-07) |
| `DisplayStatus` (type) | `'draft' \| 'active' \| 'expired' \| 'deleted'` |

Four existing functions modified:

| Function | Change |
|---|---|
| `softDeleteProposal` | D-08 lockstep — `.set({deletedAt: now(), status: 'deleted'})` in same UPDATE |
| `restoreProposal` | D-08 lockstep — `.set({deletedAt: null, status: 'active'})` |
| `listProposalsByUser` | Adds `eq(status, 'active')` to active-branch predicate (drafts excluded from partner home) |
| `searchProposals` | Same status filter as listProposalsByUser |

## Consumer TS errors fixed (carried over from 12-01)

| Site | Fix |
|---|---|
| `src/lib/api/proposals/list.ts:64` | `lcRef: row.lcRef!` — active filter guarantees non-null |
| `src/lib/api/proposals/submit.ts:148, 173` | `lcRef: row.lcRef!` — `createProposal` writes lcRef explicitly |
| `app/(authed)/proposals/[id]/page.tsx:125, 127, 350` | `proposal.lcRef ?? ''` — defensive for any future draft routing through this page |

## Verification

```
$ npx vitest run src/lib/db/queries/proposals.test.ts
 ✓ src/lib/db/queries/proposals.test.ts (37 tests) 7ms
 Test Files  1 passed (1)
      Tests  37 passed (37)

$ npx vitest run    # full suite
 Test Files  31 passed (31)
      Tests  492 passed (492)

$ npx tsc --noEmit  # 0 errors
```

**21 new tests** (37 - 16 existing) covering:
- `createDraft` × 2 (status/inputs/userId/language captured; nullable columns not set)
- `updateDraft` × 2 (only inputs set; returns null on no-match)
- `finalizeDraft` × 4 (full SET payload; audit_log called once with proposal.create; not called on no-match; null on cross-user)
- `listDraftsByUser` × 1 (where + orderBy)
- `getDraftById` × 2 (null on not-found; returns the row on found)
- `deriveDisplayStatus` × 6 (draft/deleted/expired/active + 2 defensive)
- `softDelete/restore lockstep` × 2 (both columns set in the same payload)

## Mock pattern adjustments

- Added `vi.hoisted()` for `mockWriteAuditLog` + `mockState` — the previous direct-reference pattern hit a TDZ error because `vi.mock` is hoisted above regular `const` declarations.
- `mockState.returningResult` and `mockState.findFirstResult` are mutable per-test, reset in `beforeEach`. Tests use this to simulate no-match (`returningResult = []`) and found-row (`findFirstResult = {...}`) scenarios.

## Threat-model dispositions (per PLAN.md, all held)

- T-12-05-01 (info disclosure — drafts visible cross-user) — mitigated by `userId` required arg on every helper + WHERE-clause embed
- T-12-05-02 (spoofing draft→active gate) — mitigated by `finalizeDraft` being the sole writer; WHERE requires `status='draft'`; DB CHECK enforces allowed values
- T-12-05-03 (D-08 lockstep tampering) — mitigated by helpers being sole writers; ESLint grep gate is a Phase 14 candidate
- T-12-05-04 (paramsSnapshot tampering) — mitigated; `finalizeDraft` is sole writer
- T-12-05-05 (repudiation) — mitigated by `audit_log` entry with `proposal.create`
- T-12-05-06 (admin cross-user listProposalsByUser) — accepted; helper is partner-scoped
- T-12-05-07 (DoS via unbounded drafts) — accepted; D-02 explicitly rejected TTL

## Downstream contract

Phase 13 wizard route handlers consume:
- `GET /proposals/new/parametres?draft_id=` → `getDraftById(id, userId)` to resume, else `createDraft({userId, language})` to start
- `POST /proposals/new/parametres` and `/calcul` → `updateDraft(id, userId, {inputs})`
- `POST /proposals/new/verification` → `finalizeDraft(id, userId, {...})`

Phase 14 surfaces:
- Partner home "Brouillons" `MetricTile` → `listDraftsByUser(userId).length`
- Display chip everywhere → `deriveDisplayStatus(row)` → `StatusChip` variant

— Inline-executed by orchestrator.
