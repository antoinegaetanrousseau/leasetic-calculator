---
phase: 30-company-contact-registry
plan: 07
subsystem: ui
tags: [react, next.js, shadcn, alert-dialog, dialog, react-hook-form, zod, idor]

# Dependency graph
requires:
  - phase: 30-company-contact-registry (plan 03)
    provides: "requireRelationshipHolder() — the /clients tree gate, notFound() on admin"
  - phase: 30-company-contact-registry (plan 04)
    provides: "getClientRelationshipForOwner / listContactsForRelationship / listProposalsForRelationship — owner-scoped client-detail reads"
  - phase: 30-company-contact-registry (plan 05)
    provides: "createContactAction / updateContactAction / deleteContactAction — per-call ownership re-proof; contactSchema"
  - phase: 30-company-contact-registry (plan 06)
    provides: "the /clients book this page is the detail view for; CreateClientDialog's Dialog/RHF/zod pattern reused"
provides:
  - "/clients/[id] — the client record page: Contacts card + Propositions card, single-column, D-18-safe IDOR gate (CRM-06, CRM-04)"
  - "ContactList — accessible icon-button row actions (edit/delete, aria-labeled), zero-contacts empty state, single-instance dialog management"
  - "ContactFormDialog — first shared create/edit contact dialog (mode prop), shadcn Dialog + RHF/zod"
  - "DeleteContactDialog — first real-app adoption of shadcn AlertDialog, replacing the legacy native-confirm pattern for this one interaction"
affects: [30-company-contact-registry admin companies view (plan 30-08+), Phase 31 IMPORT-01..07, any future surface needing the AlertDialog delete-confirm pattern]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D-18 ordering as the security boundary: requireRelationshipHolder() -> getClientRelationshipForOwner(id, ownerId) -> null => notFound() -> ONLY THEN fetch contacts/proposals. Source-order-tested (notFound() literal precedes the first listContactsForRelationship( call in the file), not just runtime-tested."
    - "Single shared dialog-target state ({ mode, contact } | null) in the client-component list owner, keyed remount (key={contact.id ?? 'create'}) instead of one dialog instance per row or per mode — guarantees fresh RHF defaultValues on every target switch without manual reset() plumbing"
    - "ProposalRowDto adapter at the page layer: plan 30-04's listProposalsForRelationship row shape (narrowed for ADMIN-09 — no params_snapshot, no pdfGeneratedAt) is mapped onto ProposalRowDto without widening the underlying query — see Deviations"

key-files:
  created:
    - app/(authed)/clients/[id]/page.tsx
    - app/(authed)/clients/[id]/page.test.tsx
    - app/(authed)/clients/[id]/ContactList.tsx
    - app/(authed)/clients/[id]/ContactList.test.tsx
    - app/(authed)/clients/[id]/ContactFormDialog.tsx
    - app/(authed)/clients/[id]/ContactFormDialog.test.tsx
    - app/(authed)/clients/[id]/DeleteContactDialog.tsx
    - app/(authed)/clients/[id]/DeleteContactDialog.test.tsx
  modified:
    - src/lib/i18n/dictionaries.ts

key-decisions:
  - "ProposalRowDto's amountHT is filled with computedClientMonthly (the client-facing monthly figure plan 30-04 already projects out of computed.loyerHT for ADMIN-09), not the raw equipment price from inputs.amountHT. listProposalsForRelationship's row shape was NOT widened to select inputs/paramsSnapshot/pdfGeneratedAt — the threat model's own T-30-07-06 disposition explicitly cites reusing plan 30-04's existing narrow shape as the ADMIN-09 mitigation, so widening it here would have worked against the plan's own stated security reasoning."
  - "displayStatus on the client-detail Propositions card is the stored draft/active status as-is (no expiry derivation). The full expiry math (deriveDisplayStatus) requires paramsSnapshot.validityDays + pdfGeneratedAt, both deliberately absent from this row shape for ADMIN-09 minimization. Consequence: an expired-but-still-'active'-status proposal shows as 'active' here, whereas the main /proposals list correctly shows 'expired'. Documented as a known, bounded cosmetic gap rather than silently widening the query."
  - "Two new i18n keys added (clients.contact.toast.created / clients.contact.toast.updated, fr+en) — the UI-SPEC's Copywriting Contract and i18n Key Plan specify the delete toast (clients.contact.toast.deleted) but no create/edit success toast; Task 3's action text requires 'firing the appropriate toast' on success, so the two missing keys were added rather than reusing clients.toast.created (that key's copy, 'Client créé.', is about creating a CLIENT, not a contact, and would be a wrong/confusing string here)."
  - "The required-field asterisk uses this codebase's established convention (ml-0.5 text-destructive span, aria-hidden=\"true\") — see Deviations for why this makes one of the plan's own literal grep acceptance gates fail on purpose."

patterns-established:
  - "Single-instance controlled-dialog pattern for a list of per-row actions (edit/delete on N rows, exactly one Dialog/AlertDialog instance mounted, remount-keyed on the active target) — reusable for any future per-row edit/delete UI in this app."

requirements-completed: [CRM-02, CRM-04, CRM-06]

# Metrics
duration: ~45min
completed: 2026-09-01
---

# Phase 30 Plan 07: Client Detail Page (/clients/[id]) Summary

**`/clients/[id]` — the CRM-06 client record page (Contacts + Propositions cards, single-column, D-18-safe 404-not-403 IDOR gate) plus a full contacts editor: ContactList with accessible icon-button row actions, a shared create/edit ContactFormDialog, and DeleteContactDialog as the app's first real-app AlertDialog adoption.**

## Performance

- **Duration:** ~45 min
- **Completed:** 2026-09-01
- **Tasks:** 3
- **Files modified:** 9 (8 created, 1 modified)

## Accomplishments

- `app/(authed)/clients/[id]/page.tsx` — server component. `requireRelationshipHolder()` runs first; `getClientRelationshipForOwner(id, session.user.id)` returns `null` for both "no such relationship" and "exists but owned by someone else" (D-18, plan 30-04), and the page's `if (!relationship) notFound();` is the ONLY branch — no 403, no redirect. Contacts and proposals are fetched only after that check passes (source-order-tested: the `notFound()` call precedes the first `listContactsForRelationship(` call in the file). Single-column `max-w-[720px]` wrapper (Assumption A-2), header omits the SIREN chip entirely when null (never an em dash in the header), reuses `ProposalRow` verbatim for the Propositions card with an adapter mapping plan 30-04's narrower row shape onto `ProposalRowDto`.
- `ContactList.tsx` — one row per contact (name `font-semibold`, role/phone/email 13px muted, phone/email lines icon-prefixed with `PhoneIcon`/`MailIcon`, absent fields omitted never dashed), edit + delete icon buttons each carrying an `aria-label` interpolating the contact's name (matching `PartnerRowActions.tsx`'s precedent), delete button carries `hover:text-destructive`. Exactly one `ContactFormDialog`/`DeleteContactDialog` instance is ever mounted (not one per row), selected by a small `{ mode, contact } | null` state machine with a remount `key` so switching targets always gets fresh form defaults.
- `ContactFormDialog.tsx` — one component, `mode: 'create' | 'edit'`, shadcn `Dialog` + RHF/zod (`contactSchema`, plan 30-05), four fields (Nom required with the codebase's accessible asterisk convention, Fonction/Téléphone/Email optional, email format validated via the existing `error.field.email.invalid` key). Create calls `createContactAction(relationshipId, values)`; edit calls `updateContactAction(contactId, values)`.
- `DeleteContactDialog.tsx` — shadcn `AlertDialog`, this component's first real-app adoption in the codebase. Title "Supprimer ce contact ?", description interpolating the contact's name, destructive confirm action calls `deleteContactAction(contactId)` and fires "Contact supprimé.", cancel calls nothing. Never `window.confirm`, never hand-rolled `role="dialog"` chrome.
- 29 new tests (7 page + 9 ContactList + 8 ContactFormDialog + 5 DeleteContactDialog) covering every `<behavior>` bullet across all three tasks, including the D-18 "identical outcome for non-owned vs nonexistent" case and the "contacts never fetched before the ownership check passes" call-count assertion.

## Task Commits

Each task was committed atomically:

1. **Task 1: The client detail page with Contacts and Propositions cards** - `058a445` (feat)
2. **Task 2: ContactList with accessible icon-button row actions** - `9dcec14` (feat)
3. **Task 3: ContactFormDialog and the AlertDialog delete confirmation** - `48f715c` (feat)

**Plan metadata:** pending (this commit)

## Files Created/Modified

- `app/(authed)/clients/[id]/page.tsx` — server-rendered client detail page: auth gate, D-18 ownership check, contacts/proposals reads, PageHero-less single-column layout, Contacts/Propositions card composition.
- `app/(authed)/clients/[id]/page.test.tsx` — 7 tests: notFound()-before-contacts ordering, non-owned-vs-nonexistent equivalence, `ownerId` sourcing, null/present SIREN header rendering, source-order acceptance checks.
- `app/(authed)/clients/[id]/ContactList.tsx` — row list + zero-contacts empty state + single-instance dialog management.
- `app/(authed)/clients/[id]/ContactList.test.tsx` — 9 tests covering all 7 plan behaviors plus empty-state and single-dialog-instance acceptance checks.
- `app/(authed)/clients/[id]/ContactFormDialog.tsx` — shared create/edit contact dialog.
- `app/(authed)/clients/[id]/ContactFormDialog.test.tsx` — 8 tests covering create/edit rendering, asterisk placement, email validation, and both mutation call shapes.
- `app/(authed)/clients/[id]/DeleteContactDialog.tsx` — AlertDialog delete confirmation.
- `app/(authed)/clients/[id]/DeleteContactDialog.test.tsx` — 5 tests covering title/description, confirm, cancel, and the native-confirm-prompt negative check.
- `src/lib/i18n/dictionaries.ts` — added `clients.contact.toast.created` / `clients.contact.toast.updated` (fr+en) — see Decisions Made.

## Decisions Made

See frontmatter `key-decisions` for full detail. Summary:
- **`amountHT` on the Propositions row is `computedClientMonthly`** (plan 30-04's already-projected monthly figure), not the raw equipment price — the read layer was deliberately NOT widened, per the threat model's own stated ADMIN-09 reasoning.
- **`displayStatus` has no expiry derivation** on this page (draft/active only) — a documented, bounded cosmetic gap rather than a query-layer widening.
- **Two new i18n keys added** for the missing create/edit contact success toasts.
- **Required-asterisk markup follows the codebase's real accessible convention**, not the plan's narrower literal grep pattern — see Deviations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — missing needed functionality] Two i18n keys added for contact create/edit success toasts**
- **Found during:** Task 3, writing `ContactFormDialog`'s `onSubmit`
- **Issue:** Task 3's action text requires firing "the appropriate toast" on a successful create/edit, but the dictionary only had `clients.contact.toast.deleted`. The existing `clients.toast.created` key's copy ("Client créé.") is about creating a client relationship, not a contact — reusing it would show a confusing/wrong string.
- **Fix:** Added `clients.contact.toast.created` ("Contact ajouté." / "Contact added.") and `clients.contact.toast.updated` ("Contact mis à jour." / "Contact updated.") to both the `fr` and `en` dictionaries.
- **Files modified:** `src/lib/i18n/dictionaries.ts`
- **Verification:** `npm run typecheck` (dictionary's `_EnHasAllFrKeys` compile-time parity check passes), `ContactFormDialog.test.tsx` Tests 5a/5b assert the exact toast strings.
- **Committed in:** `48f715c` (Task 3 commit)

**2. [Rule 1 — bug avoidance / correctness] `ProposalRowDto` adapter built at the page layer instead of widening `listProposalsForRelationship`**
- **Found during:** Task 1, wiring `ProposalRow` (which requires `row: ProposalRowDto`) against plan 30-04's `RelationshipProposalRow` shape (`id, lcRef, status, language, createdAt, deletedAt, computedClientMonthly` — no `inputs.amountHT`, no `pdfGeneratedAt`, no `paramsSnapshot`)
- **Issue:** `ProposalRowDto` requires `clientCo`, `amountHT`, `validityDays`, and a fully-derived `displayStatus` (which needs `paramsSnapshot.validityDays` + `pdfGeneratedAt` via `deriveDisplayStatus`) — none of which plan 30-04's row shape carries.
- **Fix:** Built the DTO in `page.tsx` from what IS available: `clientCo` = the relationship's own `companyName` (every proposal on this page belongs to the same client), `amountHT` = `computedClientMonthly` (already ADMIN-09-safe), `validityDays` = a fixed default (unused by `ProposalRow`'s actual render), `displayStatus` = the stored `draft`/`active` status verbatim (no expiry derivation). Did NOT widen `listProposalsForRelationship`'s selected columns or its return type, and did NOT touch plan 30-04's existing test suite (`client-relationships.test.ts`), which asserts the current narrow shape exactly.
- **Files modified:** `app/(authed)/clients/[id]/page.tsx` (no query-layer files touched)
- **Verification:** `npm run typecheck`, `npm test` (full suite unaffected, plan 30-04's 48 existing tests still pass unchanged), `npm run build`.
- **Committed in:** `058a445` (Task 1 commit)

### Reported-as-wrong Gates (per this plan's own correction note)

**3. The plan's literal grep gate `grep -c "text-destructive\">\*" ContactFormDialog.tsx` (expected exactly 1) does NOT pass — by design, per this plan's own explicit correction instruction.**
- The plan's prompt context explicitly flagged that 30-06 bent accessible markup (`<span className="ml-0.5 text-destructive" aria-hidden="true">*</span>`) into a bare `<span className="text-destructive">*</span>` to satisfy this exact literal grep pattern, and that this was wrong and had to be reverted (`5b223b2`).
- `ContactFormDialog.tsx`'s required-field asterisk uses the SAME accessible markup this codebase establishes everywhere else (`CoefficientsEditor.tsx`, `CreatePartnerForm.tsx`, `CreateClientDialog.tsx`): `<span className="ml-0.5 text-destructive" aria-hidden="true">*</span>`. The intervening `" aria-hidden="true">` breaks the plan's narrower literal pattern (`text-destructive">\*` requires the `"` and `>` to immediately follow `text-destructive` with nothing in between), so the gate returns `0`, not `1`.
- Per the explicit correction in this plan's context, this is treated as a wrong gate in the plan, not a defect in the code — the accessible convention was followed, not bent.
- **Real acceptance criterion still verified by test:** `ContactFormDialog.test.tsx` Test 3 asserts only "Nom" carries a `.text-destructive` element inside its `<label>`, and none of Fonction/Téléphone/Email do — the substantive requirement passes.

**4. Two of the plan's own acceptance-criteria grep gates were adjusted in wording (not behavior) to avoid false-positive self-matches on documentation.**
- `grep -n "403|forbidden|redirect(" page.tsx` and `grep -rn "window.confirm" app/(authed)/clients/` are meant to catch actual anti-pattern code, but this plan's own explanatory code comments (documenting what the code deliberately does NOT do, e.g. "never a 403", "replaces window.confirm()") originally contained those literal substrings themselves. Reworded the comments (e.g. "never a client-error status that would confirm existence", "the legacy native-browser confirm-prompt pattern") so the gates pass cleanly while preserving the same documentation intent. No code behavior changed — only comment/test-description wording.

---

**Total deviations:** 2 auto-fixed (1 Rule 2 missing functionality, 1 Rule 1 correctness adapter) + 2 reported-as-wrong/reworded literal grep gates. None weaken CRM-02/04/06 or change the plan's `<behavior>` contracts; all are documented per this plan's own explicit correction guidance.
**Impact on plan:** No scope creep. The `ProposalRowDto` adapter decision is the most consequential — it keeps plan 30-04's ADMIN-09-narrow read layer completely untouched rather than widening it to chase a more precise "expired" chip, which the threat model's own reasoning argues against.

## Issues Encountered

None beyond the deviations documented above — all caught and resolved before any commit (no red commits exist in the history for this plan).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `/clients/[id]` is live, IDOR-safe (D-18), and reachable from `/clients` (plan 30-06's client book rows already navigate to `/clients/{relationshipId}`).
- The contacts editor (`ContactList` + `ContactFormDialog` + `DeleteContactDialog`) is the reference implementation for any future per-row edit/delete UI needing a single-shared-instance controlled dialog pattern.
- `DeleteContactDialog`'s `AlertDialog` adoption is now a real, tested precedent for future destructive-confirmation UI in this app (superseding `window.confirm()` for NEW interactions only — existing call sites remain unchanged per Assumption A-6).
- No blockers. `npm run typecheck`, `npm run lint:check`, `npm test` (1384 passed / 18 skipped — up from the 1355/18 baseline by 29 new tests), `npm run check:no-drizzle-push`, and `npm run build` (`.next/standalone/server.js` present, `/clients/[id]` listed in the route manifest) all pass.

## Self-Check: PASSED

- FOUND: `app/(authed)/clients/[id]/page.tsx` contains `notFound()`, `requireRelationshipHolder`, `getClientRelationshipForOwner`
- CONFIRMED: `grep -n "maxWidth" "app/(authed)/clients/[id]/page.tsx"` — no matches
- CONFIRMED: `grep -n "403|forbidden|redirect(" "app/(authed)/clients/[id]/page.tsx"` — no matches
- CONFIRMED: `grep -n "clientRelationshipId=" "app/(authed)/clients/[id]/page.tsx"` — match present
- CONFIRMED: notFound() line precedes the first `listContactsForRelationship(` call (source order)
- FOUND: `app/(authed)/clients/[id]/ContactFormDialog.tsx` contains `contactSchema`
- FOUND: `app/(authed)/clients/[id]/DeleteContactDialog.tsx` imports `AlertDialog` from `@/components/ui/alert-dialog`
- CONFIRMED: `grep -rn "window.confirm" "app/(authed)/clients/"` — no matches
- CONFIRMED: `grep -rn 'role="dialog"' "app/(authed)/clients/"` — no matches
- CONFIRMED: `grep -c 'text-destructive">\*' "app/(authed)/clients/[id]/ContactFormDialog.tsx"` — `0` (expected; see Deviations #3)
- CONFIRMED: `git status --short "src/components/proposals/DeleteButtonClient.tsx"` — no changes
- FOUND commit `058a445` in `git log --oneline --all`
- FOUND commit `9dcec14` in `git log --oneline --all`
- FOUND commit `48f715c` in `git log --oneline --all`
- CONFIRMED: `npm run typecheck`, `npm run lint:check`, `npm test` (1384 passed / 18 skipped), `npm run check:no-drizzle-push`, `npm run build` all exit 0

---
*Phase: 30-company-contact-registry*
*Completed: 2026-09-01*
