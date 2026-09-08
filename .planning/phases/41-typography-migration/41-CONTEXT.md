# Phase 41: Typography Migration - Context

**Gathered:** 2026-09-08
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase swaps the PDF's registered typeface from Plus Jakarta Sans to Inter, and does
nothing else. The change is confined to the font-registration path in
`src/lib/pdf/document.tsx`, the font binaries in `public/fonts/`, the guard test that pins
them, and the byte-determinism fixture that records the resulting bytes.

The document's layout, palette, spacing, content and type scale stay exactly as they are
today. The new Claude Design layout — header band, client/advisor cards, loyer hero,
financial-conditions table, acceptance block, legal footer — is Phase 43. Newly captured
fields are Phase 42. The backfill is Phase 44.

The phase is deliberately isolated so that if a proposal PDF breaks, the font is the only
variable that changed. This is the same file a past `shadcn init` broke.

</domain>

<decisions>
## Implementation Decisions

### Type Scale

- **D-01:** Family swap only. `src/lib/pdf/styles.ts` keeps today's `pdfFontSizes`
  (8 / 9 / 10 / 22 / 32pt). The design's ten-step scale (6.8 / 7.5 / 8 / 8.5 / 9 / 9.5 /
  10 / 11 / 13 / 21pt) is **not** introduced here — not as consumed values, not as unused
  tokens. It arrives in Phase 43 alongside the card geometry that gives a 6.8pt caption a
  reason to exist. Rationale: the current document has five type roles and the new scale has
  ten; any mapping invented now is thrown away in Phase 43, and it would make the fixture
  delta "font + scale" so a regression could not be attributed to either.

- **D-02:** **Amendment required — two upstream documents currently contradict D-01 and
  each other.** ROADMAP Phase 41 success criterion 1 and REQUIREMENTS `DOC-09` both read
  "renders in Inter at the design's type scale (6.8 … 21pt)", while ROADMAP criterion 4
  reads "the PDF's visual design, palette and content stay exactly as they are today — this
  phase touches font registration only". Both cannot hold. **Resolution: the type-scale
  clause moves out of criterion 1 and out of `DOC-09`, and into Phase 43's requirement set.**
  Criterion 1 for this phase becomes: every text node renders in Inter, with Plus Jakarta
  Sans fully retired from the PDF font-registration path. The executing plan reconciles
  `.planning/ROADMAP.md` and `.planning/REQUIREMENTS.md` in-place, following the precedent
  set by Phase 26's D-01 scope note.

### Font Cuts & Provenance

- **D-03:** Four **static** Inter TTFs at weights 400 / 500 / 600 / 700 — a 1:1 structural
  swap for today's `PlusJakartaSans-{400,500,600,700}.ttf` block. **Not** the single variable
  font that the design's `tokens/fonts.css` declares. Rationale: all four weights are
  genuinely used in the render tree (400 ×9, 500 ×3, 600 ×1, 700 ×6 call sites), and
  `@react-pdf/renderer` selects a face by matching the registered `fontWeight` rather than
  setting a variation axis — a variable font would very likely render every weight at its
  default instance. That failure is silent: no error, no tofu, every gate green, a flat
  document. A missing static file throws instead.

- **D-04:** **Inter only. Inter Tight is not committed in this phase.** ROADMAP criterion 3
  asks for both, but neither `Quote-FR-A.dc.html` nor `Quote-EN-A.dc.html` references Inter
  Tight — both set `font-family:'Inter'` exclusively. Inter Tight is the design system's
  display face for the web app, not the document's. The "and Inter Tight" clause is dropped
  from criterion 3 by the same amendment as D-02. If Phase 43's header lockup turns out to
  need a display cut, Phase 43 commits it — in the same phase that proves it renders.

- **D-05:** The researcher chooses between Google Fonts and the upstream `rsms/inter`
  tagged release, and **pins the choice reproducibly**: source URL, release tag or version,
  and the SHA-256 of each of the four committed files, recorded in RESEARCH.md. These exact
  binaries become the PROP-17 byte-determinism baseline, so provenance is not an
  implementation detail. Note for the researcher: Google Fonts now ships Inter statics with
  optical-size prefixes (`Inter_18pt-Regular.ttf`, `Inter_24pt-…`, `Inter_28pt-…`) since the
  `opsz` axis landed — if that source is chosen, pick one optical size and state why.

### File Location & Retirement

- **D-06:** The Inter TTFs live in `public/fonts/`, flat, exactly where the Plus Jakarta
  Sans files live today. `FONT_DIR` in `document.tsx` is unchanged, `PDF_FONT_DIR` in the
  guard test is unchanged, and Next copies `public/` into the standalone build
  unconditionally — no `outputFileTracingIncludes` wiring, no class of deploy bug that only
  surfaces in production as a broken PDF. The files being publicly fetchable at
  `/fonts/Inter-400.ttf` is accepted: Inter is OFL-licensed.

- **D-07:** All nine Plus Jakarta Sans files are **deleted in the same commit as the swap** —
  the four `.ttf`s this phase orphans and the five `.woff2`s that have been dead since the
  web moved to `next/font/google`. Verified: outside `src/lib/pdf/document.tsx` and
  `tests/vendored-ui-integrity.test.ts`, nothing in the codebase references Plus Jakarta
  Sans. Git history keeps them recoverable; "fully retired" should mean the files are gone.

### Verification

- **D-08:** `tests/vendored-ui-integrity.test.ts` cases 3 and 4 are **inverted, not deleted**.
  They currently pin `family: 'PlusJakartaSans'` and carry the message "The PDF typeface is
  deliberately NOT Inter". They become: `family: 'Inter'`, the four `Inter-{400,500,600,700}.ttf`
  references, and their on-disk presence — with failure messages rewritten to explain the new
  baseline. The guard's purpose (catching a `shadcn init` or stray refactor silently changing
  the PDF face) is unchanged; only the pinned value moves. Threat `T-34-03-02` from
  `34-SECURITY.md` stays mitigated by the same mechanism.

- **D-09:** A new automated **glyph-coverage** test renders FR and EN and asserts that every
  character in the document's inventory resolves in the registered faces — accented vowels,
  `€`, `’`, `°`, U+202F, ordinary spaces. This is what proves ROADMAP criterion 2.

- **D-10:** The same proof asserts **four distinct embedded faces** (400 ≠ 500 ≠ 600 ≠ 700).
  Nothing in the repo currently catches "all weights collapsed to one face" — the exact
  failure a variable font would have produced. `render.ts` already parses PDF streams for the
  content hash, so the machinery to read embedded font descriptors exists.

- **D-11:** **Human visual pass before the phase closes.** Antoine opens one generated FR
  proposal and one generated EN proposal and confirms they read correctly. Automated glyph
  coverage cannot see "technically renders, looks wrong"; v1.8 was an entire milestone spent
  repaying verification debt, and this is cheap insurance.

- **D-12:** The byte-determinism fixture `__pdf-fixtures__/expected.sha256.txt` is regenerated
  to reflect the font swap. This is a **blocking** step — the fixture must be regenerated in
  the same change that swaps the font, or CI goes red. Both existing fixture suites
  (`render-fixtures.test.ts` and `commission-free-fixture.test.ts`) are in scope.

### Claude's Discretion

- **Committed file names.** Recommendation: `Inter-400.ttf` … `Inter-700.ttf`, mirroring the
  `PlusJakartaSans-{weight}.ttf` convention, so the guard test's `PDF_FONT_WEIGHTS` loop stays
  structurally identical and only the family string changes.
- Whether the distinct-faces assertion (D-10) lives in the existing `__pdf-fixtures__` suite
  or a new dedicated test file.
- The exact composition of the glyph inventory in D-09, provided it is derived from real
  rendered FR and EN output rather than hand-listed.
- Whether the phase ships as one plan or two (font acquisition + registration; then guards,
  proofs and fixture regeneration).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The design spec (authoritative on typography)
- `.planning/assets/v1.9-quote-design/tokens/fonts.css` — the `@font-face` declarations.
  Declares Inter as a **variable** font and Inter Tight as nine statics. D-03 deliberately
  diverges from the variable declaration; D-04 deliberately omits Inter Tight.
- `.planning/assets/v1.9-quote-design/tokens/typography.css` — `--font-display` (Inter Tight)
  vs `--font-body` (Inter), weight and tracking tokens, and the web type scale.
- `.planning/assets/v1.9-quote-design/Quote-FR-A.dc.html` — authoritative pixel spec, FR.
  Sets `font-family:'Inter'` only; `font-weight:600` in 12 places; ten `pt` sizes.
- `.planning/assets/v1.9-quote-design/Quote-EN-A.dc.html` — authoritative pixel spec, EN.
- `.planning/assets/v1.9-quote-design/README.md` — handoff bundle instructions. Note: it
  points at `quote-design-system/project/…` paths that were **not** vendored; only `tokens/`
  and `svg/` came across, which is why the font binaries must be acquired separately (D-05).

### The code this phase touches
- `src/lib/pdf/document.tsx` §10-43 — the `Font.register` block, its landmine comments, and
  `fontFamily: 'PlusJakartaSans'` at line 112.
- `src/lib/pdf/styles.ts` — `pdfFontSizes` / `pdfFontWeights`. Frozen by D-01.
- `src/lib/pdf/render.ts` — `computeContentHash`, the PROP-17 determinism contract, and the
  existing PDF-stream parsing that D-10 can build on.
- `tests/vendored-ui-integrity.test.ts` §42-46, §126-158 — the guard constants and cases 3
  and 4 that D-08 inverts.
- `__pdf-fixtures__/expected.sha256.txt`, `__pdf-fixtures__/render-fixtures.test.ts`,
  `__pdf-fixtures__/commission-free-fixture.test.ts` — the fixtures D-12 regenerates.
- `app/layout.tsx` §10-23 — the web's `next/font/google` Inter registration, and the comment
  that already names this phase as the pending PDF follow-up.
- `app/globals.css` §260-261, §574-578 — `--font-inter` / `--font-sans` / `--font-heading`.
  Untouched by this phase; guard case 2 protects them.

### Why the guard exists (read before changing it)
- `.planning/milestones/v1.6-phases/34-fiche-client/34-03-PLAN.md` §196-243 — the task that
  created guard cases 3 and 4, including the negative check (renaming a TTF must fail the
  suite) as an acceptance criterion.
- `.planning/milestones/v1.6-phases/34-fiche-client/34-03-SUMMARY.md` §152-199 — the recorded
  reasoning, the four TTF hashes, and the explicit note that `family: 'Inter'` was a *failure*
  condition at the time.
- `.planning/milestones/v1.6-phases/34-fiche-client/34-SECURITY.md` §386 — threat
  `T-34-03-02` (tampering with the font registration silently re-baselining PROP-17).

### The original registration and its landmines
- `.planning/milestones/v1.1-phases/08-persistence-pdf-pipeline/08-05-PLAN.md` §355-360 —
  the original `Font.register` call, written against `.woff2`.
- `.planning/milestones/v1.1-phases/08-persistence-pdf-pipeline/08-UI-SPEC.md` §594-609 —
  the PDF typography contract and the 10pt body-size rationale.
- `.planning/milestones/v1.1-phases/05-bootstrap-deploy/05-02-SUMMARY.md` §82-90 — how the
  Plus Jakarta Sans binaries were acquired and pinned. The template D-05 should follow.

### Milestone scope
- `.planning/REQUIREMENTS.md` — `DOC-09` (this phase), `DOC-13` (byte-determinism), and the
  Out-of-Scope section. Amended per D-02.
- `.planning/ROADMAP.md` § "Phase 41: Typography Migration" — goal and four success criteria.
  Criteria 1 and 3 amended per D-02 and D-04.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`computeContentHash` in `src/lib/pdf/render.ts`** already extracts and inflates every
  compressed PDF stream. D-10's distinct-faces assertion can reuse that traversal rather than
  writing a second PDF parser.
- **`PDF_FONT_WEIGHTS = [400, 500, 600, 700]` in the guard test** is already a loop over the
  exact weight set Inter needs. Only the family string and the file-name stem change.
- **`public/fonts/` and `FONT_DIR = path.join(process.cwd(), 'public', 'fonts')`** — the whole
  resolution path already works in Node runtime and in the standalone build. D-06 keeps it.

### Established Patterns
- **TTF, never woff2, for the PDF.** `document.tsx` §24-31 records that fontkit's woff2 brotli
  path throws `DataView` bounds errors when multiple weights share a decompression buffer.
  Inter must be committed as TTF for the same reason.
- **Register once at module load**, absolute `file://`-resolvable paths, same bytes on every
  machine — the determinism contract in `document.tsx` §14-20 and `render.ts`.
- **The document declares `fontFamily` exactly once**, on the `<Page>` at `document.tsx:112`;
  every child inherits. One string changes, not thirty.
- **Amendment-in-plan precedent:** when a phase's own criteria turn out wrong, the executing
  plan reconciles ROADMAP + REQUIREMENTS in-place and records a scope note (Phase 26 D-01,
  Phase 20 D-15). D-02 follows that pattern.

### Integration Points
- `src/lib/pdf/document.tsx` — the single registration block and the single `fontFamily`.
- `public/fonts/` — four files added, nine removed.
- `tests/vendored-ui-integrity.test.ts` — cases 3 and 4 inverted.
- `__pdf-fixtures__/expected.sha256.txt` — regenerated; blocking for CI.
- Nothing else. The web UI is already Inter via `next/font/google` and is not touched.

</code_context>

<specifics>
## Specific Ideas

- **The web and the PDF converge on Inter, but not on the same file.** `app/layout.tsx` gets
  the variable webfont from `next/font/google`; the PDF gets four static TTFs from the repo.
  They are the same family, not the same binary, and `next/font`'s build output is not a
  stable path the renderer can read. Do not attempt to share one source.
- **`sanitize-number.ts` may now be redundant.** It exists because Plus Jakarta Sans
  mis-rendered U+202F (the narrow no-break space French number formatting emits) — the Phase
  23 `PDF-01` fix. Inter handles U+202F correctly. Removing the sanitizer would change
  rendered output, which D-01 forbids in this phase, so it stays. Recorded as a deferred idea.
- **Weight fidelity is the failure mode with no natural alarm.** Tofu is visible, a missing
  file throws, but "all four weights rendered at 400" produces a valid, gate-green, subtly
  wrong document. D-10 exists specifically for that.

</specifics>

<deferred>
## Deferred Ideas

- **The design's ten-step type scale (6.8 – 21pt)** — Phase 43, with the layout that gives it
  meaning. Per D-01.
- **Inter Tight** — Phase 43, and only if the header lockup or hero genuinely needs a display
  cut. Per D-04.
- **Retiring `sanitize-number.ts`** — revisit once the Phase 43 layout has landed and the
  fixture is being re-baselined anyway. Verify against a rendered Inter proposal that U+202F
  survives correctly before removing anything; the Phase 23 `PDF-01` reproduction test is the
  gate.
- **Sharing one font source between web and PDF** — not possible today; would need
  `next/font/local` pointed at the same committed TTFs, which changes the web's loading
  behaviour for no PDF benefit. Not pursued.

### Reviewed Todos (not folded)
- `wr-07-db-guard-skip-rule.md` — "Harden the DB guard's NODE_ENV=test SKIP rule". Matched at
  0.6 on generic keywords only (`node`, `source`, `phase`); it is a database-guard concern
  with no relationship to font registration. Belongs with the Phase 39 guard work.
- `ops-03-ovh-cutover-december-2026.md` — "Provision an OVH-compatible target and run
  scripts/smoke-ovh.ts". Matched at 0.2; unrelated infrastructure milestone.

</deferred>

---

*Phase: 41-Typography Migration*
*Context gathered: 2026-09-08*
