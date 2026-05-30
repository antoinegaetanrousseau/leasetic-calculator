# Phase 26: Active/Expired Row Actions - Context

**Gathered:** 2026-05-30
**Status:** Ready for planning

> ⚠️ **Scope reduced during discussion (D-01).** The phase was scoped as
> *Archive + Delete* on finalized rows (ROWACT-01/02/03). The owner chose
> **Archive-only**. The per-row Delete button (ROWACT-02) is dropped and
> ROWACT-03 is rewritten. REQUIREMENTS.md + ROADMAP.md must be updated to
> match (same pattern as Phase 25's descoped teal rebrand). Drafts are
> unaffected — they keep Edit + Archive + Delete.

<domain>
## Phase Boundary

Wire a per-row **Archive** icon button onto finalized (active/expired)
`/proposals` rows in the partner (agent) view, plus a per-row **Restore**
button on soft-deleted rows in the Archivées view — reusing the existing
`DraftActionsClient` icon-button pattern (minus Edit, minus Delete). The
backend soft-delete / restore plumbing already exists (Phases 8 + 14:
`softDeleteProposal` / `restoreProposal`); this phase is **UI wiring only**.

**In scope:**
- Archive icon button on `active` and `expired` rows (Actives view + the
  expired rows that surface in the Archivées view) → calls the existing
  soft-delete path → row leaves Actives, becomes recoverable.
- Restore icon button on `deleted` rows in the Archivées view → calls the
  existing restore path.
- Instant archive (no confirmation); sonner success toast with a
  "Voir les archivées" follow-up action link.
- Active/expired rows become clickable divs (like draft rows) that still
  open the proposal detail page on body click.
- FR + EN i18n keys for the new labels/toasts; `_EnHasAllFrKeys` parity proof
  stays green.

**Out of scope (this phase):**
- Per-row **Delete** on finalized rows (ROWACT-02 dropped — see D-01).
- New DB columns / migrations (archive = existing `softDeleteProposal`; no
  separate `archivedAt` state exists and none is added).
- Admin-side `/lc-references` cross-partner list actions (partner `/proposals`
  surface only).
- Bulk / multi-select row actions.
- Any change to draft-row actions (Edit + Archive + Delete unchanged).
- Status-pill visual restyle (that is Phase 27 / UIFIX).

</domain>

<decisions>
## Implementation Decisions

### Archive vs Delete semantics (discussed — descoped to Archive-only)
- **D-01 — Archive-only on finalized rows; Delete dropped.** Rationale: for a
  finalized proposal the only reversible backend operation is **soft-delete**
  (`softDeleteProposal` sets `deletedAt=now()` + `status='deleted'`,
  reversible via `restoreProposal`). There is no separate `'archived'` state
  and new columns are out of scope (10-year PDF retention forbids hard-delete).
  So "Archive → Archivées" (ROWACT-01) and "Delete → Recently Deleted"
  (ROWACT-02) collapse to the **same** operation. Rather than ship two buttons
  with an identical effect, the owner chose a single **Archive** button.
  "Archive" also reads more honestly than "Delete" since nothing is ever truly
  destroyed. **Consequence:** ROWACT-02 is removed from this phase; ROWACT-03
  is rewritten (finalized rows show **only Archive** — no Edit, no Delete);
  REQUIREMENTS.md + ROADMAP.md must be updated by the planner/engineer.

### Restore / un-archive path (discussed)
- **D-02 — Add a per-row Restore button inside the Archivées view.** Archive
  and un-archive live in the same place rather than forcing the partner to the
  separate "Recently Deleted" toggle. `RestoreButtonClient` already exists
  (used in the `deleted=1` view) — it needs mounting in the Archivées view for
  soft-deleted rows.

### Per-row action rendering model (Claude's discretion — recommended rule)
- **D-03 — One rule across both views: the action keys off the row's derived
  `displayStatus`.** `active` / `expired` (not deleted) → **Archive** button;
  `deleted` → **Restore** button. This works uniformly in Actives and
  Archivées (an expired-by-time row in Archivées shows Archive; a soft-deleted
  row shows Restore). The Restore action must only render for `deleted` rows —
  `restoreProposal`'s WHERE filters on `status='deleted'`, so calling it on a
  non-deleted row is a no-op/404.

### Confirmation & toast UX (discussed)
- **D-04 — Archive is instant (no `window.confirm`).** Matches the existing
  draft-archive pattern; safe because archive is fully reversible via Restore.
- **D-05 — Success toast is simple + a "Voir les archivées" action link** that
  navigates to `/proposals?archived=1` (mirrors the detail-page delete toast's
  "view deleted" action, which links to the Recently Deleted view). Then the
  list refreshes in place via `router.refresh()` (no full-page navigation —
  satisfies ROWACT-01's "refreshes in place").

### Row-click behavior (discussed)
- **D-06 — Row body still opens the detail page.** Active/expired rows switch
  from a full-row `<Link href="/proposals/{id}">` to a clickable `div`
  (`role="button"`, like draft rows); the Archive/Restore icon button uses
  `e.stopPropagation()` so it acts without navigating. No behavior change for
  the partner — the row just gains an action button.

### ADMIN-09 envelope (no decision needed)
- **D-07 — ROWACT-04 holds trivially.** The Archive/Restore buttons take only
  `proposalId` + `lang`; `ProposalRowDto` already strips `paramsSnapshot` /
  commission server-side. The 19-gate `tests/admin-09-grep-contracts` suite
  passes without modification.

### Claude's Discretion
- Component shape: extend/rename `DraftActionsClient` into a shared
  row-actions component (parameterized by which buttons to show) vs. a new
  `RowActionsClient` — planner's call. Keep the established icon-button styling
  (`ICON_BTN`, 30×30, lucide `Archive` / `RotateCcw`-style restore icon).
- i18n key naming for the new labels/toasts (e.g. `proposal.row.action.archive`,
  `proposal.row.toast.archive.success`, `…toast.archive.action.viewArchived`).
- Whether to introduce a generalized soft-delete endpoint for finalized rows or
  reuse `/api/proposals/{id}/delete` (which already calls `softDeleteProposal`).
  See research note in `<code_context>`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — ROWACT-01..04 + the v1.5 Out-of-Scope table.
  **Note:** ROWACT-02 (per-row Delete) and ROWACT-03 (Archive + Delete set) are
  superseded by D-01 (Archive-only). These entries must be updated to reflect
  the descope.
- `.planning/ROADMAP.md` → "### Phase 26: Active/Expired Row Actions" — goal +
  success criteria. Criteria 2 (per-row Delete) no longer applies per D-01;
  criterion 3 is rewritten (finalized rows show only Archive).

### Code to read before planning
- `src/components/proposals/DraftActionsClient.tsx` — the icon-button pattern
  to extend (Archive/Delete/Edit buttons, `stopPropagation`, sonner toast,
  `router.refresh()`, `ICON_BTN` styling). Archive button + handler is the
  direct template for the new finalized-row Archive.
- `src/components/proposals/ProposalRow.tsx` — currently renders finalized rows
  as a full-row `<Link>` and draft rows as a clickable `div` with
  `draftActionsSlot`. D-06 needs the finalized branch to gain a clickable-div +
  action-slot path (or generalize the existing `draftMode` branch).
- `src/components/proposals/ProposalsList.tsx` — decides which slot to mount per
  view (`deleted` → `RestoreButtonClient`, `draftMode` → `DraftActionsClient`).
  Needs a new branch: Actives/Archivées finalized rows → Archive (active/expired)
  or Restore (deleted) per D-03.
- `src/components/proposals/RestoreButtonClient.tsx` — existing restore button to
  mount in the Archivées view (D-02).
- `src/components/proposals/DeleteButtonClient.tsx` — detail-page delete; its
  toast-with-action pattern (`action: { label, onClick }`, duration 6000) is the
  model for D-05's "Voir les archivées" toast.
- `src/lib/api/proposals/list.ts` — `ProposalRowDto` (commission-stripped wire
  shape) + `buildListResponse`; `displayStatus` is server-derived. Confirms
  ROWACT-04 holds.
- `src/lib/db/queries/proposals.ts` — `softDeleteProposal` (deletedAt + status
  lockstep, WHERE `status='active' AND deletedAt IS NULL`), `restoreProposal`
  (WHERE `status='deleted'`), `deriveDisplayStatus` (the `active`/`expired`/
  `deleted`/`draft` union driving D-03), and the `archived` filter logic
  (Archivées = derived `expired` OR `deleted`).
- `app/(authed)/proposals/page.tsx` — the `/proposals` SSR route; `archived`/
  `deleted`/`drafts` searchParams + `remountKey` re-mount mechanism that makes
  `router.refresh()` reflow the list in place.
- `app/api/proposals/[id]/delete/route.ts` — finalized soft-delete endpoint
  (calls `softDeleteProposal`); candidate to reuse for the Archive action.
- `app/api/proposals/[id]/restore/route.ts` — restore endpoint for D-02.
- `app/(authed)/proposals/_components/FilterPillRow.tsx` — Actives / Archivées /
  Brouillons filter pills (for the "Voir les archivées" target + view context).
- `tests/admin-09-grep-contracts.test.ts` — the 19-gate suite that must stay
  green unmodified (ROWACT-04 / D-07).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DraftActionsClient.tsx` — Archive button + `handleArchive` (fetch POST →
  toast → `router.refresh()`) is a near-drop-in template; the finalized Archive
  differs only in endpoint and i18n keys.
- `RestoreButtonClient.tsx` — already built; mount it in the Archivées view for
  `deleted` rows (D-02).
- `softDeleteProposal` / `restoreProposal` (`proposals.ts`) — the entire
  backend capability already exists. Out-of-Scope is correct: "wires existing
  capability onto the active-row UI."
- `DeleteButtonClient.tsx` toast-with-action shape → model for D-05.

### Established Patterns
- Icon buttons: `ICON_BTN` 30×30 ghost style, lucide icons at size 14,
  `aria-label` + `title`, `disabled` while `busy`, `e.stopPropagation()`.
- Row mutation flow: client `fetch` POST to `/api/proposals/{id}/{action}` →
  on `!res.ok` error toast, else success toast + `router.refresh()`. The page's
  `remountKey` re-mounts `ProposalsList` so the list reflows in place (no full
  navigation) — this is how ROWACT-01's "refreshes in place" is met.
- All labels are FR+EN i18n keys behind the `_EnHasAllFrKeys` compile-time
  parity proof.
- `displayStatus` is server-derived (`deriveDisplayStatus`) and is the bounded
  4-string union (`draft|active|expired|deleted`) — the safe signal for D-03's
  per-row action selection. `paramsSnapshot` never reaches the client.

### Integration Points
- **Archive endpoint decision (research):** `/api/proposals/{id}/delete`
  already calls `softDeleteProposal` (the exact operation Archive needs). Reuse
  it for Archive, or add a thin `/archive` alias for naming clarity — planner's
  call. Do NOT reuse `/draft-archive` (that's `softDeleteDraft`, draft-gated) or
  `/draft-delete` (`hardDeleteDraft`, permanent — wrong for finalized).
- **Archivées view = expired (by time) + soft-deleted.** Expired rows also
  appear in the default Actives view. The per-row action must therefore be
  driven by `displayStatus`, not by which filter view is active (D-03).
- `ProposalRow` already supports a `draftMode` clickable-div + slot branch; D-06
  can generalize that rather than introduce a new mechanism.

</code_context>

<specifics>
## Specific Ideas

- Owner's framing: nothing is ever truly deleted (10-year retention), so a
  single **Archive** action is the honest model — "archive" not "delete".
- Archive should feel light: one click, instant, row animates away, toast
  offers a path to where it went ("Voir les archivées"). Reversible via Restore
  in the same Archivées view.

</specifics>

<deferred>
## Deferred Ideas

- **Per-row Delete on finalized rows (original ROWACT-02).** Not killed —
  deliberately folded away because it would be indistinguishable from Archive
  given the single soft-delete state. If a future need arises for a distinct
  "delete" (e.g. an admin hard-purge respecting retention), it would require a
  product decision on a separate `archivedAt` state vs `deletedAt`, and likely
  a schema change — its own phase.
- **Undo action on the archive toast.** Considered (Area 2) and not chosen in
  favor of the "Voir les archivées" link; revisitable if partners want
  one-click undo.

### Reviewed Todos (not folded)
None — no pending todos matched this phase.

</deferred>

---

*Phase: 26-active-expired-row-actions*
*Context gathered: 2026-05-30*
