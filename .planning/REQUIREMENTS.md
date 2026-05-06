# Requirements — Milestone v1.1: Hosted Web App Foundation

> **Goal:** Migrate Leasétic Matrice from a single-file standalone HTML to a Vercel-hosted multi-page web application with admin-invited authentication, per-partner persistent PDF proposals, and admin-only global financial parameters — designed for future portability to Leasétic's OVH infrastructure.

**Phase numbering:** v1.0 ended at Phase 4. v1.1 starts at **Phase 5**. Final phase boundaries decided by the roadmapper.

---

## Active Requirements (v1.1)

### BOOT — Bootstrap & Deployment

- [ ] **BOOT-01**: Repo initialized as a Next.js (App Router) TypeScript project under a Vercel-deployable structure
- [ ] **BOOT-02**: Project deployed to a new Vercel project (separate from Memento Hub) under the existing Memento Vercel team
- [ ] **BOOT-03**: Postgres database provisioned via Neon (Vercel Marketplace integration) with separate dev / preview / prod databases
- [x] **BOOT-04**: Blob storage provisioned (Vercel Blob) with private-access default
- [x] **BOOT-05**: All hosting-provider primitives (blob, DB) accessed exclusively through `lib/storage` and `lib/db` adapter interfaces — no direct `@vercel/*` imports outside those modules
- [x] **BOOT-06**: ESLint + CI grep enforce the no-Vercel-only-primitives rule on every PR
- [ ] **BOOT-07**: `next.config.ts` configured with `output: 'standalone'` from the first commit
- [x] **BOOT-08**: Tailwind CSS v4 configured with dark-mode `selector` strategy using `[data-theme='dark']` on `<html>` (matches v10 carry-over and ARCHITECTURE.md §7 for SSR cookie compatibility — no class mutation, no `next-themes`)
- [x] **BOOT-09**: Drizzle ORM 0.45.x + drizzle-kit configured; schema lives in `src/db/schema.ts`; migrations are versioned SQL files committed to git
- [ ] **BOOT-10**: Migrations are applied only via an explicit GitHub Action against production — never auto-run on Vercel deploy
- [x] **BOOT-11**: Vitest configured for unit tests; CI runs the suite on every PR
- [ ] **BOOT-12**: First deployable artifact: a `/healthz` route that exercises a DB read + blob round-trip and returns `{ db: ok, blob: ok }`

### AUTH — Authentication & Authorization

- [ ] **AUTH-01**: User can log in with email + password via the `/login` page
- [ ] **AUTH-02**: User session persists across page reloads (8-hour sliding lifetime; refresh on activity)
- [ ] **AUTH-03**: User can log out from the topbar; session cookie cleared
- [ ] **AUTH-04**: Login error message is generic ("incorrect email or password") and does not leak whether the email exists (anti-enumeration)
- [ ] **AUTH-05**: User on a `(authed)` or `(admin)` route while not logged in is redirected to `/login`
- [ ] **AUTH-06**: User on `/login` while already logged in is redirected to `/`
- [ ] **AUTH-07**: Admin can create a new partner account (email + display name + language) from the admin accounts page
- [ ] **AUTH-08**: When admin creates a partner, the system generates a one-time invitation URL containing a signed token; admin shares it with the partner out-of-band
- [ ] **AUTH-09**: Partner can use the invitation URL once to set their initial password; subsequent uses fail
- [ ] **AUTH-10**: Admin can trigger a password reset for any partner; this generates a one-time reset URL the admin shares out-of-band
- [ ] **AUTH-11**: Admin can disable a partner account; disabled users cannot log in but their data is preserved
- [ ] **AUTH-12**: Admin role is granted only via a CLI script run on the production DB by Antoine — never via the app UI
- [ ] **AUTH-13**: Database CHECK constraint enforces `role IN ('partner', 'admin')`
- [ ] **AUTH-14**: Admin route segment `/[adminSegment]/...` is gated by `process.env.ADMIN_URL_SEGMENT`; mismatched segments return 404 (not 403) to preserve URL obscurity
- [ ] **AUTH-15**: Every admin route, layout, and API handler independently calls `requireAdmin()` server-side — defence in depth
- [ ] **AUTH-16**: Forced session revocation works: when admin disables a partner, that partner's existing JWT is invalidated within 5 minutes (via `session_version` field bump checked in JWT callback)
- [ ] **AUTH-17**: Passwords stored as argon2id hashes
- [ ] **AUTH-18**: All authentication flows use the auth library's official client functions (no custom POST to internal endpoints, preserving CSRF protection)

### SHELL — Multi-page Shell & UX

- [ ] **SHELL-01**: App has a top-level shell with topbar (logo + user menu + language toggle + theme toggle) and main content area
- [ ] **SHELL-02**: Authenticated users see their display name in the topbar
- [ ] **SHELL-03**: Login page is public and uses a minimal layout (no app shell)
- [ ] **SHELL-04**: User can toggle between FR and EN; selection persists across sessions via cookie + DB
- [ ] **SHELL-05**: i18n dictionary covers all v10 keys (~138 keys × 2 languages, full parity with v10)
- [ ] **SHELL-06**: All user-facing strings go through the `t()` helper; ESLint rule flags hardcoded literals in JSX
- [ ] **SHELL-07**: User can toggle between light, dark, and system themes; selection persists across sessions via cookie + DB
- [ ] **SHELL-08**: Initial paint reflects the user's theme without a flash of incorrect theme (cookie-driven server render + inline `<head>` script)
- [ ] **SHELL-09**: Number and date formatting uses explicit locale (`fr-FR` or `en-GB`) — never the system default
- [ ] **SHELL-10**: Toast notifications use Sonner; success / info / error variants
- [ ] **SHELL-11**: Form validation uses react-hook-form + Zod; the same Zod schema is imported on client (validation) and server (action input parsing)
- [ ] **SHELL-12**: Error boundary catches unhandled errors; partners see a generic error page in their language
- [ ] **SHELL-13**: 404 page in FR + EN
- [ ] **SHELL-14**: Mobile layout degrades gracefully (desktop-first per v1.0 constraint; mobile optimization deferred to v1.2)

### CALC — Calculation Engine Port

- [ ] **CALC-01**: v10 calculation formula ported as a pure TypeScript module at `src/lib/calc.ts` with no React, no I/O, no side effects
- [ ] **CALC-02**: Module exports `computeLoyer({ montantHT, commissionPct, coefficient }) → { loyer }` matching v10 formula exactly
- [ ] **CALC-03**: Module exports `lookupCoefficient(coefficients, qtr) → number`
- [ ] **CALC-04**: Inputs validated with Zod schemas at the calc-engine boundary
- [ ] **CALC-05**: All v10 self-check fixtures (`assertCalc 6/6`, `assertEscape 8/8`, `assertValidity 6/6`) pass as Vitest tests
- [ ] **CALC-06**: ≥30 representative golden test cases extracted from v10 (input → expected output pairs); CI fails on any drift
- [ ] **CALC-07**: Calc engine runs server-side on save; client-side calculations are for live preview only and are never trusted
- [ ] **CALC-08**: Monetary values stored as `numeric(14, 4)` in Postgres; coefficients as `numeric(10, 8)`; conversion handled in a single boundary helper

### PROP — Proposal Lifecycle

- [ ] **PROP-01**: Authenticated partner sees a home page with a prominent "Create new proposal" CTA
- [ ] **PROP-02**: Home page lists the partner's recent proposals (last 20 by default), sorted by creation date descending
- [ ] **PROP-03**: Each list row shows: client name, LC reference, montant HT, creation date, validity status (active vs expired)
- [ ] **PROP-04**: Empty state on home page for new partners ("No proposals yet — create your first one") in FR + EN
- [ ] **PROP-05**: Partner can paginate / "load more" past the first 20
- [ ] **PROP-06**: Proposal entry form captures all v10 inputs plus a required `client_name` field for the home-page list
- [ ] **PROP-07**: Form provides live preview of the computed loyer as the partner types
- [ ] **PROP-08**: Form validates on blur (red-ring focus state per v10 pattern)
- [ ] **PROP-09**: On submit, the system: validates inputs, computes server-side, snapshots current global params + inputs into a new `proposals` row, generates the PDF, uploads to blob, returns the proposal ID
- [ ] **PROP-10**: After save, partner is redirected to `/proposals/{id}` (post-redirect-get pattern)
- [ ] **PROP-11**: Proposal detail page shows: read-only inputs, computed values, validity status, LC reference, language, creation date, "Download PDF" button, "Duplicate" button, "Delete" button
- [ ] **PROP-12**: Proposal detail page embeds a PDF preview (`<embed>` or PDF.js)
- [ ] **PROP-13**: PDF download streams through `/api/proposals/{id}/pdf` (auth + ownership check, signed URL or direct stream — never raw blob URL)
- [ ] **PROP-14**: PDF stored in blob at key `proposals/{userId}/{proposalId}.pdf` with `private` access
- [ ] **PROP-15**: PDF is **a single page** (financial offer only); v10's RSE second page is removed in v1.1
- [ ] **PROP-16**: PDF rendered with `@react-pdf/renderer` using a deterministic configuration (pinned font files, fixed metadata, no `Date.now()` calls in the render tree)
- [ ] **PROP-17**: PDF byte-determinism gated by CI: a fixture proposal renders to a SHA-256 matching a committed expected hash
- [ ] **PROP-18**: PDF generation uses `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })` and `Intl.DateTimeFormat('fr-FR' | 'en-GB')` explicitly — never system defaults
- [ ] **PROP-19**: Plus Jakarta Sans woff2 files self-hosted under `public/fonts/`; PDF generation waits for `document.fonts.ready` before render
- [ ] **PROP-20**: Partner can search their proposals by client name or LC reference (ILIKE, case-insensitive)
- [ ] **PROP-21**: Partner can duplicate a proposal: button on detail page → routes to `/proposals/new` with form values pre-filled from the source proposal; on save, the new proposal snapshots **current** global params (not the source's)
- [ ] **PROP-22**: Partner can soft-delete a proposal (sets `deleted_at`); soft-deleted proposals are hidden from default list but PDF remains in blob storage
- [ ] **PROP-23**: Once a proposal is saved, neither its inputs, computed values, nor PDF can be retroactively modified — even by future coefficient changes (PDF immutability invariant)
- [ ] **PROP-24**: "Copier la référence" (LC clipboard button) preserved from v10
- [ ] **PROP-25**: Configurable proposal validity (15 / 30 / 60 days) preserved from v10
- [ ] **PROP-26**: Validity expiry indicator on proposal detail page (e.g., "Valid until DD/MM/YYYY" or "Expired")

### DATA — Data Model & PDF Immutability

- [ ] **DATA-01**: `proposals` table stores a deep-copy `params_snapshot` jsonb of the global params in force at creation time
- [ ] **DATA-02**: `proposals` table stores `inputs` jsonb with all form values
- [ ] **DATA-03**: `proposals` table stores `computed` jsonb with all derived values used by the PDF
- [ ] **DATA-04**: `proposals.schema_version` field present from day one; bumped whenever the calc formula or PDF layout changes; old proposals routed to old renderers based on this field
- [ ] **DATA-05**: `global_params` table is append-only (history of admin edits); each row has `effective_from`, `created_by`, the actual values, and an optional admin note
- [ ] **DATA-06**: New proposals read the most-recent `global_params` row at creation time (single read, then inlined into snapshot)
- [ ] **DATA-07**: `audit_log` table records all admin mutations (params updates, account creates, proposal deletes, role grants)
- [ ] **DATA-08**: `proposals` index on `(user_id, created_at desc)` for the home-page query
- [ ] **DATA-09**: `proposals.pdf_sha256` stored at generation time and never recomputed
- [ ] **DATA-10**: Soft-deleted proposals retained for 30 days, then hard-purged by a scheduled job (sets blob delete + row delete + audit log entry)
- [ ] **DATA-11**: PDFs themselves are retained for 10 years minimum (French commercial-document retention) regardless of partner deactivation; partner deactivation never deletes PDFs
- [ ] **DATA-12**: Coefficient seed migration inserts v10 baseline values; idempotent (`ON CONFLICT DO NOTHING`); runs in dev / preview / prod identically

### ADMIN — Admin Surface

- [ ] **ADMIN-01**: Admin can view current global coefficients, commission rate, max threshold, and validity options on the admin coefficients page
- [ ] **ADMIN-02**: Admin can edit any of the above; saving creates a new `global_params` row (append-only history)
- [ ] **ADMIN-03**: Save action shows a confirmation modal: "This affects all NEW proposals from now on. Existing proposals are unchanged. Confirm?"
- [ ] **ADMIN-04**: Coefficient change history is visible on the admin page as a table (timestamp, admin, fields changed, optional note)
- [ ] **ADMIN-05**: Admin can list all partners (email, display name, status active/disabled, last login, created date)
- [ ] **ADMIN-06**: Admin can disable / re-enable a partner account
- [ ] **ADMIN-07**: Admin's hidden URL segment is set via `ADMIN_URL_SEGMENT` env var; rotatable without code changes
- [ ] **ADMIN-08**: Admin actions log to the `audit_log` table (actor, action type, target, payload, timestamp)
- [ ] **ADMIN-09**: Commission values do not appear anywhere admin-visible except in the deliberate "explain calculation" debug tool (which runs in admin's browser only, no DB write)

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
| AUTH-01 | Phase 6 | Pending |
| AUTH-02 | Phase 6 | Pending |
| AUTH-03 | Phase 6 | Pending |
| AUTH-04 | Phase 6 | Pending |
| AUTH-05 | Phase 6 | Pending |
| AUTH-06 | Phase 6 | Pending |
| AUTH-07 | Phase 6 | Pending |
| AUTH-08 | Phase 6 | Pending |
| AUTH-09 | Phase 6 | Pending |
| AUTH-10 | Phase 6 | Pending |
| AUTH-11 | Phase 6 | Pending |
| AUTH-12 | Phase 6 | Pending |
| AUTH-13 | Phase 6 | Pending |
| AUTH-14 | Phase 6 | Pending |
| AUTH-15 | Phase 6 | Pending |
| AUTH-16 | Phase 6 | Pending |
| AUTH-17 | Phase 6 | Pending |
| AUTH-18 | Phase 6 | Pending |
| SHELL-01 | Phase 6 | Pending |
| SHELL-02 | Phase 6 | Pending |
| SHELL-03 | Phase 6 | Pending |
| SHELL-04 | Phase 6 | Pending |
| SHELL-05 | Phase 6 | Pending |
| SHELL-06 | Phase 6 | Pending |
| SHELL-07 | Phase 6 | Pending |
| SHELL-08 | Phase 6 | Pending |
| SHELL-09 | Phase 6 | Pending |
| SHELL-10 | Phase 6 | Pending |
| SHELL-11 | Phase 6 | Pending |
| SHELL-12 | Phase 6 | Pending |
| SHELL-13 | Phase 6 | Pending |
| SHELL-14 | Phase 6 | Pending |
| CALC-01 | Phase 7 | Pending |
| CALC-02 | Phase 7 | Pending |
| CALC-03 | Phase 7 | Pending |
| CALC-04 | Phase 7 | Pending |
| CALC-05 | Phase 7 | Pending |
| CALC-06 | Phase 7 | Pending |
| CALC-07 | Phase 7 | Pending |
| CALC-08 | Phase 7 | Pending |
| PROP-01 | Phase 7 | Pending |
| PROP-02 | Phase 8 | Pending |
| PROP-03 | Phase 8 | Pending |
| PROP-04 | Phase 8 | Pending |
| PROP-05 | Phase 8 | Pending |
| PROP-06 | Phase 7 | Pending |
| PROP-07 | Phase 7 | Pending |
| PROP-08 | Phase 7 | Pending |
| PROP-09 | Phase 8 | Pending |
| PROP-10 | Phase 8 | Pending |
| PROP-11 | Phase 8 | Pending |
| PROP-12 | Phase 8 | Pending |
| PROP-13 | Phase 8 | Pending |
| PROP-14 | Phase 8 | Pending |
| PROP-15 | Phase 8 | Pending |
| PROP-16 | Phase 8 | Pending |
| PROP-17 | Phase 8 | Pending |
| PROP-18 | Phase 8 | Pending |
| PROP-19 | Phase 8 | Pending |
| PROP-20 | Phase 8 | Pending |
| PROP-21 | Phase 8 | Pending |
| PROP-22 | Phase 8 | Pending |
| PROP-23 | Phase 8 | Pending |
| PROP-24 | Phase 7 | Pending |
| PROP-25 | Phase 7 | Pending |
| PROP-26 | Phase 8 | Pending |
| DATA-01 | Phase 8 | Pending |
| DATA-02 | Phase 8 | Pending |
| DATA-03 | Phase 8 | Pending |
| DATA-04 | Phase 8 | Pending |
| DATA-05 | Phase 8 | Pending |
| DATA-06 | Phase 8 | Pending |
| DATA-07 | Phase 8 | Pending |
| DATA-08 | Phase 8 | Pending |
| DATA-09 | Phase 8 | Pending |
| DATA-10 | Phase 8 | Pending |
| DATA-11 | Phase 8 | Pending |
| DATA-12 | Phase 8 | Pending |
| ADMIN-01 | Phase 9 | Pending |
| ADMIN-02 | Phase 9 | Pending |
| ADMIN-03 | Phase 9 | Pending |
| ADMIN-04 | Phase 9 | Pending |
| ADMIN-05 | Phase 9 | Pending |
| ADMIN-06 | Phase 9 | Pending |
| ADMIN-07 | Phase 9 | Pending |
| ADMIN-08 | Phase 9 | Pending |
| ADMIN-09 | Phase 9 | Pending |
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
