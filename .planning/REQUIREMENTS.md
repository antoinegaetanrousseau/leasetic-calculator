# Requirements: Matrice Commerciale v1.4 — Partner Types, Admin Dual-View & Rebrand

**Defined:** 2026-05-29
**Milestone:** v1.4
**Core value (unchanged since v1.0):** A partner fills client info + amount + duration and gets a pixel-correct PDF proposal with the correct lease calculation — now with a partner-type-conditional formula (commission-free for Agent/Commercial) and a self-service admin/agent view switch.

**Source of truth:** This milestone's scope conversation with Antoine (2026-05-29) + the v1.3 deferred-items list (`.planning/reports/MILESTONE_SUMMARY-v1.3.md` §6). No domain research (all internal feature work on the known stack).

**Phase numbering:** continues from v1.3 (ended at Phase 21) — v1.4's first phase is **Phase 22**.

---

## v1.4 Requirements

### Partner Types & Commission-Free Proposals (PTYPE)

The headline feature. Introduces a `partner_type` dimension that conditions proposal economics. **Business-approved exception to the frozen-formula constraint** (PROJECT.md Key Decisions, 2026-05-29).

- [x] **PTYPE-01**: When inviting/creating a partner, an admin can select a partner type — **Agent**, **Commercial**, or **Partenaire** — via a selector in the create-partner form (`/[adminSegment]/partners/new`).
- [x] **PTYPE-02**: Every existing account is migrated to `Partenaire` so behavior is unchanged for all current partners after the schema migration applies.
- [x] **PTYPE-03**: An admin can change an existing account's partner type later (partner detail/edit surface); the change is recorded in `audit_log`.
- [x] **PTYPE-04**: For an **Agent** or **Commercial** account, a proposal's monthly loyer is computed **without** the commission factor (`loyer = montant HT × coefficient ÷ 100`). For a **Partenaire**, the existing formula (`montant HT × (1 + commission/100) × coefficient / 100`) is unchanged. Verified by golden test cases for all three types.
- [x] **PTYPE-05**: For Agent/Commercial, commission never appears in any UI surface (wizard steps, live preview, dashboards, partner-facing views) — the commission annotation/line is structurally absent, not conditionally hidden.
- [x] **PTYPE-06**: For Agent/Commercial, the generated PDF contains no commission figure or commission-derived wording and renders the commission-free loyer. The `params_snapshot` immutability invariant still holds, and the snapshot records the partner type + whether commission was applied so the PDF stays reproducible.
- [x] **PTYPE-07**: The ADMIN-09 grep-contract suite is extended to assert zero commission leakage for Agent/Commercial across calc output, UI, PDF render path, server logs, and audit payloads. The existing 12-gate suite stays green.

### Admin Dual-View Toggle (VIEW)

- [ ] **VIEW-01**: An admin-level user sees an **Admin / Agent** view toggle in the bottom-left settings area (alongside the theme + locale controls). Non-admin users never see the toggle.
- [ ] **VIEW-02**: Choosing **Agent** view remaps the navigation to the agent route set (Accueil `/`, Nouvelle proposition, Propositions `/proposals`, Aide). Choosing **Admin** view remaps to the admin route set (Accueil `/[adminSegment]`, Coefficients, Partenaires `/[adminSegment]/partners`, Toutes les propositions `/[adminSegment]/lc-references`, Aide).
- [x] **VIEW-03**: On each login an admin lands in **Admin** view by default; the toggle choice is **session-only** and resets after logout (no cookie/DB persistence).
- [ ] **VIEW-04**: The toggle is a navigation/landing convenience only — it does not alter authorization (the admin keeps admin rights in both views) and does not expose admin-only data inside the agent view beyond what the agent routes already render.

### PDF Rendering Fixes (PDF)

- [x] **PDF-01**: Numbers and typography on the generated PDF render with no glyph overlap or artifacts — specifically the loyer figure and all monetary/numeric values — under French number formatting (thousands separators, € symbol). Root cause confirmed in a planning spike (likely the U+202F narrow-no-break-space separator or a missing glyph in the embedded font).
- [x] **PDF-02**: The **"Destinataire"** block beneath the "Proposition de location financière" title is removed; the layout reflows cleanly without it.
- [x] **PDF-03**: The PDF byte-determinism CI gate is updated for the new layout (fixture regenerated) and remains green; the calc golden corpus is extended to cover the Agent/Commercial commission-free render.

### Teal Rebrand (BRAND)

- [ ] **BRAND-01**: The UI **accent color** is `#2D7A8C` everywhere the previous accent green appeared (primary buttons, links, active nav, hero accents, focus rings, CTAs), in both light and dark mode, driven from the design-token layer (single source of truth).
- [ ] **BRAND-02**: The Leasétic **logo green** and the **semantic success green** (the "Actif" status pill, "activé le compte" activity entries) are left unchanged.
- [ ] **BRAND-03**: Every recolored foreground/background pair meets WCAG 2.1 AA (≥4.5:1 text) in light + dark, consistent with the v1.3 CONTRAST discipline.

### Admin-Home Labels (COPY)

- [ ] **COPY-01**: The admin-home "Références LC" card title and the corresponding page heading read **"Toutes les propositions"** (FR) / equivalent EN. The `/[adminSegment]/lc-references` route is unchanged (display label only).
- [ ] **COPY-02**: The admin-home "Coefficients & commission" card title reads **"Coefficients & Commissions"**.
- [ ] **COPY-03**: The admin-home "Dernière modif. coeffs" stat label reads **"Dernière Modif Coef"**.
- [ ] **COPY-04**: All label changes ship FR + EN dictionary entries; the compile-time `_EnHasAllFrKeys` parity proof stays green.

### Component Fix (UIFIX)

- [ ] **UIFIX-01**: The proposal status pill (e.g. "Actif", "Brouillon", "Expirée") sizes to its text content (hugs content) rather than rendering at a fixed width — verified across all status variants and both languages.

---

## Future Requirements (deferred — not in v1.4)

Carried forward; available for v1.5+ scoping:

- [ ] Account v2 — avatar upload (needs Blob image infra), phone field (schema + Better Auth additionalFields), editable email (needs SMTP)
- [ ] SMTP-driven self-service forgotten-password reset
- [ ] Multi-factor authentication on admin accounts
- [ ] Centralized forms-i18n / Zod error-localization helper (remove the EN-leak duplication across SetPasswordForm + identity schema) + regression tests for the Phase 21 partial-success + Zod fixes
- [ ] OVH production deployment + smoke-deploy execution (September 2026 target)
- [ ] Webhook notifications to Leasétic on each proposal generation
- [ ] Mobile-optimized layout
- [ ] Automated browser tests (Playwright or similar)
- [ ] Sentry / APM observability beyond Vercel logs
- [ ] Generic audit-log viewer beyond coefficient history
- [ ] Wizard step-1 sticky-footer action bar / `beforeunload` warning / per-step tab titles
- [ ] `/accounts` 308 redirect sunset

## Out of Scope (v1.4 — explicit exclusions)

- **Changing the `Partenaire` formula or any tranche boundaries** — still frozen. Only the Agent/Commercial commission-free variant is approved.
- **SMTP / editable email / avatar / phone** — Account v2; deferred (no SMTP in v1.4).
- **MFA and SMTP password reset** — deferred to a dedicated auth-hardening milestone.
- **Persisting the view toggle across sessions** — explicitly session-only by decision.
- **Recoloring the logo or the semantic success green** — out of the rebrand scope by decision.
- **Mobile-optimized layout, Playwright, Sentry** — deferred.

---

## Traceability

REQ-ID → Phase mapping (filled by the roadmapper; phases start at 22).

| REQ-ID | Requirement (short) | Phase |
|--------|---------------------|-------|
| PTYPE-01 | Partner-type selector on invite form | Phase 22 |
| PTYPE-02 | Backfill existing accounts → Partenaire | Phase 22 |
| PTYPE-03 | Admin can edit partner type later (audited) | Phase 22 |
| PTYPE-04 | Commission-free loyer calc for Agent/Commercial | Phase 22 |
| PTYPE-05 | Commission absent from all UI for Agent/Commercial | Phase 22 |
| PTYPE-06 | Commission-free PDF variant + snapshot integrity | Phase 22 |
| PTYPE-07 | ADMIN-09 grep suite extended for Agent/Commercial | Phase 22 |
| VIEW-01 | Admin-only Admin/Agent toggle (bottom-left) | Phase 24 |
| VIEW-02 | Nav remaps to admin vs agent route set | Phase 24 |
| VIEW-03 | Land in Admin, session-only persistence | Phase 24 |
| VIEW-04 | Toggle is view-only, not an authz change | Phase 24 |
| PDF-01 | Fix number/typography rendering glitch | Phase 23 |
| PDF-02 | Remove "Destinataire" block | Phase 23 |
| PDF-03 | Update byte-determinism gate + golden corpus | Phase 23 |
| BRAND-01 | Accent green → #2D7A8C (token, light+dark) | Phase 25 |
| BRAND-02 | Logo green + success green unchanged | Phase 25 |
| BRAND-03 | WCAG 2.1 AA on recolored pairs | Phase 25 |
| COPY-01 | "Toutes les propositions" (label only) | Phase 25 |
| COPY-02 | "Coefficients & Commissions" | Phase 25 |
| COPY-03 | "Dernière Modif Coef" | Phase 25 |
| COPY-04 | FR+EN dict entries, parity proof green | Phase 25 |
| UIFIX-01 | Status pill hugs its text | Phase 25 |

**Coverage:** 22/22 requirements mapped across 4 phases (Phases 22-25). No orphans.
