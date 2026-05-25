# Requirements: Matrice Commerciale v1.3 — Design Refresh + Partner-Onboarding Ready

**Defined:** 2026-05-21
**Milestone:** v1.3
**Core value (unchanged since v1.0):** A partner fills client info + amount + duration and gets a pixel-correct PDF proposal with the v9 calculation formula intact — now via a hosted multi-page Next.js web app with persistent per-partner PDFs (v1.1 evolution) and a 3-step wizard with server-side draft persistence (v1.2 evolution).

**Source of truth:** Figma design contract `vwOzirhL0vyxDWq4m6t4gC` section `9:46` ("v1.3 — Redesign sketches", 13 screens) + `.planning/v1.3-CARRYFORWARD.md` (5-tier inventory generated at v1.2 close) + this milestone's scope conversation (2026-05-21).

---

## v1.3 Requirements

### Shell + Design System (SHELL)

- [x] **SHELL-01**: User sees a refreshed sidebar shell with brand row + collapse toggle, matching Figma `23:46` collapsed (72px) and expanded (260px) variants. Persists user's collapse preference (existing localStorage key from v1.2 COMP-02 reused).
- [x] **SHELL-02**: User can toggle theme between **Light / System / Dark** via a tri-state control in the sidebar footer. "System" respects `prefers-color-scheme` and updates live when the OS theme changes. Replaces the v1.1/v1.2 binary cookie toggle.
- [x] **SHELL-03**: Every authed page renders the hero pattern: `Bonjour, {prénom} 👋` greeting (or admin equivalent) + page subtitle + page-level CTA top-right.
- [x] **SHELL-04**: FR/EN locale toggle relocates from topbar to sidebar footer (alongside the theme toggle). Keyboard-navigable.
- [x] **SHELL-05**: Topbar (page title + user menu) and Footer (`© 2026 Leasétic — Application interne · Mentions légales`) ship the visual treatment shown across Figma `9:46` frames.

### Light + Dark mode coverage (THEME)

- [x] **THEME-01**: Every v1.3 partner-side screen (Partner Home, Partner Proposals, Wizard steps 1/2/3) ships both light and dark variants matching Figma's `82:*` duplicate frames (`82:1088`, `82:171`, `82:317`, `82:460`).
- [x] **THEME-02**: Every v1.3 admin-side screen (Admin Home, Partners list, Créer partenaire, Coefficients refresh) ships both light and dark variants.

### Contrast measurement (CONTRAST)

- [x] **CONTRAST-01**: Diff-panel changed-row composite (`rgba(224,133,48,0.10)` over `--surface` with `--ink` weight 600) measured at WCAG 2.1 AA (≥4.5:1) in both light and dark, signed off before any v1.3 wave touching `--gold` / `.chip-invited` / diff-panel merges. Resolves Phase 14 deferred Tier-2 carry-forward.
- [x] **CONTRAST-02**: Any new v1.3 surface introducing a foreground-on-background pair using `--gold`, `--teal`, or hero pill chips validated against WCAG 2.1 AA in light + dark before merge.

### Partner Home (PHOME)

- [x] **PHOME-01**: Partner Home `/` renders the hero greeting (`Bonjour, {prénom} 👋`) + 3 MetricTile consumers (Ce mois-ci / Total / Brouillons) + Propositions récentes card per Figma `9:47`. Consumes the existing v1.2 `<MetricTile>` primitive (COMP-03 shipped, consumer deferred).
- [x] **PHOME-02**: MetricTile values are scoped to the requesting partner (`user_id` filter), computed over Europe/Paris calendar month for "Ce mois-ci", all-time for "Total", and `status = 'draft'` for "Brouillons". Display-only — tiles are not clickable in v1.3.
- [x] **PHOME-03**: Propositions récentes card shows the partner's 5 most recent proposals (any status except deleted), with a `Voir toutes →` link to `/proposals`. Each row uses `<StatusChip>` for status display.

### Partner Proposals + Archives (PROPS)

- [x] **PROPS-01**: Partner Proposals `/proposals` lists active proposals in a styled table card with cursor-based pagination, ILIKE search bar, and filter-pill row. Refreshes v1.1's PROP list view to the Figma table treatment.
- [x] **PROPS-02**: An `Archivées` filter pill on `/proposals` toggles the list between active and archived proposals (soft-deleted within the 30-day window + expired proposals owned by the partner) — **in-page**, NO separate `/archives` route. Each row keeps its `<StatusChip>` showing the true status (`expired`, `deleted`).

### Wizard redesign (WIZ)

- [x] **WIZ-01**: Wizard step 1 (Paramètres du projet) ships the Figma `35:46` visual: hero + ÉTAPE 1 SUR 3 eyebrow + stepper + form card with `● INFORMATIONS CLIENT` and `● DÉTAILS DU PROJET` section labels + segmented duration pill (24/36/48 mois) + WizardActionBar (Enregistrer comme brouillon / Continuer vers le calcul).
- [x] **WIZ-02**: Wizard step 2 (Résultat du calcul) ships the Figma `39:46` visual: hero loyer-mensuel card (`2 770 €` in `--teal`) + `Tranche XK€ • Coefficient X.XX%` pill chip + Détail du calcul card with explicit `Commission apporteur (non visible client)` annotated row + Paramètres saisis recap card with `← Modifier` link. Preserves Phase 13 D-12 partner-facing commission relaxation; ADMIN-09 envelope unchanged.
- [x] **WIZ-03**: Wizard step 3 (Vérifier la proposition) ships the Figma `40:46` 2-column 1040px layout: left = CLIENT / PROJET / CALCUL review cards via existing `<RecapSection>` primitive (v1.2 Phase 13); right = `<PdfPreviewMock>` card showing `Leasétic` logo + `Proposition de financement` + `Réf. LC-XXXX-XXX • {N} jours de validité` + loyer mensuel.
- [x] **WIZ-04**: `proposals.validity_days` selector (15j / 30j / 60j) relocates from its current placement to wizard step 3, inside the CALCUL review card. Implies a default value at draft creation (e.g. 30) with step-3 mutation. Migration / schema impact to be confirmed during planning.
- [x] **WIZ-05**: Phase 13 ADMIN-09 D-12 envelope (deal-owner partner sees commission on wizard steps 2 + 3 only) + Phase 14 9-gate grep-contract suite (`tests/admin-09-grep-contracts.test.ts`) remain green throughout v1.3. No further relaxations.
- [x] **WIZ-06**: PDF reference (LC-XXXX-XXX format) is reserved at draft creation (step 1 finalize) and visible in the step-3 `<PdfPreviewMock>` header before the finalize button is clicked. Reference becomes the canonical identifier on the persisted PDF.

### Admin surfaces refresh (ADMIN)

- [x] **ADMIN-10**: Admin Home (`/[adminSegment]`) gains the Figma `41:46` enhancement: hero (`Bonjour, {prénom} 👋` with ADMIN badge) + `Nouvelle proposition` CTA + 3 admin stats row (Propositions ce mois / Partenaires actifs / Dernière modif. coeffs) + 3 AdminNavCards (Coefficients / Partenaires / Historique) + Recent activity card. Extends v1.2 Phase 14's 3-AdminNavCard layout.
- [x] **ADMIN-11**: Admin Partners list `/[adminSegment]/partners` ships the Figma `42:46` styled table: hero row + `Inviter partenaire` CTA + filter/search controls row + table card with partner rows. Replaces the v1.1/v1.2 6-column AccountsList visual treatment.
- [x] **ADMIN-12**: Partner list component file renames from `AccountsList.tsx` → `PartnersList.tsx` (Phase 14 closeout cleanup — directory was renamed in Phase 14-01, file name was kept). All imports updated.
- [x] **ADMIN-13**: Admin Créer partenaire `/[adminSegment]/partners/new` form card visual refresh per Figma `43:46`. Behavior unchanged from v1.2 Phase 14-02 (3-section RHF form + adminCreateInvitation server action + InviteUrlModal).
- [x] **ADMIN-14**: Admin Coefficients page (`/[adminSegment]/coefficients`) gains the Figma `45:46` warning banner (orange, `--gold` token) + inline history card refresh, on top of v1.2 Phase 14's 2-column history sidebar. Warning banner copy clarifies that coefficient edits create new history rows and do not retroactively change existing PDF proposals (`params_snapshot` invariant).

### Help Center / Aide (HELP)

- [x] **HELP-01**: Help Center / Aide ships a `/aide` landing page (3-card placeholder grid: Commencer ici / Créer une proposition / Contact) plus a `/aide/commencer-ici` starter article (hardcoded TSX, ~500-1000 words FR + EN, walks through wizard step 1→2→3 with Phase 17 screenshots). Sidebar navigation includes `Aide` for both partner and admin users. Light + dark via Phase 16 token cascade. Net-new requirement filed during Phase 18 planning (scope expansion confirmed during `/gsd-discuss-phase`).

### Excel export (EXPORT)

- [x] **EXPORT-01**: Partner can export their proposals as `.xlsx` from `/proposals` via an export CTA. Export includes all visible proposals (respecting the current filter — Active vs. Archivées). Columns: Référence, Client, Projet, Montant HT, Durée, Loyer mensuel, Coefficient, Statut, Date de création, Date d'expiration.
- [x] **EXPORT-02**: XLSX export is generated server-side (Vercel Functions) and respects ADMIN-09: no commission column, no commission cell content. Validated by extending the Phase 14 9-gate grep-contract suite with an XLSX-byte-inspection gate (no `Commission` substring, no `commission_pct` substring in any sheet).

### Centralized LC reference dashboard (LCDASH)

- [x] **LCDASH-01**: Admin can view a centralized cross-partner LC reference dashboard at `/[adminSegment]/lc-references`. Lists every issued LC reference across all partners with: reference, partner name, client name, project amount, status, created_at. Cursor-paginated + searchable by reference or partner name.
- [x] **LCDASH-02**: LC dashboard extends the ADMIN-09 9-gate grep-contract suite to 10+ gates (zero commission leakage on the new admin surface). Test cases include: list view rows, detail view (if any), search results.

### Infra hardening (INFRA)

- [ ] **INFRA-01**: Neon 3-branch split with `DATABASE_URL` per-Vercel-scope routing: production scope → `main` Neon branch, preview scope → `preview` Neon branch, development scope → `development` Neon branch. Resolves v1.1 BOOT-03 partial (all 3 Vercel scopes currently route to `main` pooled endpoint).
- [ ] **INFRA-02**: GitHub Actions CI gains a post-deploy DB-smoke step that runs against a Neon ephemeral branch on every PR touching `drizzle/migrations/*.sql` or `drizzle/meta/_journal.json`. Closes the recurring "generator self-evaluation blind spot" class that bit v1.1 (correlated-subquery SQL bug) and v1.2 Phase 12 (missing `_journal.json` entry → 24h prod un-applied).
- [ ] **INFRA-03**: Better Auth `trustedOrigins` hardening via middleware-level Origin gate on `/api/auth/sign-in/*` mutations. Hard-blocks based on Origin header (in addition to the existing SameSite=Lax + `__Secure-` cookies CSRF defense). Resolves Phase 6 follow-up #2.

### Partner-onboarding gates — LAST PHASE before partner cutover (GATE)

- [ ] **GATE-01**: Both admins (`antoine.rousseau@memento.eco` + 2nd admin email) rotate from the shared `leasetic2026` password to individual strong passwords via the admin↔admin password-reset flow at `/[adminSegment]/partners`. Resolves Phase 6 follow-up #1. MUST close before any real partner is invited.
- [ ] **GATE-02**: Privacy policy confirmation obtained from Thomas Heufke covering (a) Vercel/Neon EU hosting + (b) 10-year PDF retention. Stub `docs/legal/privacy-coverage-confirmation.md` (committed in v1.1) updated with Thomas's confirmation. Resolves DATA-11 legal counsel sign-off deferral. MUST close before any real partner is invited.

---

## Future Requirements (v1.4+)

Deferred to future milestones. Tracked but not in current roadmap. Most carried forward from `v1.3-CARRYFORWARD.md` Tier 5 not pulled into v1.3.

### Operations + scaling

- **OVH-01**: OVH production deployment + smoke-deploy execution (September 2026 target; capability shipped in v1.1)
- **OBS-01**: Sentry / APM observability beyond Vercel logs
- **AUDIT-01**: Generic audit-log viewer beyond coefficient history

### Partner-side polish

- **WIZ-FUT-01**: Wizard step-1 sticky-footer action bar (currently scrolls with content)
- **WIZ-FUT-02**: `beforeunload` warning on `/partners/new` and wizard step 1 (currently no warn)
- **WIZ-FUT-03**: Per-step browser tab titles in wizard (currently single `Nouvelle proposition` title)
- **WIZ-FUT-04**: Inline `Loyer estimé` chip on wizard step 1 (compact preview chip near Montant HT / Durée inputs)
- **WIZ-FUT-05**: Field-level git-style colored diffs on coefficient changes (Phase 14 ships structured table; per-character diffs deferred)

### Admin-side polish

- **ADMIN-FUT-01**: Admin cross-partner proposal read view
- **ADMIN-FUT-02**: Phase 11 sidebar adminHrefs config-driven refactor (currently hard-codes 4 admin hrefs in Shell.tsx)

### New capabilities

- **NOTIF-01**: Webhook notifications to Leasétic on each proposal generation
- **AUTH-FUT-01**: SMTP-driven self-service password reset (currently admin-mediated only)
- **TEST-FUT-01**: Playwright automated browser tests (currently Vitest-only at 876 tests + manual smoke runbooks)
- **MOBILE-01**: Mobile-optimized layout (currently desktop-primary)
- **I18N-FUT-01**: Multi-language beyond FR + EN (currently 263 keys × 2)

### Cleanup

- **REDIR-01**: `/accounts` → `/partners` 308 redirect sunset (warm-cache window ≥1 milestone is met after v1.3 ships)

---

## Out of Scope

Explicitly excluded from v1.3. Documented to prevent scope creep.

| Feature / change | Reason |
|---|---|
| Token-level color refresh (changing `--gold` / `--navy` / `--ink` / `--paper`) | Figma `color/*` variables match `app/globals.css` exactly (verified 2026-05-21 via `get_variable_defs` on node `9:46`). The "color refresh" carry-forward item reduces to layout + hierarchy refresh — no token churn. |
| Separate `/archives` route | Per scope conversation: archives surface as a filter pill on `/proposals`, in-page. No new route. |
| ADMIN-09 further relaxations beyond Phase 13 D-12 | The deal-owner partner-facing commission relaxation on wizard steps 2 + 3 (D-12) is the final allowed exception. Phase 14 9-gate grep-contract suite remains the mechanical enforcement. |
| Mutating `params_snapshot` of already-shipped PDFs | v1.1 PDF immutability invariant continues. Coefficient edits create new history rows, never alter existing PDFs. |
| Removing or rewriting the v10 calculation formula | Frozen per business rule. `loyer = montantHT × (1 + commission/100) × coefficient / 100`. |
| Mobile layout work | Continues to be desktop-primary. Mobile is a v1.4+ candidate. |
| MetricTile click-through navigation | Per Tier-3 carry-forward locked decision: MetricTiles are display-only in v1.3. Clickable variants are v1.4+ if a real need emerges. |
| FIFO auto-closure of intercompany debts | Not applicable (intercompany is a separate project — memento-hub). |
| OVH production deployment execution | Scheduled for September 2026 (Tier 4 carry-forward); capability shipped in v1.1. |

---

## Traceability

Which phases cover which requirements. Updated during roadmap creation by the gsd-roadmapper agent.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SHELL-01 | 16 | Complete |
| SHELL-02 | 16 | Complete |
| SHELL-03 | 16 | Complete |
| SHELL-04 | 16 | Complete |
| SHELL-05 | 16 | Complete |
| THEME-01 | 17 | Complete |
| THEME-02 | 18 | Complete |
| CONTRAST-01 | 16 | Complete |
| CONTRAST-02 | 16 | Complete |
| PHOME-01 | 17 | Complete |
| PHOME-02 | 17 | Complete |
| PHOME-03 | 17 | Complete |
| PROPS-01 | 17 | Complete |
| PROPS-02 | 17 | Complete |
| WIZ-01 | 17 | Complete |
| WIZ-02 | 17 | Complete |
| WIZ-03 | 17 | Complete |
| WIZ-04 | 17 | Complete |
| WIZ-05 | 17 | Complete |
| WIZ-06 | 17 | Complete |
| ADMIN-10 | 18 | Complete |
| ADMIN-11 | 18 | Complete |
| ADMIN-12 | 18 | Complete |
| ADMIN-13 | 18 | Complete |
| ADMIN-14 | 18 | Complete |
| HELP-01 | 18 | Complete |
| EXPORT-01 | 19 | Complete |
| EXPORT-02 | 19 | Complete |
| LCDASH-01 | 19 | Complete |
| LCDASH-02 | 19 | Complete |
| INFRA-01 | 20 | Pending |
| INFRA-02 | 20 | Pending |
| INFRA-03 | 20 | Pending |
| GATE-01 | 21 | Pending |
| GATE-02 | 21 | Pending |

**Coverage:**
- v1.3 requirements: 35 total (HELP-01 added 2026-05-24 during Phase 18 planning — scope expansion confirmed in /gsd-discuss-phase)
- Mapped to phases: 35 ✅
- Unmapped: 0

---

*Requirements defined: 2026-05-21*
*Last updated: 2026-05-21 after initial definition (`/gsd-new-milestone v1.3`)*
