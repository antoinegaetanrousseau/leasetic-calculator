---
phase: 14-admin-polish-partners-history-home
plan: 02
subsystem: partners-new-route
tags: [admin-route, rhf, zod, server-action, audit-log-pii, i18n, tdd]

# Dependency graph
requires:
  - phase: 11-design-system-foundation-brand-assets
    provides: .card / .ctitle / .fld / .req / .invalid / .btn-green / .error-msg utility CSS classes
  - phase: 09-admin-surface
    provides: adminCreateInvitation primitive (Phase 14 extends args), <InviteUrlModal> kind='invite'|'reset' (consumed verbatim), requireAdmin AUTH-15 defence-in-depth
  - phase: 12-schema-extensions-for-drafts-history
    provides: writeAuditLog payload `profile` sub-key precedent (none — this plan introduces it)
  - phase: 14-01
    provides: renamed app/(admin)/[adminSegment]/partners/ directory (this plan creates `/partners/new` underneath it)

provides:
  - "createPartnerFormSchema in src/lib/admin/schemas.ts (7 fields per UI-SPEC §5.1) — distinct from legacy createPartnerSchema per D-10"
  - "adminCreateInvitation extended with 6 optional PII fields (firstName/lastName/companyName/siret/phone/invitationMessage) flowing into audit_log payload.profile sub-key"
  - "createPartnerInvitationAction server action — re-validates client input, composes displayName, delegates to adminCreateInvitation, returns { ok, url, kind } discriminated union"
  - "app/(admin)/[adminSegment]/partners/new/page.tsx — server-component admin route with requireAdmin + dynamic='force-dynamic' + robots:noindex,nofollow metadata (D-05)"
  - "app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx — client RHF+zodResolver form, 3 ●-bulleted sections separated by <hr> dividers (D-06), action bar with cancel ghost-link + submit btn-green spinner, live char counter on textarea with --danger color above 1000 chars (D-07/D-08)"
  - "~28 new partners.new.* i18n keys × FR + EN per UI-SPEC §6.3"
  - "1 new error.field.siret.invalid key × FR + EN (UI-SPEC §6.4 listed as existing but missing from dicts — added as Rule 3 blocking-issue auto-fix)"

affects:
  - 14-03 (admin home AdminNavCard refactor — partners card href will point here once Plan 14-03 ships)
  - 14-06 (StatusChip rollout — swaps AccountsList CTA from <button onClick={openModal}> to <Link href={`/${adminSegment}/partners/new`}>, satisfying ROUTE-02 SC#2 behaviorally per D-11)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Schema dichotomy: NEW createPartnerFormSchema for the 7-field /partners/new form coexists with the legacy 3-field createPartnerSchema (kept intact for D-10 shelf-code CreatePartnerModal compatibility). Both export distinct value types."
    - "PII audit-log extension via additive `profile` sub-key — empty/undefined values dropped, non-empty preserved. ADMIN-09 D-09-09b redaction comment extended (not weakened): the new profile fields are PII, NOT commission/rate."
    - "Schema imported in client component from @/lib/admin/schemas (NOT @/lib/admin barrel) to avoid pulling 'use server' actions.ts → server-only chain into the client bundle. Eliminates a runtime 'cannot import server-only from a client component' error."
    - "useWatch (React Compiler-compatible) over watch() for the live char counter, mirroring the CreatePartnerModal analog (line 46). Caught by the project's react-hooks/incompatible-library lint rule."

key-files:
  created:
    - "app/(admin)/[adminSegment]/partners/new/page.tsx (70 lines — server component, requireAdmin + dynamic + metadata)"
    - "app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx (350 lines — client RHF+zod form, 3 sections, action bar, modal mount)"
    - "app/(admin)/[adminSegment]/partners/new/page.test.tsx (2 tests — auth gate)"
    - "app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.test.tsx (5 tests — onBlur validation, submit, error, char counter, cancel link)"
    - "src/lib/admin/schemas.test.ts (5 tests — createPartnerFormSchema field validation)"
    - "src/lib/admin/actions.test.ts (4 tests — extended args, legacy back-compat, empty-string drop, message persistence)"
    - ".planning/phases/14-admin-polish-partners-history-home/14-02-SUMMARY.md (this file)"
  modified:
    - "src/lib/admin/schemas.ts (+44 lines — createPartnerFormSchema + CreatePartnerFormValues)"
    - "src/lib/admin/actions.ts (+98 lines — extended AdminCreateInvitationArgs, buildProfilePayload helper, profile spread in 2 writeAuditLog calls, createPartnerInvitationAction wrapper + CreatePartnerInvitationResult type)"
    - "src/lib/admin/index.ts (+4 lines — re-export createPartnerFormSchema, CreatePartnerFormValues, createPartnerInvitationAction, CreatePartnerInvitationResult)"
    - "src/lib/i18n/dictionaries.ts (+72 lines — 28 partners.new.* keys × FR/EN + 1 error.field.siret.invalid × FR/EN)"

key-decisions:
  - "Schema split — chose NEW createPartnerFormSchema (separate name) over EXTENDING createPartnerSchema. Rationale: legacy CreatePartnerModal.tsx (D-10 shelf code) imports createPartnerSchema with the 3-field shape; extending it would require either widening the modal's defaults+register lines (creating churn in shelf code) or making the new fields optional in the legacy schema (drift between the modal's intended shape and the form's intended shape). A second schema costs +44 LOC vs. that drift risk."
  - "Audit-log `profile` sub-key shape: payload = { userId, email, displayName, language, profile?: { firstName?, lastName?, companyName?, siret?, phone?, invitationMessage? } } where empty-string fields are DROPPED and `profile` key is OMITTED entirely when all extended fields are empty (legacy 3-field call). Decision: empty = 'not provided'. The omission path keeps audit-log queries scanning legacy entries unaffected by the new key."
  - "InviteUrlModal kind = 'invite' (NOT 'invitation' as the plan text said). RedeemKind contract is 'invite' | 'reset' (Phase 6 primitive at src/lib/auth/redeem.ts:9). The plan's `<interfaces>` block reflects what the plan author intended but is inaccurate vs. the shipped Phase 9 contract. Form + action both return `kind: 'invite'` to match the verbatim Phase 9 contract."
  - "PhoneInput NOT used for the phone field, despite UI-SPEC §5.1.3 recommending it. PhoneInput formats to a 10-digit FR layout (`XX XX XX XX XX`) with `maxLength=14`. The new form schema accepts 6-20 chars with international punctuation `[0-9 +()-]` to support partners outside FR. Switching to PhoneInput would over-constrain the international case. Documented in CreatePartnerForm.tsx line ~225 as an inline comment."
  - "Schema imported from @/lib/admin/schemas (NOT @/lib/admin) in the client component to prevent the actions.ts 'use server' chain from pulling 'server-only' into the client bundle. Caught at test-time by the server-only barrier — fixed by routing through the schemas.ts sub-module which has no server-only imports."

patterns-established:
  - "PII audit-log envelope: when an admin action accepts PII beyond identity (name + email), persist additional fields under a `profile` sub-key inside the existing audit_log payload, not as a separate audit_log row. Empty-string drop discipline keeps the payload minimal. ADMIN-09 redaction comment must be extended (not weakened) to clarify the new fields are PII not rate values."

requirements-completed:
  - ROUTE-02

# Metrics
duration: ~28min
completed: 2026-05-20
---

# Phase 14 Plan 02: /partners/new Route + Form Summary

## One-Liner

Shipped /<seg>/partners/new server-component admin route with a 3-section RHF+zod client form (Personal info / Company info / Invitation message) that submits via a new server action wired to Phase 9's existing adminCreateInvitation primitive (extended with 6 optional PII fields persisted under an audit_log `profile` sub-key) and opens the existing InviteUrlModal with the returned one-time invite URL.

## Schema Split (D-10 Preserves Legacy Modal)

**Chose:** NEW `createPartnerFormSchema` alongside untouched legacy `createPartnerSchema`.

```ts
// src/lib/admin/schemas.ts (untouched legacy — used by CreatePartnerModal.tsx shelf code)
export const createPartnerSchema = z.object({
  email: z.string().email(...),
  displayName: z.string().min(1, ...),
  language: z.enum(['fr', 'en']).default('fr'),
});

// src/lib/admin/schemas.ts (new — used by /partners/new CreatePartnerForm.tsx)
export const createPartnerFormSchema = z.object({
  firstName:         z.string().min(1, 'error.field.required').max(100),
  lastName:          z.string().min(1, 'error.field.required').max(100),
  email:             z.string().min(1, 'error.field.required').email('error.field.email.invalid'),
  companyName:       z.string().min(1, 'error.field.required').max(200),
  siret:             z.string().regex(/^\d{14}$/, 'error.field.siret.invalid').optional().or(z.literal('')),
  phone:             z.string().min(1, 'error.field.required').regex(/^[\d\s+()-]{6,20}$/, 'error.field.phone.invalid'),
  invitationMessage: z.string().max(1000, 'partners.new.message.tooLong').optional(),
});
```

**Rationale:** D-10 keeps `CreatePartnerModal.tsx` as shelf code with its 3-field `language`/`email`/`displayName` shape. Extending the existing schema in-place would either require modifying the shelved modal's defaults + register lines OR weakening the schema's invariants (making fields optional). A second schema with a distinct name costs +44 LOC but eliminates the drift risk.

## Audit-Log `profile` Sub-Key Shape

The Phase 14 extension adds an OPTIONAL `profile` sub-key to BOTH writes inside `adminCreateInvitation` (`user.create` + `invitation.create`):

```ts
// Extended-args call (from /partners/new):
payload: {
  userId: 'user-1',
  email: 'marie@example.com',
  displayName: 'Marie Dupont',
  language: 'fr',
  profile: {
    firstName: 'Marie',
    lastName: 'Dupont',
    companyName: 'Acme SAS',
    siret: '12345678901234',
    phone: '01 23 45 67 89',
    invitationMessage: 'Bonjour Marie, …',
  },
}

// Legacy 3-field call (from CreatePartnerModal — D-10):
payload: {
  userId: 'user-1',
  email: 'legacy@example.com',
  displayName: 'Legacy User',
  language: 'en',
  // NO profile key — omitted entirely when all extended fields are empty/undefined.
}

// Mixed call with some empty extended fields (siret='', message=''):
payload: {
  userId: 'user-2',
  …,
  profile: {
    firstName: 'Pierre',
    lastName: 'Martin',
    companyName: 'Acme SAS',
    phone: '01 02 03 04 05',
    // siret + invitationMessage dropped (empty = 'not provided').
  },
}
```

The `buildProfilePayload()` helper iterates the 6 extended fields, dropping any whose value is `undefined` or `''`. The `profile` key itself is OMITTED from the payload when the resulting object is empty — preserving the exact legacy payload shape for audit-log queries that pre-date Phase 14.

**ADMIN-09 D-09-09b preservation:** the redaction comment is EXTENDED (not weakened): "Phase 14: the `profile` sub-key contains PII (name/company/phone/SIRET/message), NOT commission/rate values; the redaction note still holds." The new fields are PII not financial; the ADMIN-09 invariant is intact.

## InviteUrlModal `kind` Deviation from Plan Text

**Plan says:** `kind: 'invitation'`.

**Reality (Phase 9 primitive at src/lib/auth/redeem.ts:9):** `RedeemKind = 'invite' | 'reset'`.

Implementation uses `kind: 'invite'` to match the existing InviteUrlModal contract. The plan's `<interfaces>` block reflects the plan author's intended semantics but is inaccurate vs. the shipped Phase 9 type. Logged as a minor plan-vs-shipped-contract deviation (Rule 3 blocking issue — using `'invitation'` would have failed TypeScript compilation against the InviteUrlModal prop type).

## i18n Keys Added (29 total — 28 partners.new.* + 1 error.field.siret.invalid)

| Key | FR | EN |
|---|---|---|
| `partners.new.title` | Créer un partenaire | Create a partner |
| `partners.new.subtitle` | Renseignez les informations du partenaire pour générer un lien d'invitation unique | Enter the partner's information to generate a one-time invitation link |
| `partners.new.section.personal` | INFORMATIONS PERSONNELLES | PERSONAL INFORMATION |
| `partners.new.section.company` | INFORMATIONS SOCIÉTÉ | COMPANY INFORMATION |
| `partners.new.section.message` | MESSAGE D'INVITATION | INVITATION MESSAGE |
| `partners.new.field.firstName` | Prénom | First name |
| `partners.new.field.lastName` | Nom | Last name |
| `partners.new.field.email` | Email | Email |
| `partners.new.field.companyName` | Société | Company |
| `partners.new.field.siret` | SIRET (optionnel) | SIRET (optional) |
| `partners.new.field.phone` | Téléphone | Phone |
| `partners.new.field.message` | Message d'invitation | Invitation message |
| `partners.new.field.firstName.placeholder` | ex: Marie | e.g. Marie |
| `partners.new.field.lastName.placeholder` | ex: Dupont | e.g. Dupont |
| `partners.new.field.email.placeholder` | marie.dupont@exemple.fr | marie.dupont@example.com |
| `partners.new.field.companyName.placeholder` | ex: Acme SAS | e.g. Acme Inc. |
| `partners.new.field.siret.placeholder` | 14 chiffres | 14 digits |
| `partners.new.field.message.placeholder` | Bonjour Marie, … | Hi Marie, … |
| `partners.new.message.counter` | {0}/1000 | {0}/1000 |
| `partners.new.message.tooLong` | Le message ne peut pas dépasser 1000 caractères | Message cannot exceed 1000 characters |
| `partners.new.cancel` | ← Annuler | ← Cancel |
| `partners.new.cancel.aria` | Annuler et retourner à la liste des partenaires | Cancel and return to the partner list |
| `partners.new.submit` | Créer le partenaire | Create partner |
| `partners.new.submit.spinner` | Création en cours… | Creating… |
| `partners.new.toast.success` | Partenaire créé ✓ | Partner created ✓ |
| `partners.new.toast.error` | Erreur lors de la création. Réessayez. | Creation failed. Try again. |
| `partners.new.toast.error.duplicate` | Un partenaire avec cet email existe déjà. | A partner with this email already exists. |
| `partners.new.toast.validation.errors` | Veuillez corriger les erreurs dans le formulaire. | Please correct the errors in the form. |
| `error.field.siret.invalid` | SIRET invalide (14 chiffres requis). | Invalid SIRET (14 digits required). |

The compile-time `_EnHasAllFrKeys` parity proof continues to typecheck.

## Test Count Delta

| Surface | Baseline (post-14-01) | After 14-02 | Delta |
|---|---|---|---|
| Total vitest test files | 49 | 53 | +4 |
| Total vitest tests | 789 | 805 | +16 |

The 4 new test files (16 tests):
- `src/lib/admin/schemas.test.ts` — 5 tests
- `src/lib/admin/actions.test.ts` — 4 tests
- `app/(admin)/[adminSegment]/partners/new/page.test.tsx` — 2 tests
- `app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.test.tsx` — 5 tests

Confirmed by `npm test -- --run`:
```
Test Files  52 passed | 1 skipped (53)
     Tests  805 passed | 4 skipped (809)
```

## TDD Gate Compliance

Per the plan's TDD discipline (both tasks use `tdd="true"`):

**Task 1:**
1. **RED commit** `f8987ec test(14-02): add failing tests for createPartnerFormSchema + adminCreateInvitation extended args` — 9 failing assertions (5 schema + 4 action). Failed with `TypeError: Cannot read properties of undefined (reading 'safeParse')` (schema not exported) + action assertions (profile sub-key not implemented).
2. **GREEN commit** `0cbf862 feat(14-02): extend createPartnerSchema + adminCreateInvitation for /partners/new` — schema + action extensions land. All 9 tests pass.

**Task 2:**
1. **RED commit** `5bab79d test(14-02): add failing tests for /partners/new page + CreatePartnerForm` — 7 failing assertions (2 page + 5 form). Failed with `Failed to resolve import "./page"` (source files don't exist yet).
2. **GREEN commit (route + form)** `64a9de1 feat(14-02): ship /partners/new route + form + server action` — page.tsx + CreatePartnerForm.tsx + createPartnerInvitationAction land. All 7 tests pass.
3. **GREEN commit (i18n)** `55550d1 feat(14-02): add partners.new.* i18n keys + error.field.siret.invalid` — 28 partners.new.* keys × FR/EN + 1 SIRET error key × FR/EN. Build + parity proof typecheck pass.

REFACTOR — not separately committed. The `watch()` → `useWatch()` switch happened inline during Task 2 GREEN before the commit landed, in response to the `react-hooks/incompatible-library` lint warning. Documented in this Summary rather than logged as a separate refactor commit (the lint feedback caught it before the commit, so the discipline is "land it right the first time").

## Verification Run

```bash
$ npm run typecheck
> tsc --noEmit
(clean — no errors)

$ npm run lint
✖ 3 problems (0 errors, 3 warnings)  # 3 pre-existing warnings, unchanged from baseline

$ npm run build
✓ Compiled successfully
  Route (app):
    ├ ƒ /[adminSegment]/partners
    ├ ƒ /[adminSegment]/partners/new    ← NEW route registered (server-rendered on demand)
    └ ƒ … (other routes unchanged)

$ npm test -- --run
Test Files  52 passed | 1 skipped (53)
     Tests  805 passed | 4 skipped (809)

# Automated grep contracts (from PLAN.md <verify><automated>):
$ grep -q 'createPartnerFormSchema' src/lib/admin/schemas.ts                              # OK
$ grep -q 'invitationMessage' src/lib/admin/actions.ts                                    # OK
$ grep -q 'requireAdmin' 'app/(admin)/[adminSegment]/partners/new/page.tsx'              # OK
$ grep -q 'dynamic.*force-dynamic' 'app/(admin)/[adminSegment]/partners/new/page.tsx'    # OK
$ grep -q 'createPartnerFormSchema' 'app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx'  # OK
$ grep -q 'partners.new.title' src/lib/i18n/dictionaries.ts                              # OK
```

## ADMIN-09 Invariant Check (D-29 strict envelope)

```bash
$ grep -i "commission" "app/(admin)/[adminSegment]/partners/new" -r
app/(admin)/[adminSegment]/partners/new/page.tsx:    * ADMIN-09 D-29 strict envelope: this page renders ZERO commission strings
app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx: * ADMIN-09 (D-29 strict): no commission/rate fields rendered.
```

Both matches are comments explicitly affirming the invariant. Zero commission string references in functional code. The form fields are exclusively PII (firstName, lastName, email, companyName, siret, phone, invitationMessage) — none are financial-rate values. Plan 14-06's grep gate on the rendered HTML will confirm structurally; this is the source-level affirmation.

## Threat Flags

No new security-relevant surface beyond what the plan's `<threat_model>` already documents (T-14-02-01 .. T-14-02-10). All `mitigate` dispositions are covered:

- **T-14-02-01** (`requireAdmin` on page.tsx) — verified by `page.test.tsx Test 2`.
- **T-14-02-02** (`adminCreateInvitation` internally calls `requireAdmin`) — preserved verbatim.
- **T-14-02-03** (server-side `createPartnerFormSchema.parse`) — implemented in `createPartnerInvitationAction`.
- **T-14-02-04** + **T-14-02-05** (ADMIN-09 PII vs commission in audit + HTML) — `profile` sub-key holds PII only; D-09-09b comment preserved + extended.
- **T-14-02-06** (audit writes preserved) — both `user.create` + `invitation.create` writes still fire with the `profile` spread.
- **T-14-02-07** (1000-char DoS cap) — enforced server-side via `createPartnerFormSchema` parse; client char counter is UX guidance only.
- **T-14-02-08** (CSRF on server action) — Next.js + Better Auth defaults; no new endpoint.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking issue] Missing `error.field.siret.invalid` i18n key**
- **Found during:** Task 2 GREEN (after wiring the schema's `'error.field.siret.invalid'` message key).
- **Issue:** UI-SPEC §6.4 listed the key as "REUSE existing v1.1 keys" but grep showed it absent from both FR and EN dicts. The schema's invalid-SIRET message would resolve to `undefined` via `t()`.
- **Fix:** Added `error.field.siret.invalid` FR ("SIRET invalide (14 chiffres requis).") + EN ("Invalid SIRET (14 digits required).") in dictionaries.ts.
- **Commit:** `55550d1` (combined with the partners.new.* batch).

**2. [Rule 1 — Bug] `watch()` flagged by `react-hooks/incompatible-library`**
- **Found during:** Task 2 lint check after initial form draft.
- **Issue:** `react-hook-form`'s `watch('invitationMessage')` returns a fresh function — incompatible with React Compiler's memoization. The project's lint rule blocks it.
- **Fix:** Switched to `useWatch({ control, name: 'invitationMessage' })` — the React-Compiler-safe alternative used by the CreatePartnerModal analog (line 46).
- **Commit:** Folded into `64a9de1` (the GREEN commit landed lint-clean).

**3. [Rule 3 — Blocking issue] `'use server'` chain pulled into client bundle**
- **Found during:** Initial form-test run, after Task 2 RED → GREEN.
- **Issue:** The form imported `createPartnerFormSchema` from `@/lib/admin` (barrel), which transitively imports `actions.ts` (which has `'use server'`) → `@/lib/auth/require` → `import 'server-only'`. Test environment rejected the client-component-side import with `This module cannot be imported from a Client Component module`.
- **Fix:** Switched the form's import to `@/lib/admin/schemas` (sub-module — no server-only chain). Documented inline as a comment.
- **Commit:** Folded into `64a9de1` (the GREEN commit landed test-clean).

### Plan-vs-Shipped Contract Deviation

**4. [Plan text inaccuracy — not a bug] `InviteUrlModal` `kind` value**
- **Plan said:** `kind: 'invitation'` (in the `<must_haves>` truth list + the `<interfaces>` block).
- **Shipped contract:** `RedeemKind = 'invite' | 'reset'` (Phase 6 primitive at `src/lib/auth/redeem.ts:9`).
- **Implementation:** Both the server action's return shape AND the form's `setInviteUrl({ kind: 'invite' })` call use `'invite'`. Using `'invitation'` would have failed TypeScript compilation against the InviteUrlModal prop type.
- **No code commit needed** — this is a plan-vs-shipped-API drift, not an implementation bug. The plan's `<must_haves>` truth ("returns { ok: true, url, kind: 'invitation' }") is honored in spirit (a successful invite issuance produces an opened modal with the URL); the literal `kind` value differs.

### Scope-bounded UI-SPEC §5.1.3 Deviation

**5. [UI-SPEC recommendation — not honored] `PhoneInput` not reused**
- **UI-SPEC §5.1.3 recommends:** reuse `<PhoneInput>` from `src/components/proposal/PhoneInput.tsx` for the phone field.
- **Implementation:** plain `<input type="tel" inputMode="tel">` instead.
- **Reason:** `PhoneInput` formats input to the FR 10-digit layout (`XX XX XX XX XX`) with `maxLength=14`. The Phase 14 form schema accepts 6-20 chars with international punctuation `[0-9 +()-]` to support partners outside FR. PhoneInput would have over-constrained the input.
- **Documented:** inline comment in `CreatePartnerForm.tsx` next to the phone field explains the choice.
- **Deferred:** if v1.3+ adds a separate "FR-only" partner-creation flow, PhoneInput could land there cleanly.

## Known Stubs

None. All form fields are wired to the createPartnerFormSchema + the createPartnerInvitationAction server action; success path mounts the InviteUrlModal with the real one-time URL returned by Phase 6's `createInvitation`. No empty arrays, mock data, or "coming soon" placeholders ship in this plan.

The `invitationMessage` field is persisted to the audit log only (D-23 to v1.3+) — but this is a documented future feature, not a stub. The plan explicitly captures this in the UI-SPEC §Deferred Ideas line: "the email-template-injection of the message is explicitly deferred to v1.3+". The current code path WRITES the message to the audit log; v1.3+ READS it during email template generation.

## Self-Check: PASSED

- File `.planning/phases/14-admin-polish-partners-history-home/14-02-SUMMARY.md`: FOUND
- File `app/(admin)/[adminSegment]/partners/new/page.tsx`: FOUND
- File `app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx`: FOUND
- File `app/(admin)/[adminSegment]/partners/new/page.test.tsx`: FOUND
- File `app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.test.tsx`: FOUND
- File `src/lib/admin/schemas.test.ts`: FOUND
- File `src/lib/admin/actions.test.ts`: FOUND
- Commit `f8987ec` (Task 1 RED schema + action tests): FOUND
- Commit `0cbf862` (Task 1 GREEN schema + action implementation): FOUND
- Commit `5bab79d` (Task 2 RED page + form tests): FOUND
- Commit `64a9de1` (Task 2 GREEN route + form + action): FOUND
- Commit `55550d1` (i18n keys): FOUND
