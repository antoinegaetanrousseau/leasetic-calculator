---
phase: 30
slug: company-contact-registry
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-01
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

Reconstructed from artifacts (State B — no prior VALIDATION.md). All 9 plans and
8 summaries were read; 30-09 has no summary because it is parked at a blocking
human-verify checkpoint, but its code is landed (`8d2f06b`, `e86aec4`) and its
tests run green, so it is mapped below like any other plan.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.8 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run <path>` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~12 s full suite (114 files) |

Supporting gates, all exit-0 required:

| Gate | Command |
|------|---------|
| Types | `npm run typecheck` |
| Lint (zero-warning) | `npm run lint:check` |
| Migration ↔ journal parity | `npm run check:migration-journal-sync` |
| `drizzle-kit push` ban (BOOT-09/10) | `npm run check:no-drizzle-push` |
| DB smoke filter | `npm run check:db-smoke-filter` |
| Vercel-only import ban | `npm run check:no-vercel-imports` |
| v10 localStorage ban (CUT-03) | `npm run check:no-v10-localstorage` |
| Seed SQL parity | `npm run check:seed-sql` |
| Local DB branch safety | `npm run check:local-db-branch` |

---

## Sampling Rate

- **After every task commit:** `npx vitest run <touched test file>`
- **After every plan wave:** `npm test`
- **Before `/gsd-verify-work`:** full suite green + all 9 gates exit 0
- **Max feedback latency:** ~12 s

---

## Per-Requirement Verification Map

Phase 30 ships 11 requirements. All 11 have automated verification.

| Requirement | Plans | Secure Behavior | Test Type | Automated Command | Status |
|-------------|-------|-----------------|-----------|-------------------|--------|
| **CRM-01** shared company registry | 01, 06 | `name_normalized` is a STORED generated column driven by the versioned SQL function, so normalization cannot drift into app code | integration | `npx vitest run src/lib/db/queries/crm-normalize.integration.test.ts` | ✅ green |
| **CRM-02** private per-partner relationships | 01, 04, 05, 06, 07 | a partner can neither see nor *infer* another partner's relationship — no counts, totals, suggestions, autocomplete, 403-vs-404 divergence or error-wording tell | unit + integration | `npx vitest run src/lib/db/queries/client-relationships.test.ts src/lib/db/queries/client-relationships.isolation.integration.test.ts` | ✅ green |
| **CRM-03** admin company + relations oversight | 03, 08 | admin sees every relationship on a company as counts only — never contact PII | unit | `npx vitest run src/lib/db/queries/companies.test.ts "app/(admin)/[adminSegment]/companies"` | ✅ green |
| **CRM-04** contacts hang off the relationship | 01, 05, 07 | `contacts` has no `company_id`; a contact is structurally unreachable from the shared company row | unit | `npx vitest run src/db/schema.test.ts src/lib/db/queries/client-relationships.test.ts` | ✅ green |
| **CRM-05** proposal ↔ relationship FK, snapshot untouched | 01, 09 | `inputs` JSONB stays byte-identical; `finalizeDraft`'s set-object carries no `inputs` key | unit | `npx vitest run src/lib/db/queries/proposals.test.ts src/lib/proposals/finalize-wizard.test.ts` | ✅ green |
| **CRM-06** every proposal for a client on one page | 04, 07 | proposals are fetched only *after* the ownership check resolves | unit | `npx vitest run src/lib/db/queries/client-relationships.test.ts "app/(authed)/clients/[id]/page.test.tsx"` | ✅ green |
| **CRM-07** browse + search own client book | 04, 06 | cursor/sort/search are owner-scoped and enum-validated; an injected `?ownerId=` is ignored entirely | unit | `npx vitest run src/lib/db/queries/client-relationships.test.ts "app/(authed)/clients/page.test.tsx"` | ✅ green |
| **CRM-08** external-reference seams | 01 | four nullable columns + two **partial** unique indexes exist, so Phase 32's import has somewhere to land | unit | `npx vitest run src/db/schema.test.ts` | ✅ green *(gap filled this audit)* |
| **ROLE-01** `sales` role exists | 01, 03 | CHECK constraint and every access gate widened together; `requireUser()` fails closed to `partner` | unit | `npx vitest run src/lib/auth/require.test.ts src/db/schema.test.ts` | ✅ green |
| **ROLE-02** Commercial users hold relationships as partners do | 03, 06 | `requireRelationshipHolder()` admits `sales`; no `role === 'sales'` branch exists in the sidebar — satisfied by construction | unit | `npx vitest run src/lib/auth/require.test.ts` | ✅ green |
| **ROLE-03** existing partner/admin access unchanged | 03 | six widened predicates use `inArray(['partner','sales'])`; ADMIN-09 commission envelope intact | unit | `npx vitest run src/lib/db/queries/users.test.ts src/lib/db/queries/partners.test.ts src/lib/db/queries/partner-aggregates.test.ts tests/admin-09-grep-contracts.test.ts` | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Vitest, the config and the
nine guard scripts predate this phase; no framework install was needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end cross-partner isolation on a live instance | CRM-02, CRM-03 | Requires three authenticated sessions (two partners + one admin) against a running app. Automated tests prove the query and action layers; only a live run proves the rendered pages agree | 30-09-PLAN.md `<how-to-verify>` steps 1–9 |
| Commercial partner onboarding end to end | ROLE-02 | Invitation → password set → first sign-in spans Better Auth flows and email-less token redemption | 30-09-PLAN.md step 10 |
| No regression for existing partner/admin accounts | ROLE-03 | Judgement call about "looks unchanged" across sidebar, `/proposals` and proposal detail | 30-09-PLAN.md step 11 |

These three are the 30-09 human-verify checkpoint. They are acceptance gates, not
coverage gaps — each has automated verification of its underlying logic in the
map above.

---

## Validation Audit 2026-09-01

| Metric | Count |
|--------|-------|
| Requirements | 11 |
| Covered before audit | 10 |
| Gaps found | 1 |
| Resolved | 1 |
| Escalated | 0 |

**The one gap: CRM-08.**

No test referenced `contract_tool_customer_id`, `synced_at`, `hubspot_company_id`
or `hubspot_contact_id`. The columns existed in `src/db/schema.ts` and migration
`0007`, but nothing asserted they did — so a silent drop would not have surfaced
until Phase 32 tried to import into them. That is precisely the cost the
requirement was written to avoid: *"adding them now is one column pair; adding
them later is a migration plus a backfill."*

Five tests were added to `src/db/schema.test.ts` (7 → 12) asserting the four
columns exist with correct snake_case names and are nullable, that `synced_at`
exists on **both** tables, and that both unique indexes are **partial**
(`WHERE <col> IS NOT NULL`) — a plain unique index would be wrong, since most
rows legitimately hold NULL until an import runs.

**Guard verified by schema mutation, not by assertion-reading.** The tests were
checked against deliberate regressions in `src/db/schema.ts`: removing
`hubspotCompanyId` fails 2 tests (the column test and the index test); making
`contacts.synced_at` NOT NULL fails 1. `schema.ts` was restored byte-identical
afterwards (`git diff --quiet` clean). This matters because a test that merely
reads the schema back to itself would pass under both mutations.

**Two near-misses that were NOT gaps.** CRM-07 and ROLE-02 initially appeared
uncovered because no test file cites their requirement IDs. Both are in fact
covered behaviourally — CRM-07 by the cursor/sort/search and owner-scoping tests,
ROLE-02 by `src/lib/auth/require.test.ts:189` asserting
`requireRelationshipHolder()` returns `{ session, role }` for `sales`. They were
left alone rather than annotated; the map above records where their coverage
actually lives so a future audit need not re-derive it.

Post-audit: `typecheck` 0 · `lint:check` 0 · **1435 passed / 18 skipped** (114
files) · all 9 guard gates 0.

---

## Validation Sign-Off

- [x] All requirements have automated verification
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none — existing infrastructure sufficed)
- [x] No watch-mode flags
- [x] Feedback latency < 15 s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-01

> Scope note: this artifact certifies **automated requirement coverage**. Plan
> 30-09 still owes its human-verify checkpoint (steps 10–11), listed under
> Manual-Only above.
