# Phase 8: Persistence + PDF Pipeline — Context

**Gathered:** 2026-05-09
**Status:** Ready for planning
**Inherits from:** Phase 6 CONTEXT (06-auth-shell), Phase 7 CONTEXT (07-calc-engine-port-proposal-form), Phase 5 architecture (research/ARCHITECTURE.md), milestone v1.1

<domain>
## Phase Boundary

Turn Phase 7's no-op submit (D-7-07) into a real persistence + PDF pipeline. A partner submits the form; the system server-side-validates, server-side-recomputes, snapshots the current `global_params` row + inputs + computed values into a new `proposals` row, renders a single-page PDF via `@react-pdf/renderer`, uploads it to private blob storage, and redirects to `/proposals/{id}`. The partner can browse their last-20 proposals on the home page (cursor-paginated load-more), search by client name + LC ref, view detail (read-only inputs + embedded PDF preview + Download/Duplicate/Delete), duplicate (snapshots current params, not source's), soft-delete (with toast + 'Recently deleted' filter toggle for partner-side recovery), and download the PDF through an auth+ownership-gated stream route.

**In scope (32 requirements: DATA-01..12 + PROP-02, 03, 04, 05, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 26):**

- **Schema work**: `proposals` table (params_snapshot + inputs + computed + schema_version + pdf_blob_key + pdf_sha256 + lc_ref + deleted_at + idempotency_key), `global_params` append-only history table, `audit_log` table. Indexes per DATA-08. CHECK constraints for schema_version semver shape. Migration `0002_*.sql` ordinal.
- **Seed migration (DATA-12)**: Reads from Phase 7's `src/lib/calc/seed-params.ts` constant — same single source of truth. Inserts initial `global_params` row using current placeholder values (D-D1). Idempotent (`ON CONFLICT DO NOTHING`).
- **Server route handler** `POST /api/proposals` (Node runtime, NOT Server Action — PITFALLS §1.3): Zod-parses body via Phase 7's `proposalInputSchema`, server-side `computeLoyer()` (CALC-07 second clause), reads latest `global_params`, INSERTs proposal row, renders PDF, uploads to blob at `proposals/{userId}/{proposalId}.pdf` private, UPDATEs row with `pdf_blob_key + pdf_sha256`, returns `{ id, pdfUrl }`. **Synchronous fail-loud** (D-B1): on any failure after row INSERT, rollback row (set `deleted_at` + audit log) and return error.
- **Idempotency** (D-B2): client-generated UUIDv4 sent as `Idempotency-Key` header; server checks existing proposal with matching key+user_id, returns same id if found.
- **PDF render** (`src/lib/pdf/`): single-page `<Document>` with `@react-pdf/renderer`. Header (Leasétic logo + LC ref + creation date) + client info block + computation breakdown (montant HT × commission × coefficient = loyer) + validity caption + minimal footer (LC ref + page number) per D-A3. Self-hosted Plus Jakarta Sans woff2 (PROP-19). Explicit `Intl` locales `fr-FR` / `en-GB` (PROP-18). Renders in partner's `session.user.language` at gen time (D-A2 — committed once, immutable).
- **PDF byte-determinism CI gate (PROP-17)**: `__pdf-fixtures__/expected.sha256.txt` holds canonical hashes for ≥1 fixture proposal across both langs. CI fails on drift. Update workflow: `npm run pdf:update-fixture` regenerates the file when intentional rendering changes happen.
- **Stream route** `GET /api/proposals/{id}/pdf` (Node runtime): `requireUser()` + ownership check (`proposal.user_id === session.user.id`), then stream the blob bytes through. Never expose raw blob URL (PROP-13).
- **Detail page** `/proposals/{id}`: server-component, `requireUser()` + ownership, renders inputs (read-only) + computed values + validity status + LC reference + creation date + language + Download (link to `/api/proposals/{id}/pdf`) + Duplicate (link to `/proposals/new?duplicate=<id>`) + Delete buttons. Embedded PDF preview via `<embed src="/api/proposals/{id}/pdf">` or PDF.js (PROP-12 — planner picks).
- **Home page list (PROP-02..05, 20)**: replaces Phase 7's empty-state shell with cursor-based pagination ("Load more" button, cursor = `(created_at, id)` of last visible row — D-C1). Each row: client name + LC ref + montant HT + creation date + validity status (active/expired chip). Search bar with **debounced as-you-type** input (300ms — D-C2), URL reflects `?q=...`. Server-side ILIKE query on `client_name + lc_ref`. Empty-state copy for new partners.
- **Soft-delete UX (PROP-22, DATA-10)**: Click Delete → row row's `deleted_at = now()` + audit log entry → row disappears from default list → sonner toast "Proposition supprimée". List has a **'Voir supprimées' toggle (D-C3)** that shows soft-deleted rows in the 30-day window with a Restore button (clears `deleted_at`, audit log entry). After 30 days, scheduled job hard-purges (blob delete + row delete + audit log). PDF blob is removed at hard-purge time per DATA-10 (NOT preserved for the 10-year window — DATA-11 only protects PDFs from admin-side partner *deactivation*, not from partner-side soft-delete).
- **Duplicate flow (PROP-21)**: Click Duplicate on detail page → routes to `/proposals/new?duplicate=<id>` → form prefills from source's `inputs` jsonb (NOT the snapshot — fresh user-typed values shape) → on save, snapshots **current** `global_params` (not source's). New proposal generates a NEW `lc_ref`. Optional: planner adds `duplicated_from_id uuid` column for audit (not required by PROP-21, but cheap and useful — planner discretion).
- **schema_version (DATA-04)**: text column, semver string starting at `'1.0.0'` (D-D3). CHECK constraint validates `^\d+\.\d+\.\d+$`. Bump rules:
  - **MAJOR** on calc formula change (e.g., new tranche, formula structure shift)
  - **MINOR** on PDF layout change (visual restructure)
  - **PATCH** on copy-only changes
  Old proposals always render with their version's renderer (preserved in git history); future renderers branch on the major component.

**Out of scope for this phase (deferred to Phase 9 / 10 / v1.2):**
- Admin coefficients editor UI (Phase 9 — ADMIN-01..04 owns it; Phase 8 only ships the table + initial seed row).
- Admin partner-list UI (Phase 9 — ADMIN-05..06).
- Admin audit log viewer (Phase 9 — ADMIN-07).
- Validity expiry email notifications (PROP-26 only requires the *indicator* on detail page — passive copy "Valid until DD/MM/YYYY" or "Expired"; no notifications).
- 30-day soft-delete hard-purge cron job *implementation* — Phase 8 ships the schema + manual CLI runner (`npm run purge:soft-deleted`); the **scheduled** job is a Phase 10 ops task (CUT-08 territory). Phase 8 is data-correct from day 1; Phase 10 automates.
- 10-year PDF retention cron job — Phase 10 (legal counsel sign-off pending — Open Q3).
- Partner can edit a saved proposal — explicit non-feature (PROP-23: PDF immutability invariant). Edits = duplicate + delete original.
- Phase 5 follow-up Neon branch-split — handled as separate ops task (D-D2), NOT a Phase 8 plan.
- Phase 6 follow-up admin password rotation — separate ops task before first real partner is onboarded.
- Mobile-optimized list/detail views — v1.2 candidate.

</domain>

<decisions>
## Implementation Decisions

### Phase 8 PDF rendering decisions (gathered 2026-05-09 — newly locked)

- **D-A1 (PDF visual fidelity — PROP-15, 16):** **Professional, not v10-equivalent.** Single-page `<Document>` with own clean layout. Don't translate v10's `@media print` CSS into `@react-pdf/renderer`'s flexbox-ish subset (PITFALLS §4.3 estimates 5-10x more layout work). Per PROP-15, v10's RSE second page is already explicitly removed. Layout target: header (logo + LC ref + creation date) + client info block + computation breakdown + loyer feature + validity caption + minimal footer. Bilingual rendering per session lang (D-A2). Planner produces a pixel-spec in 08-UI-SPEC.md; UI-checker verifies brand-system token reuse.
- **D-A2 (PDF language at gen time):** PDF rendered in `session.user.language` at the moment of generation (FR or EN). Each PDF is single-language; the language is committed by the snapshot and never changes. Stored as `proposals.language text NOT NULL`. Future re-render = same language. Partner switches lang → only future PDFs follow.
- **D-A3 (PDF footer scope — minimal):** LC reference + creation date + page number. NO mentions légales (legal copy not coupled to PDF render — Leasétic IT/Legal supplies via email template if needed). NO signature line (partners-print-and-sign workflow not in scope; signature lives on the email/PDF cover or separate document). Reduces legal-coupling risk; legal sign-off (Open Q3) pertains to retention period, not footer text.

### Phase 8 submit flow decisions (gathered 2026-05-09)

- **D-B1 (Failure semantics — PDF render/upload failure after row INSERT):** **Synchronous fail-loud.** `POST /api/proposals` flow:
  1. Validate via `proposalInputSchema.parse(body)`
  2. Server-side `computeLoyer({...})` (CALC-07 — never trust client-displayed values)
  3. Read latest `global_params` row → snapshot into `params_snapshot`
  4. INSERT `proposals` row (deleted_at NULL, pdf_blob_key NULL, pdf_sha256 NULL)
  5. Render PDF via `lib/pdf`
  6. Upload to blob at `proposals/{userId}/{proposalId}.pdf` private
  7. UPDATE row with `pdf_blob_key + pdf_sha256`
  8. Return `{ id, pdfUrl }` → client redirects to `/proposals/{id}`
  
  On any failure between steps 4–7: set `deleted_at = now()` on the row, write an audit_log entry with `action: 'proposal_create_failed'`, return HTTP 500 + sonner.error to the partner. Rationale: keeps the data clean (no orphaned rows, no orphaned blobs), avoids the operational complexity of a job runner, and PDF render is deterministic (failure modes are timeouts or blob auth issues, not flaky logic). Partners retry by re-submitting; the idempotency key (D-B2) makes retries safe.
- **D-B2 (Idempotency):** **Client-generated UUIDv4** sent as `Idempotency-Key` header. Form generates the UUID on mount (`useState(() => crypto.randomUUID())`); the same key persists across re-renders and back-button navigations within the form session. Server checks for existing `proposals` row with `(idempotency_key = ?, user_id = ?)`; returns existing id if found (200 OK + same `{ id, pdfUrl }` shape). Ensures double-clicks, network retries, and back-button-then-resubmit don't create duplicates. `proposals.idempotency_key text NOT NULL` with unique constraint `(user_id, idempotency_key)` (allows same key across users — meaningless collision but prevents global-uniqueness lookups).
- **D-B3 (Progress UI):** Sonner loading toast pattern. Click Generate → form disables → `sonner.loading('Génération du PDF en cours...')`. On success → `sonner.success('Proposition créée')` + `router.push('/proposals/{id}')`. On error → `sonner.error('Erreur lors de la génération — veuillez réessayer')` + form re-enabled. No full-page skeleton, no inline spinner alone. Matches Phase 6/7 sonner discipline.

### Phase 8 list / search / soft-delete UX decisions

- **D-C1 (Pagination — PROP-05):** **Cursor-based 'Load more' button.** Cursor = `(created_at, id)` tuple of the last visible row. Server query: `WHERE user_id = ? AND deleted_at IS NULL AND (created_at, id) < (?, ?) ORDER BY created_at DESC, id DESC LIMIT 21`. Returns up to 21 rows; if 21 returned, set `hasMore: true` and slice to 20 for response. URL stable (no `?page=` query). Stable under concurrent inserts.
- **D-C2 (Search trigger — PROP-20):** **Debounced as-you-type, 300ms** (matches Phase 7's live-preview debounce). URL reflects `?q=<input>` for back-button + sharing. Server query: `WHERE user_id = ? AND deleted_at IS NULL AND (client_name ILIKE ? OR lc_ref ILIKE ?) ORDER BY ...` with `%term%` wrapping. No trigram extension in v1.1 — partners' proposal counts are <100s; ILIKE plain is plenty. Empty `q` = no search filter applied.
- **D-C3 (Soft-delete UX — PROP-22, DATA-10):** **Toast confirmation + 'Recently deleted' filter toggle on home list.** Click Delete on detail page → `sonner.success('Proposition supprimée')` + redirect to home → row gone from default list. Home list has a 'Voir supprimées' / 'Show deleted' toggle (button or switch) that swaps the query to `WHERE deleted_at IS NOT NULL AND deleted_at > now() - interval '30 days'` and shows a Restore button per row. Restore → unset `deleted_at` + audit log entry. After 30 days, the manual purge CLI (Phase 8) or the scheduled job (Phase 10) hard-purges blob + row.
  - PDF blob is REMOVED at hard-purge time per DATA-10. DATA-11's "10-year retention regardless of partner deactivation" applies to **admin-disabling-a-partner-account** (which sets `users.deleted_at` per Phase 6 D-23), NOT to **partner-soft-deleting-their-own-proposal**. The two have different code paths.

### Phase 8 schema + launch ordering decisions

- **D-D1 (Seed coefficients in DATA-12 migration):** **Ship Phase 8 with Phase 7's placeholder values.** The seed migration imports the same `seedParams` constant from `src/lib/calc/seed-params.ts` (single source of truth across phases per Phase 7 D-2). Placeholders are clearly flagged with `// TODO: confirm against v10 baseline before CUT-06`. Phase 8 testing produces PDFs with placeholder loyer values — acceptable for internal smoke. Real partners are NOT onboarded until Phase 9 admin UI ships AND admin has edited values to canonical baseline (Antoine extracts from a known-good partner's localStorage `lt_coeffs` OR provides the canonical set out-of-band). Path forward documented in Phase 7 carry-forward note.
- **D-D2 (Phase 5 follow-up: Neon branch split):** **Treat as a separate ops task before the first Phase 8 prod deploy.** NOT a Phase 8 plan. Antoine sets per-scope `DATABASE_URL` in Vercel: production → `main` Neon branch pooled endpoint, preview → `preview` branch, development → `development` branch. ~30min ops task. Documented as a Phase 8 launch-checklist item but not in scope of any plan. The healthz endpoint (Phase 5) already validates DB connectivity per scope; a future Phase 9/10 hardening could add a hostname-vs-expected-branch check, but Phase 8 doesn't need it.
- **D-D3 (`schema_version` shape — DATA-04):** **Semver string starting at `'1.0.0'`.** Text column with CHECK constraint `schema_version ~ '^\d+\.\d+\.\d+$'`. Bump rules:
  - **MAJOR** — calc formula change (a new tranche threshold added; the multiplication kernel changes; commission semantics shift). Old proposals route to old major-version renderer. v1.1 starts and likely stays at major `1`.
  - **MINOR** — PDF layout change (visual restructure, header reorder, footer rewrite). Old proposals render with old minor-version layout component. Branch on `major.minor`.
  - **PATCH** — copy-only changes (i18n key edits, label tweaks). Old and new proposals render identically functionally; copy is read from current dictionary at render time so PATCH bumps reflect reality without forcing per-version dictionaries.

### Implicit decisions (planner discretion — not asked)

- **proposals FK to users(id)**: `ON DELETE RESTRICT`. Per Phase 6 D-23, users are NEVER hard-deleted (admin disables = `deleted_at` set, session_version bump). Restrict matches the invariant.
- **audit_log shape**: `(id uuid pk, actor_id uuid fk users, action text, target_type text, target_id uuid, payload jsonb, created_at timestamptz default now())`. Partial indexes `(actor_id, created_at desc)` and `(target_type, target_id, created_at desc)`. Phase 8 only WRITES; Phase 9 ADMIN-07 reads.
- **lc_ref uniqueness**: NOT globally unique (collisions across users are possible — `LC-12345` random 5-digit). Add unique constraint `(user_id, lc_ref)` so within a user's space they're stable. Cross-user collisions are fine since search filters by user_id.
- **idempotency_key duration**: stored permanently on the row. No TTL. If a partner generates two distinct proposals with mistakenly-same key (browser bug), the second is rejected as duplicate — that's correct behavior.
- **PDF preview embedding**: planner picks `<embed src="/api/proposals/{id}/pdf">` (browser-native, simplest, works in Chrome+Edge per project's browser scope) over PDF.js (heavyweight, would add ~400KB JS). Phase 9/10 can swap if the embed UX proves insufficient.
- **`duplicated_from_id` column**: planner discretion to add. Cheap (one nullable uuid FK), useful for audit. Recommend YES.
- **search ILIKE pattern**: server wraps user input with `%`-escapes to prevent ReDoS-style issues. No raw user input concatenation.
- **language column on proposals**: `text NOT NULL` with CHECK `language IN ('fr', 'en')`. Captured from `session.user.language` at INSERT time.
- **Phase 7 ProposalForm submit hook**: D-7-07 said "no-op + info toast". Phase 8 replaces the body of `onSubmit` in `src/components/proposal/ProposalForm.tsx` (or in `ProposalFormProvider` per Path A) with a `fetch('/api/proposals', { headers: { 'Idempotency-Key': idempotencyKey } })` call. The `coefficientsExpired={false}` swap point at `app/(authed)/proposals/new/page.tsx:88` flips to a server-side `globalParams.q` freshness check (Phase 8 owns the staleness logic; Phase 9 D-7-12 provides the admin-edit pathway).

</decisions>

<canonical_refs>
## Canonical References (downstream agents must read)

### Project & milestone (must read for context)
- `.planning/PROJECT.md` — milestone goal, locked decisions log (PDF library, immutability strategy, retention)
- `.planning/REQUIREMENTS.md` — DATA-01..12, PROP-02..05, PROP-09..23, PROP-26 (32 reqs)
- `.planning/STATE.md` — current state, Phase 5/6 follow-ups, open questions

### Phase 8 design contract (will be produced by /gsd-ui-phase 8 next)
- `.planning/phases/08-persistence-pdf-pipeline/08-UI-SPEC.md` — proposal detail page, list view with search + 'Recently deleted' toggle, PDF visual layout

### Architecture & pitfalls (must read before planning)
- `.planning/research/ARCHITECTURE.md` — §2.5 (PDF immutability decision matrix, locked at A), §3.0 (PDF rendering pipeline location/timing/library), §4 (jsonb shape patterns)
- `.planning/research/PITFALLS.md` — §1.3 (Server Action vs Route Handler — Route Handler chosen), §3.3 (snapshot-at-creation invariant), §3.4 (proposals index for list query), §4.3 (`@react-pdf/renderer` vs HTML-to-PDF tradeoff — accepted), §4.4 (Plus Jakarta Sans woff2 + document.fonts.ready)
- `.planning/research/STACK.md` — DB/blob adapter signatures, locked deps (drizzle@0.45.2, drizzle-kit@0.31.10)

### Phase 7 deliverables (preserve invariants)
- `.planning/phases/07-calc-engine-port-proposal-form/07-CONTEXT.md` — D-1..D-4 calc-engine specifics; D-7-* form/preview decisions
- `src/lib/calc/index.ts` — public API barrel: `computeLoyer`, `proposalInputSchema`, `getMaxAmount`, `seedParams` (the single source of truth for seed migration)
- `src/lib/calc/seed-params.ts` — placeholder coefficients (D-D1 imports these into the DATA-12 seed migration)
- `src/components/proposal/ProposalForm.tsx` — Phase 7's no-op submit; Phase 8 swaps the onSubmit body to call `/api/proposals` with idempotency key
- `app/(authed)/proposals/new/page.tsx` — `coefficientsExpired={false}` swap point at line ~88; Phase 8 wires real freshness check

### Phase 6 deliverables (preserve invariants)
- `.planning/phases/06-auth-shell/06-CONTEXT.md` — D-05 (Phase 6 deferred proposals/global_params/audit_log to Phase 8), D-23 (users never hard-deleted), D-28 (explicit Intl locales)
- `src/db/schema.ts` — `users` + `password_resets` tables; Phase 8 extends with `proposals`, `global_params`, `audit_log`
- `src/lib/auth/require.ts` — `requireUser()` for ownership checks on `/proposals/{id}` and stream route

### Phase 5 deliverables (preserve invariants)
- `src/lib/db/index.ts` — Drizzle adapter; Phase 8 extends queries here (or in a `src/lib/db/queries/proposals.ts` if planner prefers)
- `src/lib/storage/index.ts` — StorageAdapter interface (PUT/GET/DELETE/STREAM); Phase 8's blob upload + stream route use this
- `drizzle/0001_kind_doctor_faustus.sql` — Phase 6's migration; Phase 8 generates `0002_*.sql` as the next ordinal
- `eslint.config.mjs` — `no-restricted-imports` rules (no @vercel/blob outside lib/storage); Phase 8 stays inside the adapter

### v10 source (reference, not literal port)
- `Matrice_2026_THE_Leasetic-v10.html` — visual reference for PDF layout (NOT translated literally per D-A1); reference for `lt_coeffs` localStorage shape (D-D1)

### External documentation (read on demand)
- `@react-pdf/renderer` docs — `<Document>` / `<Page>` / `<View>` / `<Text>` / `<Image>` / `<Font.register>` API, font loading, deterministic mode caveats
- `drizzle-orm` jsonb support — typing the `params_snapshot`, `inputs`, `computed`, `payload` fields
- Postgres CHECK constraint on text patterns (semver shape)
- Web Crypto API SHA-256 for PDF byte hashing (already familiar from Phase 6 token hashing)

</canonical_refs>

<code_context>
## Reusable Assets & Patterns (from existing codebase)

- **Calc engine** (`src/lib/calc/*`): full public API for server-side recompute (CALC-07), schema reuse (proposalInputSchema), placeholder seed values (DATA-12 source). DO NOT duplicate `proposalInputSchema` — import from `@/lib/calc`.
- **i18n** (`src/lib/i18n/dictionaries.ts`): 263 keys × 2 langs from Phase 6+7. Phase 8 adds keys for: detail page labels, list table column headers, validity active/expired chip copy, search placeholder, soft-delete toast + Recently Deleted toggle + Restore button + duplicate button + download button + 'à retourner signé' (if any), PDF render keys (header date format, computation breakdown labels, validity caption, footer page-number format). Estimated ~30-40 new keys × 2 langs.
- **CSS chrome** (`app/globals.css`): Phase 7 added .card, .btn-green, .btn-out, .btn-navy, .ctitle, .fld, .invalid, .ieu, .dg, .db, .db.on, .yn-btn, .yn-btn.on, .tbadge. Phase 8 reuses these for detail page + list rows. May add: `.chip` (validity active/expired), `.list-row`, `.search-bar`, `.toggle` (Recently Deleted switch).
- **Sonner toasts** (Phase 6): success/info/error/loading. Phase 8 uses loading→success/error pattern for submit (D-B3).
- **`requireUser()` + `getCurrentLang()` + `t()`**: Phase 6 server helpers — every Phase 8 page uses these.
- **Drizzle migration discipline** (Phase 5 + 6): generate-only via `drizzle-kit generate`, never `push`. Phase 8 generates `0002_*.sql`. Migration runs via `scripts/migrate.ts` + `db-migrate.yml` workflow.
- **No `@vercel/*` outside lib/ adapters** (Phase 5 ESLint rule): Phase 8 PDF/blob code lives behind `src/lib/storage/` (existing) and a new `src/lib/pdf/` (new). Adapter discipline preserves OVH portability.
- **Idempotency-Key header pattern**: not currently used in v1.1 — Phase 8 introduces. Standard Stripe convention. Document in `docs/operations/api.md` (Phase 8 doc).
- **PDF font loading**: Plus Jakarta Sans woff2 already self-hosted under `public/fonts/` from Phase 5 02 (Tailwind v4 setup). Phase 8 references via `Font.register({ family: 'Plus Jakarta Sans', src: '/fonts/PlusJakartaSans-Regular.woff2' })`. Verify which weights are present (Phase 5 self-hosted 5 weights per STATE.md).

</code_context>

<deferred>
## Deferred Ideas (out of Phase 8 scope; capture for future)

- **30-day soft-delete hard-purge cron job** — Phase 8 ships the schema + manual CLI runner; the scheduled cron is a Phase 10 ops task (CUT-08 territory). Phase 8 includes a `scripts/purge-soft-deleted.ts` (manual run, typed-confirmation gated) so the data discipline is correct from day 1; Phase 10 wires Vercel Cron / GitHub Actions schedule.
- **10-year PDF retention enforcement** — Phase 10 (legal counsel sign-off pending — Open Q3).
- **Validity expiry email notifications** — PROP-26 only requires the visual indicator; notifications are v1.2.
- **PDF.js embed instead of native `<embed>`** — Phase 8 ships `<embed>`; if browser-compat issues surface (Firefox/Safari quirks beyond the project's stated Chrome+Edge target), Phase 9/10 swaps.
- **Trigram (`pg_trgm`) extension for fuzzy search** — Phase 8 uses plain ILIKE. Partners' proposal counts are <100s; ILIKE is plenty. Phase 11+ if dataset scales.
- **Excel export of proposal list** — explicitly v1.2+ per PROJECT.md "Deferred".
- **Centralized LC reference dashboard** — explicitly v1.2+ per PROJECT.md "Deferred".
- **Mobile-optimized list/detail views** — v1.2 (SHELL-14 carry-forward).
- **`duplicated_from_id` column** — planner discretion to include; recommend YES (cheap, useful for audit), but flag in plan if planner chooses to defer.
- **Phase 5 follow-up: Neon branch split** — separate ops task per D-D2 (NOT a Phase 8 plan).
- **Phase 6 follow-up: admin password rotation** — separate ops task before first real partner is onboarded.
- **Phase 6 follow-up: Better Auth `trustedOrigins` investigation** — Phase 9 hardening candidate (per Phase 6 follow-up #2).

</deferred>

<open_questions>
## Open Questions Carried Forward (resolve before relevant phase)

- **Open Q1 (Cutover ownership)** — Antoine vs Thomas for partner comms (Phase 10 — fire request now).
- **Open Q3 (Legal counsel sign-off on 10-year retention — DATA-11)** — gates Phase 10 CUT-09. Recommend Antoine fires the legal-counsel ask alongside Phase 8 planning so the answer is in hand by Phase 10. Phase 8 itself is unblocked because soft-delete hard-purge handles the 30-day window without needing legal yet.
- **Open Q5 (OVH side stack — managed Postgres + S3-compatible)** — gates Phase 10 CUT-04. Recommend Antoine fires the Leasétic IT ask alongside Phase 8 planning.
- **Phase 7 carry-over: Antoine's canonical coefficients** — Phase 8 is unblocked (D-D1 ships placeholders; Phase 9 admin-edits before partner onboarding). Antoine's extraction work can happen any time before first partner onboard date. NOT a Phase 8 blocker.

</open_questions>

---

*Phase 8 context complete. Decisions: D-A1..A3, D-B1..B3, D-C1..C3, D-D1..D3 (plus implicit decisions in <decisions>). Next: `/gsd-ui-phase 8` for the design contract (proposal detail page, list view with search + Recently Deleted toggle, PDF visual layout), then `/gsd-plan-phase 8` for the executable plans.*
