---
status: passed
phase: 30-company-contact-registry
source:
  - 30-01-SUMMARY.md
  - 30-02-SUMMARY.md
  - 30-03-SUMMARY.md
  - 30-04-SUMMARY.md
  - 30-05-SUMMARY.md
  - 30-06-SUMMARY.md
  - 30-07-SUMMARY.md
  - 30-08-SUMMARY.md
  - 37-05-SUMMARY.md
started: 2026-09-01T23:44:00+02:00
updated: 2026-09-06T00:00:00+02:00
---

> **Provenance note (2026-09-06):** Scenarios 2, 9, 10 and 12 below were walked via **agent
> browser automation (Claude in Chrome)**, at the operator's explicit direction, during Phase
> 37's consolidated CLOSE-01/CLOSE-03 walk (D-37-04). This is **not human-observed** — the
> plan and D-37-04 originally called for a human at a browser, and the operator overrode that
> and directed the agent to drive the browser instead. This is a materially different
> evidentiary standard than the human-confirmed walks recorded elsewhere in this file (e.g.
> tests 3-8, 11, confirmed by Antoine in the 2026-09-02 session). Every result below states
> this plainly rather than implying a human watched the screen.

## Current Test

No test is awaiting a response. Scenarios 2, 9, 10 and 12 were walked and recorded on
2026-09-06 (Phase 37, D-37-04's consolidated session); see each scenario below and the
`## Phase 37 Closure Note` at the end of this file.

## Tests

### 1. Cold Start Smoke Test
expected: After `rm -rf .next && npm run dev`, the server boots clean and an authed page loads live data. No startup errors, no missing-column failures.
requirement: (smoke)
result: pass
note: "Server booted clean; /proposals loads live data. A separate nav defect was discovered during this step and is logged against test 2 (admin in partner view is offered a Clients link that 404s)."

### 2b. DISCOVERED — admin in partner view gets a dead-end Clients link
expected: An admin browsing the partner view should not be offered a nav item that always 404s.
requirement: ROLE-03, CRM-07
result: issue
reported: "clients does but with issues on the UI — 404 Page introuvable while signed in as ADMIN; clients works on the admin view however"
severity: major
root_cause: |
  AppSidebar.tsx:158-160 selects nav as
    isAdmin && effectiveView === 'admin' && adminHrefs ? adminNavItems() : partnerNavItems()
  so an admin whose effectiveView is 'partner' (Phase 24 dual-view toggle, Plan 24-02)
  receives partnerNavItems() — which Plan 30-02 widened to include Clients -> /clients.
  requireRelationshipHolder() (src/lib/auth/require.ts) calls notFound() whenever
  role === 'admin', unconditionally, with no view-mode awareness.
  The two are individually correct and jointly produce a guaranteed dead-end link.
  partnerNavItems()'s own docblock asserts "Every non-admin role reaches this same
  array — isAdmin===false is the only gate", an assumption that Phase 24 had already
  invalidated before Plan 30-02 was written.

### 2. Clients nav is correct for each role (re-test — behaviour changed in ca75c9d)
expected: |
  **Expected counts corrected 2026-09-06 (Phase 37 walk) — see note.** Signed in as a
  **partner**, the sidebar has **6** items (Accueil, Nouvelle proposition, Propositions,
  Clients, Pipeline, Aide) with **Clients** sitting between Propositions and Pipeline.
  Navigating to it highlights the Clients entry as active, no 404.

  Signed in as **admin in Agent view**, the sidebar has **4** items (Accueil, Nouvelle
  proposition, Propositions, Aide) — no Clients entry at all.

  Switching to **Admin view** gives **8** items (Accueil, Nouvelle proposition,
  Propositions, Partenaires, Sociétés, Réconciliation, Coefficients, Aide).
requirement: CRM-07
result: pass
note: |
  Walked via agent browser automation (Claude in Chrome) on 2026-09-06 at the operator's
  direction; not human-observed. Observed counts: partner (delphine.specht) = 6 items,
  Clients between Propositions and Pipeline, active-highlight confirmed, /clients opened
  with no 404. Admin (antoine.rousseau) in Agent view = 4 items, no Clients, no Pipeline —
  confirmed via the accessibility tree (only /, /proposals/new/parametres, /proposals,
  /aide). Admin in Admin view = 8 items including Sociétés and Réconciliation.

  This scenario's original `expected` block (5 partner / 7 admin) was written before two
  later, unrelated features landed: `pipeline` was added to the partner sidebar by
  `c3ac2f8` "feat(33-05): add Pipeline to the partner sidebar and the route-meta
  breadcrumb" (2026-09-03), and `admin-reconciliation` was added by `f9121c5`
  "feat(31-06): reconciliation dictionary namespace, route-meta and sidebar wiring"
  (2026-09-02) — both after Phase 30 authored this scenario. Both overshoots are
  attributable, stale expectations, not regressions. The `expected` block above has been
  corrected to 6 / 4 / 8 so the scenario stops drifting.

### 3. Client book lists, searches and sorts
expected: |
  `/clients` shows your own client book as a table — company name, SIREN, contact
  count, last activity. Free-text search matches on company name AND siren. Sorting
  works on company name and on last activity (clients with no proposal sort last).

  Only YOUR clients appear. There is no pagination control and no row-selection
  checkbox — scrolling/cursor paging only, by design.
requirement: CRM-07, CRM-02
result: pass
verified_in: "prior session (user-confirmed 2026-09-02); not re-executed in this UAT run"

### 4. Create a client
expected: |
  The "create client" dialog has exactly two fields: company name (required, marked
  with an asterisk) and SIREN (optional, with helper text and no asterisk).

  There is **no lookup or search surface** in the dialog — you cannot browse or
  discover existing companies from it. Submitting creates the client and it appears
  in your book.
requirement: CRM-01
result: pass
verified_in: "prior session (user-confirmed 2026-09-02); not re-executed in this UAT run"

### 5. SIREN dedup is silent and indistinguishable
expected: |
  Create a client using a SIREN that already exists on a company in the registry
  (e.g. one another partner holds, or one you deleted from your own book).

  It succeeds and looks **exactly like a fresh create** — same message, same timing,
  no "this company already exists" hint, no different wording. Behind the scenes your
  relationship attached to the existing company row, but nothing in the UI reveals
  that another relationship exists. This is the channel-conflict protection: any
  divergence here leaks that a competitor is working the same client.
requirement: CRM-01, CRM-02
result: pass
verified_in: "prior session (user-confirmed 2026-09-02); not re-executed in this UAT run"

### 6. Contacts: add, edit, delete
expected: |
  On `/clients/[id]`, the Contacts card starts with an empty state when there are none.

  Add a contact — Nom is required (asterisk), Fonction / Téléphone / Email optional.
  Each contact row shows the name in bold with role/phone/email beneath; absent fields
  are simply omitted, never shown as a dash. Phone and email lines are icon-prefixed.

  Edit and delete are icon buttons with accessible labels. Delete opens a confirmation
  dialog titled "Supprimer ce contact ?" naming the contact — not a browser
  `confirm()` popup.
requirement: CRM-04
result: pass
verified_in: "prior session (user-confirmed 2026-09-02); not re-executed in this UAT run"

### 7. Proposal started from a client links back to it
expected: |
  **This is plan 30-09's parked checkpoint — the loop the whole phase exists to close.**

  From a client record, start a new proposal. The wizard opens with the client's
  details prefilled. Complete it.

  The finished proposal now appears in that client's Propositions card. Open the PDF:
  it is byte-identical in content to what it would have been without the link — the
  `inputs` snapshot was not touched.

  Then create a proposal the normal way (not from a client). It is NOT retroactively
  linked to anything and does not appear on any client page.
requirement: CRM-05, CRM-06
result: pass
verified_in: "prior session (user-confirmed 2026-09-02); not re-executed in this UAT run"

### 8. Admin sees the company registry and who holds each relationship
expected: |
  As admin, `/{adminSegment}/companies` lists every company with a relations count.

  Opening a company shows **every relationship on it, with the holder's identity** and
  an owner-type badge (channel partner vs internal Commercial). This is CRM-03's whole
  reason to exist — the duplicate-deal risk that turns into a dispute at signature is
  visible here and nowhere else.
requirement: CRM-03
result: pass
verified_in: "prior session (user-confirmed 2026-09-02); not re-executed in this UAT run"

### 9. Admin relationship detail — and the click-through that used to dead-end
expected: |
  **Rewritten 2026-09-06 (Phase 37 / GAP-01 / D-37-01) — this scenario no longer describes
  a dead end.** From a company's relationship row, "Voir →" opens the admin relationship
  detail: contacts shown **read-only** (no edit/delete), plus that relationship's proposals.

  Now click through to a specific proposal from there. **The proposal detail page opens —
  it must NOT 404.** This is the behaviour change GAP-01/D-37-01 delivered: an
  unconditional server-derived `role === 'admin'` bypass on `/proposals/[id]`'s ownership
  guard (`app/(authed)/proposals/[id]/page.tsx`, commit `4a09292`). Before that landed, this
  scenario's expected outcome was a 404 by design; that dead end is now gone.

  On the opened proposal detail page, confirm no commission figure and no rate/percentage
  input is visible anywhere (the ADMIN-09 envelope).

  Confirm the click-through succeeding is the ONLY change: everything at relationship level
  (LC ref, amount, date, status, counts) still displays correctly. If anything else is
  missing or wrong, that's a new finding.
requirement: CRM-03
result: pass
note: |
  Walked via agent browser automation (Claude in Chrome) on 2026-09-06 at the operator's
  direction; not human-observed. As admin: Sociétés -> Garage Central Mercier -> relations
  row -> "Voir ->" opened the read-only relationship detail. Contacts (Yann Mercier,
  Gérant) rendered with NO edit/delete controls (confirmed in the accessibility tree). Both
  proposals listed (LC-SEED-PIPE-05b, LC-SEED-PIPE-05a). Clicking through to
  LC-SEED-PIPE-05b OPENED the proposal detail page — no 404, confirming GAP-01/D-37-01.
  Commission check: the page renders partner, commercial, client company, contact, qualité,
  téléphone, email, SIREN, sale&lease-back, évaluation parc, descriptif, référence
  partenaire, montant financé HT, tranche, durée, coefficient appliqué 2,4700%, loyer
  mensuel HT, validité — no commission figure and no commission rate.

  DEFECT FOUND during this walk, since fixed: the "APERÇU PDF" panel rendered the raw body
  `{"error":"not_found"}`, and both PDF actions were dead for admins. Root cause:
  `app/api/proposals/[id]/pdf/route.ts:28` still carried the flat
  `if (!proposal || proposal.userId !== userId)` check that D-37-01 removed from the page.
  Confirmed empirically via `GET /api/proposals/17d8cc9e-.../pdf` -> `{"error":"not_found"}`.

  **Correction, 2026-09-06 (post-fix browser confirmation).** The root-cause attribution
  above is partly wrong and is left in place rather than rewritten, because the correction
  is the more useful record. `pdf/route.ts` returns the identical `{"error":"not_found"}`
  body from TWO places: the ownership check (step 3) and `!proposal.pdfBlobKey` (step 5).
  Every seeded `LC-SEED-PIPE-*` proposal has a NULL `pdf_blob_key`, so the 404 observed on
  LC-SEED-PIPE-05b was step 5 — a fixture with no generated PDF — not the ownership check.
  The two causes are indistinguishable from the response body alone, and the attribution was
  made from reading the code rather than from isolating the branch.

  The ownership defect was nevertheless real, and the fix is confirmed working end to end:
  as admin, `/proposals/f54f6b24-509b-4222-8a67-8053112221ae` (LC-2026-002, owned by
  delphine.specht, `pdf_blob_key` NOT NULL) now renders the actual PDF in the APERÇU PDF
  panel. The pre-fix behaviour on that same proposal is pinned by
  `app/api/proposals/[id]/pdf/route.test.ts` Test 3, which fails
  `AssertionError: expected 404 to be 200` when the flat check is restored. A live pre-fix
  reproduction against a PDF-bearing proposal was never captured.
  Fixed during this phase, at the operator's explicit decision, in commit `7999759`
  "fix(37-01): extend the D-37-01 admin bypass to the PDF route (GAP-01)" — the guard now
  mirrors the page exactly (server-derived role, `!proposal` an independent short-circuit,
  admin-only). Six tests added in `app/api/proposals/[id]/pdf/route.test.ts`, proven
  non-vacuous (Test 3 fails with the flat check restored). The browser re-confirmation of
  the FIXED PDF path was NOT performed in this walk (it needed another admin sign-in and
  the session had moved on) — recorded honestly as an unverified-in-browser residual; the
  automated tests and the empirical pre-fix reproduction are the evidence for the fix.

### 10. Sales-role parity, and admin exclusion
expected: |
  A user with partner_type `Commercial` gets role `sales` and behaves exactly like a
  partner for CRM: same sidebar with Clients, can create clients, contacts, and hold
  relationships. In the admin partners list they carry an "internal" classification.

  An **admin** visiting `/clients` gets a 404 — not a 403, not a redirect. The clients
  tree is for relationship holders only.
requirement: ROLE-01, ROLE-02
result: pass
note: |
  Walked via agent browser automation (Claude in Chrome) on 2026-09-06 at the operator's
  direction; not human-observed. olivier.jourdan@leasetic.com (partner_type Commercial) has
  a sidebar IDENTICAL to a partner: 6 items including Clients and Pipeline (a11y tree: /,
  /proposals/new/parametres, /proposals, /clients, /pipeline, /aide). His home shows the
  momentum card, same as a partner. Started from an empty client book. Created a client
  "ZZ-WALK37 Client Test Commercial" (SIREN 552100554) — the registry sync fired
  automatically and resolved it to PEUGEOT SA with address, forme juridique, activité,
  effectif, date de création and état; relationship created at stage `prospect`. Added a
  contact ("Walk Test Contact / Directeur achats / walk37@example.test") with edit and
  delete controls available to the owner. In the admin partners list, Olivier Jourdan shows
  TYPE = "Commercial" while both external partners (Quentin Fischer, Delphine Specht) show
  "Partenaire" — the internal classification is present and distinct. Admin visiting
  `/clients` directly -> 404 "Page introuvable" — not 403, not a redirect.

  Walk artifacts (ZZ-WALK37 company/relationship/contact) were deleted afterward and the
  seeder was confirmed to re-run clean at +0 / +0 / +0.

  Minor drift observed, not part of this scenario's scope: the "Nouveau client" dialog now
  requires BOTH "Nom de la société *" and "SIREN *" (scenario 4 describes SIREN as
  optional). The 2026-09-03 acceptance amendment (33-CONTEXT.md, PIPE-05) made SIREN
  mandatory at client and proposal creation. This is a stale expectation on scenario 4, not
  a regression on scenario 10; scenario 4's `result:` is left unchanged since it was not
  one of the four scenarios closed in this session.

### 11. Cross-tenant isolation holds under a forged URL
expected: |
  As Partner B, take the URL of a client record belonging to Partner A
  (`/clients/{someone-elses-id}`) and open it directly.

  You get a **404 — identical** to what you'd get for an id that doesn't exist at all.
  Not a 403, not "you don't have access", not a different error message. The two cases
  must be indistinguishable, or the difference itself tells you the record exists.

  Same for the admin company pages: a partner cannot reach them at all.
requirement: CRM-02
result: pass
verified_in: "prior session (user-confirmed 2026-09-02); not re-executed in this UAT run"

### 12. Nothing that worked before is different
expected: |
  `/proposals` and the admin `/partners` page look and behave exactly as they did
  before Phase 30 — same search box behaviour, same columns, same data.

  Admins lost no visibility. Partners gained none. And no commission or rate input
  appears anywhere on a partner-facing surface (the ADMIN-09 envelope).

  Also confirm the partner-home momentum card is unchanged (Phase 37 / GAP-03 touched
  `app/(authed)/page.tsx`) and that the admin home renders no momentum card at all.
requirement: ROLE-03
result: pass
note: |
  Walked via agent browser automation (Claude in Chrome) on 2026-09-06 at the operator's
  direction; not human-observed. Partner `/proposals`: search box, Actives/Brouillons/
  Archivées tabs, columns = company · LC ref · date · Montant HT · status — no commission
  column, no rate input. Admin `/partners`: search, Tous/Actifs/Invités/Désactivés tabs,
  columns PARTENAIRE · EMAIL · DATE CRÉATION · DERNIÈRE ACTIVITÉ · STATUT · TYPE — no
  commission column. Partner home renders the momentum card ("VOTRE PROGRESSION", série,
  paliers) unchanged. Admin home renders NO momentum card at all — consistent with
  D-37-05/IN-01, whose fix removed the redundant `!isAdmin` beside an already null-gated
  `momentum`.

## Summary

total: 13
passed: 12
issues: 3
issues_fixed: 2
pending: 0
skipped: 0

Recomputed 2026-09-06 from the per-scenario `result:` fields actually present in this file
(not adjusted by hand): `total` = 13 `### N.` scenario headings (1, 2b, 2-12). `passed` = 12
(`result: pass` on 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12). `issues` = 3 and `issues_fixed` = 2
count the distinct entries in `## Gaps` below (unchanged by this walk — that section tracks
defects found across the phase, not per-scenario pass/fail). Scenario 2b (`result: issue`) is
the 13th heading and is neither `pass` nor `pending`; it corresponds to one of the three Gaps
entries. `pending` = 0: scenarios 2, 9, 10 and 12 were the last four and are now all `pass`.

## Gaps

- truth: "A 404 rendered inside the authed shell shows no duplicate language/theme controls."
  status: failed
  reason: "User reported: language and clear/dark mode toggles are randomly appearing on the page instead of their specific position in the settings popup at bottom-left."
  severity: minor
  test: 2b
  cross_phase: "Phase 06 (SHELL-13/D-31 standalone 404) x Phase 30 (notFound() calls from inside the authed tree)"
  artifacts:
    - "app/not-found.tsx:44-58 — absolute top-right LocaleToggle + ThemeToggle, plus its own wordmark and minHeight:100vh"
    - "app/(authed)/layout.tsx — Shell already provides FR/EN + theme inside the settings popup"
  root_cause: |
    app/not-found.tsx is the only not-found boundary. It is designed chromeless-standalone
    for unmatched/unauthenticated routes, so it supplies its own toggles. Next.js renders the
    nearest not-found boundary INSIDE the surrounding layout, so every notFound() raised from
    within (authed) — requireRelationshipHolder(), and every deliberate D-18 URL-secrecy 404 —
    renders this standalone page inside the Shell, duplicating the toggles.
  missing:
    - "A nested app/(authed)/not-found.tsx rendering only the 404 card (no toggles, no wordmark, no 100vh), so the root boundary keeps serving chromeless routes unchanged."
  resolution: fixed
  fix: |
    Card markup extracted to src/components/ui/NotFoundCard.tsx so the copy lives
    once. app/not-found.tsx keeps the standalone chrome (100vh centring, wordmark,
    its own toggles) for the genuinely chromeless contexts. Two nested boundaries
    added — app/(authed)/not-found.tsx and app/(admin)/[adminSegment]/not-found.tsx
    — rendering the card alone inside the Shell.
    Deliberately NOT changed: the admin layout's own notFound() (segment mismatch
    and non-admin role) still falls through to the chromeless root, because a
    layout that throws cannot render its own children boundary — and someone who
    should not know the admin tree exists must not be shown its shell (D-18/AUTH-14).

- truth: "Each list surface's search field describes what it actually searches."
  status: failed
  reason: "Observed on /{adminSegment}/companies — placeholder reads 'Rechercher par client ou reference...', the proposals default, on a surface that searches company name and SIREN."
  severity: cosmetic
  status_note: "User reviewed and considers the search bar correct as shipped. Kept as a recorded observation, not an action item — the label still reads 'client ou reference' on a company/SIREN search."
  test: 8
  artifacts:
    - "app/(admin)/[adminSegment]/companies/page.tsx:63 — bare <SearchBar lang={lang} />, no placeholderKey/ariaKey"
    - "app/(authed)/clients/page.tsx:85-89 — correctly passes clients.search.placeholder / clients.search.aria"
    - "src/lib/i18n/dictionaries.ts — admin.companies.search.placeholder / .aria do not exist (fr or en)"
  missing:
    - "Add admin.companies.search.placeholder + .aria to both fr and en dictionaries (FR/EN parity is compile-time enforced by _EnHasAllFrKeys)."
    - "Pass them from app/(admin)/[adminSegment]/companies/page.tsx, matching the pattern already used at app/(authed)/clients/page.tsx:85."
  note: "Plan 30-02 shipped the SearchBar override mechanism and the clients.search.* pair but not the admin.companies.search.* pair, so Plan 30-08 had no key to pass."

- truth: "An admin browsing the partner view is never offered a navigation link that cannot resolve for their role."
  status: failed
  reason: "User reported: clients does but with issues on the UI — 404 Page introuvable while signed in as ADMIN; clients works on the admin view however"
  severity: major
  test: 2b
  cross_phase: "Phase 24 (admin dual-view toggle) x Phase 30 Plan 02 (Clients nav item) + Plan 03 (requireRelationshipHolder)"
  artifacts:
    - "src/components/ui/AppSidebar.tsx:98-107 (partnerNavItems includes Clients unconditionally)"
    - "src/components/ui/AppSidebar.tsx:158-160 (admin in partner view falls through to partnerNavItems)"
    - "src/lib/auth/require.ts (requireRelationshipHolder notFound()s on role==='admin', view-mode unaware)"
  missing:
    - "A view-aware nav filter: partnerNavItems() must omit Clients when isAdmin is true, since an admin holds no client relationships and their equivalent surface is Societes in admin view."
  resolution: fixed
  fix: |
    partnerNavItems() now takes isAdmin and omits the Clients entry when true
    (src/components/ui/AppSidebar.tsx). The gate was deliberately NOT relaxed:
    an admin holds no relationships, so /clients would be empty for them anyway.
    Two regression tests added to AppSidebar.test.tsx (admin in Agent view gets
    4 links and no /clients; a non-admin still gets 5 including /clients, keeping
    ROLE-02 covered). The pre-existing AC-RS-24-03 assertion of 5 links for an
    admin in Agent view was the assertion that encoded the bug; updated to 4.


## Enhancement Requests (not defects)

- id: EMPTY-STATE-30
  surface: "/clients (first-run partner/sales) and /{adminSegment}/companies"
  request: "Replace the flat zero-state copy with a warmer first-run message that invites the
    new sales partner to start building their pipeline, e.g. 'No companies listed yet. Let's get
    to it and build this Sales pipe together!'"
  current: "ClientsGrid.tsx renders EmptyDescription only ('Aucun client pour le moment.') with a
    CreateClientDialog CTA; CompaniesList.tsx renders a description with no CTA."
  source: "Antoine, during Phase 30 UAT"
  resolution: implemented
  decision: "Warm & collaborative on /clients; neutral variant on admin /Societes (no CTA — admins cannot create relationships)."
  fix: |
    FR/EN copy added as clients.empty.zero.title/.body and
    admin.companies.list.empty.zero + .zero.body (parity enforced by _EnHasAllFrKeys).
    ClientsGrid.tsx first-run state now renders EmptyHeader > EmptyMedia + EmptyTitle
    + EmptyDescription, keeping the CreateClientDialog CTA. CompaniesList.tsx gains a
    bolded title plus an explanatory line, no CTA. Copy assertions updated in
    ClientsGrid.test.tsx and CompaniesList.test.tsx.
  note: "Requires FR + EN copy — dictionary parity is compile-time enforced by _EnHasAllFrKeys."

## Bookkeeping Correction

2026-09-02: an earlier edit in this session marked tests 2, 9, 10 and 12 as `pass`
via an over-broad find-and-replace while recording the user's "ran them in a previous
session" note. The user confirmed the partner-side set (3-7, 11) plus test 8 (by
screenshot); tests 2, 9, 10 and 12 were never confirmed and are restored to pending.
The Summary counts were correct throughout — only the per-test fields were wrong.
Caught by the Phase 30 verifier.

## Notes

- **Plan 30-09 has no SUMMARY.** Its code is landed (`8d2f06b`, `e86aec4`) and its tests
  pass, but the plan is `autonomous: false` and parked at a blocking human-verify
  checkpoint. **Test 7 is that checkpoint.** Passing it is what lets Phase 30 close at 9/9.
- **Test 9 no longer expects a break (superseded 2026-09-06).** The `/proposals/[id]`
  admin 404 was a known, documented deferral through Phase 30. Phase 37's GAP-01/D-37-01
  closed it (commit `4a09292`) and test 9 was re-walked to confirm the real click-through
  instead — see the scenario above and the Phase 37 Closure Note below.
- Tests 5 and 11 are the security-critical pair. Phase 30's security audit rated CRM-02
  tenant isolation as phase-defining, and both inference channels (dedup wording,
  403-vs-404 divergence) were explicitly in the threat register.

## Phase 37 Closure Note (2026-09-06)

Scenarios 2, 9, 10 and 12 — the four left `pending` by the 2026-09-02 Bookkeeping
Correction above — were walked in Phase 37's single consolidated session per **D-37-04**,
after every code change in Phase 37 had landed (GAP-01's admin bypass, GAP-03's momentum
hygiene fixes). Scenario 9 walked the real admin click-through to a proposal detail page
rather than re-recording the documented dead end, per GAP-01/D-37-01.

As a direct answer to the Bookkeeping Correction's failure mode (an over-broad
find-and-replace that marked results `pass` without confirmation): each of the four results
above was transcribed **individually** from a distinct, dated observation — not a blanket
approval. The four `note:` fields are mutually distinct and each names concrete UI state
(sidebar item counts, an accessibility-tree dump, exact database/relationship names, exact
button labels) rather than a repeated phrase.

**Provenance, stated again for clarity:** these four walks were performed by **agent browser
automation (Claude in Chrome)**, at the operator's explicit direction, not by human
observation. This is recorded plainly so a future reader does not mistake this session for
the human-confirmed walks recorded elsewhere in this file (tests 3-8, 11, confirmed by
Antoine on 2026-09-02).

One new defect was found and fixed during scenario 9's walk (the admin PDF route not
carrying the same bypass as the page) — see scenario 9's `note:` and Phase 37 Plan 05's
SUMMARY (`37-05-SUMMARY.md`) for the full account, including the one unverified-in-browser
residual (the fixed PDF path was not re-walked after the fix, for lack of a second admin
session).

This closes **CLOSE-01**: `30-UAT.md` reaches `pending: 0` with each of scenarios 2, 9, 10
and 12 individually recorded.
