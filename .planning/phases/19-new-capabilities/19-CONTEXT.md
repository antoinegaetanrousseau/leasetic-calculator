# Phase 19: New Capabilities - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Add two net-new capabilities to the v1.3 app, both extending the ADMIN-09 grep-contract suite monotonically:

1. **Per-partner XLSX export from `/proposals`** (EXPORT-01, EXPORT-02) — a partner can download a `.xlsx` file containing every proposal matching their current filter + search query, with 10 fixed columns and zero commission leakage.
2. **Centralized cross-partner LC reference dashboard** (LCDASH-01, LCDASH-02) — an admin can browse every issued `lc_ref` across every partner at `/[adminSegment]/lc-references` with cursor pagination + search.

**In scope:**
- New Server Action serving the XLSX export at the partner-side `/proposals` route, mounted as a secondary CTA in the existing PageHero actions slot.
- New `src/lib/xlsx/**` adapter directory wrapping `exceljs` with the same OVH-portability ESLint guard pattern used for `src/lib/pdf/**` (`@react-pdf/renderer`).
- New admin SSR page at `app/(admin)/[adminSegment]/lc-references/page.tsx` rendering a styled table (mirrors Phase 18 PartnersList visual treatment).
- New AdminNavCard on Admin Home linking to `/lc-references` — extends the Phase 18 3-card grid to a 4-card grid (planner handles responsive layout).
- ADMIN-09 grep-contract suite extended from 9 to ≥10 gates: 1 XLSX-byte-inspection gate (EXPORT-02) + N LC dashboard surface gates (LCDASH-02).
- THEME invariant: every Phase 19 UI surface ships light + dark together (per v1.3 cross-cutting invariant #1).

**Out of scope:**
- Cross-partner admin read view of `/proposals/[id]` (ADMIN-FUT-01 — v1.4+). LC dashboard rows are read-only.
- Sidebar nav extension to a 7th item (preserves Phase 18 D-27 locked decision).
- New audit_log event types (`proposal.export` rejected — Phase 12 convention is lifecycle-only).
- Streaming XLSX generation (defer until profiling shows in-memory is insufficient for the actual dataset).
- LC numbering scheme `/aide` article documentation (candidate for HELP-02).
- Project amount as a searchable field on the LC dashboard.
- XLSX read functionality — write-only adapter for now.

</domain>

<decisions>
## Implementation Decisions

### EXPORT pipeline (D-01..D-05)

- **D-01 (EXPORT library):** Use **`exceljs`** (MIT, pure-Node, no native deps, OVH-portable, ~3.5M weekly downloads, supports streaming if ever needed). Reject `xlsx` (SheetJS) — it left the npm registry in 2024 and requires a CDN URL in `package.json` that breaks `npm ci` in clean CI environments. Reject `write-excel-file` — leaner but less mature for the cell-formatting we'll need (currency, dates, locale).

- **D-02 (EXPORT adapter pattern):** Create a net-new `src/lib/xlsx/**` adapter directory. All `exceljs` imports MUST live inside that directory. Add an entry to `eslint.config.mjs` `no-restricted-imports` blocking `exceljs` outside `src/lib/xlsx/**`, mirroring the existing `@react-pdf/renderer` → `src/lib/pdf/**` rule (`eslint.config.mjs:77-81, 130-141`). The defense-in-depth grep script `scripts/check-no-vercel-only-imports.sh` should grow an analogous check (or a new `scripts/check-no-xlsx-leak.sh`) — planner decides whether to extend the existing script or add a new one. Add `import 'server-only'` to every file under `src/lib/xlsx/**` (mirrors `src/lib/pdf/render.ts:1`).

- **D-03 (EXPORT route shape):** Serve via **Server Action returning `Response`**. Next 16 Server Actions can return binary `Response` objects with `Content-Disposition: attachment; filename=...`. Matches the Phase 13 wizard's server-action discipline. No new `/api/*` route to gate via `proxy.ts`. The action runs `requireUser()` defense-in-depth + reads the partner's session for `user_id` scoping. Reject `/api/proposals/export` Route Handler — adds an extra auth surface for no benefit at this dataset scale.

- **D-04 (EXPORT filename + audit):** Filename = `propositions-{YYYY-MM-DD}.xlsx` (no filter indicator, no partner slug). Locale-independent (`propositions` is recognizable in both FR and EN). No `audit_log` entry on export — Phase 12 lifecycle-only convention holds; an export is a read operation on already-persisted data, no new lifecycle transition occurs. Server-side log line at info level is fine (consistent with how Phase 8 PDF reads are not audited).

- **D-05 (EXPORT-02 ADMIN-09 gate mechanism):** New test in `tests/admin-09-grep-contracts.test.ts` (gate 10) generates an XLSX containing at least one proposal with a non-zero `commission_pct`, opens it via `new ExcelJS.Workbook().xlsx.read(buffer)`, iterates **all worksheets + all rows + all cells + all column headers + all sheet names**, and asserts none match `/commission/i`. Parser-based scan is more rigorous than raw-byte indexOf and catches the same leaks a partner would see when opening the file. Reject raw-zip-byte scan as the only layer — it produces false positives on internal XML attributes.

### EXPORT UX on /proposals (D-06..D-10)

- **D-06 (EXPORT CTA placement):** CTA lives in **PageHero actions slot** as a secondary button next to the existing primary `Nouvelle proposition` CTA. Variant: secondary (ghost or outline — UI-SPEC will lock), so the primary teal CTA remains visually dominant. Label: `Exporter en XLSX` (FR) / `Export to XLSX` (EN). Uses the existing Phase 17 D-19 PageHero `actions` slot pattern.

- **D-07 (EXPORT loading state):** Button disables on click; label swaps to `Génération…` (FR) / `Generating…` (EN) + small inline spinner (lucide-react `Loader2` with `animate-spin`). On Server Action completion, browser triggers the native file download via the Response headers. Sonner toast `Export prêt` (FR) / `Export ready` (EN) on success; toast `Échec de l'export, réessayez` (FR) / `Export failed, try again` (EN) on error. No progress modal — dataset is small enough that <2s waits don't need overlay UI.

- **D-08 (EXPORT scope semantics):** Reads `?archived=` AND `?q=` from the URL state at action invocation time. Runs the same `buildListResponse({ userId, archived, q })` query as the page renderer BUT **without** the cursor/limit (or with an effective limit equal to `MAX_EXPORT_ROWS` — planner picks a sane upper bound like 10000 to defend against pathological cases). Returns every match across all pages. Matches the LCDASH-01 success criteria language "all proposals matching the current filter". Search query is honored (rejected: ignoring `q` would surprise partners filtering by client name).

- **D-09 (EXPORT i18n):** Column headers + status values + date formatting + currency formatting all follow the partner's current locale cookie. Headers via new dictionary keys (e.g. `proposals.export.column.reference`, `proposals.export.column.client`, etc.) with FR + EN parity enforced by the compile-time `_EnHasAllFrKeys` proof (Phase 17 D-21 verify-and-reuse discipline applies — check for reusable existing keys first, e.g. `proposals.column.*` if they exist from Phase 17 PROPS-01). Dates: `Intl.DateTimeFormat(locale, { dateStyle: 'short' })`. Currency (`Montant HT`, `Loyer mensuel`): Excel native currency cell format `# ##0.00 €` with EUR symbol on both FR and EN — Excel handles separator localization natively. `Coefficient` as raw percent string (`3.69%`) or Excel native percent format on a decimal (`0.0369`) — planner decides during execution per Excel ergonomic norms.

- **D-10 (EXPORT empty-result handling):** Button is **disabled when the SSR-rendered result count is 0** + tooltip `Aucune proposition à exporter` (FR) / `No proposals to export` (EN). The page already knows the count from the SSR query; pass it as a prop to the CTA. Prevents wasted server roundtrips and signals "nothing to do" clearly via gray disabled state.

### LCDASH (D-11..D-17)

- **D-11 (LCDASH scope — drafts included):** Dashboard lists **every issued `lc_ref` regardless of proposal status**, including drafts. Phase 17 D-03 moved lc_ref allocation to `createDraft` time, so drafts hold permanent references the dashboard's job is to make visible. Each row's status column uses `<StatusChip>` with the row's true `displayStatus` (Phase 12 / Phase 14 D-27) — `draft`, `active`, `expired`, `deleted`. Matches the LCDASH-01 success criteria literal wording "every issued LC reference".

- **D-12 (LCDASH scope — soft-deleted included):** Soft-deleted proposals (`deleted_at IS NOT NULL`, still within the 30-day purge window per Phase 10) **are included** with `<StatusChip variant="deleted">`. They disappear from the list automatically after the Phase 10 purge cron hard-deletes them (same eventual-consistency model as `/proposals?archived=1` for partners). Justification: admin investigating "what was on LC-2026-042?" should see the soft-deleted row before purge.

- **D-13 (LCDASH row interactivity):** Rows are **read-only** — no `<Link>` wrappers, no row-click handler. Matches Phase 18 D-07 Recent activity row pattern (read-only, no hover affordance beyond cursor). Justification: cross-partner `/proposals/[id]` admin read view (ADMIN-FUT-01) is explicitly v1.4+ scope. Phase 19 must not ship a click target that 404s or accidentally grants admins access to a partner-scoped detail route.

- **D-14 (LCDASH search):** Search field matches `reference ILIKE %q%` OR `partner.name ILIKE %q%` OR `inputs.clientName ILIKE %q%`. Spec says "reference or partner name"; adding client name is a tiny additional ILIKE on an existing column with high admin-workflow value ("did we send something to Durand last month?"). Project amount is NOT searchable — amount search is awkward UX.

- **D-15 (LCDASH default sort):** `created_at DESC` (most recent first). Matches the `/proposals` partner-side default. lc_ref sorts lexically correctly (`LC-2026-001` < `LC-2026-099` < `LC-2027-001`) but `created_at` is the more reliable recency signal across edge cases.

- **D-16 (LCDASH pagination):** Cursor-based via existing `PaginationKey` primitive + `buildListResponse`-style helper (Phase 17 17-04 + Phase 18 D-12). Reuse the same `~20 rows per page` cadence Phase 18 PartnersList established. New query helper lives in `src/lib/db/queries/lc-references.ts` or extends `proposal-aggregates.ts` — planner decides based on shape.

- **D-17 (LCDASH columns):** Per LCDASH-01 success criteria: `Référence | Partenaire | Client | Montant HT | Statut | Créée le`. Use the existing styled-table chrome from Phase 18 PartnersList (`42:46`-derived) for visual continuity. Empty states follow Phase 17 17-04 / Phase 18 D-13 convention: first-run friendly + filter-empty informative + clear-filters affordance.

### Navigation + plan structure (D-18..D-21)

- **D-18 (LCDASH navigation entry):** LC dashboard reached **only via a new 4th AdminNavCard on Admin Home**, NOT via a 7th sidebar item. Preserves the Phase 18 D-27 locked sidebar (`Accueil / Nouvelle proposition / Propositions / Partenaires / Coefficients / Aide`). The Admin Home AdminNavCard grid extends from 3 (Phase 18) to 4 cards (`Coefficients / Partenaires / Historique / Références LC`); planner handles responsive layout (likely 4-col on desktop, 2-col on tablet, 1-col on mobile per existing Tailwind grid conventions).

- **D-19 (LCDASH route):** `app/(admin)/[adminSegment]/lc-references/page.tsx` — server component, `requireUser()` defense + admin-role gate (mirrors the existing `[adminSegment]` tree), `export const dynamic = 'force-dynamic'`.

- **D-20 (Phase 19 plan split):** **Two plans** — `19-01-PLAN.md` covers EXPORT (partner-side: xlsx adapter + Server Action + CTA + i18n keys + EXPORT-02 gate). `19-02-PLAN.md` covers LCDASH (admin-side: query helper + page route + table + AdminNavCard + LCDASH-02 gate(s) + Admin Home grid extension). Mirrors the Phase 17 (8 plans by concern) and Phase 18 (7 plans by concern) discipline. Each plan ends with its own ADMIN-09 gate addition.

- **D-21 (UI-SPEC sequencing):** Run `/gsd-ui-phase 19` BEFORE `/gsd-plan-phase 19`. ROADMAP marks Phase 19 as `UI hint: yes`. The LC dashboard is a brand-new admin surface (table, search, status chips across multiple partners, empty/loading states) and the export CTA placement + button states need a design contract before the planner makes implementation choices. UI-SPEC.md will lock visual contracts that the planner consumes.

### Claude's Discretion

- **`exceljs` cell formatting choices** for the 10 columns — Excel native currency vs string for `Montant HT` / `Loyer mensuel`, percent format vs raw string for `Coefficient`, Excel date type vs ISO string for date columns. Planner picks during execution per Excel ergonomic norms; record the decision in the plan.
- **Worksheet name** (`Propositions` vs `Sheet1` vs locale-aware `Propositions/Proposals`). Recommendation: `Propositions` single-locale fine; partners open one sheet regardless.
- **Column widths** in the XLSX (autofit vs fixed widths per column type). Recommendation: fixed widths tuned to expected content (`Référence` 18ch, `Client` 30ch, `Statut` 14ch, money columns 14ch).
- **Freeze header row** (row 1) — recommended yes; trivial in exceljs and standard for tabular data.
- **`MAX_EXPORT_ROWS` upper bound** for D-08 unbounded query. Recommendation: 10000 (defends against pathological cases without surprising real partners).
- **AdminNavCard icon** for `Références LC` on Admin Home. Recommendation: lucide-react `Hash` or `Receipt` (planner picks; check what's already imported).
- **LCDASH-02 exact gate count** — spec says ≥10 total. EXPORT-02 contributes 1 gate; LCDASH-02 contributes at least 1 (list-render scan). Recommendation: 2 LCDASH gates (list render + search result render) for redundancy across query paths, bringing the suite to 11 total.
- **i18n key namespace** for new keys (e.g. `proposals.export.*`, `admin.lcReferences.*`). Planner picks following Phase 17 D-21 verify-and-reuse discipline.
- **Whether to add `data-testid` hooks** on the new export CTA + LC dashboard rows for v1.4+ Playwright tests. Recommendation: yes, cheap and useful (matches Phase 17 D-final discretion).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope + requirements
- `.planning/ROADMAP.md` §"Phase 19: New Capabilities" — phase scope, 4 success criteria, dependencies (Phases 17 + 18)
- `.planning/REQUIREMENTS.md` — EXPORT-01, EXPORT-02, LCDASH-01, LCDASH-02 full text
- `.planning/MILESTONES.md` §v1.3 — milestone goals + cross-cutting invariants
- `.planning/v1.3-CARRYFORWARD.md` — v1.2 → v1.3 carry-forward decisions

### Cross-cutting invariants
- `.planning/ROADMAP.md` §"v1.3 Cross-Cutting Invariants" — light+dark pair discipline (invariant #1, applies to all Phase 19 UI surfaces), ADMIN-09 D-12 envelope + 9-gate baseline (invariant #2, Phase 19 monotonically extends to ≥10), palette stability (invariant #3, no new tokens in Phase 19)

### Codebase analysis (Phase 19 baseline)
- `.planning/codebase/STACK.md` — exceljs lives outside the existing stack; `@react-pdf/renderer` adapter pattern is the model for `src/lib/xlsx/**`
- `.planning/codebase/STRUCTURE.md`, `ARCHITECTURE.md`, `CONVENTIONS.md`, `INTEGRATIONS.md` — pre-Phase-19 baseline (regenerate via `/gsd-map-codebase` if any have drifted since 2026-05-24)
- `eslint.config.mjs` lines 77-81, 130-141 — `no-restricted-imports` OVH-portability pattern to mirror for `exceljs`

### Carry-forward decisions from prior phases (Phase 19 must respect)
- `.planning/phases/17-partner-surfaces/17-CONTEXT.md` — D-03/D-04 lc_ref at draft creation + gap pool accepted; D-13 ProposalsList + buildListResponse reuse pattern; D-19 PageHero `actions` slot pattern; D-21 i18n verify-and-reuse + `_EnHasAllFrKeys` parity proof
- `.planning/phases/18-admin-surfaces/18-CONTEXT.md` — D-07 Recent activity row read-only pattern (LC dashboard rows follow); D-11 `/proposals` admin user_id scoping precedent; D-12 PartnersList cursor pagination; D-14 component+test rename discipline (if renaming any helper); D-27 admin sidebar lock (preserves the 6-item set); D-30 palette stability
- `.planning/phases/14-admin-polish-partners-history-home/14-CONTEXT.md` — D-29 9-gate `tests/admin-09-grep-contracts.test.ts` suite (target of Phase 19 extension); AdminNavCard layout (target of 3 → 4 card extension); StatusChip 5 variants
- `.planning/phases/12-schema-extensions-for-drafts-history/12-CONTEXT.md` — proposals table schema (status enum, soft-delete columns), draft helpers, `deriveDisplayStatus`, partial unique index on `lc_ref WHERE lc_ref IS NOT NULL`
- `.planning/phases/10-cutover-polish/*-CONTEXT.md` — 30-day soft-delete purge cron at `0 3 1,15 * *` (relevant to LCDASH D-12 deleted-row visibility window)
- `.planning/phases/08-persistence-pdf-pipeline/08-CONTEXT.md` — `@react-pdf/renderer` adapter pattern + `server-only` discipline (template for `src/lib/xlsx/**`); audit_log lifecycle-only convention (justifies EXPORT D-04 no-audit decision)

### Source files Phase 19 reads, modifies, or creates
- `tests/admin-09-grep-contracts.test.ts` — 9-gate baseline; Phase 19 adds gate 10 (EXPORT XLSX scan) + 11 (LCDASH render scan, possibly +1 for search-result render)
- `eslint.config.mjs` — add `no-restricted-imports` rule for `exceljs` → `src/lib/xlsx/**`
- `src/lib/pdf/render.ts` — read for adapter pattern reference
- `src/lib/storage/vercel-blob.ts` + `src/lib/storage/s3.ts` — read for OVH-portable driver-selection pattern
- `app/(authed)/proposals/page.tsx` — modify to mount the Export CTA in PageHero actions slot + pass result count for disabled state
- `app/(authed)/proposals/_components/FilterPillRow.tsx` — read to confirm URL-state pattern reused by Server Action
- `src/lib/api/proposals/list.ts` — modify `buildListResponse` to support unbounded export query (or add a parallel `buildExportQuery`)
- `src/lib/i18n/dictionaries.ts` — add ~10 EXPORT keys × FR+EN + ~12 LCDASH keys × FR+EN (after verify-and-reuse check)
- `app/(admin)/[adminSegment]/page.tsx` — modify to extend AdminNavCard grid 3 → 4 cards
- `app/(admin)/[adminSegment]/partners/PartnersList.tsx` — read for styled-table treatment reference (LC dashboard table mirrors)
- `src/components/proposals/ProposalsList.tsx` — read for cursor pagination + StatusChip integration reference
- `src/components/ui/StatusChip.tsx` — reuse verbatim (5 variants cover draft/active/expired/deleted)
- `src/components/ui/AdminNavCard.tsx` — reuse verbatim (4th card instance)
- `src/db/schema.ts` — read for proposals + users table column shapes; no Phase 19 migrations

### New files Phase 19 will create
- `src/lib/xlsx/render.ts` (or `index.ts`) — adapter wrapping exceljs Workbook generation; `import 'server-only'` at top
- `src/lib/xlsx/render.test.ts` — Vitest covering header generation + commission absence + locale formatting
- `src/lib/xlsx/types.ts` — TypeScript types for the export row shape
- `app/(authed)/proposals/_actions/exportProposals.ts` — Server Action returning binary Response
- `app/(authed)/proposals/_actions/exportProposals.test.ts` — Vitest covering scope (filter + search), auth gate, empty-result behavior
- `app/(authed)/proposals/_components/ExportButton.tsx` — client component with disabled state + spinner + toast wiring
- `app/(authed)/proposals/_components/ExportButton.test.tsx` — interaction tests
- `app/(admin)/[adminSegment]/lc-references/page.tsx` — admin SSR table page
- `app/(admin)/[adminSegment]/lc-references/page.test.tsx` — server-component tests
- `app/(admin)/[adminSegment]/lc-references/_components/LcReferencesList.tsx` — client component (styled table + StatusChip + cursor pagination wiring)
- `app/(admin)/[adminSegment]/lc-references/_components/LcReferencesList.test.tsx`
- `src/lib/db/queries/lc-references.ts` (or extension to `proposal-aggregates.ts`) — cross-partner LC query with cursor + search params
- Test fixture: a proposal row with non-zero `commission_pct` used by the EXPORT-02 gate

### Operational
- `package.json` — add `exceljs` to `dependencies` (not dev — runs at request time)
- No environment variable additions
- No new migrations (proposals + users schema already covers everything)
- No new Vercel/Neon resources

### Design contract
- Figma file `vwOzirhL0vyxDWq4m6t4gC` — no dedicated Phase 19 frames exist yet. LC dashboard table styling inherits from `42:46` (Phase 18 PartnersList). Export CTA placement inherits from `9:47` (Phase 17 Partner Home actions slot pattern). `/gsd-ui-phase 19` should either reference these existing frames or commission Phase 19 frames during the UI-SPEC step.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`<PageHero>`** (Phase 16 SHELL-03): `/proposals` already mounts it (Phase 17 D-19). The `actions` slot accepts multiple buttons — Phase 19 adds the Export CTA next to `Nouvelle proposition` (D-06).
- **`<StatusChip>`** (Phase 11/14, 5 variants): LC dashboard rows + the existing `/proposals` table both use it for status display (D-11, D-12, D-17).
- **`<AdminNavCard>`** (Phase 14): Phase 19 adds a 4th instance on Admin Home (D-18). Verify the component supports an arbitrary grid count or extend its parent grid CSS.
- **`PaginationKey` cursor primitive** (Phase 17 17-04 → Phase 18 D-12): LC dashboard reuses for cursor pagination (D-16).
- **`buildListResponse`** (`src/lib/api/proposals/list.ts`): Phase 19 extends for the unbounded export query (D-08) and creates a parallel helper for the cross-partner LC query (D-16) — exact helper boundary is planner's discretion.
- **`deriveDisplayStatus`** (Phase 12, `src/lib/db/queries/proposals.ts`): LC dashboard rows compute their `displayStatus` from row state for StatusChip rendering (D-11).
- **`requireUser()` + admin-role gate** (Phase 6/9): admin page reuses for `/lc-references` (D-19).
- **Phase 18 PartnersList styled table** (`PartnersList.tsx`): visual template for the LC dashboard table (D-17).
- **Sonner toast** (mounted in `app/layout.tsx:56`): export success/failure feedback (D-07).
- **lucide-react** (`Loader2` for spinner, `Hash` / `Receipt` for AdminNavCard icon): D-07, D-18.
- **`server-only` package**: every new file under `src/lib/xlsx/**` and the Server Action import this (mirrors `src/lib/pdf/render.ts:1`).
- **Dictionary parity proof `_EnHasAllFrKeys`** (Phase 6 + Phase 17 D-21): compile-time enforcement of new EXPORT + LCDASH keys.

### Established Patterns
- **OVH-portable adapter discipline** (`eslint.config.mjs:77-81, 130-141`): `@vercel/blob`, `@neondatabase/serverless`, `@react-pdf/renderer`, `@aws-sdk/*` all isolated behind adapter directories. Phase 19 D-02 extends this to `exceljs` → `src/lib/xlsx/**`.
- **Server-component routes with `requireUser()` defense-in-depth** + `export const dynamic = 'force-dynamic'` (Phase 6 onward): LC dashboard route follows (D-19).
- **Cursor-based pagination with `base64({createdAt, id})`** (Phase 8 → 17 → 18): LC dashboard reuses (D-16).
- **ADMIN-09 9-gate grep-contract suite** (`tests/admin-09-grep-contracts.test.ts`, Phase 13 + 14): every new admin/partner-facing surface that touches money data extends the suite. Phase 19 grows it to ≥10 (D-05) + LCDASH gate(s) (D-22 implicit via LCDASH-02 spec).
- **Phase 12 audit_log lifecycle-only convention**: justifies EXPORT D-04 no-audit decision.
- **Phase 18 D-27 sidebar lock**: 6 items, no extensions in Phase 19 (D-18). Discovery via AdminNavCard.
- **Phase 17 D-21 i18n verify-and-reuse**: check existing keys before adding new ones.
- **Verify-and-reuse `_EnHasAllFrKeys` parity proof**: compile-time blocks FR/EN dictionary drift.
- **Light + dark via `data-theme` cascade** (Phase 16, established): all Phase 19 UI inherits dark mode through token cascade with no per-component dark CSS.
- **Sonner toast convention** (Phase 17 + 18): success/failure feedback for one-shot actions.
- **Defensive `dynamic = 'force-dynamic'` on admin pages**: prevents accidental ISR caching of admin data (D-19).

### Integration Points
- **MODIFY:** `app/(authed)/proposals/page.tsx` — mount ExportButton in PageHero `actions` slot; pass SSR-resolved result count + current filter URL state to it (D-06, D-10).
- **MODIFY:** `app/(admin)/[adminSegment]/page.tsx` — extend AdminNavCard grid from 3 → 4 cards (Coefficients / Partenaires / Historique / Références LC) (D-18).
- **MODIFY:** `src/lib/api/proposals/list.ts` — support unbounded export query path (D-08); leave cursor + limit path unchanged for the SSR /proposals render.
- **MODIFY:** `eslint.config.mjs` — add `exceljs` → `src/lib/xlsx/**` to `no-restricted-imports` (D-02).
- **MODIFY:** `tests/admin-09-grep-contracts.test.ts` — add gate 10 (EXPORT XLSX scan, D-05) + gate 11/12 (LCDASH render scans, LCDASH-02).
- **MODIFY:** `src/lib/i18n/dictionaries.ts` — add ~10 EXPORT keys + ~12 LCDASH keys × FR + EN after verify-and-reuse (D-09).
- **CREATE:** `src/lib/xlsx/**` adapter directory + tests (D-02).
- **CREATE:** `app/(authed)/proposals/_actions/exportProposals.ts` + `_components/ExportButton.tsx` + tests (D-03, D-06, D-07).
- **CREATE:** `app/(admin)/[adminSegment]/lc-references/**` page + components + tests (D-19, D-17).
- **CREATE:** `src/lib/db/queries/lc-references.ts` (or extension to `proposal-aggregates.ts`) — cross-partner LC query helper (D-16).
- **OPTIONAL CREATE:** `scripts/check-no-xlsx-leak.sh` — defense-in-depth grep mirroring `check-no-vercel-only-imports.sh` (D-02 — planner picks: extend existing or add new).
- **PACKAGE:** add `exceljs` to `package.json` dependencies (not devDependencies — runs at request time).

</code_context>

<specifics>
## Specific Ideas

- **EXPORT-02 gate code shape** (D-05 reference): roughly
  ```ts
  const buf = await generateProposalsXlsx({ /* fixture with commission_pct: 25 */ })
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buf)
  for (const sheet of wb.worksheets) {
    expect(sheet.name).not.toMatch(/commission/i)
    sheet.eachRow((row) => row.eachCell((cell) => {
      const text = String(cell.value ?? '')
      expect(text).not.toMatch(/commission/i)
    }))
  }
  ```
  Planner refines (header iteration, validating cell address types, etc.). Sits in `tests/admin-09-grep-contracts.test.ts` as gate 10.

- **Export Server Action signature shape** (D-03):
  ```ts
  'use server'
  export async function exportProposalsAction({
    archived, q,
  }: { archived?: boolean; q?: string }): Promise<Response> {
    const session = await requireUser()
    const rows = await buildExportQuery({ userId: session.user.id, archived, q })
    const buf = await generateProposalsXlsx({ rows, locale: session.user.locale })
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="propositions-${todayIso()}.xlsx"`,
      },
    })
  }
  ```
  Note: Next 16 Server Actions returning binary `Response` is supported — verify exact API surface during planning (`mcp__context7__*` Next 16 docs if needed).

- **Filename example:** `propositions-2026-05-25.xlsx` (D-04). ISO date format.

- **LC dashboard row shape** (D-17):
  ```
  Référence       Partenaire        Client            Montant HT    Statut       Créée le
  LC-2026-042     Memento Music     Dupont SARL       12 000 €      [Active]     12/05/2026
  LC-2026-041     Memento Music     Acme Studio       45 000 €      [Brouillon]  10/05/2026
  LC-2026-040     Wayco             Café Central      8 500 €       [Supprimée]  08/05/2026
  ```

- **Empty-state copy** (LC dashboard, D-17 follows Phase 17 17-04 / Phase 18 D-13):
  - Zero references total: `Aucune référence LC pour le moment.` (unlikely to ever hit — would mean zero proposals exist anywhere)
  - Filter/search-empty: `Aucune référence ne correspond à votre recherche.` + `Effacer la recherche →` link

- **`@vercel/blob` is NOT involved** — EXPORT D-03 generates the XLSX in memory and streams via Response. No persistent storage. Each export is ephemeral. Consistent with how PDFs are also rendered on-demand (`src/lib/pdf/render.ts`) and persisted via blob only at finalize.

- **LCDASH SQL outline** (D-11..D-16, illustrative — Drizzle ORM equivalent):
  ```sql
  SELECT p.lc_ref, u.name AS partner_name, p.inputs->>'clientName' AS client_name,
         (p.inputs->>'amountHt')::numeric AS amount_ht, p.status, p.deleted_at,
         p.created_at, p.finalized_at, p.validity_days, p.id
  FROM proposals p
  JOIN users u ON u.id = p.user_id
  WHERE p.lc_ref IS NOT NULL
    AND (
      $q IS NULL OR
      p.lc_ref ILIKE '%' || $q || '%' OR
      u.name ILIKE '%' || $q || '%' OR
      p.inputs->>'clientName' ILIKE '%' || $q || '%'
    )
    AND ($cursor IS NULL OR (p.created_at, p.id) < ($cursorCreatedAt, $cursorId))
  ORDER BY p.created_at DESC, p.id DESC
  LIMIT 21  -- 20 + 1 for hasMore detection
  ```
  Status derivation (active/draft/expired/deleted) happens via `deriveDisplayStatus` per row at render time.

- **AdminNavCard 4th card copy** (D-18): card title `Références LC`, description e.g. `Voir toutes les références LC émises par les partenaires`. Icon: lucide-react `Hash` (or `Receipt`).

- **MAX_EXPORT_ROWS** suggestion: 10000 — sane upper bound that defends against pathological cases without surprising real partners (largest current partner has <50 proposals; 200x buffer).

- **Worksheet name suggestion** (D-09 Claude discretion): `Propositions` single-locale fine; partners open one sheet.

</specifics>

<deferred>
## Deferred Ideas

- **Cross-partner admin read view of `/proposals/[id]`** (ADMIN-FUT-01) — Phase 19 LC dashboard rows are read-only because this scope is v1.4+. When this lands, LC dashboard rows can become clickable links.
- **LC numbering scheme `/aide` article** documenting LC-YYYY-NNN format, sequence allocation timing (draft-creation per Phase 17 D-03), gap-tolerance — candidate for HELP-02.
- **Project amount as a searchable field** on LC dashboard — awkward UX with numeric inputs; only add if a real workflow surfaces.
- **Streaming XLSX writer** (`exceljs` `WorkbookWriter`) — defer until profiling shows in-memory generation is insufficient for actual partner datasets. Current max <100 proposals/partner; in-memory is fine.
- **`proposal.export` audit_log event type** — rejected for Phase 19 (D-04). If compliance need surfaces (e.g., privacy policy requires it), revisit as part of a Phase 21 / v1.4+ audit-trail expansion.
- **Sidebar 7th item for LC dashboard** — explicitly NOT shipped in Phase 19 (D-18 preserves Phase 18 D-27 lock). If usage data later shows the AdminNavCard surface is too hidden, revisit in v1.4+.
- **Bulk operations on LC dashboard rows** (e.g. CSV export of references, batch status filter) — out of scope; defer.
- **LC dashboard status-filter pills** (`Tous / Actifs / Brouillons / Expirées / Supprimées`) — not in Phase 19. Current single search field is sufficient; add filter pills if admin workflows demonstrate need.
- **Per-partner LC dashboard view** (`/partners/[id]/lc-references` showing one partner's references only) — admins can already filter the central dashboard by partner name; per-partner view is redundant for v1.3.
- **XLSX cell-level Coefficient format experimentation** (raw `3.69%` string vs Excel native percent on `0.0369`) — planner's discretion during execution per D-09 Claude discretion note.
- **PDF export from `/proposals`** (bulk PDF zip of all proposals matching filter) — different concern from XLSX; not in scope; defer to v1.4+ if requested.
- **`scripts/check-no-xlsx-leak.sh` defense-in-depth grep** — planner picks during D-02 implementation whether to extend the existing `check-no-vercel-only-imports.sh` or add a new script. Deferred to plan-phase decision.

</deferred>

---

*Phase: 19-new-capabilities*
*Context gathered: 2026-05-25*
