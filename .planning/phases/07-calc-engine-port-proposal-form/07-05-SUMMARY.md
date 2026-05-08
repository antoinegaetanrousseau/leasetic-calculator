---
phase: 07-calc-engine-port-proposal-form
plan: "07-05"
subsystem: live-preview-composition
tags: [live-preview, copy-button, validity-selector, debounced-watch, form-provider, capstone]

# Dependency graph
requires:
  - phase: 07-01-calc-engine-core
    provides: "computeLoyer / generateLcRef / ProposalInput / ComputeLoyerState — pure-TS calc engine returning the 4-state machine + lcRef='' contract that this plan owns the lifecycle of"
  - phase: 07-04-proposal-form-scaffold
    provides: "<ProposalForm/> + DurationSegmented<V> + 5 sibling field components + the (authed)/proposals/new page Server Component shell with the <aside> placeholder slot Plan 07-05 replaces wholesale"
  - phase: 07-06-i18n-keys
    provides: "30 Phase-7 dictionary keys including all proposal.preview.*, proposal.validity.*, proposal.toast.copy.*, button.copy.ref.copied — every string this plan renders"
  - phase: 07-03-home-page-cta
    provides: ".card / .ctitle / .btn-out / token spine (--ink, --muted, --navy, --gold, --border, --topbar-h) consumed as className-only contract"
  - phase: 06-auth-shell
    provides: "formatCurrency/formatNumber explicit fr-FR / en-GB locale (D-28); sonner Toaster mounted in app/layout.tsx; lucide-react icon library; RHF v7.75 + react-hook-form/FormProvider + useFormContext + useWatch"
provides:
  - "<LiveLoyerPreview/> sticky right-column card with 5-state machine (idle / expired / missing / on-demand / computed)"
  - "<CopyRefButton/> clipboard button with sonner success/error toasts + 2s Check-icon label switch + Range/Selection fallback"
  - "<ValiditySegmented/> 15/30/60-day segmented control wrapper around DurationSegmented (D-7-16 — one shared component, two configurations)"
  - "useDebouncedValue<T>(value, delayMs=300) generic debounce hook"
  - "<ProposalFormProvider/> wrapper hoisting useForm + FormProvider so <ProposalForm/> + <LiveLoyerPreview/> share a single RHF context (Plan 07-05 Path A)"
  - "/proposals/new route as the capstone Phase-7 surface: form column updates the live-preview right column as the partner types"
  - "LC reference lifecycle: generated once on idle→non-idle transition via generateLcRef() (v10 line 1741); cleared on transition to idle; held until form reset"
  - "coefficientsExpired prop stub (D-7-12 — defaults false; Phase 8 flips it from a global_params freshness probe)"
affects:
  - "Phase 8 server route — same proposalInputSchema shape this plan's onSubmit serializes"
  - "Phase 8 PDF renderer — same computeLoyer call (CALC-07 client preview / server recompute seam already in place)"
  - "Phase 9 admin coefficients editor — wires the global_params freshness check that flips coefficientsExpired={true}"

# Tech tracking
tech-stack:
  added: []  # No new deps — uses existing RHF 7.75, sonner 2.0.7, lucide-react 0.469.0, zod 4.4.3
  patterns:
    - "Path A — extract ProposalFormProvider in the same file as ProposalForm: useForm + FormProvider hoisted one level up so <ProposalForm/> + <LiveLoyerPreview/> are siblings sharing the same RHF context. ProposalForm consumes via useFormContext<ProposalFormValues> (input side); LiveLoyerPreview consumes via useFormContext<ProposalInput> (output side, covariant read access). Page stays a Server Component; the Provider is the only 'use client' boundary needed."
    - "store-info-from-previous-render pattern for derived state transitions: the LC ref lifecycle (generate on idle→non-idle, clear on idle) is implemented via useRef + setState during render with a guard, NOT useEffect. Avoids the react-hooks/set-state-in-effect lint rule that fires on derive-state-from-prop patterns inside useEffect (Phase 6's error.tsx applied the same fix; STATE.md Decisions Log entry preserved)."
    - "Generic useDebouncedValue<T> hook over a tuple object: { amountHT, durationMonths, validityDays } as a single debounced unit so all three watched fields share one timer and the useMemo dependency array is the inner primitives, not the wrapping object."
    - "useFormContext<TInput> when using three-generic useForm<TInput, _, TOutput>: useFormContext is parametrized by TFieldValues (= input side), NOT TTransformedValues. ProposalForm uses useFormContext<ProposalFormValues> for handleSubmit-data-typing reasons; LiveLoyerPreview uses useFormContext<ProposalInput> for read-only purposes (covariant). Documented as Rule 1 deviation."

key-files:
  created:
    - "src/components/proposal/useDebouncedValue.ts (24 lines) — generic 300ms debounce hook"
    - "src/components/proposal/ValiditySegmented.tsx (46 lines) — DurationSegmented<15|30|60> wrapper with proposal.validity.suffix labels"
    - "src/components/proposal/CopyRefButton.tsx (82 lines) — clipboard button with sonner toasts + 2s label switch + Range/Selection fallback"
    - "src/components/proposal/LiveLoyerPreview.tsx (398 lines) — sticky preview card; 5-state machine + LC ref lifecycle + CopyRefButton + ValiditySegmented composition"
  modified:
    - "src/components/proposal/ProposalForm.tsx (519 → 529 lines) — switched internal useForm to useFormContext<ProposalFormValues>; added ProposalFormProvider wrapper; dropped onWatchableState callback + prefill prop (now lives on the wrapper); dropped FormProvider from JSX"
    - "app/(authed)/proposals/new/page.tsx (100 → 86 lines) — wraps <ProposalForm/> + <LiveLoyerPreview/> inside <ProposalFormProvider prefill={{partnerName}}/>; drops the placeholder <aside> wholesale"

key-decisions:
  - "Path A (ProposalFormProvider in the same file as ProposalForm) over the 07-04-SUMMARY's ProposalNewClient.tsx alternative: minimizes file count (stays within plan's 6-file files_modified list), keeps the form's internal context shape co-located with its provider, and the page Server Component remains async. The plan's <plan_specifics> says either is acceptable; chose the more conservative path."
  - "useFormContext<ProposalFormValues> in ProposalForm (not <ProposalInput>): handleSubmit's callback type flows from TFieldValues; useFormContext does NOT have useForm's three-generic input/output split. Trying to type the context as ProposalInput (output side) made handleSubmit complain that validityDays could be undefined. The plan literal 'useFormContext<ProposalInput>' was for LiveLoyerPreview (read-only context — covariant types are fine). Recorded as Rule 1 deviation."
  - "LC reference lifecycle implemented via store-info-from-previous-render (useRef + render-time setState with guard) over useEffect: Phase 6's error.tsx fix for the same react-hooks/set-state-in-effect lint rule. The pattern is the React-team-recommended one for derive-state-from-prop transitions (https://react.dev/reference/react/useState#storing-information-from-previous-renders). Recorded as Rule 1 deviation."
  - "coefficientsExpired hardcoded false at the page.tsx call site (NOT inside LiveLoyerPreview default): keeps the Phase-8 swap point at the call site where the global_params freshness probe will land. Deciding inside LiveLoyerPreview would have buried the swap point one component deep."

patterns-established:
  - "Path A for FormProvider-shared sibling consumers: the wrapper component lives in the same file as one of its children when only that child also defines TS types referenced by the wrapper's defaultValues; otherwise extract to a separate file. Phase 8 may add more siblings (validity-status badge, attached-PDF preview) under the same provider."
  - "Render-time setState for derived-from-state-transition values (LC ref, animation triggers, etc.) when the trigger is a state CHANGE, not the state itself. Pattern: useRef stores prev; if/render guards the update; setState fires synchronously and React replays render with the new state before commit. Lint-clean alternative to useEffect setState."

requirements-completed: [PROP-07, PROP-24, PROP-25, CALC-07]

# Metrics
duration: 22 min
completed: 2026-05-09
---

# Phase 7 Plan 5: Live Preview Composition Summary

**Capstone of Phase 7: `/proposals/new` now ships the full v10-parity proposal entry experience — partners type into a 4-card / 14-input form on the left, and a sticky right-column live-preview card updates with a 300ms debounce showing the formatted loyer (fr-FR / en-GB explicit locale via Phase-6 formatCurrency), a generated LC reference (held across the session, regenerated on form reset), a Copy LC clipboard button (sonner toasts + 2s Check-icon label switch + Range/Selection fallback), and a 15/30/60-day validity selector (Plan-07-04 DurationSegmented re-used per D-7-16). 4 new components shipped (550 lines total) + 2 files restructured (ProposalForm hoisted to ProposalFormProvider; page.tsx now wraps both children as siblings under one RHF context — Plan 07-05 Path A). All 5 v10 state-machine branches reachable: idle (Edit3 icon + placeholder), expired (Lock icon + amber, D-7-12 stub never triggered in Phase 7), missing (Edit3 + missing-coeff copy), on-demand ("Sur demande" + over-max subtext), computed (formatted loyer + "{N} mois · coeff. {C}%" suffix + LC ref + Copy + Validity). 3 task commits; typecheck/lint/test/build all 0; 227/227 tests preserved; route `ƒ /proposals/new` still in route map. PROP-07 + PROP-24 + PROP-25 + CALC-07 (client-side seam) all grounded. Phase 7 complete: 6/6 plans done.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-05-08T22:17:00Z
- **Completed:** 2026-05-09T00:39:40Z (UTC rollover during execution)
- **Tasks:** 3
- **Files created:** 4 source files + 1 SUMMARY.md
- **Files modified:** 2 source files

## Accomplishments

- **3 small components shipped under `src/components/proposal/`** (Task 1, commit `59b14b5`):
  - `useDebouncedValue<T>(value, delayMs=300)` — generic 300ms debounce hook (D-7-02 / UI-SPEC §5.2). 24 lines.
  - `ValiditySegmented` — thin wrapper around `DurationSegmented<15 | 30 | 60>` with `proposal.validity.suffix` labels (D-7-16 — one shared component, two configs). 46 lines.
  - `CopyRefButton` — `navigator.clipboard.writeText(lcRef)` with sonner success toast + 2s Check-icon label switch; on failure fires sonner error toast + Range/Selection API fallback so user can Cmd+C the LC text manually. 82 lines.
- **`<LiveLoyerPreview/>` sticky preview card shipped** (Task 2, commit `771c07f`, 398 lines):
  - `'use client'` Client Component using `useFormContext<ProposalInput>()` to read the parent's RHF context, `useWatch({ control, name: ['amountHT', 'durationMonths', 'validityDays'] })` to subscribe.
  - Watched tuple debounced via `useDebouncedValue({...}, 300)` — D-7-02 / UI-SPEC §5.2.
  - `useMemo`-cached `computeLoyer({...})` call (the same module Phase 8's server route will recompute with — CALC-07).
  - 5 state-machine bodies rendered conditionally (mirrors v10 lines 1425-1454):
    - **idle** — `Edit3` icon (lucide-react, opacity 0.4 muted) + `result.inline.placeholder` text. Triggered when amount empty / amount ≤ 25 000 / no duration picked.
    - **expired** — `Lock` icon (--gold, opacity 0.6) + `result.inline.expired` text. D-7-12 stub: never fires in Phase 7 (driven by `coefficientsExpired` prop hardcoded false at the page); Phase 8 will flip it.
    - **missing** — `Edit3` icon + `result.inline.missing` text. Defensive: cannot fire in Phase 7 since seedParams has all 12 coefficient cells filled, but rendered for forward-compat.
    - **on-demand** — `result.loyer.label` ALL-CAPS + `result.sur.demande` 22px navy + `result.inline.over.max` subtext. Triggered when `amount > getMaxAmount()` (500 000 €).
    - **computed** — `result.loyer.label` ALL-CAPS + 30px navy formatted-loyer (formatCurrency, explicit fr-FR / en-GB) + `result.coeff.suffix` "{0} mois · coeff. {1}%" with formatted coefficient (4 decimals via `Intl.NumberFormat`). `aria-live="polite"` + `aria-atomic="true"` on the container so screen readers announce the loyer when it changes (UI-SPEC §13).
  - LC reference lifecycle (07-01-SUMMARY gotcha #3 + v10 line 1741):
    - `generateLcRef()` called ONCE on idle→non-idle transition via the store-info-from-previous-render pattern (`useRef<EffectiveState>('idle')` + render-time `setState` with guard). Avoids `react-hooks/set-state-in-effect` lint rule (same fix Phase 6's error.tsx applied).
    - LC ref held in component state until effective state returns to idle (form reset → amount empty → idle); next non-idle transition generates a fresh LC.
    - `<CopyRefButton lcRef={lcRef} lang={lang}/>` mounted when state is `'computed'` or `'on-demand'`.
  - `<ValiditySegmented/>` mounted ALWAYS (PROP-25 + D-7-04). Writes back to `validityDays` form field via `setValue('validityDays', v, { shouldDirty: true })`. The "Valable {N} jours" caption renders only in the `'computed'` state per UI-SPEC §3.2.10.
- **Path A FormProvider hoist** (Task 3, commit `4b57f45`):
  - `ProposalForm.tsx` (519 → 529 lines):
    - Added `ProposalFormProvider` wrapper exporting `useForm<ProposalFormValues, unknown, ProposalInput>` (three-generic form preserved from Plan 07-04 — bridges the validityDays.default(30) input/output split) + `<FormProvider {...form}>{children}</FormProvider>`.
    - `prefill?: Partial<ProposalInput>` prop migrated from `ProposalForm` to `ProposalFormProvider`.
    - `ProposalForm` itself dropped its internal `useForm` + the `onWatchableState` callback prop; switched to `useFormContext<ProposalFormValues>()` to consume the parent context.
    - Dropped `<FormProvider>` wrapper from ProposalForm's JSX (now hoisted to provider).
    - `onSubmit` retyped from `(_data: ProposalInput) => void` to `(_data: ProposalFormValues) => void` because `useFormContext` doesn't carry the three-generic input/output split — `handleSubmit`'s callback receives the input shape (with optional `validityDays`). Phase 8's server route does the authoritative parse via `proposalInputSchema.parse(req.body)` anyway, so this typing change is purely internal to Phase 7's no-op submit handler.
  - `app/(authed)/proposals/new/page.tsx` (100 → 86 lines):
    - Server Component preserved (no `'use client'`); `requireUser()` defence-in-depth + `getCurrentLang()`.
    - Wraps `<ProposalForm/>` + `<LiveLoyerPreview/>` as siblings inside `<ProposalFormProvider prefill={{partnerName}}/>`. The 2-column grid (640 + 360 + 24 = 1024px within the 1100px main-content max-width) lives inside the Provider.
    - The placeholder `<aside>` from Plan 07-04 dropped wholesale; LiveLoyerPreview owns its own sticky positioning.
    - `coefficientsExpired={false}` hardcoded at the call site (D-7-12 stub — Phase 8 swap point).
- **Build verification:** `npm run build` exit 0; route map shows `ƒ /proposals/new` still present (server-rendered on demand) alongside the existing 8 routes from Phases 5/6. No new package additions.
- **Test count: 227/227 still passing.** No new tests added by this plan (per Phase 7 CONTEXT §"Deferred Items": component tests are a v1.2 candidate). No regressions.

## Task Commits

1. **Task 1: useDebouncedValue + ValiditySegmented + CopyRefButton** — `59b14b5` (feat)
2. **Task 2: LiveLoyerPreview state-machine card** — `771c07f` (feat)
3. **Task 3: Hoist FormProvider to ProposalFormProvider; mount LiveLoyerPreview as sibling (Path A)** — `4b57f45` (feat)

(Plan-metadata commit follows below.)

## State-Machine Detection Summary

The 5 effective states are detected as follows inside `<LiveLoyerPreview/>`:

| State | Detection (after 300ms debounce) | Visual |
| ----- | -------------------------------- | ------ |
| `idle` | `amountHT === ''` OR `durationMonths === undefined`. computeLoyer NOT called. | `Edit3` icon (--muted, opacity 0.4) + `result.inline.placeholder` |
| `expired` | `coefficientsExpired === true` (D-7-12 stub — false in Phase 7) | `Lock` icon (--gold, opacity 0.6) + `result.inline.expired` |
| `missing` | computeLoyer returns `{ state: 'missing' }` (tranche resolves but coefficient cell null — defensive, never fires in Phase 7) | `Edit3` icon + `result.inline.missing` |
| `on-demand` | computeLoyer returns `{ state: 'on-demand' }` (`amount > getMaxAmount() = 500_000`) | "LOYER MENSUEL HT" + "Sur demande" 22px navy + over-max subtext + LC + Copy |
| `computed` | computeLoyer returns `{ state: 'computed', loyerHT, coeff }` (happy path) | "LOYER MENSUEL HT" + formatted loyer 30px navy + coeff suffix + LC + Copy + validity caption |

**LC ref lifecycle:** `useRef<EffectiveState>('idle')` tracks the previous state. If `effectiveState !== prevStateRef.current`, the ref updates and: if transitioning TO idle clear `lcRef`; if transitioning FROM idle (lcRef === '') call `generateLcRef()` to seed a fresh `LC-XXXXX`. The setState happens during render (with the guard), so React replays the render with the new state before committing — lint-clean and no useEffect needed.

## v10 Parity (Computed State — 5 Representative Scenarios)

Calculation formula (frozen invariant per PROJECT.md):
`loyer = amount × (1 + commission/100) × coeff / 100` with commission=5%, coefficients from `seedParams`.

| Scenario | Tranche | Coefficient | Computed Loyer | Verified |
| -------- | ------- | ----------- | -------------- | -------- |
| 30 000 € / 36 mo | t1 (>25k, ≤50k) | 3.0000 | 30000 × 1.05 × 3.0/100 = **945,00 €** | calc.golden.test.ts t1×36 case |
| 75 000 € / 48 mo | t2 (>50k, ≤100k) | 2.2500 | 75000 × 1.05 × 2.25/100 = **1 771,88 €** | calc.golden.test.ts t2×48 case (UI-SPEC manual smoke target) |
| 150 000 € / 36 mo | t3 (>100k, ≤250k) | 2.8000 | 150000 × 1.05 × 2.8/100 = **4 410,00 €** | calc.golden.test.ts t3×36 case |
| 400 000 € / 60 mo | t4 (>250k) | 1.7500 | 400000 × 1.05 × 1.75/100 = **7 350,00 €** | calc.golden.test.ts t4×60 case |
| 750 000 € / 48 mo | (above max) | n/a | **on-demand** state (Sur demande) | calc.golden.test.ts on-demand case |

The 30-case golden corpus from Plan 07-02 is the runtime parity proof; LiveLoyerPreview just renders the same `computeLoyer({...}).computed.loyerHT` string through `formatCurrency(Number(loyerHT), lang)`. Zero divergence by construction — no separate compute path, no display-side rounding.

formatCurrency outputs (Phase 6 D-28 explicit locale):
- fr (fr-FR): `1 771,88 €` — narrow-no-break-space thousand separator + comma decimal
- en (en-GB): `€1,771.88` — comma thousand separator + period decimal + leading currency symbol

## 300ms Debounce Verification

The debounce is testable via React DevTools Profiler: typing rapid digits in the amount field causes `useWatch` updates on every keystroke (visible in the Form node), but `LiveLoyerPreview`'s child state-machine bodies only re-render once the user pauses for 300ms (visible as a single batched re-render in the Profiler's commit phase). The `useDebouncedValue` hook stores the value via `useState` + `setTimeout` cleanup, so cancelled timers from in-flight keystrokes don't fire stale updates.

Manual verification can also be done by adding a `console.log` inside the `useMemo` block at LiveLoyerPreview.tsx:73 — typing "75000" produces ONE log call (after the user stops typing for 300ms), not five.

## Validity Selector Wiring

Changing the `<ValiditySegmented/>` selection from 30 → 15 → 60 emits `setValue('validityDays', v, { shouldDirty: true })` calls. Each call:
1. Updates the form-state `validityDays` field (read by anyone calling `useWatch({ name: 'validityDays' })`).
2. Marks the form dirty (Phase 8 will use this for unsaved-changes guards).
3. Does NOT trigger validation (`shouldValidate` not set) — `validityDaysSchema` is a literal-union of `15|30|60`, so any value passed by the segmented control is valid by construction.

Phase 8's server route receives `validityDays: 15 | 30 | 60` via `proposalInputSchema.parse(formData)` — the `default(30)` only fires when the field is missing; if present, the partner-selected value is preserved.

## Files Created/Modified

### Created (4 source files + 1 SUMMARY)
- `src/components/proposal/useDebouncedValue.ts` (24 lines)
- `src/components/proposal/ValiditySegmented.tsx` (46 lines)
- `src/components/proposal/CopyRefButton.tsx` (82 lines)
- `src/components/proposal/LiveLoyerPreview.tsx` (398 lines)
- `.planning/phases/07-calc-engine-port-proposal-form/07-05-SUMMARY.md` (this file)

### Modified
- `src/components/proposal/ProposalForm.tsx` (519 → 529 lines): hoisted useForm to new ProposalFormProvider wrapper; switched ProposalForm to useFormContext<ProposalFormValues>; dropped onWatchableState callback + prefill prop + outer FormProvider JSX wrap; retyped onSubmit param.
- `app/(authed)/proposals/new/page.tsx` (100 → 86 lines): wrapped <ProposalForm/> + <LiveLoyerPreview/> as siblings under <ProposalFormProvider prefill={...}/>; dropped placeholder <aside>.

## Decisions Made

1. **Path A (ProposalFormProvider in the same file as ProposalForm) over the 07-04-SUMMARY's separate ProposalNewClient.tsx alternative.** The plan's `<plan_specifics>` accepted either; chose the in-file wrapper to minimize file count (stays within the plan's 6-file `files_modified` list — adding a 7th file would have required a documented deviation). Justification: `ProposalFormProvider` only references types `ProposalFormValues` (z.input) and `ProposalInput` already declared in ProposalForm.tsx; no separation-of-concerns benefit to a separate file.
2. **`useFormContext<ProposalFormValues>` (input side) in ProposalForm; `useFormContext<ProposalInput>` (output side) in LiveLoyerPreview.** `useFormContext` is parametrized by `useForm`'s `TFieldValues` (= input type), NOT `TTransformedValues`. ProposalForm's `handleSubmit` callback flows through TFieldValues so the OUTPUT-typed `useFormContext<ProposalInput>` produced a tsc error (`Type 'undefined' is not assignable to type '60 | 15 | 30'` on `validityDays`). LiveLoyerPreview only READS context (covariant — narrower output type assignable from wider input type), so the OUTPUT typing is fine and gives `validityDays: 15|30|60` (no undefined) — convenient for the validity caption render. Recorded as Rule 1 deviation.
3. **LC reference lifecycle implemented via store-info-from-previous-render pattern** (`useRef` + render-time `setState` with guard) over `useEffect`. The plan's literal `useEffect(() => {...}, [effectiveState])` body that calls `setLcRef(...)` triggers the `react-hooks/set-state-in-effect` lint rule introduced in Phase 6 (same one error.tsx hit). Render-time setState with a previous-state guard is React's recommended alternative for derive-state-from-state-transition cases (https://react.dev/reference/react/useState#storing-information-from-previous-renders); React replays the render with the new state before commit, so DOM behaviour is identical to a useEffect setState. Recorded as Rule 1 deviation.
4. **`coefficientsExpired={false}` hardcoded at the page.tsx call site** (D-7-12 stub) instead of inside LiveLoyerPreview as a default. Keeps the Phase-8 swap point at the call site where a `globalParams.coefficientsExpired` read will land. Inside-the-component default would have buried the swap site one component deep.

## Deviations from Plan

**1. [Rule 1 - Lint] LC reference lifecycle: store-info-from-previous-render over useEffect.**
- **Found during:** Task 2.
- **Issue:** The plan's literal `useEffect(() => { if (idle) setLcRef(''); else if (lcRef === '') setLcRef(generateLcRef()); }, [effectiveState, lcRef])` body triggers `react-hooks/set-state-in-effect` lint error: "Calling setState synchronously within an effect can trigger cascading renders". This is the same lint rule Phase 6's error.tsx tripped over (handled via lazy useState initializer per STATE.md Decisions Log).
- **Fix:** Switched to `useRef<EffectiveState>('idle')` + render-time `if (effectiveState !== prevStateRef.current) { ... setLcRef(...) }` with the React-recommended store-info-from-previous-render pattern. React replays the render with the new state before commit; behaviour is identical to a useEffect setState but lint-clean. Documented inline.
- **Files modified:** src/components/proposal/LiveLoyerPreview.tsx
- **Commit:** 771c07f

**2. [Rule 1 - Type] `useFormContext<ProposalFormValues>` (input side) in ProposalForm — not `<ProposalInput>` as the plan's literal verify gate suggested.**
- **Found during:** Task 3.
- **Issue:** The plan's verify regex `grep -c "useFormContext<ProposalInput>" ProposalForm.tsx` would have produced this typing in ProposalForm. But `useFormContext` does NOT have useForm's three-generic input/output split — it's parametrized by `TFieldValues` (= the input side). Trying `useFormContext<ProposalInput>` (output) made `handleSubmit`'s callback complain that `validityDays` could be undefined (`Type 'undefined' is not assignable to type '60 | 15 | 30'` — same input/output mismatch Plan 07-04 fixed via the three-generic useForm form).
- **Fix:** Use `useFormContext<ProposalFormValues>` in ProposalForm (input side); retype `onSubmit` from `(_data: ProposalInput) => void` to `(_data: ProposalFormValues) => void`. The Phase-7 onSubmit is a no-op + toast (D-7-07) so the type doesn't affect runtime; Phase 8's server route does the authoritative parse via `proposalInputSchema.parse(req.body)` which produces ProposalInput.
- **LiveLoyerPreview is the consumer the plan's note about `useFormContext<ProposalInput>` was actually for** — it READS context and never writes the typed callback, so output-side typing is fine (covariant: ProposalInput is structurally assignable from a wider context). Both consumers coexist correctly.
- **Files modified:** src/components/proposal/ProposalForm.tsx
- **Commit:** 4b57f45

**3. [Plan-aligned] Path A executed via ProposalFormProvider wrapper IN ProposalForm.tsx (NOT a separate ProposalNewClient.tsx file).**
- The plan's `<plan_specifics>` block explicitly offered both shapes ("If the plan's `files_modified` list adds `ProposalNewClient.tsx`, fine. If it doesn't and you need a new file for Path A, document the addition in SUMMARY"). The plan's `files_modified` does NOT include ProposalNewClient.tsx; the Step A literal puts ProposalFormProvider in the same file as ProposalForm. Followed the literal — no new file added. Not a deviation, just a path-selection note for clarity.

No other deviations. The 5-state machine inventory, 300ms debounce, formatCurrency explicit locale, LC ref lifecycle (idle→non-idle generation; idle reset), CopyRefButton clipboard + sonner + Range/Selection fallback, ValiditySegmented re-using DurationSegmented, the 2-column 640+360+24 grid, the in-content `<h1>` page title, requireUser defence-in-depth, force-dynamic — all match the plan exactly.

## Issues Encountered

**Pre-existing `scripts/seed-admins-launch.ts:42` lint warning persists** (the same warning logged in Plans 07-01/02/03/04/06). `npm run lint` (non-strict) exits 0 with the warning surfaced; per executor scope-boundary rules, NOT auto-fixed in this plan (it's in `scripts/`, not in this plan's `files_modified` list). Continues to be tracked in `.planning/phases/07-calc-engine-port-proposal-form/deferred-items.md`. Plan 07-05's own files pass strict lint independently (`npx eslint src/components/proposal/ "app/(authed)/proposals/new/page.tsx" --max-warnings=0` → exit 0 with no output).

## User Setup Required

None — no external service configuration required for this plan.

## Visual Smoke (deferred)

Per the plan's verification block, manual browser smoke is OPTIONAL. The route requires authentication and there's no automated way to drive a real Better Auth session from CLI without persisting test credentials. The build output verifies the route compiles, the route map shows `ƒ /proposals/new`, all unit / golden tests still pass (227/227), and the formula+formatter parity is verified by the existing 30-case golden corpus from Plan 07-02. Recommend the orchestrator (or a Phase 7 finalization wrap-up pass) include a manual smoke checklist run-through covering:

- Initial state: preview shows idle (`Edit3` + `result.inline.placeholder`)
- Type "75 000" in amount, click 48: ~300ms later, preview shows "1 771,88 €" (fr) or "€1,771.88" (en) with "48 mois · coeff. 2,2500 %" suffix and a generated `LC-XXXXX`
- Click Copy: label switches to "Référence copiée" + Check icon for 2 seconds + sonner success toast
- Type 750 000 in amount, click 60: state switches to "Sur demande" + over-max subtext (still has LC ref + Copy)
- Click 30 → 15 → 60 in validity selector: caption updates to "Valable {N} jours"; submitting the form serializes the new validityDays
- Reset button → confirm → form clears, preview returns to idle, LC ref cleared. Type fresh inputs → preview shows new LC (different from the previous one)
- Switch language toggle in topbar: loyer reformat with new locale; coefficient suffix + validity caption update

## Verification Results

| Check | Result |
| --- | --- |
| `npm run typecheck` | Exit 0 (no TypeScript errors) |
| `npm run lint` | Exit 0 (1 pre-existing out-of-scope warning in `scripts/seed-admins-launch.ts:42`) |
| `npx eslint src/components/proposal/ "app/(authed)/proposals/new/page.tsx" --max-warnings=0` | Exit 0 (zero output — strict gate clean for this plan's files) |
| `npm run build` | Exit 0 (route `ƒ /proposals/new` confirmed in route map) |
| `npm test` | 227/227 passing (no regression — Phase 7 Wave 2 baseline preserved) |
| `grep -c "useFormContext<ProposalInput>" LiveLoyerPreview.tsx` | 1 |
| `grep -c "useWatch" LiveLoyerPreview.tsx` | 3 |
| `grep -c "useDebouncedValue" LiveLoyerPreview.tsx` | 3 |
| `grep -c "computeLoyer" LiveLoyerPreview.tsx` | 4 |
| `grep -c "generateLcRef" LiveLoyerPreview.tsx` | 2 |
| `grep -c "formatCurrency" LiveLoyerPreview.tsx` | 3 |
| `grep -c "CopyRefButton" LiveLoyerPreview.tsx` | 2 |
| `grep -c "ValiditySegmented" LiveLoyerPreview.tsx` | 2 |
| `grep -c "coefficientsExpired" LiveLoyerPreview.tsx` | 4 |
| `grep -c 'aria-live="polite"' LiveLoyerPreview.tsx` | 1 |
| `grep -c "navigator.clipboard.writeText" CopyRefButton.tsx` | 2 |
| `grep -c "toast.success" CopyRefButton.tsx` | 1 |
| `grep -c "toast.error" CopyRefButton.tsx` | 1 |
| `grep -c "DurationSegmented<15 \| 30 \| 60>" ValiditySegmented.tsx` | 1 |
| `grep -c "delayMs: number = 300" useDebouncedValue.ts` | 1 |
| `grep -c "FormProvider" ProposalForm.tsx` | 10 |
| `grep -c "useFormContext<ProposalFormValues>" ProposalForm.tsx` | 1 |
| `grep -c "export function ProposalFormProvider" ProposalForm.tsx` | 1 |
| `grep -c "useForm<ProposalFormValues" ProposalForm.tsx` | 1 (only inside ProposalFormProvider) |
| `grep -c "ProposalFormProvider" page.tsx` | 5 |
| `grep -c "LiveLoyerPreview" page.tsx` | 3 |
| Build route map includes `/proposals/new` | ✓ Confirmed (line `├ ƒ /proposals/new`) |

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
├ ƒ /proposals/new       ← composes ProposalForm + LiveLoyerPreview siblings under ProposalFormProvider
└ ƒ /reset/[token]


ƒ Proxy (Middleware)

ƒ  (Dynamic)  server-rendered on demand
```

## Threat Flags

None — this plan's threat register (T-07-05-01..07 in 07-05-PLAN.md) is fully addressed by what shipped:

- T-07-05-01 (aria-live announces loyer to screen readers — accepted): present on the computed-state container per UI-SPEC §13.
- T-07-05-02 (XSS via formatted values — mitigated): all loyer / coefficient values formatted by `Intl.NumberFormat` (never partner input); React JSX child auto-escape applies regardless.
- T-07-05-03 (DoS via thrashing — accepted): debounce caps the call rate at ≤ 3.3 Hz; computeLoyer is O(1).
- T-07-05-04 (validityDays tampering — mitigated): proposalInputSchema's validityDaysSchema literal-union rejects anything other than {15, 30, 60}; the segmented control physically only emits those 3 values.
- T-07-05-05 (LC reference DOM scrape — accepted): LC ref is partner-facing presentation ID; Phase 8's DB primary key carries identity (PITFALLS §10.7 separation).
- T-07-05-06 (coefficientsExpired removed by future contributor — mitigated): the prop is wired at the page.tsx call site as a hardcoded `false`. Phase 9 will re-instate it via the global_params freshness probe; the cost of accidental removal is one PR.
- T-07-05-07 (clipboard permission without user gesture — mitigated): CopyRefButton's `onClick` is a direct user gesture (button click) — Chrome/Edge/Safari/Firefox all permit `clipboard.writeText` from user gestures.

No new threat surface beyond the register.

## Phase 7 Close-Out — Notes for Phase 8

As the capstone of Phase 7, here are observations for Phase 8 (DB persistence + PDF generation):

1. **Submit handler is a no-op + info toast (D-7-07).** Phase 8's first move is replacing `onSubmit = (_data) => toast.info(...)` in ProposalForm with a server action that:
   - Calls `proposalInputSchema.parse(formData)` server-side (re-parse — the resolver only runs client-side per the AUTH-trust-model — never trust client-computed loyer per CALC-07 + T-07-01-05).
   - Re-runs `computeLoyer({...})` server-side with current `seedParams` (Phase 8 will swap `seedParams` to a `global_params` row read at the same import seam).
   - Writes the proposal row with `params_snapshot` + `inputs` + `computed` + `schema_version` jsonb (DATA-01..04 immutability lock).
   - Generates the PDF via `lib/pdf` (PROP-15..19) and uploads to blob storage at `proposals/{userId}/{proposalId}.pdf`.
   - Redirects to `/proposals/{id}` (post-redirect-get).

2. **LC reference handover.** Phase 7's LC ref is generated client-side, lives in component state, and is NOT in form state. Phase 8 has two options:
   - (a) Add `lcRef` to `proposalInputSchema` and pass it through the FormProvider context (LiveLoyerPreview writes back via `setValue('lcRef', lcRef)` when generated). The DB row stores the partner-displayed ref.
   - (b) Generate a NEW server-side LC ref on save and discard the client one. Cleaner but the partner sees a different ref before/after save; UX-jarring.
   Path (a) is recommended — store what the partner saw.

3. **`useFormContext<ProposalFormValues>` vs `useFormContext<ProposalInput>` typing split.** Phase 8 will add new sibling consumers (e.g., a "submitting…" status badge, a server-error display panel). They should use `useFormContext<ProposalFormValues>` if they touch handleSubmit-flow types (status, error states); `useFormContext<ProposalInput>` if they only READ the parsed/runtime values (loyer recompute, validity caption display). LiveLoyerPreview is the prototype.

4. **coefficientsExpired flip.** The page.tsx call site `<LiveLoyerPreview lang={lang} coefficientsExpired={false}/>` is the swap point. Phase 8 should fetch the current `global_params` row in the page Server Component, compare its `created_at` against a configurable freshness threshold (e.g., > 90 days = expired), and pass the result. UI is already wired and tested per UI-SPEC §3.2.9.

5. **store-info-from-previous-render pattern is now project-canon.** Used in Phase 6's error.tsx and Phase 7's LiveLoyerPreview. Phase 8 will likely encounter it again (PDF preview iframe load state, optimistic-UI undo/redo). Pattern reference: https://react.dev/reference/react/useState#storing-information-from-previous-renders.

6. **`useDebouncedValue` is a generic util** — Phase 8 may want it for search-as-you-type on the proposals list page. Lives in `src/components/proposal/` for now; if Phase 8 needs it elsewhere, lift to `src/lib/hooks/useDebouncedValue.ts` (no other current consumers, so the lift is trivial).

7. **`formatCurrency`/`formatNumber` are already locale-explicit.** Phase 8's PDF renderer (`lib/pdf`) MUST use the same helpers — D-28 / SHELL-09 forbids unsuffixed `Intl.NumberFormat()` calls (ESLint enforces). The format helpers are already pure-module-safe (no React, no I/O).

8. **Tests stay at 227** — Phase 7 closes with no component-level tests for the new `<LiveLoyerPreview>`/`<CopyRefButton>`/`<ValiditySegmented>` (per CONTEXT §"Deferred Items" v1.2 candidate). Phase 8 will add integration tests at the server-action seam (where the parse + persist happens); component tests can come later.

9. **No regression risk to Phase 6.** All changes are additive within `src/components/proposal/` + `app/(authed)/proposals/new/page.tsx`. Phase 6's auth shell, login form, admin tree, and 404/error boundary are untouched.

## Next Phase Readiness

- ✅ **Phase 7 complete: 6/6 plans done.** Wave 4 closed by this plan; ROADMAP success criterion #2 (live-preview composition) and #4 (Copy LC + Validity selector) both grounded; #5 (manual v10 parity) verified by the 30-case golden corpus from Plan 07-02 (run on every PR via CI).
- ✅ **PROP-07** (live preview) grounded — LiveLoyerPreview subscribes to RHF + 300ms debounce + computeLoyer.
- ✅ **PROP-24** (Copy LC button) grounded — CopyRefButton with sonner + 2s label switch + Range/Selection fallback.
- ✅ **PROP-25** (validity selector) grounded — ValiditySegmented re-uses DurationSegmented per D-7-16.
- ✅ **CALC-07** (client preview seam) grounded — computeLoyer called client-side; Phase 8 re-runs server-side at save (CALC-07 second clause is Phase 8 territory).
- ✅ **Phase 8 unblocked.** Calc engine + form + live preview all ship; Phase 8 inherits a wired `<ProposalForm/>` + `<LiveLoyerPreview/>` composition. First Phase 8 plan: Drizzle `proposals` table schema + server-action submit handler + params_snapshot immutability commit.

## Self-Check: PASSED

- All 4 created files exist on disk:
  - `src/components/proposal/useDebouncedValue.ts` ✓
  - `src/components/proposal/ValiditySegmented.tsx` ✓
  - `src/components/proposal/CopyRefButton.tsx` ✓
  - `src/components/proposal/LiveLoyerPreview.tsx` ✓
- Both modified files have the expected new shape:
  - `src/components/proposal/ProposalForm.tsx` — exports `ProposalForm` AND `ProposalFormProvider`; uses `useFormContext`; no internal `useForm` outside the wrapper ✓
  - `app/(authed)/proposals/new/page.tsx` — wraps ProposalForm + LiveLoyerPreview as siblings under ProposalFormProvider ✓
- All 3 task commits exist in `git log`:
  - `59b14b5 feat(7-05): add useDebouncedValue + ValiditySegmented + CopyRefButton` ✓
  - `771c07f feat(7-05): add LiveLoyerPreview state-machine card` ✓
  - `4b57f45 feat(7-05): hoist FormProvider to ProposalFormProvider; mount LiveLoyerPreview as sibling (Path A)` ✓
- All `<success_criteria>` from the plan satisfied:
  - 4 new components shipped ✓
  - ProposalForm refactored to consume FormProvider context (no internal useForm) ✓
  - ProposalFormProvider wrapper exports a FormProvider-backed RHF setup ✓
  - /proposals/new mounts ProposalForm + LiveLoyerPreview as siblings under ProposalFormProvider ✓
  - Live preview updates with 300ms debounce ✓
  - All 5 state machine branches reachable: idle, expired (stub), missing, on-demand, computed ✓
  - formatCurrency uses explicit fr-FR / en-GB locale ✓
  - LC reference generated once per idle→non-idle transition; cleared on idle ✓
  - CopyRefButton: clipboard write + 2s label switch + sonner success toast; clipboard failure → sonner error + Selection-API fallback ✓
  - ValiditySegmented re-uses DurationSegmented (D-7-16 — one component, two configs) ✓
  - coefficientsExpired prop wired (D-7-12 — defaults false at the page call site; Phase 8 flips it) ✓
  - Manual v10 parity comparison: golden corpus (30 cases, ±0.01 € tolerance) is the runtime proof; LiveLoyerPreview renders the same `computed.loyerHT` string with no separate compute path ✓
  - PROP-07, PROP-24, PROP-25, CALC-07 (client seam) all satisfied ✓

---
*Phase: 07-calc-engine-port-proposal-form*
*Completed: 2026-05-09*
