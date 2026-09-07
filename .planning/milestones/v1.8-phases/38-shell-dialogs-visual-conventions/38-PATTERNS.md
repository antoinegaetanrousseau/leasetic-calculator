# Phase 38: Shell, Dialogs & Visual Conventions - Pattern Map

**Mapped:** 2026-09-06
**Files analyzed:** 6 (2 edited primitives, 1 CSS file with 6 selector edits, 1 component, 1
i18n dictionary, 1 new test) + 2 cross-phase status/doc files + 1 verification artifact (38-UAT.md,
not a code pattern)
**Analogs found:** 6 / 6 — this phase edits existing files in place rather than creating new ones,
so every "analog" is a sibling pattern already present in the same file or its immediate neighbor.

**Framing note:** this is a debt-closing CSS/primitive/a11y phase, not a feature phase (per the
orchestrator's phase-specific notes). There is no controller/service/model file list — the "files
to create or modify" are the four files CONTEXT.md's canonical refs name, plus the two docs/test
files D-38-11 mandates. Every pattern below is "the idiom this exact file (or its direct sibling)
already uses two lines away," which is the strongest possible analog quality for this kind of edit.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/components/ui/dialog.tsx` (line 81) | component (vendored primitive) | request-response (client-side i18n lookup on render) | `src/components/ui/sheet.tsx` (identical sibling defect, same fix shape) | exact |
| `src/components/ui/sheet.tsx` (line 73) | component (vendored primitive) | request-response | `src/components/ui/dialog.tsx` (identical sibling defect, same fix shape) | exact |
| `app/globals.css` — `.btn-green,.btn-navy,.btn-out` padding (lines 372–387) | config (design-token/CSS rule) | transform (declarative style rule) | `button.tsx`'s `size` scale (`h-9`/`h-8`/`h-10`, lines 22–32) — the height vocabulary this padding is being aligned to | role-match (CSS rule to CSS rule is same-file; cross-file analog is the token scale it must match) |
| `app/globals.css` — 6 focus-ring selectors (lines 398, 443, 467, 516 + `.btn-out`'s own 398, `.admin-nav-card` 467, `.stepper-circle` 516, `.search-bar` 443) | config (CSS rule) | transform | `app/globals.css:325` — the `--destructive` ring, already using `box-shadow` + `color-mix(in oklab, …, transparent)` on a non-brand-colored control | exact (same file, same idiom, only the token differs) |
| `src/components/proposals/LoadMoreButton.tsx` (line 59, 62) | component (client, non-vendored) | request-response (fetch + `aria-label`/visible-text pair) | same file's own idle/loading visible-text branch (lines 65–72) | exact (the fix is deleting one line so the file's own existing branch becomes the sole accessible name) |
| `src/lib/i18n/dictionaries.ts` — new `common.close.aria` key | config (i18n dictionary) | CRUD (add one FR + one EN literal) | `auth.modal.button.close` (line 280 FR / 1563 EN) and `shell.user.menu.aria` (line 282 FR / 1565 EN) | exact |
| `tests/dialog-close-label.test.ts` (new, D-38-11) | test | request-response (source-assertion, no jsdom) | `tests/container-radius.test.ts` (source-assertion suite pinning a vendored-file modification against re-import clobber) | exact |
| `.planning/codebase/UI-CONVENTIONS.md` — re-import table row + UIC-11 | config (project doc) | CRUD (append) | Existing `src/components/ui/alert-dialog.tsx` row in the same table (line 440) | exact |

---

## Pattern Assignments

### `src/components/ui/dialog.tsx` (vendored primitive, GAP-02)

**Analog:** `src/components/ui/sheet.tsx` (the identical sibling defect — both files were vendored
from the same upstream template and both hardcode `"Close"` the same way)

**Current defect** (`dialog.tsx:79-82`):
```tsx
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-4 right-4"
                size="icon-sm"
              />
            }
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
```

**Imports pattern** (`dialog.tsx:1-9`, unchanged, shown for the new import to slot into):
```tsx
"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"
```
Add `import { t } from "@/lib/i18n/dictionaries"` (and a `type Lang` import is NOT needed as a
prop — per D-38-09 the file reads `document.documentElement.lang` directly, it does not accept a
`lang` prop). File is already `"use client"` (line 1), so `document` is available at render/effect
time — no SSR guard needed beyond what any other client-only browser API call in this file would need.

**Core pattern to apply** — replace the hardcoded string with a `t()` call keyed off
`document.documentElement.lang`. There is no existing in-repo example of reading
`document.documentElement.lang` (grepped, zero hits) — this is new, per D-38-09's own text ("Reading
`<html lang>` needs zero prop threading and zero new infrastructure"). The `t()` signature to
target (`dictionaries.ts:2497`):
```ts
export function t(key: DictKey, lang: Lang): string {
  return dictionaries[lang][key] ?? dictionaries.fr[key];
}
```
`Lang = keyof typeof dictionaries` (`fr` | `en`) — `document.documentElement.lang` returns a bare
string, so the value must be narrowed/guarded (e.g. `lang === 'en' ? 'en' : 'fr'`) before it can be
passed as the `Lang` parameter; `t()` itself will not accept an unnarrowed `string`.

**Error handling:** none needed — `t()` already has its own FR-fallback safety net for a missing
key, and reading `document.documentElement.lang` cannot throw in a client component.

**Do not touch:** the icon (`Cancel01Icon`), its position (`absolute top-4 right-4`), size
(`icon-sm`), or the `ghost` variant — UI-SPEC's "Visual contract: zero visual change" is explicit
that only the `sr-only` text node's content changes.

---

### `src/components/ui/sheet.tsx` (vendored primitive, GAP-02)

**Analog:** `src/components/ui/dialog.tsx` (identical defect, apply the identical fix)

**Current defect** (`sheet.tsx:61-75`):
```tsx
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-4 right-4"
                size="icon-sm"
              />
            }
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
```
Same imports gap (needs `t` from `@/lib/i18n/dictionaries`), same fix shape as `dialog.tsx` above.
Note `sheet.tsx` does not currently declare `"use client"` at the top of the file (checked: the
directive is absent, unlike `dialog.tsx:1`) — verify this at edit time; if the file relies on a
parent boundary, reading `document` still requires confirming the component only ever renders
client-side (its sole consumer, `sidebar.tsx`, is the mobile drawer, which is already
interactive/client-rendered chrome).

**Consumer to verify against (D-38-12):** `src/components/ui/sidebar.tsx:199` wraps
`SheetContent`/`SheetHeader` for the mobile drawer — this is the one `sheet.tsx` call site named in
CONTEXT.md for FR/EN verification.

---

### `app/globals.css` — `.btn-green, .btn-navy, .btn-out` padding (GAP-04, D-38-13/A-38-01)

**Analog (in-file):** the rule itself, immediately below

**Current** (`app/globals.css:372-387`):
```css
  .btn-green,
  .btn-navy,
  .btn-out {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 0.6rem 1.5rem;
    border-radius: 9999px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: background 150ms, color 150ms, box-shadow 150ms;
  }
```
**Change:** `padding: 0.6rem 1.5rem;` → `padding: 0.5rem 1.5rem;`. Only the vertical value changes;
horizontal (`1.5rem`) is untouched per D-38-13/UI-SPEC.

**Cross-file target this aligns to** — `button.tsx`'s declared height scale (`src/components/ui/button.tsx:22-32`):
```ts
      size: {
        default:
          "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 px-2.5 text-xs …",
        sm: "h-8 gap-1 px-3 …",
        lg: "h-10 gap-1.5 px-4 …",
        icon: "size-9",
        "icon-xs": "size-6 …",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
```
`h-9` = 36px is `default`; `0.5rem × 2 + ~20px content ≈ 36px` is the math this padding change is
targeting (UI-SPEC "Height math" section). No `button.tsx` edit is needed — it is cited only as the
scale `.btn-out` is being brought on-grid with, not touched by this phase.

**Blast radius (A-38-01 corrected):** this is the **shared** selector list — the same declaration
serves `.btn-green` (18 files), `.btn-navy` (2 files), `.btn-out` (18 files), 31 distinct files
total. One CSS edit, verified across all 31 call sites by the CLOSE-08 walk, not 31 separate edits.

**Leave as-is (A-38-02):** `.btn-out`'s own border override two lines below —
```css
  .btn-out         { background: transparent; color: var(--ink); border: 1px solid var(--border); }
```
— is a second, ~2px undeclared-height source this phase records but does not fix (out of GAP-04's
padding+focus scope).

---

### `app/globals.css` — the six focus-ring selectors (GAP-04, A-38-03/A-38-04)

**Analog:** `app/globals.css:322-326` — the existing `color-mix` idiom on a different selector, in
the same file, already proving the pattern works for a non-brand-colored ring:
```css
input:not([data-slot="input"]).invalid,
input:not([data-slot="input"])[aria-invalid="true"] {
  border-color: var(--destructive);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--destructive) 12%, transparent);
}
```
This is the file's own precedent for `color-mix(in oklab, var(--TOKEN) N%, transparent)` — swap
`var(--destructive)` for `var(--ring)` and the ratio/geometry per the amendment's required CSS.

**The six current defects (identical teal literal, four distinct selectors, exact line numbers
confirmed):**

`.btn-green/.btn-navy/.btn-out:focus-visible` (`app/globals.css:394-399`):
```css
  .btn-green:focus-visible,
  .btn-navy:focus-visible,
  .btn-out:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(45, 122, 140, 0.18);
  }
```

`.search-bar:focus-within` (`app/globals.css:441-444`):
```css
  .search-bar:focus-within {
    border-color: var(--teal);
    box-shadow: 0 0 0 3px rgba(45, 122, 140, 0.12);
  }
```
(Note: `border-color: var(--teal)` on this selector is NOT named in scope by GAP-04/UI-SPEC —
only the `box-shadow` line is the focus-ring literal being replaced. Do not remove the
`border-color` line without re-checking; UI-SPEC only shows the `box-shadow` line changing.)

`.admin-nav-card:focus-visible` (`app/globals.css:465-468`):
```css
  .admin-nav-card:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(45, 122, 140, 0.18);
  }
```

`.stepper-circle:focus-visible` (`app/globals.css:514-517`):
```css
  .stepper-circle:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(45, 122, 140, 0.18);
  }
```

**Required replacement, identical on all six** (per UI-SPEC's "Required CSS" block, verbatim):
```css
outline: none;
box-shadow: 0 0 0 2px var(--ring),
            0 0 0 5px color-mix(in oklab, var(--ring) 50%, transparent);
```
(`.search-bar:focus-within` keeps its `outline: none` if it doesn't already have one — check; it
currently has no `outline: none` line, only `border-color` + `box-shadow`. Add `outline: none` to
match the other five, since the UI-SPEC block always pairs the two.)

**`--ring` token declarations to reuse, not re-derive** (already in both themes):
- Light: `app/globals.css:52` — `--ring: var(--brand-accent);` (inside `:root`)
- Dark: `app/globals.css:195` (confirmed in the dark block read during this mapping) —
  `--ring: var(--brand-accent);`
Both resolve to `#01cc72`. No new token is declared anywhere — the CSS edit only ever writes
`var(--ring)`, never a new custom property.

**Existing 30-file consumer pattern this joins (not edited by this phase, cited for consistency
only)** — `button.tsx:7`:
```
focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50
```
This is a Tailwind utility-class consumer (different mechanism — utility classes, not a raw CSS
box-shadow rule) and is NOT the pattern to copy verbatim into `globals.css`; it is cited so the
plan understands `--ring` already has 30 consumers via this other route, which is why A-38-03
rejects minting a new token. The `globals.css` selectors use the raw CSS `box-shadow` form because
UI-SPEC's A-38-02 requires a treatment that does not depend on a border (`border-ring` implies a
border utility; these six selectors include two, `.btn-green`/`.btn-navy`, that declare
`border: none`).

---

### `src/components/proposals/LoadMoreButton.tsx` (D-38-16)

**Analog:** the file's own idle/loading branch two lines below the defect — this is a
delete-one-line fix, not a new pattern to import.

**Current defect** (`LoadMoreButton.tsx:55-73`):
```tsx
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
      <button
        type="button"
        className="btn-out"
        onClick={onClick}
        disabled={loading}
        aria-label={t('proposal.list.load.more', lang)}
        style={{ opacity: loading ? 0.6 : 1 }}
      >
        {loading ? (
          <LoaderIcon size={17} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" />
        ) : (
          <PlusIcon size={17} aria-hidden="true" />
        )}
        {loading
          ? t('proposal.list.load.more.loading', lang)
          : t('proposal.list.load.more', lang)}
      </button>
    </div>
  );
```
**Fix:** delete the `aria-label={t('proposal.list.load.more', lang)}` line (line 62) entirely. The
visible text at lines 70-72 already branches correctly on `loading` — once the static `aria-label`
is gone, that visible text becomes the accessible name in both states, closing the WCAG 2.5.3
mismatch. No new i18n key, no other line changes. This is also a `.btn-out` call site (D-38-13's
padding change applies to this same file's `className="btn-out"` at line 59) and a
CLOSE-08-named surface (`/proposals`).

---

### `src/lib/i18n/dictionaries.ts` — new `common.close.aria` key (GAP-02)

**Analog:** `auth.modal.button.close` and `shell.user.menu.aria` — both already-established
`.aria`-suffixed / close-labelled precedents in the same two dictionary blocks.

**FR precedents** (`dictionaries.ts:280, 282`):
```ts
    'auth.modal.button.close': 'Fermer',
    ...
    'shell.user.menu.aria': 'Menu utilisateur',
```
**EN precedents** (`dictionaries.ts:1563, 1565`):
```ts
    'auth.modal.button.close': 'Close',
    ...
    'shell.user.menu.aria': 'User menu',
```
**Pattern to add** — one FR literal near the other `common.*` keys (`dictionaries.ts:230-232` shows
the existing `common.*` cluster: `common.yes`, `common.no`, `common.ht`) and its EN counterpart in
the EN block (`dictionaries.ts:1513-1515`):
```ts
// FR block, near common.yes/common.no (dictionaries.ts:230-232)
'common.close.aria': 'Fermer',

// EN block, near common.yes/common.no (dictionaries.ts:1513-1515)
'common.close.aria': 'Close',
```
**Parity enforcement** — no manual FR/EN check needed; `dictionaries.ts:2505-2508`'s
`_EnHasAllFrKeys` compile-time type fails the build if the EN key is missing:
```ts
type _EnHasAllFrKeys = {
  [K in DictKey]: K extends keyof typeof dictionaries.en ? true : never;
};
type _EnParityProof = _EnHasAllFrKeys; // fails compile if any K maps to never
```

---

### `tests/dialog-close-label.test.ts` (new, D-38-11 pinning test)

**Analog:** `tests/container-radius.test.ts` — the established source-assertion pattern for
pinning a vendored-file modification against `shadcn add -o` re-import clobber.

**Structure to copy** (from `container-radius.test.ts:22-41`, the file-reading + comment-stripping
scaffold every source-assertion suite in this repo reuses):
```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

function readStripped(relativePath: string): string {
  return stripComments(readFileSync(path.join(ROOT, relativePath), 'utf-8'));
}
```
**Assertions to write** (per D-38-11's exact text — "asserting neither file contains a hardcoded
`>Close<` / `\"Close\"` JSX text node in the `sr-only` span, and that both call
`t('common.close.aria', ...)`") — model on `container-radius.test.ts:130-153`'s
`it('no container surface carries a px radius literal …')` shape: a forbidden-pattern regex plus a
required-pattern string, both checked with `readStripped`, for exactly `dialog.tsx` and
`sheet.tsx`. Do not use `grep -c` in the test body for the negative assertion (per the project's
own recorded gotcha: `grep -c` semantics differ from what a naive count implies) — use
`.not.toMatch(/regex/)` / `.toContain(...)` on the stripped string, exactly as `container-radius.test.ts` does throughout.

---

### `.planning/codebase/UI-CONVENTIONS.md` — re-import table row + UIC-11 (D-38-11, D-38-15/A-38-04)

**Analog:** the existing `src/components/ui/alert-dialog.tsx` row in the same table
(`UI-CONVENTIONS.md:440`), which documents another vendored-`ui/` modification "measured to recur."

**Row format to copy** (`UI-CONVENTIONS.md:437-441`):
```
| File | Change | Why |
|---|---|---|
| `src/components/ui/alert-dialog.tsx` | `AlertDialogContent`'s root reads `rounded-container`, not upstream's `rounded-4xl`. | UIC-04 / Phase 31.1-04 (D-01, OPEN-A): … **Measured to recur:** `npx shadcn add @reui/solution-users-2 -o` on 2026-09-03 clobbered this back … restored by hand. `tests/container-radius.test.ts` catches it, but only after the fact. Added 2026-09-03 (34-03). |
```
Add two new rows (one for `dialog.tsx`, one for `sheet.tsx`) in this exact three-column shape,
naming the `sr-only`/`t('common.close.aria', …)` change, citing GAP-02/D-38-09..D-38-11, and
naming `tests/dialog-close-label.test.ts` as the "catches it, but only after the fact" gate,
matching the alert-dialog row's own phrasing pattern.

**UIC-11 to mint** — insert after UIC-10 (`UI-CONVENTIONS.md:391-403`, ends at line 403 before the
`---` at 405), following that section's own header/Status/Recorded-in/Rule shape:
````
## UIC-11 — Focus ring: `var(--ring)` via the two-layer shadow; never hardcode a focus colour.

**Status:** ...
**Recorded in:** `38-UI-SPEC.md` § Focus Treatment

**Rule.** Any `:focus-visible` or `:focus-within` treatment that renders a colored ring uses:
```css
outline: none;
box-shadow: 0 0 0 2px var(--ring),
            0 0 0 5px color-mix(in oklab, var(--ring) 50%, transparent);
```
`--ring` is already declared in both themes (`app/globals.css:52`, `:195`). A component-local
hardcoded `rgba(...)` or other literal focus color is a violation, not a case-by-case styling
choice.
````
Per A-38-04, this rule carries **no contrast-ratio clause** in its text — the measured evidence
stays in `38-UI-SPEC.md` § Color only.

---

## Shared Patterns

### `color-mix(in oklab, var(--TOKEN) N%, transparent)` — the ring/shadow idiom
**Source:** `app/globals.css:325` (the pre-existing `--destructive` ring)
**Apply to:** all six focus-ring selectors listed above. This is the single cross-cutting CSS idiom
this phase's color work reuses — do not invent a different mixing function or color space.

### `t(key, lang)` client-side i18n lookup
**Source:** `src/lib/i18n/dictionaries.ts:2497` (`t()`'s own definition, framework-agnostic — "safe
to import from both Server Components and Client Components")
**Apply to:** `dialog.tsx`, `sheet.tsx` (new `document.documentElement.lang`-sourced call),
`LoadMoreButton.tsx` (existing calls, unchanged — cited because the fix there is deletion of a
redundant `t()` call, not addition).

### `.aria`-suffixed i18n key naming
**Source:** `shell.user.menu.aria`, `history.diff.close.aria`, `proposal.search.aria` (all present
in `dictionaries.ts`, FR lines 282/772/381, EN lines 1565/2016/1654)
**Apply to:** the new `common.close.aria` key.

### Source-assertion test scaffold (readFileSync + stripComments, no jsdom)
**Source:** `tests/container-radius.test.ts:22-41`, also used by `tests/dark-palette.test.ts:31-49`
**Apply to:** the new `tests/dialog-close-label.test.ts`.

### Vendored-file re-import table row
**Source:** `.planning/codebase/UI-CONVENTIONS.md:440` (the `alert-dialog.tsx` row)
**Apply to:** the two new rows for `dialog.tsx` and `sheet.tsx`.

---

## No Analog Found

None. Every file this phase touches is an in-place edit to an existing file, and every edit has a
same-file or same-table sibling pattern to copy (see table above). There is no genuinely new
architectural shape being introduced — even the `document.documentElement.lang` read, which has no
prior in-repo occurrence, is a one-line browser-API call justified and scoped entirely by
CONTEXT.md's own D-38-09, not a pattern requiring an external analog.

---

## Metadata

**Analog search scope:** `app/globals.css`, `src/components/ui/dialog.tsx`, `src/components/ui/sheet.tsx`,
`src/components/ui/button.tsx`, `src/components/ui/sidebar.tsx`, `src/components/proposals/LoadMoreButton.tsx`,
`src/lib/i18n/dictionaries.ts`, `src/lib/i18n/actions.ts`, `tests/container-radius.test.ts`,
`tests/dark-palette.test.ts`, `.planning/codebase/UI-CONVENTIONS.md`.
**Files scanned:** 11 read directly (targeted ranges for the two large files, `globals.css` at
670 lines and `dictionaries.ts` at 2508 lines — non-overlapping `sed`/`Read` ranges only, no full
re-reads); grep sweeps for `documentElement.lang`, `rgba(45, 122, 140`, `.aria` key occurrences,
and the UI-CONVENTIONS.md table/UIC section headers.
**Pattern extraction date:** 2026-09-06
