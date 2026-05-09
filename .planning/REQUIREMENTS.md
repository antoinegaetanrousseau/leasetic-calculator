# Requirements — Milestone v1.1: Hosted Web App Foundation

> **Goal:** Migrate Leasétic Matrice from a single-file standalone HTML to a Vercel-hosted multi-page web application with admin-invited authentication, per-partner persistent PDF proposals, and admin-only global financial parameters — designed for future portability to Leasétic's OVH infrastructure.

**Phase numbering:** v1.0 ended at Phase 4. v1.1 starts at **Phase 5**. Final phase boundaries decided by the roadmapper.

---

## Active Requirements (v1.1)

### BOOT — Bootstrap & Deployment

- [x] **BOOT-01**: Repo initialized as a Next.js (App Router) TypeScript project under a Vercel-deployable structure
- [x] **BOOT-02**: Project deployed to a new Vercel project (under personal scope `antoinerousseau-5272s-projects` for v1.1; transfer to Memento team is a Phase 5 follow-up — does not block functionality)
- [~] **BOOT-03**: Postgres database provisioned via Neon (Vercel Marketplace integration). PARTIAL: single `main` branch shared across Production/Preview/Development scopes; 3-branch split (preview, development off main) is a Phase 5 follow-up. Functionally green for /healthz; isolation upgrade required before Phase 8 PDF storage starts seeing real proposal data.
- [x] **BOOT-04**: Blob storage provisioned (Vercel Blob) with private-access default
- [x] **BOOT-05**: All hosting-provider primitives (blob, DB) accessed exclusively through `lib/storage` and `lib/db` adapter interfaces — no direct `@vercel/*` imports outside those modules
- [x] **BOOT-06**: ESLint + CI grep enforce the no-Vercel-only-primitives rule on every PR
- [x] **BOOT-07**: `next.config.ts` configured with `output: 'standalone'` from the first commit
- [x] **BOOT-08**: Tailwind CSS v4 configured with dark-mode `selector` strategy using `[data-theme='dark']` on `<html>` (matches v10 carry-over and ARCHITECTURE.md §7 for SSR cookie compatibility — no class mutation, no `next-themes`)
- [x] **BOOT-09**: Drizzle ORM 0.45.x + drizzle-kit configured; schema lives in `src/db/schema.ts`; migrations are versioned SQL files committed to git
- [x] **BOOT-10**: Migrations are applied only via an explicit GitHub Action against production — never auto-run on Vercel deploy. Workflow run #25464278518 applied `0000_striped_metal_master.sql` to Neon prod successfully on 2026-05-06. Note: GitHub free-plan + private-repo cannot enforce required-reviewer protection rule on the `production` Environment — typed-confirmation gate (`MIGRATE PROD`) in the dry-run job is the meaningful confirmation step. Plan upgrade or repo-go-public is a Phase 5 follow-up.
- [x] **BOOT-11**: Vitest configured for unit tests; CI runs the suite on every PR
- [x] **BOOT-12**: First deployable artifact: a `/healthz` route that exercises a DB read + blob round-trip and returns `{ db: ok, blob: ok }`. Verified live on 2026-05-06 at https://leasetic-matrice.vercel.app/healthz returning HTTP 200 with `{ db: "ok", blob: "ok" }`.

### AUTH — Authentication & Authorization

- [x] **AUTH-01**: User can log in with email + password via the `/login` page
- [x] **AUTH-02**: User session persists across page reloads (8-hour sliding lifetime; refresh on activity)
- [x] **AUTH-03**: User can log out from the topbar; session cookie cleared
- [x] **AUTH-04**: Login error message is generic ("incorrect email or password") and does not leak whether the email exists (anti-enumeration)
- [x] **AUTH-05**: User on a `(authed)` or `(admin)` route while not logged in is redirected to `/login`
- [x] **AUTH-06**: User on `/login` while already logged in is redirected to `/`
- [x] **AUTH-07**: Admin can create a new partner account (email + display name + language) from the admin accounts page (implemented in plan 06-07's `/[adminSegment]/accounts` page + plan 06-04's `createInvitation` server action; runtime verification deferred to admin seeding on launch day)
- [x] **AUTH-08**: When admin creates a partner, the system generates a one-time invitation URL containing a signed token; admin shares it with the partner out-of-band
- [x] **AUTH-09**: Partner can use the invitation URL once to set their initial password; subsequent uses fail
- [x] **AUTH-10**: Admin can trigger a password reset for any partner; this generates a one-time reset URL the admin shares out-of-band
- [x] **AUTH-11**: Admin can disable a partner account; disabled users cannot log in but their data is preserved
- [x] **AUTH-12**: Admin role is granted only via a CLI script run on the production DB by Antoine — never via the app UI
- [x] **AUTH-13**: Database CHECK constraint enforces `role IN ('partner', 'admin')`
- [x] **AUTH-14**: Admin route segment `/[adminSegment]/...` is gated by `process.env.ADMIN_URL_SEGMENT`; mismatched segments return 404 (not 403) to preserve URL obscurity
- [x] **AUTH-15**: Every admin route, layout, and API handler independently calls `requireAdmin()` server-side — defence in depth
- [x] **AUTH-16**: Forced session revocation works: when admin disables a partner, that partner's existing JWT is invalidated within 5 minutes (via `session_version` field bump checked in JWT callback)
- [x] **AUTH-17**: Passwords stored as argon2id hashes
- [x] **AUTH-18**: All authentication flows use the auth library's official client functions (no custom POST to internal endpoints, preserving CSRF protection)

### SHELL — Multi-page Shell & UX

- [x] **SHELL-01**: App has a top-level shell with topbar (logo + user menu + language toggle + theme toggle) and main content area
- [x] **SHELL-02**: Authenticated users see their display name in the topbar
- [x] **SHELL-03**: Login page is public and uses a minimal layout (no app shell)
- [x] **SHELL-04**: User can toggle between FR and EN; selection persists across sessions via cookie + DB
- [x] **SHELL-05**: i18n dictionary covers all v10 keys (~138 keys × 2 languages, full parity with v10)
- [x] **SHELL-06**: All user-facing strings go through the `t()` helper; ESLint rule flags hardcoded literals in JSX
- [x] **SHELL-07**: User can toggle between light, dark, and system themes; selection persists across sessions via cookie + DB
- [x] **SHELL-08**: Initial paint reflects the user's theme without a flash of incorrect theme (cookie-driven server render + inline `<head>` script)
- [x] **SHELL-09**: Number and date formatting uses explicit locale (`fr-FR` or `en-GB`) — never the system default
- [x] **SHELL-10**: Toast notifications use Sonner; success / info / error variants
- [x] **SHELL-11**: Form validation uses react-hook-form + Zod; the same Zod schema is imported on client (validation) and server (action input parsing)
- [x] **SHELL-12**: Error boundary catches unhandled errors; partners see a generic error page in their language
- [x] **SHELL-13**: 404 page in FR + EN
- [x] **SHELL-14**: Mobile layout degrades gracefully (desktop-first per v1.0 constraint; mobile optimization deferred to v1.2)

### CALC — Calculation Engine Port

- [x] **CALC-01**: v10 calculation formula ported as a pure TypeScript module at `src/lib/calc/` with no React, no I/O, no side effects
- [x] **CALC-02**: Module exports `computeLoyer({ amountHT, durationMonths, validityDays, ... }) → { computed: { loyerHT, coeff, ... } }` matching v10 formula exactly (string-typed boundary per D-4)
- [x] **CALC-03**: Module exports `lookupCoefficient(coefficients, trancheKey, durationMonths) → string | null`
- [x] **CALC-04**: Inputs validated with Zod schemas at the calc-engine boundary (proposalInputSchema + coefficientsSchema + amount/duration/validity schemas)
- [x] **CALC-05**: All v10 self-check fixtures (`assertCalc 6/6`, `assertEscape 8/8`, `assertValidity 6/6`) pass as Vitest tests — CALC-05 satisfied for the two suites that map to v1.1 reality (assertCalc + assertValidity). assertEscape (8/8) is documented-not-ported because v10's `escapeHtml()` exists for innerHTML template-string DOM construction; v1.1 builds DOM via React JSX which escapes children automatically. The non-port comment block at `src/lib/calc/formula.test.ts:13-29` cites v10 lines 2002-2020 + the React-JSX-escapes invariant. Re-evaluate only if a future phase introduces unsafe HTML insertion patterns.
- [x] **CALC-06**: ≥30 representative golden test cases extracted from v10 (input → expected output pairs); CI fails on any drift — 30 cases land in `src/lib/calc/calc.golden.test.ts` (12 happy-path × 4 tranches × 3 durations + 8 boundaries + 4 on-demand + 6 edges); fixture coefficients embedded as local const (D-1 fixture/seed separation); ±0.01 € tolerance; static lexical gate `grep -c "  it(" ≥ 30` defends against silent case removal.
- [~] **CALC-07**: Calc engine runs server-side on save; client-side calculations are for live preview only and are never trusted. PARTIAL (07-05): client-side preview seam grounded — `<LiveLoyerPreview>` calls `computeLoyer(...)` from `@/lib/calc` for live display only; no DB write, no persisted value (D-7-07: Phase-7 onSubmit is a no-op + info toast). Server-side recompute on save is Phase 8 territory (server route will call `proposalInputSchema.parse(req.body)` then `computeLoyer({...})` then write the resulting `params_snapshot + inputs + computed` jsonb to the proposals row — never trusting the client's display value).
- [x] **CALC-08**: Monetary values stored as `numeric(14, 4)` in Postgres; coefficients as `numeric(10, 8)`; conversion handled in a single boundary helper (string-typed boundary discipline per D-4 — parseNumeric/formatNumeric helpers in formula.ts; signature DB-numeric-compatible from day one)

### PROP — Proposal Lifecycle

- [~] **PROP-01**: Authenticated partner sees a home page with a prominent "Create new proposal" CTA. PARTIAL (07-03): empty-state shell grounded (greeting + CTA Link + .card recent-proposals empty-state with FileText icon at `app/(authed)/page.tsx`). Full requirement (with populated row data) blocks on Phase 8 PROP-02..05.
- [x] **PROP-02**: Home page lists the partner's recent proposals (last 20 by default), sorted by creation date descending
- [x] **PROP-03**: Each list row shows: client name, LC reference, montant HT, creation date, validity status (active vs expired)
- [x] **PROP-04**: Empty state on home page for new partners ("No proposals yet — create your first one") in FR + EN
- [x] **PROP-05**: Partner can paginate / "load more" past the first 20
- [x] **PROP-06**: Proposal entry form captures all v10 inputs plus a required `client_name` field for the home-page list — grounded by Plan 07-04: D-7-06 satisfies this by tightening v10's existing `clientCo` (Société cliente) field to required-by-Zod via `proposalInputSchema.clientCo: z.string().min(1, { message: 'error.field.client.co.required' })` (no new field added). The form renders the inline error message via `t(error.field.client.co.required, lang)` on blur.
- [x] **PROP-07**: Form provides live preview of the computed loyer as the partner types — grounded by Plan 07-05: `<LiveLoyerPreview/>` sticky right-column card subscribes to RHF via `useFormContext<ProposalInput>() + useWatch({name: ['amountHT', 'durationMonths', 'validityDays']})`, debounces through `useDebouncedValue(...,300)` (D-7-02), calls `useMemo`-cached `computeLoyer({...})`, renders the formatted loyer via `formatCurrency(Number(loyerHT), lang)` (Phase 6 D-28 explicit fr-FR / en-GB) plus the v10 coefficient suffix `"{N} mois · coeff. {C}%"`. State machine mirrors v10 lines 1425-1454 (idle / expired / missing / on-demand / computed); aria-live="polite" on the computed-state container (UI-SPEC §13).
- [x] **PROP-08**: Form validates on blur (red-ring focus state per v10 pattern) — grounded by Plan 07-04: `useForm({ mode: 'onBlur', shouldFocusError: true })` + `className={errors.field ? 'invalid' : ''}` on each input + `.invalid` red-ring CSS contract from Plan 07-03's globals.css. All required fields show inline error message via `<p role="alert" className="error-msg">` on blur.
- [x] **PROP-09**: On submit, the system: validates inputs, computes server-side, snapshots current global params + inputs into a new `proposals` row, generates the PDF, uploads to blob, returns the proposal ID
- [x] **PROP-10**: After save, partner is redirected to `/proposals/{id}` (post-redirect-get pattern)
- [x] **PROP-11**: Proposal detail page shows: read-only inputs, computed values, validity status, LC reference, language, creation date, "Download PDF" button, "Duplicate" button, "Delete" button
- [x] **PROP-12**: Proposal detail page embeds a PDF preview (`<embed>` or PDF.js)
- [x] **PROP-13**: PDF download streams through `/api/proposals/{id}/pdf` (auth + ownership check, signed URL or direct stream — never raw blob URL)
- [x] **PROP-14**: PDF stored in blob at key `proposals/{userId}/{proposalId}.pdf` with `private` access
- [x] **PROP-15**: PDF is **a single page** (financial offer only); v10's RSE second page is removed in v1.1
- [x] **PROP-16**: PDF rendered with `@react-pdf/renderer` using a deterministic configuration (pinned font files, fixed metadata, no `Date.now()` calls in the render tree)
- [x] **PROP-17**: PDF byte-determinism gated by CI: a fixture proposal renders to a SHA-256 matching a committed expected hash
- [x] **PROP-18**: PDF generation uses `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })` and `Intl.DateTimeFormat('fr-FR' | 'en-GB')` explicitly — never system defaults
- [x] **PROP-19**: Plus Jakarta Sans woff2 files self-hosted under `public/fonts/`; PDF generation waits for `document.fonts.ready` before render
- [x] **PROP-20**: Partner can search their proposals by client name or LC reference (ILIKE, case-insensitive)
- [x] **PROP-21**: Partner can duplicate a proposal: button on detail page → routes to `/proposals/new` with form values pre-filled from the source proposal; on save, the new proposal snapshots **current** global params (not the source's)
- [x] **PROP-22**: Partner can soft-delete a proposal (sets `deleted_at`); soft-deleted proposals are hidden from default list but PDF remains in blob storage
- [x] **PROP-23**: Once a proposal is saved, neither its inputs, computed values, nor PDF can be retroactively modified — even by future coefficient changes (PDF immutability invariant)
- [x] **PROP-24**: "Copier la référence" (LC clipboard button) preserved from v10 — grounded by Plan 07-05: `<CopyRefButton lcRef={lcRef} lang={lang}/>` calls `navigator.clipboard.writeText(lcRef)` from a user-gesture button click; on success switches the label/icon to "Référence copiée" + lucide Check for 2 seconds then auto-reverts (`useEffect` setTimeout cleanup), AND fires sonner success toast `proposal.toast.copy.success`; on failure (insecure context, browser denies) fires sonner error toast `proposal.toast.copy.error` plus a Range/Selection-API fallback selecting the LC ref text node so the user can Cmd+C manually. LC reference itself generated via `generateLcRef()` (port of v10 line 1741: `'LC-' + Math.floor(Math.random() * 90000 + 10000)`); lifecycle owned by `<LiveLoyerPreview>` (generated once on idle→non-idle transition; held until form reset; regenerated on next non-idle).
- [x] **PROP-25**: Configurable proposal validity (15 / 30 / 60 days) preserved from v10 — grounded by Plan 07-05: `<ValiditySegmented lang={lang} value={validityDays} onChange={...}/>` lives inside `<LiveLoyerPreview/>` (D-7-04 places it in the preview card, not the form column); thin wrapper around Plan 07-04's `DurationSegmented<15|30|60>` (D-7-16 — one shared component, two configurations); writes back to RHF's `validityDays` field via `setValue('validityDays', v, { shouldDirty: true })`. Default 30 (D-7-05 — applied at the schema level via `validityDaysSchema.default(30)` and the form's defaultValues). The "Valable {N} jours" caption renders only in the `'computed'` state per UI-SPEC §3.2.10.
- [x] **PROP-26**: Validity expiry indicator on proposal detail page (e.g., "Valid until DD/MM/YYYY" or "Expired")

### DATA — Data Model & PDF Immutability

- [x] **DATA-01**: `proposals` table stores a deep-copy `params_snapshot` jsonb of the global params in force at creation time
- [x] **DATA-02**: `proposals` table stores `inputs` jsonb with all form values
- [x] **DATA-03**: `proposals` table stores `computed` jsonb with all derived values used by the PDF
- [x] **DATA-04**: `proposals.schema_version` field present from day one; bumped whenever the calc formula or PDF layout changes; old proposals routed to old renderers based on this field
- [x] **DATA-05**: `global_params` table is append-only (history of admin edits); each row has `effective_from`, `created_by`, the actual values, and an optional admin note
- [x] **DATA-06**: New proposals read the most-recent `global_params` row at creation time (single read, then inlined into snapshot)
- [x] **DATA-07**: `audit_log` table records all admin mutations (params updates, account creates, proposal deletes, role grants)
- [x] **DATA-08**: `proposals` index on `(user_id, created_at desc)` for the home-page query
- [x] **DATA-09**: `proposals.pdf_sha256` stored at generation time and never recomputed
- [x] **DATA-10**: Soft-deleted proposals retained for 30 days, then hard-purged by a scheduled job (sets blob delete + row delete + audit log entry)
- [x] **DATA-11**: PDFs themselves are retained for 10 years minimum (French commercial-document retention) regardless of partner deactivation; partner deactivation never deletes PDFs
- [x] **DATA-12**: Coefficient seed migration inserts v10 baseline values; idempotent (`ON CONFLICT DO NOTHING`); runs in dev / preview / prod identically

### ADMIN — Admin Surface

- [x] **ADMIN-01**: Admin can view current global coefficients, commission rate, max threshold, and validity options on the admin coefficients page
- [x] **ADMIN-02**: Admin can edit any of the above; saving creates a new `global_params` row (append-only history)
- [x] **ADMIN-03**: Save action shows a confirmation modal: "This affects all NEW proposals from now on. Existing proposals are unchanged. Confirm?"
- [x] **ADMIN-04**: Coefficient change history is visible on the admin page as a table (timestamp, admin, fields changed, optional note)
- [x] **ADMIN-05**: Admin can list all partners (email, display name, status active/disabled, last login, created date)
- [x] **ADMIN-06**: Admin can disable / re-enable a partner account
- [ ] **ADMIN-07**: Admin's hidden URL segment is set via `ADMIN_URL_SEGMENT` env var; rotatable without code changes
- [x] **ADMIN-08**: Admin actions log to the `audit_log` table (actor, action type, target, payload, timestamp)
- [x] **ADMIN-09**: Commission values do not appear anywhere admin-visible except in the deliberate "explain calculation" debug tool (which runs in admin's browser only, no DB write)

### CUT — Cutover & Polish

- [ ] **CUT-01**: v10 standalone HTML retired at v1.1 launch; partners cannot use v10 in production after launch
- [ ] **CUT-02**: v10's hosting URL (if any) redirects to v1.1 login page with a "Leasétic Matrice has moved" notice in FR + EN
- [ ] **CUT-03**: No automated migration of v10 localStorage data; partners onboarded clean-slate by Leasétic admin
- [ ] **CUT-04**: All test partner accounts deleted from production DB before launch (rows with `is_test=true` are purged in a pre-launch checklist step)
- [ ] **CUT-05**: Login page links to Leasétic's existing privacy notice (FR + EN URLs); legal counsel confirms the new processing activity (PDF storage) is covered by the existing policy
- [ ] **CUT-06**: Coefficient seed migration verified in production before partners get access (admin first-login checklist: "Vérifier les coefficients" with a diff tool against v10 baseline)
- [ ] **CUT-07**: Production observability: platform logs (Vercel) cover all server errors; Sentry/APM deferred to v1.2
- [ ] **CUT-08**: README + `docs/deploy-ovh.md` runbook covers env vars, build steps, migration application, smoke tests
- [ ] **CUT-09**: OVH portability proven via smoke deploy: same code deploys on a Node + Postgres + S3-compatible test environment with only env-var changes (no code changes)

---

## Future Requirements (deferred to v1.2+)

- Excel export of proposal portfolio
- Webhook notifications to Leasétic on each proposal generation
- Centralized LC reference dashboard
- Partner self-service password reset (requires SMTP / transactional email)
- Mobile-optimized layout
- Multi-language beyond FR + EN
- Automated browser tests (Playwright E2E)
- 2FA / MFA
- Account lockout after N failed login attempts
- Audit log UI (visible audit-log table for admin)
- Filter proposals by date range / by client
- Archive / unarchive proposals
- Rename proposal (internal label)
- CSV export of partner's own proposals
- Email-the-PDF directly from app
- PDF digital signature (PAdES)
- Sentry / Datadog observability
- OVH production deployment (v1.1 ships only the *portability proof*, not the actual prod cutover to OVH)
- Admin cross-partner proposal read view (deferred — single-admin scope makes manual support workable for v1.1)

---

## Out of Scope (explicit exclusions)

- **Editing a saved proposal's inputs and regenerating the PDF** — violates immutability invariant. Partners create a new proposal (use Duplicate).
- **Versioning ("v1, v2, v3 of this proposal")** — proposals are atomic, immutable financial offers.
- **Sharing a proposal with another partner** — partner data is siloed by design.
- **Public share links** — would introduce a hosted-URL auth surface; partners deliver PDFs out-of-band.
- **Comments / annotations on a saved proposal** — mutable layer on an immutable object.
- **Status workflow ("draft → sent → accepted")** — CRM territory.
- **Multi-admin with different permission tiers** — single admin per the milestone scope.
- **Per-partner customization of coefficients** — explicitly removed in v1.1 (global params only).
- **Self-signup / "Create an account" page** — partners are curated; admin-invited only.
- **Social SSO / Google login / Microsoft SSO** — partners are admin-invited; SSO adds attack surface with no value here.
- **"Remember me" checkbox on login** — default persistence handles this.
- **CAPTCHA on login** — overkill for tens of users.
- **In-app changelog / "what's new" notice** — release notes via email or static page.
- **Workspaces / team abstractions** — single seat per partner.
- **Pricing / billing UI** — partners don't pay; channel-partner relationships are out-of-band.
- **Support widget (Intercom, Zendesk)** — email is fine for this scale.
- **Multi-currency** — EUR only.
- **Storing PDFs in Postgres as bytea** — kills connection memory; PDFs live in blob storage.
- **Full RBAC framework** — two roles (partner / admin) is a `role` column, not an RBAC framework.
- **PDF mutability via "regenerate from inputs"** — bug fixes apply to *new* proposals only; old PDFs remain as legal artifacts.
- **Page 2 RSE content from v10** — removed in v1.1; PDFs are single-page financial offers only.

---

## Open Questions (to resolve before relevant phase)

1. **Cutover plan ownership** — Antoine vs Thomas for partner comms, single-date vs phased rollout. Decide before Phase 10 (cutover).
2. **Existing v10 form schema** — does it already capture a structured "client name" field, or only LC reference? Affects PROP-06 implementation. Verify by reading v10 HTML in Phase 7 (calc + form).
3. **Leasétic legal counsel sign-off** on 10-year retention period for IT-leasing pre-contractual documents (PROP / DATA-11). Resolve before Phase 10.
4. **Auth library version pinning matrix** — exact versions of Better Auth + Drizzle adapter + Next.js + React at the moment of Phase 5 bootstrap. Pin no-carets and document.
5. **OVH side stack** — managed Postgres provider (OVH Managed PG vs Scaleway vs self-host), S3-compatible blob (OVH Object Storage assumed). Confirm with Leasétic IT before Phase 10 smoke deploy.
6. **Admin role provisioning** — who has admin role at launch? Antoine + Thomas? Or just Antoine with Thomas added later? Affects AUTH-12 CLI script.

---

## Traceability

**Phase mapping (108/108 requirements covered, no orphans, no double-mapping).**

| Phase | Title | Requirement count | REQ-IDs |
|---|---|---|---|
| 5 | Bootstrap & Deploy | 12 | BOOT-01..12 |
| 6 | Auth & Shell | 32 | AUTH-01..18, SHELL-01..14 |
| 7 | Calc Engine Port + Proposal Form | 14 | CALC-01..08, PROP-01, PROP-06, PROP-07, PROP-08, PROP-24, PROP-25 |
| 8 | Persistence + PDF Pipeline | 32 | DATA-01..12, PROP-02, PROP-03, PROP-04, PROP-05, PROP-09, PROP-10, PROP-11, PROP-12, PROP-13, PROP-14, PROP-15, PROP-16, PROP-17, PROP-18, PROP-19, PROP-20, PROP-21, PROP-22, PROP-23, PROP-26 |
| 9 | Admin Surface | 9 | ADMIN-01..09 |
| 10 | Cutover & Polish | 9 | CUT-01..09 |
| **Total** | | **108** | |

### Per-requirement table

| Requirement | Phase | Status |
|---|---|---|
| BOOT-01 | Phase 5 | Pending |
| BOOT-02 | Phase 5 | Pending |
| BOOT-03 | Phase 5 | Pending |
| BOOT-04 | Phase 5 | Pending |
| BOOT-05 | Phase 5 | Pending |
| BOOT-06 | Phase 5 | Complete (05-05) |
| BOOT-07 | Phase 5 | Pending |
| BOOT-08 | Phase 5 | Complete (05-02) |
| BOOT-09 | Phase 5 | Pending |
| BOOT-10 | Phase 5 | Pending |
| BOOT-11 | Phase 5 | Complete (05-05) |
| BOOT-12 | Phase 5 | Pending |
| AUTH-01 | Phase 6 | Complete (06-05) |
| AUTH-02 | Phase 6 | Pending |
| AUTH-03 | Phase 6 | Complete (06-06) |
| AUTH-04 | Phase 6 | Complete (06-05) |
| AUTH-05 | Phase 6 | Pending |
| AUTH-06 | Phase 6 | Pending |
| AUTH-07 | Phase 6 | Pending |
| AUTH-08 | Phase 6 | Complete (06-05) |
| AUTH-09 | Phase 6 | Complete (06-05) |
| AUTH-10 | Phase 6 | Complete (06-05) |
| AUTH-11 | Phase 6 | Pending |
| AUTH-12 | Phase 6 | Pending |
| AUTH-13 | Phase 6 | Pending |
| AUTH-14 | Phase 6 | Complete (06-07) |
| AUTH-15 | Phase 6 | Complete (06-07) |
| AUTH-16 | Phase 6 | Pending |
| AUTH-17 | Phase 6 | Pending |
| AUTH-18 | Phase 6 | Complete (06-05) |
| SHELL-01 | Phase 6 | Complete (06-06) |
| SHELL-02 | Phase 6 | Complete (06-06) |
| SHELL-03 | Phase 6 | Complete (06-05) |
| SHELL-04 | Phase 6 | Complete (06-06) |
| SHELL-05 | Phase 6 | Complete (06-02) |
| SHELL-06 | Phase 6 | Complete (06-02) |
| SHELL-07 | Phase 6 | Complete (06-06) |
| SHELL-08 | Phase 6 | Complete (06-06) |
| SHELL-09 | Phase 6 | Complete (06-02) |
| SHELL-10 | Phase 6 | Complete (06-05) |
| SHELL-11 | Phase 6 | Complete (06-05) |
| SHELL-12 | Phase 6 | Complete (06-08) |
| SHELL-13 | Phase 6 | Complete (06-08) |
| SHELL-14 | Phase 6 | Complete (06-05) |
| CALC-01 | Phase 7 | Complete (07-01) |
| CALC-02 | Phase 7 | Complete (07-01) |
| CALC-03 | Phase 7 | Complete (07-01) |
| CALC-04 | Phase 7 | Complete (07-01) |
| CALC-05 | Phase 7 | Complete (07-02) |
| CALC-06 | Phase 7 | Complete (07-02) |
| CALC-07 | Phase 7 | Partial (07-05 — client preview seam shipped; server recompute is Phase 8) |
| CALC-08 | Phase 7 | Complete (07-01) |
| PROP-01 | Phase 7 | Partial (07-03 — empty-state shell shipped; populated rows block on Phase 8) |
| PROP-02 | Phase 8 | Complete |
| PROP-03 | Phase 8 | Complete |
| PROP-04 | Phase 8 | Complete |
| PROP-05 | Phase 8 | Complete |
| PROP-06 | Phase 7 | Pending |
| PROP-07 | Phase 7 | Complete (07-05) |
| PROP-08 | Phase 7 | Pending |
| PROP-09 | Phase 8 | Complete |
| PROP-10 | Phase 8 | Complete |
| PROP-11 | Phase 8 | Complete |
| PROP-12 | Phase 8 | Complete |
| PROP-13 | Phase 8 | Complete |
| PROP-14 | Phase 8 | Complete |
| PROP-15 | Phase 8 | Complete |
| PROP-16 | Phase 8 | Complete |
| PROP-17 | Phase 8 | Complete |
| PROP-18 | Phase 8 | Complete |
| PROP-19 | Phase 8 | Complete |
| PROP-20 | Phase 8 | Complete |
| PROP-21 | Phase 8 | Complete |
| PROP-22 | Phase 8 | Complete |
| PROP-23 | Phase 8 | Complete |
| PROP-24 | Phase 7 | Complete (07-05) |
| PROP-25 | Phase 7 | Complete (07-05) |
| PROP-26 | Phase 8 | Complete |
| DATA-01 | Phase 8 | Complete |
| DATA-02 | Phase 8 | Complete |
| DATA-03 | Phase 8 | Complete |
| DATA-04 | Phase 8 | Complete |
| DATA-05 | Phase 8 | Complete |
| DATA-06 | Phase 8 | Complete |
| DATA-07 | Phase 8 | Complete |
| DATA-08 | Phase 8 | Complete |
| DATA-09 | Phase 8 | Complete |
| DATA-10 | Phase 8 | Complete |
| DATA-11 | Phase 8 | Complete |
| DATA-12 | Phase 8 | Complete |
| ADMIN-01 | Phase 9 | Complete |
| ADMIN-02 | Phase 9 | Complete |
| ADMIN-03 | Phase 9 | Complete |
| ADMIN-04 | Phase 9 | Complete |
| ADMIN-05 | Phase 9 | Complete |
| ADMIN-06 | Phase 9 | Complete |
| ADMIN-07 | Phase 9 | Pending |
| ADMIN-08 | Phase 9 | Complete |
| ADMIN-09 | Phase 9 | Complete |
| CUT-01 | Phase 10 | Pending |
| CUT-02 | Phase 10 | Pending |
| CUT-03 | Phase 10 | Pending |
| CUT-04 | Phase 10 | Pending |
| CUT-05 | Phase 10 | Pending |
| CUT-06 | Phase 10 | Pending |
| CUT-07 | Phase 10 | Pending |
| CUT-08 | Phase 10 | Pending |
| CUT-09 | Phase 10 | Pending |

### Mapping rationale (where the boundaries got drawn)

- **PROP-15 (single-page PDF) lives in Phase 8** because that's where PDF rendering begins. Phase 7 has no PDF.
- **PROP-01 (home page CTA) lives in Phase 7**, not Phase 8, because the home page exists from Phase 7 onward as the landing for authenticated partners; Phase 8 then *populates* it (PROP-02..05). The empty CTA satisfies PROP-01; the populated list satisfies PROP-02..05.
- **PROP-06/07/08 (form / live preview / blur validation) live in Phase 7** because they're the user-visible surface of the calc engine; the form exists end-to-end in Phase 7 minus the submit-handler-that-saves which is added in Phase 8 (PROP-09).
- **PROP-24/25 (copy-LC, validity options) live in Phase 7** because they're form-local UI, not persistence concerns.
- **All 12 DATA reqs live in Phase 8** including DATA-12 (coefficient seed migration). The seed migration is *file-authored* in Phase 8 and *verified in production* in Phase 10 (CUT-06); the requirement itself is satisfied when the migration file exists and applies idempotently.
- **AUTH-07..11 (admin partner-management flows) live in Phase 6** alongside the rest of AUTH because they're auth-system features, not "admin surface" features. Phase 9's admin surface focuses on coefficients/audit/listings; the *invitation* and *reset* primitives are part of the auth library wiring done in Phase 6. Phase 9 then surfaces ADMIN-05/06 (list & disable) as UI affordances over those primitives.
- **ADMIN-09 (commission invisibility)** is a Phase 9 requirement but is also a *cross-cutting constraint* every phase must respect. Listed once in Phase 9 because that's where the explicit "explain calculation" debug tool ships and where the redacting logger is introduced, but PR review in every phase should enforce it.

---

*Generated: 2026-05-06.*
*Traceability filled: 2026-05-05 by roadmapper.*
