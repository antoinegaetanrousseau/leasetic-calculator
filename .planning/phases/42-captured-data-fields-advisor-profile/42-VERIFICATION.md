---
phase: 42-captured-data-fields-advisor-profile
verified: 2026-09-08T17:13:28Z
status: passed
score: 9/9 must-haves verified
overrides_applied: 0
---

# Phase 42: Captured Data — Fields & Advisor Profile — Verification Report

**Phase Goal:** Proposals and partner accounts carry the new data the redesigned PDF needs —
client SIRET, partner phone, and an advisor identity (fonction, téléphone) — so Phase 43 can
build the "Société cliente" and "Votre contact" cards against real data rather than only
em-dash fallbacks.

**Verified:** 2026-09-08T17:13:28Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (mapped to ROADMAP success criteria 1-4, as amended by D-23)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `clientSiret` required at wizard step 1, 14-digit, SIREN-prefix cross-field hard block, blocks "Suivant" | ✓ VERIFIED | `src/lib/calc/schema.ts:141-227` (`requiredSiretSchema`, object-level `.refine()` with `path: ['clientSiret']`); `ParametresFormCard.tsx:184-210` renders the field; `WizardStep1Wiring.tsx:66-69` includes `clientSiret` in the `form.trigger([...])` array |
| 2 | SIRET registry-prefilled from `recherche-entreprises`, remains editable, silent fallback on failure (no notice/toast/status role) | ✓ VERIFIED | `lookupSiret.action.ts` (requireUser-gated, collapses every failure to `{ ok: false }`); `ParametresFormCard.tsx:96-110` `handleClientSirenBlur` returns silently on `!result.ok`, no rendered chrome on any path; `clients.registry.toast.error` dictionary key confirmed used only by `RegistryRefreshButton.tsx` (the `/clients` CRM surface), zero references from wizard code |
| 3 | Partner company telephone is admin-set, session-hydrated into `inputs`, never a wizard field, never gates finalization | ✓ VERIFIED | `proposalInputSchema.partnerTel` is `optionalPhoneSchema` (schema.ts:184); `page.tsx:104-222` hydrates `partnerTel` from `session.user.companyTelephone` on every draft path (mint, D-30 overlay, D-25 duplicate); `grep -rln partnerTel app/ src/` shows zero wizard-step render sites — only `page.tsx`, `ProposalForm.tsx` (hidden `defaultValues`), `schema.ts`, and a single non-executing comment in `finalize-wizard.ts`; `grep companyTelephone src/lib/api/proposals/finalize-wizard.ts` returns zero matches |
| 4 | Partner can set own téléphone on `/parametres`; sees fonction as read-only text derived from `partnerType` | ✓ VERIFIED | `ParametresForm.tsx:444-464` editable `PhoneInput` Controller field; `ParametresForm.tsx:512-525` renders fonction as a static `<p id="pf-fonction">` (never `<Input>`/`<select>`); `src/lib/auth/index.ts:172` confirms `partnerType` still registered `input: false` |
| 5 | Partner missing téléphone is stopped at finalization by a dialog naming the field, linking to `/parametres` | ✓ VERIFIED | `finalize-wizard.ts:189-191` — single condition `if (!args.telephone) throw new Error('MissingPartnerTelephone')`, fires after schema parse and before `getLatestGlobalParams`/`computeLoyer`/`renderProposalPdf`; `route.ts:63` adds `MissingPartnerTelephone` to `SAFE_ERROR_CODES`; `FinalizeButton.tsx:101-172` opens a `Dialog` (not `AlertDialog`, not a toast) naming the field with a `/parametres` CTA |
| 6 | Legacy pre-Phase-42 draft (missing `clientSiret`) does not fall into the generic `ValidationFailed` 500 path | ✓ VERIFIED | `finalize-wizard.ts:156-166` — the `!('clientSiret' in draft.inputs)` presence check runs textually before the `try { proposalInputSchema.parse(...) }` block, throwing the distinct `LegacyDraftIncomplete` code; `route.ts:64` adds it to `SAFE_ERROR_CODES`; `FinalizeButton.tsx:109-113` shows a toast naming SIRET and redirects to step 1 |
| 7 | A single Leasetic advisor identity (name, fonction, téléphone, email) exists as an admin-editable setting, read live, never snapshotted | ✓ VERIFIED | `src/lib/db/queries/advisor.ts` — fixed-id (`ADVISOR_ROW_ID`) `getAdvisor()`/`upsertAdvisor()`, plain UPDATE only, never INSERT; `src/lib/admin/advisor-actions.ts:34` `requireAdmin()` runs first; `app/(admin)/[adminSegment]/advisor/page.tsx` + `AdvisorForm.tsx` provide the reachable admin screen (5th `AdminNavCard` on admin home, confirmed wired); `grep -rn getAdvisor src/lib/pdf/ src/lib/api/proposals/finalize-helpers.ts` returns zero matches — nothing writes it into `inputs` or `params_snapshot` (consistent with PROF-03's render half being explicitly out of scope for this phase) |
| 8 | `users.telephone`, `users.company_telephone`, `leasetic_advisor` exist and are usable in the environments the app actually runs against | ✓ VERIFIED | `drizzle/0011_phase42_captured_data.sql` reviewed — DDL matches `src/db/schema.ts`; `check:migration-journal-sync` reports 12/12 in sync; GitHub Actions run `34241648389` confirmed via `gh run view` — both jobs `success`, applied to Neon `main`; run `34250717059` confirmed — both jobs `success`, applied to Neon `development`. **`preview` branch confirmed NOT migrated** (`gh run list --workflow=db-migrate.yml` shows no run targeting `preview`) — this is the pre-flagged, known forward risk from 42-04-SUMMARY.md, not a new gap |
| 9 | ADMIN-09 envelope holds; no commission leakage introduced by any of the above | ✓ VERIFIED | `npx vitest run tests/admin-09-grep-contracts.test.ts src/lib/pdf/no-commission.test.ts` — 63/63 passing; migration `0011` explicitly reviewed and allow-listed in `no-commission.test.ts`'s `KNOWN_MIGRATIONS` |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/calc/schema.ts` | `clientSiret`/`partnerTel` fields + cross-field refine | ✓ VERIFIED | Present, wired, tested |
| `src/db/schema.ts` | `users.telephone`, `users.companyTelephone`, `leaseticAdvisor` table | ✓ VERIFIED | Present, matches applied migration DDL |
| `drizzle/0011_phase42_captured_data.sql` | Generated migration, applied to prod + dev | ✓ VERIFIED | Journal-synced; both target runs confirmed green via `gh run view` |
| `src/lib/auth/index.ts` | `companyTelephone` (`input:false`), `telephone` (`input:true`), `partnerType` still `input:false` | ✓ VERIFIED | All three confirmed at lines 172/180/184 |
| `app/(authed)/parametres/ParametresForm.tsx` | Editable téléphone + read-only fonction `<p>` | ✓ VERIFIED | Static text, never an input |
| `app/(authed)/proposals/new/parametres/ParametresFormCard.tsx` + `WizardStep1Wiring.tsx` | SIRET field + Suivant block | ✓ VERIFIED | Field renders, trigger array includes `clientSiret` |
| `app/(authed)/proposals/new/_actions/lookupSiret.action.ts` | Registry prefill, silent fallback | ✓ VERIFIED | `requireUser()` first; narrow `{ ok } ` shape |
| `src/lib/api/proposals/finalize-wizard.ts` | D-05 legacy check + D-17 telephone gate | ✓ VERIFIED | Both present, correctly ordered, no `companyTelephone` reference |
| `app/api/proposals/finalize/route.ts` | `SAFE_ERROR_CODES` extended with both new bounded codes | ✓ VERIFIED | Confirmed at lines 63-64 |
| `app/(authed)/proposals/new/verification/FinalizeButton.tsx` | Dialog for missing-phone, toast+redirect for legacy draft | ✓ VERIFIED | `Dialog` (not `AlertDialog`) confirmed |
| `src/lib/db/queries/advisor.ts` | Fixed-id singleton read/write pair | ✓ VERIFIED | `getAdvisor`/`upsertAdvisor`, UPDATE-only |
| `src/lib/admin/advisor-actions.ts` + `advisor-schemas.ts` | `requireAdmin`-gated action + 4-field required schema | ✓ VERIFIED | `requireAdmin()` runs first |
| `app/(admin)/[adminSegment]/advisor/page.tsx` + `AdvisorForm.tsx` | Reachable admin screen | ✓ VERIFIED | 5th `AdminNavCard` on admin home links to it |
| `src/lib/admin/schemas.ts` + `actions.ts` | Admin partner form: company telephone (optional) + partner telephone (new) | ✓ VERIFIED | Both persist via the single existing UPDATE |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `ParametresFormCard` SIREN blur | `lookupSiretAction` | `startSiretLookup` + `useTransition` | WIRED | Prefills only if `clientSiret` still empty at resolution time |
| `WizardStep1Wiring.onContinue` | `clientSiret` validation | `form.trigger([...])` | WIRED | Confirmed array includes `clientSiret` |
| `finalize/route.ts` | `finalizeWizard` | `session.user.telephone` threaded as `telephone` arg | WIRED | Normalizes blank/whitespace to `null` before threading |
| `FinalizeButton` | `finalize` route response | `res.json().catch(() => null)` + code branch | WIRED | Both new codes branch correctly; every other failure keeps the generic toast |
| Admin home | `/advisor` | 5th `AdminNavCard` | WIRED | Confirmed in `page.tsx` |
| `AdvisorForm` | `adminUpdateAdvisor` | direct import + call | WIRED | `requireAdmin()` gate confirmed server-side |
| `CreatePartnerForm` | `adminCreateInvitation` | `telephone`/`phone` args | WIRED | Both persist to `users.telephone`/`users.company_telephone` via conditional spreads in the single UPDATE |

### Data-Flow Trace (Level 4)

Not applicable in the traditional sense — this phase captures data, it does not render it. The
one live-read path (`getAdvisor()` at render time) is deliberately **not** exercised by any code
in this phase (`grep -rn getAdvisor src/lib/pdf/` returns zero matches) — confirmed as in-scope
absence, not a defect, since rendering is explicitly Phase 43's job per `42-CONTEXT.md`'s Phase
Boundary section.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite green | `npm test` | 2703 passed, 61 skipped, 0 failed | ✓ PASS |
| ADMIN-09 + no-commission gates green | `npx vitest run tests/admin-09-grep-contracts.test.ts src/lib/pdf/no-commission.test.ts` | 63/63 passing | ✓ PASS |
| Lint gate (CI parity) | `npm run lint:check` | 0 warnings/errors | ✓ PASS |
| Typecheck | `npm run typecheck` | exits 0 | ✓ PASS |
| Migration journal sync | `npm run check:migration-journal-sync` | "12 migration file(s) checked, 12 journal entrie(s) checked — in sync" | ✓ PASS |
| No `drizzle-kit push` in tracked files | `npm run check:no-drizzle-push` | "no invocations found" | ✓ PASS |
| Production migration applied | `gh run view 34241648389` | Both jobs `success`, targets Neon `main` | ✓ PASS |
| Development-branch migration applied | `gh run view 34250717059` | Both jobs `success`, targets Neon `development` | ✓ PASS |
| No debt markers (TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER) in phase-touched files | grep sweep across all 23 phase-modified source files | 0 matches | ✓ PASS |
| Working tree clean, phase commits present | `git status --short`, `git log` | Clean; all task commits present in history (per each SUMMARY's own Self-Check, spot-confirmed) | ✓ PASS |

### Requirements Coverage

| Requirement | Description (amended) | Status | Evidence |
|-------------|------------------------|--------|----------|
| FIELD-01 | Client SIRET required, 14-digit, at wizard step 1 before finalization | ✓ SATISFIED | Schema + UI + finalize re-validation all confirmed |
| FIELD-02 | Partner company telephone on account, admin-set, carried onto every proposal's `inputs`, never blocks finalization | ✓ SATISFIED | Session-hydration confirmed; zero finalize-gate reference |
| PROF-01 | Partner sets own téléphone on `/parametres`; sees fonction read-only | ✓ SATISFIED | Both confirmed in `ParametresForm.tsx` |
| PROF-02 | Missing téléphone stopped at finalization, message naming field + link to `/parametres` | ✓ SATISFIED | Gate + dialog confirmed end to end |
| PROF-03 | Partner block sourced from creating user's account; advisor block sourced from admin-editable Leasetic advisor setting, read live, never snapshotted | **Correctly left `Pending`** | Persistence + authorization + admin screen layer (this phase's scope) fully built and verified; the PDF-render half is explicitly Phase 43's job per `42-CONTEXT.md` Phase Boundary — confirmed by the absence of any `getAdvisor`/advisor reference in `src/lib/pdf/`. Leaving this unchecked is the honest, correct call, not a gap. |

**No orphaned requirements** — FIELD-03 belongs to Phase 43 per the REQUIREMENTS.md mapping table and was never claimed by any Phase 42 plan.

### Anti-Patterns Found

None. Debt-marker sweep (TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER) across all 23 phase-touched source
files returned zero matches. No stub returns, no empty handlers, no hardcoded-empty props found
in the reviewed render paths.

### Human Verification Required

None. All observable truths were verifiable directly against the codebase, the test suite, and
the GitHub Actions run history (`gh run view`), without requiring interactive UI testing. The
two manual-only items listed in `42-VALIDATION.md` (live SIREN registry prefill, and confirming
no post-deploy `APIError: Failed to get session`) were both already operator-verified during
execution per 42-04-SUMMARY.md's "Operator Verification" and "Incident" sections, which this
verification independently corroborated via the underlying code paths and the GitHub Actions
run logs rather than re-trusting the narrative alone.

### Known, Pre-Flagged Items (not gaps)

- **`preview` Neon branch is not migrated.** Confirmed via `gh run list` — no `db-migrate.yml` run
  has ever targeted `preview`. This is explicitly flagged forward to Phases 43/44 in
  42-04-SUMMARY.md and is not this phase's responsibility to close.
- **Three commits are ahead of `origin/main`** (`f4bd98b`, `0695c82`, `7644db4`) — unpushed but
  present in local history; nothing is deployed to production from this phase yet. Consistent
  with the task's stated known state.
- **PROF-03 remains `Pending`** in REQUIREMENTS.md — correct and deliberate; see Requirements
  Coverage above.

### Gaps Summary

No gaps found. All nine observable truths derived from ROADMAP.md's four amended success
criteria (and the sub-decisions D-01 through D-24 in 42-CONTEXT.md that operationalize them)
verified directly against source code, not SUMMARY.md narrative. Full test suite (2703 tests),
ADMIN-09 + no-commission gates, lint, typecheck, and migration-journal-sync all green. Two
production-adjacent GitHub Actions migration runs were independently confirmed via `gh run view`
rather than trusted from the SUMMARY text. Phase 42 goal is achieved: proposals and partner
accounts now carry client SIRET, partner telephone, and a persisted/admin-editable Leasetic
advisor identity — the exact real data Phase 43 needs to build the "Société cliente" and
"Votre contact" cards.

---

_Verified: 2026-09-08T17:13:28Z_
_Verifier: Claude (gsd-verifier)_
