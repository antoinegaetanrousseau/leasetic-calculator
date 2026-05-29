# Phase 21: Partner-Onboarding Gates - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning (one external dependency — Figma URL — see Specific Ideas)

<domain>
## Phase Boundary

Close the two Tier-1 partner-onboarding blockers that must complete before any
real partner account is created on Leasétic Matrice:

1. **GATE-01** — Rotate both admin accounts (`antoine.rousseau@leasetic.com`
   + `emmanuel.rousseau@leasetic.com`) from the shared launch-day password
   `leasetic2026` to individual strong passwords. **Scope expanded during
   discussion:** Phase 21 now ships a **new in-app self-service password-change
   flow** available to all logged-in users (admin + partner), and both admins
   use that new flow to rotate. The existing admin↔admin reset URL flow on
   `/[adminSegment]/partners` stays in place as a fallback (forgotten-password
   path). Resolves Phase 6 follow-up #1 + permanently closes the
   no-self-service-password-change gap.

2. **GATE-02** — Update Leasétic's public privacy notice on `leasetic.fr` to
   cover (a) Vercel/Neon EU hosting as data processors and (b) 10-year PDF
   retention as a new processing activity under French Commercial Code
   L123-22 / L110-4. **Scope reframed during discussion:** Antoine owns
   the leasetic.fr website directly — GATE-02 no longer depends on a written
   confirmation from Thomas Heufke. The original "ask Thomas" framing (D-10-18)
   is superseded; Antoine self-edits the privacy notice via a separate fresh
   session on the Leasétic website project (prompt drafted during discussion —
   see Discussion Log). `docs/legal/privacy-coverage-confirmation.md` is
   updated post-publication with the public URL + publication date as evidence,
   replacing the stub's pending-reply text.

**Acceptance:** Both gates must be closed before any non-test partner account
(`not @test.leasetic.com`) is invited via the admin `/partners/new` flow.
Enforcement is **process-only** (no code-level guard) — see D-04.

**In scope:**
- New in-app password-change UI + server action available to all
  logged-in users (admin + partner) — UX driven by a Figma section that
  Antoine will provide before planning starts (see Specific Ideas).
- Both admin passwords rotated via the new flow (manual operator step).
- Privacy notice on `leasetic.fr` updated (executed in a separate session
  using the prompt captured in the Discussion Log).
- `docs/legal/privacy-coverage-confirmation.md` updated with the public URL
  + publication date, replacing the stub.
- New `docs/operations/phase-21-gate-evidence.md` capturing both gate
  verifications in one auditable artifact.
- Verification step: failed-login test with `leasetic2026` (both admin
  accounts) + successful login with new credentials — recorded in the
  evidence doc.

**Out of scope:**
- Code-level enforcement of "no real partner until gates closed"
  — process discipline only (D-04).
- SMTP-driven self-service password reset (forgotten-password by email)
  — out of v1.3, admin-mediated reset stays the fallback (carried v1.1
  constraint).
- Asking Thomas Heufke for written confirmation of privacy coverage
  — superseded by D-01 (Antoine self-edits the policy).
- Multi-factor authentication on admin accounts — separate future phase.
- Password-policy strength enforcement beyond Better Auth's existing
  argon2id + minimum-length rules (no new server-side policy added).
- Migrating the leasetic.fr website itself (separate project).

</domain>

<decisions>
## Implementation Decisions

### GATE-02 — Privacy notice via self-edit (D-01)

- **D-01 (Privacy-notice channel):** Antoine owns the `leasetic.fr` website
  directly. GATE-02 closes by Antoine self-editing the public privacy notice
  via a separate fresh session on the Leasétic website project, **not** by
  obtaining a written confirmation from Thomas Heufke. The two additions
  required: (a) Vercel + Neon listed as EU-hosted data processors in the
  "Sous-traitants / Destinataires" section with DPA attestation, (b)
  "Propositions commerciales (PDF générés via Leasétic Matrice) — 10 ans"
  added to the "Durée de conservation" section, citing French Commercial Code
  L123-22 / L110-4 as the legal basis. The full prompt to drop into the
  fresh website session is captured verbatim in
  `21-DISCUSSION-LOG.md`. The privacy-coverage-confirmation.md stub
  question-on-record framing (D-10-18) is **superseded** — that doc
  becomes the evidence record for the publication, not the question record.

### GATE-01 — In-app password-change flow (D-02, D-03)

- **D-02 (Scope — flow availability):** The new in-app self-service
  password-change flow is available to **all logged-in users (admin AND
  partner)** — not admin-only. Same UI, same server-action backend,
  role-agnostic. Partners get self-service password change as a side-benefit;
  closes the structural no-self-service-password-change gap permanently
  (was unresolved since v1.1 Phase 6). The existing admin↔admin reset URL
  flow on `/[adminSegment]/partners` stays in place as the
  forgotten-password fallback path; no removal.

- **D-03 (Design source):** UX details (page placement, form layout,
  validation feedback, success state, current-password challenge,
  session-invalidation behavior) come from Figma. Antoine will paste the
  Figma node URL + section reference when invoking `/gsd-plan-phase 21`.
  The planner **must block** until that URL is provided; do not infer UX
  from existing conventions. The flow is new to the app — no prior phase
  established its visual contract.

### Rotation execution + evidence (D-04, D-05)

- **D-04 ("No real partner" enforcement):** **Process discipline only**,
  no code-level guard on `/partners/new`. Antoine knows the rule:
  no non-`@test.leasetic.com` invite until both gates close. The rule is
  documented in the closure checklist of the evidence doc (D-05).
  Rationale: the gate is two-week-temporary; introducing a flag or env
  var becomes dead code shortly after gates close. Two admins, one
  primary operator (Antoine), small blast radius.

- **D-05 (Evidence artifact):** Create
  `docs/operations/phase-21-gate-evidence.md` capturing both gate
  verifications in one place. Sections:
  - **GATE-01 verification:** rotation date for each admin, evidence
    that `leasetic2026` was tested against both accounts and rejected
    after rotation, evidence that the new password authenticated
    successfully against each.
  - **GATE-02 verification:** the public URL of the updated privacy
    notice, the publication date, a one-line confirmation that both
    additions (Vercel/Neon EU hosting + 10-year PDF retention) are
    visible on the published page.
  - **Closure checklist:** the rule "no non-`@test.leasetic.com` partner
    invite before both above are checked" — restated for the record.

  Pattern matches Phase 20 (`docs/operations/neon-branch-routing.md`,
  `docs/operations/phase-20-rollout-checklist.md`) — partner-onboarding
  audit trail lives alongside infra runbooks where future GDPR or
  partner audit will grep first.

### Claude's Discretion

- **Plan shape and ordering:** The planner decides plan count + wave
  ordering. Suggested shape: Plan 1 ships the in-app password-change flow
  (code-only, the largest plan); Plan 2 handles the operational gate
  closure (both admins rotate via Plan 1's new flow + privacy notice
  update on leasetic.fr + evidence doc population). Wave order:
  Plan 1 ships first; Plan 2 runs after Plan 1 is live in production.
- **Password-change UX details outside the Figma scope:** if Figma
  doesn't specify session-invalidation behavior (other-device sign-out
  after password change), planner picks the secure default (revoke
  other sessions, keep current session active).
- **Privacy-notice editing session is OUT-OF-BAND.** Antoine runs that
  session separately on the Leasétic website project using the
  prompt in DISCUSSION-LOG; Phase 21 plans only verify the result + log
  the URL.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements
- `.planning/REQUIREMENTS.md` (lines containing GATE-01, GATE-02) —
  the two requirement statements being satisfied.
- `.planning/ROADMAP.md` §"Phase 21: Partner-Onboarding Gates" —
  goal statement + success criteria (1, 2, 3).

### Existing operational + legal docs
- `docs/legal/privacy-coverage-confirmation.md` — existing stub (Phase
  10, 2026-05-10). Will be UPDATED in Phase 21 with the public URL +
  publication date of the updated leasetic.fr privacy notice. The
  stub's "Question on record" and "Response" sections are superseded
  by D-01 — replace them with a "Publication" section describing the
  self-edit path + linking to the public URL.
- `docs/operations/phase-21-gate-evidence.md` — **NEW** doc to create.
  Pattern: see `docs/operations/neon-branch-routing.md` and
  `docs/operations/phase-20-rollout-checklist.md` for tone/format.

### Auth + admin code paths
- `src/lib/auth/index.ts` — Better Auth config (argon2id work factors
  pinned: algorithm:2, memoryCost:19456, timeCost:2, parallelism:1).
  The new password-change endpoint integrates here; verify whether
  Better Auth's built-in `changePassword` endpoint is exposed or
  whether a custom server action is needed.
- `app/[adminSegment]/partners/` — existing admin↔admin reset flow
  (Phase 9 + Phase 14). Stays as fallback; **do not remove**.
- `scripts/grant-admin.ts` — ongoing admin-grant tool (NOT used for
  rotation, but referenced for understanding admin lifecycle).
- `scripts/seed-admins-launch.ts` — one-off launch-day seed (NOT used
  for rotation; documents the chicken-and-egg-break pattern that
  introduced `leasetic2026`).

### Prior phase context (carry-forward)
- `.planning/STATE.md` §"Phase 6 follow-ups" #1 — origin of GATE-01
  (the `leasetic2026` shared password decision + rotation imperative).
- `.planning/STATE.md` §"Phase 6 follow-ups" #4 — admin seeding bypass
  pattern that introduced the shared password.
- `.planning/STATE.md` §"Open questions" #3 — origin of GATE-02
  (legal counsel sign-off on 10-year retention, DATA-11).
- `.planning/STATE.md` §"Decisions Log" 2026-05-08 (`06-launch` rows) —
  admin email domain (`@leasetic.com` NOT `@memento.eco`), the
  `leasetic2026` exception, the APP_URL / NEXT_PUBLIC_APP_URL
  configuration requirement.
- `.planning/PROJECT.md` §"Key decisions" v1.1 row "10-year PDF
  retention" — the locked retention rule whose privacy-policy coverage
  is the subject of GATE-02.

### Dependency to be provided before planning
- **Figma node URL for the in-app password-change flow** — Antoine
  pastes this when invoking `/gsd-plan-phase 21`. Without it, the
  planner blocks (D-03). Figma file root is `vwOzirhL0vyxDWq4m6t4gC`
  (the v1.3 design contract file).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Better Auth (1.6.9) password-change primitives:** Better Auth exposes
  built-in endpoints for self-service password change (changePassword)
  that the new in-app flow can lean on rather than rolling a custom
  server action. Verify exact endpoint name + payload shape during
  planning; the planner should NOT roll a custom password-update path
  if the library covers it. argon2id work factors must match the
  existing `auth()` config (Decisions Log 06-03).
- **`react-hook-form` + Zod schema pattern** (Phases 7, 13): proven
  pattern for client-side password form validation with `mode: 'onBlur'`,
  three-generic `useForm<z.input, unknown, z.output>` discipline,
  Controller for any non-native inputs (Decisions Log 07-04).
- **Sonner toast** for success/error feedback (Phase 6, SHELL-09):
  standard surface for "Password updated successfully" or "Current
  password incorrect".
- **i18n dictionary at `src/i18n/dictionaries.ts`** (Phase 6): all
  user-facing strings for the new flow go here in FR + EN; compile-time
  parity proof catches drift (Phase 6 pattern, validated through v1.2).

### Established Patterns
- **Server-only password handling:** plaintext passwords never leave the
  request boundary; argon2id hashing happens inside Better Auth's
  server-only modules (`server-only` package import). The new flow
  must obey this — no plaintext logging, no plaintext in audit_log
  payload (ADMIN-09 envelope still applies but is informational here
  since commission visibility is the binding constraint, not password
  handling).
- **Session invalidation after sensitive ops:** existing admin↔admin
  reset revokes target user's sessions via Better Auth admin plugin
  (`revokeUserSessions`). For self-service password change, the secure
  default is "revoke all OTHER sessions of self, keep current session
  active." Confirm during planning whether Figma specifies this UX or
  defer to the secure default.
- **No SMTP, no email reset link:** admin-invited only; if a partner
  forgets their password they request admin reset via the existing
  `/[adminSegment]/partners` flow. The new in-app flow assumes the user
  REMEMBERS the current password (challenge-current-password gate is
  standard). Not a substitute for forgotten-password recovery.

### Integration Points
- **Sidebar / profile placement:** the new flow needs a route. Existing
  shell has `/coefficients`, `/partners`, `/history`, `/proposals`,
  `/partners/new`, `/proposals/new/...`. There is no current profile or
  settings surface. Likely placement: `/account` (or `/[locale]/account`
  depending on the existing i18n routing pattern) with a "Password"
  section. Confirm path during planning from Figma.
- **Admin tree vs. partner tree:** the flow must NOT live under the
  hidden `/[adminSegment]/...` admin tree — it's available to partners
  too. Place under the public-authed shell (`app/(authed)/...` or
  equivalent — verify with the existing route map during scout).

</code_context>

<specifics>
## Specific Ideas

- **Privacy-notice edit is OUT-OF-BAND.** Antoine runs the privacy-notice
  edit in a separate fresh session on the Leasétic website project. The
  exact prompt is captured verbatim in `21-DISCUSSION-LOG.md` under
  "Decision D-01 — privacy-notice edit prompt." Phase 21 plans assume
  the edit was performed and verify the public URL post-hoc; the
  website-edit session is NOT a plan task in this repo.

- **Figma URL pending.** The in-app password-change UX comes from a
  Figma section Antoine will paste when invoking `/gsd-plan-phase 21`.
  The Figma file root is `vwOzirhL0vyxDWq4m6t4gC` (v1.3 design contract
  file). Without the node URL, planning cannot proceed past the
  research/scout step. **Planner must block on this dependency.**

- **Admin email domain pinned:** `antoine.rousseau@leasetic.com` and
  `emmanuel.rousseau@leasetic.com` are the rotation targets. CLAUDE.md
  references `@memento.eco` for unrelated Memento Hub context — DO NOT
  use those for the Leasétic Matrice admins (Decisions Log 2026-05-08
  `06-launch` row).

- **The shared password `leasetic2026` is not in source / git.** It
  exists only in the original chat transcript and the seed-time
  `INITIAL_PASSWORD` env var. After rotation, it must be confirmed
  invalid via a failed-login attempt and the value never re-introduced.

- **Evidence-doc verification step is manual.** The failed-login test
  + successful-login test for both admins is a human operator step
  performed by Antoine post-rotation; results recorded by hand in the
  evidence doc. No automated test fixture.

</specifics>

<deferred>
## Deferred Ideas

- **SMTP-driven forgotten-password reset for partners** — partners who
  forget their password still rely on the admin-mediated reset URL.
  Adding email-driven recovery requires an SMTP integration the project
  has explicitly declined since v1.1. Out of scope; deferred to v1.4+.
- **Multi-factor authentication on admin accounts** — adjacent topic
  surfaced naturally during the rotation discussion. Not in v1.3.
  Belongs in a separate "Admin auth hardening" phase post-v1.3.
- **Code-level "gates closed" guard on `/partners/new`** — option
  considered (env var or hardcoded constant). Rejected in favor of
  process discipline (D-04). If Emmanuel becomes a regular operator
  or if the partner-invite cadence grows, revisit by adding a
  permanent server-side check that the operator is not creating a
  partner account during a "frozen" window — but that's a different
  capability (operational freeze), not the temporary gate of Phase 21.
- **Thomas's verbatim confirmation of privacy coverage** — the
  original D-10-18 paper-trail framing. Superseded by D-01 (Antoine
  self-edits the public policy). If Leasétic legal posture changes
  later and Thomas needs to formally sign off on the published policy,
  capture that in a future phase with an updated process.

</deferred>

<plan_phase_addendum>
## Plan-phase addendum (2026-05-29, Figma extraction — rev 2)

Established during `/gsd-plan-phase 21` after extracting Figma node
`132:867` ("Paramètres — v1.3 sketch") via the Dev Mode MCP. These
decisions are LOCKED, downstream of CONTEXT.md's <decisions> block,
and binding on the planner.

**Rev 2 (2026-05-29 evening — Antoine reworked the Figma):**
The first extraction surfaced a wide-card layout with avatar + phone
fields and a single "Nouveau mot de passe" input. Antoine reworked
the design to (a) remove avatar + phone (matching D-06b's earlier
defer), (b) add "Ancien mot de passe" alongside "Nouveau mot de
passe" (matching D-07's earlier security extension), and (c) ship a
full-width form-card layout with an eyebrow section header
("INFORMATIONS PERSONNELLES") + footer outside the card. Antoine
confirmed (i) the action button text is "Enregistrer les
modifications" (the Figma snapshot showing "Envoyer l'invitation →"
was a designer leftover, now corrected), and (ii) the "Confirmer le
nouveau mot de passe" field is DROPPED — Figma's 2-field password
row is the contract. The addendum below reflects rev 2 — disregard
any earlier rev 1 notes if you find them in commits.

### D-06 (Page surface — Paramètres route)

GATE-01 ships as a new **Paramètres page** matching Figma `132:867`
(rev 2). The page contains:

1. **Hero row** — title "Paramètres" + subtitle "Changer vos
   information et réinitialiser votre mot de passe." (Figma's FR
   subtitle typo is preserved verbatim — see hero-copy note below).

2. **Form card** (`134:489` in Figma, full content width — Figma
   shows it 1188×340 inside the 1252 content column with 32px
   horizontal margins). A single card containing:

   - **Eyebrow section header:** "INFORMATIONS PERSONNELLES" as
     uppercase eyebrow text (~13–14px) with a small filled circle
     bullet to the left (`134:491` ellipse 8×8). This is the ONLY
     section header in the card — there is **no second section
     header** for the password row.
   - **Identity row 1 (2-column):** Prénom + Nom (each ~558px wide,
     16px gap). Labels above the inputs.
   - **Identity row 2 (full-width):** Email professionnel (full
     ~1132px width, label above input). Label is "Email
     professionnel" — NOT "Adresse e-mail" — per Figma `134:503`.
   - **Horizontal divider** (`134:507` 1×1132px line) separating
     identity rows from password row. No header label between
     divider and password row (per rev 2).
   - **Password row (2-column):** Ancien mot de passe + Nouveau mot
     de passe (each ~558px wide, matching the identity row geometry).
     Labels above inputs. ONLY TWO password fields — no "Confirmer
     le nouveau mot de passe" (per rev 2 user decision).

3. **Action footer** (`134:532`) rendered as a **separate frame
   OUTSIDE the form card**, full content width, below the card with
   ~24px vertical gap. Contains:
   - "Annuler" (secondary button) on the left
   - "Enregistrer les modifications" (primary teal/dark button) on
     the right

- **Route placement:** `/parametres` (FR-first naming, consistent with
  existing `/coefficients`, `/partners`, `/proposals`, `/history`).
  The planner confirms the exact route group during research (likely
  `app/(authed)/parametres/page.tsx`).
- **Sidebar nav:** NO new sidebar item. Access is via the user-menu
  dropdown in the Topbar ("Antoine Rousseau ▾" → "Paramètres").
  Figma shows the sidebar nav unchanged (Accueil / Nouvelle
  proposition / Propositions / Aide).
- **Hero copy:** Title = "Paramètres". Subtitle = "Changer vos
  information et réinitialiser votre mot de passe." Figma's subtitle
  has a typo ("vos information" → should be "vos informations").
  **Preserve Figma's copy verbatim in the FR dict** — copy fidelity
  to the design source-of-truth matters more than the typo. EN dict
  uses the corrected English equivalent: "Update your information
  and reset your password."
- **Action button text (rev 2 — confirmed by Antoine):** the FR
  button is "Enregistrer les modifications". The "Envoyer
  l'invitation →" text visible in Figma metadata for `134:536` is a
  template leftover that Antoine corrected; the planner uses
  "Enregistrer les modifications" verbatim (dict key
  `parametres.action.save`).

### D-06b (Avatar + phone — explicitly deferred, NOW matches Figma)

Both avatar upload and Numéro de téléphone were shown in the
initial Figma extraction and explicitly deferred. **Rev 2 of the
Figma removes both** — the design now matches Phase 21's scope
exactly. The deferral rationale stands, but these are **no longer
"deviations from Figma"** in the deviation log (D-10):

- **Avatar upload** requires image-storage infrastructure (Vercel
  Blob or equivalent) that doesn't yet exist in the project — out
  of scope for v1.3. Phase 21 does NOT render an avatar in the
  Paramètres form (rev 2 Figma omits it entirely; the rendered
  page mirrors that omission). The Topbar UserMenu's existing
  initials avatar is unchanged.
- **Numéro de téléphone** isn't a field on the User model and is
  not present in rev 2 Figma — out of scope for Phase 21.

The planner notes the future "Account v2" tracking item (add
avatar + phone + maybe SMTP-driven preferences) in PLAN.md.

### D-06c (Single Save button — partial-success behavior, unchanged)

The "Enregistrer les modifications" button submits both sections.
Backend translates to two distinct Better Auth calls:

- `authClient.updateUser({ name: ... })` for identity Prénom + Nom
  (only if `${prénom} ${nom}` changed vs. the loaded session).
- `authClient.changeEmail({ newEmail })` for email change (only if
  email changed AND D-06d resolved to "email editable").
- `authClient.changePassword({ currentPassword, newPassword,
  revokeOtherSessions: true })` for password (only if BOTH the
  Ancien and Nouveau fields are non-empty).

**Edge case — partial success:** If identity update succeeds but
password change fails (e.g. `INVALID_PASSWORD`), the UI surfaces the
password error inline (under "Ancien mot de passe") AND a success
toast for the identity update. Conversely if the password succeeds
but updateUser/changeEmail fails, surface the identity error inline
+ a success toast for the password.

**Edge case — neither section dirty:** Save button is disabled when
nothing has been edited. Use react-hook-form's `formState.dirtyFields`
to compute per-section dirty state and gate the disabled flag.

**Edge case — only one password field filled:** if the user typed
into ONE password field but left the other empty, treat both as
"intended but incomplete" — show a single inline error under the
empty field ("Champ requis pour modifier le mot de passe.") rather
than letting the form treat the password section as "untouched."

### D-06d (Email change — verify-without-SMTP behavior, unchanged)

Better Auth's `updateUser` rejects email per RESEARCH §1d:
`EMAIL_CAN_NOT_BE_UPDATED`. Email change goes through the separate
`/change-email` endpoint, gated on `user.changeEmail.enabled` +
`updateEmailWithoutVerification: true` AND the live `emailVerified`
column on the user row.

Plan 21-01 Task 1 includes a runtime DB probe to determine the
`emailVerified` state for both admin accounts:

- If both admins have `emailVerified=false` → email is **editable**,
  add `user.changeEmail: { enabled: true,
  updateEmailWithoutVerification: true }` to `src/lib/auth/index.ts`,
  wire `authClient.changeEmail({ newEmail })` into the identity Save
  path.
- If either admin has `emailVerified=true` → email is **read-only**
  (Better Auth would reject the change without SMTP). Render the
  email as static text + the `parametres.identity.email.readonly.notice`
  string ("Pour changer votre adresse e-mail, contactez un
  administrateur.").

The safe default per CONTEXT.md is read-only. The planner records
the resolution inline in `src/lib/auth/schemas.ts` so future
maintainers can find the rationale without re-running the probe.

### D-07 (Password section — Ancien + Nouveau, NO confirm, rev 2)

Rev 2 Figma shows TWO password fields in a 2-column row inside the
form card, after the horizontal divider:

1. **Ancien mot de passe** — required, prove identity before change.
   Mapped to Better Auth `changePassword.currentPassword`. Label
   text "Ancien mot de passe" verbatim from Figma (NOT "Mot de
   passe actuel" as in rev 1).
2. **Nouveau mot de passe** — the new password. Mapped to Better
   Auth `changePassword.newPassword`. Label text "Nouveau mot de
   passe" verbatim from Figma.

There is **NO** "Confirmer le nouveau mot de passe" field (rev 2
user decision: drop the confirm field to match Figma exactly). The
absence of a client-side confirm equality check is an accepted UX
risk — if the user mistypes the new password, they'll discover it
on the next sign-in attempt and use the existing admin-mediated
reset flow at `/[adminSegment]/partners` as recovery. Same risk
already exists in the login flow; not new.

- Each input uses the existing `Input Text` design-system component
  (matches Figma's identity inputs visually) with `type="password"`.
- **Show/hide toggle (Plr-2 from RESEARCH):** include `Eye`/`EyeOff`
  toggle on EACH of the two password inputs for parity with the
  existing `SetPasswordForm`. Figma does not explicitly show the
  toggle in the rendered state (`xxxxx-xxxxx-xxxxx` placeholder is
  the empty/typed visual), but the existing dictionary keys + helper
  are already in place — reuse them.
- **Strength meter (Plr-3 from RESEARCH):** reuse the existing 0–4
  strength meter from `SetPasswordForm` rendered beneath "Nouveau
  mot de passe" only. The Figma layout does not show a meter row
  but reserves enough vertical space below the inputs for it (the
  form card is 340px tall with 62px input rows leaving headroom).
- Helper text below "Nouveau mot de passe" if rendered without the
  strength meter: "Au moins 8 caractères." (matches Better Auth's
  `minPasswordLength: 8` from `src/lib/auth/index.ts`).

### D-08 (Session-invalidation on password change — placement updated)

Better Auth's `changePassword` supports `revokeOtherSessions: true`.
Phase 21 always sets it to `true`.

Rev 2 layout has **no separate "Mot de passe" section header**
inside the card — just the divider then the 2-column password row.
Notice placement (rev 2 — Plr-7 updated):

- Render the notice "Modifier votre mot de passe vous déconnectera
  de vos autres appareils." (FR) / "Changing your password will
  sign you out of your other devices." (EN) as **muted helper text
  in the row immediately below the password inputs**, spanning the
  full card width, styled with `color: var(--muted)` and ~13px
  font-size.
- Alternative placement (planner discretion): just above the
  divider as a "section transition" hint — but the below-inputs
  placement reads more naturally as "this is what happens when you
  submit."

Dict key: `parametres.password.session.notice`.

### D-09 (Locale + i18n parity, unchanged)

Figma is FR-only. All new strings ship in BOTH `fr` and `en` dicts.
Compile-time `_EnHasAllFrKeys` proof catches drift.

### D-10 (Figma deviation log — rev 2, slimmed)

PLAN.md MUST include a "Figma deviations" section listing every
visible difference between the rendered UI and Figma node `132:867`
(rev 2). Required entries (planner adds more if it deviates
elsewhere):

| # | Deviation | Source decision | Disposition |
|---|-----------|-----------------|-------------|
| 1 | Show/hide toggles (`Eye`/`EyeOff`) rendered on both password inputs. Figma's placeholder `xxxxx-xxxxx-xxxxx` does not visually show toggles. | Plr-2 | Permanent — parity with existing SetPasswordForm UX; reuses lucide-react icons already in the dependency tree. |
| 2 | 0–4 strength meter rendered beneath "Nouveau mot de passe" reusing `auth.password.strength.*` keys + `strengthScore()` helper. Figma reserves vertical space but does not render the meter explicitly. | Plr-3 | Permanent — reuses existing infrastructure; no new strings. |
| 3 | Static muted notice rendered below the password row spanning the card: "Modifier votre mot de passe vous déconnectera de vos autres appareils." | D-08 + Plr-7 | Permanent — surfaces the revokeOtherSessions:true behavior to the user. |
| 4 | FR hero subtitle preserved verbatim including the Figma typo "vos information"; EN hero subtitle corrected to "Update your information and reset your password.". | D-06 | Intentional — copy fidelity to design source-of-truth for FR; EN is a fresh translation. |
| 5 | Email field disposition contingent on Task 1 D-06d resolution. If "email editable" → normal input bound to `authClient.changeEmail`. If "email read-only" → static text + muted notice. | D-06d | Contingent on runtime DB probe. |
| 6 | NO new sidebar entry. RetractableSidebar.tsx is untouched. Access to /parametres is ONLY via the Topbar user-menu dropdown. | D-06 + Plr-5 | Non-deviation (mirrors Figma which shows the sidebar unchanged). Documented for explicitness. |
| 7 | Annuler resets both sections' forms to their loaded values without navigating. Figma doesn't specify. | Plr-6 | Permanent. |
| 8 | Email label is "Email professionnel" per Figma `134:503` (NOT "Adresse e-mail" as in rev 1). | D-06 (rev 2) | Non-deviation — adopted from rev 2 Figma. |

**Items REMOVED from the rev 1 deviation log:**

- ~~Avatar block replaced with initials placeholder~~ — rev 2 Figma
  has no avatar in the form, so no deviation. (Initials avatar in
  the Topbar UserMenu is unchanged and unrelated to Paramètres.)
- ~~Numéro de téléphone field omitted~~ — rev 2 Figma has no phone
  field.
- ~~Three password fields instead of one~~ — rev 2 Figma now shows
  two password fields (Ancien + Nouveau); Phase 21 ships two; no
  deviation. The `confirmNewPassword` field is dropped to match.

This deviation log becomes the artifact a future "Account v2" phase
reads to understand what Phase 21 deliberately left undone.

</plan_phase_addendum>

---

*Phase: 21-partner-onboarding-gates*
*Context gathered: 2026-05-29*
*Plan-phase addendum: 2026-05-29 (Figma `132:867` extraction + user decisions on scope D-06–D-10)*
*Plan-phase addendum rev 2: 2026-05-29 evening (Antoine reworked Figma `132:867`; matched scope; dropped confirm-pw field; updated section + footer layout + Email professionnel label)*
