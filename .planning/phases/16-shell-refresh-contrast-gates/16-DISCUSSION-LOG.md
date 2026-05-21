# Phase 16: Shell Refresh + Contrast Gates - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `16-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-05-22
**Phase:** 16-shell-refresh-contrast-gates
**Areas discussed:** Hero pattern abstraction, Refresh scope (foundation vs cascade), Contrast sign-off mechanism, Sidebar + footer visual touch-ups

---

## Hero pattern abstraction

| Option | Description | Selected |
|--------|-------------|----------|
| Extract `<PageHero>` primitive (Recommended) | Ship `src/components/ui/PageHero.tsx` as a server component. Props: `title`, `subtitle?`, `eyebrow?` (e.g. `ÉTAPE 1 SUR 3`), `actions?: React.ReactNode` (CTA slot). All authed pages consume it. Single source of truth for hero typography, spacing, light/dark behavior, and contrast sign-off. DRY + visual consistency. | ✓ |
| Inline hero JSX per page | Each page renders its own `<h1>` + subtitle + CTA inline. Phase 16 just refreshes the *styles* (token assignments, type scale) without introducing a component. Less abstraction, more per-page flexibility. Risk: visual drift between pages over time. | |
| Hybrid: primitive + escape hatch | Ship `<PageHero>` as the default, but allow pages with truly unique hero needs (e.g. wizard steps with stepper baked in) to opt out and render their own. Document the opt-out rule in CONTEXT.md so it's not an ad-hoc decision later. | |

**User's choice:** Extract `<PageHero>` primitive (Recommended)

**Notes:** Final shape includes a `children` slot reserved for future composition (e.g. inline stats), but not used in Phase 16. Eyebrow color = `--gd` (Leasétic brand green) matching the `●` section-bullet convention from Phase 13. Hero typography pinned: title 32px / weight 700, subtitle 14.5px / weight 400 / `--muted`, eyebrow 11.8px / weight 700 / uppercase / 0.06em letter-spacing. Spacing: `margin-bottom: 32px` between hero and first content card (matches Phase 13/14 4-multiple scale precedent).

---

## Refresh scope (foundation vs cascade)

| Option | Description | Selected |
|--------|-------------|----------|
| Foundation only (Recommended) | Ship: `<PageHero>` primitive, refreshed RetractableSidebar/Topbar/Footer visuals, tri-state-theme visual polish, contrast sign-off. Migrate ONE consumer (admin home) as a reference adopter to prove the primitive works. Phase 17/18 migrate the other pages when they ship their own refresh. Smaller phase, less coupling. | ✓ |
| Cascade now | Phase 16 ships the primitives + migrates EVERY existing authed page's hero (partner home, admin home, coefficients, partners list, /partners/new, /history, wizard steps) in this phase. Pro: full visual consistency immediately. Con: pulls scope from Phase 17/18 into Phase 16; bigger PR; more files touched simultaneously. | |
| Hybrid: foundation + admin cascade | Ship the primitives + measurement + migrate ALL admin pages (already exist) in Phase 16; defer partner-side consumers to Phase 17 (which is rebuilding Partner Home / /proposals / wizard anyway, so those will adopt the primitive at build time). Splits the cascade along the partner/admin axis. | |

**User's choice:** Foundation only (Recommended)

**Notes:** Phase 16 modifies exactly one consumer (`app/(admin)/[adminSegment]/page.tsx`) as the reference adopter. Phase 17 owns: `app/(authed)/page.tsx` rebuild (PHOME), `/proposals` styling (PROPS), wizard redesign (WIZ). Phase 18 owns: `/partners`, `/partners/new`, `/coefficients`, `/history` (ADMIN-10..14). Each downstream phase adopts `<PageHero>` as part of its own page-refresh deliverable.

---

## Contrast sign-off mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Markdown audit + manual measurement (Recommended) | Author `docs/accessibility/16-contrast-audit.md` listing each foreground-on-background composite (token names + computed hex + WCAG ratio) measured manually using a known tool (e.g. WebAIM contrast checker or Chrome DevTools). Antoine signs off in the file. Lightweight, auditable, no new CI infra. Matches project's `docs/security/13-stride-addendum-*.md` precedent. | ✓ |
| Vitest assertion + computed ratios | Write a Vitest test that computes WCAG contrast ratios from token values in `app/globals.css` (or a TS color-tokens module) and asserts ≥4.5:1 for each documented composite. Sign-off = passing test in CI. Pro: enforced forever. Con: requires a color-math util (or pulls in `polished` / `chroma-js`); doesn't catch composite alpha-blending unless we model it correctly. | |
| axe-core / pa11y CI smoke | Run automated a11y scan (axe-core via Vitest+JSDOM, or pa11y-ci against the dev server) and fail CI on any contrast violation. Pro: catches violations on every PR, not just at sign-off. Con: requires a real DOM or running dev server in CI; alpha composites may not be fully evaluated; new infra surface to maintain. | |
| Markdown audit + Vitest contrast test | Both: markdown audit for the human-readable record, PLUS Vitest test asserting ratios from a TS color-tokens module. Double-coverage. More work but defense-in-depth: catches regressions if tokens later drift. | |

**User's choice:** Markdown audit + manual measurement (Recommended)

**Notes:** Sign-off artifact = `docs/accessibility/16-contrast-audit.md`. Mandatory composites: diff-panel changed-row composite (Phase 14 deferred carry-forward), `.chip-invited` gold StatusChip (Phase 14), `<PageHero>` eyebrow `--gd` over `--paper`, light + dark for each. Sign-off line at bottom of doc carries Antoine's name + date + commit sha + tool used (recommendation: WebAIM contrast checker). Automated CI enforcement (Vitest / axe-core / pa11y) deferred to v1.4+.

---

## Sidebar + footer visual touch-ups

| Option | Description | Selected |
|--------|-------------|----------|
| Pin exact deltas from Figma now (Recommended) | List the specific deltas from Figma 23:46 (collapsed sidebar) + 9:46 (expanded with active-state) in CONTEXT.md: active-state pill background+text colors, icon stroke width + size, brand-row vertical padding, eyebrow label letter-spacing, footer slots (copyright + Mentions légales + maybe build version). Planner uses CONTEXT.md as the contract. | ✓ |
| Leave to planner discretion | Trust the planner to inspect the Figma during planning (via `get_design_context`) and pick deltas. CONTEXT.md just says "match Figma 23:46 + 9:46". Faster context capture, but the planner has to redo the Figma inspection. | |
| Pin footer scope only, sidebar to planner | Pin: authed footer gains the Mentions légales link (matches public layout). Other footer slots out of scope unless Figma shows them. Sidebar visual deltas left to planner who reads Figma 23:46 + 9:46 fresh during planning. | |

**User's choice:** Pin exact deltas from Figma now (Recommended)

**Notes:** Discovered via `get_design_context` on node `23:46` that the current `RetractableSidebar.tsx` is **already 95% Figma-correct**. Pinned micro-deltas in CONTEXT.md D-12..D-15: (a) nav icon size 18→20, (b) honor `transparent` not literal `white` for inactive nav icon bg (cross-theme correctness), (c) collapsed-mode theme cycle icon size 17→16, (d) verify 24px brand-row gap in collapsed mode. Topbar (D-16) is expected zero code change. Footer (D-17, D-18) gains a `Mentions légales` link to match public layout pattern. Status / version / build-date footer slots explicitly out of scope.

---

## Claude's Discretion

(Items where Antoine left flexibility to the planner — full list in `16-CONTEXT.md` `<decisions>` → "Claude's Discretion" subsection.)

- Exact CSS pixel positions of the `Mentions légales` link (flex space-between recommended)
- Whether `<PageHero>` exposes a `className` escape-hatch prop (recommendation: no)
- Whether contrast audit doc lives at `docs/accessibility/` or `docs/security/` (recommendation: `accessibility/`)
- Exact wording of admin home eyebrow text (recommendation: `ADMIN`)
- Whether to add an `app/dev/components/` showcase for `<PageHero>` (recommendation: skip)
- WCAG tool pinning (recommendation: WebAIM as default)
- Whether to bundle sidebar micro-deltas D-12 + D-14 atomically (recommendation: yes)

---

## Deferred Ideas

(Items mentioned during discussion that were noted for future phases — full list in `16-CONTEXT.md` `<deferred>` section.)

- Partner Home + wizard hero migrations → Phase 17
- Admin /partners + /coefficients + /history hero migrations → Phase 18
- Automated contrast CI (Vitest / axe-core / pa11y) → v1.4+
- Storybook-style `<PageHero>` showcase → optional, planner's call
- `<PageHero>` `className` escape-hatch prop → explicitly omitted; v1.4+ if needed
- Status / version / build-date footer slots → out of scope; copyright + Mentions légales only
