# Code Connect templates — Leasétic Design System

Parserless Code Connect templates (`.figma.ts`) mapping components in the
[Leasetic Design System Figma file](https://www.figma.com/design/OUl6fQsessGM6AcnSau98g/Leasetic-Design-System?node-id=4-1407)
(sections 03 · Components and 04 · App components) to their ReUI code equivalents
(Base UI · Maia · Neutral preset · HugeIcons · Inter).

## Status

**Written, not published.** Publishing Code Connect requires a Dev or Full seat on a
Figma **Organization or Enterprise** plan — the current plan doesn't include it (both
`figma connect publish` and the MCP mapping tools return a seat/plan error). Until then,
the same mapping lives in each Figma component's **description** (visible in Dev Mode on
any plan): source path, component name, and import statement.

## When the plan allows publishing

1. Components must be published to a team library.
2. Add `@figma/code-connect` to the repo and publish these templates.
3. `_manifest.json` lists every template with its Figma node ID, source path, and
   component name.

## Conventions

- Import paths use the shadcn-style ReUI registry layout: `@/components/ui/<name>`.
  These components are **not yet scaffolded** in this repo — add them from the ReUI
  registry (Pro license) with the Neutral preset. `StatCard` and `EmptyState` are
  app-level components to build on top of ReUI primitives.
- Toast maps to `sonner`'s `toast.*()` functions, per ReUI.
- Variant mappings follow the Figma sets: e.g. Input `Size MD/LG → size="md|lg"`,
  `State=Error → aria-invalid` + helper text, Alert `Tone Danger → variant="destructive"`.
