# UI Conventions — Ratified, Project-Wide

**Analysis Date:** 2026-09-02
**Scope:** Visual and interaction conventions that apply across **all** phases, not to one
surface. Companion to [`CONVENTIONS.md`](./CONVENTIONS.md) (code-level: naming, imports, error
handling) — this file is the visual/design-contract half.

## Why this file exists

Several conventions below were ratified project-wide but recorded only as prose inside
`.planning/phases/30-company-contact-registry/30-UI-SPEC.md`. Phase 31's UI checker had to
re-derive the 3-weight typography exception from that sibling phase's document in order not to
report it as a fresh violation of the generic two-weight design-review threshold.

**This file is the canonical source.** A phase UI-SPEC should now *cite* a rule ID here
(e.g. "3 weights per UIC-02") rather than re-argue it. A UI checker that finds a phase using
three font weights, a 12px/20px/28px spacing step, or a `rounded-[24px]` container should read
this file first and only flag a deviation *from what is written here*.

Rules are stated as they were actually ratified. Where a rule's provenance is incomplete in the
repo, that is recorded rather than smoothed over — see UIC-02's provenance note and the
[Open Items](#open-items) section.

---

## Status vocabulary

| Status | Meaning |
|---|---|
| **Ratified exception** | An operator decision that deliberately departs from the generic GSD design-review default. A checker must not flag it. |
| **Established precedent** | Not a formal exception, but a convention set in one phase and reused verbatim in at least one later phase. Deviating from it needs a stated reason in the phase's own spec. |
| **Locked** | A value or rule with a documented incident behind it. Do not change without re-running the check named in the record. |

---

## UIC-01 — Spacing: strict 4px-multiple scale, finer steps than the GSD default

**Status:** Ratified exception (`D-B`)
**Ratified:** date not recorded in-repo — see UIC-02 provenance note
**Recorded in:** `30-UI-SPEC.md` § Spacing Scale (2026-09-01)
**Also applied by:** `31-UI-SPEC.md` § Spacing Scale

**Rule.** Spacing uses Tailwind's own 4px-step utility scale directly at every call site. This
includes the 12px / 20px / 28px steps, which the generic GSD default scale
`{4, 8, 16, 24, 32, 48, 64}` omits. Every value the rule sanctions divides evenly by 4.

> **Correction (2026-09-02).** This record previously asserted that "no non-4px-multiple literal
> exists on any surface audited." **That is false** — sub-grid literals do ship in product code
> today. UIC-01 is a **rule for new and edited code**, not a description of the current tree.
> Treat an existing sub-grid literal as drift to correct when you touch that surface, not as
> evidence the rule does not hold. Optical nudges (a 2px `mt-0.5` centering an icon against a text
> line) are a separate category and are not governed by this rule. To find current drift, search
> the tree rather than trusting a count written here — any number recorded in this file would go
> stale on the next edit.

| Step | Value | Representative usage |
|---|---|---|
| xs | 4px | Icon-to-text gaps inside badges/chips (`gap-1`) |
| sm | 8px | Inline icon+label gaps (`PageHero` eyebrow-to-title, `.search-bar` gap) |
| md | 12–16px | Table header cell padding, form field vertical rhythm, card-to-card stack gap |
| lg | 20px | Table cell horizontal padding (`px-5`), section padding |
| xl | 24px | Shell page padding (`Shell` `<main>` is `px-6`), 2-column grid gap |
| 2xl | 28–32px | `.card` internal padding (28px), `PageHero` bottom margin (`mb-8`) |
| 3xl | 48px | Empty-state vertical padding band |

**Rationale.** `app/globals.css` and the shadcn/base-maia primitives declare no named spacing
tokens. The exception declares the *finer step*, not a departure from multiples of four — so the
underlying discipline the GSD default protects (no arbitrary literals) is still enforced, just at
a 4px rather than an 8px granularity. The base-maia migration introduced no wider scale.

**How to apply.** Use Tailwind spacing utilities. Do not introduce a literal `px` margin/padding
that is not a multiple of 4. A checker should verify the multiple-of-4 property, not membership
in the GSD default set.

---

## UIC-02 — Typography: three font weights (400 / 600 / 700)

**Status:** Ratified exception (`D-B`), **project-wide by explicit operator scope**
**Ratified:** date not recorded in-repo — see provenance note below
**Recorded in:** `30-UI-SPEC.md` § Typography (2026-09-01)
**Also applied by:** `31-UI-SPEC.md` § Typography

**Rule.** Three weights are in active, sanctioned use. This is a ratified exception to the
usual two-weight design-review threshold, and it is **project-wide** — not scoped to the phase
whose spec happens to record it.

| Weight | Role |
|---|---|
| 400 | Body copy, muted/secondary metadata |
| 600 | Row and field emphasis — names, primary table-column values (`font-semibold`) |
| 700 | Page titles (`PageHero`), section eyebrows, table column headers |

**Rationale.** All three are already loaded and already in broad use: `PartnersList`'s name cell
and `ProposalRow` use 600; `PageHero` and `SectionTitle` use 700; the `body` rule uses 400.
Collapsing to two weights would mean editing shipped, working surfaces to satisfy a generic
threshold, not fixing a defect.

**Font load vs. sanctioned weights.** `app/layout.tsx` loads Inter at
`['300','400','500','600','700']`. UIC-02 sanctions 400 / 600 / 700 for a spec to declare.
**300 is loaded and genuinely unused** (zero occurrences in product code).

> **Correction (2026-09-02).** This record previously said "300 and 500 are loaded but unused."
> **The claim about 500 is false.** `font-medium` (500) is used widely in product
> code, including the base class string of `button.tsx` — so *every button in the app* renders
> at 500 — and it is also set deliberately on product labels (`MergeDialog.tsx`,
> `PartnersList.tsx`, `CompanyRelationsTable.tsx`). Do not cite UIC-02 as authority for
> "500 is unused," and do not flag a surface for rendering 500. Whether the ratified exception
> should therefore read *four* weights (400/500/600/700) rather than three is unresolved — see
> [OPEN-D](#open-items).

> **Provenance note (unresolved).** `30-UI-SPEC.md` attributes UIC-01 and UIC-02 to "the
> operator's D-B decision", but **no record defining `D-B` exists anywhere in this repository** —
> it appears only inside `30-UI-SPEC.md`, is defined nowhere, and is absent from that file's own superseded
> first version (`ed3e587`, 2026-08-31). The unrelated `D-B1`/`D-B2`/`D-B3` identifiers in Phase 8
> are persistence decisions and are **not** the same series. The ratification itself is not in
> doubt — the spec records it, and Phase 31 relied on it — but its date and defining text are not
> recoverable from the repo. Treat this file as the operative record until a `D-B` origin
> document surfaces. See [Open Items](#open-items).

---

## UIC-03 — Color: one accent, 60/30/10, per-surface reserve list

**Status:** Ratified exception — single surviving brand color
**Ratified:** 2026-08-29 (explicit decision, cited in `30-UI-SPEC.md` § Color)
**Recorded in:** `30-UI-SPEC.md` § Color (2026-09-01)
**Also applied by:** `31-UI-SPEC.md` § Color

**Rule.**

| Role | Token | Share |
|---|---|---|
| Dominant | `--background` | 60% |
| Secondary | `--card` / `--sidebar` | 30% |
| Accent | `--primary` = `--brand-accent` (`#01cc72`) | 10% |

`--primary` is the **one** brand color that survived the ReUI/base-maia migration, by the
2026-08-29 decision.

**Every surface declares its own accent reserve list, and that list must be exhaustive.** Never
the phrase "all interactive elements." A phase may declare a **stricter** budget than another's;
it may not declare a looser one without a recorded reason. Buttons that are not the reserved
accent use take `Button variant="outline"` or `variant="ghost"`.

> **This record deliberately does not enumerate a project-wide reserve list.** It carried one from
> 2026-09-01 to 2026-09-02 — four items, of which **two were false**: `StatusChip
> variant="active"` is `bg-success/15` (the emerald feedback token, not the brand accent), and the
> sidebar's active-item indicator is `data-active:bg-sidebar-accent`, a neutral grey. The list was
> transcribed from phase prose and never checked against the code, and a Phase 31 spec then
> described itself as "stricter than" a baseline that did not exist. An accent list is a
> per-surface, code-review artifact — it goes stale the moment a primitive changes, and it is
> exactly the kind of claim this file should not make.

**How to derive a surface's reserve list** (do this mechanically; reading the phase's own files
does not work, because most accent arrives through primitive chrome):

1. Ask `app/globals.css` — not memory — which tokens alias `--brand-accent`. There are several
   beyond `--primary`, including ring and sidebar tokens, and the set changes.
2. For each primitive the surface renders, grep that component for utilities built on those
   tokens (`bg-`, `text-`, `border-`, `ring-`).
3. Eliminate the ones whose variant or condition does not occur on this surface, and check the
   global `@layer base` rules, which apply without appearing in any component.

A Phase 31 reserve list derived this way is in `31-UI-SPEC.md` § Color, along with a record of the
four attempts it took to get right.

**Legacy aliases.** `--paper`, `--surface`, `--teal`, `--gold`, `--danger` are kept only so
pre-migration call sites keep working. **New code reads the shadcn tokens directly**
(`bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `bg-primary`,
`text-destructive`, `bg-success/15 text-success-foreground`). Two worth knowing: `--teal` aliases
`--muted-foreground`, so it is not a second brand color and there is no second-accent carve-out to
claim; `--gd` aliases `--brand-accent`, so it *is* the accent under an old name and counts against
a surface's accent budget.

**Dark-mode addendum (added by Phase `31.1-app-shell-refresh`, D-13, 2026-09-02).** The accent is
**unchanged** — `--primary`/`--sidebar-primary` stay `var(--brand-accent)` = `#01cc72` in both
themes. Colibris's own dark-mode accent is a `#009999` teal; that color is **not adopted anywhere**
in this codebase, and `tests/dark-palette.test.ts` enforces it as a standing assertion (any future
introduction of `#009999` fails the build).

Four shell-surface roles carry values sampled from **one operator-supplied screenshot** of
Colibris's dark theme, at `~a shade` confidence — close, not pixel-measured:

| Role | Token(s) | Value |
|---|---|---|
| Page/content background | `--background` | `#161616` |
| Elevated card surface | `--card` / `--sidebar` | `#1e1e1e` / `#161616` (sidebar shares `--background`; Colibris separates it with a border, not a fill step) |
| Card/sidebar edge | `--border` / `--sidebar-border` | `oklch(1 0 0 / 8%)` |
| Secondary text | `--muted-foreground` | `oklch(0.65 0 0)` |

The canonical record of the sampling session is `31.1-UI-SPEC.md` § Dark Mode; `app/globals.css`'s
`html[data-theme="dark"]` block carries the same values with inline provenance comments.

**Three surfaces remain unsampled and are deliberately unchanged**, not silently filled:

- **`--popover`/`--popover-foreground`** (dialog/popover elevation) — no dialog was open in the
  available screenshot.
- **`--input`** (input fill) — no form was visible in the screenshot.
- **`--sidebar-accent`** (sidebar hover/active-item treatment) — no hovered/active nav row was
  visible in the screenshot; this value predates Phase 31.1 entirely and is not a Colibris-parity
  claim either way.

Closure path for each: a second, targeted Colibris screenshot covering that surface, sampled and
back-applied the same way as the four roles above. `tests/dark-palette.test.ts` pins all three
gap tokens' current values as a hard equality assertion — a later fill must consciously edit that
test, not land as a silent side effect of an unrelated change. Record, do not invent — same
register as the [Open Items](#open-items) section.

**Collapsed-sidebar brand badge fill.** The collapsed rail's mark badge uses `bg-sidebar-accent`,
not `--sidebar-primary` (the accent token) — `logo-mark.svg`'s glyph is itself `#01CC72`, the same
color `--sidebar-primary` resolves to, so a primary-filled badge would render the mark invisible
(green mark on a green badge). This is the kind of finding a future phase would otherwise
rediscover by shipping a blank badge; recorded here so it isn't re-derived.

**Shell dimensions (tracked separately from UIC-01's spacing scale).** Sidebar width is **252px**
expanded / **68px** collapsed; header height (`--topbar-h`) is **52px**; the brand lockup is
**120px**, roughly 47% of the expanded sidebar's width — matching Colibris's own proportion. These
four values must stay set in `SidebarProvider`'s inline `style` (`Shell.tsx`), not a `className`:
`SidebarProvider` spreads its own inline style, which outranks an arbitrary-property `className`
targeting the same custom property — the vendored `app-shell-1` block has this latent bug;
Leasétic's `Shell.tsx` documents it and avoids it.

---

## UIC-04 — Two disjoint radius tiers: an explicit per-step control scale, and a named container token

**Status:** Locked (documented incident)
**Recorded in:** `app/globals.css` (control-tier declarations and the `--radius-container*`
ladder), `app/globals.css` (`.card`); originally restated as LOCKED in `31-UI-SPEC.md`
§ Container Radius; revised by Phase `31.1-app-shell-refresh` (`31.1-01-PLAN.md`,
`31.1-04-PLAN.md`) per `31.1-CONTEXT.md` D-01/D-02/D-03.

**The incident this rule exists to prevent.** `--radius` was previously `1rem`, chasing a "large
radius" brand parameter. Every derived step inflated by 60% at once — `rounded-4xl` hit 41.6px
and every `Input`/`InputGroup` rendered as a pill. UIC-04 was Locked at that point specifically to
stop `--radius` (or the `@theme inline` derivation that read it) from being touched without
re-checking the whole scale against a real form.
**The multiplier clause is superseded, not merely worked around.** `--radius-sm` … `--radius-4xl`
are no longer `calc(var(--radius) * n)` expressions — Phase 31.1 replaced that `@theme inline`
derivation with **seven standalone px declarations**. No step derives from `--radius`, and
no step derives from any other step. `--radius: 0.625rem` is still declared (`shadcn add`
regeneration and `sidebar.tsx`'s local `[--radius:var(--radius-xl)]` rebind both expect the token
to exist) but it **drives nothing in the scale any more**. This is what makes the original pill
incident structurally impossible rather than merely avoided: raising `--radius` today cannot
inflate any control corner, because no control corner reads it.

**Control tier — the real, measured value is 26px, not 8px.** `Button`, `Input`, `Select`,
`Badge`, `Toggle`, `Tabs`, `Tooltip`, `InputGroup`, `ButtonGroup`, `Progress`, `Combobox` and the
ReUI `Badge`/`Cascader` all reach `--radius-4xl` (= **26px**) through the `rounded-4xl` utility;
`calendar.tsx` reads `var(--radius-4xl)` as its `--cell-radius`. `--radius-3xl` (22px) is the
other load-bearing step (`toggle-group.tsx`'s four directional corners). ROADMAP criterion 4's
"8px" describes **Colibris's** controls, not Leasétic's — the binding requirement for Phase 31.1
was "keeps its current corner," which is what shipped (zero visual change to any control). A
future phase reading "controls are 8px" here would make a wrong edit; the real number is 26px.

**Container tier — a separate namespace, sharing zero variables with the control tier.**
`--radius-container-xs|sm|md|lg|xl` = 12/16/24/32/40px, with `--radius-container` aliasing
`--radius-container-sm` (= **16px**). Container surfaces read `--radius-container` via the
`rounded-container` utility; control primitives never do, and the reverse never happens either —
the two tiers are structurally disjoint, not merely conventionally separate. What reads it: `.card`
(the shadcn `Card` root), `Dialog`, `AlertDialog`, `Popover`, and Phase 31's `PairReviewCard` (plus
its `MergeDialog`/`KeepSeparateDialog`).

**`.card` still tracks a token, never a literal** — that clause of the original rule stands
verbatim. Only the token changed: `.card` moved from `var(--radius-2xl)` (18px) to
`var(--radius-container)` (16px), closing OPEN-A. The in-file comment still records the original
fix this clause prevents: `.card` once declared a literal 16px while shadcn's own `Card` was
`rounded-2xl`, and three metric tiles sat above a section card at a visibly different radius on
the home page.

**Named exceptions, kept deliberately outside both tiers:**
- `src/components/proposals/EmbeddedPdfPreview.tsx`'s `rounded-[12px]` — frames the PDF page
  surface governed by the Phase 5/8 print invariant (`app/globals.css:214-218`), not a shell
  container. Not subject to `--radius-container`.
- Control-attached menu surfaces (select content, dropdown menus, combobox, cascader) stay on the
  control tier by design — they are chrome attached to a control, not an independent container.

**How to re-verify this rule.** `tests/radius-scale.test.ts` (7 assertions) pins the token-layer
contract: no step derives from `--radius`, the control tier sits at 22px/26px, the four named
primitives and the calendar still reach `--radius-4xl`, and the container ladder stays a separate
namespace. `tests/container-radius.test.ts` (5 assertions) pins the component layer: no container
surface carries a raw px literal outside its documented allow-list, the four container primitives
and `PairReviewCard` read `rounded-container`, the two review dialogs no longer override the
radius, and the control and container tiers stay disjoint. These two suites replace "re-check the
top of the scale against a real form" as the verification instruction — run them, not a manual
form inspection.

---

## UIC-05 — Empty states: `Empty` + `EmptyDescription`

**Status:** Established precedent
**Recorded in:** `30-UI-SPEC.md` § Surface 1 and Component Inventory (2026-09-01)
**Reused by:** `31-UI-SPEC.md` § Empty state

**Rule.** Empty states use shadcn `Empty` / `EmptyDescription` from `src/components/ui/empty.tsx`.
`EmptyDescription` alone, with **no `EmptyTitle`**, is the default shape; add `EmptyTitle` only
when a two-line empty state is genuinely necessary. Pair with an icon from the product icon
vocabulary (UIC-07) and, where a next action exists, a CTA.

**Rationale.** Already shipped in `app/(authed)/proposals/page.tsx` and
`app/(admin)/[adminSegment]/coefficients/HistoryTable.tsx`, both `Empty` + `EmptyDescription`
with no title. Following the precedent avoids introducing a second empty-state markup shape.

**Tone is not universal.** The copy convention ("nothing here yet" + CTA) fits a first-run gap.
A surface whose empty state is a *success condition* (Phase 31's cleared reconciliation queue)
deliberately uses a different tone. Match the meaning, not the template.

---

## UIC-06 — `Dialog` / `AlertDialog` for all new modal and confirm interactions

**Status:** Established precedent, forward-only (originally recorded as assumption A-6)
**Recorded in:** `30-UI-SPEC.md` Assumption A-6 and Component Inventory (2026-09-01)
**Reused by:** `31-UI-SPEC.md` Component Inventory ("2nd real-app adopter after Phase 30")

**Rule.** New code uses the real shadcn primitives:

- shadcn `Dialog` (`src/components/ui/dialog.tsx`) for modal forms — **not** a hand-rolled
  `role="dialog"` with a manual backdrop (the `CreatePartnerModal.tsx` pattern).
- shadcn `AlertDialog` (`src/components/ui/alert-dialog.tsx`) for destructive confirmation —
  **not** `window.confirm()`.

**This is forward-only.** The `window.confirm()` and hand-rolled dialog call sites that predate
this convention are **unchanged and out of scope** (grep for them rather than trusting a list
here — an earlier revision named four and there are more). The coexistence of both patterns is
expected and is **not** an inconsistency for a checker to flag or a planner to "fix" mid-phase.
Migrating them is its own future scope.

---

## UIC-07 — Icons: two-tier vocabulary, do not collapse

**Status:** Established precedent (documented in source)
**Recorded in:** `src/components/ui/icons.tsx` header comment; restated in `30-UI-SPEC.md`
§ Design System
**Reused by:** `31-UI-SPEC.md` ("unchanged two-tier system")

**Rule.**

1. **Product icon vocabulary** — Iconly-sourced, wrapped one-per-file under
   `@/components/ui/icons`. Used for **every page-level icon**: nav, empty states, row actions,
   form field icons.
2. **Hugeicons** (`@hugeicons/react`) — used **only inside** vendored ReUI/shadcn primitive
   chrome (dropdown carets, sidebar rail). `components.json`'s `iconLibrary: "hugeicons"` governs
   regeneration of that chrome, not product icons.

A new product-level glyph is added to the Iconly vocabulary. If the licensed set lacks it,
substitute the nearest licensed equivalent — do **not** reach into Hugeicons for a product icon.

---

## UIC-08 — Absent data renders "—"; a meaningful zero renders "0"

**Status:** Established precedent
**Recorded in:** `30-UI-SPEC.md` § Copywriting Contract (2026-09-01)
**Reused by:** `31-UI-SPEC.md` § Copywriting ("Phase 30 convention: a real count carries
information")

**Rule.**

- **Absent optional data** (e.g. a null SIREN) renders an em dash **"—"** in body content. Never
  blank, never "N/A". Precedent: the `lastActivityAt` fallback in `PartnersList.tsx`.
- **A meaningful zero** (a count that really is zero) renders **"0"** literally. "—" is reserved
  strictly for absent data; a real count carries information and must not be disguised as absent.
- **Headers do not render absent-optional chips at all** — an omitted value is dropped from a
  header rather than shown as "—". Only body content uses the em-dash fallback.

---

## UIC-09 — Pages render inside `Shell`'s capped `<main>`

**Status:** Established precedent
**Recorded in:** `30-UI-SPEC.md` § Surface 0 ("Container convention")
**Reused by:** `31-UI-SPEC.md` ("Container convention (unchanged from Phase 30)")

**Rule.** New pages render directly inside `Shell`'s `<main>`
(`Shell.tsx` — `max-w-[1100px] px-6 pt-6 pb-8`). Do **not** add a nested `<main>` or a
per-page `maxWidth` override.

`app/(admin)/[adminSegment]/partners/page.tsx`'s `<main style={{maxWidth:1280}}>` is a
**pre-existing outlier** from before `Shell` had its own capped `<main>`. It is not a pattern to
copy.

---

## UIC-10 — Icon-only buttons carry an explicit `aria-label`

**Status:** Established precedent — stated as non-optional
**Recorded in:** `30-UI-SPEC.md` § Surface 3

**Rule.** Any icon-only button with no visible text label must set an explicit `aria-label`,
sourced from the i18n dictionary and interpolated with the relevant record where that
disambiguates it (e.g. the contact's name on a row-level delete). Without it the control has no
accessible name.

Precedent: `PartnerRowActions.tsx` already sets
`aria-label={t('admin.partners.action.viewProposals', lang)}` on its icon-only trigger. New
icon-button pairs follow the same rule, not a looser one.

---

## Open Items

These are **live, deliberate open questions**. They are recorded here so a checker does not
report them as violations and a planner does not "settle" them ahead of the phase that owns them.
**None of the below is a rule.**

### OPEN-A — RESOLVED (`31.1-app-shell-refresh`, 2026-09-02): container radius unified at 16px

**Was:** two container radii shipped side by side — Phase 30's `.card` at 18px (token-derived,
`--radius-2xl`) and Phase 31's pair-review card + its two dialogs at a literal `rounded-[24px]`,
matching the vendored `app-shell-1` block. Both values were explicitly parked pending this phase.

**Resolved:** Phase `31.1-app-shell-refresh` (Plans 31.1-01 and 31.1-04) declared a single named
`--radius-container` token (16px, aliasing `--radius-container-sm` from a 12/16/24/32/40 ladder)
and back-applied it to every container surface: `.card`, `Card`, `Dialog`, `AlertDialog`,
`Popover`, and Phase 31's `PairReviewCard` + `MergeDialog` + `KeepSeparateDialog`. The 18px token
and the 24px literal both converged on 16px; the literal is gone entirely — zero `rounded-[24px]`
occurrences remain outside `components/blocks/` (verified, `tests/container-radius.test.ts`
assertion 1). See UIC-04 above for the full rule text this closure now lives under.

The historical table is kept for provenance:

| Surface | Radius (before) | Kind (before) |
|---|---|---|
| Phase 30 `.card` (client book, client detail, admin companies) | 18px (`--radius-2xl`) | Token-derived |
| Phase 31 pair-review card + its two dialogs | `rounded-[24px]` | Literal, decoupled from `--radius` |
### OPEN-B — `D-B` has no origin record in the repo

The decision ID `D-B`, which UIC-01 and UIC-02 are attributed to, is referenced only inside
`30-UI-SPEC.md` and is defined nowhere. Its ratification date is therefore unrecoverable from the
repo. If the operator's original decision record surfaces, add its date and text to UIC-01 and
UIC-02 and remove this item. **Unchanged by Phase `31.1-app-shell-refresh`.**

### OPEN-D — Is the ratified weight exception three weights or four?

UIC-02 records **three** (400 / 600 / 700), inherited from `30-UI-SPEC.md`. But weight **500**
ships pervasively (every `Button` carries it via `button.tsx`'s base
class), and is set deliberately on some product labels rather than only inherited from primitive
chrome. Two readings, unresolved pending an operator decision:

1. The exception is really **four weights** (400/500/600/700) and Phase 30's prose understated it.
2. The exception is **three declarable weights**, with 500 arriving through shadcn primitive
   defaults — in which case a hand-written `font-medium` on a product label is drift to correct.

Until this is settled: **do not flag a surface for using 500**, and do not cite UIC-02 as evidence
that 500 is unavailable. The three-weight exception to the two-weight review threshold stands
either way — this question is about the exact count, not about whether the exception exists.


### OPEN-C — RESOLVED (`31.1-app-shell-refresh`, 2026-09-02): deferred app-shell directives delivered
**Was:** breadcrumbs in the shell header, convergence toward the vendored `app-shell-1` sidebar
block, shrinking the brand logo, and fixing the collapsed-sidebar layout — carried by Phase 31's
research session and explicitly deferred to this phase.

**Resolved:** all four directives shipped. Breadcrumbs render in the shell header (`getRouteMeta`,
FR/EN, current page as non-link text — Plan 31.1-02/03). The sidebar's in-file chevron is deleted;
the header `SidebarTrigger` is now the shell's sole collapse control, focusable and FR/EN-labelled
(Plan 31.1-03/06). The brand lockup shrank 190px → 120px in a 252px sidebar (Plan 31.1-06). The
collapsed rail is fixed: the mark badge and nav icons share a single 33.5px centring axis by
construction (Plan 31.1-06, D-09).

**What was deliberately *not* adopted from `app-shell-1`, and why** — this is the durable half of
the closure, worth recording so a future reader does not re-derive it by copying the vendored
block wholesale:
- **Sidebar widths via `className`.** `app-shell-1/components/app-shell.tsx:28` sets
  `--sidebar-width`/`--sidebar-width-icon` through an arbitrary-property `className`. This is a
  latent bug: `SidebarProvider` spreads its own inline `style`, which outranks a `className` on
  the same custom property, so the vendored pattern can silently fail to apply. `Shell.tsx`
  documents this and keeps the widths in `SidebarProvider`'s own inline `style` instead (252px /
  68px, Plan 31.1-06 D-11).
- **`SidebarRailToggle`.** The vendored block's rail toggle carries `tabIndex={-1}` and a
  hardcoded English label ("Toggle Sidebar") with no i18n. Leasétic's `SidebarRail` keeps the same
  `tabIndex={-1}`/`aria-hidden` posture (excluding it from the accessibility tree by design) but
  the shell's one real collapse control is the header `SidebarTrigger`, which is properly
  FR/EN-labelled — the vendored toggle's English-only label was never adopted anywhere reachable.

---

## Sources

| Document | Contributes |
|---|---|
| `.planning/phases/30-company-contact-registry/30-UI-SPEC.md` | UIC-01 … UIC-10 (origin), OPEN-B |
| `.planning/phases/31-reconciliation-engine-proposal-extraction/31-UI-SPEC.md` | Verbatim reuse evidence; OPEN-A, OPEN-C |
| `app/globals.css` | UIC-04 (`--radius` incident, `.card` rule, explicit per-step scale, `--radius-container` ladder), UIC-03 dark addendum |
| `app/layout.tsx` | UIC-02 (Inter weight load) |
| `src/components/ui/icons.tsx` | UIC-07 (two-tier vocabulary) |
| `.planning/phases/31.1-app-shell-refresh/31.1-UI-SPEC.md` | UIC-04 revision (D-01/D-02/D-03), UIC-03 dark addendum (D-13), OPEN-A/OPEN-C closure |
| `.planning/phases/31.1-app-shell-refresh/31.1-CONTEXT.md` | D-01…D-13 decision record for the app-shell-refresh phase |

Phase UI-SPECs remain the historical record of each phase's own contract. This file records only
what was ratified or established as applying **beyond** the phase that first wrote it down.
