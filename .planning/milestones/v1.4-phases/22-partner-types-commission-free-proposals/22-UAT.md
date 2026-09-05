---
status: partial
phase: 22-partner-types-commission-free-proposals
source: [22-01-SUMMARY.md, 22-02-SUMMARY.md, 22-03-SUMMARY.md, 22-04-SUMMARY.md, 22-05-SUMMARY.md]
started: 2026-05-29T22:38:26Z
updated: 2026-05-29T22:38:26Z
verification_mode: test-suite-evidence
---

## Current Test

[testing paused — 1 item outstanding: live cold-start blocked on migration apply]

## Tests

### 1. Cold Start Smoke Test
expected: With migration 0005 applied to the dev DB, the app boots from scratch, login succeeds, and the admin partners list loads without error.
result: blocked
blocked_by: migration-not-applied
reason: "Migration 0005_workable_yellow_claw.sql is committed but not applied to any DB (deliberate Wave 1 decision — prod migrations run via the GitHub Action). The live cold-start path reads users.partner_type, which does not yet exist in the target DB. Re-run this test after the migration is applied."

### 2. Create-partner form requires a Type de partenaire
expected: On the admin "invite/create partner" form, a required "Type de partenaire" selector appears with 3 options (Agent / Commercial / Partenaire) and NO default — submitting without choosing is rejected (force-choice, PTYPE-01 / D-03).
result: pass
evidence: "Verified by test suite (user-accepted): CreatePartnerForm.test.tsx (selector + force-choice), schemas.test.ts (required z.enum, no default), admin-09-grep-contracts (create-form selector gate)."

### 3. Partners list shows a TYPE badge column
expected: The admin partners list shows a TYPE column; each partner's type renders as a plain badge (Agent / Commercial / Partenaire). Existing partners show "Partenaire" (PTYPE-02 backfill). (D-07)
result: pass
evidence: "Verified by test suite (user-accepted): PartnersList.test.tsx (7-column layout + TYPE badge), admin-09-grep-contracts (per-type list-badge gates)."

### 4. Change a partner's type (audited, confirmation dialog)
expected: The partner row overflow menu offers type-change options (every type except the current one). Selecting one shows a consequence-explaining confirmation; confirming updates the type and writes an audit entry recording the specific before/after type strings. A partner cannot change their own type. (PTYPE-03 / D-08 / D-02)
result: pass
evidence: "Verified by test suite (user-accepted): PartnerRowActions.test.tsx (window.confirm + type-change items), adminUpdatePartnerType in actions.ts (requireAdmin-first, audited before/after specific strings; input:false on the auth field blocks self-mutation), admin-09-grep-contracts (row-action gate)."

### 5. Agent/Commercial proposal — commission structurally absent
expected: When the proposal author is Agent or Commercial, wizard step-2 (calcul) and step-3 (verification) show NO commission row at all (rows close up, no placeholder or "sans commission" note), and the loyer equals montant HT × coefficient / 100. (PTYPE-04 / PTYPE-05 / D-05)
result: pass
evidence: "Verified by test suite (user-accepted): calc.golden.test.ts (12 commission-free cases, loyer = HT×coeff/100 ±0.01€), finalize-wizard.test.ts + finalize/route.test.ts (partnerType threading, commissionApplied:false), no-commission.test.ts 4-layer corpus (Agent + Commercial), admin-09-grep-contracts (structural-absence gates)."

### 6. Partenaire proposal — commission still shown
expected: When the proposal author is Partenaire, the commission row still appears on wizard steps 2+3 and the loyer factors commission in, exactly as before this phase (no regression). (D-12)
result: pass
evidence: "Verified by test suite (user-accepted): calc.golden Partenaire cases unchanged (free loyer asserted strictly < Partenaire loyer in all 12 cases), full 1148-test suite green = no regression on the Partenaire path; finalize snapshot records commissionApplied:true for Partenaire."

### 7. Commission-free PDF + reproducible snapshot
expected: Finalizing an Agent/Commercial proposal produces a PDF with no commission anywhere; the stored snapshot records partnerType + commissionApplied:false, so re-rendering the PDF stays identical even after the partner's type is later changed by an admin. (PTYPE-06 / PTYPE-07)
result: pass
evidence: "Verified by test suite (user-accepted): no-commission.test.ts 4-layer corpus (render data / computed jsonb / snapshot / loyer) for Agent + Commercial, asserting paramsSnapshot.partnerType + commissionApplied:false; byte-determinism fixture unaffected (snapshot freeze proves reproducibility under later type change)."

## Summary

total: 7
passed: 6
issues: 0
pending: 0
skipped: 0
blocked: 1

## Gaps

[none — zero code issues; the only outstanding item is a prerequisite deploy gate, not a defect]

## Notes

- **Verification mode: test-suite evidence** (user-accepted 2026-05-29). The 1148-test suite — including the 42-case no-commission PDF corpus and the 19-gate ADMIN-09 grep-contract suite — was accepted as proof of the user-observable invariants for tests 2–7. typecheck / lint / no-drizzle-push / no-vercel-imports all clean.
- **Outstanding (blocked, not a defect):** migration `0005_workable_yellow_claw.sql` is committed but unapplied. Tests 1 (and the real-data behavior behind 2–7) require applying it via the GitHub Action `MIGRATE PROD` + running the backfill (`db:backfill:partner-type` with `BACKFILL_CONFIRM=YES`). Re-run live UAT after deploy.
- The phase's `deferred-items.md` lint entry is STALE — it was resolved in 22-05 (commit 8db9b80); `npm run lint` exits 0.
</content>
