# Phase 18: Admin Surfaces (+ Aide / Help Center) - Context

**Gathered:** 2026-05-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Apply the Figma `9:46` design contract to all admin surfaces (Admin Home `41:46`, Partners list `42:46`, Créer partenaire `43:46`, Coefficients `45:46`) in both light and dark, while preserving the ADMIN-09 D-12 commission-invisibility envelope and the Phase 14 9-gate grep-contract suite.

**Scope expansion accepted by user during discussion:** Phase 18 also ships the full Aide (Help Center) surface for both partner and admin users — landing page `93:177` + a starter article `93:2773`-pattern. This is net-new beyond the original ROADMAP scope (ADMIN-10..14 + THEME-02). A new requirement should be filed as **HELP-01** in REQUIREMENTS.md during planning. The phase name in ROADMAP may need to be widened from "Admin Surfaces" to "Admin Surfaces + Help Center" or similar.

</domain>

<decisions>
## Implementation Decisions

### Admin Home (ADMIN-10) — stats card

- **D-01:** `Partenaires actifs` counts `users.role='partner' AND users.status='active'` cross-partner. The sublabel `sur N comptes` shows total non-deleted partner accounts (active + invited + inactive). The literal label `Actifs` excludes invited and deactivated.
- **D-02:** `Propositions ce mois` counts ALL non-deleted proposals (all statuses including drafts) created during the Europe/Paris current month, cross-partner. Reuses Phase 17's `getMonthlyProposalCount` helper from `src/lib/db/queries/proposal-aggregates.ts` but the admin variant drops the `userId` filter. New helper: `getMonthlyProposalCountAll()` (or equivalent).
- **D-03:** `Dernière modif. coeffs` reads the most recent row from `coefficient_history`. Display: relative time (`il y a 23j`) as the value + absolute date + author name (`12/04/2026 — Antoine R.`) as the sublabel.
- **D-04:** Stat tile value colors: **ALWAYS `--teal`**. `--gold` is reserved for warnings only (palette discipline). This is a **user-confirmed deviation from the Figma**, which renders `Dernière modif. coeffs` in gold. Planner must NOT use --gold for stat values.

### Admin Home (ADMIN-10) — Recent activity card

- **D-05:** Data source = **union of 3 SQL queries at request time**. No new audit table. Sources: `coefficient_history` rows + partner status changes (read from `users.updated_at` filtered by status transition; or from a status-history view if one exists — researcher to confirm) + invitations (`invitations` table or equivalent). Each source bounded to LIMIT 10, merged + sorted by timestamp descending, sliced to top 5.
- **D-06:** Recent activity card shows the **top 5 rows** + a `Voir tout →` link to the existing `/[adminSegment]/history` route. Known partial: `/history` currently shows coefficient-only events. Unifying the /history feed is **out of scope** for Phase 18; the link mismatch is accepted.
- **D-07:** Activity rows are **read-only** — no row-level links. Avatar + sentence + relative timestamp. No hover affordance.

### Partners list (ADMIN-11, ADMIN-12)

- **D-08:** `Dernière activité` column = `MAX(proposals.created_at) WHERE proposals.user_id = partner.id AND proposals.status != 'deleted'`. Falls back to `—` if the partner has zero proposals. No `last_session_at` reading from Better Auth in Phase 18.
- **D-09:** Filter pill row uses **4 tabs**: `Tous / Actifs / Invités / Désactivés`. **User-confirmed deviation from the Figma**, which shows 3 tabs (no Invités). Rationale: surfacing pending invitations matters for partner-onboarding workflows.
- **D-10:** Overflow menu (⋯) actions per row (all 4 enabled based on row status):
  - `Renvoyer l'invitation` (visible only when `status='invited'`)
  - `Désactiver le compte` (visible only when `status='active'`)
  - `Réactiver le compte` (visible only when `status='inactive'`)
  - `Voir les propositions du partenaire` (always visible)
- **D-11:** The `Voir les propositions du partenaire` action implies **net-new scope**: `/proposals` SSR must accept an admin `user_id` query parameter so admins can view another partner's list. Authorization gate: caller must have admin role. Planner: add this as a separate plan (or task within the partners plan).
- **D-12:** Cursor pagination on the partners table mirrors `/proposals` (Phase 17). Reuse the `PaginationKey` cursor primitive. ~20 rows per page.
- **D-13:** Partners table empty states:
  - Zero partners total: `Aucun partenaire pour le moment.` + inline `Inviter un partenaire` CTA (mirrors the hero CTA).
  - Filter-empty (zero matching): `Aucun partenaire ne correspond aux filtres.` + `Effacer les filtres →` link that resets all filters + search query.
- **D-14:** Rename **AccountsList.tsx → PartnersList.tsx** is FULL: file rename + component symbol rename + test file rename + all imports updated + leftover `Accounts` copy/strings/identifiers scrubbed. Acceptance: `grep -ri "Accounts" app/\(admin\)/ src/` returns 0 hits (excluding Better Auth library imports under `node_modules`).

### Créer partenaire (ADMIN-13)

- **D-15:** Action row sits **outside** the form card, in a separate card at the bottom of the page. Layout mirrors Phase 17 wizard step 2 (form card + action card). `Annuler` is left-aligned secondary, `Envoyer l'invitation →` is right-aligned primary teal.
- **D-16:** Field-level error state = **inline red text below the input + red border on the input field**. RHF + Zod resolver pattern (already in place). Server-action errors fall back to a toast notification (Phase 14 SaveConfirmModal-style toast pattern).
- **D-17:** Success affordance unchanged — `InviteUrlModal` opens with the copyable invite link (ADMIN-13 locked). No additional toast.
- **D-18:** `Annuler` button navigates back to `/[adminSegment]/partners`. If the form is dirty (RHF `formState.isDirty`), a confirm dialog asks "Vous avez des changements non enregistrés. Continuer ?" before navigating away.

### Coefficients (ADMIN-14)

- **D-19:** Warning banner sits **between the hero subtitle and the editor card**, full-width within the main content column (NOT inside the editor card). Token = `--gold` (palette stability honored). Copy locked from Figma: `Modifier ces valeurs change le calcul de toutes les futures propositions. Les PDF déjà générés restent inchangés.` EN equivalent to be drafted following D-21 Phase 17 verify-and-reuse discipline.
- **D-20:** Warning banner is **dismissable per-session** via `×` button. Dismissal persists in `sessionStorage` (key: `gsd.coefficients.warning.dismissed`). Reset on tab close → banner visible again on next visit. Rationale: users see the warning the first time per session but aren't nagged on every interaction.
- **D-21:** Existing `CoefficientHistorySidebar.tsx` is **refreshed in place** (NOT replaced). Restyle to match the Figma card chrome (tighter row design, no expand affordance). Preserves: 2-column layout, cursor pagination, `/history` link at the bottom. Removes: click-to-diff handler (rows are now read-only).
- **D-22:** Diff modal (`CoefficientDiffPanel`) stays on `/history` full page only. Tests that asserted the in-card diff opening behavior must be updated/removed.

### Help Center / Aide (HELP-01 — net-new requirement)

- **D-23:** Aide ships in Phase 18 (user-confirmed scope expansion). Both partner and admin sidebars include `Aide` item with target `/aide`.
- **D-24:** Content storage = **hardcoded TSX components per article** under `app/(authed)/aide/{slug}/page.tsx`. No markdown layer, no CMS. Article copy + structure live in the component itself. Translation handled via existing `t()` + dictionaries pattern. FR keys + EN parity per `_EnHasAllFrKeys` proof.
- **D-25:** Phase 18 ships a **3-card placeholder landing page** at `/aide`:
  - `Commencer ici` → links to `/aide/commencer-ici` (real article ships)
  - `Créer une proposition` → shows `Bientôt disponible` state (no link, muted card)
  - `Contact` → mailto link to a support address (e.g. `support@leasetic.fr` — confirm with user during planning)
- **D-26:** Starter article = `Commencer ici` — a quick-start guide walking through wizard step 1 → 2 → 3. ~500–1000 words FR + EN. Includes screenshots from the Phase 17 wizard surfaces (PageHero + form card + verification step). Planner agent drafts initial FR + EN content; user reviews/edits before execute.
- **D-27:** Sidebar nav order matches Figma: **Accueil / Nouvelle proposition / Propositions / Partenaires** (admin only) **/ Coefficients** (admin only) **/ Aide**. Partner sidebar omits Partenaires + Coefficients. Both sidebars include Aide. This deviates from the current admin sidebar (`Accueil / Partenaires / Coefficients / Historique`) — `Historique` is removed from the sidebar and accessed via the Admin Home AdminNavCard + Recent activity `Voir tout` link only.
- **D-28:** Article route lives under `app/(authed)/aide/` (BOTH partner + admin can read it). Admin-only / partner-only gating happens at the data layer, not the route — Aide articles are read-only marketing copy.

### THEME-02 (light + dark coverage)

- **D-29:** Admin surfaces inherit light + dark via the `html[data-theme="dark"]` token cascade established in Phase 16. **No painted dark-mode Figma frames exist for admin surfaces** (unlike partner side which had `82:*` duplicates). Dark variants are derived from light via tokens. The phase 8 closing-out verification (similar to 17-08 pattern) must include manual visual sign-off on each of the 6 surfaces (Admin Home, Partners list, Créer partenaire, Coefficients, Aide landing, Aide article) × 2 modes (light + dark) = 12 verification checkpoints.
- **D-30:** Palette stability invariant (Phase 16 D-04) holds: no new color tokens are introduced. Existing tokens (`--paper`, `--surface`, `--ink`, `--muted`, `--gd`, `--teal`, `--gold`, `--border`) must cover all visual needs. If a Figma color cannot be matched without a new token, surface as a deviation request to the user during planning.

### Claude's Discretion

- **i18n key naming** for net-new admin keys (e.g. `admin.home.stats.partenairesActifs`, `admin.partners.filter.actifs`, `admin.coefficients.warning.body`, `aide.landing.title`, `aide.commencer-ici.title`). Planner picks the namespace following the Phase 17 D-21 verify-and-reuse discipline.
- **Stat tile component**: reuse existing `MetricTile.tsx` (Phase 11 COMP-03) or create an admin-specific `AdminStatTile.tsx` variant. Planner decides based on prop-shape fit after reading both designs.
- **Recent activity row component**: name + JSX shape (`RecentActivityRow`, `ActivityFeedItem`, etc.) and avatar source (initials-based vs `gravatar` vs literal `<img>` from user profile). Planner picks.
- **Aide article internal structure**: heading hierarchy, image embed format (Next `<Image>` sizing), CTA placement. Planner drafts; user reviews.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope + requirements
- `.planning/ROADMAP.md` §"Phase 18: Admin Surfaces" — phase scope, success criteria, requirement IDs
- `.planning/REQUIREMENTS.md` — ADMIN-10, ADMIN-11, ADMIN-12, ADMIN-13, ADMIN-14, THEME-02 full text. Add HELP-01 row during planning.
- `.planning/MILESTONES.md` §v1.3 — milestone goals + dependencies

### Figma design contracts
- Figma file: `vwOzirhL0vyxDWq4m6t4gC` (LEASETIC — Outil interne — Proposition Leasing)
- Frame `41:46` — Admin Home v1.3 sketch (light only; dark derived via token cascade)
- Frame `42:46` — Liste partenaires v1.3 sketch (light only)
- Frame `43:46` — Créer partenaire v1.3 sketch (light only)
- Frame `45:46` — Coefficients v1.3 sketch (light only)
- Frame `93:177` — Aide / Centre d'Aide landing (partner sidebar shown; generic template — Leasétic content TBD)
- Frame `93:2773` — Aide article template "Getting started" (lorem ipsum + Dashly X placeholder — Leasétic content TBD)

Screenshots downloaded during discussion: `/tmp/figma-phase18/{admin-home,partners-list,creer-partenaire,coefficients,aide,aide-subpage}.png` (ephemeral; re-fetch via `mcp__0c362372-5270-457f-b11b-4797e40bf045__get_screenshot` if needed during planning).

### Carry-forward decisions from prior phases
- `.planning/phases/16-shell-refresh-contrast-gates/16-CONTEXT.md` — palette stability invariant, light/dark token cascade, contrast measurement methodology (CONTRAST-02)
- `.planning/phases/17-partner-surfaces/17-CONTEXT.md` — D-21 i18n verify-and-reuse + `_EnHasAllFrKeys` parity proof, PageHero adoption pattern, FilterPillRow pattern (this phase extends to 4 tabs)
- `.planning/phases/17-partner-surfaces/17-03-SUMMARY.md` — `proposal-aggregates.ts` helpers (cross-partner variants needed here)
- `.planning/phases/17-partner-surfaces/17-04-SUMMARY.md` — cursor pagination + FilterPillRow + empty-state copy pattern (reused for Partners table)
- `.planning/phases/14-*/14-CONTEXT.md` — AdminNavCards spec, CoefficientHistorySidebar + CoefficientDiffPanel spec, StatusChip variants (incl. `invited` gold)

### Code references
- `tests/admin-09-grep-contracts.test.ts` — 9-gate suite. MUST stay green. Add new gates if admin surfaces introduce commission-adjacent fields (none expected, but verify).
- `app/(admin)/[adminSegment]/page.tsx` — current Admin Home (Phase 14, 3 AdminNavCards)
- `app/(admin)/[adminSegment]/partners/AccountsList.tsx` — target of D-14 rename
- `app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx` — target of D-15/16/18 visual refresh
- `app/(admin)/[adminSegment]/coefficients/CoefficientHistorySidebar.tsx` — target of D-21 in-place refresh
- `src/lib/db/queries/proposal-aggregates.ts` — Phase 17 helpers; admin variants extend this

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **PageHero** (Phase 16): adopted by all 4 admin pages + 2 Aide pages
- **MetricTile** (Phase 11 COMP-03): candidate for admin stat tiles; planner to confirm prop-fit vs new `AdminStatTile`
- **AdminNavCard** (Phase 14): already used on current Admin Home; new design preserves the 3-card layout
- **StatusChip** (Phase 11/14, 5 variants including `invited` gold): row status in Partners table
- **FilterPillRow** (Phase 17 17-04): pattern extends to 4 tabs for Partners filter; component may be parameterized or duplicated
- **CoefficientHistorySidebar** (Phase 14): in-place refresh per D-21
- **CoefficientDiffPanel** (Phase 14): stays on /history route only per D-22
- **PaginationKey cursor primitive** (Phase 17): reused for Partners table per D-12
- **CreatePartnerForm + adminCreateInvitation server action + InviteUrlModal** (Phase 14): behavior unchanged per ADMIN-13; only visual repaint
- **proposal-aggregates.ts helpers** (Phase 17): admin variants drop `userId` filter for cross-partner counts
- **dictionaries.ts + `t()` + `_EnHasAllFrKeys` proof** (Phase 6 + Phase 17 D-21): i18n discipline carried forward

### Established Patterns

- **Verify-and-reuse i18n discipline** (Phase 17 D-21): before adding a new key, check if existing key works. No duplicates. EN parity enforced by `_EnHasAllFrKeys` compile-time proof.
- **Palette stability invariant** (Phase 16 D-04): no new color tokens unless explicitly approved. All colors via `var(--token)` references.
- **Light/dark token cascade** (Phase 16): `html[data-theme="dark"]` overrides; no per-component dark CSS files.
- **ADMIN-09 D-12 envelope + 9-gate grep contract** (Phase 13 + 14): admin surfaces stay commission-free. 9-gate suite enforces no commission leakage on every PR.
- **Form card + action card separation** (Phase 17 wizard): action row lives outside the form card. D-15 applies same pattern to /partners/new.
- **Cursor pagination** (Phase 17 17-04 + 17-01 archived filter): `PaginationKey` + `buildListResponse({ limit, cursor })`. D-12 reuses.
- **Empty-state copy convention** (Phase 17 17-04): first-run friendly + filter-empty informative + clear-filters link. D-13 follows.
- **Defensive bail pattern** (Phase 17 17-07): server pages redirect on missing prerequisites before rendering. Apply to /aide article if a draft/data prerequisite ever applies (likely not for read-only Aide).

### Integration Points

- **Admin Home**: replaces current `app/(admin)/[adminSegment]/page.tsx`. New queries land in `src/lib/db/queries/proposal-aggregates.ts` (extends Phase 17 module) and possibly new `partner-aggregates.ts`. Recent activity = new query helper.
- **Partners list**: rewrites `AccountsList.tsx` → `PartnersList.tsx` with full styled table. Filter component = new `PartnersFilterPillRow` (or parameterize FilterPillRow). Overflow menu = new `PartnerRowActions` component.
- **Créer partenaire**: refactors `CreatePartnerForm.tsx` for action row separation (D-15) + error state (D-16) + dirty-form confirm (D-18). Behavior unchanged (ADMIN-13).
- **Coefficients**: adds `CoefficientWarningBanner.tsx` (new component, sessionStorage dismissal). Modifies `CoefficientHistorySidebar.tsx` per D-21/22 (remove click-to-diff). Editor card untouched structurally.
- **Aide**: net-new routes — `app/(authed)/aide/page.tsx` (landing, 3-card grid), `app/(authed)/aide/commencer-ici/page.tsx` (article, hardcoded TSX). Sidebar nav updated to include `Aide` item for both partner + admin role variants.
- **Sidebar nav**: extend the existing sidebar nav config (likely `src/components/ui/SidebarNav.tsx` or equivalent) to support per-role item sets. Admin sees `Accueil / Nouvelle proposition / Propositions / Partenaires / Coefficients / Aide`. Partner sees `Accueil / Nouvelle proposition / Propositions / Aide`.
- **`/proposals` SSR admin scoping** (D-11): extend `app/(authed)/proposals/page.tsx` to accept an optional `user_id` query param. Gate by admin role. Reuses Phase 17's `buildListResponse` with an additional `userId` override path.

</code_context>

<specifics>
## Specific Ideas

- **Sidebar deviation from Figma "3 filter tabs"**: D-09 adds a 4th `Invités` tab. User-confirmed deviation. Planner: bake this into the FilterPillRow extension explicitly.
- **Stat tile color always-teal**: D-04 deviates from Figma's gold for `Dernière modif. coeffs`. User-confirmed. Planner: document in the plan's deviations section.
- **Figma placeholder content in Aide frames** (`93:177` + `93:2773`): both frames use generic template content (Dashly X, John Carter, lorem ipsum, generic categories like "Applications de bureau et mobiles"). User-confirmed that real Leasétic content is needed; planner drafts FR + EN for the `Commencer ici` starter article.
- **Figma typos in admin frames**: `Acceuil` (should be `Accueil`) in the Admin Home topbar (`41:46`); `Coéfficients` with acute accent (should be `Coefficients` per standard French + the route /coefficients) in the Coefficients topbar (`45:46`). Treat as Figma typos; ship with the correct spelling.
- **Recent activity sidebar mismatch**: D-06 acknowledges that `Voir tout → /history` lands on a coefficient-only feed. Accepted as a known partial. Defer the unified /history feed to a later phase.

</specifics>

<deferred>
## Deferred Ideas

- **Unified `/history` audit feed** (cross-source: coefficients + partner status + invitations + future events). Currently coefficient-only. Surfaces in the Admin Home `Voir tout` link mismatch — accepted partial. Candidate for Phase 19+ or a dedicated admin tooling phase.
- **`admin_activity` audit table** (rejected for Phase 18 per D-05). Real audit log infrastructure is a separate concern; if event volume grows, revisit.
- **Aide article expansion** beyond `Commencer ici` (article #1). D-25 ships landing + 1 article. HELP-02 should add the remaining articles (`Créer une proposition`, `Contact` real page if mailto isn't enough, plus any deeper how-tos).
- **Aide content storage strategy**: D-24 hardcodes TSX for Phase 18. When article count exceeds ~5–10, revisit (Markdown via MDX, CMS, etc.). HELP-02 or HELP-03 decision.
- **Partners table `last_session_at` enrichment**: D-08 uses last-proposal-created. If you later want true login-activity tracking, requires Better Auth sessions read + new query. Out of scope here.
- **`/proposals` admin scoping deeper UX** (e.g. filter chip showing "Filtre admin: Marie Durand", clear-filter affordance, distinct visual treatment when admin is viewing another partner's data). D-11 ships the query-param mechanic; richer UX in a follow-up.
- **Sidebar `Aide` icon style** if Phase 18 chooses a placeholder icon; design refinement deferred.
- **Help Center search box** on the Aide landing page (the Figma doesn't show one). Surface in HELP-02 if real article count grows.
- **Dark-mode Figma frames for admin surfaces**: not in the file. Dark is derived via token cascade. If visual issues surface in 18-08 verification, request painted Figma frames in a follow-up design pass.

</deferred>

---

*Phase: 18-admin-surfaces*
*Context gathered: 2026-05-24*
