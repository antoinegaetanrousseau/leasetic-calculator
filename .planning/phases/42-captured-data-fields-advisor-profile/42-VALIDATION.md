---
phase: 42
slug: captured-data-fields-advisor-profile
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-08
---

# Phase 42 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `42-RESEARCH.md` § Validation Architecture, with two Wave 0 gaps
> closed by direct filesystem verification (see Wave 0 Requirements).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.8 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run <path-to-file>` |
| **Full suite command** | `npm test` (`vitest run`) |
| **Estimated runtime** | ~90s full suite (2578 tests as of Phase 41 close) |

---

## Sampling Rate

- **After every task commit:** Run the single most relevant file's quick-run command from the map below.
- **After every plan wave:** Run `npm test` — this phase edits `proposalInputSchema` and `SAFE_ERROR_CODES`, both cross-cutting enough that a file-scoped run is not sufficient evidence.
- **Before `/gsd-verify-work`:** Full suite green, **plus** an explicit re-run of `tests/admin-09-grep-contracts.test.ts` and `src/lib/pdf/no-commission.test.ts`. Research judges them inert to this phase, but project discipline is to prove it, not assume it.
- **Additional CI gate (not optional here):** `npm run lint:check` (`eslint --max-warnings=0`) and `npm run check:no-drizzle-push`. Unused vars pass `tsc` and Vitest but fail CI, and this phase adds fields that are easy to leave half-wired.
- **Max feedback latency:** ~15 seconds for a file-scoped run.

---

## Per-Task Verification Map

Task IDs are assigned by the planner; this map is keyed by requirement/decision so the
planner can attach each row to the task that closes it.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | FIELD-01 | — | SIRET required at step 1; 14-digit shape | unit (Zod) | `npx vitest run src/lib/calc/schema.test.ts` | ✅ extend | ⬜ pending |
| TBD | TBD | TBD | FIELD-01 / D-01 | — | Registry prefill populates SIRET when SIREN resolves; field stays editable | component | `npx vitest run "app/(authed)/proposals/new/parametres/ParametresFormCard.test.tsx"` | ✅ extend | ⬜ pending |
| TBD | TBD | TBD | D-02 | — | SIRET/SIREN prefix mismatch blocks, error lands on the SIRET field | unit (Zod) | `npx vitest run src/lib/calc/schema.test.ts` | ✅ extend | ⬜ pending |
| TBD | TBD | TBD | D-03 | — | Registry failure leaves the field empty and editable, with NO notice rendered | component | `npx vitest run "app/(authed)/proposals/new/parametres/ParametresFormCard.test.tsx"` | ✅ extend | ⬜ pending |
| TBD | TBD | TBD | D-05 | T-42-LegacyDraft | Pre-Phase-42 draft at finalize returns a distinct bounded code, not `ValidationFailed` | unit + route | `npx vitest run src/lib/api/proposals/finalize-wizard.test.ts "app/api/proposals/finalize/route.test.ts"` | ✅ extend | ⬜ pending |
| TBD | TBD | TBD | PROF-01 | — | Partner sets/sees own téléphone; fonction rendered read-only from `partnerType`, never an input | component | `npx vitest run "app/(authed)/parametres/ParametresForm.test.tsx"` | ✅ extend | ⬜ pending |
| TBD | TBD | TBD | PROF-02 / D-17 | T-42-GateBypass | Missing téléphone blocks finalize with its own bounded code; gate is server-side, not client-only | unit + route | `npx vitest run src/lib/api/proposals/finalize-wizard.test.ts "app/api/proposals/finalize/route.test.ts"` | ✅ extend | ⬜ pending |
| TBD | TBD | TBD | PROF-02 / D-18 | T-42-PayloadEcho | `FinalizeButton` parses `body.error` (it does not today) and renders the dialog, not a toast; no payload echoed | component | `npx vitest run "app/(authed)/proposals/new/verification/FinalizeButton.test.tsx"` | ✅ extend | ⬜ pending |
| TBD | TBD | TBD | PROF-03 / D-07..D-09 | T-42-AdvisorAuthz | Advisor singleton is admin-writable only and readable back; never enters `params_snapshot` | unit (query helper) | `npx vitest run src/lib/db/queries/advisor.test.ts` | ❌ **Wave 0** | ⬜ pending |
| TBD | TBD | TBD | D-13 | — | Company téléphone persists to a real `users` column and reads back — not only into `audit_log.payload.profile` | unit (admin action) | `npx vitest run src/lib/admin/actions.test.ts` | ✅ extend | ⬜ pending |
| TBD | TBD | TBD | D-13 | — | Company téléphone never blocks finalization | unit | `npx vitest run src/lib/api/proposals/finalize-wizard.test.ts` | ✅ extend | ⬜ pending |
| TBD | TBD | TBD | D-19 | — | Admin can set the partner's own téléphone at creation | unit + component | `npx vitest run src/lib/admin/actions.test.ts "app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.test.tsx"` | ✅ extend | ⬜ pending |
| TBD | TBD | TBD | D-16 | — | An EN proposal renders the English fonction label; FR renders French | unit (i18n) | `npx vitest run src/lib/i18n/dictionaries.test.ts` | ✅ extend | ⬜ pending |
| TBD | TBD | TBD | FIELD-02 / D-11 | — | Company téléphone is session-hydrated into the draft's `inputs`, never read back from the form | component/unit | `npx vitest run "app/(authed)/proposals/new/parametres/page.test.tsx"` | ✅ extend | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Research listed four gaps. **Two were false** — both files exist and were verified on disk
during this planning run; they need new cases, not creation:

- ~~`src/lib/api/proposals/finalize-wizard.test.ts`~~ — **exists.** Extend it.
- ~~`app/(authed)/proposals/new/verification/FinalizeButton.test.tsx`~~ — **exists.** Extend it.

Genuine Wave 0 work:

- [ ] `src/lib/db/queries/advisor.ts` + `src/lib/db/queries/advisor.test.ts` — new singleton table for the Leasetic advisor identity (D-07/D-08); no existing file to extend.
- [ ] `drizzle/0011_phase42_*.sql` — generated via `npm run db:generate` after `src/db/schema.ts` edits, **never hand-authored**, then renamed descriptively with `_journal.json` kept in sync (`scripts/check-migration-journal-sync.sh` enforces this). Ordinal `0011` confirmed against `drizzle/meta/_journal.json` (last entry is `idx: 10`, `0010_phase34_fiche_client`).

*No test framework install needed — Vitest is configured and 2578 tests are green.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration applied to the production Neon branch | D-13, PROF-01, PROF-03 | Migrations cannot be applied locally — `.env.local` resolves to prod, and `npm run check:no-drizzle-push` forbids `drizzle-kit push`. Application is a GitHub Action behind an environment gate. | Commit the generated migration, trigger the `MIGRATE PROD` workflow, approve the environment gate, confirm both jobs (dry-run + apply) succeed **before** the code registering the new Better Auth `additionalFields` deploys. |
| Registry SIRET prefill against a live SIREN | FIELD-01 / D-01 | Depends on the third-party `recherche-entreprises` API; tests must mock it, so mocked green does not prove the live shape. | In the wizard, enter a real active SIREN and confirm the SIRET field populates and remains editable. Then enter a SIREN with no registry match and confirm the field stays empty with **no** notice rendered (D-03). |
| Ordering incident does not recur | R2 (research) | The failure mode is a deploy-order bug, invisible to any test that runs against a correct schema. | After the migration applies and the code deploys, load any authed page and confirm no `APIError: Failed to get session`. This is the exact incident the `partner_type` additionalField caused previously. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without an automated verify
- [ ] Wave 0 covers the two genuine MISSING references (advisor query helper, migration)
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s for file-scoped runs
- [ ] `npm run lint:check` and `npm run check:no-drizzle-push` green
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
