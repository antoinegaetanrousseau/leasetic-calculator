---
phase: 38-shell-dialogs-visual-conventions
reviewed: 2026-09-06T16:50:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - app/globals.css
  - src/components/proposals/LoadMoreButton.tsx
  - src/components/ui/dialog.tsx
  - src/components/ui/sheet.tsx
  - src/components/ui/sidebar.tsx
  - src/lib/i18n/dictionaries.ts
  - src/lib/i18n/dom-lang.ts
  - tests/dark-palette.test.ts
  - tests/dialog-close-label.test.ts
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: resolved
---

# Phase 38: Code Review Report

**Reviewed:** 2026-09-06T16:50:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found (no blockers — two warnings, three info-level notes)

## Summary

Reviewed the nine files touched by GAP-02 (dialog/sheet close-button i18n), GAP-04
(`.btn-*` padding + focus-ring retirement), and the two in-phase fixes the CLOSE-08/CLOSE-02
walks surfaced (F-38-02's `line-height: 20px` pin, F-38-05's sidebar-sheet i18n). Cross-checked
against `38-CONTEXT.md`, `38-UI-SPEC.md`, `38-UAT.md`, and `UI-CONVENTIONS.md` (UIC-01/UIC-04/UIC-11)
to avoid re-litigating locked decisions.

**`resolveDomLang()` SSR/hydration correctness (the review's top focus item) — verified sound,
not just empirically but structurally.** I read `@base-ui/react`'s `DialogPortal`/`SheetPortal`
source (`node_modules/@base-ui/react/dialog/portal/DialogPortal.mjs`): both gate on
`shouldRender = mounted || keepMounted` and return `null` when false. Since every consumer in
this codebase mounts its dialog/sheet closed (`useState(false)`/`openMobile` default), the
`DialogContent`/`SheetContent` subtree — including the `resolveDomLang()` call inside the close
button — never executes render logic until *after* the dialog has been opened at least once,
which by construction only happens post-hydration, client-side. So the SSR branch
(`typeof document === 'undefined'`) is currently unreachable for all three call sites, and a
server/client text mismatch on this span is structurally impossible today, not merely
unobserved in one browser walk. This is stronger evidence than the UAT's "console checked,
zero messages" claim, and it holds. See Info items below for the two related but non-blocking
observations this uncovered.

**Cascade-layer correctness (globals.css):** all `.btn-*`/focus-ring/`.search-bar`/
`.admin-nav-card`/`.stepper-circle` edits stay inside the existing `@layer components` block
(lines 350–675). The two intentionally-unlayered rules (`input.invalid`, brand-logo picker) are
untouched by this phase and remain unlayered for the documented reason. No repeat of the prior
"widget rules beat utilities" incident.

**`line-height: 20px` blast radius:** checked all ~32 call sites via `grep -rn "btn-green\|btn-navy\|btn-out"`. All icons paired with these classes are ≤17px (`PlusIcon`/`LoaderIcon size={17}`, `Spinner className="size-[17px]"`), well under the pinned 20px line box, and every button renders single-line text with no wrapping call site found. No clipping or wrap-breakage risk identified.

**i18n dictionary integrity:** `common.close.aria`, `shell.sidebar.title`, `shell.sidebar.description` all present in both `fr` and `en` blocks with correct values; `_EnHasAllFrKeys` compile-time check would catch any future drift. `npm run typecheck`, the two new/edited test files, and a scoped `eslint --max-warnings=0` all pass clean.

**Can the two new tests pass vacuously?** No — `tests/dialog-close-label.test.ts` and the amended `tests/dark-palette.test.ts` both use a `readStripped()`/`existsSync`+length guard that fails loudly on a missing or emptied file, and 38-01/38-04's summaries record an actual mutation test (restoring the literal string flips the exact expected assertions red). I did not re-run the mutation myself but the described methodology is sound and the current tests do pass (verified: `npx vitest run tests/dialog-close-label.test.ts tests/dark-palette.test.ts` → 14/14 passing).

## Warnings

### WR-01: Pinning-test regex is brittle to reformatting, undermining its own re-import-clobber guarantee

**File:** `tests/dialog-close-label.test.ts:67`
**Issue:** `HARDCODED_CLOSE_SPAN_RX = /className="sr-only">Close</` requires the literal substring `>Close<` with zero intervening whitespace. D-38-11's entire purpose is to catch a `npx shadcn add -o` re-import that reintroduces the hardcoded string — but if the re-imported/reformatted upstream source ever renders the same JSX with a line break or extra whitespace inside the span (e.g. Prettier's own multi-line JSX-children formatting, which the file already uses elsewhere for `SheetDescription`'s children at `sidebar.tsx:207-209`), this regex silently fails to match and the gate passes green on a real regression. The two existing rows this pattern is modelled on (`container-radius.test.ts`) anchor on CSS class names, which don't reformat the same way JSX children do — this is a materially different and more fragile case.
**Fix:**
```ts
const HARDCODED_CLOSE_SPAN_RX = /className="sr-only">\s*Close\s*</;
```

### WR-02: `resolveDomLang()` has no direct unit test of its own behavior

**File:** `src/lib/i18n/dom-lang.ts:12-18`
**Issue:** This is a new, exported, non-trivial function with branching logic (SSR guard, case-insensitive narrowing, `startsWith('en')` matching) that is exactly the code this review was asked to scrutinize for correctness. The only test coverage that exists is `tests/dialog-close-label.test.ts`, which is a source-text assertion suite — it checks that call sites contain the literal string `resolveDomLang()`, never that the function itself behaves correctly. There is no test exercising `resolveDomLang()` with a real or mocked `document.documentElement.lang` value (`'en'`, `'en-US'`, `'FR'`, `''`, absent attribute) or asserting the SSR branch's return value. A regression in the narrowing logic (e.g., someone "simplifies" the ternary to `lang === 'en' ? 'en' : 'fr'`, breaking `en-US`/`EN` handling) would not be caught by anything in the suite.
**Fix:** Add a small `tests/dom-lang.test.ts` using `vi.stubGlobal` or a jsdom `document.documentElement.lang` assignment to assert: SSR branch returns `'fr'`, `'en'`/`'EN'`/`'en-US'` all return `'en'`, `'fr'`/`''`/`'es'` all return `'fr'`.

## Info

### IN-01: `resolveDomLang()`'s SSR guard is currently dead code for every call site, and the code comment's stated rationale is incomplete

**File:** `src/lib/i18n/dom-lang.ts:6-11`
**Issue:** The comment says the guard exists because `sheet.tsx` "carries no `use client` directive" and Next "server-renders client components for the initial HTML." That's true in isolation, but it doesn't explain why the guard is actually never exercised in practice: `@base-ui/react`'s `DialogPortal`/`SheetPortal` (both themselves `'use client'`, gating on `mounted || keepMounted`) return `null` until the dialog/sheet has been opened at least once — which only happens post-hydration. So the `typeof document === 'undefined'` branch never fires for `dialog.tsx`, `sheet.tsx`, or `sidebar.tsx`'s current usage. Not a bug — the guard is legitimate defensive infrastructure for future call sites outside a portal-gated context — but the comment overstates the guard's necessity for the code as it stands today, which could mislead a future maintainer into thinking this file has been observed to hit that branch.
**Fix:** Optionally amend the comment to note the guard is currently unreached in practice (both consuming primitives gate rendering behind client-only mount state) and is retained for future call sites that might read `resolveDomLang()` outside a portal.

### IN-02: `DialogFooter`'s optional close button still hardcodes English "Close" in the same file GAP-02 was fixing

**File:** `src/components/ui/dialog.tsx:119-123`
**Issue:** `DialogFooter`'s `showCloseButton` prop (default `false`) renders `<DialogPrimitive.Close render={<Button variant="outline" />}>Close</DialogPrimitive.Close>` — a hardcoded English string, the same defect class GAP-02 fixed two functions above in the same file. Confirmed via repo-wide grep that no call site currently passes `showCloseButton` to `DialogFooter` (as opposed to `DialogContent`, which does have consumers), so this is dead code today, not a live user-facing bug, and is correctly out of D-38-10's stated scope (it's a labelled button, not the icon-only close). Flagging because it's a latent trap in an ESLint-excluded, un-pinned file: the next person who enables this prop ships an English string with zero guard against it.
**Fix:** Out of this phase's scope per D-38-10; worth a one-line follow-up (`t('common.close.aria', resolveDomLang())` or similar) whenever this prop is next touched.

### IN-03: `dark-palette.test.ts`'s header docblock is now inconsistent with its own corrected SCOPE comment

**File:** `tests/dark-palette.test.ts:11` vs `tests/dark-palette.test.ts:68-77`
**Issue:** The file's top docblock still lists "1. the print/PDF surface still forces white in dark mode" as one of the invariants this suite guards — the same claim F-38-01 established the test does *not* and cannot verify (it only checks the rule's text exists). The corrected SCOPE comment was added directly above the renamed test (lines 68-77) but the header list a few lines above it (line 11) was not updated to match, so a reader who reads only the file-level docblock (a reasonable thing to do first) gets the pre-F-38-01 impression back.
**Fix:**
```diff
- *   1. the print/PDF surface still forces white in dark mode
+ *   1. the print/PDF surface override rule is still declared for dark mode
+ *      (text-presence only — see the SCOPE comment above that test)
```

---

_Reviewed: 2026-09-06T16:50:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_


---

## Resolution — applied by the orchestrator, 2026-09-06

All five findings addressed in the same phase; `typecheck` 0, `lint:check` 0, **2366 tests pass**
(up 7 — the new `tests/dom-lang.test.ts`).

| ID | Disposition |
|---|---|
| WR-01 | **Fixed.** All three pinning regexes made whitespace-tolerant (`>\s*Close\s*<` etc.). A re-import that reformats the JSX — the exact event these guards exist to catch — would previously have slipped past them. |
| WR-02 | **Fixed.** Added `tests/dom-lang.test.ts` with 7 direct unit tests for `resolveDomLang()`: fr/en, case-insensitivity, regional tags (`en-GB`, `en-US`), fallbacks (`''`, `de`, `es-ES`, `fr-CA`), a `startsWith` vs `includes` guard (`sv-en` must NOT be English), and the SSR branch exercised by deleting `globalThis.document` and re-importing — asserted non-vacuous by checking `typeof document === 'undefined'` first. |
| IN-01 | **Accepted, no change.** The reviewer is right that the SSR guard is currently unreachable for all live call sites (Base UI portals return `null` server-side). It is retained as defence-in-depth: the guard costs nothing, and a future consumer that renders a dialog open on first paint would reintroduce the exact SSR read it protects against. `tests/dom-lang.test.ts` now covers the branch, so it is no longer untested dead code. |
| IN-02 | **Fixed.** `DialogFooter`'s `showCloseButton` path (default `false`, no callers) hardcoded a visible English `Close` in the very file GAP-02 fixed. Now reads `t('common.close.aria', resolveDomLang())`, with a comment explaining the deliberate key reuse — here the visible text *is* the accessible name, so a second same-valued key would only invite drift. |
| IN-03 | **Fixed.** `dark-palette.test.ts`'s header docblock still claimed the PDF rule "forces white in dark mode", contradicting the SCOPE comment added lower in the same file per F-38-01. Corrected to say the rule is still *declared*, and to point at F-38-01. This was an inconsistency introduced by this phase's own F-38-01 edit. |

Note on IN-01's underlying analysis: the reviewer verified `resolveDomLang()`'s hydration safety
**structurally** — by reading `@base-ui/react`'s `DialogPortal`/`SheetPortal` and confirming both
gate on `mounted || keepMounted` — which is stronger evidence than 38-UAT.md's single-walk
"zero console warnings" observation. Both are now recorded.
