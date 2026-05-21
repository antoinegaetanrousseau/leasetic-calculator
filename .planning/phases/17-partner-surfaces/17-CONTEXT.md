# Phase 17: Partner Surfaces - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Rebuild the partner-facing surfaces to the v1.3 Figma `9:46` design contract — split the proposals list out of Partner Home into a dedicated `/proposals` route with an `Archivées` filter pill, refresh the 3-step wizard visually with two material invariant changes (validity selector reintroduced on step 3 + LC reference reserved at draft creation), and adopt `<PageHero>` (Phase 16 primitive) across every partner-facing surface — in both light and dark.

**In scope:**

- **Partner Home `/` rebuild** (`app/(authed)/page.tsx`) — replace v1.1 inline hero+list with: `<PageHero>` (greeting + subtitle + `Nouvelle proposition` CTA) + 3 `<MetricTile>` consumers (Ce mois-ci / Total / Brouillons) + Propositions récentes card (5-row preview + `Voir toutes →` link to `/proposals`).
- **New `/proposals` route** (`app/(authed)/proposals/page.tsx`) — server-rendered. Two filter pills (`Actives` default + `Archivées`), URL state via `?archived=1` query param matching v1.1's `?deleted=1` precedent. Reuses existing `ProposalsList` client component + `SearchBar` + cursor pagination. Each row's `StatusChip` shows true status (active / draft / expired / deleted).
- **Wizard step 1 (Paramètres) visual refresh** (`app/(authed)/proposals/new/parametres/page.tsx`) — adopt `<PageHero eyebrow="ÉTAPE 1 SUR 3" ...>`, refresh form-card section labels per Figma `35:46` (`● INFORMATIONS CLIENT`, `● DÉTAILS DU PROJET`), segmented duration pill, Phase 13 `WizardActionBar` preserved. Repaint, not restructure.
- **Wizard step 2 (Calcul) visual refresh + restructure** (`app/(authed)/proposals/new/calcul/page.tsx`) — adopt `<PageHero eyebrow="ÉTAPE 2 SUR 3" ...>`, **net-new Détail du calcul card** + **net-new Tranche/Coefficient pill chip on hero** per Figma `39:46`, big `2 770 €` loyer-mensuel hero card (`--teal`), Paramètres saisis recap with `← Modifier` link, Phase 13 ADMIN-09 D-12 partner-facing commission relaxation preserved. Restructure where Figma shows net-new structure.
- **Wizard step 3 (Vérifier) visual refresh + 2 invariant changes** (`app/(authed)/proposals/new/verification/page.tsx`) — adopt `<PageHero eyebrow="ÉTAPE 3 SUR 3" ...>`, 2-column 1040px layout per Figma `40:46` (CLIENT/PROJET/CALCUL review cards left, `<PdfPreviewMock>` right), **WIZ-04 validity selector** segmented pill in CALCUL recap (15j/30j/60j, default = `globalParams.validityDays`, override scoped to this proposal only), **WIZ-06 PdfPreviewMock shows the real `lc_ref`** (no longer literal `LC-2026-XXX` per Phase 13 D-15).
- **WIZ-06 lc_ref allocation at draft creation** — `createDraft()` allocates the next sequential `lc_ref` per-user and persists it on the draft row. Updates `src/lib/db/queries/proposals.ts` `createDraft` helper. Schema (Phase 12 `lc_ref` nullable + partial unique index `WHERE lc_ref IS NOT NULL`) already supports drafts with lc_ref values — no migration.
- **PageHero adoption across partner surfaces** — Partner Home `/`, `/proposals`, all 3 wizard steps. The wizard steps compose `<PageHero>` + `<Stepper>` as siblings (Stepper not embedded inside PageHero).
- **THEME-01 light + dark verification** for every partner-side screen — matches Figma's `82:*` duplicate frames (`82:1088`, `82:171`, `82:317`, `82:460`).

**Out of scope (DEFERRED to Phase 18, Phase 19, or v1.4+):**

- Admin surfaces refresh (`/[adminSegment]`, `/partners`, `/partners/new`, `/coefficients`, `/history`) — Phase 18.
- XLSX export from `/proposals` (EXPORT-01) — Phase 19.
- Centralized LC reference dashboard (LCDASH-01) — Phase 19.
- Schema migrations — none required in Phase 17. `validity_days` and `lc_ref` columns already support the new behaviors.
- Browser tab title per wizard step — v1.4+ deferred (Phase 13 ID).
- Route transition animations — v1.4+.
- Inline `Loyer estimé` chip on wizard step 1 — v1.4+ deferred (Phase 13 ID).
- `beforeunload` warning on wizard step 1 — v1.4+ deferred (Phase 13 ID).
- New i18n languages beyond FR + EN — v1.4+.
- Mobile-optimized layout — v1.4+.
- Webhook notifications on proposal generation — v1.4+.
- LC reference dashboard cross-partner view — Phase 19 (LCDASH-01).

</domain>

<decisions>
## Implementation Decisions

### Wizard invariant changes (D-01..D-04)

- **D-01 (WIZ-04 validity selector behavior):** The `Durée de validité (15j / 30j / 60j)` segmented pill is **always visible** on wizard step 3 inside the CALCUL recap card. Default selection = `globalParams.validityDays` resolved at step 1 render (Phase 13 D-08 default behavior preserved). When the partner changes the value, the selection writes to `draft.inputs.validityDays` and overrides ONLY this proposal at finalize (proposal.validity_days column gets the partner's choice). The global default in `global_params.validity_days` is NEVER modified by a partner action.
- **D-02 (WIZ-04 SQL contract):** `proposals.validity_days` column stays `NOT NULL`. The wizard writes `draft.inputs.validityDays` on every `updateDraft` call (matches Phase 13 D-08); at finalize, `finalizeDraft` copies the value from `draft.inputs.validityDays` to `proposal.validity_days`. No schema migration needed.
- **D-03 (WIZ-06 lc_ref allocation timing):** `lc_ref` is allocated at **draft creation time** (`createDraft(userId, language)` in `src/lib/db/queries/proposals.ts`), NOT at finalize as Phase 13 D-15 specified. The Phase 13 invariant is explicitly inverted. PdfPreviewMock on step 3 displays the real `lc_ref` (no longer literal `LC-2026-XXX`).
- **D-04 (WIZ-06 lc_ref pool gaps):** Abandoned drafts consume `lc_ref` sequence numbers, creating gaps in the per-user sequential pool. **This is accepted as the trade-off** for WIZ-06 fidelity (real preview > continuous numbering). No skip-gap reclamation logic. The partial unique index `proposals_user_id_lc_ref_uq WHERE lc_ref IS NOT NULL` (Phase 12 D-05) already guards against duplicates across drafts and active proposals. If a draft is hard-deleted (via Phase 10 purge cron), its lc_ref leaves a gap — fine.

### Partner Home semantics (D-05..D-09)

- **D-05 (PHOME-02 MetricTile inclusion rule):** **Inclusive** count semantics:
  - MetricTile #1 `Ce mois-ci` = `COUNT(*) WHERE status IN ('active', 'draft', 'expired') AND deleted_at IS NULL AND created_at >= [Europe/Paris current month start]`
  - MetricTile #2 `Total` = `COUNT(*) WHERE status IN ('active', 'draft', 'expired') AND deleted_at IS NULL`
  - MetricTile #3 `Brouillons` = `COUNT(*) WHERE status = 'draft' AND deleted_at IS NULL`
  - Soft-deleted proposals are EXCLUDED from all 3 tiles.
- **D-06 (PHOME-02 timezone math):** SQL-side Europe/Paris timezone for "Ce mois-ci" cutoff. App-side computes the month-start UTC equivalent at request time using a parametrized timestamp filter (cleaner than embedding `AT TIME ZONE` in Drizzle queries; survives DST transitions naturally). Concrete: in `src/lib/api/proposals/list.ts` (or a new aggregation helper), compute `now()` → format in `Europe/Paris` → take month start → convert back to UTC → use as `>=` filter on `created_at`. Document the approach in code comments.
- **D-07 (PHOME-02 tiles are display-only):** MetricTiles are NOT clickable in Phase 17 (matches v1.2 carry-forward locked decision). No deep-link to filtered `/proposals` views from tile clicks. Future v1.4+ may add click-through; out of scope here.
- **D-08 (PHOME-03 recent proposals card):** Top 5 proposals by `created_at DESC` from `status IN ('active', 'draft', 'expired') AND deleted_at IS NULL` (matches D-05 inclusion rule). Each row uses `<StatusChip>` for status display. `Voir toutes →` link routes to `/proposals` (no query params — default Actives view). If the partner has fewer than 5 proposals, show only what they have (no empty rows).
- **D-09 (PHOME-03 row content):** Each row shows: status chip (left), client name, project reference, monthly rent (right). Click navigates to `/proposals/[id]`. Hover state per existing `ProposalRow` component pattern.

### /proposals route + Archivées semantics (D-10..D-14)

- **D-10 (PROPS-01 new route):** New server-component route at `app/(authed)/proposals/page.tsx`. `requireUser()` defense-in-depth + `export const dynamic = 'force-dynamic'`. The proposals list currently rendered inline on Partner Home moves here; Partner Home keeps only the 5-row recent preview (D-08).
- **D-11 (PROPS-02 URL state mechanics):** Filter state lives in URL query params. Two pills: `Actives` (default, no param) | `Archivées` (`?archived=1`). Matches v1.1 `?deleted=1` precedent on Partner Home. Server-rendered initial state. Toggling pills uses Next.js `<Link>` for full SSR re-render (shareable URLs, browser back/forward works correctly).
- **D-12 (PROPS-02 Archivées semantics):** **Archivées = expired OR soft-deleted within the 30-day window.** SQL filter: `(status = 'expired') OR (status = 'deleted' AND deleted_at >= NOW() - INTERVAL '30 days')`. Beyond the 30-day window, soft-deleted proposals are inaccessible (Phase 10 purge cron handles eventual hard deletion). The "expired" status is derived via Phase 12's `deriveDisplayStatus()` helper from `validity_days + finalized_at < now()`.
- **D-13 (PROPS-01 list reuse):** Reuse the existing `src/components/proposals/ProposalsList.tsx` client component verbatim. The component already supports `<StatusChip>` per row via `row.displayStatus` (Phase 14 D-27). The new `/proposals` route's server component calls `buildListResponse({ userId, q, cursorEncoded, archived })` — extend `list.ts` if needed to accept the `archived` filter and return the matching rows.
- **D-14 (PROPS-01 search + pagination):** Preserve the existing `SearchBar` (ILIKE on client name + reference) and cursor-based pagination from v1.1 (Phase 8 D-A2). Both work uniformly across `Actives` and `Archivées` filter states.

### Wizard visual refresh + PageHero adoption (D-15..D-21)

- **D-15 (WIZ-01 step 1 refresh — repaint):** No JSX restructure. CSS/spacing deltas only to match Figma `35:46`:
  - Adopt `<PageHero eyebrow="ÉTAPE 1 SUR 3" title={t('wizard.step1.title', lang)} subtitle={t('wizard.step1.subtitle', lang)} />` replacing the inline `<h1>` heading block currently at the top of the route.
  - The existing 2-section form card (`● INFORMATIONS CLIENT` + `● DÉTAILS DU PROJET`) keeps its JSX shape — section labels reuse `--gd-text` (Phase 16 token) for the bullet+text per the contrast remediation.
  - Segmented duration pill (36/48/60 — Phase 13 D-13 schema-locked whitelist) stays unchanged.
  - WizardActionBar at bottom — unchanged.
  - `<Stepper>` placement: between `<PageHero>` and the form card. NOT composed inside PageHero.
- **D-16 (WIZ-02 step 2 refresh — restructure):** **Net-new JSX structure** where Figma `39:46` shows it:
  - Adopt `<PageHero eyebrow="ÉTAPE 2 SUR 3" title={t('wizard.step2.title', lang)} subtitle={t('wizard.step2.subtitle', lang)} />` at top.
  - **Net-new hero loyer-mensuel card**: large `2 770 €` value in `--teal`, sublabel `par mois pendant {durationMonths} mois`, **net-new pill chip top-right** showing `Tranche {trancheLabel} • Coefficient {coefficientPct}%`. The pill chip uses `--teal` background-tint + `--teal` text (or use `--paper` text on `--teal` solid — UI-SPEC will lock).
  - **Net-new Détail du calcul card** below the hero card: row-table with `Montant HT du projet`, **`Commission apporteur (non visible client)`** explicit annotation (ADMIN-09 D-12 partner-facing relaxation preserved — Phase 13 contract), `Coefficient appliqué (tranche {N}K€)`, `Durée du contrat`, `Loyer mensuel calculé`.
  - **Net-new Paramètres saisis recap card** with `← Modifier` link top-right (route to step 1).
  - WizardActionBar at bottom — unchanged.
  - `<Stepper>` between PageHero and hero card.
- **D-17 (WIZ-03 step 3 refresh — repaint + 2 invariant changes):** 2-column 1040px layout per Figma `40:46`:
  - Adopt `<PageHero eyebrow="ÉTAPE 3 SUR 3" title={t('wizard.step3.title', lang)} subtitle={t('wizard.step3.subtitle', lang)} />` at top.
  - Left column (~640px): existing 3 `<RecapSection>` instances (CLIENT / PROJET / CALCUL) with `← Modifier` links — preserved.
  - **D-01 validity selector**: inside the CALCUL recap card, add the 3-pill segmented `Durée de validité (15j / 30j / 60j)` per WIZ-04.
  - Right column (~360px): existing `<PdfPreviewMock>` primitive — visual refresh inside it (logo, layout matching Figma), and **D-03 lc_ref display change**: render the REAL `lc_ref` from `draft.lc_ref` (allocated at draft creation). No more `LC-2026-XXX` literal.
  - WizardActionBar at bottom — unchanged.
- **D-18 (WIZ-05 ADMIN-09 invariants preserved):** Phase 13 D-12 envelope holds:
  - Wizard step 2 + step 3 commission visibility to deal-owner partner — UNCHANGED.
  - PDF render, audit_log, server logs, pre-finalize traces — NO commission.
  - Phase 14 9-gate `tests/admin-09-grep-contracts.test.ts` suite stays green throughout.
  - The new WIZ-04 validity selector + WIZ-06 lc_ref allocation introduce NO commission surface (purely metadata).
- **D-19 (PageHero adoption scope — full partner-side):** All 5 partner-side surfaces consume `<PageHero>`:
  1. Partner Home `/` — greeting + subtitle + `Nouvelle proposition` CTA
  2. `/proposals` — title + subtitle + `Nouvelle proposition` CTA
  3. Wizard step 1 — `ÉTAPE 1 SUR 3` eyebrow + title + subtitle
  4. Wizard step 2 — `ÉTAPE 2 SUR 3` eyebrow + title + subtitle
  5. Wizard step 3 — `ÉTAPE 3 SUR 3` eyebrow + title + subtitle
  - The `<Stepper>` lives BELOW `<PageHero>` as a sibling (NOT composed inside PageHero). PageHero stays primitive-pure.
- **D-20 (WIZ-05 light + dark per surface):** Every Phase 17 surface ships both light and dark variants. Existing token cascade handles dark automatically (`--ink`, `--muted`, `--paper`, `--surface`, `--gd-text`, `--gold-text` all have dark-mode declarations).
- **D-21 (i18n keys):** Phase 17 adds new keys under:
  - `dashboard.metricTile.thisMonth`, `dashboard.metricTile.total`, `dashboard.metricTile.drafts` (3 keys × 2 langs)
  - `dashboard.recent.title`, `dashboard.recent.empty`, `dashboard.recent.viewAll` (3 × 2)
  - `proposals.title`, `proposals.subtitle`, `proposals.filter.actives`, `proposals.filter.archived` (4 × 2)
  - `wizard.step1.title`, `wizard.step1.subtitle`, `wizard.step1.eyebrow` (3 × 2; `eyebrow` may be unnecessary if string literal `ÉTAPE 1 SUR 3` is hard-coded)
  - Same for step2/step3 (6 × 2)
  - Possibly `proposal.validity.days15`, `.days30`, `.days60`, `.label` (4 × 2) — verify against existing v1.1 keys, reuse if present
  - Estimate: ~25 new keys × 2 = 50 dictionary entries. Compile-time `_EnHasAllFrKeys` parity proof catches drift.

### Cross-cutting invariants Phase 17 must hold

- **ADMIN-09 D-12 envelope + 9-gate grep-contract suite** stays green throughout. The wizard step 2 + step 3 commission visibility holds; PDF / audit_log / server logs / pre-finalize traces remain commission-free.
- **Palette stable** — no token-level changes to `--gd`, `--gold`, `--gd-text`, `--gold-text`, `--ink`, `--muted`, `--navy`, `--teal`, `--paper`, `--surface`, `--border`.
- **PDF immutability (Phase 8 invariant)** — `params_snapshot` jsonb at finalize is unchanged in shape and population. WIZ-04 affects `proposal.validity_days` (a regular column already in the snapshot via `params_snapshot.validityDays`), not the immutability rule.
- **OVH portability** — no Vercel-only primitives.
- **Light + dark pair shipped together** per surface — D-20.
- **i18n parity proof `_EnHasAllFrKeys`** stays green.
- **Phase 12 schema invariants** (status enum, partial unique index, NOT NULL columns) preserved — no migrations.

### Claude's Discretion

- The exact wording of the wizard step subtitles (`wizard.stepX.subtitle`) — recommendation: short, action-oriented (Step 1: "Saisissez les informations client et projet", Step 2: "Vérifiez le calcul avant de continuer", Step 3: "Confirmez et générez le PDF"); the planner can adjust to match Figma copy if it shows explicit text.
- Whether `<PageHero>` actions slot includes the `Nouvelle proposition` CTA on Partner Home, or whether the CTA is rendered as a sibling block below the hero — recommendation: actions slot (cleaner per D-03 PageHero layout); planner picks based on Figma `9:47` placement.
- The exact lc_ref allocation algorithm — Phase 8 D-A1..A3 should already define it. Recommendation: read `Phase 8 finalize logic` or wherever lc_ref allocation lives today, move that logic from `finalizeDraft` to `createDraft`. The format (`LC-2026-NNN` per user) stays unchanged.
- Whether to add a `lc_ref` index hint or any pre-allocated lc_ref "warm pool" optimization — recommendation: no. Simple sequential allocation. Premature optimization for an internal tool.
- Whether `?archived=1` URL state should persist across `q=<search>` query param changes — recommendation: yes (treat them as orthogonal). URL `/proposals?archived=1&q=client+name` should work naturally via Next.js searchParams composition.
- Whether the `Voir toutes →` link from Partner Home goes to `/proposals` (default Actives view) or to `/proposals?archived=1` — recommendation: default Actives view (D-08).
- Whether the wizard step 2 Tranche/Coefficient pill uses `--teal` solid background with white text vs. `--teal` tint with `--teal` text — recommendation: tint background (matches existing chip-* convention from Phase 14); UI-SPEC checker will validate WCAG AA.
- Whether to add a `data-testid` for the new MetricTile + filter-pill instances to support future Playwright tests — recommendation: yes; cheap and useful for the v1.4+ Playwright work.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design contract (mandatory)

- Figma file `vwOzirhL0vyxDWq4m6t4gC` — partner-side frames. Use `mcp__0c362372-5270-457f-b11b-4797e40bf045__get_design_context` MCP calls per-node when implementing each surface.
  - Node `9:47` — Partner Home (light) + sidebar/topbar contract
  - Node `82:1088` — Partner Home (dark mode variant)
  - Node `35:46` — Wizard step 1 Paramètres (light)
  - Node `82:171` — Wizard step 1 (dark variant)
  - Node `39:46` — Wizard step 2 Calcul (light) — has the net-new Détail du calcul + Tranche/Coefficient pill
  - Node `82:317` — Wizard step 2 (dark variant)
  - Node `40:46` — Wizard step 3 Vérifier (light) — has the 2-column 1040px layout + validity selector
  - Node `82:460` — Wizard step 3 (dark variant)
  - (No dedicated Figma node for `/proposals` — partner-list patterns inherited from Figma `42:46` (admin partners list) per the table treatment + Partner Home `9:47` for the page chrome.)
- The Phase 17 UI-SPEC.md (forthcoming from `/gsd-ui-phase 17`) will lock per-component visual contracts with measured layout constants.

### Project / requirements

- `.planning/REQUIREMENTS.md` — full text for PHOME-01..03, PROPS-01/02, WIZ-01..06, THEME-01 (12 REQs in scope)
- `.planning/ROADMAP.md` §Phase 17 — 5 success criteria + dependencies (Phase 16 PageHero foundation)
- `.planning/PROJECT.md` §Current Milestone v1.3 — palette stability decision + ADMIN-09 envelope

### Prior-phase decisions Phase 17 must respect

- `.planning/phases/06-auth-shell/06-CONTEXT.md` — SHELL-03, requireUser() defense pattern, hand-rolled FR/EN i18n via `t(key, lang)`, compile-time `_EnHasAllFrKeys` parity proof, cookie-driven theme + no-flash script
- `.planning/phases/08-persistence-pdf-pipeline/08-CONTEXT.md` — DATA-05 / DATA-06 / D-A1..A3 (proposals table shape), `params_snapshot` immutability invariant (Stripe Option A), `lc_ref` UNIQUE-per-user contract + sequential format (Phase 17 D-03 moves allocation timing), `@react-pdf/renderer` byte-determinism gate, audit_log `proposal.create` semantics, soft-delete + 30-day purge window
- `.planning/phases/09-admin-surface/09-CONTEXT.md` — ADMIN-09 commission-invisibility cluster (97 STRIDE threats closed); Phase 13 + 17 preserve all invariants except the D-12 partner-facing step 2/3 relaxation
- `.planning/phases/11-design-system-foundation-brand-assets/11-CONTEXT.md` — `<Stepper>`, `<MetricTile>`, `<StatusChip>`, `<Shell>` wrapper; 3-layer fill rule; 4-multiple spacing scale; `●`-section-header pattern with `--gd-text` color (Phase 16 remediation token)
- `.planning/phases/12-schema-extensions-for-drafts-history/12-CONTEXT.md` — DB-01 schema (status enum `'draft' | 'active' | 'deleted'`), all draft helpers (`createDraft`, `updateDraft`, `finalizeDraft`, `listDraftsByUser`, `deriveDisplayStatus`), full-replace `inputs` jsonb semantics, partial unique index on `lc_ref WHERE lc_ref IS NOT NULL` (Phase 17 D-03 leverages this), no schema migrations needed
- `.planning/phases/13-3-step-proposal-wizard/13-CONTEXT.md` — D-08 validity_days hidden from partners (Phase 17 D-01 partially inverts: now visible on step 3), D-15 PdfPreviewMock with `LC-2026-XXX` literal (Phase 17 D-03 inverts: real lc_ref), D-12 ADMIN-09 partner-facing commission relaxation (Phase 17 preserves), D-19 WizardActionBar pattern, `●`-section-header with `--gd` (Phase 16 remediation moved to `--gd-text`), 4-multiple spacing precedent, all wizard primitives (`WizardActionBar`, `PlusDeDetailsAccordion`, `PdfPreviewMock`, `RecapSection`)
- `.planning/phases/14-admin-polish-partners-history-home/14-CONTEXT.md` — D-29 9-gate grep-contract suite, `<StatusChip>` variants (5 incl. `invited`), `displayStatus` derivation, ProposalsList consumes `row.displayStatus`
- `.planning/phases/15-public-surface-brand-polish/15-CONTEXT.md` — `<BrandLogo>` + `.public-page-logo` CSS pattern (Phase 17 stays away from public layout)
- `.planning/phases/16-shell-refresh-contrast-gates/16-CONTEXT.md` — `<PageHero>` primitive D-01..D-05 (Phase 17 consumes this on all 5 partner surfaces); `--gd-text` + `--gold-text` token additions for WCAG AA text contrast; signed-off contrast audit at `docs/accessibility/16-contrast-audit.md`

### Source files Phase 17 modifies, reads, or replaces

- [app/(authed)/page.tsx](app/(authed)/page.tsx) — REWRITE Partner Home: replace inline hero + ProposalsList + SearchBar + RecentlyDeletedToggle with `<PageHero>` + 3 `<MetricTile>` + 5-row recent preview + `Voir toutes →` link. The list portion MOVES to /proposals.
- [app/(authed)/proposals/page.tsx](app/(authed)/proposals/page.tsx) — NEW route. Server component, `requireUser()` defense, `dynamic = 'force-dynamic'`. Reuses ProposalsList + SearchBar + new filter-pill row.
- [app/(authed)/proposals/new/parametres/page.tsx](app/(authed)/proposals/new/parametres/page.tsx) — WIZ-01 visual refresh (repaint). Adopt `<PageHero>`. Preserve form structure.
- [app/(authed)/proposals/new/calcul/page.tsx](app/(authed)/proposals/new/calcul/page.tsx) — WIZ-02 visual refresh + restructure. Add Détail du calcul card + Tranche/Coefficient pill on hero. Adopt `<PageHero>`.
- [app/(authed)/proposals/new/verification/page.tsx](app/(authed)/proposals/new/verification/page.tsx) — WIZ-03 visual refresh + WIZ-04 validity selector + WIZ-06 real lc_ref in PdfPreviewMock. Adopt `<PageHero>`.
- [src/lib/db/queries/proposals.ts](src/lib/db/queries/proposals.ts) — D-03 lc_ref allocation moves from `finalizeDraft` to `createDraft`. Update both helpers atomically.
- [src/lib/api/proposals/list.ts](src/lib/api/proposals/list.ts) — D-13 extend to accept `archived` filter (boolean); return proposals matching `(status = 'expired') OR (deleted_at >= NOW() - INTERVAL '30 days')` when set.
- [src/components/proposals/PdfPreviewMock.tsx](src/components/proposals/PdfPreviewMock.tsx) — D-17 update to render `props.lcRef` (real value from draft) instead of literal `LC-2026-XXX`.
- [src/components/proposals/ProposalsList.tsx](src/components/proposals/ProposalsList.tsx) — REUSE verbatim. No code changes; only consumed from new /proposals route.
- [src/components/proposals/SearchBar.tsx](src/components/proposals/SearchBar.tsx) — REUSE verbatim.
- [src/components/proposals/RecentlyDeletedToggle.tsx](src/components/proposals/RecentlyDeletedToggle.tsx) — RETIRE / REMOVE from Partner Home (no longer mounted). May be removed entirely or kept as legacy. Recommendation: remove since `/proposals?archived=1` now serves the same purpose.
- [src/lib/i18n/dictionaries.ts](src/lib/i18n/dictionaries.ts) — add ~25 new keys × FR + EN per D-21.
- [src/components/ui/PageHero.tsx](src/components/ui/PageHero.tsx) — REUSE verbatim (Phase 16). No code changes.
- [src/components/ui/MetricTile.tsx](src/components/ui/MetricTile.tsx) — REUSE verbatim (Phase 11). No code changes.
- [src/components/ui/StatusChip.tsx](src/components/ui/StatusChip.tsx) — REUSE verbatim (Phase 11/14).

### New files Phase 17 will create

- `app/(authed)/proposals/page.tsx` — /proposals route (server component)
- `app/(authed)/proposals/page.test.tsx` — Vitest covering filter-pill state via searchParams
- `app/(authed)/proposals/_components/FilterPillRow.tsx` — Client component for the Actives / Archivées pills (uses Next.js `<Link>` for URL-driven state)
- `app/(authed)/proposals/_components/FilterPillRow.test.tsx`
- (Possibly) `src/lib/db/queries/proposal-aggregates.ts` — server-side aggregation queries for the 3 MetricTile values (Ce mois-ci / Total / Brouillons) — D-05 + D-06. The planner may inline these into `app/(authed)/page.tsx` instead.
- Vitest tests for the WIZ-04 validity selector + WIZ-06 lc_ref-on-draft behavior changes (extends existing wizard tests)

### Operational

- `.github/workflows/db-migrate.yml` — Phase 17 ships NO new migration. The Phase 12 schema covers all behavioral changes.
- No new environment variables required.
- No new Vercel/Neon resources required.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (no Phase 17 code change needed)

- **`<PageHero>`** (`src/components/ui/PageHero.tsx`, Phase 16 shipped) — server component, 5 props (title/subtitle/eyebrow/actions/children-reserved). All 5 Phase 17 partner surfaces consume it via D-19.
- **`<MetricTile>`** (`src/components/ui/MetricTile.tsx`, Phase 11 shipped) — display-only tile primitive. Partner Home consumes 3 instances per PHOME-01.
- **`<StatusChip>`** (`src/components/ui/StatusChip.tsx`, Phase 11/14 shipped) — 5 variants (active/draft/expired/deleted/invited). PHOME-03 + /proposals + recent rows all consume.
- **`<Stepper>`** (`src/components/ui/Stepper.tsx`, Phase 11 shipped) — wizard step indicator. Phase 17 mounts it as a sibling of `<PageHero>` on each wizard step (NOT composed inside PageHero).
- **Phase 13 wizard primitives** (`app/(authed)/proposals/new/_components/`): `WizardActionBar`, `PlusDeDetailsAccordion`, `PdfPreviewMock` (D-17 updates this), `RecapSection`. All reused; only PdfPreviewMock gets a prop+content update.
- **`<Shell>` wrapper** (`src/components/ui/Shell.tsx`, Phase 11 + Phase 16 footer-extend) — every Phase 17 route is wrapped by Shell via the `(authed)` layout. No layout work.
- **`ProposalsList`** (`src/components/proposals/ProposalsList.tsx`) — already consumes `row.displayStatus` (Phase 14 D-27) and renders `<StatusChip>`. Reused verbatim by /proposals.
- **`SearchBar`** (`src/components/proposals/SearchBar.tsx`) — ILIKE search on client name + reference. Reused verbatim by /proposals.
- **CSS tokens** (`app/globals.css`) — Phase 17 consumes existing tokens only. The `--gd-text` and `--gold-text` Phase 16 additions are available for any text-mode WCAG AA contrast needs.
- **`getLatestGlobalParams()`** (`src/lib/db/queries/global-params.ts`, Phase 8) — Phase 17 wizard step 1 reads this for validityDays default (D-01); step 3 validity selector defaults to the same value.
- **`finalizeDraft`** (`src/lib/db/queries/proposals.ts`) — Phase 12 shipped. Phase 17 D-03 moves lc_ref allocation OUT of finalize and INTO createDraft. finalizeDraft no longer allocates; it copies the pre-allocated lc_ref from draft.
- **`createDraft`** (`src/lib/db/queries/proposals.ts`) — Phase 12 shipped. Phase 17 D-03 adds lc_ref allocation. The function signature stays the same (`createDraft({ userId, language })`); internally it now allocates + persists lc_ref atomically.
- **`buildListResponse`** (`src/lib/api/proposals/list.ts`) — Phase 8 shipped, Phase 14 extended for displayStatus. Phase 17 D-13 extends for the `archived` filter parameter.
- **`deriveDisplayStatus`** (`src/lib/db/queries/proposals.ts`, Phase 12) — derives `'active' | 'draft' | 'expired' | 'deleted'` from row state. Used for StatusChip rendering and the D-12 Archivées filter logic.

### Established Patterns

- **Server-component routes with `requireUser()` defense-in-depth** + `export const dynamic = 'force-dynamic'` — every authed page. Partner Home + /proposals + all 3 wizard steps follow.
- **Cursor-based pagination** with `base64({createdAt, id})` (Phase 8) — /proposals reuses this verbatim.
- **`<PageHero>` + `<Stepper>` sibling composition** — wizard steps render `<PageHero>` first, then `<Stepper>` below as a sibling. PageHero stays primitive-pure (does not know about Stepper).
- **Full-replace `inputs` jsonb per step** (Phase 12 specifics) — wizard server is stateless across steps. Phase 17 preserves; WIZ-04 writes `inputs.validityDays` like any other input field.
- **`audit_log` only at lifecycle transitions** (Phase 12) — Phase 17 D-03 adds a question: does draft creation now write an audit_log entry (since it allocates lc_ref)? Recommendation: NO. Phase 13 D-16 already says no audit_log entry pre-finalize. WIZ-06 reserves the metadata but doesn't change the lifecycle semantics — audit_log still fires only at finalize. The lc_ref allocation is a backend implementation detail, not a partner-visible lifecycle event.
- **Hand-rolled FR/EN i18n via `t(key, lang)`** — Phase 17 adds ~25 new keys × 2 langs per D-21. Compile-time `_EnHasAllFrKeys` parity proof catches drift.
- **Light/dark via `data-theme` cascade** — Phase 17 surfaces inherit automatically; no per-component dark CSS.
- **i18n parity proof at module-load** — adding FR keys without EN counterparts (or vice versa) fails CI.
- **ADMIN-09 9-gate grep-contract suite** (`tests/admin-09-grep-contracts.test.ts`) — runs on every commit. Phase 17 must keep it green; the new wizard step 2 + step 3 surfaces inherit Phase 13's D-12 envelope.
- **Vitest colocated `*.test.tsx`** next to source files — Phase 17 follows.
- **No new global CSS for primitives** — Phase 17 reuses Phase 11 (`.card`, `.ctitle`, `.btn-green`, `.chip-*`) + Phase 16 (`.public-page-logo` not relevant here) utility classes.

### Integration Points

- **MODIFY:** `app/(authed)/page.tsx` — Partner Home rewrite (PHOME-01)
- **CREATE:** `app/(authed)/proposals/page.tsx` — /proposals route (PROPS-01)
- **CREATE:** `app/(authed)/proposals/_components/FilterPillRow.tsx` — pill component
- **MODIFY:** `app/(authed)/proposals/new/parametres/page.tsx` — WIZ-01 visual
- **MODIFY:** `app/(authed)/proposals/new/calcul/page.tsx` — WIZ-02 visual + restructure
- **MODIFY:** `app/(authed)/proposals/new/verification/page.tsx` — WIZ-03 visual + WIZ-04 + WIZ-06 display
- **MODIFY:** `src/lib/db/queries/proposals.ts` — `createDraft` allocates lc_ref; `finalizeDraft` no longer allocates
- **MODIFY:** `src/lib/api/proposals/list.ts` — accept `archived` filter
- **MODIFY:** `src/components/proposals/PdfPreviewMock.tsx` — render real lc_ref
- **MODIFY:** `src/lib/i18n/dictionaries.ts` — add ~25 keys × FR + EN
- **RETIRE:** `<RecentlyDeletedToggle>` mounting on Partner Home (component may stay in repo)
- **EXISTING TESTS:** wizard tests may need updates for WIZ-04 + WIZ-06 changes
- **NEW TESTS:** /proposals route + filter pill behavior; PHOME-02 aggregate query; createDraft lc_ref allocation; PdfPreviewMock real-lc_ref render

</code_context>

<specifics>
## Specific Ideas

- **MetricTile values from `getLatestGlobalParams()` are NOT needed** — the 3 tiles aggregate from `proposals` table only.
- **MetricTile #1 "Ce mois-ci" SQL** (illustrative; Drizzle ORM equivalent):
  ```sql
  SELECT COUNT(*) FROM proposals
  WHERE user_id = $userId
    AND status IN ('active','draft','expired')  -- 'expired' is derived but stored implicitly
    AND deleted_at IS NULL
    AND created_at >= $monthStartUtc  -- computed app-side from Europe/Paris current month start
  ```
  Note: `expired` is not a stored status. The query lives at row level — use `deriveDisplayStatus` semantics: a finalized proposal whose `(finalized_at + validity_days)` < now() is considered expired. The aggregation may need to compute this server-side. Planner refines.
- **MetricTile values rendered on first paint** — server component aggregates synchronously, passes counts as props to `<MetricTile>`. No client-side loading state.
- **Pill chip on wizard step 2 hero (`Tranche {trancheLabel} • Coefficient {coefficientPct}%`):**
  - `trancheLabel`: humanized form (e.g. `75K€`, `100K€`) — verify against existing v1.1 + Phase 13 logic
  - `coefficientPct`: 2-decimal format (e.g. `3.69%`)
  - Styling: `--teal` tint background + `--teal` text. Inline style or extend `.chip-*` family with `.chip-teal`. Planner picks.
- **"Détail du calcul" card content** (D-16):
  - Row 1: `Montant HT du projet` → `{amountHT formatted as EUR}`
  - Row 2: `Commission apporteur (non visible client)` → `{commissionAmount formatted as EUR}` (D-12 partner-facing)
  - Row 3: `Coefficient appliqué (tranche {N}K€)` → `{coefficientPct}%`
  - Row 4: `Durée du contrat` → `{durationMonths} mois`
  - Row 5 (separator + bold): `Loyer mensuel calculé` → `{loyerMensuel formatted as EUR}`
- **PdfPreviewMock new shape** (D-17):
  - Reference line now reads: `Réf. {draft.lcRef} · {validityDays} jours de validité` (real lc_ref, real validityDays)
  - All other content unchanged
- **"Voir toutes →" link copy**: FR `Voir toutes →` / EN `View all →`. Routes to `/proposals` (no params).
- **Filter pill copy**: FR `Actives` / `Archivées`. EN `Active` / `Archived`. Pills use the existing `.chip-*` chrome with one of them in active state (background = `--gd` 10% tint, color = `--gd-text`).
- **Empty state** on /proposals?archived=1 if no expired or recently-deleted proposals: show `Aucune proposition archivée pour le moment.` (FR) / `No archived proposals yet.` (EN). Consistent with v1.1 ProposalsList empty-state pattern.
- **lc_ref allocation algorithm** (D-03):
  - In `createDraft`, query: `SELECT lc_ref FROM proposals WHERE user_id = $userId AND lc_ref IS NOT NULL ORDER BY lc_ref DESC LIMIT 1` (assumes lc_ref is sortable; Phase 8 format `LC-2026-NNN` sorts correctly as text)
  - Parse the numeric suffix, increment, format as `LC-2026-{NNN}` (zero-padded to 3 digits or whatever Phase 8 standardized)
  - Persist on the new draft row
  - Wrap in a transaction to avoid races (`SELECT ... FOR UPDATE` or use `UPSERT` pattern with the partial unique index as a backstop)
- **WIZ-04 validity selector on step 3** (D-01):
  - Inside the CALCUL recap card on step 3 (`app/(authed)/proposals/new/verification/page.tsx`)
  - 3-pill segmented selector: `[15j] [30j] [60j]`
  - Default = `draft.inputs.validityDays` (set at step 1 from globalParams default)
  - Selection updates `draft.inputs.validityDays` via the existing `updateDraft` server action
  - At finalize, `finalizeDraft` copies `draft.inputs.validityDays` to `proposal.validity_days` (already does this per Phase 13 D-08)
  - Persists across step-3 re-renders (draft persistence handles state)
- **PROPS-02 Archivées SQL** (D-12):
  ```sql
  WHERE user_id = $userId AND (
    (deleted_at IS NULL AND status = 'active' AND validity_days_expired = true)  -- derived expired
    OR (deleted_at IS NOT NULL AND deleted_at >= NOW() - INTERVAL '30 days')
  )
  ```
  Refine via `deriveDisplayStatus` helper that already handles the expired-derivation logic. The SQL above is illustrative.

</specifics>

<deferred>
## Deferred Ideas

- **MetricTile click-through** to filtered /proposals views — v1.4+ (locked v1.2 carry-forward decision; tiles stay display-only in v1.3).
- **XLSX export from /proposals** — Phase 19 (EXPORT-01).
- **Centralized LC reference dashboard** — Phase 19 (LCDASH-01).
- **Wizard step inline `Loyer estimé` chip on step 1** (Phase 13 deferred) — v1.4+ polish candidate.
- **Wizard `beforeunload` warning** for unsaved step-1 edits (Phase 13 deferred) — v1.4+.
- **Per-step browser tab titles** (Phase 13 deferred) — v1.4+.
- **Route transition animations** (Phase 13/14 deferred) — v1.4+.
- **WCAG AA contrast measurement of new partner surfaces** — Phase 16 audit covers existing composites; if Phase 17 introduces NEW token pairs (e.g. teal-on-paper for the step 2 pill chip), add a row to `docs/accessibility/16-contrast-audit.md` during execution. If no new pairs, vacuous-close.
- **lc_ref "warm pool" optimization** — not needed for an internal tool. Sequential per-user allocation is fine.
- **lc_ref reclamation on draft delete** — not in scope; gap-tolerance accepted per D-04.
- **`<RecentlyDeletedToggle>` removal** — Phase 17 retires its mounting on Partner Home. Whether to delete the component file entirely is planner's discretion (low impact either way).
- **MetricTile loading skeleton** — not needed; aggregates computed server-side on first paint.
- **Mobile-optimized wizard layout** (desktop-primary constraint preserved) — v1.4+.
- **Activity timeline / audit history on /proposals/[id]** — out of scope; v1.4+.
- **Per-partner i18n preferences** — v1.4+ if needed; current `setLang` cookie + sidebar toggle covers v1.3.

</deferred>

---

*Phase: 17-partner-surfaces*
*Context gathered: 2026-05-22*
