---
phase: 04-sidebar-shell-design-v2
plan: 04-02-component-restyle
completed: 2026-04-15
duration: ~15min
commits:
  - cfcbf05
requirements_shipped:
  - DESIGN-04
  - DESIGN-05
  - DESIGN-06
  - DESIGN-08
  - DESIGN-09
---

# Plan 04-02 Component Restyle — Summary

## What shipped

Every interactive surface of v10 restyled to match the Leasétic/Dashly design language established in 04-CONTEXT.md: pill buttons, shadowless-elevation cards, rounded inputs with teal focus ring, floating banners, and the sidebar ● dot completion marker.

## Changes

### Buttons (DESIGN-04) — all `.btn` variants → pill

- `.btn` base: `border-radius: 9999px`, 0.78rem/600, 0.55rem 1.2rem padding
- `.btn-green` (primary CTA): 0.65rem 1.6rem padding, `box-shadow: 0 4px 14px 0 rgba(168,214,200,0.35)`, hover transform -1px with richer shadow
- `.btn-navy`: matching pill with hover lift
- `.btn-out`: white background, 1.5px border, pill radius, 0.6rem 1.25rem padding
- `.btn-ghost`: ink tint (replaced the white-ghost-on-navy variant since the navy header no longer exists)

### Cards (DESIGN-05) — shadowless elevation

- `.card`: `border: none`, `border-radius: 16px`, `padding: 1.75rem`, `box-shadow: var(--shadow-card)` (dual-layer navy-tinted: `0 1px 2px rgba(17,44,59,0.04), 0 4px 12px rgba(17,44,59,0.05)`)
- `.cc` (admin coefficient cards): matching language at 12px radius + shadow, 1.25rem padding
- `.hint` (admin hint boxes): 10px radius, 0.6rem 0.75rem padding, slightly bigger text

### Inputs (DESIGN-06) — rounded + focus ring

- `input[type=text|number|password|email|tel]`: `border-radius: 12px`, 0.65rem 0.9rem padding, 0.88rem font
- `:focus`: `border-color: var(--teal)` + `box-shadow: 0 0 0 3px rgba(45,122,140,0.12)` (teal ring)
- `.invalid` (Phase 3 real-time validation): now uses `box-shadow: 0 0 0 3px rgba(220,38,38,0.12)` (danger ring matching new ring language)
- `.dg.invalid` (duration group): 12px radius + 1.5px border
- Deleted the broad `input:focus { border-color: var(--teal) }` rule — the specific selectors cover it now

### Secondary controls

- `.db` (duration 36/48/60 buttons): `border-radius: 9999px` pill, 1.5px border, 0.82rem/600
- `.yn-btn` (Oui/Non toggles): `border-radius: 9999px` pill, 1.5px border, 0.8rem/500
- `.al` (admin alert banners): 12px radius, 0.7rem 1rem padding

### Banner (DESIGN-08) — floating card

- `.exp`: promoted from a full-width strip to a floating card (`border: 1px solid #fca5a5`, `border-radius: 12px`, `padding: 0.75rem 1rem`, `margin-bottom: 1.25rem`, `box-shadow: var(--shadow-card)`)
- `.exp.warn` variant automatically inherits (only overrides background + border-color)

### Sidebar ● dot completion (DESIGN-09)

- CSS: `.sidebar-nav .nav-item.has-content::after { content: '●'; color: var(--gd); margin-left: auto; font-size: 0.55rem; line-height: 1; transform: translateY(-1px); }`
- New helper: `updateSidebarDots()` toggles `.has-content` on `#nav-resultat` and `#nav-proposition` based on `lastGen` being non-null
- Call sites:
  - `generate()` success path — after `lastGen = data` assignment
  - `btn-reset` click handler — after clearing `lastGen = null`
  - `DOMContentLoaded` — for clean initial state (defensive; lastGen starts null so no dots on first paint)

### Toast consistency

- `.toast`: 12px radius (was 0.5rem), navy-tinted shadow `0 8px 22px rgba(17,44,59,0.12)`, 0.8rem 1.2rem padding

## Zero regression verified

- `grep -c 'assertCalc|assertEscape|assertValidity'` → 9 (preserved)
- `grep -c 'escapeHtml|hashPassword|migratePasswordIfNeeded'` → 41 (preserved)
- `grep -c '^var '` → 0
- `grep -c 'border-radius:9999px'` → 5 (btn, db, yn-btn, lang-seg, lang-seg button)
- `grep -c 'box-shadow:var(--shadow-card)'` → 3 (card, cc, exp)
- `grep -c 'has-content\|updateSidebarDots'` → 7
- `node --check` on extracted `<script>` → PARSE OK
- `#page-proposition` internal CSS (proposal layout, print rules, prop-page, prop-sidebar) untouched — PDF output stays byte-identical to Phase 1

## Manual smoke tests (Antoine, ~3min)

1. Reload v10 in Chrome — console self-checks still log 6/6 + 8/8 + 6/6 green.
2. Visually: all buttons are now fully pill-shaped (rounded end-caps). Cards float on the cool-grey background with barely-visible shadows, no hard borders. Inputs are rounded rectangles; clicking into any field shows a soft teal glow around it.
3. Try real-time validation: tab through client fields without filling → each gets a red ring on blur. Start typing → ring disappears.
4. Fill a test proposal → click Générer → Résultat page. Return to sidebar: the `📊 Résultat` and `📄 Proposition` items now show a small green ● at the right edge.
5. Click Réinitialiser (confirm the reset) → dots disappear.
6. Admin tab → the coefficient cards and alert banners now match the new shadow + rounded language.
7. `window.print()` from Proposition tab → PDF is visually IDENTICAL to Phase 1 output (no sidebar/topbar/footer; proposal page 1 + page 2 unchanged).

## Handoff to Plan 04-03

**State at end of Wave 2:**
- Shell (Wave 1) + components (Wave 2) are in place
- Typography still uses Phase 3 sizes (topbar title 1.15rem is set, but card titles `.ctitle` are still 0.66rem, field labels still 0.73rem, body still 14px)
- Footer is small 0.75rem — already matches target

**What Plan 04-03 should do (DESIGN-07 + FINAL-TEST-v11.md):**
- Bump `.ctitle` from 0.66rem to 0.85rem
- Bump `label` from 0.73rem to 0.78rem
- Bump body font-size from 14px to 0.9rem (1.44 × 10 = close to 14.4px) with line-height 1.55
- Sidebar nav items are already 0.88rem ✓
- Verify topbar title is 1.15rem ✓
- Spacing: bump `.two` grid gap and card spacing rhythm
- Write `FINAL-TEST-v11.md` master ship-gate runbook (replaces Phase 3's FINAL-TEST.md)

**Risk callouts:**
- Bigger typography could make `#page-proposition` content shift IF we touch the shared `body { font-size: ... }` rule. Plan 04-03 must scope typography changes carefully so proposal (which has its own explicit sizes) is unaffected.
- The footer text contains `Matrice v10` — Plan 04-03 may want to bump this to reflect v11 if Wave 3 is considered the final ship.
