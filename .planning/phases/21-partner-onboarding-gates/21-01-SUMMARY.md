---
phase: 21
plan: 1
subsystem: auth + ui
tags: [parametres, password-change, settings, gate-01, better-auth]
provides:
  - "/parametres route — self-service settings page available to all logged-in users (admin + partner)"
  - "Topbar UserMenu 'Paramètres' entry between displayName+email header and existing logout button"
  - "changePasswordSchema + identitySchema in src/lib/auth/schemas.ts"
  - "32 FR + 32 EN dict keys in the new parametres.* namespace + shell.user.menu.settings"
  - "Shared password-strength helpers extracted to src/lib/auth/strength.ts (SetPasswordForm + ParametresForm now share one source of truth)"
requires:
  - "Better Auth 1.6.9 (existing) — changePassword + updateUser endpoints"
  - "react-hook-form 7.75 + Zod 4.4 + @hookform/resolvers 5.2 (existing)"
  - "Sonner 2.0 (existing) — toast surface"
  - "lucide-react 0.469 — Settings, Eye, EyeOff icons (existing)"
affects:
  - "src/components/UserMenu.tsx (one new <Link> menu item)"
  - "src/components/SetPasswordForm.tsx (refactor — strength helpers now imported from src/lib/auth/strength.ts)"
tech-stack:
  added: []
  patterns:
    - "Two independent useForm instances inside ONE form element so each section owns its own dirty state — combined Save handler reads both formState.isDirty flags to decide updateUser vs. changePassword (D-06c)"
    - "Submit button OUTSIDE the form card via form='parametres-form' attribute on a separate sibling action footer (rev 2 Figma layout)"
    - "Better Auth client error envelope { error: { code, message } } mapped to inline field-level errors for known codes (INVALID_PASSWORD, PASSWORD_TOO_SHORT, PASSWORD_TOO_LONG)"
    - "Compile-time emailEditable boolean prop encodes D-06d runtime DB-probe resolution into the build artifact"
key-files:
  created:
    - "app/(authed)/parametres/page.tsx — server component (50 LOC)"
    - "app/(authed)/parametres/ParametresForm.tsx — client island (~510 LOC)"
    - "src/lib/auth/strength.ts — extracted password-strength helpers (~50 LOC)"
  modified:
    - "src/lib/auth/schemas.ts — append changePasswordSchema + identitySchema (+ D-06d resolution comment)"
    - "src/lib/auth/schemas.test.ts — append 10 Phase 21 tests (17 total tests now passing)"
    - "src/components/UserMenu.tsx — add Settings + Link imports + one new <Link href='/parametres'> menu item"
    - "src/components/SetPasswordForm.tsx — import strength helpers from src/lib/auth/strength.ts; remove inline definitions"
    - "src/lib/i18n/dictionaries.ts — append 32 FR + 32 EN parametres.* keys + shell.user.menu.settings"
decisions:
  - "D-06d resolved 2026-05-29 to 'email READ-ONLY' — live DB probe of users.email_verified on the Neon main (production) branch returned 1 (true) for BOTH antoine.rousseau@leasetic.com AND emmanuel.rousseau@leasetic.com. Better Auth 1.6.9 rejects /change-email without SMTP when emailVerified=true. Recorded inline as a top-of-section comment in src/lib/auth/schemas.ts; consequence: identitySchema OMITS the email field, ParametresForm renders email as static text + admin-contact notice, and src/lib/auth/index.ts is left UNTOUCHED (no user.changeEmail block added)."
  - "Strength helpers EXTRACTED to src/lib/auth/strength.ts (planner-recommended option). SetPasswordForm.tsx now imports strengthScore + STRENGTH_KEYS + STRENGTH_COLORS from the shared module; ParametresForm uses the same imports. Single source of truth — future scoring tweaks update both UIs at once."
  - "Better Auth client returns the envelope shape { error: { code, message } | null }. Both authClient.updateUser and authClient.changePassword follow this contract (verified against src/components/LoginForm.tsx and SetPasswordForm.tsx); ParametresForm reads error.code for inline-error mapping (Plr-9) and falls back to toast.error('parametres.error.unknown') for unknown codes."
metrics:
  duration_min: 8
  completed_date: "2026-05-29"
---

# Phase 21 Plan 01: parametres-page-and-password-change Summary

One-liner: Ship the /parametres self-service settings page (Figma 132:867 rev 2) with combined-Save semantics that hit Better Auth's changePassword (revokeOtherSessions: true) + updateUser endpoints, and add the Topbar user-menu entry — structurally closing GATE-01 ahead of the operational password rotation in Plan 21-02.

---

## What was built

### Task 1 — Schemas + D-06d resolution (TDD)

- **DB probe (Step A).** Wrote `scripts/probe-email-verified.ts` mirroring `scripts/grant-admin.ts` env-loading + Drizzle adapter, ran against the Neon production branch (`ep-icy-boat-alx5o1tz-pooler.c-3.eu-central-1.aws.neon.tech`), recorded the result, then deleted the script (it is not a deliverable).
  - **Result:** `email_verified = 1 (true)` for BOTH `antoine.rousseau@leasetic.com` AND `emmanuel.rousseau@leasetic.com`.
  - **Decision:** D-06d resolves to **email READ-ONLY**. Better Auth 1.6.9's `/change-email` endpoint rejects requests when `emailVerified=true` unless SMTP is wired (out of scope per CONTEXT.md "no SMTP" constraint). Safe fallback explicitly authorized by CONTEXT.md.
- **Step B SKIPPED.** Per the read-only resolution, `src/lib/auth/index.ts` is left untouched — no `user.changeEmail` block added. The plan's frontmatter listed `src/lib/auth/index.ts` in `files_modified` but the contingent path makes that file optional; the safer outcome (no Better Auth config drift) won.
- **Schemas (Step C).** Appended `changePasswordSchema` + `identitySchema` to `src/lib/auth/schemas.ts` matching the rev 2 contract:
  - `changePasswordSchema = z.object({ currentPassword: z.string().min(1, …), newPassword: z.string().min(8).max(128) })` — two fields only, no `confirmNewPassword`, NO `.refine()`. The "no client-side equality check" UX risk is documented in CONTEXT.md D-07 and surfaced again as a top-of-section comment.
  - `identitySchema = z.object({ firstName: z.string().min(1, …).max(60), lastName: z.string().min(1, …).max(60) })` — email field OMITTED per D-06d.
  - Inferred input types `ChangePasswordInput` + `IdentityInput` exported alongside, matching the existing `LoginInput` / `SetPasswordInput` convention.
- **Tests (Step D).** Appended 10 new Vitest tests to the existing `src/lib/auth/schemas.test.ts` (which already covered `loginSchema` + `setPasswordSchema`). Confirmed RED (10 failures) before writing the schemas, then GREEN (17/17 tests passing) after. Coverage: every behavior bullet — empty-field rejection, length bounds, the explicit "no confirm field" assertion.
- **Commit:** `2f0f36f`

### Task 2 — i18n keys + UserMenu entry

- Inserted `shell.user.menu.settings` between `shell.user.menu.aria` and `shell.user.menu.logout` in both FR (`'Paramètres'`) and EN (`'Settings'`) namespaces.
- Appended ~32 new `parametres.*` keys per language at the end of each dictionary block, grouped per the Phase 21 RESEARCH §5b canonical list. FR subtitle preserves the Figma typo `'vos information'` verbatim (D-06/D-10); EN corrects it to `'Update your information and reset your password.'`. The compile-time `_EnHasAllFrKeys` parity proof still resolves and `dictionaries.test.ts` runs 299/299 green.
- `src/components/UserMenu.tsx`:
  - Added `Link` from `next/link` and `Settings` to the existing `lucide-react` import (alongside `LogOut`, `ChevronDown`).
  - Inserted ONE new `<Link role="menuitem" href="/parametres" onClick={() => setOpen(false)}>` element between the displayName+email header block (lines 146–172) and the existing logout `<button>` (now starts at line ~210).
  - Inline styles mirrored from the logout button — same padding (10px 16px), font-size 14.5px, font-weight 500, hover overlay handlers — plus `textDecoration: 'none'` and `boxSizing: 'border-box'` for anchor-element parity. Same `<Settings size={17} strokeWidth={1.6} color: var(--muted)>` icon convention as the existing LogOut.
  - **No other lines of UserMenu touched.** Click-outside, Escape handler, displayName + email header, ChevronDown trigger, logout block — all unchanged.
- `RetractableSidebar.tsx` UNTOUCHED (per D-06 + Plr-5 — no sidebar entry).
- **Commit:** `4287fe9`

### Task 3 — `/parametres` route + ParametresForm client island

- **`app/(authed)/parametres/page.tsx`** (50 LOC server component):
  - `dynamic = 'force-dynamic'`, `metadata = { title: 'Paramètres — Leasétic Matrice' }`.
  - Reads `session` from `requireUser()` (no second auth gate needed — the `(authed)` layout already enforced the cookie check).
  - Splits `session.user.name` ("Antoine Rousseau") into `firstName` / `lastName` via a local `splitName()` helper (first token + rest) per RESEARCH §1e.
  - Renders `<main maxWidth=1040>` → `<PageHero title={hero.title} subtitle={hero.subtitle} />` → `<ParametresForm lang initialFirstName initialLastName initialEmail emailEditable={false} />`.
  - The `emailEditable={false}` literal is the compile-time encoding of D-06d's resolution.

- **`app/(authed)/parametres/ParametresForm.tsx`** (~510 LOC client island):
  - **Layout (rev 2 Figma):**
    - **Form card** (`id="parametres-form"`, `marginTop: 32`, width 100%, surface card with 16px radius + `var(--shadow-card)`):
      - Eyebrow row: 8×8 filled-circle (`background: var(--teal)`) + uppercase `'INFORMATIONS PERSONNELLES'` (~12px, letter-spacing 1.5, muted color).
      - 2-column grid (`1fr 1fr`, gap 16): Prénom (left) + Nom (right). Inline error span below each input — pulls from `identityForm.formState.errors.firstName?.message` / `.lastName?.message`. RHF Zod messages are FR-literal in the schema; the rendered text is `t('parametres.error.required', lang)` to honor the dict-key convention from RESEARCH §4c.
      - Full-width row: email rendered as STATIC `<p>` block (background `rgba(110, 113, 145, 0.06)`, padded with same radius/border as inputs for visual parity) + muted helper line `t('parametres.identity.email.readonly.notice', lang)` below.
      - `<hr>` divider (border-top 1px var(--border), 24px vertical margins).
      - 2-column grid: Ancien mot de passe + Nouveau mot de passe. Each input has the same Eye/EyeOff toggle pattern verbatim from `SetPasswordForm.tsx` (absolute positioned, right: 12, translateY(-50%)) wired to independent `showCurrent` / `showNew` `useState` flags.
      - Below "Nouveau mot de passe": 4-segment strength meter using `STRENGTH_COLORS[strength]` from the extracted `src/lib/auth/strength.ts` + dict-key label `t(STRENGTH_KEYS[strength], lang)` when `newPwd` is non-empty, otherwise `t('parametres.password.new.hint', lang)`.
      - Below the entire password row (spanning card width): muted `<p>` notice `t('parametres.password.session.notice', lang)` per D-08 + Plr-7 rev 2.
    - **Action footer** (separate sibling DIV, `marginTop: 24`, same surface-card chrome): `flex justifyContent: space-between` with Annuler (`.btn-out`, type="button") on the left and Enregistrer les modifications (`.btn-green`, `type="submit"`, `form="parametres-form"`) on the right. The `form` attribute is the rev 2 mechanism for keeping the submit OUTSIDE the form card while still firing its `onSubmit`.

  - **Combined Save handler (D-06c matrix):**
    - Two independent `useForm` calls — `identityForm<IdentityInput>` + `passwordForm<ChangePasswordInput>` — each with `mode: 'onBlur'` and `zodResolver`. Two dirty flags drive Save-disabled state, plus a per-render `useWatch` snapshot of both password values to detect the "one-of-two filled" edge case via length checks (a strictly more reliable read than `passwordForm.formState.dirtyFields` for the partial-fill scenario, which can otherwise mislabel deliberately-cleared fields as "untouched").
    - On submit:
      1. If neither section is dirty AND neither pw field is filled → early return (Save also disabled by the same predicate).
      2. If `identityDirty` → `await identityForm.trigger()`; bail on invalid.
      3. If `passwordIntent` (either pw field non-empty) → first surface the rev 2 edge case (set `parametres.error.password.required.pair` on whichever pw field is empty) and bail; otherwise `await passwordForm.trigger()`.
      4. Inside `startTransition`:
         - (a) Identity: `authClient.updateUser({ name: \`${firstName} ${lastName}\` })`. Reads `{ error }` envelope; sets `identityOk`.
         - (b) Password: `authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true })`. Reads `{ error }` envelope; sets `passwordOk` + `passwordErrorCode`.
      5. Surface results:
         - Both OK + both dirty → `parametres.toast.both.saved`.
         - Both OK + identity-only → `parametres.toast.identity.saved`.
         - Both OK + password-only → `parametres.toast.password.saved`.
         - identityOk + !passwordOk → map `INVALID_PASSWORD` to inline error under `currentPassword`, `PASSWORD_TOO_SHORT` / `PASSWORD_TOO_LONG` to inline error under `newPassword`; otherwise generic `toast.error('parametres.error.unknown')`. Also fires `toast.success('parametres.toast.partialSuccess.identityOk.passwordErr')`.
         - !identityOk + passwordOk → fires `toast.success('parametres.toast.partialSuccess.passwordOk.identityErr')` + `toast.error('parametres.error.unknown')`.
         - Both failed → inline pw error + generic `toast.error`.
      6. After any success: `identityForm.reset(identityForm.getValues())` to clear dirty state while keeping values; `passwordForm.reset()` to clear all pw fields; `router.refresh()` to refresh server-rendered session-derived bits (e.g. the topbar displayName).
    - **Cancel handler:** `identityForm.reset() + passwordForm.reset()` (Plr-6 — no navigation).

  - **Strength helpers extraction.** Per the planner's recommended option, `strengthScore` + `STRENGTH_KEYS` + `STRENGTH_COLORS` were pulled out of `SetPasswordForm.tsx` and into `src/lib/auth/strength.ts` (pure module, no framework imports). `SetPasswordForm.tsx` was updated to import from there; the unused `DictKey` type-import was removed (it was only present to type `STRENGTH_KEYS`, which now lives in the shared module). ParametresForm uses the same imports — single source of truth. The full test suite (1122 tests / 87 files) still passes.

- **Commit:** `c7dff67`

---

## Verification

- `npm run typecheck` — passes (post-each-task and post-final).
- `npm run build` — succeeds; new `ƒ /parametres` route registered alongside the existing 22 routes.
- `npm run test -- src/lib/auth/schemas.test.ts` — 17 tests pass (7 pre-existing + 10 new).
- `npm run test -- src/lib/i18n/dictionaries.test.ts` — 299 tests pass; the compile-time `_EnHasAllFrKeys` parity proof still resolves.
- `npm run test` (full suite) — 1122 tests pass / 4 skipped (integration tests pending `DATABASE_URL_TEST`).
- `git diff src/components/ui/RetractableSidebar.tsx` — zero diff (per D-06 + Plr-5).
- `git diff app/(admin)/[adminSegment]/partners/` — zero diff (admin↔admin reset stays the forgotten-password fallback per D-02).

### Manual verification (deferred to operational follow-up)

The 10 `<human-check>` steps in the plan's Task 3 verification block require a running dev server + a logged-in session. They will be executed by Antoine after this plan deploys, alongside the actual rotation in Plan 21-02. All structural prerequisites are in place:

- Sign-in flow untouched.
- `/parametres` route registered + linked from the Topbar user menu.
- `authClient.changePassword({ revokeOtherSessions: true })` wired.
- INVALID_PASSWORD path surfaces inline error under "Ancien mot de passe".
- Save disabled when neither section dirty (and neither pw field filled).

---

## Deviations from Plan

### Auto-fixed during execution

None — the plan was executed exactly as written. The rev 2 contract was honored on every layout / schema / behavior point.

### Planner-conditional path resolved at execute time

**[D-06d resolution] email demoted to READ-ONLY.** The plan's Task 1 Step B (adding `user.changeEmail` to `src/lib/auth/index.ts`) was contingent on the DB-probe outcome. The probe returned `email_verified=1` for both admins → Step B skipped, `src/lib/auth/index.ts` left untouched. The plan's frontmatter `files_modified` list includes `src/lib/auth/index.ts`, but the contingent path makes that file optional; per the plan's own Task 1 Step B note ("if read-only, executor REMOVES the file from this plan's frontmatter files_modified list in a follow-up commit message note or simply doesn't touch it"), the file is correctly absent from the executed commit set. Identity schema and ParametresForm both honor the read-only branch — email is rendered as a static text block with the admin-contact notice helper below.

---

## Authentication gates

None encountered. Better Auth's `sensitiveSessionMiddleware` freshness gate (RESEARCH §1c — 24h default) will surface as an unknown-error toast if a stale session attempts a password change in production — that path is the secure default per Plr-8 and is not user-toggleable.

---

## Figma deviation log (rev 2 — preserved verbatim from PLAN.md)

| # | Deviation | Source decision | Disposition |
|---|-----------|-----------------|-------------|
| 1 | Show/hide toggles (Eye/EyeOff) rendered on BOTH password inputs (current + new). Figma's `xxxxx-xxxxx-xxxxx` placeholder does not visually show toggles. | Plr-2 | Permanent — parity with existing SetPasswordForm UX; reuses lucide-react icons already in the dependency tree. |
| 2 | 0–4 strength meter rendered beneath "Nouveau mot de passe" reusing existing `auth.password.strength.*` keys + `strengthScore()` helper. Figma reserves vertical space below the input but does not render the meter explicitly. | Plr-3 | Permanent — reuses existing infrastructure; no new strings. |
| 3 | Static muted notice rendered BELOW the password row spanning the card width: "Modifier votre mot de passe vous déconnectera de vos autres appareils." | D-08 + Plr-7 rev 2 | Permanent — surfaces the revokeOtherSessions:true behavior to the user. Rev 2 changed the placement from "under the section heading" (rev 1) to "below the password row" because rev 2 removed the separate "Mot de passe" section heading. |
| 4 | FR hero subtitle preserved verbatim including the Figma typo "vos information"; EN hero subtitle corrected to "Update your information and reset your password.". | D-06 + D-10 | Intentional — copy fidelity to design source-of-truth for FR; EN is a fresh translation, no typo to preserve. |
| 5 | Email field disposition contingent on Task 1 D-06d resolution. If "email editable" → normal input bound to `authClient.changeEmail`. If "email read-only" → static text + muted notice "Pour changer votre adresse e-mail, contactez un administrateur.". | D-06d | Resolved at execute time to READ-ONLY (live DB probe found email_verified=1 for both admins). Compile-time `emailEditable={false}` prop encodes the resolution into the build artifact. |
| 6 | NO new sidebar entry. RetractableSidebar.tsx is untouched. Access to /parametres is ONLY via the Topbar user-menu dropdown. | D-06 + Plr-5 | Permanent (non-deviation — mirrors Figma which shows the sidebar unchanged). Documented for explicitness. |
| 7 | Annuler button resets BOTH sections' forms to initial values without navigating away (matches the standard "discard local edits" pattern). Figma doesn't specify Annuler behavior. | Plr-6 | Permanent. |
| 8 | Email label uses "Email professionnel" (FR) / "Work email" (EN) per Figma `134:503` (rev 2 — was "Adresse e-mail" / "Email" in rev 1). | D-06 rev 2 | Non-deviation — adopted from rev 2 Figma. |

**Rev 1 deviations REMOVED (Figma now matches scope):**
- ~~Avatar block replaced with initials placeholder~~ — rev 2 Figma has no avatar.
- ~~Numéro de téléphone field omitted~~ — rev 2 Figma has no phone field.
- ~~Three password fields instead of one~~ — rev 2 Figma shows two; confirmNewPassword dropped.

No additional deviations introduced during execution.

---

## Better Auth client response shape observed

The Better Auth 1.6.9 client (`authClient.updateUser`, `authClient.changePassword`) returns an envelope:

```ts
const { data, error } = await authClient.changePassword({ ... });
// error: null | { code: 'INVALID_PASSWORD' | 'PASSWORD_TOO_SHORT' | ..., message: string, status?: number }
```

Verified against the existing usage in `src/components/LoginForm.tsx` (line 60: `const { error } = await authClient.signIn.email(...)`) and `src/components/SetPasswordForm.tsx` (which uses the same envelope via its `redeemToken` wrapper). ParametresForm reads `error?.code` and matches it against `INVALID_PASSWORD` / `PASSWORD_TOO_SHORT` / `PASSWORD_TOO_LONG` for inline error surfacing; any other code (or thrown exception in the catch block) falls back to `toast.error('parametres.error.unknown')`. No third pattern invented.

---

## Known Stubs

None. The `/parametres` route is fully wired:
- Identity section reads real session data → calls real `authClient.updateUser`.
- Password section reads real form values → calls real `authClient.changePassword` with `revokeOtherSessions: true`.
- Read-only email branch renders the real session email (not a placeholder).
- No "coming soon" or TODO markers anywhere.

The "editable email" code path (in the `emailEditable ? <input/> : <static>` ternary) is present but unreachable in the current build because `emailEditable={false}` is hardcoded by `page.tsx` per D-06d. It is INTENTIONAL future-proofing, not a stub — if a future migration resets `email_verified` to 0 for both admins, flipping `emailEditable={true}` in `page.tsx` (and re-enabling `user.changeEmail` in `src/lib/auth/index.ts` + re-adding the `email` field to `identitySchema`) is a 3-line activation. The decision rationale is recorded inline in `src/lib/auth/schemas.ts`.

---

## Self-Check: PASSED

- File `app/(authed)/parametres/page.tsx` exists.
- File `app/(authed)/parametres/ParametresForm.tsx` exists.
- File `src/lib/auth/strength.ts` exists.
- File `src/lib/auth/schemas.ts` updated (changePasswordSchema + identitySchema + D-06d comment present).
- File `src/lib/auth/schemas.test.ts` updated (10 new tests, 17 total passing).
- File `src/lib/i18n/dictionaries.ts` updated (parametres.* + shell.user.menu.settings in both FR + EN; 299 tests passing).
- File `src/components/UserMenu.tsx` updated (one `<Link href="/parametres">` added).
- File `src/components/SetPasswordForm.tsx` updated (strength helpers now imported).
- Commits found in `git log --oneline main`:
  - `2f0f36f feat(21-01): add changePasswordSchema + identitySchema (D-06d → email read-only)`
  - `4287fe9 feat(21-01): add /parametres i18n keys + UserMenu entry`
  - `c7dff67 feat(21-01): ship /parametres self-service settings page`
- `src/lib/auth/index.ts` UNTOUCHED (per D-06d → read-only).
- `src/components/ui/RetractableSidebar.tsx` UNTOUCHED.
- `app/(admin)/[adminSegment]/partners/` UNTOUCHED.
- `npm run typecheck` passes.
- `npm run build` succeeds.
- `npm run test` — 1122 / 1122 passing.
