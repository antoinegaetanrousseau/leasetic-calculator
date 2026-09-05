# ReUI Pro blocks — audit

> **Decision: DELETED 2026-09-05** (Antoine, 2026-09-05 — D-36-02, Phase 36 HOUSE-04)
>
> The vendored tree at `src/components/blocks/` was deleted in full: **25 block
> directories, 152 files, 1.1M**, measured at execution time on 2026-09-05. The
> `18 blocks / 104 files / 816K` figures in the body below are the 2026-08-31 audit
> count, taken **before** Phase 34 plan 34-03 vendored seven more blocks
> (`solution-crm-1`, `solution-crm-2`, `solution-crm-3`, `solution-crm-4`,
> `solution-crm-5`, `solution-crm-6`, `solution-users-2`). The body's figures stay as
> the historical record; this note is the current truth.
>
> Rationale, in one sentence: reinstall is one command, so there is no cost to
> deleting and no value in keeping any block "just in case" beyond this document.
> Reinstall command: `npx shadcn@latest add @reui/<block-name>`.
>
> **Not deleted:** `src/components/reui/` and `src/components/ui/` are live and
> untouched.
>
> **Known residual:** the two `'src/components/blocks/**'` entries in
> `eslint.config.mjs`'s `ignores` arrays (lines 37 and 139) are left in place —
> Phase 36 does not edit that file. They are now inert globs matching nothing,
> recorded here so a future maintainer removes them deliberately rather than
> discovering them as mystery cruft.
>
> The mapping, the two structural constraints (Frame vs Card) and the mis-picks
> below are exactly what makes this deletion reversible.

> Audited 2026-08-31 against the live ReUI registry (Pro licence, `REUI_LICENSE_KEY`).
> Written because the finding is not visible from the tree: **all 18 vendored blocks
> under `src/components/blocks/` are dead.** Nothing outside that directory imports
> any of them. 816K across 104 files, zero wired.

Nothing was deleted. (True as of 2026-08-31; superseded by the decision record above.) This is the record so the mapping, the two structural
blockers, and the mis-picks do not have to be rediscovered.

## Reinstalling is one command

Every block here comes back with:

```bash
npx shadcn@latest add @reui/<block-name>
```

So there is no cost to deleting one later, and no value in keeping a block
"just in case" beyond the note in this file.

## The two structural constraints

**1. ReUI splits blocks across two design surfaces: `Frame` and `Card`.**

`Frame` (`src/components/reui/frame.tsx`) is ReUI's shell for dense, tool-like
panels — shared borders via `stacked`, padding off via `dense`, radius via
`--frame-radius`. `Card` is the shadcn one this app already uses via `.card`.

The choice gates the catalogue rather than just the look. Searching the registry
for `stats` blocks with `surface: card` returns **zero results** — the entire
stats category is Frame-only. Eight of the vendored blocks use Frame, so
adopting any of them introduces a third surface language alongside `.card` and
shadcn `Card`.

Current decision: no blanket rule. Each block is previewed and judged on its own
(Antoine, 2026-08-31).

**2. The ReUI DataGrid cannot drive this app's lists.**

DataGrid is page-index: a TanStack table instance plus `recordCount`, with
pagination expressed as page number and size. Every list in this app is
**cursor-based** server-side (`buildListResponse`, `nextCursor`, the `Load More`
button). That mismatch is why Phase 4 built the admin tables on the shadcn
`Table` primitive with shared chrome in `src/components/ui/table-chrome.ts`.

It makes `data-grid-base-1` and `data-grid-filtering-1` (96K) permanently
unusable as-is, and it is the reason `dashboard-1`, `dashboard-2` and
`profile-1` cannot be adopted whole either — all three embed a DataGrid.

## The inventory

| block | size | surface | what it actually is | verdict |
|---|---|---|---|---|
| `wizard-1` | 36K | card | 3-step wizard: stepper, per-step validation, review summary | **best fit** — structurally the proposal flow |
| `auth-1` | 36K | card | split-screen login, form + editorial photo panel | **best fit** — `/login`, `/reset`, `/invite` are still v10 |
| `stats-1` | 16K | frame | 4-col KPI cards, trend badges, per-card overflow menu | marginal — closest to the home tiles, but Frame, and we have no trends |
| `timeline-1` | 16K | frame | activation timeline, collapsible milestone cards | marginal — could suit coefficient history |
| `empty-state-1` | 16K | none | "Connect source" / "Upload CSV" + quick-guide rows | marginal — wrong actions, structure reusable |
| `form-1` | 36K | card | profile form: avatar upload, date pickers, combobox chips | marginal — not the proposal form |
| `profile-1` | 112K | frame | account shell: vertical tabs + team DataGrid | over-scoped; `/parametres` is a single form |
| `app-shell-1` | 56K | none | icon-rail sidebar, workspace switcher, nested nav | **superseded** — `AppSidebar`/`Shell` were hand-written from it and shipped |
| `gantt-3` | 128K | card | gantt chart | irrelevant, and the single largest block |
| `dashboard-1` | 100K | frame | fulfillment ops: capacity charts, donut, exception grid | far off; embeds DataGrid |
| `dashboard-2` | 72K | card | ops console: sparkline cards + module DataGrid | far off; embeds DataGrid |
| `data-grid-base-1` | 48K | frame | CRM grid, paginated | **blocked** — page-index pagination |
| `data-grid-filtering-1` | 48K | frame | filtering variant of the above | **blocked** — same |
| `navbar-1` | 28K | none | top navbar | the app uses a sidebar shell |
| `dialog-1` | 20K | none | duration picker: start/end time selects + presets | irrelevant — no time ranges anywhere |
| `list-1` | 16K | frame | a KPI metric **card**, not a list of records | mis-picked on name |
| `settings-1` | 16K | mixed | integrations picker wizard step | mis-picked on name |
| `stats-4` | 16K | frame | CRM leads card: range filter, progress bar, 30-segment meter | mis-picked on name |

## The mis-picks are the lesson

Four of the eighteen do not do what their name implies. `list-1` is a KPI card.
`settings-1` connects third-party integrations. `stats-4` is a CRM leads meter.
`empty-state-1` offers "Upload CSV".

This is the same failure mode as picking icons by name — the Iconly search that
returned a down-arrow named "close down" for the query `close`. The fix is the
same: read `get_block`'s description, or open its `previewUrl`, before adopting.
Preview URLs follow `https://reui.io/preview/base/<block-name>`.

## What is installed underneath

The blocks depend on a ReUI component layer that IS installed, in
`src/components/reui/`: `frame`, `badge`, `alert`, `stepper`, `timeline`,
`phone-input`, `filters`, plus `data-grid/` and `gantt/`. These are usable
independently of any block — `Stepper` in particular is a candidate for the
wizard's step indicator without adopting `wizard-1` wholesale.

Note `blocks/wizard-1` and `blocks/timeline-1` still import `lucide-react`,
which the app otherwise no longer uses. They are vendored, so they were left
alone during the icon migration; adopting either means converting its icons to
`@/components/ui/icons`.

## If picking this up again

The two worth wiring are `auth-1` and `wizard-1`, and `auth-1` is the safer
first move: the public pages are the last surface still on v10, so it is
greenfield with nothing to regress, it shares the app's Card surface, and it is
the first thing a partner ever sees. It ships Google and Apple sign-in buttons
that would need removing — this app is email plus password via Better Auth.
