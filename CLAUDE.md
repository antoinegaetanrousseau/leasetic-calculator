# Leasétic Calculator — project instructions

## Design & UI conventions

**Read [`.planning/codebase/UI-CONVENTIONS.md`](.planning/codebase/UI-CONVENTIONS.md) before
reviewing, specifying, or writing any UI.** It is the canonical record of conventions that were
ratified **project-wide**, extracted from phase specs so they are not re-derived per phase.

Design system: shadcn (Base UI-backed) + ReUI registry, `style: base-maia`, `baseColor: neutral`.

### Ratified exceptions — do not flag these as violations

These deliberately depart from generic design-review defaults. They are already approved and
apply project-wide; a phase spec that uses them is **inheriting**, not newly declaring.

- **UIC-02 — four font weights (400 / 500 / 600 / 700).** This is a ratified exception to the
  usual two-weight threshold. A review rule that blocks on "more than 2 font weights" **does not
  apply here.** Weight **500 is sanctioned, not drift** — every `Button` carries it via
  `button.tsx`'s base class, and a hand-written `font-medium` on a product label is allowed.
  Weight 300 is loaded but never rendered. (OPEN-D closed 2026-09-03 by operator decision.)
- **UIC-01 — 4px-multiple spacing scale**, finer than the `{4,8,16,24,32,48,64}` default (it also
  uses 12 / 20 / 28px). It is a rule for new and edited code, **not** a description of the current
  tree — sub-grid literals still ship in places and are drift to correct, not proof the rule is
  dead. Icon optical nudges (`mt-0.5`) are outside its scope.
- **UIC-03 — one accent** (`--primary` = `#01cc72`) on a 60/30/10 budget with an explicit
  per-surface reserve list. A phase may declare a *stricter* budget; not a looser one.

### Open items — record, do not "fix"

- `--radius: 0.625rem` is still declared but drives nothing in the scale (UIC-04). Controls
  render at an explicit, standalone **26px** corner (`--radius-4xl`) and containers render at
  the named **`--radius-container`** token (16px) — the two tiers share zero variables, so a
  container change can never reach a control or vice versa. Do not reintroduce a
  `calc(var(--radius) * n)` derivation; `tests/radius-scale.test.ts` and
  `tests/container-radius.test.ts` gate against it.
- OPEN-A (container radius split 18px/24px) was closed by `31.1-app-shell-refresh`, and OPEN-D
  (three weights or four) by operator decision on 2026-09-03 — see
  `.planning/codebase/UI-CONVENTIONS.md` for the full closure records.

## Codebase reference docs

`.planning/codebase/` — [`ARCHITECTURE.md`](.planning/codebase/ARCHITECTURE.md),
[`CONVENTIONS.md`](.planning/codebase/CONVENTIONS.md) (code-level: naming, imports, error
handling), [`UI-CONVENTIONS.md`](.planning/codebase/UI-CONVENTIONS.md) (visual/design contracts),
[`STACK.md`](.planning/codebase/STACK.md), [`STRUCTURE.md`](.planning/codebase/STRUCTURE.md),
[`TESTING.md`](.planning/codebase/TESTING.md), [`CONCERNS.md`](.planning/codebase/CONCERNS.md).

## Planning workflow

This repo uses the GSD planning workflow. Milestone planning happens on a long-lived
`planning/*` branch (currently `planning/v1.6-crm-foundation`), **not** on `main` — phase
documents under `.planning/phases/` may not exist on `main`. Check which branch holds the phase
you are working on before editing its documents.
