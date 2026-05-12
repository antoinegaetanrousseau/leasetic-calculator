# Requirements: Leasétic — Matrice Commerciale (v1.2)

**Milestone:** v1.2 — UX Polish + Proposal Wizard
**Defined:** 2026-05-11
**Core Value:** A partner fills client info + amount + duration and gets a pixel-correct PDF proposal — through a polished, brand-aligned UI with a guided 3-step flow and persistent draft state.

**Design contract:** Figma file [`vwOzirhL0vyxDWq4m6t4gC`](https://www.figma.com/design/vwOzirhL0vyxDWq4m6t4gC/) — 9 sketched pages + 23 brand variables + 13 text styles + 2 effect styles. Full design system + chrome fill rules archived in `.planning/milestones/v1.2-CONTEXT.md`.

---

## v1.2 Requirements

Requirements for milestone v1.2. Each maps to one or more roadmap phases.

### Database / schema

- [ ] **DB-01**: System extends the `proposals.status` enum from `active | expired | deleted` to `draft | active | expired | deleted`. A new proposal starts in `draft` until the partner completes the 3-step wizard and confirms save. Drafts are only visible to their creator.
- [ ] **DB-02**: System extends partner account status to include `invited` (alongside the existing actif/désactivé states). An `invited` account exists in the DB and has been emailed a one-time-URL invitation but has never logged in. Surfaces as a distinct chip in the admin Liste des partenaires.
- [ ] **DB-03**: System persists every coefficient change to a `coefficient_history` table — columns: `id`, `changed_at`, `changed_by_user_id` (FK to `users`), `before_json` (jsonb snapshot of prior `global_params`), `after_json`, `summary` (short human label). Rows are append-only; no UPDATE/DELETE allowed at the DB layer.

### Routing

- [ ] **ROUTE-01**: System splits `/proposals/new` into a 3-step wizard at three new routes: `/proposals/new/parametres`, `/proposals/new/calcul`, `/proposals/new/verification`. State persists between steps via the `draft` proposal row (DB-01). A stepper widget at the top of each step shows current/done/pending state; partners can click back to any *completed* step but cannot jump ahead.
- [ ] **ROUTE-02**: System exposes a dedicated route `/[adminSegment]/partners/new` that replaces v1.1's modal-based partner creation. Form contains three sections — personal info (prénom, nom, email), company info (société, SIRET optionnel, téléphone), and a customizable invitation message. Submitting issues the same one-time-URL invitation as v1.1.

### Reusable components

- [ ] **COMP-01**: Codebase exports a `Stepper` component used on all 3 wizard routes. Props: `currentStep: 1 | 2 | 3`, `completedSteps: number[]`. Each step renders one of three visual states — `active` (green-filled circle with number), `pending` (outlined circle with muted number), `done` (green-filled circle with white check). Completed steps are clickable links; pending steps are not interactive.
- [ ] **COMP-02**: Codebase exports a `RetractableSidebar` component used in `(authed)` and `(admin)` layouts. Two width states: expanded (260px) and collapsed (72px). Toggle is a chevron button in the brand-row. Collapsed shows logo + icon-only nav; expanded shows logo + wordmark + labeled nav + language toggle + theme toggle at bottom. User preference persists in `localStorage` under a stable key.
- [ ] **COMP-03**: Codebase exports a `MetricTile` component used 3× on the partner home. Pattern: uppercase muted label (`.ctitle` style), large brand-colored value, muted sublabel. Color-coded variants: green/gd (`Ce mois-ci`), navy (`Total`), gold (`Brouillons`). Powered by aggregate SQL queries over the partner's proposals.
- [ ] **COMP-04**: Codebase exports an `AdminNavCard` component used 3× on the admin home. Pattern: 48px icon square (10% accent-color background), title (`heading/sub`), description paragraph, "Ouvrir →" link. Navigates to Coefficients, Partenaires, Historique.
- [ ] **COMP-05**: Codebase exports `StatusChip` variants for proposal and partner statuses — `active` (green tint), `draft / brouillon` (gold tint), `expired / expirée` (gray-muted tint), `disabled / désactivé` (red-danger tint). Extends the existing `.chip-*` classes in `app/globals.css`. Used in: proposal list rows, partner table rows.

### Brand assets

- [ ] **ASSET-01**: Codebase serves the official Leasétic logo SVG from `public/logo-light.svg`. Mark color is `#6DC388` (new `--brand-mark` CSS custom property), wordmark is `#112C3B` (existing `--navy`). Used in: `(authed)` and `(admin)` sidebar brand-row, and the centered logo on all `(public)` routes.
- [ ] **ASSET-02**: Codebase serves a dark-mode variant of the Leasétic logo at `public/logo-dark.svg`. Same mark color (`#6DC388`) but wordmark uses light ink (`--ink` in dark mode = `#e6e9ef`). The active asset is selected by `next/image` source set or a CSS picker keyed on `data-theme`.

### Public surfaces

- [ ] **PUB-01**: Login page (`/login`) replaces its v1.1 plain-text "Leasétic" header with the official lockup SVG (ASSET-01) centered above the existing form card. Body background switches to `--paper`; the form card stays `--surface`. Form field structure is unchanged from v1.1 — only the visual frame is updated. Language and theme toggles remain in the top-right (different from authed/admin where they moved to the sidebar).
- [ ] **PUB-02**: Invitation landing (`/invite/[token]`) and password reset (`/reset/[token]`) inherit the same `(public)` shell pattern as PUB-01 — centered logo above a centered card, paper background, top-right language/theme toggles. No form changes — purely visual alignment.

---

## Deferred to v1.3+

Items considered for v1.2 and explicitly deferred. Tracked but not in current roadmap.

| Future requirement | Reason for deferral |
|---|---|
| OVH production deployment + smoke execution | September 2026 target; capability shipped in v1.1, scheduled work item |
| Mobile-optimized layout | Out of scope per PROJECT.md desktop-primary constraint |
| Excel export of proposal portfolio | Not core to v1.2 polish + wizard goal |
| Webhook notifications | Out of scope |
| Automated browser tests (Playwright) | Manual checklists continue; v1.2 stays Vitest-only |
| Multi-language beyond FR + EN | Out of scope |
| SMTP-driven self-service password reset | Admin-mediated continues per v1.1 decision |
| Sentry / APM observability | Vercel logs continue as production observability |

---

## Out of Scope

Explicitly excluded for v1.2. Documented to prevent scope creep mid-execution.

| Feature | Reason |
|---|---|
| Mutating already-saved PDFs | Existing PDF immutability invariant from v1.1; future coefficient changes apply only to new proposals |
| Changing the calculation formula or tranche boundaries | Frozen — partner expectations + business rules. Any change requires explicit business approval |
| Removing the "commission invisible" rule | Non-negotiable business rule; v1.1 closed 97 STRIDE threats around this |
| Heading color change to webflow's near-black | Considered during design session; kept `--ink: #41423d` for internal-tool comfort (see v1.2-CONTEXT.md) |
| Brand-mark color migration of existing `--green` / `--gd` tokens | New `--brand-mark` token is additive; existing tokens preserved |

---

## Traceability

Which phase covers which requirement. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DB-01 | Phase 12 | Pending |
| DB-02 | Phase 12 | Pending |
| DB-03 | Phase 12 | Pending |
| ROUTE-01 | Phase 13 | In Progress (server actions + finalize API shipped by 13-02; route pages ship in Wave 2 plans 13-03/04/05) |
| ROUTE-02 | Phase 14 | Pending |
| COMP-01 | Phase 11 | Pending |
| COMP-02 | Phase 11 | Pending |
| COMP-03 | Phase 11 | Pending |
| COMP-04 | Phase 11 | Pending |
| COMP-05 | Phase 11 | Pending |
| ASSET-01 | Phase 11 | Pending |
| ASSET-02 | Phase 11 | Pending |
| PUB-01 | Phase 15 | Pending |
| PUB-02 | Phase 15 | Pending |

**Coverage:**
- v1.2 requirements: 14 total
- Mapped to phases: 14 ✅
- Unmapped: 0

**Per-phase counts:**
- Phase 11 (Design System Foundation + Brand Assets): 7 requirements (COMP-01..05, ASSET-01, ASSET-02)
- Phase 12 (Schema Extensions): 3 requirements (DB-01, DB-02, DB-03)
- Phase 13 (3-Step Proposal Wizard): 1 requirement (ROUTE-01)
- Phase 14 (Admin Polish): 1 requirement (ROUTE-02)
- Phase 15 (Public Surface Brand Polish): 2 requirements (PUB-01, PUB-02)

---

*Requirements defined: 2026-05-11*
*Source: `.planning/milestones/v1.2-CONTEXT.md` (Figma design session)*
*Last updated: 2026-05-11 — Traceability populated by `/gsd-new-milestone` roadmapper (Phases 11-15).*
