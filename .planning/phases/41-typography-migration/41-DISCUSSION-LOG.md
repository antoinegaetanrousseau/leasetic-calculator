# Phase 41: Typography Migration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-08
**Phase:** 41-Typography Migration
**Areas discussed:** Type scale timing, Font cuts & files, Where the TTFs live, Proof it worked

---

## Area selection

| Option | Description | Selected |
|--------|-------------|----------|
| Type scale timing | Criteria 1 and 4 contradict: adopt the design's 10-step scale now, or keep today's and swap the family only? | ✓ |
| Font cuts & files | Four static TTFs or the variable file? Does Inter Tight get committed? | ✓ |
| Where the TTFs live | `public/fonts/` or a non-public dir? What happens to the Plus Jakarta Sans files? | ✓ |
| Proof it worked | What proves criterion 2 beyond the byte-determinism fixture? | ✓ |

**User's choice:** all four areas.

---

## Type scale timing

| Option | Description | Selected |
|--------|-------------|----------|
| Family swap only *(recommended)* | Keep today's 8/9/10/22/32pt scale; change only the registered family. Phase 41 stays a one-variable change; Phase 43 brings the new scale with the layout that needs it. Amend criterion 1 to drop the scale clause. | ✓ |
| Adopt the scale now | Add all ten sizes and re-typeset today's layout onto them. Front-loads Phase 43 work, but maps 5 type roles onto 10 sizes speculatively and makes the fixture delta unattributable. | |
| Scale tokens now, unused | Add the ten sizes as dead tokens. Satisfies criterion 1 on paper; ships unreferenced constants nothing proves correct. | |

**User's choice:** Family swap only.
**Notes:** Consequence accepted at the same time — `DOC-09`'s own "at the design's type scale" clause has to move to Phase 43 too, otherwise the ROADMAP and REQUIREMENTS stay in conflict with each other. Recorded as D-02.

---

## Font cuts & files

### Static cuts vs variable font

| Option | Description | Selected |
|--------|-------------|----------|
| Four static TTFs *(recommended)* | 400/500/600/700 as separate files, a 1:1 swap for today's block. All four weights are in use. `@react-pdf` matches a face by registered `fontWeight`, so statics are the only reliable route; a missing file throws. | ✓ |
| Single variable TTF | Matches the design's `fonts.css`. Smallest footprint, but `@react-pdf` sets no variation axes — likely renders every weight at the default instance, silently. | |
| Static, weights re-derived at plan time | Collapses to the same four files; defers the decision. | |

**User's choice:** Four static TTFs.

### Inter Tight

| Option | Description | Selected |
|--------|-------------|----------|
| Inter only *(recommended)* | Neither `.dc.html` references Inter Tight — it is the design system's web display face, not the document's. Amend criterion 3 to drop it. | ✓ |
| Commit both now | Honours criterion 3 literally; ships nine unused binaries the guard cannot prove reachable. | |
| Defer to Phase 43 | Inter only now; Phase 43 commits a display cut if its layout needs one. | |

**User's choice:** Inter only.
**Notes:** Functionally identical to "Defer to Phase 43" — CONTEXT.md records the Phase 43 revisit under Deferred Ideas.

### Font provenance

| Option | Description | Selected |
|--------|-------------|----------|
| Researcher decides, pins it *(recommended)* | Researcher picks between Google Fonts and `rsms/inter`, then pins source URL, tag and per-file SHA-256 in RESEARCH.md. Flags the Google Fonts optical-size prefix (`Inter_18pt-…`) as a choice to justify. | ✓ |
| `rsms/inter` GitHub release | Upstream author's tagged release; no optical-size ambiguity. | |
| Google Fonts | Same family the web gets — but the web gets the variable webfont, so the lineage argument is weaker than it sounds. | |

**User's choice:** Researcher decides and records it.

---

## Where the TTFs live

### Location

| Option | Description | Selected |
|--------|-------------|----------|
| `public/fonts/` *(recommended)* | Existing convention. `FONT_DIR` and `PDF_FONT_DIR` unchanged; Next copies `public/` into the standalone build unconditionally. Files publicly fetchable — harmless for an OFL font. | ✓ |
| Non-public assets dir | Cleaner separation, but needs `outputFileTracingIncludes` wiring; failure surfaces only in production as a broken PDF. | |
| `public/fonts/pdf/` subfolder | No tracing risk, clearer ownership; two constants change. | |

**User's choice:** `public/fonts/`.

### Plus Jakarta Sans disposition

| Option | Description | Selected |
|--------|-------------|----------|
| Delete all nine *(recommended)* | 4 TTFs + 5 woff2s, same commit as the swap. Nothing references them; the woff2s died when the web moved to `next/font/google`. Git history keeps them recoverable. | ✓ |
| Delete TTFs, keep woff2s | Conservative; preserves five files no code has referenced for months. | |
| Keep everything until v1.9 ships | Maximum rollback comfort; ~700KB dead weight and an ambiguous retirement claim. | |

**User's choice:** Delete all nine.
**Notes:** Verified before offering the option — outside `document.tsx` and the guard test, no reference to Plus Jakarta Sans exists in source, CSS or config.

---

## Proof it worked

### The guard test

| Option | Description | Selected |
|--------|-------------|----------|
| Invert to pin Inter *(recommended)* | Rewrite cases 3 and 4 to assert `family: 'Inter'`, the four file references and their on-disk presence, with new failure messages. Guard purpose unchanged; only the pinned value moves. | ✓ |
| Invert plus a negative check | Also assert Plus Jakarta Sans appears nowhere and no `PlusJakartaSans-*.ttf` survives, so a bad merge fails loudly. | |
| Drop cases 3 and 4 | Let the fixture catch face changes. Fewer tests, but the fixture says "bytes differ", not "someone swapped your typeface". | |

**User's choice:** Invert to pin Inter.

### Tofu / glyph proof

| Option | Description | Selected |
|--------|-------------|----------|
| Automated + human pass *(recommended)* | Glyph-coverage test over the FR and EN character inventory, plus Antoine opening one FR and one EN generated PDF. | ✓ |
| Automated only | Repeatable and CI-enforced, but blind to "all weights rendered at 400". | |
| Human only | Fastest; nothing stops a later regression. | |

**User's choice:** Automated + human pass.

### Weight-fidelity assertion

| Option | Description | Selected |
|--------|-------------|----------|
| Assert four distinct embedded faces *(recommended)* | Read the embedded font descriptors and assert 400 ≠ 500 ≠ 600 ≠ 700. The one check that would have caught the variable-font trap; `render.ts` already parses PDF streams. | ✓ |
| File references are enough | Trust `@react-pdf` to use the registered files. | |
| Decide at plan time | Let the planner judge. | |

**User's choice:** Assert four distinct embedded faces.

---

## Claude's Discretion

- Committed file names (recommendation on record: `Inter-{400,500,600,700}.ttf`, mirroring the existing stem so the guard's weight loop is unchanged).
- Whether the distinct-faces assertion lives in the existing `__pdf-fixtures__` suite or a new test file.
- The exact composition of the glyph inventory, provided it is derived from real rendered FR/EN output.
- Whether the phase ships as one plan or two.
- Which font source the researcher selects, and which optical size if Google Fonts is chosen.

## Deferred Ideas

- The design's ten-step type scale (6.8 – 21pt) → Phase 43.
- Inter Tight → Phase 43, only if the header lockup needs a display cut.
- Retiring `sanitize-number.ts` — the U+202F workaround may be redundant under Inter, but removing it changes rendered output, which this phase forbids. Revisit when Phase 43 re-baselines the fixture.
- Sharing one font source between web and PDF — would need `next/font/local`, changing the web's loading behaviour for no PDF benefit. Not pursued.
