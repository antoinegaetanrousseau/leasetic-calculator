# Leasétic Calculator — project instructions

## Design & UI conventions

**Read [`.planning/codebase/UI-CONVENTIONS.md`](.planning/codebase/UI-CONVENTIONS.md) before
reviewing, specifying, or writing any UI.** It is the canonical record of conventions that were
ratified **project-wide**, extracted from phase specs so they are not re-derived per phase.

Design system: shadcn (Base UI-backed) + ReUI registry, `style: base-maia`, `baseColor: neutral`.

### Ratified exceptions — do not flag these as violations

These deliberately depart from generic design-review defaults. They are already approved and
apply project-wide; a phase spec that uses them is **inheriting**, not newly declaring.

- **UIC-02 — three font weights (400 / 600 / 700).** This is a ratified exception to the usual
  two-weight threshold. Weights 300 and 500 are loaded by `app/layout.tsx` but are unused and out
  of bounds. A review rule that blocks on "more than 2 font weights" **does not apply here.**
- **UIC-01 — 4px-multiple spacing scale**, finer than the `{4,8,16,24,32,48,64}` default (it also
  uses 12 / 20 / 28px). Every value is still a strict multiple of 4.
- **UIC-03 — one accent** (`--primary` = `#01cc72`) on a 60/30/10 budget with an explicit
  per-surface reserve list. A phase may declare a *stricter* budget; not a looser one.

### Open items — record, do not "fix"

- **OPEN-A — container radius is split** (Phase 30 `.card` at token-derived 18px; Phase 31 queue
  cards at literal `rounded-[24px]`). Deliberate and deferred to the app-shell refresh phase,
  which will formalize a container-radius token. Do not converge them mid-phase.
- `--radius: 0.625rem` is **pinned** (UIC-04). It drives the whole derived scale; changing it
  previously turned every Input into a pill. Do not change it or the `@theme inline` multipliers.

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
