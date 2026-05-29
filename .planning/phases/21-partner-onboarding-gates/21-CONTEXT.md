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
## Plan-phase addendum (2026-05-29, Figma extraction)

Established during `/gsd-plan-phase 21` after extracting Figma node
`132:867` ("Paramètres — v1.3 sketch") via the Dev Mode MCP. These
decisions are LOCKED, downstream of CONTEXT.md's <decisions> block,
and binding on the planner.

### D-06 (Page surface — Paramètres route)

GATE-01 ships as a new **Paramètres page** matching Figma `132:867`,
not a standalone password form. The page contains a single "Account"
card divided into two sections:

1. **Informations** (top section) — editable: Prénom, Nom, Adresse
   e-mail. Avatar upload and Numéro de téléphone shown in Figma but
   **explicitly out of scope** for Phase 21 (D-06b below).
2. **Mot de passe** (bottom section, under separator line) — editable
   password fields (D-07 below).

Single action footer with "Annuler" + "Enregistrer les modifications"
buttons. The Save button submits both sections; if only one section
was modified, only that operation runs (D-06c).

- **Route placement:** `/parametres` (FR-first naming, consistent with
  existing `/coefficients`, `/partners`, `/proposals`, `/history`).
  The planner confirms exact route group during research (likely
  `app/(authed)/parametres/page.tsx` or the project's analog — verify
  by reading the existing authed-route map).
- **Sidebar nav:** NO new sidebar item. Access is via the user-menu
  dropdown in the Topbar ("Antoine Rousseau ▾" → "Paramètres").
  Figma shows the sidebar nav unchanged (Accueil / Nouvelle
  proposition / Propositions / Aide). The user-menu dropdown does
  not yet exist as an interactive component in the codebase — the
  planner must add a small "Paramètres" entry there. If the topbar
  user-menu component doesn't yet exist as a dropdown menu (the
  current topbar may just display the name without a menu), the
  planner adds it minimally to host the Paramètres link + the
  existing "Se déconnecter" action.
- **Hero copy:** Title = "Paramètres". Subtitle = "Changer vos
  information et réinitialiser votre mot de passe." Figma's subtitle
  has a typo ("vos information" → should be "vos informations").
  **Preserve Figma's copy verbatim in the FR dict** — copy fidelity
  to the design source-of-truth matters more than the typo. EN dict
  uses the corrected English equivalent: "Update your information
  and reset your password."

### D-06b (Avatar + phone — explicitly deferred)

Figma shows an avatar upload (with "Télécharger nouveau" button +
"Taille de la photo de profil : 400px x 400px" hint) and a Numéro
de téléphone field. Both are **OUT OF SCOPE for Phase 21**:

- **Avatar upload** requires image-storage infrastructure (Vercel
  Blob or equivalent) that doesn't yet exist in the project. Adding
  it is a separate infra phase. Phase 21 renders a static
  default-avatar placeholder (or initials, matching the existing
  Topbar user menu pattern — "AR" for Antoine Rousseau) where Figma
  shows the avatar image. No upload UI rendered.
- **Numéro de téléphone** isn't a field on the existing User model.
  Adding it requires a schema migration + Drizzle/Prisma type
  regeneration + Better Auth user-schema extension. Out of scope
  for v1.3. The phone field is **omitted from the rendered form** —
  Phase 21's identity row contains only Prénom + Nom + Adresse e-mail.

The planner documents these deferrals in PLAN.md and leaves a tracking
note for a future "Account v2" phase (avatar + phone + any further
profile fields).

### D-06c (Single Save button — partial-success behavior)

The Figma "Enregistrer les modifications" button submits both
sections. Backend translates to two distinct Better Auth calls:

- `authClient.updateUser({ name: ..., email: ... })` for identity
  (only if Prénom/Nom/Email changed vs. the loaded session).
- `authClient.changePassword({ currentPassword, newPassword,
  revokeOtherSessions: true })` for password (only if password
  fields are non-empty AND match each other).

**Edge case — partial success:** If identity update succeeds but
password change fails (wrong current password, weak new password,
etc.), the UI surfaces the password error inline on the password
section AND a success toast for the identity update. The user is
not left wondering which half landed. Conversely if the password
succeeds but updateUser fails (e.g., email collision — see D-06d
on email-change verification), surface the identity error inline
in the identity section + a success toast for the password.

**Edge case — neither section dirty:** Save button is disabled
(or no-op) when both sections are unchanged. Use react-hook-form's
`formState.isDirty` per section, gated on the combined dirty state.

### D-06d (Email change — verify-without-SMTP behavior)

Better Auth's `updateUser` may trigger an email-change verification
flow when SMTP is configured. CONTEXT.md pins "no SMTP" (deferred
since v1.1). The planner MUST research and confirm during the
research step:

- Does Better Auth `updateUser` allow `email` updates **without**
  verification when `sendChangeEmailVerification` is not wired? If
  YES, identity edits proceed normally; the planner specifies that
  configuration.
- If Better Auth REQUIRES a verification flow for email changes
  regardless of SMTP config, the planner **demotes email to
  read-only** in this phase (rendered as static text, not an input)
  and documents the demotion in PLAN.md. Email change then becomes
  a v1.4 follow-up once SMTP lands.

Discretion: the planner picks whichever path matches Better Auth's
1.6.9 behavior. The user's preference is "edit email if possible,
demote to read-only if Better Auth requires verification we can't
satisfy."

### D-07 (Password section — current-password challenge + confirm)

Figma `132:867` shows ONLY a single "Nouveau mot de passe" input.
This is intentionally extended for security:

- Render THREE password inputs stacked vertically in the password
  section (in this order):
  1. **Mot de passe actuel** — required, prove identity before
     change. Mapped to Better Auth `changePassword.currentPassword`.
  2. **Nouveau mot de passe** — the new password (Figma's only
     visible field). Mapped to Better Auth
     `changePassword.newPassword`.
  3. **Confirmer le nouveau mot de passe** — client-side equality
     check vs. Nouveau mot de passe. Not sent to the server.
- Each input uses the existing `Input Text` design-system component
  (matches Figma's identity inputs visually) with `type="password"`.
  Show/hide toggle is **not required by Figma**; planner discretion
  (the secure default is no toggle; the convenience default is a
  toggle). Pick whichever is simpler given the existing input
  component.
- Helper text below "Nouveau mot de passe": minimum 8 characters
  (matches Better Auth's default minimum — confirm exact value in
  research). FR + EN strings in dict.
- **Document the deviation from Figma in PLAN.md** with a short
  note: "Figma omits current-password + confirm fields; added for
  security per Better Auth changePassword contract." This is the
  binding deviation log for downstream Figma diffs.

### D-08 (Session-invalidation on password change)

Better Auth's `changePassword` supports `revokeOtherSessions: true`.
Phase 21 always sets it to `true` (revoke OTHER sessions of the same
user, keep the current session active so the user isn't kicked from
the page they just changed the password on). No copy is shown in
Figma announcing this; surface it via a small note under "Mot de
passe actuel": "Modifier votre mot de passe vous déconnectera de vos
autres appareils." (FR) / "Changing your password will sign you out
of your other devices." (EN). Place the note inside the password
section header area, not as a toast.

### D-09 (Locale + i18n parity)

Figma is FR-only (no EN variant present in the sketch). All new
strings ship in BOTH `fr` and `en` dicts at compile time (the
established parity-proof pattern catches drift). EN strings are the
planner's translation of the FR copy.

### D-10 (Figma deviation log — binding)

PLAN.md MUST include a "Figma deviations" section listing every
visible difference between the rendered UI and Figma node
`132:867`. Required entries (planner adds more if it deviates
elsewhere):

- Avatar block replaced with initials placeholder (D-06b).
- Numéro de téléphone field omitted (D-06b).
- Three password fields instead of one (D-07).
- "Modifier votre mot de passe vous déconnectera..." notice added
  to password section (D-08).
- Hero subtitle copy preserved verbatim including the "vos
  information" typo for FR; corrected in EN (D-06).
- Email field may be demoted to read-only pending Better Auth
  verification-flow finding (D-06d).

This becomes the artifact a future "Account v2" phase reads to
understand what Phase 21 deliberately left undone.

</plan_phase_addendum>

---

*Phase: 21-partner-onboarding-gates*
*Context gathered: 2026-05-29*
*Plan-phase addendum: 2026-05-29 (Figma `132:867` extraction + user decisions on scope D-06–D-10)*
