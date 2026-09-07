# Phase 28: ReUI / base-maia Design-System Migration — Context

**Gathered:** 2026-08-31 (retro-documented)
**Status:** Complete — documented after the fact

> **This phase was executed outside the GSD workflow.** The 23 commits on
> `migration/phase-0-baseline` were written across several ad-hoc sessions with no
> CONTEXT, no PLAN files, and no VERIFICATION. This document is written *after*
> the work, at v1.6 kickoff, so the `phases/` decision log does not have a
> 23-commit hole in it. There are deliberately **no `28-NN-PLAN.md` files** —
> fabricating plans for work already done would misrepresent the record.

<domain>
## Phase Boundary

Migrate the app off the hand-built "v10" component and styling system onto
**ReUI components with the shadcn `base-maia` style**, under a standing
instruction from Antoine:

> "For now, let's only use ReUI components and design system and only keep the
> logo and accent color from LEASETIC" — and later, "adopt the block structure too."

**In scope:** token spine, T1 primitives, app shell, admin tables, all six forms,
icon library, brand assets, and the CSS cascade that binds them.

**Out of scope:** any behavioural change to the calc engine, PDF rendering,
auth, or the persistence layer. This was a presentation-layer migration; the
1213-test suite passing unchanged throughout was the standing proof of that.
</domain>

## Locked decisions

| ID | Decision | Why |
|---|---|---|
| D-28-01 | `--radius` dropped to `0.625rem`; the duplicate `:root` radius scale deleted | Two radius scales were live simultaneously — home-page cards visibly disagreed with every other card. Not caught by any gate; found only by screenshot. |
| D-28-02 | `globals.css` widget rules moved into `@layer components` | Unlayered CSS beats **all** layered CSS regardless of specificity, and Tailwind v4 emits utilities into `@layer utilities`. `.card` was silently overriding every utility a caller passed. |
| D-28-03 | Two rules stay deliberately **unlayered**: the `input.invalid` pair and the `brand-logo-light/dark` picker | Both must beat utilities by design. Documented inline in `globals.css` so a future cleanup doesn't "fix" them. |
| D-28-04 | Icon vocabulary centralised behind `src/components/ui/icons.tsx` | Single edit point for 44 aliases. Proved itself: the library changed twice (lucide → Hugeicons → Iconly) without a single call site moving. |
| D-28-05 | `BrandLogo` height derives from `LOCKUP_ASPECT = 862 / 200` | The official lockup changed aspect ratio from the placeholder; a fixed height would have letterboxed it silently. |
| D-28-06 | Segmented controls are **not** `ToggleGroup` | Six tests pin `aria-pressed`, which ToggleGroup does not emit. Kept as `segmented.ts` class helpers. |
| D-28-07 | Admin tables built on the shadcn `Table` primitive, **not** ReUI `DataGrid` | DataGrid is page-index; every list in this app is cursor-based (`buildListResponse` / `nextCursor`). See `docs/design/reui-blocks-audit.md`. |
| D-28-08 | ReUI `auth-1` adopted on the public pages, then **reverted** | Antoine: "undo, looks bad." Reverted via `git revert` (21b96c4) rather than reset, so `cb0647a` remains cherry-pickable. |
| D-28-09 | All 18 vendored blocks under `src/components/blocks/` kept despite being dead | Antoine: "Delete nothing yet." 816K, zero imports. Recorded in the audit doc; `npx shadcn@latest add @reui/<name>` reinstalls any of them. |

## Carry-forward to v1.6

1. **The list/table architecture is still unsettled** (D-28-07 deferred the real
   decision). v1.6 adds several CRM lists — clients, pipeline, activity — and the
   cursor-vs-page-index question should be answered before, not during.
2. **No browser-level test coverage.** 1213 Vitest tests were green while the
   duplicate radius scale (D-28-01) shipped across five commits. Unit tests
   structurally cannot see it.
3. **Browser verification backlog, never closed:** wizard step 1, `/proposals`,
   coefficients history, `/parametres`, and the six `PartnersList` /
   `LcReferencesList` padding sites changed in `7d5b2e2`.
4. **18 dead blocks** still vendored, pending a delete decision.

## Process lesson

Green gates could not see any of the visual defects in this phase. The duplicate
radius scale, the wrong logo aspect, the inert `color=` props on Hugeicons and
the cascade-layer bug were all found by **looking at the rendered page**, not by
`tsc` / `vitest` / `eslint` / `build`.

A second, sharper lesson: **a build gate that lied.** `npm run build 2>&1 | tail -4
&& echo BUILD_OK` reports `tail`'s exit status, so `BUILD_OK` printed while the
build failed with three errors. Every gate in this phase was subsequently run as
`cmd > log 2>&1; echo "exit $?"` — checking the exit code, never the pipeline.
