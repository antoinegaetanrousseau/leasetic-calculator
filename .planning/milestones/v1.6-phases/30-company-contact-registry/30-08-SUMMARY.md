---
phase: 30-company-contact-registry
plan: 08
subsystem: ui
tags: [react, next.js, shadcn, table, badge, admin, crm]

# Dependency graph
requires:
  - phase: 30-company-contact-registry (plan 02)
    provides: "admin.companies.* / clients.* i18n keys; /companies nav registration in AppSidebar/Shell adminHrefs"
  - phase: 30-company-contact-registry (plan 03)
    provides: "requireAdmin() — the [adminSegment]/companies tree gate, notFound() on non-admin"
  - phase: 30-company-contact-registry (plan 04)
    provides: "listCompaniesForAdmin / getCompanyForAdmin / listRelationshipsForCompany / getRelationshipForAdmin / listContactsForRelationshipAdmin / listProposalsForRelationshipAdmin — admin-only registry reads, no owner filter"
  - phase: 30-company-contact-registry (plan 07)
    provides: "the /clients/[id] two-card Contacts/Propositions composition this admin surface deliberately mirrors (without sharing code) and the ProposalRowDto adapter pattern for plan 30-04's ADMIN-09-narrow proposal row shape"
provides:
  - "/[adminSegment]/companies — admin company registry list with a RELATIONS count column (CRM-01, CRM-03)"
  - "/[adminSegment]/companies/[id] — every relationship on a company with holder identity and owner-type badge (CRM-03)"
  - "/[adminSegment]/companies/[id]/relations/[relationshipId] — admin-only relationship detail (Contacts read-only + Propositions), gated by requireAdmin() with T-30-08-04 id-pair validation"
affects: [Phase 31 IMPORT-01..07, Phase 33/34 pipeline/activity surfaces that will extend admin oversight]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stretched-link row navigation on a plain shadcn Table (TableRow className=\"relative\" + an inner Link with after:absolute after:inset-0) as the server-component-friendly alternative to a client-side onClick row handler — used on CompaniesList since the surface has no other client interactivity"
    - "Admin detail pages deliberately do NOT import from the partner-facing (authed)/clients/ tree even where the two-card composition is identical — the read-only markup is duplicated once (relationship detail) rather than shared, per T-30-08-03's reasoning that sharing would invite a role branch"
    - "T-30-08-04 id-pair validation: the relationship detail page checks relationship.companyId === the [id] URL segment (not just relationshipId existence) before rendering, collapsing a crafted mismatched pair into the same notFound() branch as a nonexistent id"

key-files:
  created:
    - app/(admin)/[adminSegment]/companies/page.tsx
    - app/(admin)/[adminSegment]/companies/page.test.tsx
    - app/(admin)/[adminSegment]/companies/CompaniesList.tsx
    - app/(admin)/[adminSegment]/companies/CompaniesList.test.tsx
    - app/(admin)/[adminSegment]/companies/[id]/page.tsx
    - app/(admin)/[adminSegment]/companies/[id]/page.test.tsx
    - app/(admin)/[adminSegment]/companies/[id]/CompanyRelationsTable.tsx
    - app/(admin)/[adminSegment]/companies/[id]/CompanyRelationsTable.test.tsx
    - app/(admin)/[adminSegment]/companies/[id]/relations/[relationshipId]/page.tsx
    - app/(admin)/[adminSegment]/companies/[id]/relations/[relationshipId]/page.test.tsx
    - .planning/phases/30-company-contact-registry/deferred-items.md
  modified:
    - src/lib/i18n/dictionaries.ts

key-decisions:
  - "Two new list-level empty-state i18n keys added (admin.companies.list.empty.zero / .search, fr+en) rather than reusing admin.companies.empty.zero.title — that key's exact copy ('Aucune relation active pour cette société.') is reserved for the per-company zero-relationships state (Task 2) and would be a wrong/confusing string on the company LIST's zero-companies state."
  - "Company detail header uses PageHero's actions slot to hold the SIREN chip (rather than a custom wrapper) — PageHero's title prop is a plain string with no built-in slot for an inline trailing chip; actions renders on the same header row, satisfying the plan's 'SIREN inline beside it when present' instruction without forking PageHero's markup."
  - "Relationship detail page reuses the existing clients.detail.section.* / clients.detail.empty.*.title i18n keys (Contacts/Propositions section titles and empty-state copy) rather than declaring admin-specific duplicates — this is generic section terminology, not partner-specific copy, and the UI-SPEC's i18n key plan does not list an admin-specific variant."
  - "amountHT on the admin Propositions row is computedClientMonthly (plan 30-04's already-projected monthly figure), matching 30-07's exact ADMIN-09 reasoning — listProposalsForRelationshipAdmin's row shape was NOT widened to chase a more precise 'expired' derivation."

patterns-established:
  - "Stretched-link table row navigation for admin list surfaces that stay on the plain Table primitive (no DataGrid) but still want whole-row click affordance."

requirements-completed: [CRM-01, CRM-03]

# Metrics
duration: ~35min
completed: 2026-09-01
---

# Phase 30 Plan 08: Admin Company & Relationship Registry (CRM-03) Summary

**Three requireAdmin()-gated admin surfaces — company list with a RELATIONS count column, per-company Relations table with holder identity and owner-type badges, and an admin-only relationship detail — giving Leasétic the duplicate-deal oversight (CRM-03) that makes the partner-side CRM-02 isolation safe to ship.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-09-01
- **Tasks:** 3
- **Files modified:** 11 (10 created, 1 modified) + 1 new deferred-items.md

## Accomplishments

- `app/(admin)/[adminSegment]/companies/page.tsx` + `CompaniesList.tsx` — the admin company registry list. `requireAdmin()` called as defense in depth (AUTH-15) even though the parent layout already gates. Four columns (SOCIÉTÉ, SIREN, RELATIONS, DERNIÈRE ACTIVITÉ) on the exact `PartnersList` chrome — plain shadcn `Table`, `table-chrome.ts` classes, `.card overflow-hidden p-0`, cursor "Charger plus" footer — deliberately not the DataGrid machinery used on the partner-facing client book (Assumption A-8). The RELATIONS column's neutral `Badge` is the visual tell this is an aggregate/oversight view; rows navigate via a stretched-link on the SOCIÉTÉ cell.
- `app/(admin)/[adminSegment]/companies/[id]/page.tsx` + `CompanyRelationsTable.tsx` — the company detail's focal point (CRM-03's entire reason to exist): every relationship on the company with the holder's identity, an owner-type `Badge` (Partenaire/Interne), creation date, and literal proposal/contact counts (0 renders as "0", never an em dash). Contacts are counts only — the table never fetches or renders a contact name, role, phone, or email (CRM-04 boundary, grep-verified). Header uses the full `PageHero` treatment (no eyebrow) — a deliberately different visual weight from the partner-facing `/clients/[id]`'s 22px plain `<h1>`, per 30-UI-SPEC.md §4's "must visually distinguish itself from the partner view."
- `app/(admin)/[adminSegment]/companies/[id]/relations/[relationshipId]/page.tsx` — the admin-only relationship detail behind each row's "Voir →" link. Same order-of-operations security boundary as 30-07's partner page (`requireAdmin()` first, then `getRelationshipForAdmin` → `notFound()` on null), plus a T-30-08-04-specific check: the fetched relationship's `companyId` must match the `[id]` URL segment, or the page 404s — a crafted mismatched pair cannot render one company's header over another company's relationship. Contacts render read-only (no add/edit/delete control); Propositions reuses `ProposalRow` via the same ADMIN-09-safe DTO adapter pattern 30-07 established. Deliberately shares no component with `app/(authed)/clients/` (T-30-08-03).
- 32 new tests (11 + 12 + 9) covering every `<behavior>`/acceptance-criteria bullet across all three tasks, including the CRM-04 "no contact field value ever appears" assertion, the T-30-08-04 id-mismatch `notFound()` case, and the "no mutation control rendered" check on the admin relationship detail.

## Task Commits

Each task was committed atomically:

1. **Task 1: The company registry list** - `643e7d7` (feat)
2. **Task 2: Company detail with the Relations table** - `21ac161` (feat)
3. **Task 3: Admin-only relationship detail** - `bb08866` (feat) — includes a small Rule 3 fixup to Task 1/2's files (see Deviations)

**Plan metadata:** pending (this commit)

## Files Created/Modified

- `app/(admin)/[adminSegment]/companies/page.tsx` — admin company list server route: `requireAdmin()`, `q`/`cursor` searchParams, `PageHero` + `SearchBar` + `CompaniesList` composition.
- `app/(admin)/[adminSegment]/companies/page.test.tsx` — 5 tests: auth-before-query ordering, PageHero/SearchBar rendering, q pass-through, row href.
- `app/(admin)/[adminSegment]/companies/CompaniesList.tsx` — 4-column plain-Table company list with stretched-link rows and cursor footer.
- `app/(admin)/[adminSegment]/companies/CompaniesList.test.tsx` — 6 tests: literal "0" RELATIONS, null-SIREN em dash, cursor footer preserving q, two distinct empty states, row navigation.
- `app/(admin)/[adminSegment]/companies/[id]/page.tsx` — company detail server route: `requireAdmin()`, `getCompanyForAdmin` → `notFound()`, `PageHero` + `CompanyRelationsTable` composition.
- `app/(admin)/[adminSegment]/companies/[id]/page.test.tsx` — 6 tests: notFound()-before-relationships ordering, auth-before-query ordering, header rendering, zero-relationships empty state, source-level acceptance checks.
- `app/(admin)/[adminSegment]/companies/[id]/CompanyRelationsTable.tsx` — 6-column Relations table (TITULAIRE/TYPE/CRÉÉE LE/PROPOSITIONS/CONTACTS/Voir→).
- `app/(admin)/[adminSegment]/companies/[id]/CompanyRelationsTable.test.tsx` — 6 tests covering every `<behavior>` bullet.
- `app/(admin)/[adminSegment]/companies/[id]/relations/[relationshipId]/page.tsx` — admin-only relationship detail: header (company + holder + owner-type badge), read-only Contacts card, Propositions card.
- `app/(admin)/[adminSegment]/companies/[id]/relations/[relationshipId]/page.test.tsx` — 9 tests covering every `<behavior>` bullet plus the T-30-08-04 mismatch case.
- `src/lib/i18n/dictionaries.ts` — added `admin.companies.list.empty.zero` / `.search` (fr+en) — see Decisions Made.
- `.planning/phases/30-company-contact-registry/deferred-items.md` — new file logging one out-of-scope discovery (see Issues Encountered).

## Decisions Made

See frontmatter `key-decisions` for full detail. Summary:
- **Two new list-level empty-state i18n keys added** rather than reusing the per-company zero-relationships key, which carries different, wrong-in-context copy.
- **SIREN chip rendered via `PageHero`'s `actions` slot** on the company detail header, satisfying "SIREN inline beside it" without forking `PageHero`.
- **Relationship detail reuses `clients.detail.section.*` / `clients.detail.empty.*.title` keys** — generic section terminology, not partner-specific.
- **`amountHT` = `computedClientMonthly`** on the admin Propositions row, matching 30-07's ADMIN-09 reasoning exactly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Reworded self-matching literal-grep doc comments (plan's own verification step 5 and Task 3's acceptance grep)**
- **Found during:** Task 3, running the plan's `verification` step 5 (`grep -rn "403" app/(admin)/[adminSegment]/companies/`) and Task 3's acceptance grep for `app/\(authed\)/clients`.
- **Issue:** Several of my own explanatory doc comments across Task 1 (`page.tsx`), Task 2 (`[id]/page.tsx`), and Task 3 (`page.tsx`, `page.test.tsx`) legitimately described what the code does NOT do — e.g. "notFound() not 403 (D-18)" and "Deliberately does NOT import from `app/(authed)/clients/`". Because the plan's verification/acceptance greps are dumb literal-string matches over the whole tree/file, these documentation strings self-matched and would have failed the gate even though no forbidden pattern actually exists in the code. This is the exact false-positive class already documented in `30-07-SUMMARY.md` Deviation #4.
- **Fix:** Reworded the comments to preserve the same documentation intent without the literal matched substring (e.g. "never a client-error status that would confirm existence" instead of "not 403"; "the sibling partner-facing client-detail route tree" instead of spelling out the literal path). Also dropped one self-referential test assertion (`expect(pageSource).not.toMatch(/403/)`) that could not be written without itself containing the string it asserts is absent, replacing it with a comment noting the gate is verified via the plan's own standalone grep instead.
- **Files modified:** `app/(admin)/[adminSegment]/companies/page.tsx`, `app/(admin)/[adminSegment]/companies/[id]/page.tsx`, `app/(admin)/[adminSegment]/companies/[id]/relations/[relationshipId]/page.tsx`, `app/(admin)/[adminSegment]/companies/[id]/relations/[relationshipId]/page.test.tsx`.
- **Verification:** `grep -rn "403" "app/(admin)/[adminSegment]/companies/"` returns no matches; `grep -nE "ContactFormDialog|DeleteContactDialog|createContactAction|deleteContactAction|app/\(authed\)/clients" page.tsx` returns no matches; full test suite green.
- **Committed in:** `bb08866` (Task 3 commit, folded in as a fixup to Task 1/2's already-committed files).

---

**Total deviations:** 1 auto-fixed (Rule 3, doc-comment wording only — no behavior changed). Consistent with the plan's own explicit correction guidance (30-07's precedent) to reword self-matching literal gates rather than degrade the code or its documentation's substance.

## Issues Encountered

**1. [Deferred, not fixed] `/proposals/[id]` has no admin-bypass in its ownership check.**
- Clicking through from the new admin relationship detail page's Propositions card to a specific proposal (`/proposals/[id]`) will 404 for an admin, because that pre-existing file gates strictly on `proposal.userId !== session.user.id` with no `role === 'admin'` exception.
- Out of scope for this plan (Scope Boundary: the file is untouched by this plan, and the identical characteristic already exists in the established Phase 18 admin flow at `/proposals?user_id={partnerId}`, whose list supports an admin override but whose detail page does not). Fixing it is a Rule 4 architectural change (widens a shared route's authorization model) that also needs a product decision on the ADMIN-09 envelope for the fuller proposal-detail view.
- Logged in `.planning/phases/30-company-contact-registry/deferred-items.md` with a suggested resolution for a future plan (Phase 33/34 candidate). Does not block CRM-03: the relationship-level summary (counts, LC ref, amount, date, status) is already fully visible to the admin on the pages this plan ships.

Both items above were caught and resolved (the deviation) or explicitly deferred (the issue) before any red commit — no red commits exist in the history for this plan.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- CRM-03 is complete: an admin sees every relationship on a company, including the holder's identity, and can drill into contacts/proposals for any relationship, without any of that breadth leaking into the partner-facing `/clients` tree.
- The three admin routes are reachable from the "Sociétés" sidebar entry (registered in plan 30-02) and are all `requireAdmin()`-gated with `notFound()` (never 403) on failure.
- `.planning/phases/30-company-contact-registry/deferred-items.md` flags one candidate for a future plan: widening `/proposals/[id]`'s authorization to admit admins.
- No blockers. `npm run typecheck`, `npm run lint:check`, `npm test` (1416 passed / 18 skipped — up from the 1384/18 baseline by 32 new tests), `npm run check:no-drizzle-push`, and `npm run build` (`.next/standalone/server.js` present, all three new routes listed in the route manifest) all pass.

## Self-Check: PASSED

- FOUND: `app/(admin)/[adminSegment]/companies/page.tsx` contains `requireAdmin` and `robots:`
- FOUND: `app/(admin)/[adminSegment]/companies/[id]/CompanyRelationsTable.tsx` contains `isInternal` and `variant="secondary"`
- FOUND: `app/(admin)/[adminSegment]/companies/[id]/relations/[relationshipId]/page.tsx` contains `requireAdmin` and `notFound()`
- CONFIRMED: `grep -nE "DataGrid|<Frame" app/(admin)/[adminSegment]/companies/CompaniesList.tsx` — no matches
- CONFIRMED: `grep -n "maxWidth" app/(admin)/[adminSegment]/companies/page.tsx` — no matches
- CONFIRMED: `grep -nE "listContactsForRelationship|contact\.(name|email|phone)" app/(admin)/[adminSegment]/companies/[id]/CompanyRelationsTable.tsx app/(admin)/[adminSegment]/companies/[id]/page.tsx` — no matches
- CONFIRMED: `grep -rn "403" "app/(admin)/[adminSegment]/companies/"` — no matches
- CONFIRMED: `grep -nE "ContactFormDialog|DeleteContactDialog|createContactAction|deleteContactAction|app/\(authed\)/clients" "app/(admin)/[adminSegment]/companies/[id]/relations/[relationshipId]/page.tsx"` — no matches
- FOUND commit `643e7d7` in `git log --oneline --all`
- FOUND commit `21ac161` in `git log --oneline --all`
- FOUND commit `bb08866` in `git log --oneline --all`
- CONFIRMED: `npm run typecheck`, `npm run lint:check`, `npm test` (1416 passed / 18 skipped), `npm run check:no-drizzle-push`, `npm run build` (`.next/standalone/server.js` present) all exit 0

---
*Phase: 30-company-contact-registry*
*Completed: 2026-09-01*
