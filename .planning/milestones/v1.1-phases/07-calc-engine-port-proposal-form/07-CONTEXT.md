# Phase 7: Calc Engine Port + Proposal Form — Context

**Gathered:** 2026-05-08
**Status:** Ready for planning
**Inherits from:** Phase 6 CONTEXT (06-auth-shell), Phase 5 UI-SPEC, 07-UI-SPEC.md (this phase's design contract — already produced 2026-05-08)

<domain>
## Phase Boundary

Deliver the v10 calculation engine as a pure-TS module and the partner-facing proposal entry form on top of the Phase 6 `(authed)` shell. Form is fully validated and computes a live `loyer` preview, but performs **NO database write** (PROP-09 is Phase 8) and **NO PDF generation** (PROP-15..19 are Phase 8).

**In scope (14 requirements: CALC-01..08 + PROP-01, 06, 07, 08, 24, 25):**
- `src/lib/calc/` — pure-TS calc module with no React, no I/O, no side effects, ported from v10's `calcRent()` / `tKey()` / `getValidity()`. Module exports `computeLoyer`, `lookupCoefficient`, `tKey`, `isOnDemand`, plus Zod input schemas. Server- and client-callable; same module both sides (CALC-07: client preview only, server recomputes on save).
- Zod schemas at the calc-engine boundary (CALC-04) — the same `proposalInputSchema` consumed by the form (RHF resolver) and the future Phase 8 server route.
- `app/(authed)/page.tsx` — REPLACES Phase 6's placeholder body with a hero greeting + "Nouvelle proposition" CTA + empty-state placeholder list shell (PROP-01). Real list rows ship Phase 8.
- `app/(authed)/proposals/new/page.tsx` — proposal entry form (15 fields, 4 cards, two-column desktop layout with sticky live-preview right column).
- `<ProposalForm>` client component — RHF + Zod, blur-time `.invalid` red-ring validation per Phase 6 form contract (PROP-08).
- `<LiveLoyerPreview>` — sticky preview card with loyer, LC reference + Copy button, validity selector (PROP-07, PROP-24, PROP-25).
- ≥30 golden test cases in CI, asserted to the centime (CALC-06 + PITFALLS §8.4).
- All v10 self-checks ported as Vitest tests where applicable: `assertCalc` (formula, 6+ extended fixtures) and `assertValidity` (whitelist behaviour, 6 fixtures). `assertEscape` is not ported — JSX escapes by default; CALC-05 satisfied for the two suites that map to v1.1 reality (see §"Self-check porting scope" below).
- 26 new i18n keys × 2 languages (52 entries) per 07-UI-SPEC §8.

**Out of scope for this phase (deferred to Phase 8 or later):**
- Submit handler that persists to DB + generates PDF (PROP-09 → Phase 8).
- `proposals` / `global_params` / `audit_log` tables (DATA-01..12 → Phase 8 or 9).
- Proposal detail page `/proposals/{id}` and PDF preview embed (PROP-09..23, PROP-26 → Phase 8).
- Proposals list with real data, search, pagination (PROP-02..05, PROP-20 → Phase 8).
- Duplicate / soft-delete UI (PROP-21..22 → Phase 8).
- Admin coefficients / partner-list / audit UI (ADMIN-01..09 → Phase 9).
- Coefficients-expired live-preview state machinery (UI-SPEC D-7-12 simplification): Phase 7 wires the state UI per spec but does not implement Q-mismatch detection — that requires `global_params` from Phase 8.
- LocalStorage form-state draft / unsaved-changes guard (UI-SPEC D-7-15: deferred to v1.2 candidate).

</domain>

<decisions>
## Implementation Decisions

### Phase 7 calc-engine decisions (gathered 2026-05-08 — newly locked)

- **D-1 (Golden test sourcing — CALC-06):** Parametric enumeration with **fixture coefficients embedded in the test file** (same approach as v10's `assertCalc` lines 1924–1929). The corpus enumerates 4 tranches × 3 durations = 12 happy-path cases, plus 8 boundary cases (≤25 000 null tranche, =25 001 t1 floor, =50 000 t1 ceiling, =50 001 t2 floor, =100 000, =100 001, =250 000, =250 001), plus 4 on-demand variants (above max-amount), plus 6 edge cases (0, NaN, negative, Infinity, fractional, very large). Math-derived expected values via `+(amount * (1 + comm/100) * coeff / 100).toFixed(2)`. **No v10 dependency at test time** — the file `Matrice_2026_THE_Leasetic-v10.html` is the *source* for the formula, not a runtime oracle. Total ≥30 cases satisfies CALC-06 with margin.
- **D-2 (Seed coefficients data source — CALC-08, DATA-12 alignment):** Single typed constant exported from `src/lib/calc/seed-params.ts` containing the v10-baseline coefficient set (4 tranches × 3 durations), commission percent, and max-amount. **Phase 7's calc engine imports it for live-preview; Phase 8's drizzle seed migration imports the SAME constant** — single source of truth across phases. Values may be PLACEHOLDERS clearly marked `// TODO: confirm against v10 baseline before CUT-06` until Antoine provides canonical values; CUT-06's "Vérifier les coefficients" flow at production cutover is the verification gate. Note: v10's HTML does NOT contain a canonical baseline — the real coefficients lived per-partner in `localStorage` under key `lt_coeffs`. Antoine to provide before Phase 8 ships, or extract from a known-good partner's `localStorage`.
- **D-3 (Calc module shape — CALC-01):** Granular split inside `src/lib/calc/` directory (matches Phase 5's scaffolded `.gitkeep` directory; ARCHITECTURE §1.1's bullet "calc.ts (ported v10 engine)" is a logical reference, not a literal one-file mandate):
  - `src/lib/calc/index.ts` — public API barrel (`computeLoyer`, `lookupCoefficient`, `tKey`, `isOnDemand`, re-exports schemas)
  - `src/lib/calc/seed-params.ts` — typed constant (D-2) + Zod validator
  - `src/lib/calc/schema.ts` — `proposalInputSchema`, `coefficientsSchema` (Zod, shared client+server per SHELL-11 / D-29 from Phase 6)
  - `src/lib/calc/tranche.ts` — `tKey(amount)` + `tLabel(key)` (lookup maps; `tLabel` returns i18n keys, not strings)
  - `src/lib/calc/coefficients.ts` — `lookupCoefficient(coefficients, trancheKey, duration)` (the Q-table read)
  - `src/lib/calc/formula.ts` — `applyFormula({amount, comm, coeff}) → number` (the multiplication kernel; pure)
  - `src/lib/calc/calc.test.ts` (or `calc.golden.test.ts`) — the golden corpus + assertCalc/assertValidity ports

  Public consumers (form + future Phase 8 server route + future `lib/pdf`) only import from `@/lib/calc` (the barrel). Each file stays ≤ ~80 lines; barrel re-exports keep imports clean.
- **D-4 (Numeric type discipline — CALC-08, PITFALLS §3.5 alignment):** Calc engine's public signatures use **strings at the boundary** (Postgres-numeric-compatible from day 1):
  ```ts
  computeLoyer({
    amountHT: string,           // "75000" — partner-typed digits, post-format-strip
    durationMonths: 36 | 48 | 60,
    validityDays: 15 | 30 | 60
  }): {
    loyerHT: string,            // "1771.88" — fixed 2 decimals
    coeff: string,              // "2.2500" — fixed 4 decimals
    trancheKey: 't1' | 't2' | 't3' | 't4' | null,
    isOnDemand: boolean,
    lcRef: string               // "LC-12345"
  }
  ```
  Internally parses to JS Number for the arithmetic (IEEE 754 is exact for these magnitudes — formula `a × (1 + comm/100) × coeff / 100` with `a < 1e9` has zero observable drift), formats back to fixed-decimal strings via a single helper. Phase 8 swaps NO signatures — the calc engine's interface is already DB-string-compatible; Phase 8 just adds DB read/write around it. PITFALLS §3.5's "Decimal not Number" rule is satisfied by typing the boundary as string (the round-trip-safe representation), not by adding a Decimal library — the precision discipline lives in the *type contract*, not in a runtime dep. A single `parseNumeric` / `formatNumeric` helper lives in `lib/calc/formula.ts` (or imports from `lib/db/numeric.ts` if Phase 5 already established that file — planner verifies).

### UI / Form decisions (carried forward from 07-UI-SPEC.md — already locked)

The 16 design-discretion decisions D-7-01 through D-7-16 in 07-UI-SPEC §10 are all locked. Highlights for downstream agents:

- **D-7-01:** Two-column desktop layout (form ~640px / sticky preview ~360px); single-column ≤900px viewport.
- **D-7-02:** 300ms debounce on live-preview re-compute (RHF `useWatch` → `useDebouncedValue`); planner can tune to 150–200ms if user testing surfaces sluggishness.
- **D-7-03:** Live-preview is its OWN sticky card in right column (deviation from v10's embedded inline preview).
- **D-7-04:** LC reference + Copy button + Validity selector all live INSIDE the live-preview card (properties-of-output, not inputs).
- **D-7-05:** Per-proposal validity defaults to 30 days (matches v10 line 1405).
- **D-7-06:** PROP-06's "required `client_name`" satisfied by tightening v10's existing `client-co` (Société cliente) field to required-by-Zod-schema. NO new field added. Open Q2 (REQUIREMENTS.md / STATE.md) resolved by reading v10 lines 545–551.
- **D-7-07:** Phase 7 form submit is a no-op + info-toast (`proposal.toast.phase8.placeholder`). No DB write, no navigation. Per-PROP-09 deferral.
- **D-7-08:** Native `confirm()` for reset (v10 parity, line 2146); no styled `<ConfirmModal>` primitive in Phase 7.
- **D-7-09:** Amount field uses `type="text" inputMode="numeric"` (NOT `type="number"`) — required for U+202F narrow-no-break-space thousand-separator formatter.
- **D-7-10:** Tranche badge auto-shows below amount input when `amount > 25000 && tKey(amount) !== null`.
- **D-7-11:** Max threshold for "on demand" hardcoded in Phase 7 from `lib/calc/seed-params.ts` (D-2) since `global_params` table doesn't exist yet. Phase 8 swaps to a `global_params` read at the same import seam (`getMaxAmount()` helper exposed from calc barrel).
- **D-7-12:** Coefficients-expired UI state SPECIFIED in 07-UI-SPEC §3.2.9 but NOT WIRED in Phase 7 (no Q-mismatch detection until Phase 8 ships `global_params`). Planner stubs the state machinery so Phase 9 can flip a flag.
- **D-7-13:** `partner-co` and `partner-name` pre-filled from `session.user.displayName` (heuristic split per spec); user can edit.
- **D-7-14:** Form column 640px / preview column 360px / 24px gap = 1024px total (within Phase 6's 1100px main-content max-width).
- **D-7-15:** No localStorage form-state draft (PITFALLS §10.8 carryover discipline).
- **D-7-16:** `<DurationSegmented>` and `<ValiditySegmented>` are ONE shared component with two configurations.

### Self-check porting scope (CALC-05 reading)

CALC-05 says "all v10 self-check fixtures (`assertCalc 6/6`, `assertEscape 8/8`, `assertValidity 6/6`) pass as Vitest tests." Phase 7's port:

- **`assertCalc` (6 fixtures) → ported and extended.** The 6 v10 cases land in the golden corpus; D-1's parametric enumeration extends to ≥30. Becomes `calc.golden.test.ts`.
- **`assertValidity` (6 fixtures) → ported verbatim.** Tests `validityDaysSchema` whitelist behaviour (15/30/60 default 30 on missing/invalid). Becomes part of `schema.test.ts`.
- **`assertEscape` (8 fixtures) → NOT ported.** Rationale: v10's `escapeHtml()` exists because v10 builds DOM via `innerHTML` template strings; Phase 7 builds DOM via React JSX which escapes children automatically. There is no `escapeHtml` function to test. Documented in `calc.test.ts` as a comment block citing v10 lines 2002–2020 + the React-JSX-escapes-by-default invariant. CALC-05 satisfied for the two applicable suites; the third is structurally obsoleted by the framework switch.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & milestone (must read for context)
- `.planning/PROJECT.md` — project overview, v1.1 milestone goal, frozen invariants (calculation formula `loyer = montantHT × (1 + commission/100) × coefficient / 100` is non-negotiable)
- `.planning/REQUIREMENTS.md` §CALC (lines 64–73) and §PROP — the 14 active requirements for this phase. Open Q2 (client_name field) resolved in 07-UI-SPEC §1.4 / D-7-06; no longer blocks.
- `.planning/ROADMAP.md` §"Phase 7: Calc Engine Port + Proposal Form" (lines 74–85) — phase goal and 5 success criteria
- `.planning/STATE.md` "Locked architectural decisions" (lines ~74–94) and Decisions Log — every architectural lock relevant to v1.1

### Phase 7 design contract (must read)
- `.planning/phases/07-calc-engine-port-proposal-form/07-UI-SPEC.md` — full visual + interaction contract, including the 15-field form layout, live-preview composition, copy table (FR/EN), iconography list, 26 new i18n keys, and the 16 D-7-NN discretion decisions

### Architecture (must read before planning)
- `.planning/research/ARCHITECTURE.md` §1.1 — component boundaries (`lib/calc` is "Pure TS module, ported v10 engine. No I/O, no React.")
- `.planning/research/ARCHITECTURE.md` §1.3 — end-to-end data flow for create proposal (Phase 7 covers steps 1–2; 3+ are Phase 8)
- `.planning/research/ARCHITECTURE.md` §2.1 — full route layout including `(authed)/proposals/new`
- `.planning/research/ARCHITECTURE.md` §2.5 — params_snapshot immutability anchor (Phase 8 territory but referenced for forward compatibility)

### Pitfalls (each item is a Phase 7 acceptance gate)
- `.planning/research/PITFALLS.md` §3.5 — `numeric`/`decimal` vs `double precision` for monetary values. Phase 7 satisfies via D-4 (string-typed boundary).
- `.planning/research/PITFALLS.md` §3.6 — seed coefficients before first user can log in. Phase 7's `seed-params.ts` (D-2) is the input to Phase 8's seed migration.
- `.planning/research/PITFALLS.md` §8.4 — calculation drift between v10 and v1.1. Mitigated by D-1's ≥30 golden corpus + ±0.01 € tolerance.
- `.planning/research/PITFALLS.md` §10.6 — single Zod schema imported on both client and server (already a Phase 6 D-29 commitment; Phase 7 extends to the proposal schema).
- `.planning/research/PITFALLS.md` §10.7 — "regenerate PDF" temptation. Phase 7 has no PDF, but the calc engine signature must NOT be the surface that "re-runs" against an existing proposal — that violates immutability.
- `.planning/research/STACK.md` §"Validation/parsing of v10 calc inputs" — wrap calc engine input shape in Zod schema; fail loudly on bad input.

### Phase 6 deliverables (preserve invariants)
- `.planning/phases/06-auth-shell/06-CONTEXT.md` D-29 — RHF + Zod, schema imported on both client and server. Phase 7 extends pattern to `proposalInputSchema`.
- `.planning/phases/06-auth-shell/06-CONTEXT.md` D-28 — `lib/i18n/format.ts:formatCurrency(value, lang)` / `formatDate(date, lang)`. Phase 7 reuses for live-preview loyer display (explicit `'fr-FR'` / `'en-GB'`, narrow-no-break-space comma decimal in FR).
- `.planning/phases/06-auth-shell/06-UI-SPEC.md` — Form Validation Visual Contract (`.invalid` red ring); inherited unchanged.
- `.planning/phases/05-bootstrap-deploy/05-UI-SPEC.md` — design token spine (colors, spacing, typography, button variants, focus-ring contract). Phase 7 references; does NOT redefine.

### v10 source (must read)
- `Matrice_2026_THE_Leasetic-v10.html` — source of truth for the formula, tranche boundaries, validity logic, and the 15-field form structure. Specific line refs:
  - **lines 1195–1211:** `tKey(a)` (tranche resolution by amount thresholds 25k/50k/100k/250k) and `tLabel(k)` (FR-language labels — Phase 7 ports lookups, returns i18n keys)
  - **lines 1395–1422:** `getMax`, `getValidity`, `isOnDemand`, `calcRent` — the formula heart. Frozen; do not modify the math.
  - **lines 1425–1454:** `updateInline` — the inline preview state machine (idle / expired / on-demand / computed / missing). Phase 7's `<LiveLoyerPreview>` mirrors this state machine in React.
  - **lines 1922–1965:** `assertCalc()` self-check — fixture coefficients, 6 cases. Source for D-1's parametric enumeration (extend, not replace).
  - **lines 2027–2053:** `assertValidity()` self-check — 6 cases. Port verbatim to Vitest.
  - **lines 2092–2111:** `<PhoneInput>` and `<SirenInput>` formatter logic (digit-strip + group-separator). Port to React form components per 07-UI-SPEC §5.4 / §5.5.
  - **lines 2175–2185:** Amount input formatter (U+202F narrow-no-break-space, right-anchored thousand grouping) and tranche badge auto-show logic. Port to `<NumberInput>` per 07-UI-SPEC §3.2.5.
  - **lines 545–551:** Form fields `client-co` (Société cliente — required), `client-name` (recipient), `client-role`, `client-tel`, `client-email`, `client-siren`. Phase 7 keeps all 6 + adds the partner cards + project-params card.
  - **line 1741:** LC reference generation `'LC-' + Math.floor(Math.random() * 90000 + 10000)`. Port to `<LiveLoyerPreview>` per 07-UI-SPEC §3.2.9 (generated once on idle→non-idle transition; held until reset).

### Source code already in place (Phase 5 + Phase 6)
- `src/lib/calc/.gitkeep` — Phase 5 scaffolded directory (D-3 confirms directory pattern)
- `src/lib/i18n/dictionaries.ts` — 225 keys × 2 langs (Phase 6); Phase 7 adds 26 new keys per 07-UI-SPEC §8 → final 251 × 2 = 502 entries
- `src/lib/i18n/format.ts` — `formatCurrency(value, lang)` / `formatDate(date, lang)` / `formatNumber(value, lang)` (Phase 6 D-28). Phase 7 reuses for live-preview loyer.
- `src/lib/i18n/index.ts` — `t(key, ...args)` server-component-safe helper.
- `src/components/ThemeToggle.tsx`, `LocaleToggle.tsx`, `Topbar.tsx`, `UserMenu.tsx` — Phase 6 components; mounted in `(authed)/layout.tsx` unchanged. Phase 7's pages mount inside this shell — do NOT re-render these.
- `src/lib/auth/require.ts` — `requireUser()` defence-in-depth. Phase 7's `(authed)/proposals/new/page.tsx` calls it independently.
- `src/lib/db/index.ts` — Drizzle client memoized singleton. Phase 7's calc engine does NOT import this (calc is pure); Phase 8 adds DB calls around it.
- `globals.css` — `.card`, `.btn-green`, `.btn-out`, `.btn-navy`, `.dg`/`.db`/`.db.on`, `.ieu`, `.invalid`, `.fld`, `.ctitle`, `.yn-btn` styles. Phase 7 verifies present (likely already ported from v10 in Phase 5/6); adds whatever's missing in plan 07-XX (07-UI-SPEC §3.2.4 acceptance gate).
- `eslint.config.mjs` — `no-restricted-syntax` rule blocking hardcoded JSX text (Phase 6 06-02). Phase 7's new copy MUST go through `t()`; ESLint will catch violations.
- `vitest.config.*` — Phase 5's Vitest config; Phase 7 adds the golden corpus test file under the same harness.

### Open questions (none blocking)
- Open Q2 ("v10 client_name field") — RESOLVED 2026-05-08 in 07-UI-SPEC §1.4 / D-7-06 / D-7-NN. No action needed.
- Seed coefficient canonical values (D-2 placeholder) — Antoine to provide before Phase 8 ships; CUT-06 verifies. Does not block Phase 7 plans.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (Phase 6 → Phase 7)
- **Form pattern:** Phase 6's `LoginForm.tsx` and `SetPasswordForm.tsx` (`app/(public)/`) are the reuse template — RHF v7.75.0 + `@hookform/resolvers/zod` v5.2.2 + shared schema imported from `lib/auth/schemas.ts`. Phase 7's `<ProposalForm>` follows the same pattern with `lib/calc/schema.ts` as the shared schema source.
- **Toast wiring:** `<Toaster richColors position="top-right" />` mounted in `app/layout.tsx` (Phase 5). Phase 7 fires 4 new toast events per 07-UI-SPEC §7 — no new wiring needed, just `toast.success(t(key))`.
- **i18n harness:** `t('key', ...args)` server-side via `lib/i18n/index.ts`; client-side via the same module (Next.js dual-environment safe). Phase 7's 26 new keys go into `lib/i18n/dictionaries.ts` per Phase 6 D-26 ESLint rule.
- **Format helpers:** `formatCurrency(amount, lang)` returns formatted string with explicit `'fr-FR'` / `'en-GB'` locale; uses Intl.NumberFormat. Phase 7's `<LiveLoyerPreview>` calls this directly on `loyerHT` string (parse to Number for Intl, then format).
- **Cookie/auth context:** `requireUser()` from `lib/auth/require.ts` — call once at the top of `app/(authed)/proposals/new/page.tsx`. Returns `{ id, email, displayName, name }` for `partner-co` / `partner-name` pre-fill (D-7-13).

### Established Patterns
- **Atomic per-task commits** with phase summary as durable record (PROJECT.md §"How we work" + STATE.md Session Notes pattern).
- **Pure-module discipline** (`lib/storage`, `lib/db`, `lib/i18n`, `lib/theme`): every Phase-5/6 module exports a small public API, hides implementation, has its own test file. `lib/calc` follows the same shape.
- **ESM static imports** (Phase 5 lesson 05-03): no `require()` in adjacent .ts; Vitest ESM context will reject it. Phase 7's calc test file uses static imports throughout.
- **Single-source Zod schemas** (Phase 6 D-29 / SHELL-11) imported on both client and server.
- **Bounded error redaction** (Phase 5 `classifyError`): irrelevant to calc engine (no DB), but applies if Phase 7 ever introduces a server route handler. Phase 7 does NOT.

### Integration Points
- **Phase 6 `(authed)/layout.tsx`:** Phase 7 mounts `app/(authed)/page.tsx` (replace body) and `app/(authed)/proposals/new/page.tsx` (new route) inside this shell. Topbar's `pageTitle` slot fed by each page server component (Phase 6 pattern).
- **Phase 6 `app/(authed)/page.tsx` placeholder body:** Phase 7 REPLACES the body. Topbar / sidebar / footer untouched. The `dashboard.greeting` + `dashboard.subtext` keys already exist (Phase 6 06-06); Phase 7 adds `dashboard.cta.new.proposal`, `dashboard.recent.title`, `dashboard.empty.title`, `dashboard.empty.body`.
- **Phase 5 `globals.css`:** v10 base styles (`.card`, `.fld`, `.invalid`, `.ieu`, `.dg`/`.db`/`.db.on`, `.yn-btn`, `.ctitle`) MAY already be ported from Phase 5 UI-SPEC carry-over. Plan 07-XX verifies — if missing, port them as the first plan task (UI-SPEC §3.2.4 acceptance gate).
- **Vitest harness (`vitest.config.*`):** Phase 7's golden corpus runs in the same suite as Phase 5/6 tests. CI gate (Phase 5 05-05) already runs `vitest` on every PR — golden drift = red CI.
- **ESLint config:** `no-restricted-syntax` (Phase 6 06-02) blocks hardcoded JSXText; Phase 7's 26 new keys must all flow through `t()` or the rule fires.
- **i18n parity proof:** `_EnHasAllFrKeys` compile-time type from Plan 06-02 stays green. Phase 7's 26 new keys MUST exist in BOTH `fr` and `en` dictionaries.
- **TypeScript path alias:** `@/lib/calc` resolves to `src/lib/calc/index.ts` (the barrel). Verify `tsconfig.json` `baseUrl`/`paths` match Phase 5 idiom.

</code_context>

<specifics>
## Specific Ideas

- The user prefers Sensible-Default execution (UI-SPEC produced 0 questions because CONTEXT was complete enough). Phase 7's CONTEXT inherits that discipline: every D-7-NN decision in 07-UI-SPEC and every D-1..D-4 decision here is committed as locked. Planner does NOT reopen them.
- `assertCalc`'s use of fixture coefficients (not real ones) is deliberate v10 design — it means the formula is testable without ever reading partner data. Phase 7 inherits this discipline: golden tests use fixture coefficients in the test file, the calc engine itself reads from `seed-params.ts` (D-2) or future `global_params` (Phase 8). The two paths NEVER intersect — there is no "test against the real seed values" coupling.
- v10's calculation formula is **frozen** (PROJECT.md "Out of scope: Changing the calculation formula or tranche boundaries — frozen, partner expectations + business rules"). Phase 7's calc engine is a **port**, not a redesign — every numeric constant traces back to a v10 line ref.
- Phase 7's submit semantics (D-7-07: no-op + info toast) are deliberate. The form proves it produces valid data; Phase 8 wires the persistence. Do NOT add a "save draft to localStorage" workaround — PITFALLS §10.8 + UI-SPEC D-7-15.
- Open Q2 (client_name field) is settled by tightening v10's existing `client-co`. No schema migration needed in Phase 8 to "add a field"; the field exists in v10 and remains in v1.1.
- LC reference generation lives in the live-preview component (UI-SPEC §3.2.9), NOT in the calc engine. The calc engine is pure (no `Math.random()`); the LC ref is a UI-side concern that gets surfaced into the form state and persisted by Phase 8 alongside the proposal row.

</specifics>

<deferred>
## Deferred Ideas

- **`global_params` table + seed migration (DATA-05, DATA-06, DATA-12)** — Phase 8 territory. `lib/calc/seed-params.ts` is the single source feeding Phase 8's idempotent seed migration (PITFALLS §3.6).
- **Coefficients-expired Q-mismatch detection** — UI-SPEC §3.2.9 specifies the visual; Phase 7 stubs the state, Phase 8 wires `global_params` reads, Phase 9 ships the admin coefficients editor that produces new-row events.
- **`getMaxAmount()` swappable seam** — Phase 7 reads from `seed-params.ts`; Phase 8 swaps to a `global_params` read at the same import path. UI-SPEC D-7-11.
- **Decimal library adoption** (decimal.js / big.js) — D-4 says NO. Reconsider only if Phase 8's Drizzle round-trip surfaces drift the string-boundary discipline doesn't catch.
- **LocalStorage form-state draft** — UI-SPEC D-7-15 + PITFALLS §10.8. v1.2 candidate if user complaints surface.
- **Unsaved-changes guard** (browser `beforeunload` warning when navigating away mid-form) — UI-SPEC §9 destructive-action table notes "v1.2+ candidate".
- **`assertEscape` as a React-render test** — omitted per Self-check porting scope above; revisit only if a future phase introduces unsafe HTML insertion patterns.
- **Caret positioning in formatted inputs** — UI-SPEC §5.4 accepts caret-at-end as v1.1 trade-off; v1.2 candidate if user complaints surface.
- **Unit tests for the React components** (`<ProposalForm>`, `<LiveLoyerPreview>`, `<CopyRefButton>`) — Phase 7's testing focus is the calc engine (CALC-05/06). Component tests are a v1.2 candidate; manual Chrome+Edge testing per PROJECT.md "How we work" suffices for v1.1 ship gate.

</deferred>

---

*Phase: 07-calc-engine-port-proposal-form*
*Context gathered: 2026-05-08*
*4 new gray-area decisions (D-1 through D-4), 16 inherited UI-SPEC decisions (D-7-01 through D-7-16), 14 requirements in scope.*
