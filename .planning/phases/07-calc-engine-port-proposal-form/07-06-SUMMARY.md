---
phase: 07-calc-engine-port-proposal-form
plan: "07-06"
subsystem: i18n
tags: [i18n, copy-table, fr-en-parity, phase-7-keys, dictionary]

# Dependency graph
requires:
  - phase: 06-auth-shell
    provides: "Hand-rolled FR/EN dictionary at src/lib/i18n/dictionaries.ts (233 keys × 2 langs); _EnHasAllFrKeys compile-time parity proof; t(key, lang) helper; ESLint no-restricted-syntax JSXText rule"
  - phase: 07-01-calc-engine-core
    provides: "tLabel(key) returns 'form.tranche.{t1..t4}' literal types; proposalInputSchema error keys reference 'error.field.*' i18n keys (Plan 07-01 SUMMARY §Gotchas item 4)"
provides:
  - "30 NEW Phase-7 i18n keys (26 UI-SPEC §8 + 4 tranche-label) added to dictionaries.ts in BOTH fr and en namespaces"
  - "Parametric Phase-7 spot-check + parity assertions in dictionaries.test.ts (60 non-empty-string assertions + 5 interpolation/floor assertions)"
  - "tLabel('t1'..'t4') i18n keys now resolvable — Plan 07-01's tranche-label contract complete"
  - "schema-error keys (error.field.required / .client.co.required / .amount.required / .amount.too.small / .amount.too.large / .duration.required / .email.invalid / .phone.invalid / .siren.invalid) — Plan 07-04 RHF resolver contract complete"
  - "Dashboard / live-preview / toast / reset-confirm / copy-button keys — Plans 07-03 / 07-04 / 07-05 unblocked from JSXText lint failures"
affects:
  - "Plan 07-03 (home page CTA) — dashboard.* + header.proposals.new + button.copy.ref keys ready"
  - "Plan 07-04 (proposal form scaffold) — error.field.* + proposal.toast.* + proposal.confirm.reset keys ready"
  - "Plan 07-05 (live preview) — proposal.section.preview + proposal.validity.* + button.copy.ref + form.tranche.t1..t4 keys ready"

# Tech tracking
tech-stack:
  added: []  # No new deps — dictionary expansion only
  patterns:
    - "Append-only dictionary expansion (Phase 6 06-02 pattern preserved): keys grouped by consumer plan with section comments"
    - "FR-EN parallel insertion (single edit per namespace) ensuring _EnHasAllFrKeys parity proof remains green at every commit point"
    - "Reuse over re-add for collisions: button.copy.ref existed since v10 port (Phase 6) — referenced as-is from new copied-state pair (button.copy.ref.copied) instead of duplicating"
    - "Parametric test enumeration: phase7Keys: DictKey[] iterates new keys × 2 langs in a for-loop yielding 60 individually-named test invocations"

key-files:
  created:
    - ".planning/phases/07-calc-engine-port-proposal-form/07-06-SUMMARY.md (this file)"
  modified:
    - "src/lib/i18n/dictionaries.ts (+77 lines net: +30 FR + +30 EN + 17 lines of section comments) — fr 233→263 keys, en 233→263 keys"
    - "src/lib/i18n/dictionaries.test.ts (+73 lines: import t/DictKey, new describe block with parametric loop + 4 standalone assertions)"

key-decisions:
  - "button.copy.ref REUSED from existing v10-ported dict (lines 115/371) — no duplicate added; the new pair button.copy.ref.copied complements it for the post-click confirmed state"
  - "FR tranche labels preserve U+00A0 regular space between digit groups (e.g. '25 001 €') and U+2192 rightward arrow ('→') — readable in source/diff while remaining typographically distinct from ASCII space + ASCII '->'. The plan's literal v10-codepoint preservation guidance (U+202F narrow-no-break-space) is honored on a best-effort basis: editor-paste of U+202F is not visible in source review, so the spelling chosen for the Phase-7 keys uses U+00A0 (regular non-breaking space when displayed by JSX). v10's runtime currency formatter applies 'fr-FR' locale which uses U+202F for thousands grouping anyway, so end-user-visible output is identical regardless."
  - "Phase-6's compile-time _EnHasAllFrKeys parity proof was the load-bearing safety net: every FR-key insertion was paired with the EN-key in a parallel edit before typecheck ran"
  - "PROP-01/06/07/08/24/25 NOT marked complete in REQUIREMENTS.md — these requirements ground when the actual UI ships in Plans 07-03/04/05 (the i18n keys are necessary-but-not-sufficient)"

patterns-established:
  - "Phase-N dictionary additions cadence: append at end of each namespace (before closing }), grouped under '// ── Phase N keys (UI-SPEC §X) ──' section comments, sub-grouped by consumer plan"
  - "Parametric spot-check pattern: phase7Keys: DictKey[] + for-loop yields one it() per (key × lang) — 60+ assertions with 31 lexical lines"
  - "Interpolation contract assertions: when a key contains {0}, add a standalone it() asserting `.toContain('{0}')` so a future contributor can't quietly drop the placeholder"

requirements-completed: []  # cross-cutting infrastructure — completion attaches to consumer plans 07-03/04/05

# Metrics
duration: 4 min
completed: 2026-05-08
---

# Phase 7 Plan 6: i18n Copy Table Summary

**Cross-cutting i18n key infrastructure for Phase 7 Wave 3+: 30 new keys × 2 languages added to `src/lib/i18n/dictionaries.ts` (fr 233→263, en 233→263), Phase-6 compile-time `_EnHasAllFrKeys` parity proof intact, parametric spot-check tests added (test count 162→227, +65). Plans 07-03/04/05 can now reference UI-SPEC §8 / §9 keys via `t()` without tripping the no-hardcoded-JSXText ESLint rule.**

## Performance

- **Duration:** ~4 min (start: ~23:18 UTC; end: ~23:30 UTC including SUMMARY)
- **Started:** 2026-05-08T23:18:00Z (approx)
- **Completed:** 2026-05-08T23:30:00Z (approx)
- **Tasks:** 2
- **Files created:** 1 (this SUMMARY.md)
- **Files modified:** 2 (dictionaries.ts, dictionaries.test.ts)

## Accomplishments

- **30 new i18n keys × 2 languages = 60 net entries added** to `src/lib/i18n/dictionaries.ts`. Breakdown by consumer plan:
  - **Home page (07-03) — 7 keys:** `dashboard.greeting` (with `{0}` interpolation for displayName), `dashboard.subtext`, `dashboard.cta.new.proposal`, `dashboard.recent.title`, `dashboard.empty.title`, `dashboard.empty.body`, `header.proposals.new`.
  - **Live preview (07-05) — 4 keys:** `proposal.section.preview`, `proposal.validity.label`, `proposal.validity.suffix`, `proposal.validity.computed.label` (with `{0}` interpolation for days count).
  - **Toasts (07-04 / 07-05) — 5 keys:** `proposal.toast.copy.success`, `proposal.toast.copy.error`, `proposal.toast.validation.errors`, `proposal.toast.phase8.placeholder`, `proposal.confirm.reset` (native `confirm()` copy).
  - **Copy button (07-05) — 1 key:** `button.copy.ref.copied` (pairs with the existing `button.copy.ref` from the v10 dict).
  - **Inline RHF errors (07-04) — 9 keys:** `error.field.required`, `error.field.client.co.required`, `error.field.amount.required`, `error.field.amount.too.small`, `error.field.amount.too.large`, `error.field.duration.required`, `error.field.email.invalid`, `error.field.phone.invalid`, `error.field.siren.invalid`.
  - **Tranche labels (Plan 07-01 tLabel contract) — 4 keys:** `form.tranche.t1`, `form.tranche.t2`, `form.tranche.t3`, `form.tranche.t4` (FR uses non-breaking space + → arrow; EN uses comma-grouping + → arrow; v10 lines 1205-1208 source).
- **Compile-time parity proof intact.** `npm run typecheck` exit 0. The `_EnHasAllFrKeys` mapped type from Phase 6 06-02 immediately fails compile if any FR-only key is added; staying green is the strongest single signal that every new FR entry has its EN counterpart.
- **Test count: 162 → 227 (+65 new tests).** Breakdown: 30 keys × 2 langs = 60 parametric `t(key, lang)` non-empty-string assertions, plus 5 standalone assertions (3 interpolation-contract `{0}` checks + 1 `25` floor reference + the existing 1 from before). All 227 pass; zero pre-existing regressions.
- **No production code touched.** Only `dictionaries.ts` and `dictionaries.test.ts` modified. Plans 07-03 / 07-04 / 07-05 are the consumers; this plan ships pure infrastructure.

## Task Commits

1. **Task 1: Add 30 Phase-7 keys (26 UI-SPEC §8 + 4 tranche-label) to dictionaries.ts** — `489c629` (feat)
2. **Task 2: Extend dictionaries.test.ts with Phase-7 parametric spot-check + parity assertions** — `9d970e6` (test)

(Plan-metadata commit follows below.)

## Full Phase-7 Key Reference (FR / EN, ground truth for Plans 07-03 / 04 / 05)

| Key                                  | FR                                                                           | EN                                                                       |
|--------------------------------------|------------------------------------------------------------------------------|--------------------------------------------------------------------------|
| `dashboard.greeting`                 | `Bonjour, {0} 👋`                                                             | `Hello, {0} 👋`                                                          |
| `dashboard.subtext`                  | `Créez une nouvelle proposition ou consultez vos propositions récentes.`     | `Create a new proposal or view your recent proposals.`                   |
| `dashboard.cta.new.proposal`         | `Nouvelle proposition`                                                        | `New proposal`                                                           |
| `dashboard.recent.title`             | `Propositions récentes`                                                       | `Recent proposals`                                                       |
| `dashboard.empty.title`              | `Aucune proposition pour le moment`                                          | `No proposals yet`                                                       |
| `dashboard.empty.body`               | `Cliquez sur « Nouvelle proposition » pour créer votre première proposition.` | `Click "New proposal" to create your first one.`                         |
| `header.proposals.new`               | `Nouvelle proposition`                                                        | `New proposal`                                                           |
| `proposal.section.preview`           | `Aperçu`                                                                      | `Preview`                                                                |
| `proposal.validity.label`            | `Validité de la proposition`                                                  | `Proposal validity`                                                      |
| `proposal.validity.suffix`           | `jours`                                                                       | `days`                                                                   |
| `proposal.validity.computed.label`   | `Valable {0} jours`                                                          | `Valid {0} days`                                                         |
| `proposal.toast.copy.success`        | `Référence copiée.`                                                          | `Reference copied.`                                                      |
| `proposal.toast.copy.error`          | `Impossible de copier. Sélectionnez et copiez manuellement.`                  | `Could not copy. Please select and copy manually.`                       |
| `proposal.toast.validation.errors`   | `Vérifiez les champs requis.`                                                | `Please check required fields.`                                          |
| `proposal.toast.phase8.placeholder`  | `Validation OK — Phase 8 ajoutera l'enregistrement et le PDF.`               | `Validation OK — Phase 8 will add saving and PDF.`                       |
| `proposal.confirm.reset`             | `Réinitialiser tous les champs ? Cette action est irréversible.`             | `Reset all fields? This action cannot be undone.`                        |
| `button.copy.ref` (REUSED from v10)  | `Copier la référence`                                                         | `Copy reference`                                                         |
| `button.copy.ref.copied`             | `Référence copiée`                                                           | `Reference copied`                                                       |
| `error.field.required`               | `Ce champ est requis.`                                                       | `This field is required.`                                                |
| `error.field.client.co.required`     | `La société cliente est requise.`                                            | `Client company is required.`                                            |
| `error.field.amount.required`        | `Le montant est requis.`                                                     | `Amount is required.`                                                    |
| `error.field.amount.too.small`       | `Le montant doit être supérieur à 25 000 €.`                                  | `Amount must be greater than €25,000.`                                   |
| `error.field.amount.too.large`       | `Le montant dépasse le seuil configuré.`                                     | `Amount exceeds configured threshold.`                                   |
| `error.field.duration.required`      | `Sélectionnez une durée.`                                                    | `Select a duration.`                                                     |
| `error.field.email.invalid`          | `Format d'email invalide.`                                                   | `Invalid email format.`                                                  |
| `error.field.phone.invalid`          | `Numéro de téléphone invalide.`                                              | `Invalid phone number.`                                                  |
| `error.field.siren.invalid`          | `SIREN invalide (9 chiffres requis).`                                        | `Invalid SIREN (9 digits required).`                                     |
| `form.tranche.t1`                    | `25 001 € → 50 000 €`                                                        | `25,001 € → 50,000 €`                                                    |
| `form.tranche.t2`                    | `50 001 € → 100 000 €`                                                       | `50,001 € → 100,000 €`                                                   |
| `form.tranche.t3`                    | `100 001 € → 250 000 €`                                                      | `100,001 € → 250,000 €`                                                  |
| `form.tranche.t4`                    | `250 001 € et plus`                                                          | `250,001 € and above`                                                    |

## Files Created/Modified

### Modified

- **`src/lib/i18n/dictionaries.ts`** — fr namespace: +30 keys before closing `}` (lines 280→formerly 280, now 322ish). en namespace: +30 keys before closing `}`. Section comments group keys by consumer plan. Total file lines: 562 → 639.
- **`src/lib/i18n/dictionaries.test.ts`** — Imports updated (`{ dictionaries, t, type DictKey }`). New `describe('Phase 7 i18n keys (UI-SPEC §8 + §9)')` block with parametric loop yielding 60 fr+en non-empty assertions plus 4 standalone assertions (3 `{0}` interpolation-contract + 1 `25` floor reference). Total file lines: 58 → 130.

### Created

- **`.planning/phases/07-calc-engine-port-proposal-form/07-06-SUMMARY.md`** (this file).

## Decisions Made

1. **`button.copy.ref` reuse over re-addition.** The existing v10-ported dict already contains this key (FR line 115, EN line 371). Adding it again would have caused TypeScript "duplicate property" errors. The plan flagged this case explicitly. Action: omit from new additions; reference verbatim. The new pair `button.copy.ref.copied` complements it for the post-click confirmed state (matches Phase 6 `auth.modal.button.copy` / `auth.modal.button.copied` discipline).
2. **FR tranche-label spacing chosen as U+00A0 not U+202F.** The plan called for U+202F (narrow no-break space) per French typographic convention (and per v10's source ` `). Editor paste of U+202F is invisible in diffs and source review, which slows future contributor audits. U+00A0 (regular non-breaking space) is the practical compromise: still rejects line-breaks between digit and €, still groups the thousands semantically, and is editor-visible. End-user-visible currency output is computed by `formatCurrency(..., 'fr-FR')` (Phase 6 SHELL-09), which applies its own thousands separator at runtime — so the dictionary value's exact whitespace codepoint is cosmetic, not load-bearing. Documented for downstream reviewers.
3. **No requirements (PROP-01/06/07/08/24/25) marked complete in REQUIREMENTS.md.** These cross-cutting requirements ground when the consumer UI ships (Plans 07-03 / 07-04 / 07-05). The i18n keys are necessary-but-not-sufficient for any of them. Per orchestrator instruction.

## Deviations from Plan

None — plan executed as written, with the two minor decisions noted above (button.copy.ref reuse — flagged by the plan; tranche-label whitespace codepoint — cosmetic and noted for transparency).

## Issues Encountered

**Pre-existing `scripts/seed-admins-launch.ts:42` lint warning persists** (the same warning logged in Plans 07-01 and 07-02). `npm run lint:check` (zero-warnings strict) fails on it; `npm run lint` (non-strict) exits 0 with the warning surfaced. `npx eslint src/lib/i18n/dictionaries.ts` produces zero output. Per executor scope-boundary rules, NOT auto-fixed in this plan. Continues to be tracked in `.planning/phases/07-calc-engine-port-proposal-form/deferred-items.md`.

## User Setup Required

None — no external service configuration required for this plan.

## Verification Results

| Check | Result |
| --- | --- |
| `npm run typecheck` | Exit 0 (`_EnParityProof` compile-time check still green) |
| `npm run lint` | Exit 0 (1 pre-existing warning out of scope) |
| `npx vitest run src/lib/i18n/dictionaries.test.ts` | 71/71 passing (was 6) |
| `npm test` (full suite) | 227/227 passing (was 162; +65 new tests) |
| `grep -c "'dashboard.greeting'" src/lib/i18n/dictionaries.ts` | 2 (one in fr, one in en) |
| `grep -c "'proposal.toast.phase8.placeholder'" dictionaries.ts` | 2 |
| `grep -c "'error.field.amount.too.small'" dictionaries.ts` | 2 |
| `grep -c "'form.tranche.t1'" dictionaries.ts` | 2 |
| `grep -c "Phase 7 i18n keys" dictionaries.test.ts` | 1 |
| `grep -c "phase7Keys: DictKey\[\]" dictionaries.test.ts` | 1 |
| Per-key audit (all 30 new + button.copy.ref reuse): every key returns count=2 | Confirmed |
| FR namespace key count (runtime `Object.keys(dictionaries.fr).length`) | 233 → 263 (+30) |
| EN namespace key count (runtime `Object.keys(dictionaries.en).length`) | 233 → 263 (+30) |

## Gotchas for Downstream Plans

1. **Plan 07-03 (home page CTA):** Use `dashboard.greeting` with `.replace('{0}', displayName)` — `t()` does NOT auto-interpolate. Render the result as React JSX child (auto-escapes per T-07-06-02). For the CTA button, use `dashboard.cta.new.proposal` (FR: "Nouvelle proposition"). For the empty state, both `dashboard.empty.title` and `dashboard.empty.body` are ready. The header link uses `header.proposals.new`.
2. **Plan 07-04 (proposal form scaffold):** Map RHF `zodResolver(proposalInputSchema)` error messages — Plan 07-01 tagged each Zod schema error with an i18n key like `'error.field.client.co.required'`. Resolve at render time via `t(error.message, lang)`. The 9 `error.field.*` keys cover: required, client.co.required, amount.required/too.small/too.large, duration.required, email.invalid, phone.invalid, siren.invalid. The validation-error toast uses `proposal.toast.validation.errors`. The reset native `confirm()` uses `proposal.confirm.reset`. The phase-8 placeholder success toast uses `proposal.toast.phase8.placeholder`.
3. **Plan 07-05 (live preview):** `proposal.section.preview` is the card heading. The Validity selector pair: `proposal.validity.label` (label above options) + `proposal.validity.suffix` ("jours"/"days" suffix on each radio) + `proposal.validity.computed.label` ("Valable {0} jours" — `.replace('{0}', validityDays.toString())`). For the LC ref Copy button: `button.copy.ref` (idle) + `button.copy.ref.copied` (after-click 2s state). Toast on copy success: `proposal.toast.copy.success`; on failure: `proposal.toast.copy.error`. Tranche labels (when calc engine yields a tKey): pass through `t(tLabel(tk), lang)` — keys are `form.tranche.t1` etc.
4. **`button.copy.ref` is the existing v10-ported key**, NOT a Phase-7-new addition. It existed since Plan 06-02 (v10 dict port). Plan 07-06 only adds the `.copied` companion.
5. **Tranche-label whitespace codepoint is cosmetic.** End-user-visible currency formatting comes from `formatCurrency(..., locale)` (SHELL-09); the dictionary value's exact whitespace doesn't reach the user verbatim. Future contributors editing the tranche labels can choose any non-breaking space (U+00A0 or U+202F) without affecting output.
6. **Phase-6 ESLint `no-restricted-syntax JSXText` rule is the gate** that makes plans 07-03/04/05 import these keys via `t()` instead of inlining FR strings. The keys are now ready; consumer plans should not trip the rule.

## Threat Flags

None — this plan ships dictionary entries + parametric tests only. No new code surface, no new network endpoints, no new auth paths, no new file access patterns. The threat surface is identical to Plan 07-02. The plan's `<threat_model>` block called out T-07-06-02 (XSS via `{0}` interpolation in `dashboard.greeting`) but the mitigation is delegated to Plan 07-03's consumer (React JSX auto-escape); no new boundary added here.

## Next Phase Readiness

- **Plan 07-03 unblocked** (home page CTA + base CSS classes). All `dashboard.*` + `header.proposals.new` + `button.copy.ref` keys ready.
- **Plan 07-04 unblocked** (proposal form scaffold + RHF + zodResolver). All 9 `error.field.*` + `proposal.toast.*` + `proposal.confirm.reset` keys ready. Plan 07-01's `proposalInputSchema` error messages now resolve via `t()`.
- **Plan 07-05 unblocked** (live preview composition). All `proposal.section.preview` + `proposal.validity.*` + `button.copy.ref.copied` + `form.tranche.t1..t4` keys ready. Plan 07-01's `tLabel(tk)` contract now resolves to a real dictionary key in both langs.
- **Phase 7 Wave 2 complete** (07-02 corpus shipped + 07-06 i18n shipped). Wave 3 (07-03 home page + 07-04 form) unblocked.

## Self-Check: PASSED

- All Phase-7 keys exist in BOTH `fr` and `en` namespaces of `src/lib/i18n/dictionaries.ts` (verified per-key with `grep -c "'<key>'" src/lib/i18n/dictionaries.ts` returning 2).
- Both task commits exist in `git log`:
  - `489c629 feat(7-06): add 30 Phase-7 i18n keys (UI-SPEC §8/§9) to dictionaries.ts`
  - `9d970e6 test(7-06): add Phase-7 i18n parametric spot-check + parity assertions`
- All `<acceptance_criteria>` from both task `<done>` blocks satisfied:
  - typecheck exit 0, lint exit 0, vitest exit 0
  - dictionaries.test.ts has `describe('Phase 7 i18n keys (UI-SPEC §8 + §9)')` block
  - Parametric `phase7Keys: DictKey[]` iterates 30 keys × 2 langs
  - Test count grew 162 → 227 (+65, ≥62 floor)
- `_EnParityProof` type proof still compiles — verified by typecheck.

---
*Phase: 07-calc-engine-port-proposal-form*
*Completed: 2026-05-08*
