# Phase 21 — Partner-Onboarding Gates: Evidence

Created: 2026-05-29 (Phase 21 plan).
Closed: 2026-05-29 (both gates verified — see closure checklist below).

This file is the auditable record that both v1.3 partner-onboarding gates (GATE-01 admin
password rotation + GATE-02 public privacy notice update) closed before any
non-`@test.leasetic.com` partner account is invited via the admin `/partners/new` flow.
Process discipline only (D-04) — no code-level guard.

## GATE-01 — Admin password rotation (in-app flow)

Both admin accounts rotated from the shared launch-day password `leasetic2026` to
individual strong passwords via the new `/parametres` self-service flow shipped by
Plan 21-01. No admin↔admin fallback was used — both admins exercised the new
self-service flow directly.

| Admin | Account email | Rotation date | Old password tested + rejected | New password authenticates |
|-------|---------------|---------------|-------------------------------|----------------------------|
| Antoine Rousseau | `antoine.rousseau@leasetic.com` | 2026-05-29 | ✓ verified | ✓ verified |
| Emmanuel Rousseau | `emmanuel.rousseau@leasetic.com` | 2026-05-29 | ✓ verified | ✓ verified |

**Verification procedure (per admin, executed for record):**

1. Open production app → user menu → "Paramètres".
2. Change password via the in-app flow. Confirm the success toast.
3. Sign out. Attempt sign-in with `leasetic2026` — must FAIL.
4. Sign in with the new password — must SUCCEED.
5. Tick the row above.

## GATE-02 — Public privacy notice update (leasetic.fr)

Privacy notice on `leasetic.fr` updated by Antoine (D-01) to cover (a) Vercel + Neon EU
hosting as data processors and (b) 10-year PDF retention as a new processing activity tied
to French Commercial Code L123-22 / L110-4.

- **Public URL:** <https://leasetic.fr/politique-de-confidentialite>
- **Publication date:** 2026-05-29
- **Both additions visible on the public page:** ✓ Vercel/Neon EU hosting added under
  "Sous-traitants"; 10-year PDF retention added under "Durée de conservation" with the
  French Commercial Code citation.

## Closure checklist

No non-`@test.leasetic.com` partner account may be invited via the admin `/partners/new`
flow until:

- [x] Both rows in the GATE-01 table above are ticked + dated.
- [x] GATE-02 URL + publication date + visible-additions confirmation are filled.

**Both gates closed 2026-05-29 — partner onboarding is now unblocked.**

---

*Sources:*

- `.planning/phases/21-partner-onboarding-gates/21-CONTEXT.md` D-04 (process-only
  enforcement), D-05 (evidence-doc shape).
- `.planning/STATE.md` Phase 6 follow-ups #1 (origin of GATE-01 — the `leasetic2026`
  shared launch password decision).
- `.planning/STATE.md` Open questions #3 (origin of GATE-02 — legal counsel sign-off on
  10-year retention, DATA-11).
- `docs/legal/privacy-coverage-confirmation.md` — Phase 21 rewrite per D-01; publication
  record + cross-link.
