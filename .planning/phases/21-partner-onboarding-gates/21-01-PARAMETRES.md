---
plan_id: 21-01
plan_name: parametres-page-and-password-change
phase: 21
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/auth/schemas.ts
  - src/lib/i18n/dictionaries.ts
  - src/components/UserMenu.tsx
  - app/(authed)/parametres/page.tsx
  - app/(authed)/parametres/ParametresForm.tsx
  - src/lib/auth/index.ts
autonomous: true
requirements:
  - GATE-01
must_haves:
  truths:
    - "Logged-in user can open the Topbar user menu and see a new 'Paramètres' (FR) / 'Settings' (EN) entry between the displayName+email header and the existing 'Se déconnecter' button."
    - "Clicking 'Paramètres' navigates to /parametres; the page renders the Paramètres hero ('Paramètres' + Figma-verbatim subtitle including the 'vos information' typo in FR) inside the existing (authed) Shell."
    - "Visiting /parametres while logged out redirects to /login (gate inherited from app/(authed)/layout.tsx)."
    - "The Account card shows two sections — 'Informations' (Prénom / Nom / Adresse e-mail) and 'Mot de passe' (Mot de passe actuel + Nouveau mot de passe + Confirmer le nouveau mot de passe) — separated by a divider, with a single 'Annuler' + 'Enregistrer les modifications' action footer (per D-06)."
    - "Avatar block is rendered as an initials placeholder (e.g. 'AR') matching the existing UserMenu pattern; no upload UI (per D-06b)."
    - "Numéro de téléphone field is omitted (per D-06b)."
    - "Password section displays an Eye/EyeOff show/hide toggle on each of the three password inputs (per Plr-2) and a 0–4 strength meter beneath 'Nouveau mot de passe' driven by auth.password.strength.* keys + strengthScore() helper (per Plr-3)."
    - "Password section header includes a muted static notice rendered immediately under the heading: 'Modifier votre mot de passe vous déconnectera de vos autres appareils.' (FR) / EN equivalent (per D-08, Plr-7)."
    - "Save button is disabled when neither section is dirty (per D-06c)."
    - "When only the identity section is dirty, Save calls authClient.updateUser({ name: `${firstName} ${lastName}` }) (and authClient.changeEmail({ newEmail }) iff D-06d resolved to 'email editable') and surfaces a success toast 'parametres.toast.identity.saved'."
    - "When only the password section is dirty (all three password fields non-empty + new === confirm), Save calls authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true }) and surfaces success toast 'parametres.toast.password.saved'."
    - "When both sections are dirty, identity runs first then password; both succeed → 'parametres.toast.both.saved'; identity ok + password fails (e.g. INVALID_PASSWORD) → INLINE error 'parametres.error.password.current.wrong' under 'Mot de passe actuel' + 'parametres.toast.partialSuccess.identityOk.passwordErr'; conversely 'parametres.toast.partialSuccess.passwordOk.identityErr' (per D-06c)."
    - "On successful changePassword, all OTHER sessions of the same user are revoked (revokeOtherSessions: true); the current device's session remains active per Better Auth 1.6.9 contract (per D-08)."
    - "The existing /[adminSegment]/partners admin↔admin reset flow (PartnersList → InviteUrlModal → src/lib/auth/redeem.ts) remains untouched and functional as the forgotten-password fallback (per D-02)."
    - "All new FR + EN dict keys for Phase 21 are present in src/lib/i18n/dictionaries.ts and the compile-time _EnHasAllFrKeys parity proof passes."
    - "RetractableSidebar (src/components/ui/RetractableSidebar.tsx) is NOT modified — no new sidebar item (per D-06 + Plr-5)."
  artifacts:
    - path: "src/lib/auth/schemas.ts"
      provides: "changePasswordSchema + identitySchema + their inferred input types"
      contains: "export const changePasswordSchema"
    - path: "src/lib/i18n/dictionaries.ts"
      provides: "All Phase 21 FR + EN keys (shell.user.menu.settings, parametres.*)"
      contains: "parametres.hero.title"
    - path: "src/components/UserMenu.tsx"
      provides: "Topbar user-menu entry pointing to /parametres"
      contains: "/parametres"
    - path: "app/(authed)/parametres/page.tsx"
      provides: "Server component for the /parametres route — hero + ParametresForm island"
      exports: ["default"]
    - path: "app/(authed)/parametres/ParametresForm.tsx"
      provides: "Client island — RHF form, two sections, combined Save semantics"
      exports: ["ParametresForm"]
  key_links:
    - from: "src/components/UserMenu.tsx"
      to: "/parametres"
      via: "next/link <Link href='/parametres'>"
      pattern: "href=\"/parametres\""
    - from: "app/(authed)/parametres/page.tsx"
      to: "app/(authed)/parametres/ParametresForm.tsx"
      via: "client-island import"
      pattern: "ParametresForm"
    - from: "app/(authed)/parametres/ParametresForm.tsx"
      to: "authClient.changePassword"
      via: "better-auth/client call inside submit handler"
      pattern: "authClient\\.changePassword"
    - from: "app/(authed)/parametres/ParametresForm.tsx"
      to: "authClient.updateUser"
      via: "better-auth/client call inside submit handler"
      pattern: "authClient\\.updateUser"
verification:
  - "npm run typecheck"
  - "npm run build"
  - "npm run test -- src/lib/i18n/dictionaries.test.ts"
  - "Manual: sign in → user menu → 'Paramètres' → /parametres renders the Account card."
  - "Manual: enter wrong current password → INLINE error under 'Mot de passe actuel' surfaces 'parametres.error.password.current.wrong'."
  - "Manual: enter correct currentPassword + valid new+confirm → success toast; sign out on a second browser/incognito → that session is invalidated (revokeOtherSessions: true verified)."
---

<objective>
Ship the new self-service Paramètres page available to all logged-in users (admin AND partner) at /parametres, accessed via a new "Paramètres" entry in the Topbar user-menu dropdown. The page renders one Account card with two sections — Informations (Prénom / Nom / Adresse e-mail) and Mot de passe (current + new + confirm, with strength meter and show/hide toggles) — and a single Save button that handles identity-only, password-only, or combined updates with partial-success semantics. Password changes call Better Auth's changePassword endpoint with revokeOtherSessions: true.

This plan closes GATE-01 structurally (the new flow exists in production). The actual admin password rotations + the GATE-02 privacy-notice publication are operational steps executed in Plan 21-02 once this plan is deployed.

Purpose: Permanently close the no-self-service-password-change gap (unresolved since v1.1 Phase 6) and ship the Figma 132:867 Paramètres surface as the in-app mechanism both admins use to rotate from the shared launch-day password `leasetic2026` to individual strong passwords. Implements decisions D-02, D-03, D-06, D-06b, D-06c, D-06d, D-07, D-08, D-09, D-10 from 21-CONTEXT.md.

Output: A new /parametres route, a new client-island form component, schema additions, ~30 i18n keys per language, and a one-line edit to UserMenu.tsx wiring the entry.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/21-partner-onboarding-gates/21-CONTEXT.md
@.planning/phases/21-partner-onboarding-gates/21-RESEARCH.md

# Analog files the executor reads before writing (do not modify unless instructed)
@src/components/SetPasswordForm.tsx
@src/components/UserMenu.tsx
@src/lib/auth/schemas.ts
@src/lib/auth/index.ts
@src/lib/i18n/dictionaries.ts
@app/(authed)/layout.tsx
@app/(authed)/aide/page.tsx
@src/components/ui/PageHero.tsx
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Diagnostic — probe emailVerified state for both admins, decide D-06d, append changePasswordSchema + identitySchema</name>
  <files>src/lib/auth/schemas.ts, src/lib/auth/schemas.test.ts, src/lib/auth/index.ts</files>

  <read_first>
    - `src/lib/auth/schemas.ts` (lines 1–33, current state — single export pattern, zod-only imports, .refine convention).
    - `src/components/SetPasswordForm.tsx` (lines 1–120, the canonical refine + 8-char min pattern).
    - `src/lib/auth/index.ts` (lines 122–169 — argon2id hash config + minPasswordLength: 8 + the existing `user.additionalFields` block that the diagnostic decision may extend).
    - `.planning/phases/21-partner-onboarding-gates/21-RESEARCH.md` §1d (Better Auth `updateUser` rejects `email`, the `/change-email` endpoint requirements, and the `updateEmailWithoutVerification: true` escape hatch contingent on `emailVerified=false`).
    - `.planning/phases/21-partner-onboarding-gates/21-CONTEXT.md` D-06d (the binding decision: email editable iff Better Auth permits it without SMTP; otherwise demote to read-only).
  </read_first>

  <behavior>
    - changePasswordSchema parses { currentPassword: "abc", newPassword: "newpass12", confirmNewPassword: "newpass12" } → success.
    - changePasswordSchema rejects when currentPassword is empty string → error.message "Mot de passe actuel requis", path ["currentPassword"].
    - changePasswordSchema rejects when newPassword.length < 8 → error path ["newPassword"].
    - changePasswordSchema rejects when newPassword.length > 128 → error path ["newPassword"].
    - changePasswordSchema rejects when newPassword !== confirmNewPassword → error.message "Les mots de passe ne correspondent pas", path ["confirmNewPassword"].
    - identitySchema parses { firstName: "Antoine", lastName: "Rousseau", email: "a@leasetic.com" } → success (only if D-06d resolves to "email editable"; otherwise identitySchema has only firstName + lastName).
    - identitySchema rejects when firstName is empty string → error path ["firstName"].
    - identitySchema rejects when lastName is empty string → error path ["lastName"].
    - identitySchema rejects when email is invalid format (only if email field is kept) → error path ["email"].
    - Inferred types `ChangePasswordInput` and `IdentityInput` are exported alongside the schemas (matches the existing `LoginInput` / `SetPasswordInput` pattern in schemas.ts line 31–32).
  </behavior>

  <action>
    Step A — DIAGNOSTIC (decides D-06d before writing the schema):

    Run the live-DB probe using the existing Drizzle adapter to read `users.emailVerified` for both admins. Pick whichever of the two routes is simpler given the project's existing tooling:

    1. Add a short one-off Node script (e.g. `scripts/probe-email-verified.ts`, mirror the shape of `scripts/grant-admin.ts` for env loading + `db()` helper usage from `src/lib/db`), execute it with `npx tsx scripts/probe-email-verified.ts`, and DELETE the script after recording the result (this script is NOT a deliverable — it is diagnostic-only).
    2. OR query the production DB directly via `npx neonctl sql` (Neon CLI is the existing project tool — see Phase 20 SUMMARYs) with: `SELECT email, email_verified FROM users WHERE email IN ('antoine.rousseau@leasetic.com','emmanuel.rousseau@leasetic.com');`

    Decide:
    - If `email_verified = false` for BOTH admins → D-06d resolves to "email editable". Proceed to Step C.
    - If `email_verified = true` for EITHER admin → D-06d resolves to "email read-only" (the CONTEXT.md-authorized safe fallback). Proceed to Step C with email demoted.

    Record the decision inline in a top-of-file comment in `src/lib/auth/schemas.ts` next to the new schemas (e.g. `// D-06d resolved 2026-05-29: email is <editable | read-only> in identitySchema — DB probe found emailVerified=<false|true> for <antoine|emmanuel|both>.`).

    Step B — IF (and only if) the decision in Step A is "email editable":

    Edit `src/lib/auth/index.ts` to extend the `user` config block (currently lines ~140–168 — locate the existing `user: { additionalFields: { ... } }` declaration) by ADDING (not replacing) a `changeEmail` block at the same nesting level as `additionalFields`:

    ```
    user: {
      additionalFields: { ... existing ... },
      changeEmail: {
        enabled: true,
        updateEmailWithoutVerification: true,  // per D-06d + RESEARCH §1d
      },
    },
    ```

    Confirm the property name is `changeEmail` (camelCase) by referencing Better Auth 1.6.9 source at `node_modules/better-auth/dist/api/routes/update-user.mjs` lines 377–493 (the `/change-email` endpoint behind that flag).

    If the decision is "email read-only", SKIP Step B entirely. `src/lib/auth/index.ts` is left untouched and the executor REMOVES the file from this plan's frontmatter `files_modified` list in a follow-up commit message note (or simply doesn't touch it — the frontmatter is the contract; not editing the file is fine).

    Step C — Append new schemas to `src/lib/auth/schemas.ts` (after the existing `setPasswordSchema` export, preserving the existing structure):

    Add `changePasswordSchema` as a `z.object({ currentPassword, newPassword, confirmNewPassword }).refine(...)` where:
    - `currentPassword: z.string().min(1, 'Mot de passe actuel requis')`
    - `newPassword: z.string().min(8).max(128)`
    - `confirmNewPassword: z.string()`
    - `.refine((d) => d.newPassword === d.confirmNewPassword, { message: 'Les mots de passe ne correspondent pas', path: ['confirmNewPassword'] })`

    Add `identitySchema` as a `z.object({ firstName, lastName, email? })`:
    - `firstName: z.string().min(1, 'Prénom requis').max(60)`
    - `lastName: z.string().min(1, 'Nom requis').max(60)`
    - `email: z.string().email()` — INCLUDE only if D-06d resolved to "email editable" (Step A); OMIT entirely if "email read-only".

    Export the inferred input types:
    - `export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;`
    - `export type IdentityInput = z.infer<typeof identitySchema>;`

    The schemas must be pure Zod — no framework imports, no 'use server' / 'use client' directives, no I/O. Match the existing schemas.ts JSDoc convention (the multi-line `/**` block before each export, mirroring the `setPasswordSchema` doc block at lines 16–20).

    Error-message literals stay in FR (matching the existing `setPasswordSchema` mixed-language convention; UI surfaces all translate via `t(key, lang)` on the rendering side per RESEARCH §4c).

    Step D — Create `src/lib/auth/schemas.test.ts` (new file) with Vitest tests that exercise every <behavior> bullet above. Mirror the existing test convention in the codebase (e.g. `src/lib/auth/redeem.test.ts` if it exists, otherwise the project's standard `describe` + `it` + `expect` shape). The tests must be Vitest-compatible (the project uses Vitest 2.1.8). Tests run before the schemas exist → confirm they FAIL → write the schemas → confirm they PASS.
  </action>

  <verify>
    <automated>npm run typecheck && npm run test -- src/lib/auth/schemas.test.ts</automated>
  </verify>

  <done>
    - DB probe executed; D-06d resolution recorded in a top-of-section comment inside `src/lib/auth/schemas.ts`.
    - `src/lib/auth/schemas.ts` exports `changePasswordSchema`, `identitySchema`, `ChangePasswordInput`, `IdentityInput` matching the behavior bullets above.
    - If decision is "email editable", `src/lib/auth/index.ts` includes `user.changeEmail: { enabled: true, updateEmailWithoutVerification: true }`; otherwise that file is untouched.
    - `src/lib/auth/schemas.test.ts` exists and passes; `npm run typecheck` passes; `npm run build` succeeds.
    - Diagnostic script (if used) was deleted after the probe completed.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Add Phase 21 i18n keys (FR + EN) + the single-line UserMenu edit</name>
  <files>src/lib/i18n/dictionaries.ts, src/components/UserMenu.tsx</files>

  <read_first>
    - `src/lib/i18n/dictionaries.ts` (FULL file — 1723 lines — to identify the alphabetical/grouped insertion point for each new key and to read the `_EnHasAllFrKeys` parity-proof block at the end of the file).
    - `src/lib/i18n/dictionaries.test.ts` (if it exists, to understand how parity is tested at unit level).
    - `src/components/UserMenu.tsx` (FULL file — 212 lines — focus on lines 146–172 which render the displayName + email header block, and lines 173–207 which render the existing `handleLogout` button. The new menu item slots BETWEEN those two blocks).
    - `.planning/phases/21-partner-onboarding-gates/21-RESEARCH.md` §3b (the exact JSX shape for the new menu item) and §5b (the verbatim FR + EN key list).
  </read_first>

  <action>
    Step A — i18n keys.

    Open `src/lib/i18n/dictionaries.ts` and add the following keys verbatim. Insert each key in the position matching the existing alphabetical/grouped convention (the planner inspects the existing file structure to decide grouping — keys starting with `parametres.*` form a new namespace block; the existing `shell.user.menu.*` block already exists and the new `settings` key goes there).

    FR side — insert all of these into `dictionaries.fr`:

    - `'shell.user.menu.settings': 'Paramètres',`
    - `'parametres.hero.title': 'Paramètres',`
    - `'parametres.hero.subtitle': 'Changer vos information et réinitialiser votre mot de passe.',` (VERBATIM Figma typo "vos information" preserved per D-06 + D-10).
    - `'parametres.card.section.identity': 'Informations',`
    - `'parametres.card.section.password': 'Mot de passe',`
    - `'parametres.identity.firstName.label': 'Prénom',`
    - `'parametres.identity.firstName.placeholder': 'Prénom',`
    - `'parametres.identity.lastName.label': 'Nom',`
    - `'parametres.identity.lastName.placeholder': 'Nom',`
    - `'parametres.identity.email.label': 'Adresse e-mail',`
    - `'parametres.identity.email.placeholder': 'prenom.nom@leasetic.com',`
    - `'parametres.identity.email.readonly.notice': 'Pour changer votre adresse e-mail, contactez un administrateur.',`
    - `'parametres.identity.avatar.placeholder.alt': 'Avatar par défaut',`
    - `'parametres.password.current.label': 'Mot de passe actuel',`
    - `'parametres.password.current.placeholder': '••••••••',`
    - `'parametres.password.new.label': 'Nouveau mot de passe',`
    - `'parametres.password.new.placeholder': '••••••••',`
    - `'parametres.password.new.hint': 'Au moins 8 caractères.',`
    - `'parametres.password.confirm.label': 'Confirmer le nouveau mot de passe',`
    - `'parametres.password.confirm.placeholder': '••••••••',`
    - `'parametres.password.session.notice': 'Modifier votre mot de passe vous déconnectera de vos autres appareils.',`
    - `'parametres.error.required': 'Champ requis.',`
    - `'parametres.error.password.current.wrong': 'Mot de passe actuel incorrect.',`
    - `'parametres.error.password.tooShort': 'Au moins 8 caractères requis.',`
    - `'parametres.error.password.tooLong': 'Maximum 128 caractères.',`
    - `'parametres.error.password.mismatch': 'Les mots de passe ne correspondent pas.',`
    - `'parametres.error.email.invalid': 'Adresse e-mail invalide.',`
    - `'parametres.error.unknown': 'Une erreur est survenue. Réessayez.',`
    - `'parametres.action.cancel': 'Annuler',`
    - `'parametres.action.save': 'Enregistrer les modifications',`
    - `'parametres.action.saving': 'Enregistrement…',`
    - `'parametres.toast.identity.saved': 'Informations mises à jour.',`
    - `'parametres.toast.password.saved': 'Mot de passe mis à jour.',`
    - `'parametres.toast.both.saved': 'Modifications enregistrées.',`
    - `'parametres.toast.partialSuccess.identityOk.passwordErr': 'Informations enregistrées, mais le mot de passe n\'a pas été modifié.',`
    - `'parametres.toast.partialSuccess.passwordOk.identityErr': 'Mot de passe modifié, mais les informations n\'ont pas été enregistrées.',`

    EN side — insert the matching keys into `dictionaries.en` at the exact same positions:

    - `'shell.user.menu.settings': 'Settings',`
    - `'parametres.hero.title': 'Settings',`
    - `'parametres.hero.subtitle': 'Update your information and reset your password.',` (typo CORRECTED in EN per D-06 + D-10).
    - `'parametres.card.section.identity': 'Profile',`
    - `'parametres.card.section.password': 'Password',`
    - `'parametres.identity.firstName.label': 'First name',`
    - `'parametres.identity.firstName.placeholder': 'First name',`
    - `'parametres.identity.lastName.label': 'Last name',`
    - `'parametres.identity.lastName.placeholder': 'Last name',`
    - `'parametres.identity.email.label': 'Email',`
    - `'parametres.identity.email.placeholder': 'firstname.lastname@leasetic.com',`
    - `'parametres.identity.email.readonly.notice': 'To change your email address, please contact an administrator.',`
    - `'parametres.identity.avatar.placeholder.alt': 'Default avatar',`
    - `'parametres.password.current.label': 'Current password',`
    - `'parametres.password.current.placeholder': '••••••••',`
    - `'parametres.password.new.label': 'New password',`
    - `'parametres.password.new.placeholder': '••••••••',`
    - `'parametres.password.new.hint': 'At least 8 characters.',`
    - `'parametres.password.confirm.label': 'Confirm new password',`
    - `'parametres.password.confirm.placeholder': '••••••••',`
    - `'parametres.password.session.notice': 'Changing your password will sign you out of your other devices.',`
    - `'parametres.error.required': 'Required.',`
    - `'parametres.error.password.current.wrong': 'Current password is incorrect.',`
    - `'parametres.error.password.tooShort': 'At least 8 characters required.',`
    - `'parametres.error.password.tooLong': 'Maximum 128 characters.',`
    - `'parametres.error.password.mismatch': 'Passwords do not match.',`
    - `'parametres.error.email.invalid': 'Invalid email address.',`
    - `'parametres.error.unknown': 'Something went wrong. Try again.',`
    - `'parametres.action.cancel': 'Cancel',`
    - `'parametres.action.save': 'Save changes',`
    - `'parametres.action.saving': 'Saving…',`
    - `'parametres.toast.identity.saved': 'Profile updated.',`
    - `'parametres.toast.password.saved': 'Password updated.',`
    - `'parametres.toast.both.saved': 'Changes saved.',`
    - `'parametres.toast.partialSuccess.identityOk.passwordErr': 'Profile saved, but password was not changed.',`
    - `'parametres.toast.partialSuccess.passwordOk.identityErr': 'Password changed, but profile was not updated.',`

    If any key already exists in the file (e.g. `shell.user.menu.settings` was added in a prior phase), keep the existing value if it matches the values above and SKIP that one row. Otherwise add as specified. The `_EnHasAllFrKeys` parity proof at the end of the file enforces that every FR key has an EN counterpart — if any FR key lacks an EN twin, the TypeScript build will fail at the conditional-type position. Use that as the structural gate.

    Step B — UserMenu edit.

    Open `src/components/UserMenu.tsx`. Locate the existing dropdown panel (around lines 140–210 — the block conditionally rendered by `{open && ( ... )}`). Between the displayName+email header block (ending at line ~172) and the `<button>` that wraps `handleLogout` (starting at line ~173), insert a SINGLE new `<Link>` element:

    - Use `import Link from 'next/link';` at the top of the file (add to the existing import block; do not duplicate if already present).
    - Add `Settings` to the existing `lucide-react` import line (e.g. change `import { LogOut, ChevronDown, ... } from 'lucide-react';` to `import { LogOut, ChevronDown, ..., Settings } from 'lucide-react';`).
    - The new element:
      ```
      <Link
        role="menuitem"
        href="/parametres"
        onClick={() => setOpen(false)}
        style={{ /* inline styles MIRRORED from the existing handleLogout button — same padding, font-size 14.5px, font-weight 500, color var(--ink), display flex with gap, no underline */ }}
      >
        <Settings size={17} strokeWidth={1.6} style={{ color: 'var(--muted)' }} />
        <span>{t('shell.user.menu.settings', lang)}</span>
      </Link>
      ```
    - The exact inline-style object is COPIED from the existing logout button's `style={{ ... }}` and adapted only insofar as anchor elements need `textDecoration: 'none'` (logout uses `<button>` which doesn't need it). Read the logout button block before writing; do not invent style values.
    - `lang` is already in scope inside UserMenu (verify by reading the existing `t(...)` call sites at lines 146–172 — if `lang` is destructured from props or computed at the top, reuse it; if not, add the same `getCurrentLang()` import + invocation pattern the existing UserMenu uses).

    Do NOT modify any other line of UserMenu.tsx. Do NOT add a new dropdown primitive. Do NOT touch the click-outside or Escape-key handlers. Do NOT touch the existing `handleLogout` button.

    Do NOT touch `src/components/ui/RetractableSidebar.tsx` (per D-06 + Plr-5 — no sidebar entry).
  </action>

  <verify>
    <automated>npm run typecheck && npm run test -- src/lib/i18n/dictionaries.test.ts && npm run build</automated>
  </verify>

  <done>
    - All Phase 21 FR keys present in `dictionaries.fr`; all matching EN keys present in `dictionaries.en`.
    - `_EnHasAllFrKeys` parity proof passes at compile time (typecheck succeeds).
    - `src/components/UserMenu.tsx` contains one new `<Link href="/parametres">` element between the displayName+email header and the existing logout button; no other changes.
    - `RetractableSidebar.tsx` is unchanged (verify with `git diff src/components/ui/RetractableSidebar.tsx` showing zero diff).
    - `npm run build` succeeds.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Create /parametres route + ParametresForm client island (combined Save semantics + revokeOtherSessions wiring)</name>
  <files>app/(authed)/parametres/page.tsx, app/(authed)/parametres/ParametresForm.tsx</files>

  <read_first>
    - `app/(authed)/aide/page.tsx` (lines 1–120 — the canonical authed-route page pattern: `Metadata`, `export const dynamic = 'force-dynamic'`, `getCurrentLang()`, `t(key, lang)`, `<PageHero>` for the hero, `<main>` wrapper with `maxWidth: 1040, margin: '0 auto', padding: '0 24px'`).
    - `app/(authed)/layout.tsx` (the wrapping layout that calls `requireUser()` and renders `<Shell>` — the new page inherits the auth gate transparently; no per-page gate needed).
    - `src/components/ui/PageHero.tsx` (the hero primitive — title + subtitle props).
    - `src/components/SetPasswordForm.tsx` (FULL — 315 lines — THE canonical analog for the password section: useForm shape, mode: 'onBlur', useTransition, useRouter, toast usage, Eye/EyeOff toggles, useState(showNew)/useState(showConfirm), useWatch for strength meter, strengthScore() helper, STRENGTH_KEYS / STRENGTH_COLORS maps, noValidate on the form, the inline form style block with width 100% / maxWidth 480 / padding 28 / background var(--surface) / borderRadius 16 / boxShadow var(--shadow-card)).
    - `app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx` (the identity-form analog — three text inputs Prénom / Nom / Email, mode: 'onBlur', zodResolver).
    - `src/lib/auth/schemas.ts` (the new `changePasswordSchema` + `identitySchema` from Task 1 — used as resolvers).
    - `src/lib/i18n/dictionaries.ts` (just to confirm the new keys are addressable via `t(key, lang)`).
    - `src/components/UserMenu.tsx` lines 90–110 (the `initials(displayName)` helper — Phase 21 reuses the same initials pattern for the avatar placeholder per D-06b).
    - `.planning/phases/21-partner-onboarding-gates/21-CONTEXT.md` D-06, D-06b, D-06c, D-07, D-08, D-10 (binding for this task).
    - `.planning/phases/21-partner-onboarding-gates/21-RESEARCH.md` §1c (changePassword exact body shape + INVALID_PASSWORD error code), §1d (updateUser body shape + email is REJECTED → email change goes through authClient.changeEmail iff D-06d resolved to "editable"), §1e (name = `${firstName} ${lastName}` split convention), Plr-2 (show/hide toggles), Plr-3 (strength meter), Plr-6 (Annuler resets form), Plr-7 (session notice placement under Mot de passe heading), Plr-9 (INVALID_PASSWORD → inline error).
  </read_first>

  <action>
    Step A — Create `app/(authed)/parametres/page.tsx` (server component).

    Pattern: mirror `app/(authed)/aide/page.tsx` lines 1–32 (the metadata + dynamic + getCurrentLang + main wrapper). Specifically:

    - `import type { Metadata } from 'next';`
    - `import { getCurrentLang, t } from '@/lib/i18n';`
    - `import { PageHero } from '@/components/ui/PageHero';`
    - `import { ParametresForm } from './ParametresForm';`
    - `import { auth } from '@/lib/auth';` (or the project's actual export shape — verify in `src/lib/auth/index.ts`)
    - `export const dynamic = 'force-dynamic';`
    - `export const metadata: Metadata = { title: 'Paramètres — Leasétic Matrice' };`
    - `export default async function ParametresPage()`:
      - `const lang = await getCurrentLang();`
      - Fetch the current session/user via `auth().api.getSession({ headers: await headers() })` (the project's existing server-side session-read pattern — verify exact signature in `src/lib/auth/require.ts` which already wraps it, and reuse `requireUser()` if it returns the user object directly).
      - Derive initial form values: `firstName = name.split(' ')[0]`, `lastName = name.split(' ').slice(1).join(' ')` from the session's `user.name` per RESEARCH §1e. Email = `user.email`. Initials computed via the same helper UserMenu uses (`initials(displayName)`).
      - Render:
        ```
        <main style={{ maxWidth: 1040, margin: '0 auto', padding: '0 24px' }}>
          <PageHero
            title={t('parametres.hero.title', lang)}
            subtitle={t('parametres.hero.subtitle', lang)}
          />
          <ParametresForm
            lang={lang}
            initialFirstName={firstName}
            initialLastName={lastName}
            initialEmail={user.email}
            emailEditable={<true|false based on Task 1 D-06d resolution>}
            initials={initials(displayName)}
          />
        </main>
        ```
    - `emailEditable` is a literal boolean compiled into the page — its value comes from the D-06d resolution recorded in Task 1's `src/lib/auth/schemas.ts` top-of-section comment. If "email editable" → `emailEditable={true}`; if "email read-only" → `emailEditable={false}`.

    Step B — Create `app/(authed)/parametres/ParametresForm.tsx` (client component).

    Header:
    - `'use client';`
    - Imports: `useState`, `useTransition` (React); `useRouter` from `next/navigation`; `useForm`, `useWatch`, `Controller` (if needed) from `react-hook-form`; `zodResolver` from `@hookform/resolvers/zod`; `Eye`, `EyeOff`, `Save` from `lucide-react`; `toast` from `sonner`; `authClient` from the project's client-side Better Auth helper (verify path in `src/lib/auth/client.ts` or equivalent — the existing `SetPasswordForm.tsx` imports it; copy the same import path verbatim); `changePasswordSchema`, `identitySchema`, `ChangePasswordInput`, `IdentityInput` from `@/lib/auth/schemas`; `t` from `@/lib/i18n/dictionaries`; the existing `strengthScore`, `STRENGTH_KEYS`, `STRENGTH_COLORS` helpers (READ `SetPasswordForm.tsx` to find their export source — if local to that file, EXTRACT to `src/lib/auth/strength.ts` as a small helper module that both components import, OR inline-copy with a comment marking it as a duplication to consolidate in a future cleanup phase; planner's choice is "extract for DRY"). Document the choice in the SUMMARY.

    Props interface:
    ```
    interface Props {
      lang: 'fr' | 'en';
      initialFirstName: string;
      initialLastName: string;
      initialEmail: string;
      emailEditable: boolean;
      initials: string;
    }
    ```

    State + form setup:
    - TWO separate `useForm` calls (one per section) so each section has its own `formState.isDirty`. Both use `mode: 'onBlur'` and `zodResolver`:
      - `identityForm = useForm<IdentityInput>({ resolver: zodResolver(identitySchema), mode: 'onBlur', defaultValues: { firstName: initialFirstName, lastName: initialLastName, ...(emailEditable ? { email: initialEmail } : {}) } })`
      - `passwordForm = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema), mode: 'onBlur', defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' } })`
    - `const [showCurrent, setShowCurrent] = useState(false);`
    - `const [showNew, setShowNew] = useState(false);`
    - `const [showConfirm, setShowConfirm] = useState(false);`
    - `const [isPending, startTransition] = useTransition();`
    - `const router = useRouter();`
    - `const newPwd = useWatch({ control: passwordForm.control, name: 'newPassword' });`
    - `const strength = strengthScore(newPwd ?? '');`

    Layout (matches Figma 132:867 + the Account card pattern):

    Wrap everything in a single `<form noValidate onSubmit={handleSubmit}>` where `handleSubmit` is the combined submit function (defined below). Form style: width 100%, maxWidth 760 (Figma proportions for the Account card), padding 28, background var(--surface), borderRadius 16, boxShadow var(--shadow-card), marginTop 32 (below the hero).

    Section 1 — Informations:
    - Section heading `<h2>{t('parametres.card.section.identity', lang)}</h2>`.
    - Avatar row: a circular initials placeholder (re-use the SAME inline styles UserMenu uses for its initials circle — copy verbatim from `src/components/UserMenu.tsx`). NO upload button (D-06b deviation logged).
    - Three input rows: firstName, lastName, email. Each row uses the existing Input Text design-system styling (mirror CreatePartnerForm.tsx for the exact JSX shape — label above, input below, error span beneath). The email row:
      - If `emailEditable === true`: rendered as a normal text input bound to `identityForm.register('email')`.
      - If `emailEditable === false`: rendered as static text (`<p>{initialEmail}</p>`) followed by a muted helper line displaying `t('parametres.identity.email.readonly.notice', lang)`.
    - Inline error span beneath each input pulls from `identityForm.formState.errors.firstName?.message` and translates via the dict keys `parametres.error.required` / `parametres.error.email.invalid` as appropriate (the schema's FR-literal message is replaced at render time by the dict-driven message — match the SetPasswordForm error-rendering pattern at the relevant lines).

    Divider:
    - A horizontal rule (`<hr>` or styled `<div>`) between Section 1 and Section 2, color `var(--border)` or matching the existing `.card` divider convention.

    Section 2 — Mot de passe:
    - Section heading `<h2>{t('parametres.card.section.password', lang)}</h2>`.
    - Static muted notice IMMEDIATELY beneath the heading: `<p style={{ color: 'var(--muted)', fontSize: 13 }}>{t('parametres.password.session.notice', lang)}</p>` — per D-08 + Plr-7.
    - Three password input rows: currentPassword, newPassword, confirmNewPassword. Each row:
      - Label, input, show/hide toggle button (Eye when hidden, EyeOff when visible — clicking toggles the per-field `showCurrent`/`showNew`/`showConfirm` state). MIRROR the show/hide toggle JSX from `SetPasswordForm.tsx` lines that handle Eye/EyeOff (copy the button shape verbatim).
      - Inline error span beneath each input.
      - `input type={showX ? 'text' : 'password'}` — toggled per Plr-2.
    - Helper text under "Nouveau mot de passe": `{t('parametres.password.new.hint', lang)}`.
    - Strength meter BELOW "Nouveau mot de passe" (above the confirm row): a 4-segment bar driven by `strength` (0–4) with colors from `STRENGTH_COLORS[strength]` and label from `t(STRENGTH_KEYS[strength], lang)` per Plr-3. MIRROR the JSX from `SetPasswordForm.tsx`.

    Action footer:
    - Two buttons side by side at the bottom of the form:
      - Annuler (`type="button"`): `onClick={() => { identityForm.reset(); passwordForm.reset(); }}` — per Plr-6.
      - Enregistrer les modifications (`type="submit"`): disabled iff `!identityForm.formState.isDirty && !passwordForm.formState.isDirty`. Label switches to `t('parametres.action.saving', lang)` while `isPending`.

    Combined submit handler `handleSubmit`:

    ```
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      const identityDirty = identityForm.formState.isDirty;
      const passwordDirty = passwordForm.formState.isDirty;
      if (!identityDirty && !passwordDirty) return;

      // Validate both sections client-side first (only the ones that are dirty)
      let identityValues: IdentityInput | null = null;
      let passwordValues: ChangePasswordInput | null = null;

      if (identityDirty) {
        const valid = await identityForm.trigger();
        if (!valid) return;
        identityValues = identityForm.getValues();
      }
      if (passwordDirty) {
        const valid = await passwordForm.trigger();
        if (!valid) return;
        passwordValues = passwordForm.getValues();
      }

      startTransition(async () => {
        let identityOk = !identityDirty;       // true if not dirty (nothing to do)
        let passwordOk = !passwordDirty;       // same
        let identityError: string | null = null;
        let passwordError: string | null = null;

        // 1) Identity first
        if (identityDirty && identityValues) {
          try {
            const fullName = `${identityValues.firstName} ${identityValues.lastName}`.trim();
            await authClient.updateUser({ name: fullName });
            if (emailEditable && 'email' in identityValues && identityValues.email !== initialEmail) {
              await authClient.changeEmail({ newEmail: identityValues.email });
            }
            identityOk = true;
          } catch (err) {
            identityOk = false;
            identityError = (err as Error)?.message ?? 'unknown';
          }
        }

        // 2) Password second
        if (passwordDirty && passwordValues) {
          try {
            const res = await authClient.changePassword({
              currentPassword: passwordValues.currentPassword,
              newPassword: passwordValues.newPassword,
              revokeOtherSessions: true,        // D-08 — ALWAYS true
            });
            // Inspect res for Better Auth's { data, error } envelope shape (verify in SetPasswordForm.tsx)
            if (res && 'error' in res && res.error) {
              passwordOk = false;
              passwordError = (res.error.code as string) ?? 'unknown';
            } else {
              passwordOk = true;
            }
          } catch (err) {
            passwordOk = false;
            passwordError = (err as Error)?.message ?? 'unknown';
          }
        }

        // Surface results per D-06c partial-success matrix
        if (identityOk && passwordOk) {
          if (identityDirty && passwordDirty) {
            toast.success(t('parametres.toast.both.saved', lang));
          } else if (identityDirty) {
            toast.success(t('parametres.toast.identity.saved', lang));
          } else {
            toast.success(t('parametres.toast.password.saved', lang));
          }
          identityForm.reset(identityForm.getValues());     // clear dirty state, keep values
          passwordForm.reset();                              // clear all password fields
          router.refresh();                                  // refresh server-rendered session-derived bits
        } else if (identityOk && !passwordOk) {
          // Map INVALID_PASSWORD to INLINE error per Plr-9
          if (passwordError === 'INVALID_PASSWORD') {
            passwordForm.setError('currentPassword', { message: t('parametres.error.password.current.wrong', lang) });
          } else if (passwordError === 'PASSWORD_TOO_SHORT') {
            passwordForm.setError('newPassword', { message: t('parametres.error.password.tooShort', lang) });
          } else if (passwordError === 'PASSWORD_TOO_LONG') {
            passwordForm.setError('newPassword', { message: t('parametres.error.password.tooLong', lang) });
          } else {
            toast.error(t('parametres.error.unknown', lang));
          }
          toast.success(t('parametres.toast.partialSuccess.identityOk.passwordErr', lang));
          identityForm.reset(identityForm.getValues());
          router.refresh();
        } else if (!identityOk && passwordOk) {
          toast.success(t('parametres.toast.partialSuccess.passwordOk.identityErr', lang));
          toast.error(identityError ?? t('parametres.error.unknown', lang));
          passwordForm.reset();
          router.refresh();
        } else {
          toast.error(t('parametres.error.unknown', lang));
        }
      });
    };
    ```

    The exact Better Auth client response envelope shape (`{ data, error: { code, message } }` vs. throws) MUST be verified by reading `src/components/SetPasswordForm.tsx` — that file already exercises the authClient and its error-handling pattern is the source of truth. If SetPasswordForm uses `try/catch` exclusively, switch this handler to the same pattern (catch the thrown error and `instanceof` / message-match for INVALID_PASSWORD). If SetPasswordForm reads `res.error.code`, this handler does the same. Do NOT invent a third pattern.

    Strength helpers extraction (per the planner-choice in the imports section): if `strengthScore`, `STRENGTH_KEYS`, `STRENGTH_COLORS` are currently inline in `SetPasswordForm.tsx`, EXTRACT them to `src/lib/auth/strength.ts` (new file — pure module, no framework imports) and update `SetPasswordForm.tsx` to import from there. `ParametresForm.tsx` imports from the same module. This keeps a single source of truth for the strength scoring + dict-key + color tables.

    Step C — `app/(authed)/parametres/page.tsx` does NOT re-export anything from ParametresForm; it imports and renders the client component.

    No additional Better Auth config edits beyond Task 1's optional `user.changeEmail` block. The existing `auth()` config supplies argon2id work factors transparently per RESEARCH §1b.

    Sidebar nav: NO change. `src/components/ui/RetractableSidebar.tsx` is untouched. The user-menu entry from Task 2 is the only navigation path (per D-06 + Plr-5).
  </action>

  <verify>
    <automated>npm run typecheck && npm run build</automated>
    <human-check>
      1. Run `npm run dev` and sign in as antoine.rousseau@leasetic.com (use the current shared password).
      2. Click the user menu in the topbar → confirm 'Paramètres' entry is visible between the email line and 'Se déconnecter'.
      3. Click 'Paramètres' → URL becomes /parametres; the page renders the hero ('Paramètres' + Figma subtitle including 'vos information' typo) and the Account card.
      4. Test Save disabled state: the button is disabled until you modify a field.
      5. Test identity-only: change firstName, click Save → success toast 'parametres.toast.identity.saved'.
      6. Test password-only with WRONG currentPassword: type a wrong current password + valid new + matching confirm, click Save → INLINE error 'Mot de passe actuel incorrect' under the current-password field. No success toast.
      7. Test password-only with CORRECT currentPassword: type the real current password + valid new + matching confirm, click Save → success toast 'parametres.toast.password.saved'. Open a second browser/incognito and confirm any prior session there is signed out (revokeOtherSessions verified).
      8. Test combined dirty + password failure: in a fresh session, change firstName AND enter wrong currentPassword + new + confirm → identity success toast + INLINE password error + partial-success toast.
      9. Sign out and confirm the existing /[adminSegment]/partners admin↔admin reset flow still works (regression check).
      10. Visit /parametres while logged out → redirect to /login.
    </human-check>
  </verify>

  <done>
    - `app/(authed)/parametres/page.tsx` exists, renders PageHero + ParametresForm inside the `(authed)` Shell.
    - `app/(authed)/parametres/ParametresForm.tsx` exists, implements two-section RHF form with combined Save semantics matching D-06c.
    - `revokeOtherSessions: true` is wired on every changePassword call.
    - INVALID_PASSWORD is surfaced INLINE under "Mot de passe actuel" per Plr-9.
    - `npm run build` succeeds; manual verification steps 1–10 all pass.
    - `RetractableSidebar.tsx` is unchanged.
  </done>
</task>

</tasks>

<figma_deviations>
## Figma Deviation Log (D-10 — binding)

This section is the binding artifact a future "Account v2" phase reads to understand what Phase 21 deliberately left undone vs. Figma node `132:867`.

| # | Deviation | Source decision | Disposition |
|---|-----------|-----------------|-------------|
| 1 | Avatar block replaced with initials placeholder (matches existing UserMenu pattern, e.g. "AR"). No "Télécharger nouveau" button. No "Taille de la photo de profil : 400px x 400px" hint. | D-06b | Deferred to Account v2 — requires image-storage infra (Vercel Blob or equivalent) not yet in the project. |
| 2 | Numéro de téléphone field omitted from the Informations section. | D-06b | Deferred to Account v2 — requires a User-model schema migration + Drizzle type regeneration + Better Auth additionalFields extension. |
| 3 | Three password fields rendered (Mot de passe actuel + Nouveau + Confirmer) instead of Figma's single "Nouveau mot de passe". | D-07 | Permanent — required by Better Auth `changePassword` contract (currentPassword challenge) + client-side confirm equality check. |
| 4 | Static muted notice rendered under the "Mot de passe" section heading: "Modifier votre mot de passe vous déconnectera de vos autres appareils." | D-08 + Plr-7 | Permanent — surfaces the revokeOtherSessions: true behavior to the user. |
| 5 | FR hero subtitle preserved verbatim including the Figma typo "vos information"; EN hero subtitle corrected to "Update your information and reset your password.". | D-06 + D-10 | Intentional — copy fidelity to design source-of-truth for FR; EN is a fresh translation, no typo to preserve. |
| 6 | Email field disposition contingent on Task 1 D-06d resolution. If "email editable" → normal input bound to `authClient.changeEmail`. If "email read-only" → static text + muted notice "Pour changer votre adresse e-mail, contactez un administrateur.". | D-06d | Contingent — Task 1's DB probe of `users.emailVerified` decides at build time. The compile-time `emailEditable` boolean prop on `<ParametresForm>` encodes the resolution. |
| 7 | Show/hide toggles (Eye/EyeOff) rendered on ALL three password inputs (current + new + confirm). Figma doesn't constrain this. | Plr-2 | Permanent — parity with the existing SetPasswordForm UX. |
| 8 | 0–4 strength meter rendered beneath "Nouveau mot de passe" reusing existing `auth.password.strength.*` keys + `strengthScore()` helper. Figma doesn't constrain this. | Plr-3 | Permanent — reuses existing infrastructure; no new strings or helpers. |
| 9 | NO new sidebar entry. RetractableSidebar.tsx is untouched. Access to /parametres is ONLY via the Topbar user-menu dropdown. | D-06 + Plr-5 | Permanent (non-deviation — mirrors Figma which shows the sidebar unchanged). Documented here for explicitness. |
| 10 | Annuler button resets BOTH sections' forms to initial values without navigating away (matches the standard "discard local edits" pattern). Figma doesn't specify Annuler behavior. | Plr-6 | Permanent. |

If any new design choices emerge during execution that introduce additional deviations, the executor appends rows to this table in the resulting SUMMARY.md.
</figma_deviations>

<security_notes>
Phase 21's surface introduces one new authenticated route + two Better Auth client calls; threat model is intentionally minimal (security_enforcement is disabled per orchestrator config, no formal STRIDE register required). Brief considerations:

- **No plaintext password logging:** the submit handler never `console.log`s the form values. Better Auth handles all hashing server-side per RESEARCH §1b.
- **Session freshness:** `changePassword` is guarded by `sensitiveSessionMiddleware` (RESEARCH §1c). A stale session (>24h default per Better Auth) returns an error — the unknown-error toast surfaces this. Plr-8 recommended NOT overriding `freshAge`; this plan respects that recommendation (the toast path is the secure default — user re-authenticates).
- **revokeOtherSessions: true is hardcoded** in the submit handler — never user-toggleable. Matches D-08.
- **CSRF:** Better Auth's existing `SameSite=Lax` + `__Secure-` cookies + Phase 20 trustedOrigins middleware apply transparently to `/api/auth/change-password` and `/api/auth/update-user` — no new gate needed.
</security_notes>

<verification>
- `npm run typecheck` passes.
- `npm run build` succeeds.
- `npm run test -- src/lib/auth/schemas.test.ts` passes.
- `npm run test -- src/lib/i18n/dictionaries.test.ts` passes (parity proof).
- All 10 manual verification steps in Task 3 `<human-check>` succeed.
- `git diff src/components/ui/RetractableSidebar.tsx` shows zero diff.
- `git diff app/[adminSegment]/partners/` shows zero diff (admin↔admin reset flow untouched).
</verification>

<success_criteria>
- /parametres route is live in production after deploy; both admins can reach it via the user-menu entry and use it to rotate from `leasetic2026` (the rotation execution itself happens in Plan 21-02).
- The existing admin↔admin reset flow at /[adminSegment]/partners continues to serve as the forgotten-password fallback (regression-tested in Task 3 step 9).
- The compile-time i18n parity proof catches any future FR/EN drift in the new `parametres.*` namespace.
- D-06d's resolution is recorded inline in `src/lib/auth/schemas.ts` so future maintainers can find the rationale without re-running the DB probe.
- The Figma deviation log above is preserved in this PLAN.md (and in the resulting SUMMARY.md) as the binding artifact for Account v2.
</success_criteria>

<output>
Create `.planning/phases/21-partner-onboarding-gates/21-01-SUMMARY.md` when done, summarizing:
- D-06d resolution + the DB-probe finding for both admin accounts.
- Whether `src/lib/auth/index.ts` was edited (Task 1 Step B) or not.
- Whether `strengthScore` / `STRENGTH_KEYS` / `STRENGTH_COLORS` were extracted to `src/lib/auth/strength.ts` (planner-recommended) or inlined (alternative).
- The exact Better Auth client response shape observed in the change-password call (envelope vs. throw) and the error-mapping pattern used.
- Any additional Figma deviations discovered during execution (append to the table above).
- The 10 manual verification step results.
</output>
