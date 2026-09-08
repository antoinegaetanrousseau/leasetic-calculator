---
phase: 42-captured-data-fields-advisor-profile
plan: 04
subsystem: auth
tags: [better-auth, additionalFields, drizzle, neon, rhf, zod, parametres]

# Dependency graph
requires:
  - phase: 42-captured-data-fields-advisor-profile
    provides: "Plan 42-02's users.telephone / users.company_telephone columns and MIGRATE PROD apply to the production Neon main branch (run 34241648389), the gate this plan's Task 1 reads before registering additionalFields"
provides:
  - "session.user.telephone and session.user.companyTelephone readable on every authed request via Better Auth additionalFields"
  - "Editable téléphone field + read-only fonction row on /parametres, with the combined identity save (name + telephone) in one authClient.updateUser call"
  - "Operator-verified confirmation that authed pages load and the telephone round-trips end to end"
  - "A closed incident record + branch-coverage lesson (development Neon branch was unmigrated) for Phases 43/44 to read before their own additionalFields/migration work"
affects: [42-05, 42-06, 42-08, 42-09, 42-10, 43, 44]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "additionalFields input:false is the structural (framework-level) block against client writes — same mechanism already protecting partnerType; input:true fields are validated client-side through the shared optionalPhoneSchema rule before authClient.updateUser"
    - "inferAdditionalFields({ user: { telephone } }) as a plain schema object on the auth client — keeps 'never import the server auth module into the client' intact while still satisfying authClient.updateUser's TS excess-property check"

key-files:
  created: []
  modified:
    - src/lib/auth/index.ts
    - src/lib/auth/client.ts
    - src/lib/auth/schemas.ts
    - app/(authed)/parametres/page.tsx
    - app/(authed)/parametres/ParametresForm.tsx
    - app/(authed)/parametres/ParametresForm.test.tsx

key-decisions:
  - "Registration of telephone/companyTelephone as additionalFields happened only after Plan 42-02's MIGRATE PROD run (34241648389) was confirmed green on the production Neon main branch — the ordering that avoids the documented partner_type outage (RESEARCH R2 Pitfall 1)"
  - "A second, previously-unmigrated Neon branch (development, used by .env.local) broke localhost login the moment this plan's registration landed — remedied by running DB Migrate (Branch-Scoped) with branch:development (run 34250717059). The migration gate that only verifies production is insufficient once additionalFields are involved: every Neon branch actually in use (main, development, preview) needs the migration before code registering new columns is exercised against it. preview was NOT migrated in this session — flagged forward to Phases 43/44."

requirements-completed: [PROF-01]

# Metrics
duration: ~8min active work (Tasks 1-2) + operator verification window
completed: 2026-09-08
---

# Phase 42 Plan 04: Better Auth telephone/companyTelephone additionalFields + /parametres téléphone Summary

**Registered `telephone` (partner-writable) and `companyTelephone` (admin-only, `input:false`) as Better Auth `additionalFields`, added an editable téléphone field and read-only fonction row to `/parametres`, and closed a real login-breaking incident caused by an unmigrated Neon `development` branch — operator-verified end to end on 2026-09-08.**

## Performance

- **Duration:** ~8 minutes of active execution across Tasks 1-2 (Task 1 commit `e62a6b6` at 2026-09-08T15:15:00Z, Task 2 commit `b020801` at 2026-09-08T15:22:33Z, both UTC), plus the incident-response window between deploy and the operator's confirmation later the same day
- **Started:** 2026-09-08T15:15:00Z (Task 1 commit)
- **Completed:** 2026-09-08T17:04:01Z (this summary, following operator verification)
- **Tasks:** 3 (2 auto + 1 checkpoint:human-verify)
- **Files modified:** 6 (`src/lib/auth/index.ts`, `src/lib/auth/client.ts`, `src/lib/auth/schemas.ts`, `app/(authed)/parametres/page.tsx`, `app/(authed)/parametres/ParametresForm.tsx`, `app/(authed)/parametres/ParametresForm.test.tsx`)

## Accomplishments

- `src/lib/auth/index.ts` now registers two `additionalFields` beneath `partnerType`: `companyTelephone` (`input: false`, D-13 — structurally admin-only, the same framework mechanism already protecting `partnerType`/`role` from self-elevation) and `telephone` (`input: true`, D-19/PROF-01 — partner-writable via `/parametres`). Neither declares a `defaultValue`; both columns were already live on production before this landed (Plan 42-02, run `34241648389`).
- `/parametres` gained an editable **Téléphone** field (Controller-bound `PhoneInput`, no required asterisk — PROF-02's block lives exclusively at finalize per D-17) directly beneath Prénom/Nom, and a read-only **Fonction** row beneath the email row rendering the raw `partnerType` string as static text (`text-ink text-sm` per UI-SPEC's typography cap) with a "Défini par votre administrateur." notice beneath it. The single identity save now sends `{ name, telephone }` together in one `authClient.updateUser` call; `companyTelephone` is never sent from this surface.
- `src/lib/auth/schemas.ts`'s `identitySchema` gained an optional `telephone` field reusing `optionalPhoneSchema`'s exact rule (no third phone regex).
- `src/lib/auth/client.ts` gained an `inferAdditionalFields({ user: { telephone } })` plugin — a plain schema object, not a `typeof auth` import — as a Rule 3 blocking fix for a `tsc` excess-property error on `authClient.updateUser({ telephone })`, preserving the "never import the server auth module into the client" invariant.
- **Operator verified on localhost, 2026-09-08:** login works with no `APIError: Failed to get session`; the `/parametres` téléphone field round-trips (edited, saved, reloaded, persisted).
- Two of Task 3's five verification points were confirmed from source rather than by clicking, and are recorded here rather than re-asserted by screenshot: D-14 holds because `app/(authed)/parametres/ParametresForm.tsx` renders fonction as a static `<p id="pf-fonction">` (text child + read-only notice), never an `<Input>`; and clearing the telephone still saves because `src/lib/auth/schemas.ts` types it via `optionalPhoneSchema`, which accepts `undefined`/`''`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Register telephone and companyTelephone as Better Auth additionalFields** - `e62a6b6` (feat)
2. **Task 2: Add the editable telephone field and the read-only fonction row to /parametres** - `b020801` (feat, includes the Rule 3 `inferAdditionalFields` client fix and the TDD test file in the same commit)
3. **Task 3: checkpoint:human-verify** - no commit (operator confirmed on localhost 2026-09-08; see Operator Verification and Incident sections below)

**Plan metadata:** this summary's commit (see below)

## Files Created/Modified

- `src/lib/auth/index.ts` - `additionalFields.companyTelephone` (`input:false`) and `additionalFields.telephone` (`input:true`)
- `src/lib/auth/client.ts` - `inferAdditionalFields({ user: { telephone } })` plugin (Rule 3 fix, keeps client server-auth-free)
- `src/lib/auth/schemas.ts` - `identitySchema.telephone` reusing `optionalPhoneSchema`
- `app/(authed)/parametres/page.tsx` - widened `session.user` cast (`telephone`, `partnerType`), passes `initialTelephone` + `fonction` props
- `app/(authed)/parametres/ParametresForm.tsx` - editable Controller-bound `PhoneInput` row + read-only fonction `<p>` row; combined `{ name, telephone }` save
- `app/(authed)/parametres/ParametresForm.test.tsx` - `describe('Phase 42 — telephone + fonction (PROF-01 / D-14)')`, 6 new tests + Test 8 updated for the combined-save payload; 20/20 green

## Decisions Made

- Registration was gated behind Plan 42-02's confirmed `MIGRATE PROD` run before this plan's Task 1 edited `src/lib/auth/index.ts` — see `42-02-SUMMARY.md`'s Migration Apply Evidence section (run `34241648389`, both jobs green, `Migrations applied successfully.` naming `0011_phase42_captured_data.sql`).
- `inferAdditionalFields` was added to the auth *client* (not imported from the server `auth()` instance) specifically to avoid pulling server-only Better Auth config into the client bundle — a plain schema literal satisfies the TS excess-property check without that import.
- PROF-01 is marked complete in this plan's close-out (see below), not in Plan 42-02 — per Plan 42-02's own recorded operator instruction that storage-primitive plans should not tick requirements that the reading/writing surface (this plan) actually closes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `inferAdditionalFields` to `src/lib/auth/client.ts`**
- **Found during:** Task 2
- **Issue:** `authClient.updateUser({ name: fullName, telephone: identityValues.telephone })` failed `tsc` with an excess-property error — the client's `updateUser` type has no knowledge of the server-registered `telephone` additionalField.
- **Fix:** Added `inferAdditionalFields({ user: { telephone } })` as a client plugin, using a standalone plain schema object rather than `typeof auth`, preserving the existing invariant that the client bundle never imports the server auth module.
- **Files modified:** `src/lib/auth/client.ts`
- **Verification:** `npm run typecheck` exits 0; `npx vitest run app/(authed)/parametres/ParametresForm.test.tsx` green.
- **Committed in:** `b020801` (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for `tsc` to pass on the plan's own required call site. No scope creep — no other client-side auth behavior touched.

## Issues Encountered — Incident: development Neon branch login outage (post-deploy, pre-checkpoint-close)

**What happened:** Immediately after this plan's `additionalFields` registration deployed, the operator could not log in on localhost.

**Root cause:** Better Auth's Drizzle adapter builds a `SELECT` naming every registered `additionalField` column on every session read. Migration `0011_phase42_captured_data` (which adds `users.telephone` and `users.company_telephone`) had been applied to the Neon **main** (production) branch by Plan 42-02 (`MIGRATE PROD`, run `34241648389`). But `.env.local`'s `DATABASE_URL` on this machine points at the Neon **development** branch (`ep-polished-band-alphc576-pooler…`) — and no run in the `DB Migrate (Branch-Scoped)` workflow's history had ever targeted `development`. The `SELECT` on localhost therefore named two columns that did not exist on that branch, and every authed route 500'd with `APIError: Failed to get session` — the exact outage class this plan's Task 1 gate exists to prevent, reproduced on a branch the gate never checked.

**Resolution:** `DB Migrate (Branch-Scoped)` was re-run with `branch: development` — GitHub Actions run **`34250717059`**. Both jobs (dry run, apply) completed `success`; the apply log shows `0011_phase42_captured_data.sql (2358 bytes)` and `Applying migrations to ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech ... Migrations applied successfully.` The operator restarted the local dev server and login worked immediately after.

**Lesson for Phases 43/44 (recorded explicitly so it carries forward):** A migration gate that verifies only the production branch is insufficient once `additionalFields` are involved. Better Auth reads registered additionalFields on *every* environment a developer or the app runs against, not just production. Every Neon branch the team actually uses — `main`, `development`, and `preview` — needs the migration applied before code registering new columns is exercised against it, not just the branch that serves real partners. **`preview` was NOT migrated in this session** and may hit the same `APIError: Failed to get session` failure on the next Vercel preview deploy that touches an authed route. Phase 43 (and any future plan that adds another `additionalField` or touches this migration chain) should either (a) migrate all three branches as part of its own gate, or (b) explicitly re-verify `preview`'s migration state before deploying additionalFields changes to a preview environment.

## Operator Verification (Task 3, checkpoint:human-verify — RESOLVED)

**Verified by the operator (Antoine) on localhost, 2026-09-08:**
- Login works — authed pages load with no `APIError: Failed to get session` (post-incident-fix, run `34250717059`).
- The `/parametres` téléphone field round-trips: edited the phone, saved, reloaded, and the value persisted.

**Confirmed from source (not re-clicked, recorded here per the checkpoint resolution instruction):**
- D-14 holds: `app/(authed)/parametres/ParametresForm.tsx` renders fonction as a static `<p id="pf-fonction">` element (text child + read-only notice), never an `<Input>`, `<textarea>`, or `<select>`.
- Clearing the telephone still saves: `src/lib/auth/schemas.ts` types `telephone` via `optionalPhoneSchema`, which accepts `undefined`/`''` alongside a validated 10-digit value.

The five `<how-to-verify>` steps in `42-04-PLAN.md` Task 3 are satisfied: `/` and `/parametres` render without the session error, the téléphone value survives a reload, the fonction row is not focusable/editable, and saving with an empty téléphone succeeds.

## User Setup Required

None beyond the completed checkpoint. The one external action this plan's incident required — migrating the Neon `development` branch — is done and verified green (run `34250717059`). **`preview` remains unmigrated** — see the Lesson above; not this plan's scope to fix, but flagged forward.

## Next Phase Readiness

- `session.user.telephone` and `session.user.companyTelephone` are readable on every authed request — Plans 42-08 and 42-09 both already read them (see their summaries).
- A partner can set and clear their own téléphone on `/parametres` and sees their fonction read-only, satisfying PROF-01 end to end (marked complete in `.planning/REQUIREMENTS.md`).
- No surface lets a partner write `companyTelephone` or `partnerType` — both remain `input: false`.
- **Phase 43/44 must read the branch-coverage lesson above** before their own migration or additionalFields work: verify `preview`'s migration state, not just `main`, before any deploy that exercises an authed route against it.
- PROF-03 (the PDF-render half of the advisor profile) remains Phase 43's scope and is intentionally NOT marked complete by this plan.

---
*Phase: 42-captured-data-fields-advisor-profile*
*Completed: 2026-09-08*

## Self-Check: PASSED

Both task commits (`e62a6b6`, `b020801`) found in git history via `git show --stat`, confirmed to touch exactly the files claimed. All 6 modified files exist on disk. GitHub Actions run `34250717059` (development-branch migration) and `34241648389` (production-branch migration, from 42-02-SUMMARY.md) are referenced as external evidence, not local git artifacts — consistent with the self-check exemption already established for Plan 42-02's Task 3.
