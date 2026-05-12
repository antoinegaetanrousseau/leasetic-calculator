# Phase 13: 3-Step Proposal Wizard - Context

**Gathered:** 2026-05-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the v1.1 single-page `/proposals/new` form with a three-route wizard — `/proposals/new/parametres` → `/proposals/new/calcul` → `/proposals/new/verification` — wired through server-side draft persistence (Phase 12 `createDraft` / `updateDraft` / `finalizeDraft` helpers) and gated by the Phase 11 `<Stepper>` component. The wizard delivers REQ ROUTE-01: 3 routes, persistent draft state between steps, stepper-gated forward navigation, draft visibility scoped to creator.

**In scope:**
- Three new server-rendered route segments under `app/(authed)/proposals/new/` (`parametres/`, `calcul/`, `verification/`)
- A small set of shared wizard components in `app/(authed)/proposals/new/_components/` — action-bar with Save+Précédent+CTA pattern, "Plus de détails" optional accordion, CSS-mock PDF preview card, recap section with `← Modifier` jump-links
- Server actions or API routes for: draft step transitions (full-replace `updateDraft`), Save-as-draft (`updateDraft` + redirect), finalize (`finalizeDraft` + `@react-pdf/renderer` blob upload + `audit_log proposal.create`, atomic)
- Redirect of legacy `app/(authed)/proposals/new/page.tsx` to `app/(authed)/proposals/new/parametres/page.tsx` to preserve bookmarks
- Carry-over of v1.1's `?duplicate=<id>` prefill (PROP-21) into the new `parametres` route, including the session-overlay for `partnerName` and `partnerCo`
- ~30 new i18n dictionary keys × 2 langs (FR/EN) for wizard titles, subtitles, button labels, toast strings, accordion label, section labels, error messages
- Vitest unit tests for: step-route render, accordion expand/collapse, `← Modifier` navigation, Stepper completion-state derivation, finalize transition, duplicate prefill, real-time blur validation
- A CR-grade STRIDE re-review of the partner-facing commission-visibility relaxation on step 2 (cross-cutting work item — Phase 13 owns the trigger, planner schedules the deliverable)

**Out of scope:**
- Draft resume mechanism (list page, deep-linkable resume) — Phase 14 ships the partner-home "Brouillons" MetricTile and the resume click-through. Phase 13 explicitly accepts a 1-phase gap where drafts saved today have no UI to be reopened until Phase 14 lands.
- `proposalInputSchema` shape changes (the schema stays identical to v1.1; the wizard hides certain fields behind the accordion or hydrates them from session — no migration)
- `durationMonths` whitelist changes (Figma sketch shows 24/36/48 but the schema stays 36/48/60 — Figma label updated post-phase)
- Real PDF blob allocation during draft (no mid-flight blob writes; `finalizeDraft` is the sole writer of `pdf_*` columns + `lc_ref` + `idempotencyKey` + `paramsSnapshot` + `computed` + the `audit_log proposal.create` entry)
- New schema migrations (Phase 12 already shipped DB-01 `draft` status and all draft helpers; Phase 13 only writes through them)
- Admin-side coefficient history viewer, admin nav cards, partner home MetricTiles, `/[adminSegment]/partners/new` route — all Phase 14 territory
- Mobile-optimized layout (out of scope per PROJECT.md desktop-primary constraint)
- ADMIN-09 invariants for non-step-2 surfaces (commission stays invisible in the generated PDF, in `audit_log` payloads, in server logs, in pre-finalize traces; only the partner-facing step-2 `Détail du calcul` row surfaces it)

</domain>

<decisions>
## Implementation Decisions

### Route structure & draft lifecycle

- **D-01:** Three new server-component routes: `app/(authed)/proposals/new/parametres/page.tsx`, `.../calcul/page.tsx`, `.../verification/page.tsx`. Each is `export const dynamic = 'force-dynamic'` per the v1.1 cookie/session-reading pattern; each calls `requireUser()` defence-in-depth.
- **D-02:** Draft identity flows through a `?draft_id=<uuid>` query parameter on every wizard URL. Hitting `/proposals/new/parametres` with NO `?draft_id=` invokes `createDraft({ userId, language })` from Phase 12 and 302-redirects to `/proposals/new/parametres?draft_id=<new_id>` so the URL is bookmarkable from that point on (Phase 12 D-02 — many drafts allowed per partner, no TTL, no dedupe).
- **D-03:** Hitting `/proposals/new/calcul?draft_id=<id>` or `/proposals/new/verification?draft_id=<id>` with an invalid / missing / cross-user / soft-deleted / non-draft `draft_id` redirects to `/proposals/new/parametres` (which then creates a fresh draft per D-02). No 404 — the wizard self-heals. This mirrors v1.1's silent-fallback discipline on `?duplicate=` (D-7-13 / PROP-21).
- **D-04:** The legacy v1.1 route `app/(authed)/proposals/new/page.tsx` becomes a server-side redirect to `/proposals/new/parametres` to preserve any external bookmarks. The original `<ProposalForm>` + `<LiveLoyerPreview>` 2-column layout from v1.1 is not exposed at any URL post-Phase-13.

### Step 1 — Paramètres du projet

- **D-05:** Step 1 surfaces 7 fields by default, organized into two `●`-bulleted sections inside a single `.card`:
  - **● INFORMATIONS CLIENT** — Nom du client (`clientCo`), Personne de contact (`clientName`), Email (`clientEmail`), Téléphone (`clientTel`).
  - **● DÉTAILS DU PROJET** — Référence du projet (`partnerRef`), Montant HT (`amountHT`), Durée du contrat segmented control (`durationMonths`, 36/48/60 — see D-13).
- **D-06:** A collapsed `+ Plus de détails (facultatif)` accordion sits below the `Détails du projet` section. Expanding it reveals the remaining 5 schema fields the Figma sketch dropped: `clientRole`, `clientSiren`, `slb` (boolean toggle), `evalParc` (boolean toggle), `projectDesc`. All optional. Expansion state persists in the draft `inputs` jsonb (`_uiAccordionOpen: true`) so reload preserves it.
- **D-07:** `partnerCo` and `partnerName` are hydrated server-side from the Better Auth session at every render of step 1 — never rendered as user-facing inputs. The hydration uses the v1.1 D-7-13 fallback chain: `session.user.displayName ?? session.user.name ?? ''`. `partnerCo` follows the same pattern (Phase 6 admin invite captures it on signup). Both values get written into the draft `inputs` jsonb at the next `updateDraft` call but the form never exposes them for edit.
- **D-08:** `validityDays` is no longer a partner-facing input. The wizard reads `getLatestGlobalParams().validityDays` at render time, falls back to `30` if the admin hasn't seeded, and writes the resolved value into the draft `inputs` jsonb on each `updateDraft` call. The PDF preview on step 3 displays the resolved value (matching the Figma "30 jours de validité" recap).
- **D-09:** **No `<LiveLoyerPreview>` pane on step 1.** The 640px-form + 360px-sticky-preview layout from v1.1 is gone. Partners no longer see a live `loyer` as they type — they see it on step 2 after clicking `Continuer vers le calcul`. The `<LiveLoyerPreview>` component stays in the codebase but is not mounted by Phase 13; future polish (`deferred`) may reintroduce a compact inline `Loyer estimé` chip near the inputs.
- **D-10:** Real-time blur-based validation carries forward from v1.1. RHF + `zodResolver(proposalInputSchema)` with `mode: 'onBlur'`. Required fields trigger inline `error.field.required` (red-ring focus, `<p role="alert" className="error-msg">`) on blur if empty; email/phone/SIREN format checks trigger on blur if non-empty. Server-side validation re-checks on `Continuer` click (the gate); client-side errors are advisory.

### Step 2 — Résultat du calcul (pure read-only)

- **D-11:** Step 2 has **zero interactive inputs**. The layout, in vertical order, is:
  1. Title `Résultat du calcul` + subtitle `Voici le loyer mensuel calculé selon les paramètres du projet. Vérifiez avant de continuer.`
  2. Stepper (step 1 ✓ done, step 2 active, step 3 pending).
  3. **Hero card** (white surface, large radius): label `LOYER MENSUEL` + large green value (e.g. `2 770 €`) + sublabel `par mois pendant {durationMonths} mois`. Top-right of the hero card: a chip `Tranche {tranche} • Coefficient {coefficientPct}%`.
  4. **Détail du calcul card** (`.card`): row table — `Montant HT du projet` / `Commission apporteur (non visible client)` / `Coefficient appliqué (tranche {N}K€)` / `Durée du contrat` / `Loyer mensuel calculé`.
  5. **Paramètres saisis recap card** (`.card`): header `● PARAMÈTRES SAISIS` with `← Modifier` link (top-right, accent-colored), body recapitulates step-1 entered values (clientCo, clientName, email, tel, partnerRef, amountHT, durationMonths). Clicking `← Modifier` navigates to `/proposals/new/parametres?draft_id=<id>` (D-22 governs Stepper state on navigate-back).
  6. **Action bar** (`.card`): `← Précédent` ghost link (left) + `Enregistrer comme brouillon` ghost button + `Continuer vers la vérification →` primary CTA (right).
- **D-12:** **Commission apporteur is visible to the partner on step 2** (ADMIN-09 partial relaxation). The `Détail du calcul` row labelled `Commission apporteur (non visible client)` renders the actual commission amount the partner is earning on this deal. The parenthetical `(non visible client)` clarifies for the partner that this row will NOT appear in the client-facing PDF. **All other ADMIN-09 invariants remain in force:** commission stays absent from the rendered PDF (verified by Phase 8's `params_snapshot` + `@react-pdf/renderer` golden-byte CI gate, plus a new test), absent from `audit_log` payloads, absent from server logs, absent from pre-finalize traces. The Phase 13 planner MUST schedule a CR-grade STRIDE re-review of the 97 threats closed in Phase 9 (ADMIN-09 cluster) and write a one-row addendum to the threat model documenting the partner-facing step-2 exception.
- **D-13:** `durationMonths` whitelist remains `{36, 48, 60}` — `durationMonthsSchema` at [src/lib/calc/schema.ts:36](src/lib/calc/schema.ts:36) is unchanged. The Figma sketch's `24 / 36 / 48` labels are inaccurate; the Figma file gets updated post-phase. Phase 7's 30-case golden corpus + ±0.01 € v9-parity CI gate stays intact. The wizard's `<DurationSegmented>` component renders `36 mois / 48 mois / 60 mois`.

### Step 3 — Vérifier la proposition

- **D-14:** Step 3 is a 2-column read-only review:
  - **Left column (~640px):** three sections separated by horizontal rules, each with a `●` bullet header and a `← Modifier` link (top-right, accent-colored): `● CLIENT` (Nom, Personne de contact, Email, Téléphone) → links to step 1. `● PROJET` (Référence, Montant HT, Durée) → links to step 1. `● CALCUL` (Coefficient appliqué, Tranche, Commission apporteur amount) → links to step 2 (which itself can `← Modifier` back to step 1).
  - **Right column (~360px):** the **PDF preview** card.
- **D-15:** The PDF preview on step 3 is a **CSS mock**, not a real `@react-pdf/renderer` artifact. The card renders the Leasétic light-mode logo (PUB-01 / ASSET-01) + title `Proposition de financement` + a placeholder reference line `Réf. LC-2026-XXX · {validityDays} jours de validité` (literal `XXX` — the real `lc_ref` is generated only at finalize time) + a few mock body lines (gray placeholder bars) + a `LOYER MENSUEL` block with the computed value. No `lc_ref` is reserved during draft, no PDF blob is uploaded, no `audit_log` entry is written pre-finalize.
- **D-16:** Step 3's action bar carries `← Précédent` ghost link + `Enregistrer comme brouillon` ghost button + `Confirmer & Générer le PDF` primary CTA. Clicking the CTA invokes a server action that:
  1. Re-validates the full `proposalInputSchema` (server-side gate).
  2. Re-reads the latest `global_params` (Phase 8 `getLatestGlobalParams()` pattern — current params snapshot).
  3. Computes `loyer` via the calc-engine.
  4. Renders the PDF via `@react-pdf/renderer` (server-side, byte-deterministic per Phase 8 CI gate).
  5. Uploads the PDF blob to Vercel Blob via the `lib/storage` adapter.
  6. Allocates `lc_ref` (per Phase 8's unique-per-user contract) and `idempotency_key`.
  7. Calls `finalizeDraft(draftId, userId, { lcRef, idempotencyKey, paramsSnapshot, computed, pdfBlobKey, pdfSha256, pdfSizeBytes, pdfGeneratedAt })` — Phase 12's atomic single-shot UPDATE that flips `status='draft'→'active'` and writes all 8 finalize columns at once.
  8. Writes one `audit_log` entry with `action='proposal.create'` (Phase 8 semantics; Phase 12 D-discretion-bullet decision to gate on the transition).

### Save-as-draft button

- **D-17:** Clicking `Enregistrer comme brouillon` on any of the 3 steps invokes a server action that:
  1. Calls `updateDraft(draftId, userId, { inputs })` with the current step's full `inputs` jsonb (full-replace semantics per Phase 12 specifics; the server is stateless across steps).
  2. 302-redirects to `/` (partner home) with a sonner toast `Brouillon enregistré ✓`.
  3. The redirect destination is the partner home; once Phase 14's "Brouillons" MetricTile/list ships, partners will reopen drafts from there.
- **D-18:** `Enregistrer comme brouillon` is the SAME button on all 3 steps (consistent action-bar pattern per D-19). Step 3's `Enregistrer comme brouillon` does NOT finalize — it preserves `status='draft'` and only the inputs jsonb is updated (the `pdf_*` / `lc_ref` / `paramsSnapshot` / `computed` columns stay NULL). Only `Confirmer & Générer le PDF` finalizes.

### Action bar (all 3 steps)

- **D-19:** Every step renders a `<WizardActionBar>` shared component at the bottom of its main content area. Composition (left → right): optional `← Précédent` ghost link (omitted on step 1) + `Enregistrer comme brouillon` ghost button + step-specific primary CTA. Primary CTA labels per step: step 1 `Continuer vers le calcul →`, step 2 `Continuer vers la vérification →`, step 3 `Confirmer & Générer le PDF`. The action bar is a `.card` (white surface, rounded), not a fixed-bottom-viewport sticky bar — it scrolls with the content. Planner: revisit stickiness as a UX-polish decision when "Plus de détails" expansion makes step 1 taller than the 982px viewport.

### Stepper state semantics

- **D-20:** The Stepper's `completedSteps` array is derived per-render from the draft's persistence history: a step is "completed" if and only if the partner has clicked the `Continuer` CTA on that step AT LEAST ONCE since their last edit of an input on that step OR any earlier step.
- **D-21:** **Edit-invalidates-downstream rule** — editing any `inputs` field on step 1 (any of the 7 default fields OR any accordion field) clears the "completed" mark from step 1 and ALL subsequent steps. Visually: the partner must walk back through `Continuer` on each step to regain the Stepper's done-check. Implementation: the server writes a small bookkeeping field into `inputs` (`_completedSteps: number[]`) on every `updateDraft` call; an edit (any non-`_completedSteps` field changed in the new inputs object) reduces the array to numbers strictly less than the lowest step whose inputs changed. Alternative implementation if the planner prefers a separate column: same algorithm.
- **D-22:** **Navigate-preserves-state rule** — clicking `← Précédent` on step 2 or step 3, OR clicking the Stepper's done-step links, does NOT touch `_completedSteps`. The partner can browse back and forth freely. Only a true edit (saved through `updateDraft`) re-evaluates D-21.
- **D-23:** `← Modifier` links inside step 2's recap and step 3's review sections are equivalent to `← Précédent` for state purposes (D-22) — pure navigation, no state change. They produce different destinations (`← Modifier` from step 3's `● PROJET` section goes to step 1; `← Modifier` from step 3's `● CALCUL` goes to step 2; etc.) but all use Next.js `<Link>` for client-side route changes.

### Finalize UX

- **D-24:** Clicking `Confirmer & Générer le PDF` on step 3 disables the CTA and morphs its label to `Génération en cours…` (single spinner approach). The server action runs synchronously through D-16's 8-step pipeline. On success, the client navigates to `/proposals/{newProposalId}` with a sonner success toast (FR `Proposition générée ✓` / EN `Proposal generated ✓`). On failure, the CTA re-enables and a sonner error toast surfaces (FR `Erreur lors de la génération. Réessayez.` / EN `Generation failed. Try again.`).

### Duplicate flow (PROP-21 carry-over)

- **D-25:** `/proposals/new/parametres?duplicate=<sourceId>` is supported. On entry with this query param, the server:
  1. Calls `createDraft({ userId, language })` per D-02.
  2. Calls `getProposalById(sourceId)`; if the row exists, is owned by the same user, and is not soft-deleted, spreads its `inputs` jsonb into the new draft via `updateDraft({ inputs: source.inputs })`.
  3. Overlays session-derived `partnerName` and `partnerCo` on top of the spread (the v1.1 PROP-21 overlay — prevents a duplicate from carrying the source row's cached partner attribution).
  4. Mounts the existing `<DuplicatePrefillToast>` component to show the partner that prefill happened.
  5. Redirects to `/proposals/new/parametres?draft_id=<new_id>` (the `duplicate` query param is consumed and dropped on redirect — preserving the toast via cookie/searchParam handoff is up to the planner).
- **D-26:** If both `?duplicate=` AND `?draft_id=` are present, `?draft_id=` wins (the draft already exists; honor it). `?duplicate=` is silently ignored.

### Cross-cutting / risk-flagged

- **D-27:** **Resume mechanism gap (Phase 14 owns):** Phase 13 creates drafts but does not ship any UI to LIST or REOPEN existing drafts. The partner home renders no `Brouillons` MetricTile until Phase 14. Phase 13 explicitly accepts a 1-phase usability gap where drafts saved today are "save-only" until Phase 14 ships. The CONTEXT.md flags this so Phase 14 planning prioritizes the resume path early.
- **D-28:** **STRIDE re-review of ADMIN-09 relaxation (D-12):** The Phase 13 planner MUST schedule a CR-grade re-review of the 97 STRIDE threats Phase 9 closed around commission invisibility. Output: a one-row addendum to the Phase 9 threat model documenting the partner-facing step-2 exception + verifying the PDF / `audit_log` / server-log invariants stay intact + a new Vitest test asserting the rendered PDF (any of the 30 golden cases) contains no commission value. Without this addendum, Phase 13 cannot pass review.

### Claude's Discretion

- Exact dictionary keys + their FR/EN copy (subject to user review during execution).
- Whether to colocate Vitest tests next to wizard route files or use a `__tests__/` folder (follow whatever Phases 11/12 used — both colocated `.test.tsx`).
- Sticky-footer vs. inline-scrolling action bar treatment when step 1's "Plus de détails" accordion expands beyond viewport.
- Whether `<WizardActionBar>`, `<PlusDeDetailsAccordion>`, and `<PdfPreviewMock>` live under `app/(authed)/proposals/new/_components/` (route-private) or under `src/components/proposal/` (reusable). Recommendation: route-private — they're specific to this wizard, not generally reusable.
- The exact placeholder string for the mock `lc_ref` on step 3 (`LC-2026-XXX` vs. `LC-2026-•••` vs. `Réf. à venir`). Recommendation: `LC-2026-XXX` (explicit placeholder, never accidentally collides with real `lc_ref` since real refs use digits).
- Whether to ship a `beforeunload` warning for unsaved edits on step 1 (mid-step edit + browser close without Save click). Recommendation: yes, simple `window.onbeforeunload` for `dirtyFields.size > 0`, but planner may defer to v1.3 polish.
- Animation/transitions between routes (slide-in, fade, none). Recommendation: none for v1.2 — keep instant route changes, polish in v1.3+.
- Whether `<DurationSegmented>` from v1.1 is reused as-is or wrapped — it already supports the 36/48/60 whitelist.
- Whether step-1 sections are visually grouped as a single `.card` with `<hr>` between (matching Figma) or as two separate `.card` instances. Recommendation: single `.card` (Figma fidelity).
- Whether the `_completedSteps` bookkeeping lives in `inputs` jsonb (D-21 default) or in a new `proposals.completed_steps` column. Recommendation: jsonb — no schema migration, contained to the wizard's concern.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design contract (mandatory)
- Figma file `vwOzirhL0vyxDWq4m6t4gC` — opens at https://www.figma.com/design/vwOzirhL0vyxDWq4m6t4gC/ ; use `mcp__0c362372-5270-457f-b11b-4797e40bf045__get_design_context` MCP calls per-node when implementing each route
- Figma node `35:46` — Paramètres du projet (wizard step 1) sketch
- Figma node `39:46` — Résultat du calcul (wizard step 2) sketch
- Figma node `40:46` — Vérifier la proposition (wizard step 3) sketch
- Figma node `9:46` — Home (partner) sketch, for the action-bar `.card` visual pattern and the topbar / sidebar chrome rules
- `.planning/milestones/v1.2-CONTEXT.md` — full design system token list (23 brand variables, 13 text styles, 2 effect styles), 3-layer fill rule (shell white / canvas paper / cards white), chrome-fill table, 9-page inventory

### Project / requirements
- `.planning/REQUIREMENTS.md` ROUTE-01 — full requirement text for the 3-step wizard with 5 success criteria
- `.planning/ROADMAP.md` §Phase 13: 3-Step Proposal Wizard — depends-on chain (Phase 11 ships Stepper + RetractableSidebar; Phase 12 ships draft helpers)
- `.planning/PROJECT.md` §Current Milestone — v1.2 goal + commission invisibility constraint + PDF immutability invariant
- `.planning/PROJECT.md` §Key decisions §ADMIN-09 (Phase 9 row) — the commission-invisibility cluster Phase 13 partially relaxes on the partner-facing step 2 only

### Prior-phase decisions Phase 13 must respect
- `.planning/phases/07-calc-engine-port-proposal-form/07-CONTEXT.md` — D-7-13 (partner-name session-hydrate fallback chain), D-7-14 (2-column proposal-page layout — this is the layout Phase 13 retires), the 30-case golden corpus + ±0.01 € v9 parity gate, the `mode: 'onBlur'` validation pattern
- `.planning/phases/08-persistence-pdf-pipeline/08-CONTEXT.md` — DATA-05 / DATA-06 / D-A1..D3 (proposals table shape), `params_snapshot` immutability invariant (Stripe Option A), `lc_ref` + `idempotency_key` UNIQUE-per-user contract, `@react-pdf/renderer` byte-determinism gate, `audit_log proposal.create` semantics
- `.planning/phases/09-admin-surface/09-CONTEXT.md` — ADMIN-09 commission-invisibility cluster + 97 STRIDE threats Phase 9 closed; the Phase 13 step-2 relaxation requires an addendum to this threat model
- `.planning/phases/10-cutover-polish/10-CONTEXT.md` — soft-delete + scheduled purge cron (twice-monthly 1st + 15th); not directly relevant since Phase 13 never writes to `pdf_*` columns until finalize, but the lifecycle context is useful
- `.planning/phases/11-design-system-foundation-brand-assets/11-CONTEXT.md` — `<Stepper>` API + 3-state derivation + in-component fallback labels (Phase 13 overrides via `stepLabels` prop or stays with defaults `['Paramètres', 'Calcul', 'Vérification']`), `<RetractableSidebar>` shipped with `<Shell>` wrapper, `.chip-*` classes Phase 12 extended with `.chip-draft`
- `.planning/phases/12-schema-extensions-for-drafts-history/12-CONTEXT.md` — DB-01 schema shape, all draft query helpers Phase 13 calls (`createDraft`, `updateDraft`, `finalizeDraft`, `listDraftsByUser`, `deriveDisplayStatus`), full-replace `inputs` jsonb semantics, "many drafts per partner / no TTL" lock, draft → active atomicity contract

### Source files Phase 13 extends or reads
- [src/lib/calc/schema.ts:94](src/lib/calc/schema.ts:94) — `proposalInputSchema` (14 fields, UNCHANGED in Phase 13). `durationMonthsSchema` at line 36 stays `{36, 48, 60}` per D-13.
- [src/lib/db/queries/proposals.ts:360+](src/lib/db/queries/proposals.ts:360) — Phase 12's draft helpers; Phase 13 calls these and adds no new query functions. `createDraft` (line 375), `updateDraft` (~line 410), `finalizeDraft` (~line 460), `listDraftsByUser` (line 503), `deriveDisplayStatus` (line 551).
- [src/lib/db/queries/global-params.ts](src/lib/db/queries/global-params.ts) — `getLatestGlobalParams()` for `validityDays` resolution at step-1 render (D-08) and for `params_snapshot` capture at finalize (D-16 step 6).
- [src/components/ui/Stepper.tsx](src/components/ui/Stepper.tsx) — Phase 11's Stepper; Phase 13 imports and passes `currentStep` + `completedSteps` derived per D-20–D-22, plus `hrefForStep: (n) => /proposals/new/{['parametres','calcul','verification'][n-1]}?draft_id=<id>`.
- [src/components/proposal/ProposalForm.tsx](src/components/proposal/ProposalForm.tsx) — v1.1 `<ProposalForm>` + `<ProposalFormProvider>` RHF+Zod setup. Phase 13 either decomposes this into per-step sub-forms OR keeps `<ProposalFormProvider>` hoisted at step 1's level and uses `useFormContext` in each sub-card. Planner's call; recommendation: decompose into 1 form on step 1 only.
- [src/components/proposal/LiveLoyerPreview.tsx](src/components/proposal/LiveLoyerPreview.tsx) — NOT MOUNTED by Phase 13 wizard (D-09). Stays in the codebase pending a future deferred-idea inline-preview chip.
- [src/components/proposal/DurationSegmented.tsx](src/components/proposal/DurationSegmented.tsx), `NumberInputAmount.tsx`, `PhoneInput.tsx`, `SirenInput.tsx`, `YesNoToggle.tsx` — all v1.1 field-components Phase 13 reuses verbatim. Phase 13 maps them onto the wizard's step 1 / accordion as appropriate.
- [src/components/proposals/DuplicatePrefillToast.tsx](src/components/proposals/DuplicatePrefillToast.tsx) — v1.1 toast for `?duplicate=` prefill; Phase 13 keeps mounting it on step 1 entry when the duplicate prefill chain fires (D-25).
- [app/(authed)/proposals/new/page.tsx](app/(authed)/proposals/new/page.tsx) — v1.1 single-page route Phase 13 replaces with a redirect to `/proposals/new/parametres` (D-04).
- [src/lib/auth/require.ts](src/lib/auth/require.ts) — `requireUser()` defence-in-depth pattern; called from every Phase 13 route per D-01.
- [src/lib/i18n/dictionaries.ts](src/lib/i18n/dictionaries.ts) — Phase 13 adds ~30 new wizard keys × FR/EN (compile-time parity proof catches drift per the Phase 6 hand-rolled i18n decision).
- [app/globals.css](app/globals.css) — `.card`, `.ctitle`, `.fld`, `.btn-green`/`.btn-out`, `.chip-*`, `.error-msg` utility classes. Phase 13 does NOT add new global CSS — wizard styles reuse these via existing tokens (D-10 from Phase 11).

### Operational
- `.github/workflows/db-migrate.yml` — Phase 13 ships NO new migration (Phase 12 already shipped DB-01). The migration runner is documented but not exercised.
- `docs/operations/launch-checklist.md` — no Phase 13 addition expected; the wizard ships behind the existing v1.1 hosting + auth surface.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Phase 11 shipped `<Stepper>`** (`src/components/ui/Stepper.tsx`) — server-component with `currentStep`, `completedSteps`, `lang`, optional `stepLabels`, optional `hrefForStep`. Phase 13 just imports and passes props per D-20–D-23.
- **Phase 12 shipped all draft query helpers** (`src/lib/db/queries/proposals.ts`) — `createDraft`, `updateDraft` (full-replace inputs jsonb), `finalizeDraft` (atomic single-shot UPDATE writing all 8 finalize columns + `audit_log proposal.create`), `listDraftsByUser`, `deriveDisplayStatus`. Phase 13 adds zero new query functions.
- **Phase 7's RHF + zodResolver pattern** (`<ProposalFormProvider>` hoisting in `app/(authed)/proposals/new/page.tsx`, `mode: 'onBlur'` validation, error keys via i18n) — reusable verbatim on step 1.
- **All field components from v1.1** — `<DurationSegmented>`, `<NumberInputAmount>`, `<PhoneInput>`, `<SirenInput>`, `<YesNoToggle>`, `<DuplicatePrefillToast>`. Phase 13 reuses each verbatim, just remounts them in the new route structure.
- **CSS classes from Phase 11 / v1.1** — `.card`, `.ctitle`, `.fld`, `.btn-green`, `.btn-out`, `.chip-*`, `.error-msg`, `.search-bar`. No new global CSS in Phase 13.
- **`<Shell>` wrapper from Phase 11** — every wizard route is automatically inside the `(authed)` layout's Shell (RetractableSidebar + Topbar + main paper bg). No layout work in Phase 13.
- **Phase 8's `@react-pdf/renderer` + `lib/storage` Blob adapter pipeline** — invoked atomically at finalize per D-16. The byte-determinism CI gate covers the wizard's output as long as `finalizeDraft` is the sole writer.
- **Phase 8's `getLatestGlobalParams()`** — used twice in Phase 13: at step-1 render for the `validityDays` default (D-08), and at finalize for the `paramsSnapshot` capture (D-16 step 2).
- **`requireUser()` defence-in-depth** — called from every wizard route per D-01, matching v1.1's pattern.

### Established Patterns
- **`export const dynamic = 'force-dynamic'`** on every cookie/session-reading server-component route (PITFALLS §1.6 in the Phase 7 plan log). Phase 13 follows on all 3 wizard routes.
- **`requireUser()` defence-in-depth** layered on top of `app/(authed)/layout.tsx`'s existing gate — both layers run, no shortcuts.
- **Server-action / API-route shape for mutations** — Phase 13's `Continuer`, `Enregistrer comme brouillon`, and `Confirmer & Générer` actions all write through Phase 12 helpers. Planner picks server action vs. POST API route (recommendation: server actions for the wizard's intra-flow saves; an explicit POST `/api/proposals/finalize` for the atomic finalize, mirroring Phase 8's API surface).
- **Full-replace `inputs` jsonb per step** (Phase 12 specifics) — the server is stateless across steps. Phase 13's `updateDraft` calls always send the complete current inputs object.
- **D-7-13 partner-name fallback chain** (`session.user.displayName ?? session.user.name ?? ''`) — Phase 13 reuses this for `partnerName`; mirrors it for `partnerCo` per D-07.
- **Hand-rolled FR/EN i18n via `t(key, lang)`** — Phase 13 adds ~30 new keys × 2 langs, all subject to the compile-time parity proof.
- **Cookie-based dark mode + no-flash inline `<script>`** (Phase 6) — Phase 13 just rides this; no theme work.
- **Vitest colocated `*.test.tsx` next to components** — Phase 11/12 convention. Phase 13 follows.
- **`audit_log` entry only at lifecycle transitions** (Phase 12 D-discretion-bullet) — Phase 13 writes ONE audit entry on finalize, none on draft updates, none on Save-as-draft, none on duplicate prefill.
- **Server-only helpers via `import 'server-only'`** — Phase 13's draft-orchestration helpers (if any new ones are added) follow this.
- **Real-time blur validation via RHF `mode: 'onBlur'` + `zodResolver`** (v1.1 / Phase 7) — Phase 13 carries this on step 1 (D-10).

### Integration Points
- **NEW: `app/(authed)/proposals/new/parametres/page.tsx`** — server-rendered step 1 with `<ProposalFormProvider>` + 2-section `.card` + "Plus de détails" accordion + `<WizardActionBar>`.
- **NEW: `app/(authed)/proposals/new/calcul/page.tsx`** — server-rendered step 2; receives `draft_id`, fetches the draft row, computes `loyer` via the calc-engine + current `getLatestGlobalParams()`, renders read-only result cards + recap card + `<WizardActionBar>` (with `Continuer vers la vérification` primary CTA).
- **NEW: `app/(authed)/proposals/new/verification/page.tsx`** — server-rendered step 3; 2-column layout, `<PdfPreviewMock>` on the right, recap sections on the left, `<WizardActionBar>` (with `Confirmer & Générer le PDF` primary CTA).
- **NEW: `app/(authed)/proposals/new/_components/WizardActionBar.tsx`** — shared client component for the Save+Précédent+CTA `.card`; takes `currentStep`, `draftId`, `onSave` handler, `primaryCtaLabel`, `primaryCtaHref` (for steps 1/2) or `onPrimary` async handler (for step 3 finalize).
- **NEW: `app/(authed)/proposals/new/_components/PlusDeDetailsAccordion.tsx`** — collapsible client component wrapping the 5 optional fields. Open/close state mirrors `_uiAccordionOpen` in `inputs` jsonb so reload preserves it.
- **NEW: `app/(authed)/proposals/new/_components/PdfPreviewMock.tsx`** — pure-presentational client (or server) component rendering the CSS-mock preview card with `LC-2026-XXX` literal placeholder + computed `loyer`.
- **NEW: `app/(authed)/proposals/new/_components/RecapSection.tsx`** — shared recap component used both on step 2's "PARAMÈTRES SAISIS" recap and on step 3's 3 review sections. Takes a section title + a list of label/value rows + an optional `← Modifier` link target.
- **MODIFIED: `app/(authed)/proposals/new/page.tsx`** — replace contents with a server-side `redirect('/proposals/new/parametres')`.
- **NEW (server actions or API routes):** Phase 13 wires through (a) `saveAndAdvance(draftId, inputs, fromStep)` — calls `updateDraft` + redirects to the next step; (b) `saveAsDraft(draftId, inputs)` — calls `updateDraft` + redirects to `/`; (c) `finalize(draftId)` — runs the D-16 8-step pipeline.
- **NEW: Vitest tests** colocated with each new component + route: per-step page render, accordion expand/collapse, `← Modifier` jump, Stepper completion-state derivation, finalize transition (mocked `@react-pdf/renderer` + mocked Blob adapter), duplicate prefill, blur validation, ADMIN-09 commission-presence-in-step-2 + commission-absence-in-PDF.
- **NEW: ~30 new i18n keys** under `wizard.*` namespace, in `src/lib/i18n/dictionaries.ts` FR + EN.

</code_context>

<specifics>
## Specific Ideas

- **`<WizardActionBar>` composition:** rounded white `.card` at the bottom of each step's main content. Inner layout: `← Précédent` (steps 2/3) ghost-text link on the far left → `Enregistrer comme brouillon` `.btn-out` (ghost) → spacer → primary `.btn-green` CTA on the far right.
- **PDF preview mock content:** Leasétic logo (light, ASSET-01 SVG) + `Proposition de financement` title + `Réf. LC-2026-XXX · {validityDays} jours de validité` (literal `XXX`) + 3-4 gray placeholder bars representing body content + `LOYER MENSUEL` label + computed value `2 770 € / mois` + 2 more gray bars. Background: white surface inside a rounded card. Total height ~340–400px to fit alongside the recap column on a 982px viewport.
- **`← Modifier` link styling:** small `--gd` accent-colored text link (12–13px) in the top-right corner of each recap-section header, prefixed with a back-arrow Unicode glyph (`←` U+2190). Hover: underline.
- **Toast strings:**
  - Brouillon save (success): FR `Brouillon enregistré ✓`, EN `Draft saved ✓`
  - Finalize (success): FR `Proposition générée ✓`, EN `Proposal generated ✓`
  - Finalize (error): FR `Erreur lors de la génération. Réessayez.`, EN `Generation failed. Try again.`
  - Duplicate prefill (existing `<DuplicatePrefillToast>` keeps its v1.1 copy)
- **Spinner label during finalize:** `Génération en cours…` (FR) / `Generating…` (EN). The primary CTA both disables and morphs its label.
- **Step labels for `<Stepper>`:** use the Phase 11 in-component defaults `['Paramètres', 'Calcul', 'Vérification']` (FR) / `['Parameters', 'Calculation', 'Verification']` (EN). No `stepLabels` override needed.
- **Section bullet color in step content:** the `●` glyph in each section header (`● INFORMATIONS CLIENT`, `● DÉTAILS DU PROJET`, `● CLIENT`, `● PROJET`, `● CALCUL`, `● PARAMÈTRES SAISIS`, `● DÉTAIL DU CALCUL`) uses `--gd` (Leasétic brand green). All caps + tracking for the label per Figma `label/section-title` text style.
- **Accordion trigger copy:** FR `+ Plus de détails (facultatif)` / EN `+ More details (optional)`. Caret icon rotates 90° on expand. Animation: 200ms ease-out height transition.
- **"Plus de détails" accordion content order:** clientRole → clientSiren → projectDesc → slb toggle → evalParc toggle (mirrors v1.1's visual grouping: optional client identity fields first, then project narrative, then interest booleans).
- **Step-1 segmented control values:** literal `36 mois / 48 mois / 60 mois` (NOT `24 mois / 36 mois / 48 mois` as the Figma sketches — Figma is wrong here per D-13).
- **Mock `lc_ref` placeholder format:** `LC-2026-XXX` — literal `XXX`, never digits, so it never collides with real allocated `lc_ref`s (which use the Phase 8 sequential numeric format).

</specifics>

<deferred>
## Deferred Ideas

- **Draft resume mechanism** — Phase 14 ships the partner-home "Brouillons" MetricTile and the click-through resume path. Phase 13 explicitly accepts a 1-phase usability gap.
- **Inline `Loyer estimé` chip on step 1** — a small compact preview near the `Montant HT` / `Durée` inputs, lighter than v1.1's 360px sticky preview pane. Possible v1.3 polish if partners miss the v1.1 live feedback.
- **Sticky-footer treatment of `<WizardActionBar>`** when step 1's accordion expansion pushes content beyond the 982px viewport — planner's call within Phase 13 or defer to v1.3.
- **`beforeunload` warning for unsaved edits** on step 1 (when `dirtyFields.size > 0`) — possible Phase 13 polish; otherwise v1.3.
- **Animation / transitions between routes** (slide-in, fade) — keep instant route changes for v1.2 polish, revisit in v1.3+.
- **Per-step browser tab titles** vs. single `Nouvelle proposition — Leasétic Matrice` for all 3 — planner's call.
- **Cron purge of stale empty drafts** (drafts with `inputs = {}` and `created_at` older than N days) — Phase 12 D-02 explicitly rejected TTLs; revisit only if observation shows draft accumulation hurts ops or admin views.
- **Figma label fixes** for the wizard frames (durations 24/36/48 → 36/48/60; partner-card hidden auto-fill notes; "Plus de détails" accordion sketch) — to do post-phase, not blocking.
- **Admin coefficient history viewer, AdminNavCards, partner home MetricTiles, partner home `Nouvelle proposition` CTA wiring** — all Phase 14.
- **Public-surface (login / invite / reset) brand-polish** — Phase 15.

</deferred>

---

*Phase: 13-3-step-proposal-wizard*
*Context gathered: 2026-05-12*
