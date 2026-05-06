# Research Summary — v1.1 Hosted Web App Foundation

**Synthesized:** 2026-05-05 from STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md.

> **Quality caveat:** All four research agents had Read/Bash/WebSearch denied; outputs are training-data-grounded, not live-verified. The Features agent additionally drifted into Firebase terminology (orchestrator-corrected during file write). Treat library version pins as starting points to verify in Phase 1, not gospel.

---

## TL;DR — Recommended Stack (consolidated)

| Layer | Recommendation | Source | Open conflict? |
|---|---|---|---|
| **Framework** | **Next.js (latest stable: ~16.x; verify on bootstrap)** App Router with `output: 'standalone'` | STACK | None |
| **DB** | Postgres via Neon (Vercel side) → standard managed Postgres on OVH | STACK + ARCH | None |
| **ORM** | **Drizzle 0.45.x** (over Prisma) | STACK + ARCH | None |
| **Auth** | **Better Auth 1.6.x** (over NextAuth/Auth.js v5) | STACK | ⚠ ARCH assumed NextAuth — see decision below |
| **PDF generation** | **TBD** — Puppeteer (STACK) vs `@react-pdf/renderer` (ARCH) | conflict | ⚠ User must decide |
| **Blob storage** | Vercel Blob now → S3-compatible (OVH Object Storage) later, behind a `StorageAdapter` interface | STACK + ARCH | None |
| **i18n** | Hand-rolled FR/EN dictionaries (138×2 keys), cookie-based locale | STACK + ARCH | None |
| **Forms** | react-hook-form + Zod via `@hookform/resolvers/zod` | STACK | None |
| **Toasts** | Sonner | STACK | None |
| **Styling** | Tailwind CSS v4 | STACK | None |
| **Tests** | Vitest (unit, calc engine), Playwright (E2E if needed) | STACK + ARCH | None |
| **Observability** | None in v1.1 (platform logs only) | STACK | None |

---

## Cross-research conflicts requiring user resolution

### Conflict 1 — PDF generation library (HIGH stakes)

| | Puppeteer + `@sparticuz/chromium` (STACK) | `@react-pdf/renderer` (ARCH) |
|---|---|---|
| Visual fidelity to v10 | **Pixel-equivalent** — re-renders v10's existing print CSS | Must rebuild layout in `<Document>/<Page>/<Text>` JSX (~3+ days; visual differences likely) |
| Byte-determinism | Medium (Chromium version drift; mitigatable with pinned binary + metadata stripping) | **High** (synthetic layout, embedded fonts) |
| Bundle weight | Heavy (~150 MB Chromium on Vercel via @sparticuz; full Chromium on OVH ~280 MB) | Small (pure Node, no native binaries) |
| Cold start (Vercel) | 4–7 s first PDF after idle, ~500 ms warm | <1 s cold |
| OVH portability | Adds Chromium dependency (libnss3 etc. in Docker) | Trivial (npm install only) |
| Memory footprint | 150–300 MB per browser instance | <50 MB |
| Reuse v10 print CSS | **Yes — direct port** | **No — rewrite** |

**Trade-off framing:** Puppeteer wins on "PDF must look identical to v10" and time-to-ship; `@react-pdf/renderer` wins on operational simplicity and OVH portability. Both can hit the byte-determinism contract with care.

### Conflict 2 — Auth library (LOW stakes, easy to resolve)

STACK strongly recommends **Better Auth** because Auth.js's own homepage now points new projects there and email-password is first-class. ARCHITECTURE casually assumed NextAuth because it's still the more familiar name. **Recommendation: go with STACK's call (Better Auth)** unless you already have Auth.js v5 muscle memory you want to preserve. Both produce equivalent route layouts; the choice is mostly about which library's quirks you'd rather debug.

### Conflict 3 — Next.js version pin

STACK says **16.x**, ARCH and PITFALLS say **15**. STACK was the version-research-focused agent. **Recommendation: pin to whatever is stable when bootstrap starts** (likely 16.x). All architectural patterns described work on either.

---

## Architecture spine (resolved across all research)

### Phase decomposition (6 phases)

| Phase | Goal | Exit criterion |
|---|---|---|
| **5. Bootstrap** | Deployable empty Next.js shell on Vercel + Neon Postgres + Vercel Blob, all behind portable adapters | Production URL serves a page; round-trip DB+blob test green; CI runs Vitest; Vercel-only-import grep passes |
| **6. Auth & shell** | Login, session, role-gating with hidden admin URL | Admin reaches `/[adminSegment]/`; partner reaches `/`; URL-tampering returns 404 |
| **7. Calc + form** | Pure-front-end working calculator that matches v10 outputs (no DB writes yet) | All v10 self-check fixtures pass in Vitest; manual parity check against v10 for ≥5 scenarios |
| **8. Persistence + PDF** | Real proposals saved (DB + immutable blob PDF), home-page list, download | Create proposal → DB row + PDF in blob → SHA-256 stable across re-renders → home page lists it |
| **9. Admin surface** | Admin can edit global params and create accounts; audit log writes | Admin updates coefficients → new proposal uses new values → old proposals unchanged |
| **10. Cutover & polish** | Production-ready; v10 sunset; OVH-portable smoke test | Vercel works; same code deploys on Node + Postgres + S3-compat with only env-var changes |

(Phase numbers continue from v1.0's Phase 4. Final numbers locked by the roadmapper.)

### Database schema — resolved

`users`, `global_params` (append-only history), `proposals`, `password_resets`, `audit_log`. Full schema in ARCHITECTURE.md §2.4.

### PDF immutability — resolved (Option A)

**Snapshot `params_snapshot` and `inputs` jsonb directly into the `proposals` row at creation time.** PDF is a derived artifact regenerable byte-identically from `(inputs, params_snapshot, schema_version)`. The stored PDF binary is a cache + legal artifact, not the canonical record. `schema_version` field is non-negotiable so future calc/PDF formula changes can route old proposals to the old renderer.

(This is the Stripe pattern for invoice line items.)

### Hidden admin URL — resolved

Env-driven dynamic segment: `app/(admin)/[adminSegment]/...`. Layout 404s if `params.adminSegment !== process.env.ADMIN_URL_SEGMENT`. Plus role check in the same layout. URL is rotatable; on-disk path doesn't leak the secret.

### OVH portability — resolved

Storage behind a `StorageAdapter` interface (5 methods). `STORAGE_DRIVER=vercel|s3` env var picks the implementation. Forbidden Vercel-only primitives caught by ESLint + CI grep: `@vercel/blob` (outside `lib/storage/`), `@vercel/postgres`, `@vercel/kv`, `@vercel/edge-config`, `runtime: 'edge'`. `output: 'standalone'` from Phase 1.

---

## Top BLOCKING pitfalls (from PITFALLS.md, must address explicitly)

1. **Snapshot schema (3.3)** — proposals row stores deep-copy of params, not FKs. Foundation of PDF immutability.
2. **Hidden URL ≠ security (7.1)** — every admin route independently role-gated server-side, not just URL-hidden.
3. **Vercel-only primitives leak (6.1)** — ESLint + CI grep from Phase 1.
4. **Calculation drift from v10 (8.4)** — golden test fixtures from 30+ representative v10 calculations gated in CI before Phase 4.
5. **Coefficient seed for production (8.2)** — versioned SQL seed file extracted from v10's frozen values, runs in every environment.
6. **Commission invisibility (9.4)** — extends beyond partner-facing PDF to logs, traces, admin views. Redacting logger required.
7. **PDF regeneration temptation (10.7)** — once stored, immutable. Bug fixes apply to *new* proposals only.
8. **Bucket isolation (5.3)** — partner key prefix from authed session, never from URL params; defense-in-depth via DB row check.
9. **Private blobs only (5.2)** — proxy through `/api/proposals/[id]/pdf` with auth + signed URL.
10. **Vercel function size limit (4.1, if Puppeteer chosen)** — `@sparticuz/chromium` + `puppeteer-core`, mark external in build.

---

## Top features (from FEATURES.md, scoped for v1.1)

**Table-stakes (must ship):**
- Email/password auth (admin-invited, no self-signup), set-your-password invite flow, password reset, session persistence, force first-login password change
- Home page: create-new CTA + recent proposals list (last 20, paginated, sorted desc, columns: client name + LC ref + amount + date)
- Save proposal on PDF generation: input + coefficient snapshots + binary PDF in blob + LC ref + client name + lang
- View saved proposal: read-only inputs + re-download PDF + (recommend) PDF preview embed
- Soft-delete proposal (partner) + hard-delete (admin, GDPR-driven)
- Admin: edit global coefficients/commission/threshold (with confirmation modal + change log)
- Admin: list partners, invite, reset password, disable
- Admin: cross-partner proposal read view (support tool)
- Server-side role enforcement in middleware + DB constraints
- Privacy policy + legal mentions in FR/EN
- Cutover plan: comm email, v10 redirect page, FAQ, support window
- Server-side error logging (platform logs only — Sentry deferred)

**Differentiators (cheap, high-leverage):**
- Search proposals by client name / LC ref
- Duplicate-proposal-from-existing
- Coefficient change audit log
- PDF in-browser preview embed

**Defer to v1.2+:** filters, archive, rename, CSV export, analytics, charts, 2FA, account lockout, login activity feed, bulk operations, email-the-PDF, full audit log UI

**Anti-features (don't build):** dashboards/charts, team collaboration, comments on proposals, sharing between partners, public share links, e-signature, status workflows, multi-admin RBAC, feature flags, full audit log UI

---

## GDPR & legal posture (from FEATURES.md + PITFALLS.md)

- **Personal data inventory** required (CNIL Art. 30 register).
- **Privacy notice** in FR + EN linked from login page footer (table-stakes).
- **Data retention conflict:** GDPR right-to-erasure vs French commercial-law 10-year retention (Code de commerce L.123-22). Reconciliation: PDFs are *append-only* and retained for 10 years (legitimate interest / legal obligation); partner deactivation never deletes PDFs; admin-mediated personal-data anonymization for explicit GDPR Art. 17 requests.
- **No analytics in v1.1** = no cookie consent banner needed. Easier path.
- **EU hosting only:** Vercel EU regions; OVH is FR. Both compliant.
- **Confirm exact retention period with Leasétic legal counsel before writing into privacy notice.**

---

## Open questions for the orchestrator / roadmapper

1. **PDF library choice** (Puppeteer vs @react-pdf/renderer) — affects Phase 4 design profoundly.
2. **Auth library choice** (Better Auth vs NextAuth v5) — affects Phase 2 patterns slightly.
3. **Email transport** for password resets / first-login — recommended deferred (admin-mediated only in v1.1), but if user wants email immediately, Resend or OVH SMTP are the candidates.
4. **Existing v10 form schema** — does it already capture a structured "client name" field, or only LC reference? Affects "save proposal" requirement.
5. **Leasétic legal counsel** must confirm 10-year retention period for IT-leasing pre-contractual documents before privacy notice is written.

---

## Implications for the roadmap

- **Phase 5 (Bootstrap) must produce a deployable empty shell exercising Postgres + blob + auth wiring** — not just a Next.js scaffold. Highest-leverage early risk reduction.
- **Snapshot-based schema (params_snapshot + schema_version)** is the data spine; lock it in Phase 8 design before any persistence work.
- **PDF determinism CI gate** ships in the same PR as `lib/pdf` introduction.
- **Calc engine port (Phase 7)** is the highest-leverage de-risk — TS module with v10 self-checks as Vitest fixtures, golden-comparison gate against v10 for ≥30 scenarios.
- **OVH portability is a Phase 10 deliverable**, proven by an actual OVH smoke deploy. "Portable" without a deployment is an untested claim.
- **No SMTP in v1.1.** Account creation and password reset are admin-mediated.
