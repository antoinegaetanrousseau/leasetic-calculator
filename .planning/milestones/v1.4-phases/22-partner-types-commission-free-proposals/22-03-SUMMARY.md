---
phase: 22-partner-types-commission-free-proposals
plan: 03
subsystem: admin-surfaces
tags: [admin, partner-types, ptype-01, ptype-03, audit-log, i18n, react-hook-form]

# Dependency graph
requires:
  - phase: 22-partner-types-commission-free-proposals
    plan: 01
    provides: users.partner_type column + session.user.partnerType
provides:
  - createPartnerFormSchema.partnerType (required enum, no default — D-03)
  - partnerType threaded through createPartnerInvitationAction → adminCreateInvitation
  - adminUpdatePartnerType server action (requireAdmin-first, audited before/after, T-22-03-E mitigated)
  - user.partner_type_change AuditAction
  - PartnerRow.partnerType projection in listPartnersWithLastActivity
  - TYPE badge column in PartnersList (7 columns total)
  - type-change overflow menu items in PartnerRowActions (window.confirm D-08)
affects: [22-05, partner-surfaces, commission-free-proposals]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zod v4 uses `error` not `errorMap` for custom enum error message param"
    - "window.confirm baseline for consequence-explaining type-change dialog (UI-SPEC §443, D-08)"
    - "requireAdmin() FIRST before any DB read/write (PITFALLS §7.3 + T-22-03-E)"

key-files:
  created: []
  modified:
    - src/lib/admin/schemas.ts
    - src/lib/admin/actions.ts
    - src/lib/admin/index.ts
    - src/lib/db/queries/audit-log.ts
    - src/lib/db/queries/partners.ts
    - src/lib/i18n/dictionaries.ts
    - app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx
    - app/(admin)/[adminSegment]/partners/PartnersList.tsx
    - app/(admin)/[adminSegment]/partners/_components/PartnerRowActions.tsx
    - app/(admin)/[adminSegment]/partners/PartnersList.test.tsx
    - app/(admin)/[adminSegment]/partners/_components/PartnerRowActions.test.tsx
    - app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.test.tsx
    - src/lib/admin/schemas.test.ts
    - tests/admin-09-grep-contracts.test.ts

key-decisions:
  - "Zod v4 enum error param is `error` string not `errorMap` function (auto-fix from Zod v3 plan spec)"
  - "user.partner_type_change added to AuditAction union in audit-log.ts (required for type assertion)"
  - "Type-change menu shows all types EXCEPT current (2 items per row when partnerType='Partenaire')"
  - "PartnersList grows from 6 to 7 columns with TYPE badge between STATUT and actions"

# Metrics
duration: ~9min
completed: 2026-05-29
---

# Phase 22 Plan 03: Admin Partner-Type Surfaces Summary

**Admin can assign a partner type at invitation (forced choice, no default) and change it later via an audited, consequence-explaining window.confirm dialog; the partners list shows each partner's type as a badge — PTYPE-01 + PTYPE-03 satisfied at the admin layer, requireAdmin-first on all mutations, ADMIN-09 envelope intact.**

## Task Commits

1. **Task 1: partnerType selector on create-partner form** — `8b582f2`
   - `createPartnerFormSchema.partnerType` required z.enum (no default, D-03)
   - `<select id="cpf-partnerType">` in Section 1 with placeholder + 3 plain options (D-04)
   - `partnerType` threaded through `createPartnerInvitationAction` → `adminCreateInvitation` → persisted via user row update
   - FR+EN i18n: `partners.new.field.partnerType`

2. **Task 2: adminUpdatePartnerType server action** — `a33e614`
   - `requireAdmin()` FIRST (T-22-03-E privilege-escalation mitigation)
   - No-op guard: skips write+audit when type is unchanged
   - Writes `user.partner_type_change` audit with `before`/`after` as specific type strings (D-02)
   - ADMIN-09 redaction comment on writeAuditLog
   - Bounded error key `admin.partners.error.type_change`
   - `user.partner_type_change` added to `AuditAction` union
   - FR+EN: `type.change.confirm` (D-08 consequence copy) + `action.changeType` + `error.type_change`

3. **Task 3: TYPE badge column + type-change row actions** — `eff192c`
   - `partnerType` added to `PartnerRow` interface + select projection + groupBy in `listPartnersWithLastActivity`
   - TYPE column added to `PartnersList` (7 columns total); plain chip badge with `row.partnerType` label
   - `PartnerRowActions` gets `partnerType` prop + `onChangeType` handler with `window.confirm` D-08 gate
   - Type-change items rendered as 2 buttons per row (all types except current)
   - `adminUpdatePartnerType` exported from admin barrel
   - All test fixtures updated; 1134 tests pass (0 failures)

## Files Created/Modified

- `src/lib/admin/schemas.ts` — `partnerType` z.enum field (no default) on `createPartnerFormSchema`
- `src/lib/admin/actions.ts` — `partnerType` threaded into `adminCreateInvitation`; new `adminUpdatePartnerType` action
- `src/lib/admin/index.ts` — `adminUpdatePartnerType` exported from barrel
- `src/lib/db/queries/audit-log.ts` — `user.partner_type_change` added to `AuditAction` union
- `src/lib/db/queries/partners.ts` — `partnerType` on `PartnerRow` + select + groupBy projection
- `src/lib/i18n/dictionaries.ts` — 6 new keys FR+EN (field label, column header, action, confirm, error)
- `app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx` — `<select>` field + `partnerType` in defaultValues
- `app/(admin)/[adminSegment]/partners/PartnersList.tsx` — TYPE column header + badge cell + `partnerType` prop threaded to `PartnerRowActions`
- `app/(admin)/[adminSegment]/partners/_components/PartnerRowActions.tsx` — `partnerType` prop + `onChangeType` handler + menu items
- **Test files updated (Rule 1):** `PartnersList.test.tsx`, `PartnerRowActions.test.tsx`, `CreatePartnerForm.test.tsx`, `schemas.test.ts`, `admin-09-grep-contracts.test.ts`

## Decisions Made

- **Zod v4 `error` not `errorMap`:** The plan spec used `errorMap` (Zod v3 API). Zod v4 requires `error: string` for custom enum error messages. Auto-fixed as Rule 1 during Task 1 typecheck.
- **`user.partner_type_change` AuditAction:** The new audit action string was missing from the `AuditAction` union in `audit-log.ts`. Added as Rule 2 (missing critical functionality — action cannot compile without it).
- **7-column table:** Adding the TYPE badge column between STATUT and the actions column grows the table from 6 to 7 columns. Test fixtures updated to 7.
- **Type-change renders 2 options per row:** For `partnerType='Partenaire'`, the menu shows "Changer le type → Agent" and "Changer le type → Commercial". This is the simplest consistent pattern with the existing menu structure.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zod v4 enum error param is `error`, not `errorMap`**
- **Found during:** Task 1 typecheck
- **Issue:** The plan spec used `errorMap: () => ({ message: '...' })` (Zod v3 API). Zod v4.x uses `error: 'string'` as the param name. Typecheck failed with "Object literal may only specify known properties, and 'errorMap' does not exist".
- **Fix:** Changed `{ errorMap: () => ({ message: 'error.field.required' }) }` to `{ error: 'error.field.required' }`.
- **Files modified:** `src/lib/admin/schemas.ts`
- **Commit:** `8b582f2`

**2. [Rule 2 - Missing critical functionality] `user.partner_type_change` missing from AuditAction union**
- **Found during:** Task 2 typecheck
- **Issue:** `writeAuditLog({ action: 'user.partner_type_change', ... })` produced TS2322 because the literal wasn't in the `AuditAction` union in `audit-log.ts`. The action cannot be audited without this.
- **Fix:** Added `'user.partner_type_change'` to the `AuditAction` union with ADMIN-09 and D-02 comments.
- **Files modified:** `src/lib/db/queries/audit-log.ts`
- **Commit:** `a33e614`

**3. [Rule 1 - Bug] Test fixtures missing required `partnerType` field**
- **Found during:** Task 3 test run
- **Issue:** 7 test failures across 3 files: `PartnerRow` fixtures missing the new required `partnerType` field; `fillRequiredFields()` in `CreatePartnerForm.test.tsx` didn't fill the new required select; column count assertions expected 6 not 7; `PartnerRowActions` item counts expected 2 not 4.
- **Fix:** Added `partnerType: 'Partenaire'` to all `PartnerRow` fixtures; added `fireEvent.change(partnerType select, 'Partenaire')` in `fillRequiredFields()`; updated column counts from 6→7; updated item counts from 2→4 with `partnerType` prop on test renders.
- **Files modified:** `PartnersList.test.tsx`, `PartnerRowActions.test.tsx`, `CreatePartnerForm.test.tsx`, `schemas.test.ts`, `admin-09-grep-contracts.test.ts`
- **Commit:** `eff192c`

## Verifications Run

- `npm run typecheck` — exit 0 (all 3 tasks)
- `npm run test -- partners` — 62/62 pass
- `npm run test -- dictionaries` — 299/299 pass (EN parity proof green)
- `npm run test` (full suite) — 1134 passed, 4 skipped, 0 failed
- Acceptance greps: all 5 confirmed present

## Known Stubs

None — all functionality is fully wired:
- `partnerType` is persisted at invitation time via the DB update in `adminCreateInvitation`
- `adminUpdatePartnerType` writes to the DB and audit_log (both guarded by `requireAdmin`)
- `PartnerRow.partnerType` is projected from `users.partner_type` in the SQL query
- The TYPE badge renders `row.partnerType` directly (no placeholder text)

## Self-Check: PASSED

Files verified on disk:
- `src/lib/admin/schemas.ts` — partnerType z.enum present, no .default()
- `src/lib/admin/actions.ts` — adminUpdatePartnerType exported, requireAdmin first, audit before/after
- `src/lib/db/queries/audit-log.ts` — user.partner_type_change in AuditAction union
- `src/lib/db/queries/partners.ts` — partnerType on PartnerRow + projection + groupBy
- `app/(admin)/[adminSegment]/partners/PartnersList.tsx` — TYPE column rendered
- `app/(admin)/[adminSegment]/partners/_components/PartnerRowActions.tsx` — window.confirm + adminUpdatePartnerType

Commits verified in git:
- `8b582f2` — Task 1
- `a33e614` — Task 2
- `eff192c` — Task 3

---
*Phase: 22-partner-types-commission-free-proposals*
*Completed: 2026-05-29*
