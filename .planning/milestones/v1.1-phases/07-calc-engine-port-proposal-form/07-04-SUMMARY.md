---
phase: 07-calc-engine-port-proposal-form
plan: "07-04"
subsystem: proposal-form-scaffold
tags: [proposal-form, rhf, zod, blur-validation, v10-port, prop-06, prop-08, form-provider]

# Dependency graph
requires:
  - phase: 06-auth-shell
    provides: "(authed) layout shell + requireUser() + getCurrentLang() + t() helpers + RHF 7.75 + zodResolver 5.2 + sonner Toaster + lucide-react + ESLint no-restricted-syntax JSXText rule"
  - phase: 07-01-calc-engine-core
    provides: "proposalInputSchema (15 fields, D-7-06 clientCo required) + tKey/tLabel + ProposalInput type — single-source schema for form RHF resolver and Phase 8 server route"
  - phase: 07-06-i18n-keys
    provides: "30 Phase-7 dictionary keys including all error.field.*, proposal.toast.*, proposal.confirm.reset, header.proposals.new, form.tranche.t1..t4 — all consumed via t() in this plan"
  - phase: 07-03-home-page-cta
    provides: "13 v10 base CSS classes in globals.css (.card, .ctitle, .fld, .ieu, .tbadge, .dg/.db, .yn-group/.yn-btn, .btn-green/.btn-navy/.btn-out, input.invalid) — consumed as className-only contract by this plan's components"
provides:
  - "/proposals/new authenticated route — Server Component shell mounting <ProposalForm /> on the left + placeholder preview <aside> on the right (Plan 07-05 replaces the aside)"
  - "<ProposalForm> Client Component (519 lines) — RHF + zodResolver(proposalInputSchema), mode: onBlur + shouldFocusError, 4 cards (Partenaire / Client / Intérêts / Paramètres du projet), 14 inputs, action row with native confirm() reset + no-DB-write submit"
  - "<DurationSegmented<V>> shared 3-button radiogroup (D-7-16) — generic <V extends number>, role=radiogroup + role=radio + arrow-key keyboard nav. Plan 07-05 reuses as <ValiditySegmented> with options [{value:15},{value:30},{value:60}]"
  - "<YesNoToggle>, <NumberInputAmount>, <PhoneInput>, <SirenInput> — Controller-bound RHF custom inputs"
  - "FormProvider wrap — Plan 07-05 can either hoist FormProvider one level up to share state with <LiveLoyerPreview>, OR consume RHF state via <ProposalForm>'s onWatchableState({watch, control}) callback"
  - "v10 input formatters: phone XX XX XX XX XX (lines 2092-2100), SIREN XXX XXX XXX (lines 2103-2111), amount U+202F narrow no-break space (line 2181)"
  - "Tranche badge auto-display when amount > 25000 && tKey(amount) !== null (D-7-10) — uses form.tranche.label '{0}' interpolation + tLabel(key) → form.tranche.{tk} dictionary lookup"
affects:
  - "Plan 07-05 (live preview composition) — DurationSegmented reused as ValiditySegmented; FormProvider can be hoisted; onWatchableState callback wires <LiveLoyerPreview>"
  - "Phase 8 server route — proposalInputSchema.parse(req.body) on the SAME schema this form's RHF resolver enforces"
  - "REQUIREMENTS.md — PROP-06 and PROP-08 grounded by this plan's deliverables"

# Tech tracking
tech-stack:
  added: []  # No new deps — all deps already in package.json (RHF 7.75, @hookform/resolvers 5.2, sonner 2.0.7, zod 4.4.3, lucide-react 0.469.0)
  patterns:
    - "Three-generic useForm<TInput, TContext, TOutput>: useForm<z.input<schema>, unknown, ProposalInput> bridges zodResolver's input/output split when the schema uses .default() — without this, validityDays.default(30) makes the schema's input type optional (validityDays?) but the output type required (validityDays:), and the resolver type doesn't unify with Control/Watch generics. (Rule 1 fix during Task 2.)"
    - "Controller for custom inputs: PhoneInput / SirenInput / NumberInputAmount / DurationSegmented / YesNoToggle all wired via <Controller> from RHF instead of register() — gives proper field.onBlur integration so mode:'onBlur' actually fires Zod validation; avoids the plan's literal `register(name).onBlur({target:...} as never)` cast hack."
    - "FormProvider wrap from this plan: lets Plan 07-05 either hoist the provider OR consume RHF state via the onWatchableState callback exposed on <ProposalForm> props — both paths preserved for downstream flexibility."
    - "register-ref splice for firstFieldRef: const partnerCoReg = register('partnerCo'); ref={(el) => { partnerCoReg.ref(el); firstFieldRef.current = el; }} — combines RHF's internal ref-handler with a custom ref so onReset can refocus the first input after reset."

key-files:
  created:
    - "src/components/proposal/DurationSegmented.tsx (100 lines) — generic <V extends number> 3-button radiogroup with arrow-key keyboard nav, role=radio + aria-checked. Reused by Plan 07-05 as <ValiditySegmented>."
    - "src/components/proposal/YesNoToggle.tsx (56 lines) — 2-button radiogroup, .yn-btn / .yn-btn.on classes."
    - "src/components/proposal/NumberInputAmount.tsx (98 lines) — type=text + inputMode=numeric (D-7-09), U+202F separator formatter (v10 line 2181 port), tranche badge with form.tranche.label '{0}' interpolation."
    - "src/components/proposal/PhoneInput.tsx (66 lines) — XX XX XX XX XX formatter (v10 lines 2092-2100), maxLength={14}."
    - "src/components/proposal/SirenInput.tsx (66 lines) — XXX XXX XXX formatter (v10 lines 2103-2111), maxLength={11}."
    - "src/components/proposal/ProposalForm.tsx (519 lines) — Client Component, RHF + zodResolver, FormProvider, 4 cards, 14 inputs, action row. Submit no-op + info toast (D-7-07); reset via window.confirm + reset() + refocus (D-7-08)."
    - "app/(authed)/proposals/new/page.tsx (100 lines) — Server Component, requireUser() + getCurrentLang(), 2-column 640+360+24 grid, ProposalForm in left column, <aside> placeholder preview card in right column (Plan 07-05 replaces it)."
  modified: []

key-decisions:
  - "Custom inputs wired via <Controller> instead of register() + setValue manual integration — the plan's literal 'register(name).onBlur({target:...} as never)' cast pattern would (a) bypass RHF's actual blur tracking (so mode:'onBlur' wouldn't fire Zod) and (b) emit a TS error. Controller is the canonical RHF pattern for non-DOM-input components and gives field.onBlur for free. Recorded as Rule 1 deviation."
  - "useForm<z.input<schema>, unknown, ProposalInput> three-generic form — zodResolver's input/output type split (validityDays.default(30) → optional input, required output) requires this generic shape so the resolver type unifies with Control/Watch and handleSubmit's data is typed to the OUTPUT (ProposalInput). Recorded as Rule 1 deviation (the plan's literal 'useForm<ProposalInput>' single-generic form caused a tsc error)."
  - "onSubmit signature retained as `(_data: ProposalInput): void` with `void _data;` — keeps the future-proof typed signature visible (Phase 8 server route consumes the same shape) while satisfying @typescript-eslint/no-unused-vars without an eslint-disable comment. Cleaner than dropping the param."
  - "Page-title rendered as in-content <h1> instead of via Topbar.pageTitle prop — the (authed)/layout.tsx currently does NOT pass a pageTitle prop to <Topbar />, so the topbar shows the default t('header.home', lang). Plan 07-03's home page renders its title in-content; this plan follows the same pattern. Plan 07-05 (or a later cleanup) may consolidate by adding pageTitle propagation through the layout."
  - "FormProvider wraps the form in this plan: Plan 07-05 has two paths to integrate the live preview — (a) hoist the FormProvider one level up so <ProposalForm> and <LiveLoyerPreview> are siblings sharing context (cleanest for useFormContext / useWatch), or (b) consume RHF state via the onWatchableState({watch, control}) callback this plan exposes. Both paths are preserved."

patterns-established:
  - "Controller for custom (non-native-input) RHF fields: avoid setValue + register().onBlur cast hacks; use <Controller render={({field}) => ...}/> for proper blur tracking and type-safe value/onChange wiring."
  - "useForm<z.input<schema>, unknown, z.output<schema>> three-generic form is mandatory whenever the Zod schema uses .default() / .transform() (output ≠ input). Single-generic useForm<z.infer<schema>> only works when input == output."
  - "Page-level h1 + 2-column grid scaffold: Server Component renders a single-row title + 2-column grid (form left / sticky preview right) at page.tsx; ProposalForm is component-only and does not own the page chrome. Plan 07-05's <LiveLoyerPreview> drops into the right column without restructuring."

requirements-completed:
  - "PROP-06 (required client_name → satisfied by tightening v10's existing client-co to required-by-Zod via D-7-06; the form renders the inline error message via t(error.field.client.co.required, lang) on blur)"
  - "PROP-08 (form fields validate on blur with v10's red-ring focus pattern → satisfied by mode: 'onBlur' + shouldFocusError + className={errors.field ? 'invalid' : ''} + .invalid red-ring CSS contract from Plan 07-03's globals.css)"

# Metrics
duration: ~10 min
completed: 2026-05-09
---

# Phase 7 Plan 4: Proposal Form Scaffold Summary

**Wave-3 closer: `/proposals/new` route now renders a 4-card / 14-input proposal entry form using react-hook-form + zodResolver against `proposalInputSchema` from Plan 07-01, with blur-time `.invalid` red-ring validation (PROP-08) and required-by-Zod `clientCo` (PROP-06 grounded). 7 files created (1005 lines total): 5 shared field components + ProposalForm + the route page. Submit is a no-op + info toast (D-7-07 — Phase 8 wires persistence); reset uses native `window.confirm()` (D-7-08). FormProvider wrap and `onWatchableState` callback both preserved so Plan 07-05's `<LiveLoyerPreview>` has two integration paths. typecheck / lint / test (227/227) / build all exit 0; route `ƒ /proposals/new` confirmed in build output.**

## Performance

- **Duration:** ~10 min (start: 2026-05-08T21:50:34Z; end: 2026-05-09 plus SUMMARY)
- **Started:** 2026-05-08T21:50:34Z
- **Completed:** 2026-05-09 (UTC rollover during execution)
- **Tasks:** 3
- **Files created:** 7 source files + 1 SUMMARY.md
- **Files modified:** 0

## Accomplishments

- **5 shared field components shipped under `src/components/proposal/`** (Task 1):
  - `DurationSegmented<V extends number>` — generic 3-button radiogroup with arrow-key keyboard nav (ArrowLeft/Right + ArrowUp/Down cycle), `role=radiogroup` + `role=radio` + `aria-checked`, `tabIndex={isOn || (value == null && idx === 0) ? 0 : -1}` for proper focus management. Uses globals.css `.dg / .db / .db.on` classes from Plan 07-03.
  - `YesNoToggle` — 2-button radiogroup (Oui/Non or Yes/No), `.yn-group / .yn-btn / .yn-btn.on` classes, returns boolean (Phase 8 PDF will map to v10's `'oui'`/`'non'` strings).
  - `NumberInputAmount` — `type=text + inputMode=numeric` (D-7-09), U+202F NARROW NO-BREAK SPACE thousand separators every 3 digits right-anchored on every keystroke (v10 line 2181 port), digit-only storage form. Auto-shows tranche badge when `tKey(amount) !== null && amount > 25000` (D-7-10) using `form.tranche.label` `{0}` interpolation against `tLabel(key) → form.tranche.{tk}` dictionary lookup.
  - `PhoneInput` + `formatPhone` helper — `"XX XX XX XX XX"` formatter (v10 lines 2092-2100), `maxLength={14}` (10 digits + 4 spaces).
  - `SirenInput` + `formatSiren` helper — `"XXX XXX XXX"` formatter (v10 lines 2103-2111), `maxLength={11}` (9 digits + 2 spaces).
- **ProposalForm shipped at 519 lines** (Task 2):
  - `'use client'` Client Component using `useForm<z.input<schema>, unknown, ProposalInput>` (three-generic form bridging zodResolver's input/output split — see Decisions Made #2).
  - `mode: 'onBlur'` + `shouldFocusError: true` for PROP-08 blur-time validation.
  - 4 cards × 14 inputs:
    - **Card 1 Partenaire** — partnerCo (required, pre-filled empty), partnerName (required, pre-filled from session.user.displayName per D-7-13).
    - **Card 2 Client destinataire** — clientCo (required, D-7-06 PROP-06), clientName, clientRole, clientTel (PhoneInput), clientEmail, clientSiren (SirenInput).
    - **Card 3 Intérêts exprimés** — slb (YesNoToggle), evalParc (YesNoToggle).
    - **Card 4 Paramètres du projet** — amountHT (NumberInputAmount, required), durationMonths (DurationSegmented<36 | 48 | 60>, required), projectDesc, partnerRef.
  - Action row at bottom: Reset (`.btn-out`, native `window.confirm(t('proposal.confirm.reset', lang))`) + Generate (`.btn-navy`, submit).
  - Submit handler (`onSubmit`): `toast.info(t('proposal.toast.phase8.placeholder', lang))` — NO DB write, NO navigation (D-7-07).
  - Invalid handler (`onInvalid`): `toast.error(t('proposal.toast.validation.errors', lang))` + RHF's `shouldFocusError` focuses the first invalid field.
  - Custom inputs (PhoneInput / SirenInput / NumberInputAmount / DurationSegmented / YesNoToggle) wired via `<Controller>` from RHF for proper `field.onBlur` integration so Zod validation actually fires on blur for these non-native-input components.
  - `FormProvider` wraps the `<form>` so Plan 07-05 can either hoist it one level up or consume RHF state via the `onWatchableState({watch, control})` callback exposed on props.
- **`/proposals/new` route page shipped** (Task 3):
  - Server Component (no `'use client'`); `requireUser()` defence-in-depth + `getCurrentLang()`.
  - Partner-name pre-fill heuristic per D-7-13: `displayName ?? name ?? ''` (NOT email — we don't want partner-name auto-populated with an email-local-part).
  - 2-column desktop grid (D-7-01 / D-7-14): `minmax(0, 640px) minmax(0, 360px)` columns + 24px gap = 1024px (within authed shell's 1100px max-width). Right column is a sticky `<aside>` placeholder card showing `result.inline.placeholder`; Plan 07-05 replaces it wholesale with `<LiveLoyerPreview>`.
  - In-content `<h1>` page title (`header.proposals.new`) — the (authed)/layout.tsx does NOT currently pass `pageTitle` to `<Topbar />`; consistent with Plan 07-03's home page pattern.

- **Build verification:** `npm run build` exit 0; route map shows `ƒ /proposals/new` (dynamic, server-rendered on demand) alongside the existing 8 routes from Phase 6. Zero new package additions; uses existing RHF 7.75, @hookform/resolvers 5.2, sonner 2.0.7, zod 4.4.3, lucide-react 0.469.0.

- **Test count: 227/227 still passing.** No new tests added by this plan (per Phase 7 CONTEXT §"Deferred Items": component tests are a v1.2 candidate). No regressions.

## Task Commits

1. **Task 1: 5 shared field components (DurationSegmented + YesNoToggle + NumberInputAmount + PhoneInput + SirenInput)** — `28b01d3` (feat)
2. **Task 2: ProposalForm with RHF + zodResolver, 4 cards, 14 inputs** — `9fa6187` (feat)
3. **Task 3: /proposals/new route page mounting ProposalForm** — `4ea48b1` (feat)

(Plan-metadata commit follows below.)

## Component Contract for Plan 07-05

This is the load-bearing handover surface — Plan 07-05 SHOULD NOT restructure these contracts:

### File layout
- `<ProposalForm>` lives at `src/components/proposal/ProposalForm.tsx`. It internally instantiates `useForm<z.input<schema>, unknown, ProposalInput>` and wraps its `<form>` in `<FormProvider {...form}>`. Plan 07-05 has TWO integration paths:

  **Path A (preferred — hoist FormProvider one level up):**
  Modify `app/(authed)/proposals/new/page.tsx` to host the `useForm` hook + FormProvider, and remove the FormProvider from `<ProposalForm>` (the form keeps using `useFormContext()` to fetch register/control/etc.). `<LiveLoyerPreview>` becomes a sibling and consumes state via `useFormContext()` + `useWatch({ name: ['amountHT', 'durationMonths', 'validityDays'] })`. **Caveat:** the page is currently a Server Component; hoisting `useForm` requires moving the page (or extracting a tiny `<ProposalNewClient>` wrapper) to a Client Component. The simplest refactor: introduce `src/components/proposal/ProposalNewClient.tsx` ('use client') that owns the FormProvider + `<ProposalForm onWatchableState={...}/>` + `<LiveLoyerPreview />` siblings; the page stays server-side and renders `<ProposalNewClient lang={lang} prefill={...} />`.

  **Path B (no restructure — use the existing callback):**
  Pass `onWatchableState={(state) => setLiveState(state)}` from page.tsx (would require making the page client-component) OR pass it from a tiny `<ProposalNewClient>` shell. The callback receives `{ watch, control }` — Plan 07-05's `<LiveLoyerPreview>` reads from these. Less idiomatic than Path A; useful only if 07-05 wants to keep `<ProposalForm>` standalone (unlikely).

### DurationSegmented signature for ValiditySegmented reuse
```ts
import { DurationSegmented } from '@/components/proposal/DurationSegmented';

// Plan 07-05's <ValiditySegmented> usage (15/30/60 days):
<DurationSegmented<15 | 30 | 60>
  ariaLabel={t('proposal.validity.label', lang)}
  options={[
    { value: 15, label: '15 ' + t('proposal.validity.suffix', lang) },
    { value: 30, label: '30 ' + t('proposal.validity.suffix', lang) },
    { value: 60, label: '60 ' + t('proposal.validity.suffix', lang) },
  ]}
  value={watchedValidityDays ?? 30}
  onChange={(v) => setValue('validityDays', v, { shouldValidate: true, shouldDirty: true })}
  invalid={!!errors.validityDays}
/>
```
Plan 07-05 may either re-export `DurationSegmented` as `ValiditySegmented` (alias) or import it directly. Recommendation: import directly — the component is already named generically (the plan name "DurationSegmented" was the v10 source label; the component's behaviour is segmented control, not duration-specific).

### page.tsx layout structure (where the right column slot is)
The page.tsx renders:
```tsx
<div>
  <h1>...</h1>
  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 640px) minmax(0, 360px)', gap: 24, alignItems: 'start' }}>
    <ProposalForm lang={lang} prefill={{ partnerName }} />          {/* left */}
    <aside style={{ position: 'sticky', top: 'calc(var(--topbar-h) + 24px)' }} aria-label={...}>
      <div className="card">{/* placeholder content */}</div>
    </aside>                                                          {/* right — Plan 07-05 replaces */}
  </div>
</div>
```
Plan 07-05 replaces the entire `<aside>` block with `<LiveLoyerPreview ... />` (which can either own its own sticky positioning or rely on the parent grid).

## Files Created/Modified

### Created (7 source files + 1 SUMMARY)
- `src/components/proposal/DurationSegmented.tsx` (100 lines)
- `src/components/proposal/YesNoToggle.tsx` (56 lines)
- `src/components/proposal/NumberInputAmount.tsx` (98 lines)
- `src/components/proposal/PhoneInput.tsx` (66 lines)
- `src/components/proposal/SirenInput.tsx` (66 lines)
- `src/components/proposal/ProposalForm.tsx` (519 lines)
- `app/(authed)/proposals/new/page.tsx` (100 lines)
- `.planning/phases/07-calc-engine-port-proposal-form/07-04-SUMMARY.md` (this file)

### Modified
None.

## Decisions Made

1. **Custom inputs wired via `<Controller>` instead of `register()` + manual `setValue` (Rule 1 deviation).** The plan's literal pattern `register('clientTel').onBlur({ target: { name: 'clientTel' } } as never)` would (a) bypass RHF's real blur tracking (so `mode:'onBlur'` wouldn't fire Zod validation for these custom inputs) and (b) emit a TypeScript error on the `as never` cast. `<Controller>` is the canonical RHF pattern for non-native-input components — it gives `field.onBlur` for free, ensures validation fires on blur, and is type-safe. All 5 custom inputs (PhoneInput, SirenInput, NumberInputAmount, DurationSegmented, YesNoToggle) wired this way.

2. **`useForm<z.input<schema>, unknown, ProposalInput>` three-generic form (Rule 1 deviation).** The plan's literal `useForm<ProposalInput>` (single-generic form) caused a `tsc` error: `Resolver` is parametrized over the schema's INPUT type, but `ProposalInput = z.infer<schema>` is the OUTPUT type. With `validityDays: validityDaysSchema.default(30)`, input ≠ output (input has `validityDays?: 15|30|60 | undefined`; output has `validityDays: 15|30|60`), and the resolver type doesn't unify with `Control<ProposalInput>` and `Watch<ProposalInput>`. Three-generic form `useForm<TInput=z.input<schema>, TContext=unknown, TOutput=ProposalInput>` bridges this so handleSubmit's data is typed to the OUTPUT (ProposalInput) while defaultValues stays lenient about validityDays. Pattern recorded for downstream plans.

3. **`onSubmit` retained as `(_data: ProposalInput): void` with `void _data;`.** Keeps the future-proof typed signature visible (Phase 8's server route consumes the same shape) while satisfying `@typescript-eslint/no-unused-vars` without resorting to an `eslint-disable-next-line` comment. The `void _data;` line is a common idiom for "intentionally unused, kept for documentation".

4. **Page-title rendered as in-content `<h1>` instead of via `Topbar.pageTitle` prop.** The `(authed)/layout.tsx` currently does NOT pass `pageTitle` to `<Topbar />` (it shows the default `t('header.home', lang)`). Plan 07-03's home page renders its title in-content; this plan follows the same pattern for consistency. Plan 07-05 (or a later cleanup pass) may add `pageTitle` propagation through the layout — out of scope here. Documented in page.tsx with an inline comment.

5. **FormProvider wraps the form in this plan.** Two integration paths preserved for Plan 07-05: hoist FormProvider one level up (cleanest, requires extracting a tiny `<ProposalNewClient>` wrapper) OR consume RHF state via the `onWatchableState({watch, control})` callback exposed on `<ProposalForm>` props. Plan's design contract said "build with that in mind: keep ProposalForm modular, expose props for the future preview" — both paths satisfied.

## Deviations from Plan

**1. [Rule 1 - Bug] Custom inputs wired via `<Controller>` instead of `register() + setValue + cast hack`.**
- **Found during:** Task 2.
- **Issue:** The plan's literal pattern `register('clientTel').onBlur({ target: { name: 'clientTel' } } as never)` (a) bypasses RHF's real blur tracking — `mode: 'onBlur'` wouldn't fire Zod validation for these non-native-input components — and (b) emits a TypeScript error on `as never`.
- **Fix:** Wrap each of the 5 custom inputs (PhoneInput, SirenInput, NumberInputAmount, DurationSegmented, YesNoToggle) in `<Controller name="..." control={control} render={({field}) => ...} />` and pass `field.value`, `field.onChange`, `field.onBlur` directly. This is the canonical RHF pattern.
- **Files modified:** src/components/proposal/ProposalForm.tsx
- **Commit:** 9fa6187

**2. [Rule 1 - Bug] `useForm` three-generic form to bridge zodResolver input/output split.**
- **Found during:** Task 2.
- **Issue:** The plan's literal `useForm<ProposalInput>` caused tsc error `TS2322: Type 'Resolver<...>' is not assignable to type 'Resolver<...>'` because `proposalInputSchema` uses `validityDays.default(30)`, making the schema's input type optional but its output type required. `ProposalInput = z.infer<schema>` is the OUTPUT side; useForm's TFieldValues defaults to TFieldValues, but the resolver type doesn't unify.
- **Fix:** `useForm<z.input<typeof proposalInputSchema>, unknown, ProposalInput>` — explicit three-generic form so input and output types are split correctly. handleSubmit's data is still typed to ProposalInput (the OUTPUT — what Phase 8's server route would receive). The `ProposalFormValues = z.input<typeof proposalInputSchema>` type alias is exported via `Control<ProposalFormValues>` and `UseFormWatch<ProposalFormValues>` on the `onWatchableState` callback signature.
- **Files modified:** src/components/proposal/ProposalForm.tsx
- **Commit:** 9fa6187

**3. [Rule 1 - Lint] `_data` unused-vars.** The plan's snippet `const onSubmit = (_data: ProposalInput) => {...}` triggers `@typescript-eslint/no-unused-vars` even with the underscore prefix (eslint-config-next typescript preset doesn't honor `argsIgnorePattern: '^_'` by default). Fix: add `void _data;` inside the function body, signalling intentional unused. Documents that the parsed data WILL be consumed by Phase 8's server route.
- **Commit:** 9fa6187

No other deviations. The 4-card structure, 14-input inventory, native confirm() reset, no-op-toast submit, FormProvider wrap, U+202F formatter port, phone/SIREN formatter ports, partner-name pre-fill heuristic, page layout (640+360+24 grid), and CSS class consumption (.card / .ctitle / .fld / .ieu / .dg / .yn-group / .btn-out / .btn-navy) all match the plan exactly.

## Issues Encountered

**Pre-existing `scripts/seed-admins-launch.ts:42` lint warning persists** (the same warning logged in Plans 07-01/02/03/06). `npm run lint` (non-strict) exits 0 with the warning surfaced; `npm run lint:check` (strict) fails on it. Per executor scope-boundary rules, NOT auto-fixed in this plan (it's in `scripts/`, not in this plan's `files_modified` list). Continues to be tracked in `.planning/phases/07-calc-engine-port-proposal-form/deferred-items.md`. Plan 07-04's own files pass strict lint independently (`npx eslint src/components/proposal/ "app/(authed)/proposals/new/page.tsx" --max-warnings=0` → exit 0 with no output).

## User Setup Required

None — no external service configuration required for this plan.

## Visual Smoke (deferred)

Per the plan's verification block, manual browser smoke is OPTIONAL ("only if you have an authenticated session"). Skipped here because the route requires authentication and there's no automated way to drive a real Better Auth session from CLI without persisting test credentials. The build output verifies the route compiles and is reachable. The form's interactive behaviour (U+202F separators, tranche badge, segmented active state, blur validation, native confirm() dialog) is not testable without browser interaction; recommend Plan 07-05 (or a Phase 7 wrap-up cleanup) include a manual smoke checklist run-through.

## Verification Results

| Check | Result |
| --- | --- |
| `npm run typecheck` | Exit 0 (no TypeScript errors) |
| `npm run lint` | Exit 0 (1 pre-existing out-of-scope warning in `scripts/seed-admins-launch.ts:42`) |
| `npx eslint src/components/proposal/ "app/(authed)/proposals/new/page.tsx" --max-warnings=0` | Exit 0 (zero output — strict gate clean for this plan's files) |
| `npm run build` | Exit 0 (route `ƒ /proposals/new` confirmed in route map) |
| `npm test` | 227/227 passing (no regression — Phase 7 Wave 2 baseline preserved) |
| `grep -c "'use client'" src/components/proposal/*.tsx` | 6 (DurationSegmented + YesNoToggle + NumberInputAmount + PhoneInput + SirenInput + ProposalForm) |
| `grep -c "zodResolver(proposalInputSchema)" ProposalForm.tsx` | 1 |
| `grep -c "mode: 'onBlur'" ProposalForm.tsx` | 2 (1 in code + 1 in JSDoc) |
| `grep -c "shouldFocusError: true" ProposalForm.tsx` | 1 |
| `grep -c "FormProvider" ProposalForm.tsx` | 7 |
| `grep -c "window.confirm" ProposalForm.tsx` | 2 (1 in code + 1 in JSDoc) |
| `grep -c "proposal.toast.phase8.placeholder" ProposalForm.tsx` | 1 |
| `grep -c "proposal.toast.validation.errors" ProposalForm.tsx` | 1 |
| `grep -c "ProposalForm" "app/(authed)/proposals/new/page.tsx"` | 2 |
| `grep -c "requireUser" "app/(authed)/proposals/new/page.tsx"` | 3 |
| `grep -c "force-dynamic" "app/(authed)/proposals/new/page.tsx"` | 1 |
| `grep -c "use client" "app/(authed)/proposals/new/page.tsx"` | 0 (Server Component, correct) |
| Build route map includes `/proposals/new` | ✓ Confirmed (line `├ ƒ /proposals/new`) |
| Component imports from `@/lib/calc` only (no direct seedParams reference in form files) | ✓ Confirmed (only `proposalInputSchema`, `tKey`, `tLabel`, `ProposalInput` imported via barrel) |

## Build Route Map Snippet

```
Route (app)
┌ ƒ /
├ ƒ /_not-found
├ ƒ /[adminSegment]
├ ƒ /api/auth/[...all]
├ ƒ /healthz
├ ƒ /invite/[token]
├ ƒ /login
├ ƒ /proposals/new       ← NEW (Plan 07-04)
└ ƒ /reset/[token]


ƒ Proxy (Middleware)

ƒ  (Dynamic)  server-rendered on demand
```

## Gotchas for Downstream Plans

1. **Plan 07-05 (live preview) — FormProvider integration.** Two paths:
   - **Path A (recommended):** Extract `src/components/proposal/ProposalNewClient.tsx` as a thin `'use client'` wrapper that owns `useForm` + `<FormProvider>` + renders `<ProposalForm onWatchableState={...} />` and `<LiveLoyerPreview />` as siblings. Page.tsx stays Server Component and renders `<ProposalNewClient lang={lang} prefill={...} />`. `<ProposalForm>`'s internal `useForm` then needs to be replaced with `useFormContext()` for its `register/control/watch/setValue`. `<LiveLoyerPreview>` calls `useFormContext()` + `useWatch({ name: ['amountHT', 'durationMonths', 'validityDays'] })`.
   - **Path B (no restructure):** Pass `onWatchableState={(state) => setLiveState(state)}` from a tiny client wrapper at the page; `<LiveLoyerPreview>` consumes the captured `{watch, control}`. Less idiomatic; Path A is cleaner.

2. **DurationSegmented reuse for ValiditySegmented.** Import directly:
   ```ts
   import { DurationSegmented } from '@/components/proposal/DurationSegmented';
   ```
   Pass `<DurationSegmented<15|30|60> options={[{value:15,...},{value:30,...},{value:60,...}]} />`. Don't fork the component or add a wrapper — it's already generic.

3. **`useForm<z.input<schema>, unknown, ProposalInput>` three-generic discipline.** If Plan 07-05 hoists FormProvider, mirror this exact form. Single-generic `useForm<ProposalInput>` will fail typecheck because of the `validityDays.default(30)` input/output mismatch.

4. **Custom inputs use Controller, not register().** Plan 07-05 may add a ValiditySegmented inside the live-preview card — wrap it in `<Controller name="validityDays" control={control} render={({field}) => <DurationSegmented value={field.value} onChange={field.onChange} ... />} />`. Don't try to use `register('validityDays')` on the segmented control — `register` only works on native input/select/textarea elements.

5. **The `<aside>` placeholder in page.tsx is the live-preview slot.** Plan 07-05 replaces the entire `<aside>...</aside>` block (NOT the surrounding grid div). Sticky positioning (`position: 'sticky', top: 'calc(var(--topbar-h) + 24px)'`) is already on the placeholder; Plan 07-05 can either keep this on the new `<aside>` or fold it into `<LiveLoyerPreview>`.

6. **No `pageTitle` prop is passed to Topbar.** If Plan 07-05 (or a cleanup) wants the page title to appear in the topbar instead of in-content, it'll need to: (a) modify `(authed)/layout.tsx` to accept an optional `children`-side `pageTitle` somehow (props drilling won't work — children are opaque); OR (b) restructure to pass `pageTitle` from the page via a context / param. v1.1 decision: keep in-content `<h1>` for now (matches Plan 07-03 home page).

7. **Tranche badge interpolation.** `NumberInputAmount` renders `<span>{t('form.tranche.label', lang).replace('{0}', t(tLabel(trancheKey), lang))}</span>`. The two-step interpolation (`form.tranche.label` = `'Tranche : {0}'`; `tLabel(tk)` returns `'form.tranche.t1'..'form.tranche.t4'`; `t(tLabel(tk), lang)` returns the localized tranche range) is the contract. If Plan 07-05 wants to render tranche info in the live preview too, follow the same two-step pattern — don't fork the dictionary keys.

8. **PhoneInput and SirenInput store FORMATTED strings.** The form-state value is `"06 12 34 56 78"` for phone and `"123 456 789"` for SIREN, NOT digit-only. Zod's optional refinements (`s.replace(/\D/g, '').length === 10` / `=== 9`) handle the strip-and-count check at validation time. Phase 8's server route will receive these formatted strings via `proposalInputSchema.parse()` and may want to normalize before persisting (digit-only or v10's exact formatted form — TBD by Phase 8).

## Threat Flags

None — this plan ships UI surface that closes the loop on Phase 7's existing threat model. The threat register (T-07-04-01..07) declared in 07-04-PLAN.md is fully addressed:
- T-07-04-01 (XSS via partner-typed values) mitigated by JSXText auto-escape — every partner value (partnerCo, clientCo, etc.) flows through React JSX child rendering. No raw-HTML insertion APIs are used anywhere in this plan's files.
- T-07-04-02 (spoofing via DevTools form state edit) accepted (Phase 8 server route enforces the schema).
- T-07-04-03 (RHF internals exposed via callback) accepted (same-component-tree access).
- T-07-04-04 (DoS via paste) mitigated by `maxLength={15/14/11}` on amount/phone/SIREN inputs.
- T-07-04-05 (info disclosure on partner-name pre-fill) accepted (user views own session).
- T-07-04-06 (CSRF) n/a — no submit endpoint in Phase 7.
- T-07-04-07 (commission leak via React DevTools) mitigated (form imports `proposalInputSchema` only via barrel; no `seedParams` import in form files — verified by grep).

No new threat surface introduced beyond the threat-model register.

## Next Phase Readiness

- **Plan 07-05 unblocked** (live preview composition). Can either hoist FormProvider via a `<ProposalNewClient>` shell (Path A — recommended) OR consume RHF state via `onWatchableState` (Path B). DurationSegmented imports directly. The `<aside>` placeholder in page.tsx is the LiveLoyerPreview drop-in slot.
- **Phase 7 progress: 5/6 plans complete.** Wave 3 fully shipped (07-03 home + 07-04 form). Wave 4 (07-05 live preview composition) is the only remainder — closes Phase 7.
- **PROP-06 + PROP-08 grounded** — required clientCo (D-7-06 satisfies PROP-06 via tightened Zod schema) and blur-time validation (mode:'onBlur' + .invalid red-ring CSS contract from 07-03's globals.css) both wired end-to-end.

## Self-Check: PASSED

- All 7 source files exist on disk:
  - `src/components/proposal/DurationSegmented.tsx` ✓
  - `src/components/proposal/YesNoToggle.tsx` ✓
  - `src/components/proposal/NumberInputAmount.tsx` ✓
  - `src/components/proposal/PhoneInput.tsx` ✓
  - `src/components/proposal/SirenInput.tsx` ✓
  - `src/components/proposal/ProposalForm.tsx` ✓
  - `app/(authed)/proposals/new/page.tsx` ✓
- All 3 task commits exist in `git log`:
  - `28b01d3 feat(7-04): add 5 shared field components for proposal form` ✓
  - `9fa6187 feat(7-04): add ProposalForm with RHF + zodResolver, 4 cards, 14 inputs` ✓
  - `4ea48b1 feat(7-04): add /proposals/new route page mounting ProposalForm` ✓
- All `<success_criteria>` from the plan satisfied:
  - 6 components under `src/components/proposal/` ✓
  - Route page `app/(authed)/proposals/new/page.tsx` ✓
  - RHF + zodResolver(proposalInputSchema) wired with mode: 'onBlur' ✓
  - All required fields show .invalid red ring + inline error on blur ✓
  - Amount field uses U+202F formatter; tranche badge auto-shows above threshold ✓
  - Phone + SIREN formatters port v10 lines 2092-2111 verbatim ✓
  - Reset uses native confirm() (D-7-08); Submit fires info toast (D-7-07) — NO DB write ✓
  - All copy via t(); strict ESLint --max-warnings=0 passes on this plan's files ✓
  - PROP-06 + PROP-08 satisfied ✓
  - Plan 07-05 can wrap ProposalForm + LiveLoyerPreview as siblings under a single FormProvider (FormProvider wrap + onWatchableState callback exposed) ✓

---
*Phase: 07-calc-engine-port-proposal-form*
*Completed: 2026-05-09*
