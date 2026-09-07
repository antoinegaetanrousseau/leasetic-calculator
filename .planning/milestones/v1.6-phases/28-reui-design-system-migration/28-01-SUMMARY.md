# Phase 28-01: ReUI / base-maia Migration — Summary

**Completed:** 2026-08-31 (retro-documented; work spanned several ad-hoc sessions)
**Branch:** `migration/phase-0-baseline` → `main`
**Scale:** 23 commits · 375 files · +52,503 / −4,416

> Retro-documentation. See `28-CONTEXT.md` for why there are no PLAN files.

## What shipped

| Commits | Work |
|---|---|
| `7acd7cf` `8f955ba` | ReUI + shadcn (base-maia) registry landed, token wiring, green baseline restored, two production bugs fixed |
| `60fb8f9` | Token spine locked; dead v10 code deleted |
| `c7a309e` | T1 primitives onto ReUI + utilities |
| `69c1bb1` `6ba5077` | App shell onto ReUI Sidebar; `app-shell-1` block structure adopted |
| `d5d5f90` | Admin tables onto shadcn `Table` (cursor-compatible; **not** DataGrid) |
| `b02d951` | Design system reset to ReUI/Maia defaults |
| `4939b79` `419e815` `1ca948b` `f47bb10` | All six forms migrated from `.fld` to shadcn `Field` / `InputGroup`; `ParametresForm` 754 → 605 loc, 24 inline styles → 1, 5 bare `<input>` → 0 |
| `a23c17a` | Retired `.ctitle` `.dot` `.ieu` `.suffix` `.tbadge` `.dg` `.db` |
| `7d5b2e2` | `globals.css` widget rules into `@layer components` (600 → 494 lines) |
| `f904e00` | One radius scale, not two |
| `b24eebb` `d13aa9f` | Official Leasétic lockups + propeller mark; height derived from asset aspect |
| `cbefb91` `8831967` | Icon library unified: lucide → Hugeicons → Iconly, behind one central map |
| `e589d4a` | ReUI Pro blocks audit documented |
| `cb0647a` `21b96c4` | `auth-1` adopted on public pages, then reverted at Antoine's call |

## New shared components

- `src/components/ui/SectionTitle.tsx` — absorbed 19 copies of the same header markup
- `src/components/ui/segmented.ts` — `segmentedGroupClass` / `segmentedItemClass`; fixed the hard-coded `repeat(3,1fr)` via `grid-flow-col auto-cols-fr`
- `src/components/ui/icons.tsx` — 44 glyph aliases, the single edit point for the icon vocabulary
- `src/components/ui/table-chrome.ts` — shared admin-table chrome
- `docs/design/reui-blocks-audit.md` — the 18-block inventory, the Frame/Card split, the DataGrid blocker

## Bugs found and fixed en route

1. **`/proposals` and `ProposalsList` disagreed on the live filter param** (`deleted` vs `archived`) — a real production bug, fixed in `6af5efe`.
2. **Two radius scales live at once** — home cards visibly mismatched every other card.
3. **`.card` unlayered, beating every Tailwind utility** — verified against compiled CSS.
4. **Dangling CSS selectors after deletion** (`.ieu.invalid,` / `.dg.invalid,`) would have applied `.btn-green` styling to unrelated elements. Caught by a brace-balance + dangling-continuation check added after the near-miss.
5. **Hugeicons ignores `color`** (renders `stroke="currentColor"`) — all 14 `color=` props were inert.
6. **`auth-grid-background.tsx` ships without `'use client'`** — failed the production build.

## Gates at close

```
tsc    exit 0
vitest exit 0    93 passed | 1 skipped (94 files) · 1213 passed | 4 skipped (1217)
eslint exit 0
build  exit 0
```

All four verified by **exit code**, not by pipeline output — see the process lesson in `28-CONTEXT.md`.

## Not done

- Browser verification of the changed surfaces (see CONTEXT carry-forward #3)
- List/table architecture decision (#1)
- Deletion of the 18 dead vendored blocks (#4) — Antoine: "Delete nothing yet"
