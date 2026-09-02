# Deferred Items — Phase 31 (reconciliation-engine-proposal-extraction)

Findings from the `gsd-ui-checker` runs of 2026-09-02 that were verified against source
but deliberately not fixed. Logged here, not fixed. None affects shipped behaviour.

## 1. Dialog close button has a hardcoded English accessible name

**Found by:** UI checker, Dimension 2.

`src/components/ui/dialog.tsx` renders `DialogContent`'s built-in close "X" with
`<span className="sr-only">Close</span>` — untranslated, in a French-default product.
UIC-10 requires an i18n-sourced accessible name on icon-only controls.

**Why deferred:** the fix touches the shared `dialog.tsx` primitive, so it affects every
dialog in the app, not just Phase 31's two. Either add an i18n key to the primitive, or
pass `showCloseButton={false}` on the Phase 31 dialogs — the second is a UX change and
should be decided, not defaulted. Out of scope for a documentation pass.

## 2. Two inherited type sizes are undisclosed in the spec's type table

**Found by:** UI checker, Dimension 4.

`DialogTitle` is `text-base` (16px) and `AlertDialogTitle` is `text-lg` (18px). Both ship
on this surface and neither is listed. They are primitive defaults, not Phase 31
declarations, so "no new sizes" still holds and the declared scale (30 / 14.5 / 13) is
within the four-size cap.

**Why deferred:** cosmetic completeness of the table; no behavioural or review consequence.

## 3. "Charger plus" — spec specifies a `Button`, code ships a legacy `.btn-out` link

**Found by:** UI checker, Dimensions 1 and 5.

`31-UI-SPEC.md` §1 specifies the pagination control as `Button variant="outline"`.
`PairReviewList.tsx` ships `<Link className="btn-out …">`, byte-identical to the same
control in `PartnersList` and `ClientsGrid` — so the **code** follows the real app-wide
convention and the **spec** is the inaccurate half.

Note `.btn-out` in `app/globals.css` carries `padding: 0.6rem 1.5rem` (9.6px vertical,
off the 4px grid) and a hardcoded `rgba(45, 122, 140, .18)` focus shadow — a third focus
treatment on this surface, neither the accent nor a token. Both are pre-existing drift
that UIC-01 says to correct when touching the surface, not defects introduced here.

**Why deferred:** reconciling it means either rewording the spec or migrating a shared
legacy CSS class used by several lists. Belongs with the app-shell refresh (31.1).

## 4. `PairReviewCard` / `MergeDialog` optical nudges

`mt-0.5` (2px) on icons, retained deliberately. UIC-01 places optical nudges outside the
multiple-of-4 rule; removing them visibly misaligns the icon against its text line. The
genuine sub-grid layout values (`gap-1.5`, `py-2.5`, `gap-0.5`) were corrected.

---

## Process note — the accent reserve list took four corrections

`31-UI-SPEC.md` § Color was wrong four times ("zero uses" → "one" → "two" → "three", now
four). Every failure had the same cause: the list was enumerated by reading this phase's
own files, or by asserting which tokens alias `--brand-accent` from memory. `globals.css`
defines **seven** such tokens, and most accent on any surface arrives through primitive
chrome rather than the phase's own classes.

The method that works is recorded in `UI-CONVENTIONS.md` UIC-03 and in that section's own
correction note. Step one is `grep -o -- "--[a-z-]*: *var(--brand-accent)" app/globals.css`
— running it, not describing it. The sweep must include shell primitives and the global
`@layer base` rule.

Related: UIC-03 previously carried a project-wide accent list of which two of four items
were false. It was deleted rather than corrected (commit `7dbeb01`) — a reserve list is a
per-surface, code-review artifact and goes stale the moment a primitive changes.
