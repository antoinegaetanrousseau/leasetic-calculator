# Phase 26: Active/Expired Row Actions - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-30
**Phase:** 26-active-expired-row-actions
**Areas discussed:** Archive vs Delete meaning, Confirm & toast UX, Row-click behavior

---

## Archive vs Delete meaning

Framing surfaced before the question: finalized rows only support one reversible
backend op (`softDeleteProposal`); there is no separate `'archived'` state and
new columns are out of scope, so ROWACT-01 (Archive→Archivées) and ROWACT-02
(Delete→Recently Deleted) collapse to the same operation.

| Option | Description | Selected |
|--------|-------------|----------|
| Keep both, same op | Both Archive + Delete call softDeleteProposal; differ only in confirm/toast UX | |
| Just one Delete button | Drop Archive; only Delete (soft-delete w/ confirm) — scope reduction | |
| Just one Archive button | Drop Delete; only Archive (instant soft-delete → Archivées, recoverable) — scope reduction | ✓ |

**User's choice:** Just one Archive button.
**Notes:** Cleaner mental model — nothing is ever truly destroyed (10-yr retention),
so "Archive" reads more honestly than "Delete". Flagged as a scope reduction:
ROWACT-02 dropped, ROWACT-03 rewritten; REQUIREMENTS.md + ROADMAP.md to be updated
(same pattern as Phase 25's descoped teal rebrand). Drafts unaffected.

### Restore / un-archive follow-up

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse existing restore path | No new UI; restore stays on the "Recently Deleted" toggle | |
| Add Restore button in Archivées | Mount per-row Restore on soft-deleted rows within the Archivées view | ✓ |
| You decide | Defer to planning | |

**User's choice:** Add Restore button in Archivées.
**Notes:** Archive and un-archive live in the same place. `RestoreButtonClient`
already exists; renders only for `deleted` rows (the per-row action keys off
derived `displayStatus`).

---

## Confirm & toast UX

| Option | Description | Selected |
|--------|-------------|----------|
| Instant (no prompt) | Matches draft-archive; safe because reversible via Restore | ✓ |
| Confirm prompt | window.confirm before archiving | |

**User's choice:** Instant (no prompt).

| Option | Description | Selected |
|--------|-------------|----------|
| Simple confirmation | Sonner success toast + in-place list refresh | |
| Toast + 'Voir les archivées' | Success toast carries an action link to the Archivées view | ✓ |
| Toast + Undo | Success toast carries an 'Annuler' action that restores the row | |

**User's choice:** Toast + 'Voir les archivées' (links to `/proposals?archived=1`).

---

## Row-click behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Still open detail page | Row becomes a clickable div (like drafts); body click → /proposals/{id}; button stops propagation | ✓ |
| Row no longer clickable | Static rows; navigation only via explicit affordance | |

**User's choice:** Still open detail page.

---

## Claude's Discretion

- Component shape: extend/rename `DraftActionsClient` into a shared row-actions
  component vs. a new `RowActionsClient`.
- i18n key naming for new labels/toasts.
- Whether to reuse `/api/proposals/{id}/delete` (already calls
  `softDeleteProposal`) for Archive or add a thin `/archive` alias.

## Deferred Ideas

- Per-row Delete on finalized rows (original ROWACT-02) — folded away as
  indistinguishable from Archive given the single soft-delete state; would need
  a product + schema decision on a distinct state to revive.
- Undo action on the archive toast — considered, not chosen; revisitable.
