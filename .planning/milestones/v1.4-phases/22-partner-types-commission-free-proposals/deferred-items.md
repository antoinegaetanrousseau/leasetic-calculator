# Deferred Items — Phase 22

Out-of-scope discoveries logged during plan execution. Not fixed by the discovering plan (SCOPE BOUNDARY rule). Tracked here for a follow-up plan or the phase verifier.

## From Plan 22-04 (discovered during Task 3 verification)

### Lint: hardcoded `<option>` text in CreatePartnerForm.tsx (no-restricted-syntax / SHELL-06 / D-26)

- **File:** `app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx`
- **Lines:** 282, 283, 284
- **Errors:**
  - `282:37  error  Hardcoded text in JSX is forbidden (SHELL-06 / D-26)`
  - `283:42  error  Hardcoded text in JSX is forbidden (SHELL-06 / D-26)`
  - `284:42  error  Hardcoded text in JSX is forbidden (SHELL-06 / D-26)`
- **Source:** The partner-type `<option>` values (`Agent` / `Commercial` / `Partenaire`) rendered as literal JSX text. Introduced by commit `8b582f2` (Plan **22-03**, PTYPE-01 — `feat(22-03): add partnerType selector to create-partner form`).
- **Why deferred:** This file is owned by Plan 22-03, not Plan 22-04. The literals are partner-type enum values, not 22-04 commission-free surface. `npm run lint` on the Plan 22-04 files only is clean (exit 0); `npm run typecheck` exits 0. These are pre-existing, out-of-scope failures per the SCOPE BOUNDARY rule.
- **Suggested fix (for a 22-03 follow-up or the phase verifier):** Either (a) wrap each option label in `t(key, lang)` with dedicated dict keys, or (b) add a scoped eslint-disable with a justification that the values are stable enum identifiers, not user-facing copy. Decide consistently with how other enum selects in the codebase are handled.
