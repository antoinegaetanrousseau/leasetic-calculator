# Phase 38: Shell, Dialogs & Visual Conventions - Context

**Gathered:** 2026-09-06
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase closes the visual/accessibility debt the app shell has accumulated: two browser walks
that were started and abandoned (CLOSE-02, CLOSE-08), and the two CSS/primitive defects those
walks keep re-surfacing (GAP-02, GAP-04).

**In scope:** the four requirements CLOSE-02, CLOSE-08, GAP-02, GAP-04 — and only the code they
name (`src/components/ui/dialog.tsx`, `src/components/ui/sheet.tsx`, `app/globals.css`'s
`.btn-out` and focus-ring rules, `src/components/proposals/LoadMoreButton.tsx`), plus the
verification artifacts.

**Out of scope:** any app-wide component refresh. An app-wide small-components pass was raised
during discussion and is deferred in full — see `<deferred>`.

</domain>

<decisions>
## Implementation Decisions

### Walk environment (CLOSE-02 + CLOSE-08)

- **D-38-01: The walk runs against a local production build pointed at the production DB.**
  `npm run build && npm start` on port 3001 — the same setup Phase 37's UAT used. This is the only
  combination where authentication works AND the CSS observed is the real compiled output.

  **Why the alternatives were rejected:**
  - *`next dev`.* Two hazards, both recorded in this project's own history: `.env.local` points at
    prod/main Neon anyway (so it buys no data safety), and running `npm run build` in another pane
    freezes `globals.css` recompiles — the dev server then silently serves stale CSS. For a walk
    whose entire subject is CSS, that failure mode is invisible and fatal.
  - *The `development` Neon branch.* D-36-03 established that app-level login there fails
    (`[Better Auth]: Invalid password`) — it is a copy-on-write fork frozen at 2026-05-27, so its
    credential hashes predate every rotation since. An authenticated walk cannot sign in.

  **Mandatory constraint:** the walk is **read-only**. Wizard step 1 is observed but never
  submitted. No proposal is created, edited or deleted. This is production data.

- **D-38-02: Claude drives the browser via Playwright / Browser MCP.**
  Two consequences the plan must account for:
  - The operator supplies an authenticated session. Claude does not perform the login itself.
  - Claude is adjudicating the visual calls, so the evidence must be reviewable after the fact
    rather than resting on Claude's assertion (see D-38-06).

- **D-38-03: "No flash of light chrome on first paint" is evidenced by a Chrome DevTools
  performance-trace filmstrip, with CPU throttling.**
  This claim is *temporal* — a screenshot of a settled page cannot prove it, and
  `tests/dark-palette.test.ts` already failed to (it asserts CSS declarations exist, not that they
  composite before paint). A throttled trace produces timestamped frames in which a light frame
  preceding a dark one would be directly observable, and it is re-runnable by a later reader.

  **Explicitly rejected:** interval screenshots during a throttled reload (sampling can miss a
  sub-frame flash, yielding absence-of-evidence — the exact weak claim `31.1-VERIFICATION.md`
  refused the first time), and source-level verification of the blocking inline theme script
  (same class of evidence that verifier already declined).

- **D-38-04: Fix first, then walk once.**
  Scouting established that **every CLOSE-08 surface renders a `.btn-out`** — wizard step 1
  (`ProposalForm.tsx:537`), `/proposals` (`LoadMoreButton.tsx:59`, `ExportButton.tsx:92`),
  coefficients history (`HistoryTable.tsx:169`), `/parametres` (`ParametresForm.tsx:582`),
  PartnersList (`PartnersList.tsx:213`). GAP-04 and the walk are therefore not independent:
  changing that padding changes every surface in the walk.

  So GAP-02 and GAP-04 land first; the walk then certifies the state that actually ships.

### Recording and defect policy

- **D-38-05: Walk results are recorded in `38-UAT.md`, following the `37-HUMAN-UAT.md` pattern.**
  One table: surface × theme × result. CLOSE-02 additionally requires
  `31.1-VERIFICATION.md` frontmatter to be flipped from `status: human_needed` to
  `status: passed` — that is mandated by the requirement text and happens regardless.

  *Rejected:* backfilling a `28-VERIFICATION.md`. The walk is performed in Phase 38 and a record
  written into a long-closed phase's directory reads as backdated evidence.

- **D-38-06: Screenshot evidence — commit failures and the CLOSE-02 filmstrip only.**
  Passing surfaces are table rows in `38-UAT.md`. Defects and the filmstrip are committed as
  images, so evidence exists exactly where a reader would question the verdict, without carrying
  ~20 PNGs of repo weight that go stale on the next UI change.

- **D-38-07: Bounded triage for defects the walk surfaces.**
  Phase 28's walk found six defects; this one will probably find some.
  - **Fix in-phase** if it is a token, a spacing literal, a CSS rule, or an i18n string.
  - **File as a requirement for a later phase** if it needs a component change, a new primitive,
    or a data/logic change.

  This is a mechanical test rather than a judgement call, which is what keeps the phase bounded.

- **D-38-08: If the dark-theme or PDF check fails — fix, re-walk, then flip to `passed`.**
  A failure means the shell is genuinely wrong in dark mode. CLOSE-02 names both the file and the
  target status, so a fail cannot simply be recorded and moved past. The repair's size is unknown
  until the failure is seen; the plan should carry this as a checkpoint.

### GAP-02 — dialog close accessible name

- **D-38-09: The primitive reads `document.documentElement.lang`.**
  **This app has no locale context** — no `LangProvider`, no `useLang`; `lang` is threaded
  manually as a prop at every call site. `dialog.tsx` is a vendored primitive with no `lang` prop,
  and `t()` requires a `Lang`. Reading `<html lang>` needs zero prop threading and zero new
  infrastructure, and works at call sites added later.

  **Precondition VERIFIED during discussion:** `src/lib/i18n/actions.ts`'s `setLang` ends with
  `revalidatePath('/', 'layout')`, carrying the comment *"`lang` is an attribute on `<html>` in
  the root layout, so page-scoped revalidation leaves it stale."* `<html lang>` is deliberately
  kept current on locale toggle. The read is sound.

  **Explicitly rejected:** introducing a locale context/provider. It is the architecturally
  correct fix, but it is new infrastructure with app-wide blast radius landing in a phase whose
  goal is closing visual debt. It is its own phase.

- **D-38-10: Scope is `dialog.tsx` + `sheet.tsx`.**
  Both ship the identical `<span className="sr-only">Close</span>`
  (`src/components/ui/dialog.tsx:81`; `src/components/ui/sheet.tsx`), and both are dialog-family
  close controls — which is what the requirement says ("every icon-only dialog close control").
  Not a full sweep of hardcoded a11y strings across the vendored tree.

  **Why this defect survived:** the ESLint `no-restricted-syntax` rule that flags hardcoded JSXText
  would have caught `>Close<` on sight, but `src/components/ui/**` is **excluded from ESLint**
  because it is re-imported wholesale on upgrade. The guard is switched off precisely where the
  defect lives.

- **D-38-11: Durability — a re-import-table row AND a pinning test.**
  Add the row to `UI-CONVENTIONS.md`'s "Vendored ReUI modifications to re-apply after any
  re-import" table, and a test asserting no hardcoded `"Close"` survives in those two files
  (the `tests/container-radius.test.ts` pattern).

  Documentation alone is demonstrably insufficient: that table's own two existing entries each
  record being **measured to recur** — `npx shadcn add -o` clobbered both and they were restored
  by hand.

- **D-38-12: FR/EN verification covers one representative dialog + the mobile sidebar sheet.**
  Four observations. The fix is in the shared primitive, so one dialog proves all eight.

  **Verified during discussion:** no call site overrides the icon-only close. `sheet.tsx`'s only
  consumer is `src/components/ui/sidebar.tsx` (the mobile drawer). The 8 `dialog.tsx` call sites
  (`CreateClientDialog`, `MarkWonDialog`, `MarkLostDialog`, `EditRelationDialog`,
  `EditCompanyDialog`, `ContactFormDialog`, `NextActionDialog`, `MergeDialog`) use `DialogClose`
  only for **labelled** footer Cancel buttons, which are not icon-only and not affected.

### GAP-04 — `.btn-out` and the focus treatment

- **D-38-13: `.btn-out` vertical padding `0.6rem` → `0.5rem`.**
  The problem is larger than UIC-01. `button.tsx` declares an on-grid height scale — `sm` 32px,
  `default` 36px, `lg` 40px. `.btn-out` computes to roughly **39px** (9.6px × 2 + ~20px content),
  so it sits *between* `default` and `lg`, matching neither: a third, undeclared button height
  hiding in `globals.css` and rendering on 17 call sites next to real `Button`s.

  `0.5rem` lands it on ~36px — on-grid per UIC-01 **and** aligned to `Button`'s `default`.

  **Rejected:** `0.75rem`/44px. It is on-grid and meets the WCAG 2.5.5 touch target, but it
  introduces a *fourth* height taller than `lg` — fixing UIC-01 while making the
  undeclared-height problem worse. Also rejected: recording `0.6rem` as a dated exception
  (the D-36-01 evidence-not-change move), because it would ratify a value matching neither the
  grid nor the button scale.

  All 17 call sites get ~3px shorter. D-38-04's fix-first ordering means the walk confirms this.

- **D-38-14: Tokenize the focus ring as `--focus-ring`, with per-theme values.**
  Four hardcoded literals today, all a fixed teal that does **not** adapt to theme:
  `.btn-green/.btn-navy/.btn-out:focus-visible`, `.admin-nav-card:focus-visible` and
  `.stepper-circle:focus-visible` at `0 0 0 3px rgba(45,122,140,0.18)`, plus
  `.search-bar:focus-within` at `0.12`. (`app/globals.css:325`'s destructive ring already uses
  `color-mix` and is a separate case.)

  On dark mode's `#161616` an 18%-opacity teal ring is materially weaker than on light — so the
  focus indicator is at its worst in the theme this phase is walking. A per-theme token kills the
  duplication GAP-04 names *and* lets dark carry a stronger ring.

  **Note for the planner:** the dark value is a new visual decision, not a pure refactor. It is
  in scope under D-38-07 (a CSS rule fix), but it is the one place in this phase that is designing
  rather than closing debt — record the chosen value and its contrast reasoning.

- **D-38-15: Mint UIC-11 — a focus-treatment rule in `UI-CONVENTIONS.md`.**
  There is no focus rule in that file today, which is exactly why four divergent literals
  accumulated unnoticed. UIC-11 gives the next phase's UI checker something to check against
  instead of re-deriving it, and makes a fifth hardcoded ring a violation rather than an accident.

- **D-38-16: Fix the `Charger plus` aria-label / visible-text mismatch.**
  `src/components/proposals/LoadMoreButton.tsx:59` sets a static
  `aria-label={t('proposal.list.load.more', lang)}` while the visible text switches to the loading
  string during a fetch. An `aria-label` overrides visible text for screen readers, so the
  accessible name and visible name disagree mid-load — WCAG 2.5.3 *Label in Name*.

  Cleanest fix: drop the redundant `aria-label` entirely and let the visible label be the
  accessible name in both states. Non-vendored file, no re-import risk.

  This is **not** what GAP-04 asks about (GAP-04 scopes this control to padding + focus treatment).
  It is included under D-38-07's bounded-triage rule as a label fix, in a file the phase is
  already editing.

### AMENDMENT — 2026-09-06, after design-system review (during `/gsd-ui-phase 38`)

Reviewing the Leasetic design-system handoff
(`~/Downloads/Quote/_ds/leasetic-design-system-4b3fa15d-.../tokens/`) at the operator's request
produced findings that **supersede D-38-14 and D-38-15**, and corrected two factual errors in
D-38-13. Recorded here so downstream agents act on the corrected facts.

- **A-38-01 (corrects D-38-13's blast radius).** `padding: 0.6rem 1.5rem` is declared on the
  **shared** `.btn-green, .btn-navy, .btn-out` base rule (`app/globals.css:372-387`), not on
  `.btn-out` alone. The change therefore affects **all three** button classes across **31 files**
  (18 `.btn-green`, 2 `.btn-navy`, 18 `.btn-out`, overlapping), not the 17 `.btn-out` sites
  D-38-13 states. The 0.5rem / ~36px target is unchanged; the surface count the walk must cover
  is larger.

- **A-38-02 (corrects D-38-13's height premise).** That same base rule declares `border: none`,
  while `.btn-out` overrides it with `border: 1px solid var(--border)`. So `.btn-out` is already
  ~2px taller than `.btn-green`/`.btn-navy` today — a second undeclared height inside the same
  base rule. Any focus treatment relying on colouring a border will not work on the two
  borderless classes.

- **A-38-03 (SUPERSEDES D-38-14).** Do **not** mint a `--focus-ring` token. The design system's
  focus token is `--border-focus: var(--color-brand-primary-700)` = `#0b935b`, and — decisively —
  **the app already has `--ring: var(--brand-accent)` (`#01cc72`) declared in BOTH themes**
  (`app/globals.css:52`, `:195`), consumed by **30 files** via
  `focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50`.

  GAP-04's "the standard focus treatment" therefore has an existing referent: `--ring`. The four
  hardcoded `rgba(45,122,140,…)` teal literals are the deviation — that teal appears in neither
  the design system nor the app's token layer. Minting `--focus-ring` would create a *third*
  focus system.

  **Operator decision (2026-09-06): retire the teal; point all four rules at `--ring`.**
  No new token is introduced.

  Measured non-text contrast (WCAG 1.4.11 needs ≥ 3.0), against every dark surface in
  `html[data-theme="dark"]` — `--background` `#161616`, `--card` `#1e1e1e`, `--popover` `#171717`,
  `--secondary`/`--accent`/`--muted-surface` `#262626`:

  | Candidate | white | worst dark |
  |---|---|---|
  | `--ring` `#01cc72` **solid** | 2.13 | **7.12** |
  | `--ring` `#01cc72` @50% (halo only) | 1.51 | 2.79 |
  | DS `--border-focus` `#0b935b` solid | 3.93 | 3.85 |
  | legacy teal @0.18 (today) | 1.27 | **1.19** |

  Because of A-38-02, the treatment must not depend on a border. Use a two-layer `box-shadow`,
  which works identically on all six selectors and — being a shadow — has **zero layout impact**,
  so it does not disturb D-38-13's 36px height math:

  ```css
  outline: none;
  box-shadow: 0 0 0 2px var(--ring),
              0 0 0 5px color-mix(in oklab, var(--ring) 50%, transparent);
  ```

  `color-mix(in oklab, … , transparent)` is an idiom already in this file
  (`app/globals.css:325`, the `--destructive` ring). The solid 2px inner ring is what carries the
  contrast; the outer 5px halo is the soft edge. **Note: this changes ring geometry** from the
  current `0 0 0 3px` — D-38-14's "geometry preserved" no longer holds, and the walk covers it.

- **A-38-04 (amends D-38-15).** UIC-11 is still minted, but its content changes: it declares
  *"focus uses `var(--ring)` via the two-layer shadow above; never hardcode a focus colour."*
  It carries **no contrast-ratio clause**.

- **A-38-05 (scope).** The design system is **explicitly light-mode-only** — `tokens/colors.css`
  states `DARK MODE — PARKED`, and the `tokens/dark-mode.css` it points to is **not present in
  the handoff**. The DS has no dark answer to give, which is why the dark value is derived from
  the app's own `--ring` rather than from the DS.

  **Operator decision (2026-09-06):** the divergence between the app's `--ring` (`#01cc72`) and
  the DS's focus token (`#0b935b`) is **left as-is and deliberately not recorded** as a finding or
  a backlog item. Do not raise it in UI-SPEC, UIC-11, or the deferred list.

### Claude's Discretion

- **i18n key naming for the dialog close label.** Existing convention is a `.aria` suffix
  (`shell.user.menu.aria`, `history.diff.close.aria`, `proposal.search.aria`), and
  `'auth.modal.button.close': 'Fermer'` already exists. A generic `common.close.aria` fits without
  disturbing either. FR/EN parity is enforced at compile time by `_EnHasAllFrKeys`.
- **The exact `--focus-ring` dark-mode value**, subject to D-38-14's requirement that the
  reasoning be recorded.
- **`38-UAT.md`'s internal table shape**, following `37-HUMAN-UAT.md`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design conventions — the rule file this phase is measured against
- `.planning/codebase/UI-CONVENTIONS.md` — canonical, project-wide. **UIC-01** (strict 4px-multiple
  spacing) and **UIC-10** (icon-only buttons carry an explicit `aria-label`) are the two rules this
  phase is measured against. **UIC-06** governs dialog primitives. Its
  *"Vendored ReUI modifications to re-apply after any re-import"* table gains a row per D-38-11,
  and the file gains **UIC-11** per D-38-15. A phase cites a rule ID here rather than re-arguing it.

### Verification debt this phase closes
- `.planning/phases/31.1-app-shell-refresh/31.1-VERIFICATION.md` — currently
  `status: human_needed`; its `human_verification:` block names the two checks CLOSE-02 requires.
  Must read `status: passed` at phase close.
- `.planning/phases/28-reui-design-system-migration/28-CONTEXT.md` §"Carry-forward #3" — the
  authoritative CLOSE-08 surface list: wizard step 1, `/proposals`, coefficients history,
  `/parametres`, and the six `PartnersList` / `LcReferencesList` padding sites changed in `7d5b2e2`.
- `.planning/phases/28-reui-design-system-migration/28-01-SUMMARY.md` §"Process lesson" — why this
  phase is a browser walk and not a test suite: green gates saw none of six visual defects.
- `.planning/phases/37-crm-stack-closure/37-HUMAN-UAT.md` — the artifact pattern `38-UAT.md` follows.

### Files this phase edits
- `src/components/ui/dialog.tsx` (line 81) and `src/components/ui/sheet.tsx` — the hardcoded
  `sr-only` `"Close"`. Both vendored, both excluded from ESLint.
- `app/globals.css` — `.btn-out` (lines 374–405) and the four focus-ring literals
  (lines 398, 443, 467, 516).
- `src/components/proposals/LoadMoreButton.tsx` (line 59) — the aria-label mismatch.
- `src/lib/i18n/dictionaries.ts` — the new close-label key; FR/EN parity is compile-enforced.

### Mechanism references (read before assuming behaviour)
- `src/lib/i18n/actions.ts` — `setLang`'s `revalidatePath('/', 'layout')` is what makes D-38-09
  safe. Do not change its scope without re-checking that decision.
- `app/layout.tsx` (line 56) — sets `<html lang>` and hosts the inline no-flash theme script.
- `src/components/ui/button.tsx` (lines 22–32) — the `sm`/`default`/`lg` height scale D-38-13
  aligns `.btn-out` to.
- `tests/container-radius.test.ts` — the pinning-test pattern D-38-11 reuses.
- `tests/dark-palette.test.ts` — the six pinned dark tokens; proves declarations exist, not that
  they composite. D-38-03 exists because of that limit.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`tests/container-radius.test.ts`** — the established pattern for pinning a vendored-file
  modification against re-import clobber. D-38-11 reuses its shape.
- **`37-HUMAN-UAT.md`** — the most recent walk-recording artifact; `38-UAT.md` follows it.
- **`button.tsx`'s size scale** — an existing on-grid height vocabulary (32/36/40px) that
  `.btn-out` should join rather than continue to sit beside.
- **The `.aria`-suffixed i18n key convention** — already ~8 keys deep, so the new close label has
  a precedent to follow.

### Established Patterns
- **`lang` is threaded as a prop, never contexted.** Confirmed across `ProposalsList.tsx:57`,
  `page.tsx:116`, `ProposalRow.tsx:174` and others. This is deliberate; D-38-09 works around it
  rather than changing it.
- **Vendored directories are ESLint-excluded** (`src/components/ui/**`, `src/components/reui/**`,
  `src/components/blocks/**`). Any lint-based guard is unavailable in exactly the files GAP-02
  touches — hence the test in D-38-11.
- **Gates are verified by exit code, never pipeline output** (Phase 28's second lesson: a
  `build 2>&1 | tail -4 && echo BUILD_OK` reported `tail`'s status while the build failed). Run
  `cmd > log 2>&1; echo "exit $?"`.
- **CI lint gate is `eslint . --max-warnings=0`** — unused vars pass `tsc` and `vitest` but fail CI.
  Run `npm run lint:check` and `build` before pushing, not just typecheck + test.

### Integration Points
- `.btn-out` has **17 call sites** across partner and admin surfaces; D-38-13 changes all of them.
- `dialog.tsx` has **8 call sites**, all Phase 30/34 CRM dialogs. `sheet.tsx` has **one**
  (`sidebar.tsx`, the mobile drawer).
- `31.1-VERIFICATION.md`'s frontmatter is edited by this phase — the only cross-phase file write.

</code_context>

<specifics>
## Specific Ideas

- The walk is driven by Claude, but the operator hands over an authenticated session. Login is not
  something Claude performs.
- Evidence must survive the session: a committed filmstrip and committed failure screenshots, not
  prose asserting a pass.
- The `.btn-out` verdict was decided on the *button-height scale* argument, not the 4px-grid
  argument. If a later phase revisits it, that is the reasoning to engage with.

</specifics>

<deferred>
## Deferred Ideas

**App-wide small-components pass** — raised by the operator during this discussion and redirected
out of Phase 38 as a new capability. Phase 38's boundary is fixed by the four requirements above.
Scoped here so the backlog entry is actionable:

*Systematic audits:*
- **Height/size scale audit** — the `.btn-out` finding generalised: which other components declare
  their own dimensions in `globals.css` instead of using the `Button`/`Input` size scale. This
  phase found one undeclared button height; there are likely more.
- **Chips, badges, status pills** — `StatusChip`, `LanguageChip`, and `.chip-language`, which
  `app/globals.css:407-413` already flags as *"a semantic misuse (that chip has nothing to do with
  language) that should be resolved when the wizard is migrated"*.
- **Icon buttons + row actions** — icon-only controls across tables and rows, audited against
  UIC-10. Same defect class GAP-02 fixes in the dialog primitive.
- **Inputs, selects, search bars** — radius tier per UIC-04, padding per UIC-01, and
  `.search-bar`'s focus treatment, which will diverge from the new `--focus-ring` token once
  D-38-14 lands.

*Specific operator observations (recorded verbatim — each needs scoping before it can be planned):*
- **"Footer"** — aspect not stated; needs the operator to say what is wrong with it.
- **"Dialog component error with header"** — needs reproduction. If this is an actual error rather
  than a styling complaint, it is a bug and deserves its own requirement, not a design pass.
- **"'Dupliquer' CTA make smaller and same row as delete with same ink color"** — fully actionable
  as written. Note the Duplicate/Delete pair was last touched in Phase 37 (WR-01, admin visibility
  on others' proposals).

</deferred>

---

*Phase: 38-shell-dialogs-visual-conventions*
*Context gathered: 2026-09-06*
