# Phase 19: New Capabilities - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 19-new-capabilities
**Areas discussed:** XLSX library + server pipeline, Export trigger UX on /proposals, LC dashboard scope + behavior, Navigation + plan split

---

## XLSX library + server pipeline

### Q1: Which XLSX library should we use for server-side generation?

| Option | Description | Selected |
|--------|-------------|----------|
| exceljs (Recommended) | MIT, pure-Node, no native deps, supports streaming for large workbooks, mature API, OVH-portable. ~3.5M weekly downloads. Used by most enterprise XLSX server-render pipelines. | ✓ |
| write-excel-file | MIT, write-only, ~10x smaller bundle, simpler API. Good fit if we only ever write (not read). Less mature for advanced cell formatting (currency, dates) but our 10-column spec is straightforward. | |
| xlsx (SheetJS Community) | Apache 2.0 but SheetJS removed itself from npm in 2024 — install requires their CDN URL in package.json which breaks `npm ci` in clean CI environments. Strongly NOT recommended. | |

**User's choice:** exceljs
**Notes:** Locked under `src/lib/xlsx/**` with ESLint guard mirroring the `@react-pdf/renderer` → `src/lib/pdf/**` pattern from `eslint.config.mjs:77-81, 130-141`.

### Q2: How should the export request be served?

| Option | Description | Selected |
|--------|-------------|----------|
| Server Action returning Response (Recommended) | Next 16 Server Actions can return Response with binary body + Content-Disposition. Matches Phase 13 wizard's server-action discipline. No new /api/* route surface to gate. Audit trail flows through the existing server-action logger. | ✓ |
| Route Handler at /api/proposals/export | Mirrors Phase 8 PDF pipeline at /api/proposals/[id]/pdf. Easier to curl / smoke-test independently. Adds a new /api surface that must be auth-gated explicitly via proxy.ts and requireUser(). | |
| Streaming Response (exceljs streamingXlsx writer) | Only worth it if export sizes might exceed ~10MB. For internal tool with <100 proposals per partner, plain in-memory generation is simpler. Defer until profiling shows a need. | |

**User's choice:** Server Action returning Response

### Q3: What should the downloaded filename look like?

| Option | Description | Selected |
|--------|-------------|----------|
| propositions-{YYYY-MM-DD}.xlsx (Recommended) | Short, sortable in the partner's Downloads folder. No filter indicator. FR-only filename — EN partners get the same since 'propositions' is recognizable. | ✓ |
| propositions-{actives\|archivees}-{YYYY-MM-DD}.xlsx | Filter is visible in the filename. Slightly longer, helps when a partner exports both filters in the same day. | |
| leasetic-propositions-{partner-slug}-{YYYY-MM-DD}-{HHMM}.xlsx | Maximally specific — brand + partner + date + time. Overkill for a single-tenant download but bulletproof against name collisions. | |

**User's choice:** propositions-{YYYY-MM-DD}.xlsx

### Q4: Should XLSX exports write an audit_log entry?

| Option | Description | Selected |
|--------|-------------|----------|
| No — reads don't audit (Recommended) | Phase 12 convention: audit_log only fires at lifecycle transitions. Exports are a read operation on already-persisted data. | ✓ |
| Yes — add proposal.export event | If you want a paper trail for compliance with Thomas's eventual privacy policy. Breaks the lifecycle-only convention. | |

**User's choice:** No — reads don't audit

### Q5: How should the ADMIN-09 EXPORT-02 byte-inspection gate validate XLSX is commission-free?

| Option | Description | Selected |
|--------|-------------|----------|
| Parse + scan all sheets via exceljs reader (Recommended) | Test generates an XLSX with a proposal that has a non-zero commission_pct, opens it with ExcelJS.Workbook().xlsx.read(), iterates all worksheets, cells, sheet names + headers, fails if any matches /commission/i. | ✓ |
| Raw zip-byte substring scan (Buffer.indexOf) | Test loads byte buffer, asserts indexOf('Commission') === -1. Simpler, brittle on attributes / false positives on internal XML. | |
| Both layers | Parser-based + raw-bytes scan. Defense in depth. ~2x test runtime. | |

**User's choice:** Parse + scan all sheets via exceljs reader

---

## Export trigger UX on /proposals

### Q1: Where should the 'Exporter en XLSX' CTA live on /proposals?

| Option | Description | Selected |
|--------|-------------|----------|
| PageHero actions slot (Recommended) | Sits next to existing 'Nouvelle proposition' primary CTA as secondary button. Visible above the fold. Matches Phase 17 D-19 PageHero pattern. | ✓ |
| Filter-pill row, right-aligned | On same row as filter pills and SearchBar. Contextually closer to the filter that determines export scope. Slightly crowded row. | |
| Overflow menu on the table card header | Hidden behind ⋯ button. Hides the feature — partners won't discover it. | |

**User's choice:** PageHero actions slot

### Q2: What should the export button do while generating?

| Option | Description | Selected |
|--------|-------------|----------|
| Disable button + replace label with spinner (Recommended) | Button becomes 'Génération...' + spinner. Browser handles native download. Sonner toast on success. | ✓ |
| Full progress modal | Overlay blocks the page. Overkill for <2s waits. | |
| Optimistic toast only, no button state change | Click fires immediately, toast says 'Export en cours'. Risk: double-click generates twice. | |

**User's choice:** Disable button + replace label with spinner

### Q3: What scope of proposals does the XLSX include?

| Option | Description | Selected |
|--------|-------------|----------|
| Current filter + search query, ALL pages (Recommended) | Reads ?archived= and ?q= from URL, runs buildListResponse query WITHOUT cursor + limit. Returns every match. Matches LCDASH-01 success criteria. | ✓ |
| Current filter only, ignores search query | Exports full Actives or Archivées regardless of SearchBar content. Surprising. | |
| Only what's visible on the current page | Exports only ~20 rows on screen. Cheapest but violates success criteria. | |

**User's choice:** Current filter + search query, ALL pages

### Q4: How should the XLSX content be localized for FR vs EN partners?

| Option | Description | Selected |
|--------|-------------|----------|
| Column headers + status values in user's current language (Recommended) | Reads cookie locale at Server Action. Headers + status translated via t(). Dates Intl.DateTimeFormat(locale). Currency in EUR Intl.NumberFormat. | ✓ |
| FR-only content | Single source of truth in French. Simpler but breaks i18n parity convention enforced by _EnHasAllFrKeys. | |

**User's choice:** Column headers + status values in user's current language

### Q5: What happens when the partner clicks export with zero matching proposals?

| Option | Description | Selected |
|--------|-------------|----------|
| Button disabled when result count = 0 (Recommended) | The /proposals page already knows the count from SSR. Pass as prop; disabled + tooltip 'Aucune proposition à exporter'. | ✓ |
| Generate an empty XLSX with headers only | Button always enabled; produces valid file with zero rows. Less surprising but creates useless artifact. | |
| Toast 'Aucune proposition à exporter' on click + no download | Button enabled, click triggers no-op toast. Hybrid. | |

**User's choice:** Button disabled when result count = 0

---

## LC dashboard scope + behavior

### Q1: Should the LC dashboard include draft proposals (lc_ref allocated, never finalized)?

| Option | Description | Selected |
|--------|-------------|----------|
| Include drafts with explicit 'Brouillon' status chip (Recommended) | Drafts have real lc_ref values reserved — dashboard's job is to show 'every issued reference'. Each gets `<StatusChip variant="draft">`. Matches success criteria literally. | ✓ |
| Only finalized proposals (status active / expired / deleted) | Hides drafts. Surprising once admins know drafts hold lc_ref. | |
| Include drafts with a separate toggle pill 'Inclure les brouillons' | Default = finalized only; pill reveals on demand. Adds UI complexity. | |

**User's choice:** Include drafts with explicit 'Brouillon' status chip

### Q2: What should the dashboard do with soft-deleted proposals (deleted_at IS NOT NULL, still in 30-day purge window)?

| Option | Description | Selected |
|--------|-------------|----------|
| Include with 'Supprimée' status chip (Recommended) | Same logic as drafts. Disappears after Phase 10 purge cron hard-deletes. 'Every issued reference' wording supports inclusion. | ✓ |
| Exclude entirely | Hides soft-deleted rows. Surprising for admins investigating deleted proposals. | |
| Include behind an 'Inclure supprimées' toggle pill | Default hides them; pill reveals on demand. Adds UI for a rare case. | |

**User's choice:** Include with 'Supprimée' status chip

### Q3: What does clicking a row do?

| Option | Description | Selected |
|--------|-------------|----------|
| Read-only list — no click target (Recommended) | Rows static, like Phase 18 D-07 Recent activity row. Defers cross-partner detail-view scope (ADMIN-FUT-01) to v1.4+. | ✓ |
| Click → cross-partner /proposals/[id] admin read view | Net-new admin read-view scope. Likely doubles the phase scope. ADMIN-FUT-01 v1.4+ territory. | |
| Click opens a tiny modal preview | Compromise — adds modal scope, not in spec. | |

**User's choice:** Read-only list — no click target

### Q4: What should the search field match against?

| Option | Description | Selected |
|--------|-------------|----------|
| Reference + partner name + client name (Recommended) | Spec lists reference + partner name; adding client name is tiny cost with high admin workflow value. | ✓ |
| Reference + partner name only (strict to spec) | Matches LCDASH-01 wording exactly. Lower risk of scope creep but admins will quickly want client search. | |
| Reference only | Single-field lookup. Too narrow once dataset grows. | |

**User's choice:** Reference + partner name + client name

### Q5: What's the default sort?

| Option | Description | Selected |
|--------|-------------|----------|
| created_at DESC (most recent first) (Recommended) | Same default as /proposals partner view. Recent activity most relevant. | ✓ |
| lc_ref DESC (newest reference first) | Treats reference number as recency signal. Conceptually noisier. | |
| lc_ref ASC (oldest first) | Audit-trail ordering. Useful for sequence-gap investigation but worse daily. | |

**User's choice:** created_at DESC

---

## Navigation + plan split

### Q1: Where does the LC dashboard appear in admin navigation?

| Option | Description | Selected |
|--------|-------------|----------|
| 4th AdminNavCard on Admin Home only (Recommended) | Preserves Phase 18 D-27 sidebar lock. Extends Admin Home grid 3 → 4 cards. | ✓ |
| Both: 7th sidebar item AND 4th AdminNavCard | Maximum discoverability. Re-opens the Phase 18 sidebar decision. | |
| 7th sidebar item only, no Admin Home AdminNavCard change | Simpler but loses Admin Home visual cohesion. | |

**User's choice:** 4th AdminNavCard on Admin Home only

### Q2: How should Phase 19 split into plans?

| Option | Description | Selected |
|--------|-------------|----------|
| Two plans: 19-01 EXPORT + 19-02 LCDASH (Recommended) | Different concerns. Matches Phase 17/18 plan-split discipline. Each plan extends ADMIN-09 separately. | ✓ |
| One bundled plan 19-01 covering both | Smaller phase. Harder to review/bisect; halves don't share code. | |
| Three plans: 19-01 EXPORT + 19-02 LCDASH + 19-03 closeout | Mirrors Phase 17-08 / 18-07 closeout pattern. Optional. | |

**User's choice:** Two plans: 19-01 EXPORT + 19-02 LCDASH

### Q3: Should we run /gsd-ui-phase 19 before /gsd-plan-phase 19?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — UI hint = yes per ROADMAP (Recommended) | Phase 19 UI hint is yes. LC dashboard is brand-new admin surface needing UI-SPEC. /gsd-ui-phase produces design contract before planning. | ✓ |
| Skip — reuse Phase 17 + 18 patterns directly | Save the round-trip if patterns cover everything. Risk: LC dashboard has unique cross-partner columns. | |

**User's choice:** Yes — UI hint = yes per ROADMAP

---

## Claude's Discretion

The following areas were explicitly left to planner discretion:
- `exceljs` cell formatting choices per column (currency native vs string, percent format, date type)
- Worksheet name (recommend `Propositions`)
- Column widths (recommend fixed per type)
- Freeze header row (recommend yes)
- `MAX_EXPORT_ROWS` upper bound (recommend 10000)
- AdminNavCard icon for Références LC (recommend lucide-react `Hash` or `Receipt`)
- Exact LCDASH-02 gate count (recommend 2 gates: list render + search result render)
- i18n key namespace structure following Phase 17 D-21 verify-and-reuse discipline
- `data-testid` hooks for future Playwright tests (recommend yes)
- Whether to extend `scripts/check-no-vercel-only-imports.sh` or add new `scripts/check-no-xlsx-leak.sh`

## Deferred Ideas

See CONTEXT.md `<deferred>` section. Notable items:
- Cross-partner admin read view of `/proposals/[id]` (ADMIN-FUT-01, v1.4+)
- LC numbering scheme `/aide` article (candidate for HELP-02)
- Project amount searchable on LC dashboard (only if real need surfaces)
- Streaming XLSX writer (defer until profiling shows in-memory insufficient)
- `proposal.export` audit_log event type (rejected this phase; revisit if compliance demands)
- Sidebar 7th item for LC dashboard (revisit if AdminNavCard discovery proves too hidden)
- Bulk operations on LC dashboard rows (CSV export, batch status filter)
- LC dashboard status-filter pills (revisit if workflows demonstrate need)
- Per-partner LC dashboard view at `/partners/[id]/lc-references` (redundant for v1.3)
- PDF bulk export from /proposals (different concern; v1.4+)

---
