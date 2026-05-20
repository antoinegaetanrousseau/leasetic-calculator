# Phase 14: Admin Polish — Partners + History + Home - Context

**Gathered:** 2026-05-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Apply the v1.2 design contract to all **admin** surfaces. Phase 14 ships:

1. **Directory rename** — `app/(admin)/[adminSegment]/accounts/` → `partners/`. URL changes from `/<seg>/accounts` → `/<seg>/partners`; old URL 308-redirects. Reverts the temporary Shell.tsx sidebar patch shipped during Phase 13 hotfix (commit `6809b1f`).
2. **`/partners/new` route** — dedicated server-component page replacing the v1.1 modal flow as the active CTA destination from the partner list. 3-section form (Personal info, Company info, Customizable invitation message) submits via Phase 9's existing invite-creation server action and shows the result through the existing `<InviteUrlModal>` primitive.
3. **Admin home redesign** — replaces the current 2-card Phase 9 page with 3 `<AdminNavCard>` instances (Coefficients / Partenaires / Historique) using the Phase 11 component.
4. **StatusChip rollout** — add the `chip-invited` (gold) variant to the partner list using Phase 12's `listInvitedPartners()` helper + `users.last_login_at IS NULL` derivation; add per-row `<StatusChip>` to the existing proposal lists using Phase 12's `deriveDisplayStatus()` to map row state to the 4 chip variants.
5. **Coefficient history sidebar** — `/coefficients` page becomes a 2-column layout (editor left, sidebar right at 360px) with the 5 most-recent `coefficient_history` rows rendered as summary cards, fed by `listCoefficientHistory(5)`. Footer link `Voir tout l'historique →` routes to the new standalone `/history` route.
6. **Standalone `/history` route** — paginated full coefficient_history list (cursor-based pagination matching Phase 8 pattern). Row click opens a side-by-side diff panel (Avant | Après) with changed fields highlighted in `--gold`.

**Out of scope for Phase 14 (DEFERRED TO v1.3):**

- **Partner home dashboard restructure** — the hero greeting + 3 `<MetricTile>` instances + 5-row recent preview redesign for `app/(authed)/page.tsx` per Figma node 9:46. The user explicitly deferred this together with /proposals as a unit so the design lands coherently in v1.3.
- **3 `<MetricTile>` instances** on partner home (Ce mois-ci / Total / Brouillons) — part of the deferred dashboard restructure. ROUTE-01 success criterion #3 (partner home tiles) is explicitly relaxed for Phase 14.
- **`/proposals` route** with filters / faceted search — defer to v1.3 alongside the dashboard.
- **`CreatePartnerModal.tsx` deletion** — modal code stays in the repo as code-shelved-not-deleted fallback. The active CTA in the partner list points to `/partners/new` (ROUTE-02 success criterion #2 satisfied via behavior change, not code deletion).
- **AccountsList → PartnersList component file rename** — planner's discretion (low-impact churn; the component file lives inside the renamed directory either way).

</domain>

<decisions>
## Implementation Decisions

### Directory & route migration

- **D-01:** Rename `app/(admin)/[adminSegment]/accounts/` directory to `app/(admin)/[adminSegment]/partners/`. All sub-files (`page.tsx`, `AccountsList.tsx`, `CreatePartnerModal.tsx`, `timeAgo.ts`, tests) move with the directory.
- **D-02:** Add a redirect rule in `next.config.ts` (or via a server-component redirect in `app/(admin)/[adminSegment]/accounts/page.tsx` stub): `/<seg>/accounts` → 308 → `/<seg>/partners`. Preserves bookmarks. The stub file deletes only AFTER 1+ milestone of redirect-warm time (v1.4).
- **D-03:** Revert today's temporary `src/components/ui/Shell.tsx` sidebar patch (commit `6809b1f`): change `partners` href back to `/${adminSegment}/partners` (the renamed route per D-01) and change `history` href to `/${adminSegment}/history` (the new standalone route per D-19). Both reverts happen in Phase 14 plans, not as a separate cleanup commit.
- **D-04:** Component file naming: `AccountsList.tsx` keeps its current name (no rename to `PartnersList.tsx`). Reduces churn; the file lives under `partners/` regardless. Planner may rename if it improves clarity, but it's not required (Claude's discretion).

### `/partners/new` route — 3-section form

- **D-05:** New route `app/(admin)/[adminSegment]/partners/new/page.tsx` — server component with `requireAdmin()` defence-in-depth + `export const dynamic = 'force-dynamic'` per the PITFALLS §1.6 convention.
- **D-06:** Form structure (single `.card` containing 3 `<section>`s separated by `<hr>` dividers — matches Phase 13's step-1 visual pattern):
  - **● INFORMATIONS PERSONNELLES** — prénom, nom, email
  - **● INFORMATIONS SOCIÉTÉ** — société, SIRET (optionnel), téléphone
  - **● MESSAGE D'INVITATION** — `<textarea>` for a customizable invitation message (free text, 0-1000 chars)
- **D-07:** Client component `CreatePartnerForm.tsx` (route-private under `partners/new/`) — uses RHF + `zodResolver` with `mode: 'onBlur'` for real-time blur validation (parity with Phase 7 + Phase 13). Zod schema mirrors `CreatePartnerModal`'s existing validation; planner may extract to a shared `createPartnerSchema.ts` for DRY.
- **D-08:** Submit handler — server action calls the same Phase 9 invite-creation helper that `CreatePartnerModal` currently uses. On success, returns the one-time invite URL + kind; client opens the existing `<InviteUrlModal>` (Phase 9 primitive) to display it. The form clears after the modal closes.
- **D-09:** "Annuler" button — left-side ghost link routes back to `/<seg>/partners` (the renamed list). No confirmation dialog if the form has unsaved input (matches v1.1 modal behavior); planner may add a `beforeunload` warning if `dirtyFields.size > 0` as discretion.

### CreatePartnerModal disposition

- **D-10:** `CreatePartnerModal.tsx` code stays in the repo. NOT deleted. Reasoning: working flow preserved; future UX improvements may iterate on the modal (e.g., quick-create vs full-create). The file remains mounted in `accounts/page.tsx` → renamed to `partners/page.tsx` BUT the modal is no longer triggered (its open-state is removed from `AccountsList.tsx` user actions).
- **D-11:** `AccountsList.tsx` CTA "Créer un partenaire" changes from `<button onClick={openModal}>` to `<Link href={`/${adminSegment}/partners/new`}>` styled identically (matches `.btn-green` for primary CTA chrome). The modal's import + render lines stay in the file but the trigger is removed; this satisfies ROUTE-02 success criterion #2 verbatim (the CTA no longer opens the modal) while preserving the modal code.
- **D-12:** Vitest test `AccountsList.test.tsx` is updated to assert: (a) CTA renders as a Link with the correct href, NOT a button; (b) the modal does NOT mount when CTA is clicked; (c) the modal CAN still be rendered standalone if explicitly instantiated (negative case to keep the modal code warm).

### Admin home redesign — 3 AdminNavCards

- **D-13:** `app/(admin)/[adminSegment]/page.tsx` replaces its current 2-link layout (Phase 9's `Settings2` + `Users` cards) with 3 `<AdminNavCard>` instances rendered in a 3-column grid (`grid-template-columns: 1fr 1fr 1fr` at 24px gap; on narrow viewports stacks vertically). Phase 11's `<AdminNavCard>` component is imported verbatim.
- **D-14:** AdminNavCard #1 "Coefficients & commission" — icon `Sliders` (Phase 9 chose `Settings2`; Phase 14 switches to `Sliders` to match Figma node 41:46), description "Éditez les paramètres globaux", href `/<seg>/coefficients`.
- **D-15:** AdminNavCard #2 "Partenaires" — icon `Users`, description "Gérez les comptes partenaires", href `/<seg>/partners`.
- **D-16:** AdminNavCard #3 "Historique" — icon `History` (lucide), description "Historique des coefficients", href `/<seg>/history`.

### Coefficients page — History sidebar (in-page)

- **D-17:** `app/(admin)/[adminSegment]/coefficients/page.tsx` becomes a 2-column layout: editor column (`minmax(0, 1fr)`) + history sidebar column (`360px`) with `gap: 24px`. Max-width 1040px (matches Phase 13 step-3 pattern). Wraps on viewport < 1024px by stacking sidebar below editor.
- **D-18:** History sidebar component `CoefficientHistorySidebar.tsx` — server component (or 'use client' wrapper if needed for the diff panel; planner's call). Fetches the 5 most-recent `coefficient_history` rows via `listCoefficientHistory({ limit: 5 })` (Phase 12 helper). Renders header `● HISTORIQUE` + 5 row cards + footer link `Voir tout l'historique →` to `/<seg>/history`.
- **D-19:** Each sidebar row card displays: `summary` (italic, `body/default`), `changed_at` (formatted via `formatDate` from `src/lib/i18n/format.ts`, locale-aware), `changed_by` user identifier (email or display name; planner picks the most usable). Card has hover state (Phase 11 `.shadow/focus-ring`). Click expands inline... see D-20.
- **D-20:** Sidebar row click behavior — **inline expansion** within the sidebar showing the side-by-side diff (Avant | Après) condensed view. NOT a modal. Reasoning: keeps the diff close to the editor for quick comparison. Multiple rows can expand simultaneously. The standalone `/history` route shows the full-width side-by-side panel (see D-25). Planner's call on whether to share a `<DiffPanel>` component between sidebar inline + /history full view.

### Standalone `/history` route

- **D-21:** New route `app/(admin)/[adminSegment]/history/page.tsx` — server component, `requireAdmin()` defence-in-depth, `dynamic = 'force-dynamic'`. Renders a header `Historique des coefficients` + subtitle "Tous les changements de coefficients et commission" + paginated list of `coefficient_history` rows.
- **D-22:** Pagination — cursor-based, matching Phase 8's proposals list pattern. URL param `?cursor=<base64>`. Page size: 20 rows per page (planner may adjust). Cursor encodes `(changed_at, id)` tuple sorted DESC.
- **D-23:** List row shape on /history — same 3 fields as sidebar (summary, changed_at, changed_by) plus a "Voir le détail →" link that triggers the side-by-side diff panel (see D-24).
- **D-24:** Side-by-side diff panel — opens as a **same-page panel** (slides in from right, or below the row depending on viewport). NOT a modal. Two columns: "**Avant**" (renders `before_json` as a structured key-value table) | "**Après**" (renders `after_json` as a structured key-value table). Changed fields highlighted: row background `--gold` tint, value text bolded. Unchanged fields rendered with `--muted` color. Bottom of the panel: the auto-summary text from `generateDiffSummary` (Phase 12 helper) shown in italic.
- **D-25:** Diff panel close — Escape key OR explicit "Fermer ×" button. Multiple panels CAN'T be open simultaneously on /history (single-active-detail UX) — opening row B closes row A's panel. Differs from the sidebar's multi-expand behavior in D-20 because /history has more vertical space.

### StatusChip rollout

- **D-26:** Partner list (`AccountsList.tsx` renamed under `partners/`) — add the `invited` StatusChip variant. Server-side: the list query joins or filters via `listInvitedPartners()` (Phase 12 helper) to identify rows where `users.role='partner' AND deleted_at IS NULL AND last_login_at IS NULL`. Client-side: for each row, conditionally render `<StatusChip variant="invited" />` (gold, "invité.e") if the user is in the invited set, else fall back to existing `is_disabled ? 'chip-disabled' : 'chip-active'` logic.
- **D-27:** Proposal list rows (`src/components/proposals/ProposalsList.tsx`) — replace the current ad-hoc chip rendering with `<StatusChip variant={deriveDisplayStatus(row)} />`. The Phase 12 helper returns one of `'draft' | 'active' | 'expired' | 'deleted'`. The chip's existing CSS classes (`.chip-active`, `.chip-expired`, `.chip-draft`, `.chip-deleted`) are already shipped in Phase 11 `app/globals.css`.
- **D-28:** Proposal detail page header (`app/(authed)/proposals/[id]/page.tsx`) — adds `<StatusChip>` next to the proposal title, using the same `deriveDisplayStatus()` helper. Consistent with list rendering.

### ADMIN-09 invariants (no relaxation in Phase 14)

- **D-29:** Phase 13's D-12 partner-facing commission relaxation was wizard-specific (step 2 + step 3 of `/proposals/new/*`). Phase 14 introduces NO new commission visibility. All Phase 14 surfaces — `/partners/new`, admin home cards, /coefficients sidebar, /history page, partner list, proposal lists — render NO commission values. Vitest grep contracts verify zero commission strings in rendered HTML for: partner-list row HTML, /history page HTML, AdminNavCard HTML.
- **D-30:** `coefficient_history.before_json` and `after_json` DO contain commission values (since they snapshot the full `global_params` row including `commission_pct`). These are ADMIN-ONLY surfaces (gated by `requireAdmin()`). The diff panel renders them. This is consistent with Phase 9's existing admin coefficient editor which shows commission. No STRIDE addendum needed (admin already sees commission per Phase 9).

### Claude's Discretion

- Whether to rename `AccountsList.tsx` to `PartnersList.tsx` (recommendation: keep current name to minimize churn; the file's directory is what matters for routing).
- Whether `CoefficientHistorySidebar.tsx` and the `/history` page share a `<HistoryRowCard>` + `<DiffPanel>` component, or each renders its own variant (recommendation: share — keeps the 5-recent vs full-list views visually consistent).
- The exact pagination page size on `/history` (recommendation: 20 rows; revisit if listCoefficientHistory data grows beyond ~500 rows).
- The cursor encoding format (recommendation: same as Phase 8 proposals — `base64({changed_at, id})`).
- Whether the `/coefficients` 2-column layout uses a sticky sidebar (sidebar scrolls with editor) or a fixed sidebar (sidebar pinned to viewport). Recommendation: scroll with editor; less disorienting on tall edit forms.
- Whether the form on `/partners/new` exposes a "Aperçu de l'invitation" preview block showing how the customizable message will render in the invite email (out of scope here; v1.3 polish candidate).
- Whether the `next.config.ts` `/accounts` → `/partners` redirect uses 308 (permanent) or 307 (temporary). Recommendation: 308 — the rename is final; cached redirects help SEO and bookmark continuity.
- Whether to add a `beforeunload` warning on `/partners/new` if the form has unsaved input (recommendation: skip — matches v1.1 modal's no-warn behavior).
- Component file naming for the new diff panel (`DiffPanel.tsx` vs `CoefficientDiffPanel.tsx`; recommendation: `CoefficientDiffPanel.tsx` to make scope clear; not generally reusable).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design contract (mandatory)
- Figma file `vwOzirhL0vyxDWq4m6t4gC` — wizard frames:
  - Node `41:46` — Admin home (3 AdminNavCards)
  - Node `42:46` — Liste des partenaires (StatusChip invited variant)
  - Node `43:46` — Créer partenaire (the /partners/new 3-section form)
  - Node `45:46` — Coefficients with History sidebar (2-column 1040px max-width)
- `.planning/milestones/v1.2-CONTEXT.md` — design system token list, chrome-fill table, 3-layer fill rule
- The Phase 14 UI-SPEC.md (forthcoming from `/gsd-ui-phase 14`) will lock per-component visual contracts.

### Project / requirements
- `.planning/REQUIREMENTS.md` — ROUTE-02 full text (3-section form), partial deferral of success criterion #3 partner-home MetricTiles
- `.planning/ROADMAP.md` §Phase 14 — depends-on chain (Phase 11 components + Phase 12 helpers); 5 success criteria with partial relaxation logged in PROJECT.md decisions row
- `.planning/PROJECT.md` §Key decisions — recently added rows: D-12 ADMIN-09 relaxation closeout, Phase 12 ship gap, Phase 11 sidebar forward-references (the latter is reverted by Phase 14 D-03)
- `.planning/PROJECT.md` §Constraints — ADMIN-09 commission invisibility (Phase 14 strict; no relaxation), portability constraint (no Vercel-only primitives), desktop-primary target

### Prior-phase decisions Phase 14 must respect
- `.planning/phases/09-admin-surface/09-CONTEXT.md` — existing admin home shape, AccountsList architecture, `<InviteUrlModal>` primitive, CreatePartnerModal flow, ADMIN-09 commission-invisibility cluster (97 STRIDE threats closed)
- `.planning/phases/11-design-system-foundation-brand-assets/11-CONTEXT.md` — AdminNavCard, StatusChip (4 variants including draft + invited gold), MetricTile, RetractableSidebar, Shell wrapper, .chip-* utility classes
- `.planning/phases/12-schema-extensions-for-drafts-history/12-CONTEXT.md` — `coefficient_history` table + append-only trigger + 9 query helpers including `listCoefficientHistory`, `createCoefficientHistoryEntry`, `listInvitedPartners`, `deriveDisplayStatus`, `generateDiffSummary`
- `.planning/phases/13-3-step-proposal-wizard/13-CONTEXT.md` — wizard primitives (RecapSection, WizardActionBar, etc.) — NOT consumed by Phase 14 but the design rhythm (●-bulleted sections inside single .card, 2-column 1040px layout) carries over to /partners/new + /coefficients
- Today's hotfix work (commit `6809b1f`) — Shell.tsx temporary sidebar patch that Phase 14 D-03 reverts

### Source files Phase 14 modifies or reads
- [app/(admin)/[adminSegment]/accounts/page.tsx](app/(admin)/[adminSegment]/accounts/page.tsx) — RENAME (D-01)
- [app/(admin)/[adminSegment]/accounts/AccountsList.tsx](app/(admin)/[adminSegment]/accounts/AccountsList.tsx) — moves with directory + modal CTA → Link patch (D-11) + StatusChip invited integration (D-26)
- [app/(admin)/[adminSegment]/accounts/CreatePartnerModal.tsx](app/(admin)/[adminSegment]/accounts/CreatePartnerModal.tsx) — moves with directory + becomes shelf code (D-10)
- [app/(admin)/[adminSegment]/coefficients/page.tsx](app/(admin)/[adminSegment]/coefficients/page.tsx) — add 2-column layout + history sidebar (D-17, D-18)
- [app/(admin)/[adminSegment]/page.tsx](app/(admin)/[adminSegment]/page.tsx) — replace 2-link layout with 3 AdminNavCards (D-13..D-16)
- [src/components/ui/Shell.tsx](src/components/ui/Shell.tsx) — revert today's temporary patch (D-03)
- [src/components/InviteUrlModal.tsx](src/components/InviteUrlModal.tsx) — reused verbatim by /partners/new (D-08)
- [src/components/proposals/ProposalsList.tsx](src/components/proposals/ProposalsList.tsx) — StatusChip row integration (D-27)
- [app/(authed)/proposals/[id]/page.tsx](app/(authed)/proposals/[id]/page.tsx) — StatusChip header integration (D-28)
- [src/lib/db/queries/users.ts](src/lib/db/queries/users.ts) — `listInvitedPartners()` helper (Phase 12 shipped; Phase 14 calls it from the partner list query)
- [src/lib/db/queries/coefficient-history.ts](src/lib/db/queries/coefficient-history.ts) — `listCoefficientHistory()` helper (Phase 12 shipped; Phase 14 calls it from sidebar + /history page)
- [src/lib/admin/coefficient-diff.ts](src/lib/admin/coefficient-diff.ts) — `generateDiffSummary()` helper (Phase 12 shipped; Phase 14 uses it for both sidebar row labels + /history diff panel summary line)

### New files Phase 14 will create
- `app/(admin)/[adminSegment]/partners/new/page.tsx` — /partners/new server component
- `app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx` — client RHF form component
- `app/(admin)/[adminSegment]/partners/new/page.test.tsx` + `CreatePartnerForm.test.tsx` — Vitest tests
- `app/(admin)/[adminSegment]/coefficients/CoefficientHistorySidebar.tsx` — server (or 'use client' wrapper) component for in-page sidebar
- `app/(admin)/[adminSegment]/coefficients/CoefficientHistorySidebar.test.tsx`
- `app/(admin)/[adminSegment]/history/page.tsx` — standalone /history server component
- `app/(admin)/[adminSegment]/history/page.test.tsx`
- `app/(admin)/[adminSegment]/history/CoefficientDiffPanel.tsx` — shared diff panel (between sidebar + /history)
- `app/(admin)/[adminSegment]/history/CoefficientDiffPanel.test.tsx`
- `next.config.ts` redirect rule entry: `/[adminSegment]/accounts` → 308 → `/[adminSegment]/partners` (D-02)
- New i18n keys (~20 keys × FR + EN) under `partners.new.*`, `history.*`, `admin.home.*`, `chip.invited` namespaces

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Phase 9's `<InviteUrlModal>`** is the post-create URL display modal — Phase 14 reuses verbatim from `/partners/new` form submit handler. No changes needed.
- **Phase 11's `<AdminNavCard>`** (`src/components/ui/AdminNavCard.tsx`) — 3 instances on admin home; accepts `icon`, `title`, `description`, `href` props.
- **Phase 11's `<StatusChip>`** (`src/components/ui/StatusChip.tsx`) — 4 variants (active/draft/expired/disabled); add `invited` if not already present (check Phase 11 SUMMARY; if missing, Phase 14 adds it as a new variant + corresponding `.chip-invited` gold-tint CSS class).
- **Phase 12 helpers** (`src/lib/db/queries/coefficient-history.ts`, `src/lib/db/queries/users.ts`, `src/lib/admin/coefficient-diff.ts`) — all shipped and tested; Phase 14 calls them without modification.
- **CreatePartnerModal.tsx Zod validation schema** — Phase 14's `CreatePartnerForm.tsx` extracts and reuses it (or imports verbatim) to maintain parity between the two paths.
- **Phase 9's invite-creation server action** (file path TBD by planner; likely in `src/lib/admin/`) — same code path called by both the modal and the new route.

### Established Patterns
- **Server-component admin routes** — all admin pages have `requireAdmin()` defence-in-depth + `export const dynamic = 'force-dynamic'`. /partners/new + /history follow.
- **3-section card with ●-bulleted headers** — Phase 13 step-1 + step-3 established this rhythm. Phase 14's /partners/new uses the same pattern for the 3 form sections.
- **RHF + zodResolver mode='onBlur'** — Phase 7 + Phase 13 convention. /partners/new follows.
- **Cursor-based pagination** — Phase 8's proposals list pattern (`base64({createdAt, id})`). /history follows for `coefficient_history` rows (`base64({changed_at, id})`).
- **Audit log discipline** — Phase 14 writes NO new audit_log entries. The existing flow (admin coefficient edit → coefficient_history insert via Phase 12 `createCoefficientHistoryEntry` → audit_log unchanged) keeps working.
- **i18n parity proof** — every new `wizard.*` / `partners.*` / `history.*` / `admin.*` key needs FR + EN entries; compile-time `_EnHasAllFrKeys` proof catches drift.
- **No new global CSS** — Phase 14 surfaces compose existing `.card`, `.ctitle`, `.chip-*`, `.btn-*`, `.fld`, `.error-msg` utilities. EXCEPT: if `.chip-invited` (gold tint) is not yet in `app/globals.css` from Phase 11, Phase 14 adds it.

### Integration Points
- **`next.config.ts`** — add redirect for `/[adminSegment]/accounts/*` → `/[adminSegment]/partners/*` (D-02). Test with a curl HEAD probe on production after deploy.
- **`src/components/ui/Shell.tsx`** — revert temp patch (D-03). Sidebar links resolve to renamed/new routes naturally.
- **Old `/accounts` URL bookmarks** — preserved via the redirect for at least one milestone (v1.2 + v1.3). Phase 15 OR v1.4 can sunset the redirect.
- **Vitest test parity** — every new component gets colocated `*.test.tsx`. The total Vitest count should go from 788 (Phase 13 close) to ~830-850 after Phase 14.

</code_context>

<specifics>
## Specific Ideas

- **"Invité.e" chip label** (FR) / **"Invited"** (EN). Gold tint; same `chip-*` chrome as the other variants.
- **AdminNavCard icon for History**: `History` from lucide-react (the existing import used in Phase 11's RetractableSidebar `admin-history` entry).
- **AdminNavCard icon for Coefficients**: switch from Phase 9's `Settings2` to `Sliders` per Figma node 41:46.
- **History sidebar header copy**: `● HISTORIQUE` (caps + tracking + ●-bullet glyph in `--gd`, matching the Phase 13 ●-section-header pattern).
- **History sidebar footer link**: `Voir tout l'historique →` (FR) / `View full history →` (EN). Accent `--teal` color.
- **/history page header**: `Historique des coefficients` (FR) / `Coefficient history` (EN). Subtitle: `Tous les changements de coefficients et commission` (FR) / `All coefficient and commission changes` (EN).
- **Diff panel labels**: `Avant` / `Après` (FR) / `Before` / `After` (EN). Use as section header text in the panel.
- **Diff panel highlight color for changed fields**: `--gold` tint (matches the `.chip-draft` gold + visually consistent with the partner list's `invited` chip).
- **Partner list "Créer un partenaire" CTA text**: keep current v1.1 string from i18n dictionary; the only change is the underlying element (button → Link). Same `.btn-green` styling.
- **/partners/new "Annuler" button**: text-only ghost link "← Annuler" (FR) / "← Cancel" (EN); routes to `/<seg>/partners`.
- **/partners/new submit button**: `Créer le partenaire` (FR) / `Create partner` (EN). Same `.btn-green` chrome.
- **Empty state on /history**: only renders after backfill (which already happened — there's 1 row, "Configuration initiale"). If somehow empty, show "Aucun changement de coefficient pour le moment." with a subtle illustration or skip the illustration for v1.2 lean scope.

</specifics>

<deferred>
## Deferred Ideas

- **Partner home dashboard restructure** — hero greeting + 3 MetricTiles + 5-row recent + 'Voir toutes →' link. Defer to v1.3 with /proposals.
- **3 `<MetricTile>` instances** on partner home (Ce mois-ci / Total / Brouillons). Defer to v1.3. Lock-in decisions already made: Calendar month scope for "Ce mois-ci", Display-only (not clickable), Aggregate SQL queries on proposals table scoped to user_id.
- **`/proposals` route** with filters / faceted search — defer to v1.3 alongside the dashboard.
- **`CreatePartnerModal.tsx` deletion** — defer indefinitely. Modal stays as shelf code unless a future milestone explicitly removes it.
- **AccountsList → PartnersList component file rename** — planner's discretion. If renamed, do it in a separate atomic commit so the rename is traceable.
- **`/coefficients` sticky sidebar vs scroll-with-editor** — locked as scroll-with-editor; revisit if forms get tall.
- **`beforeunload` warning on /partners/new** — skip for v1.2 (parity with v1.1 modal); reconsider if partners report lost work.
- **/partners/new email-preview block** — out of scope for v1.2; v1.3+ polish candidate.
- **Sunset of `/accounts` redirect** — defer to v1.4 or later; redirect stays for 1+ milestone of warm-cache time.
- **Diff visualization upgrade** — Phase 14 ships side-by-side panel with `--gold` highlighting + summary line. Future v1.3+ could add field-level git-style colored diffs (`+green` / `-red` per-character), but the structured table approach is sufficient for v1.2 audit needs.
- **/history pagination performance** — currently expecting <500 rows. If coefficient_history grows substantially (>10k rows after years of admin edits), revisit pagination or add a date-range filter. Not a v1.2 concern.
- **Phase 11 sidebar adminHrefs hardcoding** — Phase 14 D-03 reverts the temporary patch. The underlying issue (Shell.tsx hard-codes the 4 admin hrefs) remains. If admin nav grows beyond 4 items in v1.3+, consider a config-driven sidebar nav.

</deferred>

---

*Phase: 14-admin-polish-partners-history-home*
*Context gathered: 2026-05-12*
