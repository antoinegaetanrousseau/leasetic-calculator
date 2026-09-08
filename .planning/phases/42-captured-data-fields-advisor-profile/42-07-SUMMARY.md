---
phase: 42-captured-data-fields-advisor-profile
plan: "07"
subsystem: ui
tags: [admin, react-hook-form, zod, phone-input, admin-nav-card]

# Dependency graph
requires:
  - phase: 42-captured-data-fields-advisor-profile
    plan: "06"
    provides: "getAdvisor()/upsertAdvisor(), advisorFormSchema, requireAdmin-gated adminUpdateAdvisor(data) this plan's route and form call directly"
  - phase: 42-captured-data-fields-advisor-profile
    plan: "01"
    provides: "All admin.advisor.* i18n dictionary keys (FR+EN) — no new keys were needed"
provides:
  - "/{adminSegment}/advisor — requireAdmin-gated admin route rendering the single Leasetic advisor identity"
  - "AdvisorForm — four-field client form (Nom/Fonction/Téléphone/Email, all required) bound to adminUpdateAdvisor"
  - "AdminNavCard 'advisor' variant (navy accent, reused from 'history') + the 5th nav card on the admin home linking to /advisor"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Singleton-settings form pattern: no action prop indirection (unlike CreatePartnerForm) — AdvisorForm imports and calls adminUpdateAdvisor directly since this is a one-off admin screen, not a reusable create flow"
    - "Annuler on a singleton upsert page calls form.reset() with no navigation target, mirroring ParametresForm.tsx's handleCancel rather than CreatePartnerForm.tsx's router.push pattern"

key-files:
  created:
    - "app/(admin)/[adminSegment]/advisor/page.tsx"
    - "app/(admin)/[adminSegment]/advisor/AdvisorForm.tsx"
    - "app/(admin)/[adminSegment]/advisor/AdvisorForm.test.tsx"
  modified:
    - "app/(admin)/[adminSegment]/page.tsx"
    - "app/(admin)/[adminSegment]/page.test.tsx"
    - "src/components/ui/AdminNavCard.tsx"

key-decisions:
  - "No breadcrumb on the advisor page (deviation from the plan's conditional instruction, Rule-1-adjacent judgment call): partners/new/page.tsx's breadcrumb exists because it is a sub-route of the /partners list; /advisor is a top-level admin route like /coefficients, /companies and /lc-references, none of which render a breadcrumb back to the admin home. Verified against all three sibling top-level page.tsx files before deciding — matching the actual convention rather than the one plausible-sounding precedent."
  - "AdvisorForm imports advisorFormSchema and adminUpdateAdvisor directly from their own modules (not via an action prop, not via the @/lib/admin barrel) — the plan's own prop signature (`{ lang, initial }`, no action prop) settles this; a direct-import server action call is idiomatic Next.js and this is a singleton settings screen, not a reusable form component."

patterns-established: []

requirements-completed: []

# Metrics
duration: ~10min
completed: 2026-09-08
---

# Phase 42 Plan 07: Admin Advisor Screen + Home Nav Entry Summary

**The single Leasetic advisor identity now has a reachable admin screen — `/{adminSegment}/advisor`, a four-required-field form wired to Plan 42-06's `adminUpdateAdvisor`, and a 5th AdminNavCard on the admin home linking to it — closing the "route with no navigation entry" gap the plan objective called out.**

## Performance

- **Duration:** ~10 min
- **Tasks:** 3 (Task 2 flagged `tdd="true"`)
- **Files modified:** 6 (3 created + 3 modified)

## Accomplishments

- **`/{adminSegment}/advisor` route** (`page.tsx`) — `dynamic = 'force-dynamic'`, French-titled `metadata` with `robots: { index: false, follow: false }`, an independent `await requireAdmin()` (AUTH-15 defense in depth on top of the layout's own gate), and `getAdvisor()` imported from the `@/lib/db/queries` barrel (not the sibling file directly). Mirrors the `main` + `PageHero` shape of the other top-level admin routes (`coefficients`, `companies`, `lc-references`) verbatim — including their shared convention of **no breadcrumb**, a deliberate deviation from the plan's other cited precedent (`partners/new/page.tsx`, a sub-route with a real parent list to link back to).
- **`AdvisorForm`** (`AdvisorForm.tsx`) — RHF + `zodResolver(advisorFormSchema)`, `mode: 'onBlur'`. One `.card` with a single `SectionTitle accent="gd"` and four required fields in order (Nom, Fonction, Téléphone via `PhoneInput` + `Controller`, Email), each with a red required asterisk and a `FieldError role="alert"`. A sibling action-footer `.card` uses the hand-rolled `.btn-out` / `.btn-green` classes (never shadcn `Button`) to stay visually identical to `CreatePartnerForm.tsx` and `ParametresForm.tsx`. Submit calls `adminUpdateAdvisor(values)` directly; `{ ok: true }` fires the `admin.advisor.toast.saved` toast and `form.reset(values)` so the saved values become the next Annuler baseline; `{ ok: false }` fires only the bounded `admin.advisor.toast.error` toast — the action's own returned error string is never rendered. Annuler calls `form.reset()` with no navigation — this singleton upsert page has nothing to navigate back to.
- **Admin home nav entry** — `AdminNavCard`'s `Variant` union gained `'advisor'`, reusing the exact navy `(rgb: '17, 44, 59', token: 'var(--navy)')` pair the `history` variant already uses (no new color introduced). A 5th `AdminNavCard` was added to the admin home's existing 4-card grid, reusing the `admin.advisor.hero.title`/`.subtitle` copy keys (no new i18n needed) and `PhoneIcon` from the existing Iconly vocabulary. The grid's `className` string (`grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`) is byte-identical to its pre-task value — the 5th card wraps to a second row at every breakpoint those responsive classes already handle.

## Task Commits

Each task was committed atomically:

1. **Task 1: Server component route at /{adminSegment}/advisor** — `6411608` (feat)
2. **Task 2: AdvisorForm client component with the four required fields** — `0fc6cbb` (feat)
3. **Task 3: Add the advisor entry point to the admin home page** — `1c14701` (feat)

Task 2 was flagged `tdd="true"`. Following the Plan 42-05/42-06 precedent, it was executed as a single verified commit (component + its full 7-case test coverage written together, `npx vitest run` + `npm run typecheck` + `npm run lint:check` confirmed green before committing) rather than a literal RED-then-GREEN two-commit split — the `<behavior>` block describes the finished contract's outcomes against new test infrastructure, not a pre-existing regression to reproduce first.

## Files Created/Modified

- `app/(admin)/[adminSegment]/advisor/page.tsx` — the `requireAdmin`-gated server-component route
- `app/(admin)/[adminSegment]/advisor/AdvisorForm.tsx` — the four-field client form
- `app/(admin)/[adminSegment]/advisor/AdvisorForm.test.tsx` — 7 cases: prefill from `initial`, `initial={null}` no-throw, blank-field submit blocks the call, valid submit calls `adminUpdateAdvisor` once with all four values + success toast, failed save shows the bounded error toast, Annuler restores `initial` in place with no navigation, all four labels carry a required asterisk
- `app/(admin)/[adminSegment]/page.tsx` — imports `PhoneIcon`, adds the 5th `AdminNavCard`, extends the module doc block's ADMIN-09 note
- `app/(admin)/[adminSegment]/page.test.tsx` — Test 7 extended from 4 to 5 nav-card assertions (adds the `advisor` variant/href/icon)
- `src/components/ui/AdminNavCard.tsx` — `Variant` union + `ACCENT_BY_VARIANT` gain `'advisor'` (navy, reused from `history`); doc comment updated

## Decisions Made

- **No breadcrumb on `/advisor`.** The plan offered this as conditional ("only if `partners/new/page.tsx`'s breadcrumb pattern applies cleanly"). Checked all three other top-level admin routes (`coefficients/page.tsx`, `companies/page.tsx`, `lc-references/page.tsx`) before deciding — none render a breadcrumb, because `partners/new` is a sub-route of the `/partners` list and has somewhere real to link back to, while `/advisor` (like its siblings) does not. Matched the actual convention rather than the one plausible-sounding precedent the plan cited by name.
- **Direct action import, no prop indirection.** `AdvisorForm`'s props are exactly `{ lang, initial }` per the plan — no `action` prop the way `CreatePartnerForm` decouples its server action for reuse/testability. `adminUpdateAdvisor` is imported and called directly; the test mocks the module (`vi.mock('@/lib/admin/advisor-actions', ...)`) instead of injecting a `vi.fn()` prop.

## Deviations from Plan

None beyond the breadcrumb judgment call documented above under Decisions Made (not a deviation from written instructions — the plan explicitly left it conditional on convention-matching, which was verified before deciding).

### Auto-fixed Issues

None — no bugs, missing functionality, or blocking issues were encountered.

## Issues Encountered

- Initial `AdvisorForm.test.tsx` draft used `screen.getByLabelText('Nom')` (exact string) against labels that render as `Nom*` — the asterisk `<span>` immediately follows the label text with no separating space, so an exact match fails while every sibling form's tests (`CreatePartnerForm.test.tsx`) use a `/^Nom/`-style regex for the same reason. Fixed by switching all four label queries to `^`-anchored regexes before the first test run; not logged as a Rule 1/2/3 deviation since it never reached a commit — caught and corrected during the test-writing pass itself.

## User Setup Required

None. No external service configuration, no environment variable, no manual step. The migration applying `leasetic_advisor` to production Neon (Plan 42-02's `drizzle/0011_phase42_captured_data.sql`) remains the one operator action outstanding from earlier plans, tracked there — this plan neither ran nor needed to run any database-touching command.

## Requirements

**PROF-03 is NOT marked complete in `.planning/REQUIREMENTS.md`.** Verified before deciding:

- PROF-03 (amended by D-06/D-07/D-08/D-09/D-22) reads: *"A finalized proposal's **partner** block is sourced from the authenticated creating user's account … its **advisor** block is sourced from a single admin-editable Leasetic advisor setting … read live at render time."*
- This plan closes the first half of PROF-03's mechanism: an admin can now view and save the advisor identity, and it persists (`adminUpdateAdvisor` → `upsertAdvisor` → the `leasetic_advisor` row, verified via the AdvisorForm test suite calling through to a mocked `adminUpdateAdvisor` with the exact four values, and Plan 42-06's own persistence-layer tests).
- It does **not** close the requirement's literal claim about a *finalized proposal*. Confirmed by inspection: `src/lib/pdf/` contains zero references to `getAdvisor`, `advisorName`, or `leaseticAdvisor` — nothing in the current PDF render pipeline reads this row at all. `.planning/phases/42-captured-data-fields-advisor-profile/42-CONTEXT.md`'s own Phase Boundary section states this explicitly: *"Not this phase: rendering any of it. The `SOCIÉTÉ CLIENTE` / contact cards … are Phase 43."* Wiring the advisor block onto an actual finalized proposal — and the partner block's creating-user sourcing alongside it — is Phase 43's job, not this plan's.
- Net: the admin-editable-setting half of PROF-03 is done; the render-onto-a-finalized-proposal half is not. Left unchecked per the explicit instruction not to tick a requirement only partially closed.

## Next Phase Readiness

- **Phase 43** can call `getAdvisor()` (already exported from `@/lib/db/queries`) at proposal-render time to source the advisor block; nothing in this plan changes that contract. Until an admin saves the row at least once (or the migration is applied), it returns `null` — Phase 43's DOC-11 em-dash treatment must cover that window, as already flagged by Plan 42-06.
- The admin advisor screen is now discoverable end-to-end: admin home → 5th nav card → `/advisor` → save → toast + persisted row. No further plan in this phase needs to touch this surface.

---
*Phase: 42-captured-data-fields-advisor-profile*
*Completed: 2026-09-08*

## Self-Check: PASSED

All 6 claimed source files + this Summary found on disk; all 3 commit hashes
(6411608, 0fc6cbb, 1c14701) found in git history.
