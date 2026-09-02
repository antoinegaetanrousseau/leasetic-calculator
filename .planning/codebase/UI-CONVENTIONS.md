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
**Reused verbatim by:** `31-UI-SPEC.md` § Spacing Scale ("Reused verbatim from `30-UI-SPEC.md`")

**Rule.** Spacing uses Tailwind's own 4px-step utility scale directly at every call site. This
includes the 12px / 20px / 28px steps, which the generic GSD default scale
`{4, 8, 16, 24, 32, 48, 64}` omits. Every value the rule sanctions divides evenly by 4.

> **Correction (2026-09-02).** This record previously asserted that "no non-4px-multiple literal
> exists on any surface audited." **That is false.** Roughly 57 sub-grid literals ship in product
> code today — `py-2.5` (10px) and `gap-1.5` (6px) in `ParametresForm.tsx`, `PartnersList.tsx` and
> others. UIC-01 is a **rule for new and edited code**, not a description of the current tree.
> Treat existing sub-grid literals as drift to correct when touching the surface, not as evidence
> the rule does not hold. Optical nudges (`mt-0.5` on an icon, to center it against a text line)
> are a separate category and are not governed by this rule.

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
**Reused verbatim by:** `31-UI-SPEC.md` § Typography ("Reused verbatim from `30-UI-SPEC.md`'s
ratified 3-weight system (400 / 600 / 700)")

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

**Font load vs. sanctioned weights.** `app/layout.tsx:20-25` loads Inter at
`['300','400','500','600','700']`. UIC-02 sanctions 400 / 600 / 700 for a spec to declare.
**300 is loaded and genuinely unused** (zero occurrences in product code).

> **Correction (2026-09-02).** This record previously said "300 and 500 are loaded but unused."
> **The claim about 500 is false.** `font-medium` (500) appears about **69 times in product
> code**, including the base class string of `button.tsx` — so *every button in the app* renders
> at 500 — and it is also set deliberately on product labels (`MergeDialog.tsx:132`,
> `PartnersList.tsx:95`, `CompanyRelationsTable.tsx:120`). Do not cite UIC-02 as authority for
> "500 is unused," and do not flag a surface for rendering 500. Whether the ratified exception
> should therefore read *four* weights (400/500/600/700) rather than three is unresolved — see
> [OPEN-D](#open-items).

> **Provenance note (unresolved).** `30-UI-SPEC.md` attributes UIC-01 and UIC-02 to "the
> operator's D-B decision", but **no record defining `D-B` exists anywhere in this repository** —
> it appears only at `30-UI-SPEC.md` lines 51, 82, and 102, and not in the file's own superseded
> first version (`ed3e587`, 2026-08-31). The unrelated `D-B1`/`D-B2`/`D-B3` identifiers in Phase 8
> are persistence decisions and are **not** the same series. The ratification itself is not in
> doubt — the spec records it, and Phase 31 relied on it — but its date and defining text are not
> recoverable from the repo. Treat this file as the operative record until a `D-B` origin
> document surfaces. See [Open Items](#open-items).

---

## UIC-03 — Color: one accent, 60/30/10, explicit reserve list

**Status:** Ratified exception — single surviving brand color
**Ratified:** 2026-08-29 (explicit decision, cited in `30-UI-SPEC.md` § Color)
**Recorded in:** `30-UI-SPEC.md` § Color (2026-09-01)
**Reused verbatim by:** `31-UI-SPEC.md` § Color ("same tokens, same 60/30/10 discipline")

**Rule.**

| Role | Token | Share |
|---|---|---|
| Dominant | `--background` | 60% |
| Secondary | `--card` / `--sidebar` | 30% |
| Accent | `--primary` = `--brand-accent` (`#01cc72`) | 10% |

`--primary` is the **one** brand color that survived the ReUI/base-maia migration, by the
2026-08-29 decision. The accent budget is enforced by an **explicit reserve list per surface** —
never the phrase "all interactive elements":

- the single primary page-level CTA per surface,
- `StatusChip variant="active"`,
- `SectionTitle`'s default bullet,
- the sidebar's active-item indicator.

Every other button — secondary actions, cancel, filter clears, row overflow triggers — uses
`Button variant="outline"` or `variant="ghost"`. A phase may declare a **stricter** budget than
this (Phase 31 did: near-zero `--primary`, because nothing on that surface is a create action);
it may not declare a looser one without a recorded reason.

**Legacy aliases are not primary tokens.** `--paper`, `--surface`, `--gd`, `--teal`, `--gold`,
`--danger` are kept only so ~400 pre-migration call sites keep working; they resolve to the
shadcn/ReUI tokens. **New code reads the shadcn tokens directly** (`bg-background`,
`text-foreground`, `bg-card`, `text-muted-foreground`, `bg-primary`, `text-destructive`,
`bg-success/15 text-success-foreground`). Note `--teal` now aliases `--muted-foreground` — it is
not a second brand color post-migration, so there is no second-accent carve-out to claim.

---

## UIC-04 — `--radius` is pinned; `.card` derives its radius from the token

**Status:** Locked (documented incident)
**Recorded in:** `app/globals.css:66-74` (the token) and `app/globals.css:260-272` (`.card`);
restated as LOCKED in `31-UI-SPEC.md` § Container Radius

**Rule.** `--radius: 0.625rem`. This single value drives the entire derived scale
(`--radius-sm` … `--radius-4xl`) through the `@theme inline` multiplier block
(`app/globals.css:484-485`: `--radius-xl = ×1.4`, `--radius-2xl = ×1.8`).

**Do not change `--radius` or the multiplier block** without re-checking the top of the scale
against a real form. The in-file comment records why: it was previously `1rem`, chasing a
"large radius" brand parameter, which inflated every step by 60% — `rounded-4xl` became 41.6px
and every `Input`/`InputGroup` rendered as a pill.

**`.card` tracks the token, never a literal.** `.card` is `border-radius: var(--radius-2xl)`
(= 18px) with `padding: 28px`. The in-file comment records why this too was a fix: `.card` once
declared a literal 16px while shadcn's own `Card` was `rounded-2xl`, and three metric tiles sat
above a section card at a visibly different radius on the home page.

> Container radius **across** the app is currently split and is a live open item, not a settled
> rule — see [Open Items](#open-items). UIC-04 governs `--radius` and `.card` specifically.

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

**This is forward-only.** Existing `window.confirm()` and hand-rolled dialog call sites
(`DeleteButtonClient`, `PartnerRowActions`, `CreatePartnerForm`'s dirty-form confirm,
`CreatePartnerModal`) are **unchanged and out of scope**. The coexistence of both patterns is
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
(`Shell.tsx:109` — `max-w-[1100px] px-6 pt-6 pb-8`). Do **not** add a nested `<main>` or a
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

### OPEN-A — Container radius is split (18px vs 24px), pending the app-shell refresh phase

Two container radii currently ship side by side:

| Surface | Radius | Kind |
|---|---|---|
| Phase 30 `.card` (client book, client detail, admin companies) | 18px (`--radius-2xl`) | Token-derived |
| Phase 31 pair-review card + its two new dialogs | `rounded-[24px]` | Literal, decoupled from `--radius` |

The 24px literal matches the vendored `app-shell-1` block
(`src/components/blocks/app-shell-1/components/app-shell.tsx:60-64`) and was a locked
orchestrator decision for Phase 31. **Controls are explicitly not part of it** — buttons, badges,
radio items and inputs inside those dialogs keep their `--radius`-derived shadcn defaults.

This is a **deliberate, documented, short-term inconsistency**, not a defect. The two container
radii will visibly differ until the deferred **app-shell refresh phase** (`31.1-app-shell-refresh`)
formalizes a named container-radius token and back-applies it. Do not "fix" the divergence
mid-phase, and do not promote either value to a project-wide rule here — that naming is the later
phase's job. Both values remain subject to UIC-04: neither may be achieved by changing `--radius`.

### OPEN-B — `D-B` has no origin record in the repo

The decision ID `D-B`, which UIC-01 and UIC-02 are attributed to, is referenced only inside
`30-UI-SPEC.md` and is defined nowhere. Its ratification date is therefore unrecoverable from the
repo. If the operator's original decision record surfaces, add its date and text to UIC-01 and
UIC-02 and remove this item.

### OPEN-D — Is the ratified weight exception three weights or four?

UIC-02 records **three** (400 / 600 / 700), inherited from `30-UI-SPEC.md`. But weight **500**
ships pervasively (~69 product-code occurrences; every `Button` carries it via `button.tsx`'s base
class), and is set deliberately on some product labels rather than only inherited from primitive
chrome. Two readings, unresolved pending an operator decision:

1. The exception is really **four weights** (400/500/600/700) and Phase 30's prose understated it.
2. The exception is **three declarable weights**, with 500 arriving through shadcn primitive
   defaults — in which case a hand-written `font-medium` on a product label is drift to correct.

Until this is settled: **do not flag a surface for using 500**, and do not cite UIC-02 as evidence
that 500 is unavailable. The three-weight exception to the two-weight review threshold stands
either way — this question is about the exact count, not about whether the exception exists.

### OPEN-C — Deferred app-shell directives

Carried by Phase 31's research session and explicitly deferred to `31.1-app-shell-refresh`:
breadcrumbs in the shell header, convergence toward the vendored `app-shell-1` sidebar block,
shrinking the brand logo, and fixing the collapsed-sidebar layout. Not conventions; not in force.

---

## Sources

| Document | Contributes |
|---|---|
| `.planning/phases/30-company-contact-registry/30-UI-SPEC.md` | UIC-01 … UIC-10 (origin), OPEN-B |
| `.planning/phases/31-reconciliation-engine-proposal-extraction/31-UI-SPEC.md` | Verbatim reuse evidence; OPEN-A, OPEN-C |
| `app/globals.css` | UIC-04 (`--radius` incident, `.card` rule, multiplier block) |
| `app/layout.tsx` | UIC-02 (Inter weight load) |
| `src/components/ui/icons.tsx` | UIC-07 (two-tier vocabulary) |

Phase UI-SPECs remain the historical record of each phase's own contract. This file records only
what was ratified or established as applying **beyond** the phase that first wrote it down.
