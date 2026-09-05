---
phase: 22
slug: partner-types-commission-free-proposals
status: secured
threats_open: 0
threats_total: 21
threats_closed: 21
asvs_level: 1
block_on: high
created: 2026-05-30
---

# Phase 22 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Audit date: 2026-05-30 · Auditor: gsd-security-auditor · ASVS L1 · block_on: high

---

## Accepted Risks Log

The following threats were classified `accept` at plan time and are formally recorded here.

| Threat ID | Category | Component | Rationale |
|-----------|----------|-----------|-----------|
| T-22-01-D | DoS / Data Integrity | NOT NULL column add on existing rows | `DEFAULT 'Partenaire'` on the ADD COLUMN DDL means every existing row receives the default value atomically; no NULL window exists. Row count is single-digit (low blast radius). Migration is `0005_workable_yellow_claw.sql` — generated, committed, deferred to prod GitHub Action per plan. |
| T-22-02-I | Information Disclosure | Commission leakage via test fixtures | Golden corpus (`calc.golden.test.ts`) is internal calc math exercised server-side in CI only; no commission amount is rendered to any user-facing surface. PTYPE-07 grep gates (Phase 22-05) cover all render surfaces independently. |
| T-22-04-E | Elevation of Privilege | Author drives own proposal economics | The author's `partner_type` is admin-assigned via `adminUpdatePartnerType` (requireAdmin-gated) and client-immutable (`input: false` in Better Auth additionalFields). An author reading their own session type to drive their own proposal is the intended, safe design — there is no self-promotion path. |

---

## Threat Verification Record

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-22-01-E | Elevation of Privilege | mitigate | CLOSED | `src/lib/auth/index.ts:172` — `partnerType: { type: 'string', required: false, defaultValue: 'Partenaire', input: false }` |
| T-22-01-T | Tampering | mitigate | CLOSED | `scripts/backfill-partner-type.ts:51` — `hostname.endsWith('.neon.tech')` gate; line 53 — `BACKFILL_CONFIRM !== 'YES'` exit 2; line 80 — `partner_type IS NULL` idempotency count-check; line 94 — `UPDATE ... WHERE partner_type IS NULL` |
| T-22-01-D | DoS / Integrity | accept | CLOSED | Logged in accepted risks above. `src/db/schema.ts:64` — `.notNull().default('Partenaire')`. Migration `drizzle/0005_workable_yellow_claw.sql`. |
| T-22-01-SC | Tampering | mitigate | CLOSED | No new packages installed. `scripts/backfill-partner-type.ts` uses existing project dependencies only. |
| T-22-02-T | Tampering | mitigate | CLOSED | `src/lib/calc/formula.ts` last modified in commit `5715997` (Phase 7, pre-Phase-22). git log shows no Phase-22 commits touching the file. Commission-free achieved solely via `commissionPct: 0` call-site argument. |
| T-22-02-I | Information Disclosure | accept | CLOSED | Logged in accepted risks above. |
| T-22-02-SC | Tampering | mitigate | CLOSED | No new packages installed in Phase 22-02. |
| T-22-03-E | Elevation of Privilege (HIGH) | mitigate | CLOSED | `src/lib/admin/actions.ts:200` — `const { session } = await requireAdmin();` is the FIRST statement in `adminUpdatePartnerType`; all DB reads/writes follow. `src/lib/auth/index.ts:172` — `input: false` closes the self-service path. |
| T-22-03-R | Repudiation | mitigate | CLOSED | `src/lib/admin/actions.ts:223-229` — `writeAuditLog({ action: 'user.partner_type_change', payload: { userId, before: previousType, after: newType } })`. Before/after are specific type strings. No-op guard at line 213 skips write when `previousType === newType`. `src/lib/db/queries/audit-log.ts:28` — `'user.partner_type_change'` in AuditAction union. |
| T-22-03-I | Information Disclosure | mitigate | CLOSED | `src/lib/db/queries/partners.ts:31` — ADMIN-09 comment confirms no `commission_pct` projection. `tests/admin-09-grep-contracts.test.ts:160` — `assertNoCommissionLeakage` helper active; 19 gates covering list (all 3 types), create-form selector, and row-action type-change UI. |
| T-22-03-T | Tampering | mitigate | CLOSED | `src/lib/admin/schemas.ts:99` — `z.enum(['Agent','Commercial','Partenaire'])` with no default (parse fails on invalid value). `src/lib/admin/actions.ts:197` — `newType: 'Agent' \| 'Commercial' \| 'Partenaire'` narrowed union. `src/db/schema.ts:67` — `users_partner_type_check` CHECK constraint. |
| T-22-03-SC | Tampering | mitigate | CLOSED | No new packages installed in Phase 22-03. |
| T-22-04-I | Information Disclosure (HIGH) | mitigate | CLOSED | `app/(authed)/proposals/new/calcul/page.tsx:230` — commission row pushed into `detailRows` only when `isPartenaire`; `commissionDisplay`/`commissionAmount` not materialized on commission-free path (lines 162-166 gated on `isPartenaire`). `app/(authed)/proposals/new/verification/page.tsx:248` — `calculRows` commission entry pushed only when `isPartenaire`. `src/lib/api/proposals/finalize-wizard.ts` — grep-clean: `grep -v '^[[:space:]]*//' ... \| grep -c commission` = 0. `src/lib/pdf/no-commission.test.ts:578-651` — 4-layer corpus asserts zero commission in render data, computed jsonb, audit payload, and logs for Agent and Commercial. |
| T-22-04-T | Tampering (HIGH) | mitigate | CLOSED | `src/db/schema.ts:217-228` — `paramsSnapshot.$type<{... partnerType: 'Agent' \| 'Commercial' \| 'Partenaire'; commissionApplied: boolean; }>`. `src/lib/api/proposals/finalize-helpers.ts:50-51` — snapshot records `partnerType` and `commissionApplied: partnerType === 'Partenaire'`. `src/lib/pdf/no-commission.test.ts:650-651` — asserts `paramsSnapshot.partnerType === partnerType` and `paramsSnapshot.commissionApplied === false`. `adminUpdatePartnerType` does not touch existing proposals (no proposals UPDATE in the action). |
| T-22-04-T2 | Tampering | mitigate | CLOSED | `src/lib/api/proposals/finalize-helpers.ts:76` — `commissionPct: partnerType === 'Partenaire' ? parseNumeric(params.commissionPct) : 0`. `formula.ts` untouched (last modified commit `5715997`, Phase 7). `src/lib/calc/calc.golden.test.ts` — 12-case commission-free golden corpus locked to `commissionPct: 0` seam. |
| T-22-04-E | Elevation of Privilege | accept | CLOSED | Logged in accepted risks above. |
| T-22-04-SC | Tampering | mitigate | CLOSED | No new packages installed in Phase 22-04. |
| T-22-05-I | Information Disclosure (HIGH) | mitigate | CLOSED | `tests/admin-09-grep-contracts.test.ts` — 19 `it()` gates (up from 13 baseline); `assertNoCommissionLeakage` reused verbatim (`COMMISSION_PCT_RX` + `PCT_SUFFIX_RX`). `src/lib/pdf/no-commission.test.ts` — 42 tests (up from 34); Agent + Commercial 4-layer corpus present. Full suite: 1148 tests passing. |
| T-22-05-T | Tampering | mitigate | CLOSED | `src/lib/pdf/no-commission.test.ts:650-651` — `paramsSnapshot.partnerType` equals mock type; `paramsSnapshot.commissionApplied === false`. KNOWN_MIGRATIONS at line 715 includes `'0005_workable_yellow_claw.sql'`. |
| T-22-05-R | Repudiation | mitigate | CLOSED | `tests/admin-09-grep-contracts.test.ts` — gate count increased 13 → 19 (verified by `grep -c "  it(" = 19`). `assertNoCommissionLeakage` helper unchanged (same `COMMISSION_PCT_RX` / `PCT_SUFFIX_RX` at line 157). |
| T-22-05-SC | Tampering | mitigate | CLOSED | No new packages installed in Phase 22-05. |

---

## Unregistered Threat Flags

None. All SUMMARY.md `## Threat Flags` sections across Plans 22-01 through 22-05 reported no new attack surface (all listed as "None" or resolved to existing threat IDs).

---

## Audit Trail

### Security Audit 2026-05-30
| Metric | Count |
|--------|-------|
| Threats found | 21 |
| Closed | 21 |
| Open | 0 |

Register authored at plan time (all 5 plans carry `<threat_model>`). Auditor ran in verify-mitigations mode (did not scan for new threats). All `mitigate` dispositions verified present in the implementation at file:line; all `accept` dispositions documented above.

---

## Notes

- Migration `drizzle/0005_workable_yellow_claw.sql` is committed but NOT yet applied to prod. The column does not exist in the live DB until the GitHub Action `MIGRATE PROD` is triggered. All mitigations verified at the code/static level per audit scope. Re-confirm T-22-01-T (backfill gate) behavior at apply time.
- Pre-existing lint errors in `CreatePartnerForm.tsx` (SHELL-06, hardcoded `<option>` text) were introduced by Plan 22-03 and fixed in Plan 22-05 commit `8db9b80`. The fix is present in the current codebase.
- `src/lib/calc/formula.ts` was last modified in Phase 7 (commit `5715997`). No Phase-22 commit touches it — frozen-formula invariant satisfied.
</content>
