# Phase 21: Partner-Onboarding Gates — Research

**Gathered:** 2026-05-29
**Source:** CONTEXT.md + Figma node 132:867 (decisions block + plan_phase_addendum) + codebase scout + Better Auth 1.6.9 source
**Status:** Ready for planning

> CONTEXT.md is the design contract. This research document does NOT re-derive
> design decisions — it scouts the codebase and Better Auth library so the planner
> can write executable PLAN.md files. Every binding decision (D-01..D-10) lives in
> `21-CONTEXT.md`. This file is downstream of those.

---

## 1. Better Auth API surface (changePassword, updateUser, argon2id, version)

### 1a. Pinned version

`package.json` dependency: **`"better-auth": "1.6.9"`** (CONTEXT.md row confirmed).
Argon2id worker: `"@node-rs/argon2": "2.0.2"`.
React Hook Form: `7.75.0` / Zod: `4.4.3` / `@hookform/resolvers`: `5.2.2`.
Sonner: `2.0.7`. lucide-react: `0.469.0`. Next: `16.2.4`. React: `19.0.0`.

### 1b. argon2id work factors (LOCKED — match these in any new password path)

From `src/lib/auth/index.ts` lines 122–139:

```ts
password: {
  hash: async (password: string) => {
    const { hash } = await import('@node-rs/argon2');
    return hash(password, {
      algorithm: 2,        // argon2id
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  },
  verify: async ({ hash: h, password }: { hash: string; password: string }) => {
    const { verify } = await import('@node-rs/argon2');
    return verify(h, password);
  },
},
```

The new password-change flow goes through Better Auth's `changePassword`
endpoint, which calls `ctx.context.password.hash()` (the function above)
automatically. The planner does NOT need to re-implement hashing — the
existing config is reused transparently.

Also pinned: `minPasswordLength: 8`, `maxPasswordLength: 128`,
`disableSignUp: true`.

### 1c. `changePassword` — exact endpoint contract

Source: `node_modules/better-auth/dist/api/routes/update-user.mjs` lines 75–184.

**Endpoint path:** `POST /api/auth/change-password`
**Client-side helper:** `authClient.changePassword({ ... })` (via `better-auth/client`).
**Middleware:** `sensitiveSessionMiddleware` — user must be logged in AND the session must be "fresh" (within `sessionConfig.freshAge`). With no explicit `freshAge` override in `src/lib/auth/index.ts`, the Better Auth default applies (typically 24h). Planner note: if the partner has a stale session, the call returns an error requiring re-authentication. **Discretion item for planner — see §11.**

**Body schema (Zod):**

```ts
{
  newPassword: string,                    // required
  currentPassword: string,                // required
  revokeOtherSessions?: boolean,          // optional
}
```

**Response on success:**

```json
{
  "token": "<new session token if revokeOtherSessions=true, else null>",
  "user": { ... }
}
```

**Error codes (HTTP 400, `BASE_ERROR_CODES.*`):**

| Code | When it fires | UI surface |
|------|--------------|------------|
| `PASSWORD_TOO_SHORT` | `newPassword.length < 8` | Inline error under "Nouveau mot de passe" |
| `PASSWORD_TOO_LONG` | `newPassword.length > 128` | Inline error under "Nouveau mot de passe" |
| `CREDENTIAL_ACCOUNT_NOT_FOUND` | No credential account for user (shouldn't happen — admin-mediated invite always creates one) | Generic toast: "Action impossible" — should never trigger |
| `INVALID_PASSWORD` | `currentPassword` doesn't match stored hash | Inline error under "Mot de passe actuel": "Mot de passe actuel incorrect" |

**Default behavior when `revokeOtherSessions: true`:** Better Auth deletes
ALL sessions of the user (`deleteSessions(userId)`) and creates a NEW session
for the current request, attaching it via `setSessionCookie`. The user
remains logged in on the current device; all other devices are signed out.
This matches CONTEXT.md D-08 exactly.

### 1d. `updateUser` — name updatable, email NOT updatable via this endpoint

Source: `node_modules/better-auth/dist/api/routes/update-user.mjs` lines 12–74.

**Endpoint path:** `POST /api/auth/update-user`
**Client-side helper:** `authClient.updateUser({ name?, image?, ...additionalFields })`
**Middleware:** `sessionMiddleware` (NOT sensitive — no freshness check).

**Body shape:** `{ name?, image?, ...additionalFields }`. The
`additionalFields` allow-list comes from `auth().options.user.additionalFields`
filtered to those with `input: true`. In `src/lib/auth/index.ts` that allow-list is:
`displayName`, `language`, `theme` (input: true). `role`, `sessionVersion`,
`createdBy`, `deletedAt`, `lastLoginAt` are locked (`input: false`).

**CRITICAL — email is NOT updatable via `/update-user`:**

```ts
// node_modules/better-auth/dist/api/routes/update-user.mjs:51
if (body.email) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.EMAIL_CAN_NOT_BE_UPDATED);
```

If the client sends `email` to `updateUser`, the request is rejected.

**Email changes use a SEPARATE endpoint: `/change-email`** (lines 377–493).
That endpoint requires `user.changeEmail.enabled: true` in the config. The
current `src/lib/auth/index.ts` does **not** configure `user.changeEmail`
at all — so the endpoint will throw `"Change email is disabled"` if invoked.

To enable email change **without** SMTP, two paths exist in BA 1.6.9:

1. **`user.changeEmail.updateEmailWithoutVerification: true`** — works **only**
   when `session.user.emailVerified !== true`. Our users seeded by
   `seed-admins-launch.ts` and the admin-invite path have `emailVerified` set
   per Better Auth's defaults. The planner must verify the actual value of
   `users.email_verified` in the live DB. **If `emailVerified` is `false` for
   our users, this path works.** If `true`, this path is unavailable without
   SMTP.

2. **`user.changeEmail.enabled: true` + custom `sendChangeEmailConfirmation`**
   — requires sending an email (SMTP). Out of scope (CONTEXT.md "no SMTP").

**Planner decision per D-06d:** if it turns out our users have
`emailVerified: true`, **demote the email field to read-only** in the
Paramètres page. If `emailVerified: false`, the planner enables
`user.changeEmail.enabled: true` + `updateEmailWithoutVerification: true`
in `src/lib/auth/index.ts` and wires `authClient.changeEmail({ newEmail })`
to the identity Save path.

> **Research task remaining for the planner:** confirm the actual
> `emailVerified` state of `antoine.rousseau@leasetic.com` and
> `emmanuel.rousseau@leasetic.com` in the production DB before deciding
> D-06d's path. If unknown at plan time, default to read-only email
> (the safe fallback explicitly authorized by CONTEXT.md D-06d).

### 1e. `updateUser` — what IS safe to update

For the identity Save flow, the **`name`** field is the surface for "Prénom"
+ "Nom". The DB schema stores `name` as a single column (Better Auth core
field). The form has two visible inputs (Prénom + Nom) which the client
concatenates as `${prénom} ${nom}` before calling `authClient.updateUser({ name })`.

For splitting back on read: derive `prénom = name.split(' ')[0]`,
`nom = name.split(' ').slice(1).join(' ')`. This is the same convention used
by the existing admin user-creation flow (verify by reading the existing
admin-create page). The display-name additionalField (`displayName`) is
separate and unused by Figma — leave untouched.

### 1f. Sources

- `node_modules/better-auth/dist/api/routes/update-user.mjs` (changePassword
  lines 75–184; updateUser lines 12–74; changeEmail lines 377–493) [VERIFIED]
- `src/lib/auth/index.ts` lines 122–169 [VERIFIED]
- `package.json` lines 36–55 [VERIFIED]
- Better Auth docs concept page (https://www.better-auth.com/docs/concepts/users-accounts) [CITED]

---

## 2. Existing authed-route structure (`/parametres` placement)

### 2a. Route groups

`app/` contains three top-level route groups:

| Group | Path prefix | Auth gate | Audience |
|-------|------------|-----------|----------|
| `(public)` | `/login`, `/reset/[token]`, `/invite/[token]` | none | unauthenticated visitors |
| `(authed)` | `/` (home), `/proposals`, `/proposals/new`, `/proposals/[id]`, `/aide`, `/aide/commencer-ici` | `requireUser()` in `app/(authed)/layout.tsx` | partners + admins |
| `(admin)` | `/[adminSegment]`, `/[adminSegment]/coefficients`, `/[adminSegment]/partners`, `/[adminSegment]/lc-references`, `/[adminSegment]/history` | role check via the `(admin)` layout | admins only |

There is **no `[locale]` segment** — locale is cookie-based (`getCurrentLang()`
from `@/lib/i18n` reads the cookie; see `src/lib/i18n/` for the implementation).
The Shell receives `lang` as a prop and forwards to all client islands.

### 2b. Authed layout (`app/(authed)/layout.tsx`)

Server component, `export const dynamic = 'force-dynamic'` (PITFALLS §1.6).
Calls `requireUser()` (from `src/lib/auth/require.ts`) and renders `<Shell>`
(from `src/components/ui/Shell.tsx`). Shell composes `<RetractableSidebar>` +
`<Topbar>` + `<main>` + `<footer>` in a CSS grid.

### 2c. CONFIRMED placement for the new Paramètres page

**Path:** `app/(authed)/parametres/page.tsx`

Rationale:
- D-02 + D-06 require it accessible to admin AND partner — `(authed)` is the
  correct group (NOT `(admin)`).
- Naming follows the existing FR-first convention (`/aide`, `/proposals`,
  `/coefficients` under admin tree).
- The `(authed)` layout already wraps it with Shell + Topbar (which hosts the
  user-menu access path per §3).

### 2d. Peer pages the executor should read first

For pattern matching when writing the Paramètres page:

- `app/(authed)/aide/page.tsx` lines 1–30 — current authed-route header
  pattern: `Metadata`, `dynamic = 'force-dynamic'`, `getCurrentLang()`, `t()`
  for strings, `<PageHero>` for the hero block.
- `src/components/ui/PageHero.tsx` — the title+subtitle component to render
  the Figma hero ("Paramètres" + "Changer vos information…").
- `app/(authed)/proposals/new/page.tsx` (if it follows the same shape) — a
  form-bearing authed route for layout pattern.

### 2e. The sidebar nav definitions

The 4 partner-side sidebar items are baked into `RetractableSidebar`
(`src/components/ui/RetractableSidebar.tsx`). Per D-06, **no new sidebar
item is added** — access is via the user-menu only. The planner does NOT
modify RetractableSidebar.

### 2f. Sources

- `app/(authed)/layout.tsx` [VERIFIED]
- `app/(authed)/aide/page.tsx` lines 1–30 [VERIFIED]
- `src/components/ui/Shell.tsx` [VERIFIED]
- Recursive `app/` listing [VERIFIED]

---

## 3. Topbar user menu (D-06 access path)

### 3a. UserMenu is ALREADY a dropdown with the Logout item

File: `src/components/UserMenu.tsx` (213 lines).
Shape: `'use client'` component, controlled by `useState(open)`, click-outside
+ Escape key handlers, anchor button shows avatar circle (initials via
`initials(displayName)`) + name + ChevronDown, panel renders displayName +
email header + `<button role="menuitem">Se déconnecter</button>`.

This means **D-06 reduces to adding a single menu item before the Logout
button** — no need to introduce a new dropdown primitive.

### 3b. Exact edit the planner specifies for the executor

Add a `<Link>` (or `<button>`-styled-as-link) menu item between the
displayName+email header (lines 146–172) and the existing `handleLogout`
button (lines 173–207):

```tsx
import Link from 'next/link';
import { Settings, LogOut } from 'lucide-react';
// ...
{open && (
  <div role="menu" style={{ /* existing panel styles */ }}>
    {/* existing header block — displayName + email */}
    <Link
      role="menuitem"
      href="/parametres"
      onClick={() => setOpen(false)}
      style={{ /* mirror the existing handleLogout button styles */ }}
    >
      <Settings size={17} strokeWidth={1.6} style={{ color: 'var(--muted)' }} />
      <span>{t('shell.user.menu.settings', lang)}</span>
    </Link>
    {/* existing logout button */}
  </div>
)}
```

Notes for the planner:
- Use `<Link>` from `next/navigation`-compatible `next/link` (not anchor) so
  router-cache-aware navigation kicks in.
- Reuse the existing `handleLogout` button's inline styles for visual
  parity (matched padding, font-size 14.5px, font-weight 500, hover overlay).
- `onClick={() => setOpen(false)}` closes the menu before navigation, matching
  the existing click-outside semantics.
- The `Settings` icon (lucide-react, already imported in UserMenu's package)
  is the conventional choice. The Figma node 132:867 doesn't constrain the
  icon — discretion.
- Dictionary key: `shell.user.menu.settings` — FR "Paramètres" / EN "Settings".
  Add to `src/lib/i18n/dictionaries.ts` (see §5).

### 3c. Sources

- `src/components/UserMenu.tsx` lines 1–213 [VERIFIED]
- `src/components/Topbar.tsx` lines 1–68 [VERIFIED]

---

## 4. react-hook-form + Zod analog (D-07 form pattern)

### 4a. Primary analog — `SetPasswordForm.tsx`

**This is the canonical analog for the password section** of the new
Paramètres form. Executor MUST read it before writing the new form.

File: `src/components/SetPasswordForm.tsx` (213 lines).
Schema source: `src/lib/auth/schemas.ts` — `setPasswordSchema`.

What it already establishes that Phase 21 reuses verbatim:
- `useForm<SetPasswordInput>({ resolver: zodResolver(setPasswordSchema), mode: 'onBlur' })`
- `useTransition()` + `useRouter()` + `toast.error(...)` for error surface
- `Eye` / `EyeOff` from `lucide-react` for show/hide password toggles
- Independent `useState(showNew)` / `useState(showConfirm)` flags per field
- `useWatch` (React Compiler-compatible) to drive the strength meter
- `strengthScore(pwd)` (0–4) helper + `STRENGTH_KEYS` / `STRENGTH_COLORS` maps
  with dict keys `auth.password.strength.weak | medium | strong | very_strong`
  already shipped (verified in §5b)
- `noValidate` on the form to suppress browser tooltips
- Inline form style block: `width: '100%', maxWidth: 480, padding: 28,
  background: 'var(--surface)', borderRadius: 16, boxShadow: 'var(--shadow-card)'`
- `t(key, lang)` for every label / placeholder / button / toast — no hardcoded JSX text
- Two-generic `useForm<SetPasswordInput>` (NOT three-generic). Discipline
  is enforced via Zod `.refine()` on confirm — single source of truth.

**The new password section in Paramètres is essentially SetPasswordForm with
one added input ("Mot de passe actuel") and a different submit handler
(authClient.changePassword instead of redeemToken).**

### 4b. Identity-form analog — `CreatePartnerForm.tsx`

For the identity section (Prénom / Nom / Email), the closest analog is
`app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx`. It uses
`useForm<CreatePartnerFormValues>` with `firstName, lastName, email`
(and a phone field which Phase 21 omits per D-06b). Same `mode: 'onBlur'`,
same Zod resolver convention.

Executor reads it for: layout of two-column identity rows, label
typography, input element styling, validation-error surface beneath inputs.

### 4c. Zod schema convention + the new schema

Schemas live in `src/lib/auth/schemas.ts` (auth-scoped) and elsewhere
under `src/lib/.../schemas.ts` per feature domain. They are pure modules
(no framework imports, no `'use server'` / `'use client'`), explicitly
designed to be imported by BOTH client and server (D-29 / SHELL-11).

**New schema for Phase 21 (the planner writes this verbatim):**

```ts
// src/lib/auth/schemas.ts — append after setPasswordSchema

/**
 * In-app self-service password change (Phase 21 — D-07).
 *
 * The server-side Better Auth changePassword endpoint additionally
 * verifies that currentPassword matches the stored hash; client-side
 * only the length/equality constraints are enforced.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
    newPassword: z.string().min(8).max(128),
    confirmNewPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmNewPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * Identity update (Phase 21 — D-06).
 *
 * Splits a Better Auth user.name into Prénom / Nom for the form, recombines
 * client-side before calling authClient.updateUser({ name }). Email is
 * present only when D-06d resolves to "editable"; if email is demoted to
 * read-only, the planner removes the email field from this schema before
 * shipping.
 */
export const identitySchema = z.object({
  firstName: z.string().min(1, 'Prénom requis').max(60),
  lastName: z.string().min(1, 'Nom requis').max(60),
  email: z.string().email(),
});

export type IdentityInput = z.infer<typeof identitySchema>;
```

The planner notes: error messages above are FR-only (matches the existing
schemas' FR-only error literals — verified in `setPasswordSchema` at line
27: `message: 'Passwords do not match'` is actually EN; the codebase
inlines server-side messages in whatever language the schema author wrote
in and never localizes them, because the UI surface always uses
`t(key, lang)` on the `errors.field.message` rendering side — confirm by
reading SetPasswordForm's error rendering path).

### 4d. Sources

- `src/components/SetPasswordForm.tsx` lines 1–120 [VERIFIED]
- `app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx` [LISTED]
- `src/lib/auth/schemas.ts` lines 1–35 [VERIFIED]
- `src/lib/auth/redeem.ts` lines 1–30 [VERIFIED]

---

## 5. i18n dictionary touchpoints (all new FR + EN strings drafted)

### 5a. Dictionary shape

File: `src/lib/i18n/dictionaries.ts` (1723 lines).
Shape: `export const dictionaries = { fr: { ... }, en: { ... } }`.
Convention: **flat dot-notation keys** (e.g. `'form.partner.section'`).
Type discipline: `_EnHasAllFrKeys` compile-time check ensures EN has
every FR key — parity drift caught at build time, NOT runtime.

Existing `auth.*` namespace already has:
- `auth.password.strength.weak | medium | strong | very_strong` — reuse
- `auth.error.generic` — reuse for generic toast
- `auth.token.invalid.title` — not used in Phase 21
- `auth.password.*` may have other useful keys — planner greps the
  existing dict at execution time before adding duplicates

Existing `shell.*` namespace contains topbar / user-menu strings —
where the new "Paramètres" menu item lives (`shell.user.menu.settings`).

### 5b. New keys for Phase 21 (planner adds these verbatim)

```ts
// In dictionaries.fr — append in alphabetical/grouped order matching existing convention:

// Sidebar / user menu access
'shell.user.menu.settings': 'Paramètres',

// Paramètres page hero (Figma 132:867 — VERBATIM including typo per D-06)
'parametres.hero.title': 'Paramètres',
'parametres.hero.subtitle': 'Changer vos information et réinitialiser votre mot de passe.',

// Account card sections
'parametres.card.section.identity': 'Informations',
'parametres.card.section.password': 'Mot de passe',

// Identity section labels (Figma) — phone + avatar omitted per D-06b
'parametres.identity.firstName.label': 'Prénom',
'parametres.identity.firstName.placeholder': 'Prénom',
'parametres.identity.lastName.label': 'Nom',
'parametres.identity.lastName.placeholder': 'Nom',
'parametres.identity.email.label': 'Adresse e-mail',
'parametres.identity.email.placeholder': 'prenom.nom@leasetic.com',
'parametres.identity.email.readonly.notice': 'Pour changer votre adresse e-mail, contactez un administrateur.',  // shown if D-06d demotes email

// Avatar placeholder (no upload UI in Phase 21 per D-06b)
'parametres.identity.avatar.placeholder.alt': 'Avatar par défaut',

// Password section labels (D-07 — current pw + new + confirm)
'parametres.password.current.label': 'Mot de passe actuel',
'parametres.password.current.placeholder': '••••••••',
'parametres.password.new.label': 'Nouveau mot de passe',
'parametres.password.new.placeholder': '••••••••',
'parametres.password.new.hint': 'Au moins 8 caractères.',
'parametres.password.confirm.label': 'Confirmer le nouveau mot de passe',
'parametres.password.confirm.placeholder': '••••••••',
'parametres.password.session.notice': 'Modifier votre mot de passe vous déconnectera de vos autres appareils.',  // D-08

// Inline validation errors (shown beneath fields)
'parametres.error.required': 'Champ requis.',
'parametres.error.password.current.wrong': 'Mot de passe actuel incorrect.',
'parametres.error.password.tooShort': 'Au moins 8 caractères requis.',
'parametres.error.password.tooLong': 'Maximum 128 caractères.',
'parametres.error.password.mismatch': 'Les mots de passe ne correspondent pas.',
'parametres.error.email.invalid': 'Adresse e-mail invalide.',
'parametres.error.unknown': 'Une erreur est survenue. Réessayez.',

// Action footer
'parametres.action.cancel': 'Annuler',
'parametres.action.save': 'Enregistrer les modifications',
'parametres.action.saving': 'Enregistrement…',

// Success toasts
'parametres.toast.identity.saved': 'Informations mises à jour.',
'parametres.toast.password.saved': 'Mot de passe mis à jour.',
'parametres.toast.both.saved': 'Modifications enregistrées.',
'parametres.toast.partialSuccess.identityOk.passwordErr': 'Informations enregistrées, mais le mot de passe n\'a pas été modifié.',
'parametres.toast.partialSuccess.passwordOk.identityErr': 'Mot de passe modifié, mais les informations n\'ont pas été enregistrées.',
```

```ts
// In dictionaries.en — append the EN mirror (planner translates these):

'shell.user.menu.settings': 'Settings',

'parametres.hero.title': 'Settings',
'parametres.hero.subtitle': 'Update your information and reset your password.',  // EN corrects the typo per D-06

'parametres.card.section.identity': 'Profile',
'parametres.card.section.password': 'Password',

'parametres.identity.firstName.label': 'First name',
'parametres.identity.firstName.placeholder': 'First name',
'parametres.identity.lastName.label': 'Last name',
'parametres.identity.lastName.placeholder': 'Last name',
'parametres.identity.email.label': 'Email',
'parametres.identity.email.placeholder': 'firstname.lastname@leasetic.com',
'parametres.identity.email.readonly.notice': 'To change your email address, please contact an administrator.',

'parametres.identity.avatar.placeholder.alt': 'Default avatar',

'parametres.password.current.label': 'Current password',
'parametres.password.current.placeholder': '••••••••',
'parametres.password.new.label': 'New password',
'parametres.password.new.placeholder': '••••••••',
'parametres.password.new.hint': 'At least 8 characters.',
'parametres.password.confirm.label': 'Confirm new password',
'parametres.password.confirm.placeholder': '••••••••',
'parametres.password.session.notice': 'Changing your password will sign you out of your other devices.',

'parametres.error.required': 'Required.',
'parametres.error.password.current.wrong': 'Current password is incorrect.',
'parametres.error.password.tooShort': 'At least 8 characters required.',
'parametres.error.password.tooLong': 'Maximum 128 characters.',
'parametres.error.password.mismatch': 'Passwords do not match.',
'parametres.error.email.invalid': 'Invalid email address.',
'parametres.error.unknown': 'Something went wrong. Try again.',

'parametres.action.cancel': 'Cancel',
'parametres.action.save': 'Save changes',
'parametres.action.saving': 'Saving…',

'parametres.toast.identity.saved': 'Profile updated.',
'parametres.toast.password.saved': 'Password updated.',
'parametres.toast.both.saved': 'Changes saved.',
'parametres.toast.partialSuccess.identityOk.passwordErr': 'Profile saved, but password was not changed.',
'parametres.toast.partialSuccess.passwordOk.identityErr': 'Password changed, but profile was not updated.',
```

The compile-time `_EnHasAllFrKeys` proof in `dictionaries.ts` enforces
that every FR key has an EN counterpart — no escape hatch.

### 5c. Sources

- `src/lib/i18n/dictionaries.ts` lines 1–100 [VERIFIED]
- `src/lib/i18n/dictionaries.ts` total length: 1723 lines [VERIFIED]

---

## 6. Sonner toast helper

### 6a. Convention

**No project-local wrapper.** All consumers import directly from `'sonner'`:

```ts
import { toast } from 'sonner';
```

Usage at call sites (verified across `SetPasswordForm`, `LoginForm`,
`ProposalForm`, `InviteUrlModal`, `CopyRefButton`, `DeleteButtonClient`,
`RestoreButtonClient`, `DraftActionsClient`, `DeleteJustToast`,
`DuplicatePrefillToast`):

```ts
toast.success(t('parametres.toast.identity.saved', lang));
toast.error(t('parametres.error.unknown', lang));
```

Always wrap user-facing strings through `t(key, lang)` — never inline.

### 6b. Sources

- 10 verified call sites listed in §6a [VERIFIED via grep]

---

## 7. Admin email domain (LIVE state vs. ROADMAP)

### 7a. LIVE seed values — `@leasetic.com` is canonical

```ts
// scripts/seed-admins-launch.ts lines 48–49
{ email: 'antoine.rousseau@leasetic.com', name: 'Antoine Rousseau' },
{ email: 'emmanuel.rousseau@leasetic.com', name: 'Emmanuel Rousseau' },
```

### 7b. Stale references in non-code surfaces

- `scripts/grant-admin.ts` line 62: comment example uses
  `antoine.rousseau@memento.eco` (Memento Hub context — NOT the live
  Leasétic admin email). Stale comment; not binding on Phase 21.
- `ROADMAP.md` Phase 21 success criterion #1: still says
  `antoine.rousseau@memento.eco`. Stale; CONTEXT.md D-06 corrects to
  `@leasetic.com`. **Planner does NOT update ROADMAP.md inline** — that's
  out of scope (the goal text is descriptive history). The evidence doc
  (D-05) uses `@leasetic.com` consistently.
- `.planning/STATE.md` Decisions Log 2026-05-08 row `06-launch`: correctly
  pins `@leasetic.com` with note that CLAUDE.md's `@memento.eco`
  references are for the unrelated Memento Hub project.

### 7c. The shared password literal

`leasetic2026` is **NOT** in the source tree (grep confirms). It exists
only in the original chat transcript and the seed-time `INITIAL_PASSWORD`
env var. The evidence doc (§9c below) is the FIRST and ONLY place to log
that it was tested + rejected post-rotation. After rotation, the value
must never re-enter source.

### 7d. Sources

- `scripts/seed-admins-launch.ts` lines 48–49 [VERIFIED]
- `.planning/STATE.md` lines 192, 396 [VERIFIED]
- `ROADMAP.md` Phase 21 section [VERIFIED — stale; do not edit]

---

## 8. Existing admin↔admin reset flow (fallback — DO NOT REMOVE)

### 8a. Entry point + flow

The admin↔admin reset is exposed inside the admin partners surface:

- **`app/(admin)/[adminSegment]/partners/PartnersList.tsx`** —
  table row "Reset password" action that triggers reset-URL generation.
- **`src/components/InviteUrlModal.tsx`** — modal that displays the
  generated invite/reset URL for the admin to copy + share via
  out-of-band channel (email, Signal, WhatsApp).
- **`src/lib/admin/actions.ts`** — server action that issues the reset
  token (mints a `passwordResets` row, returns the redemption URL).
- **`src/lib/auth/redeem.ts`** — server-only `redeemToken(token, kind,
  password, confirmPassword)` that the redemption page hits to atomically
  set the new password + bump `users.sessionVersion` (D-23 — evicts stale
  sessions).
- **Redemption page:** likely under `app/(public)/reset/[token]/page.tsx`
  (mirror of `app/(public)/invite/[token]/page.tsx`). Verifies token via
  `redeemToken` and renders `SetPasswordForm` (which is reused for
  invite AND reset paths — `kind: 'invite' | 'reset'`).

The Paramètres flow (Phase 21) does NOT touch any of these files. They
remain the forgotten-password fallback indefinitely. The two surfaces
exist in parallel:

| Surface | Path | Use case |
|---------|------|----------|
| Admin-mediated reset | `/[adminSegment]/partners` → "Reset password" → admin shares URL | User forgot their password — admin generates a one-time URL |
| Self-service change | `/parametres` (Phase 21 — NEW) | User remembers their current password and wants to change it |

### 8b. Sources

- File list grep above [VERIFIED]
- `src/lib/auth/redeem.ts` lines 1–30 [VERIFIED]

---

## 9. Evidence-doc + privacy-coverage-confirmation skeletons

### 9a. Pattern reference — Phase 20 ops docs

`docs/operations/neon-branch-routing.md` (read lines 1–40) and
`docs/operations/phase-20-rollout-checklist.md` (read lines 1–40)
establish the pattern:

- **No YAML frontmatter** — plain `#`-heading title block.
- First line under title: 1–3 paragraphs of orientation prose
  (purpose + pointer to sibling docs).
- Use **markdown checkboxes** `- [ ]` for operator steps; commit the
  file with boxes ticked on the day of action (the audit trail D-17 in
  Phase 20's case).
- Use **tables** for structured data (Vercel scope ↔ Neon branch in
  Phase 20; here: admin email ↔ rotation date in §9c).
- Final section: brief sources/footnotes/cross-references.

### 9b. New file — `docs/operations/phase-21-gate-evidence.md`

Skeleton (planner copies this into the dedicated task, executor fills
in `_pending_` cells on the day of rotation):

```markdown
# Phase 21 — Partner-Onboarding Gates: Evidence

Created: 2026-05-29 (Phase 21 plan).
Closed: _pending — fill on rotation day._

This file is the auditable record that both v1.3 partner-onboarding
gates (GATE-01 password rotation + GATE-02 privacy notice update)
were closed before any non-`@test.leasetic.com` partner account is
invited via the admin `/partners/new` flow. Process discipline only
(D-04) — no code-level guard.

## GATE-01 — Admin password rotation (in-app flow)

Both admin accounts rotated from the shared launch-day password
`leasetic2026` to individual strong passwords via the new
`/parametres` self-service flow (shipped by Phase 21 Plan 21-01).

| Admin | Account email | Rotation date | Old password tested + rejected | New password authenticates |
|-------|---------------|---------------|-------------------------------|----------------------------|
| Antoine Rousseau | `antoine.rousseau@leasetic.com` | _pending_ | _pending_ | _pending_ |
| Emmanuel Rousseau | `emmanuel.rousseau@leasetic.com` | _pending_ | _pending_ | _pending_ |

**Verification procedure (per admin):**

1. Open production app → user menu → "Paramètres".
2. Change password via the in-app flow. Confirm the success toast.
3. Sign out. Attempt sign-in with `leasetic2026` — must FAIL.
4. Sign in with the new password — must SUCCEED.
5. Tick the row above.

## GATE-02 — Public privacy notice update (leasetic.fr)

Privacy notice on `leasetic.fr` updated by Antoine (D-01) to cover
(a) Vercel + Neon EU hosting as data processors and (b) 10-year PDF
retention as a new processing activity tied to French Commercial Code
L123-22 / L110-4.

- **Public URL:** _pending — paste once published._
- **Publication date:** _pending._
- **Both additions visible on the public page:** _pending — one-line
  confirmation after visual check._

## Closure checklist

No non-`@test.leasetic.com` partner account may be invited via the
admin `/partners/new` flow until:

- [ ] Both rows in the GATE-01 table above are ticked + dated.
- [ ] GATE-02 URL + publication date + visible-confirmation line
      above are filled.

---

*Sources:*
- `.planning/phases/21-partner-onboarding-gates/21-CONTEXT.md` D-04, D-05
- `.planning/STATE.md` Phase 6 follow-ups #1 (origin of GATE-01)
- `.planning/STATE.md` Open questions #3 (origin of GATE-02)
- `docs/legal/privacy-coverage-confirmation.md` (Phase 21 rewrite —
  publication record + cross-link)
```

### 9c. Rewritten — `docs/legal/privacy-coverage-confirmation.md`

The existing file (Phase 10, 2026-05-10) is a stub framed around
"Question on record to Thomas → Thomas's reply" — superseded by D-01.
The Phase 21 rewrite replaces those sections with a Publication record
of Antoine's self-edit. Skeleton:

```markdown
# Privacy Coverage Confirmation — v1.3 Launch

**Created:** 2026-05-10 (stub) — **Updated:** 2026-05-29 (Phase 21
publication record per D-01).
**Status:** _pending — closed once leasetic.fr update is published._

This document is the legal-side paper trail for the v1.3 partner-
onboarding gates. It confirms that Leasétic's public privacy notice
on `leasetic.fr` was updated to cover (a) Vercel + Neon EU hosting
and (b) 10-year PDF retention as a new processing activity tied to
French Commercial Code L123-22 / L110-4.

**Phase 21 reframe (D-01):** Antoine owns the leasetic.fr website
directly. Phase 10's "ask Thomas Heufke for written confirmation"
framing is **superseded** — the publication itself (a self-edit on
the leasetic.fr project) is the artifact; no third-party
confirmation is required. The prompt Antoine used for the self-edit
session is captured verbatim in
`.planning/phases/21-partner-onboarding-gates/21-DISCUSSION-LOG.md`
under "Prompt drafted for the leasetic.fr edit session."

## Publication

- **Public URL of the updated privacy notice:** _pending — paste once
  published._
- **Publication date:** _pending._
- **Visible additions confirmed:** _pending — one-line confirmation
  after a visual check that both Vercel/Neon EU hosting + 10-year
  PDF retention sections are present on the public page._

## Resolution

- [ ] Privacy notice published with both additions (fill `## Publication`
      above + tick this box).

---

*Document context: D-10-17 (privacy URLs via env vars),
D-01 (this phase's reframe of D-10-18).*

*Cross-references:*
- `docs/operations/phase-21-gate-evidence.md` GATE-02 section (the
  evidence-log home — see that file for the rotation closure
  checklist).
- `.planning/phases/21-partner-onboarding-gates/21-DISCUSSION-LOG.md`
  ("Prompt drafted for the leasetic.fr edit session" — verbatim prompt
  Antoine used).
```

### 9d. Sources

- `docs/operations/neon-branch-routing.md` lines 1–40 [VERIFIED]
- `docs/operations/phase-20-rollout-checklist.md` lines 1–40 [VERIFIED]
- `docs/legal/privacy-coverage-confirmation.md` full file [VERIFIED]

---

## 10. Verbatim GATE-02 out-of-band prompt

The prompt below was generated during the discuss-phase (DISCUSSION-LOG
lines 68–161) for Antoine to paste into a fresh chat session on the
Leasétic website project. **It is reproduced here verbatim so the
planner can drop it into the GATE-02 task description as the operator's
exact instruction.**

```
Je dois mettre à jour la page "Politique de confidentialité" (ou
"Mentions légales / Données personnelles" selon la structure du site)
de leasetic.fr pour couvrir deux nouvelles activités de traitement
introduites par l'application Leasétic Matrice (l'outil de devis
commercial distribué aux partenaires intégrateurs).

## Contexte

L'application Leasétic Matrice est hébergée sur Vercel + Neon Postgres
(régions EU) et conserve les propositions PDF générées par les
partenaires pendant 10 ans. La politique de confidentialité actuelle du
site a été rédigée avant la mise en ligne de cette app et doit être
étendue pour rester conforme RGPD.

## Tâches à accomplir

1. **Lis d'abord la page de politique de confidentialité actuelle**
   sur le site (probablement à `/politique-de-confidentialite`,
   `/mentions-legales`, `/donnees-personnelles` ou similaire).
   Identifie la structure des sections existantes.

2. **Identifie les deux sections à modifier** :
   - La section "Sous-traitants" / "Hébergeurs" / "Destinataires
     des données" (où sont listés les prestataires techniques).
   - La section "Durée de conservation" / "Conservation des données"
     (où sont listées les durées par catégorie de donnée).

3. **Propose les ajouts suivants** (à adapter au ton et à la mise en
   forme de la politique existante) :

   ### Ajout #1 — Sous-traitants / Hébergement EU

   Ajouter dans la liste des sous-traitants / destinataires :

   - **Vercel Inc.** — hébergement de l'interface applicative
     (Leasétic Matrice). Données traitées dans l'Union européenne
     (région Frankfurt / Paris selon configuration). DPA signé
     conformément à l'article 28 RGPD. Site : vercel.com.
   - **Neon Inc.** — hébergement de la base de données Postgres de
     l'application Leasétic Matrice. Données stockées dans l'Union
     européenne (région EU Central / EU West). DPA signé. Site :
     neon.tech.

   Mentionner que ces sous-traitants n'ont pas accès aux données
   au-delà de ce qui est strictement nécessaire à la prestation
   technique (hébergement, stockage, sauvegardes).

   ### Ajout #2 — Conservation 10 ans des propositions PDF

   Ajouter dans la section "Durée de conservation" une ligne pour la
   catégorie "Propositions commerciales (PDF générés via Leasétic
   Matrice)" :

   - **Durée** : 10 ans à compter de la date de génération du
     document.
   - **Base légale** : obligation légale de conservation des
     documents commerciaux (Code de commerce français, articles
     L123-22 et L110-4 — conservation des pièces commerciales et
     prescription des actions commerciales).
   - **Catégorie de données** : informations relatives à l'opération
     de leasing proposée (raison sociale du client, SIREN, montant
     HT du projet, durée du financement, coefficient appliqué) +
     identité du partenaire émetteur.

4. **Affiche-moi les modifications proposées en diff** (texte
   actuel → texte proposé) avant toute publication. Je validerai
   chaque section avant qu'elle ne parte en ligne.

5. **Ne publie rien sans ma confirmation explicite.** Une fois validé,
   pousse les changements et donne-moi l'URL publique de la page mise
   à jour ainsi que la date de publication.

## Ton et style

- Garde le ton juridique-mais-accessible de la politique existante.
- Pas d'avis juridique de ta part — tu proposes du texte standard
  RGPD-conforme que j'adapterai.
- Préserve la mise en forme (titres, listes, gras) de la page actuelle.
- Si la politique actuelle n'existe pas encore ou est très lacunaire,
  signale-le et propose une structure complète RGPD-conforme à
  valider ensemble.

## À retourner à la fin

- L'URL publique de la page de politique de confidentialité mise à
  jour.
- La date de mise en ligne.
- Une courte phrase confirmant que les deux ajouts (Vercel/Neon EU
  + conservation 10 ans des PDF) sont visibles sur la page publiée.

Je vais reporter ces trois éléments dans un document interne pour
clore la conformité de l'app.
```

**Source:** `.planning/phases/21-partner-onboarding-gates/21-DISCUSSION-LOG.md`
lines 68–161 [VERIFIED — character-for-character copy].

---

## Decisions to defer to the planner

Items where Better Auth has multiple valid paths or Figma is silent and
the planner picks at planning time:

### Plr-1. Email field — editable or read-only (depends on `emailVerified` DB state)

Per §1d + D-06d: if both admin users have `emailVerified = true` in the
production DB, Better Auth 1.6.9 rejects email change without SMTP. The
planner checks the live DB state during planning (either by reading the
schema and tracing initialization, or by adding a small `console.log`
diagnostic task). **Safe default per CONTEXT.md D-06d: demote email to
read-only.** If demoted, the planner removes the email field from
`identitySchema` (§4c), renders email as static text in the identity
section, and surfaces the `parametres.identity.email.readonly.notice`
string (§5b) beneath it.

### Plr-2. Show/hide password toggle (each password input)

Figma 132:867 does not constrain the show/hide toggle on password
inputs. The existing `SetPasswordForm` includes Eye/EyeOff toggles
(§4a). **Planner picks:** include toggles on all THREE password
inputs (current + new + confirm) for consistency with the existing
invite/reset path, OR omit toggles to match Figma's minimal layout.
Either is defensible. Recommend **include toggles** for parity with
SetPasswordForm — the user is already familiar with the pattern.

### Plr-3. Strength meter beneath "Nouveau mot de passe"

`SetPasswordForm` ships a 0–4 strength meter with FR + EN dict keys
already in the dictionary (`auth.password.strength.*`). **Planner picks:**
render the strength meter beneath the "Nouveau mot de passe" field for
parity, OR omit it to keep the Paramètres password section minimal.
Recommend **include** — reuses existing dict keys + helper function
verbatim, no new strings needed.

### Plr-4. Plan shape — one plan or two?

CONTEXT.md "Claude's Discretion" suggests Plan 1 = ship in-app password
flow, Plan 2 = operational gate closure. The planner may instead choose:
- **One plan** covering Paramètres page + evidence doc + privacy stub
  rewrite (smaller blast radius, single PR, single verification cycle).
- **Two plans** (CONTEXT.md suggestion): Plan 1 ships the new code,
  Plan 2 captures the operational steps post-deploy (rotation evidence,
  privacy URL).

The two-plan shape better separates "code work" from "operator work" and
makes the gate closure auditable as its own artifact. Recommend **two
plans** unless the operational evidence is so small it doesn't merit its
own PLAN.md (the evidence doc + privacy stub rewrite together are ~200
LOC of markdown — borderline).

### Plr-5. Sidebar nav — really no Paramètres entry?

CONTEXT.md D-06 + Figma 132:867 both omit a sidebar entry. **Planner
confirms:** no sidebar item is added. Access is ONLY via the user-menu
dropdown (§3). Document this explicitly in PLAN.md's "Figma deviation"
section as a non-deviation (mirror of Figma).

### Plr-6. Cancel button behavior

Figma shows "Annuler" + "Enregistrer les modifications". Figma does not
specify what "Annuler" does. **Planner picks:** Annuler resets the form
to its current loaded values (`form.reset(initialValues)`) without
navigating away, matching the standard "discard local edits" pattern.

### Plr-7. Where to render "Modifier votre mot de passe vous déconnectera…" notice

D-08 specifies the copy but is silent on exact placement. **Planner
picks:** render it as helper text immediately under the "Mot de passe"
section heading (above the three password inputs), with the
`parametres.password.session.notice` dict key. Styled in muted
typography matching other section-level hints.

### Plr-8. Better Auth session freshness

Per §1c: `changePassword` is guarded by `sensitiveSessionMiddleware`
(requires a fresh session). With no explicit `session.freshAge` override
in `src/lib/auth/index.ts`, BA defaults apply (typically 24h). If a user
has been logged in past the freshness window, the call fails. **Planner
picks:** surface a clear error toast pointing the user to sign out and
back in (UX defensible — re-auth is the secure path), OR override
`freshAge` to `Infinity` in BA config (cheap but weakens security).
Recommend **the toast path** — the freshness gate is a feature not a bug.

### Plr-9. `parametres.error.password.current.wrong` vs. generic toast for BA's INVALID_PASSWORD

Better Auth returns `INVALID_PASSWORD` when `currentPassword` doesn't
match. **Planner picks:** map this error to an INLINE error beneath
"Mot de passe actuel" (better UX) using
`parametres.error.password.current.wrong`, NOT a toast. The mapping
happens in the submit handler's error branch.

---

## RESEARCH COMPLETE
