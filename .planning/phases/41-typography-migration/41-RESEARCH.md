# Phase 41: Typography Migration - Research

**Researched:** 2026-09-08
**Domain:** Self-hosted PDF font registration (`@react-pdf/renderer` 4.5.1 / `@react-pdf/font` 4.0.8 / `fontkit` 2.0.4), OFL font provenance/pinning, PDF-internals verification (embedded font descriptors)
**Confidence:** HIGH — every priority question was resolved by reading the installed package source, downloading and inspecting the actual font binaries, and rendering a real PDF with the current pipeline, not by recollection.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

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
  **RESOLVED by this research: `rsms/inter` v4.1 chosen — see Standard Stack → D-05 Pin.**

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
  **See this research's Runtime State Inventory for a correction: 6 additional files carry
  comment-only references, all non-functional — D-07's deletion plan is unaffected.**

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
  **This research adopts that recommendation — see Standard Stack → D-05 Pin table.**
- Whether the distinct-faces assertion (D-10) lives in the existing `__pdf-fixtures__` suite
  or a new dedicated test file.
  **This research recommends: a single new file, `__pdf-fixtures__/inter-typography.test.ts`,
  covering BOTH D-09 and D-10 — CONTEXT.md's own D-10 text calls them "the same proof."**
- The exact composition of the glyph inventory in D-09, provided it is derived from real
  rendered FR and EN output rather than hand-listed.
  **See Architecture Patterns → Pattern 3 for the derivation technique and this research's
  own static-derivation results (Priority 3 / Code Examples).**
- Whether the phase ships as one plan or two (font acquisition + registration; then guards,
  proofs and fixture regeneration).
  **Left to the planner — no research finding favors one split over the other.**

### Deferred Ideas (OUT OF SCOPE)

- **The design's ten-step type scale (6.8 – 21pt)** — Phase 43, with the layout that gives it
  meaning. Per D-01.
- **Inter Tight** — Phase 43, and only if the header lockup or hero genuinely needs a display
  cut. Per D-04.
- **Retiring `sanitize-number.ts`** — revisit once the Phase 43 layout has landed and the
  fixture is being re-baselined anyway. Verify against a rendered Inter proposal that U+202F
  survives correctly before removing anything; the Phase 23 `PDF-01` reproduction test is the
  gate. **This research confirms Inter DOES cover U+202F (see Priority 3 results) — the
  removal precondition will be satisfied whenever Phase 43 revisits this, but do NOT act on
  it in this phase.**
- **Sharing one font source between web and PDF** — not possible today; would need
  `next/font/local` pointed at the same committed TTFs, which changes the web's loading
  behaviour for no PDF benefit. Not pursued.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DOC-09 | The PDF renders in Inter (type-scale clause moved to Phase 43 per D-02 amendment), replacing Plus Jakarta Sans, with no missing-glyph or font-registration failure in any rendered proposal. | Standard Stack (D-05 pinned Inter source + hashes) resolves the "renders in Inter" acquisition question. Architecture Patterns Pattern 1 (weight-exact registration) + Priority 2 finding (weight-matching mechanism, not variation axis) resolves "no font-registration failure." Priority 3 glyph-coverage results (Code Examples table, 68/68 codepoints covered across all 4 weights) resolves "no missing-glyph failure." Validation Architecture maps this requirement to the concrete new test file and the existing guard-test inversion (D-08). |

</phase_requirements>


## Summary

This phase is a narrow, high-confidence swap: replace the four static `PlusJakartaSans-{400,500,600,700}.ttf` files registered in `src/lib/pdf/document.tsx` with four static `Inter-{400,500,600,700}.ttf` files, invert the two guard-test assertions that currently pin Plus Jakarta Sans, add a new glyph-coverage + distinct-faces proof, and regenerate the byte-determinism fixture. All six research priorities resolved cleanly with no conflicts against CONTEXT.md's locked decisions.

The two mechanically-load-bearing findings: (1) `@react-pdf/font`'s `FontFamily.resolve()` selects among **statically registered `FontSource` objects by matching a `fontWeight` number**, and a `getVariation()` method that would set a variable font's `wght` axis exists only as an unused stub on the internal `StandardFont` class — it is never called for TTF-backed sources. This empirically confirms D-03: a single variable Inter file registered without one `FontSource` per weight would resolve every weight request to the *same* `FontSource` object, rendering all four requested weights identically. (2) Rendering the current happy-path-fr fixture and parsing the raw PDF bytes shows **one `/FontDescriptor` + one `/FontFile2` embedded stream per registered weight** (4 objects today, one per Plus Jakarta Sans cut) — the exact mechanism D-10's "four distinct embedded faces" proof needs to assert against, and it is directly reusable once Inter is registered the same way.

The upstream `rsms/inter` GitHub release (not Google Fonts) is the recommended D-05 source: it ships plain `Inter-{Regular,Medium,SemiBold,Bold}.ttf` static files with no optical-size filename prefix (the `opsz`-prefix problem CONTEXT.md flagged is specific to Google Fonts' distribution; rsms/inter instead separates optical cuts into an entirely different family name, `InterDisplay-*`, so the plain `Inter-*.ttf` files require no optical-size decision at all). Both the release ZIP and each of the four extracted TTFs were downloaded and SHA-256'd in this session — see Package Legitimacy Audit and D-05 Pin below.

**Primary recommendation:** Pin Inter 4.1 from `rsms/inter`'s GitHub release, commit `extras/ttf/Inter-{Regular,Medium,SemiBold,Bold}.ttf` renamed to `Inter-{400,500,600,700}.ttf`, and build the new D-09/D-10 proof as a single new file `__pdf-fixtures__/inter-typography.test.ts` that (a) derives its glyph inventory from the actual `src/lib/i18n/dictionaries.ts` `pdf.*`/`proposal.*` values plus the document's static literals, and (b) parses the rendered PDF's `/FontDescriptor` + `/FontFile2` objects to assert exactly 4 distinct embedded font subsets with 4 distinct decompressed stream hashes.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| PDF font registration (`Font.register`) | Backend / server-only module (`src/lib/pdf/document.tsx`, Node runtime) | — | `@react-pdf/renderer`'s `renderToBuffer` runs server-side only (`import 'server-only'` in `render.ts`); font bytes are read from `public/fonts/` via absolute `file://` paths at render time, not shipped to the browser |
| Font binary storage | Static / Build artifact (`public/fonts/`) | CDN (implicit — Next copies `public/` into the standalone build and Vercel serves it) | D-06: flat file, no `outputFileTracingIncludes` wiring; publicly fetchable at `/fonts/Inter-400.ttf` (OFL-licensed, no protection needed) |
| Web UI typeface (unaffected by this phase) | Browser / Frontend (`next/font/google` in `app/layout.tsx`) | — | Confirmed structurally isolated from the PDF path; the two surfaces load different binaries and are asserted separately by `tests/vendored-ui-integrity.test.ts` cases 1-2 vs 3-4 |
| Byte-determinism fixture regeneration | Build-time script (Node, no server) | — | `scripts/update-pdf-fixture.ts` imports `pdfFixtures` (frozen constants) + `renderProposalPdf` directly; zero DB, zero network, zero env-var dependency |
| Glyph-coverage / distinct-faces proof (D-09/D-10) | Test / CI (Vitest, `@vitest-environment node`) | — | Must render real bytes and parse the PDF binary, exactly like the existing `__pdf-fixtures__` suites; jsdom polyfills shift `@react-pdf/renderer` output, so this MUST use the `node` environment pragma |

## Standard Stack

### Core
| Library | Version (installed) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@react-pdf/renderer` | 4.5.1 `[VERIFIED: package.json + node_modules]` | PDF rendering engine | Already locked (PROP-16); this phase does not touch it |
| `@react-pdf/font` | 4.0.8 `[VERIFIED: node_modules/@react-pdf/font/package.json]` | Font registration/resolution internals `@react-pdf/renderer` re-exports as `Font` | Read directly to verify D-03's weight-matching claim (Priority 2) |
| `fontkit` | 2.0.4 `[VERIFIED: node_modules/fontkit/package.json]` | TTF parsing, glyph lookup, subsetting — transitive dep of `@react-pdf/font` (`"fontkit": "^2.0.2"`) | Already present; used in this research session to probe glyph coverage on the downloaded Inter TTFs (`fontkit.openSync(path).hasGlyphForCodePoint(cp)`) — no new dependency needed for the D-09 test |

No new npm packages are introduced by this phase — the only new artifacts are four static font binaries committed to `public/fonts/`, exactly mirroring how Plus Jakarta Sans was committed in Phase 5.

### Font source (D-05 — researcher's choice, pinned)

**Chosen: upstream `rsms/inter` GitHub release, NOT Google Fonts.**

| Property | Value |
|---|---|
| Repository | `https://github.com/rsms/inter` |
| Release tag | `v4.1` (released 2024-11-16 per public release history) |
| Release asset | `Inter-4.1.zip` |
| Asset URL | `https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip` |
| License | SIL Open Font License 1.1 (`LICENSE.txt` inside the zip; copyright "The Inter Project Authors") |
| Zip SHA-256 | `9883fdd4a49d4fb66bd8177ba6625ef9a64aa45899767dde3d36aa425756b11e` `[VERIFIED: shasum -a 256, this session]` |

**Rationale over Google Fonts:** CONTEXT.md's flagged wrinkle — Google Fonts now ships Inter statics with optical-size filename prefixes (`Inter_18pt-Regular.ttf`, `Inter_24pt-…`, `Inter_28pt-…`) because the `opsz` variable axis landed upstream — is a Google-Fonts-distribution-specific problem, not an upstream-Inter problem. The rsms/inter release ZIP separates optical cuts by **family name**, not by a numeric filename prefix: the default/text optical size ships as plain `Inter-{Weight}.ttf` under `extras/ttf/`, and the larger optical cut ships as an entirely separate `InterDisplay-{Weight}.ttf`. Choosing the plain `Inter-*.ttf` files sidesteps the optical-size decision CONTEXT.md worried about — there is no prefix to pick between, and the resulting filenames map cleanly onto the `Inter-{weight}.ttf` convention Claude's Discretion note recommended. rsms/inter is also the canonical upstream (Google Fonts vendors from it), so using it directly removes a hop.

**Per-file pin (downloaded, extracted, and hashed in this session — not placed in `public/fonts/`, per the research-only constraint):**

| Committed filename | Source path inside `Inter-4.1.zip` | Upstream static name | fontkit `postscriptName` | SHA-256 |
|---|---|---|---|---|
| `Inter-400.ttf` | `extras/ttf/Inter-Regular.ttf` | Inter Regular | `Inter-Regular` | `40d692fce188e4471e2b3cba937be967878f631ad3ebbbdcd587687c7ebe0c82` |
| `Inter-500.ttf` | `extras/ttf/Inter-Medium.ttf` | Inter Medium | `Inter-Medium` | `97ad806f526e41546d46365bb3a393145f75b7b1568913db74549ad8b8dba872` |
| `Inter-600.ttf` | `extras/ttf/Inter-SemiBold.ttf` | Inter SemiBold | `Inter-SemiBold` | `78a843fade9d4612a5567302fb595b56976eb5fcebf4fea5a5912d638bafcde3` |
| `Inter-700.ttf` | `extras/ttf/Inter-Bold.ttf` | Inter Bold | `Inter-Bold` | `288316099b1e0a47a4716d159098005eef7c0066921f34e3200393dbdb01947f` |

All four SHA-256 values `[VERIFIED: shasum -a 256, this session, against files extracted from the hash-verified zip above]`.

**Reproduction command sequence for the executor:**
```bash
# 1. Download and verify the release zip
curl -sL -o /tmp/Inter-4.1.zip \
  "https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip"
echo "9883fdd4a49d4fb66bd8177ba6625ef9a64aa45899767dde3d36aa425756b11e  /tmp/Inter-4.1.zip" | shasum -a 256 -c -

# 2. Extract
unzip -q /tmp/Inter-4.1.zip -d /tmp/inter-4.1

# 3. Copy + rename the four static weights this phase needs
cp /tmp/inter-4.1/extras/ttf/Inter-Regular.ttf  public/fonts/Inter-400.ttf
cp /tmp/inter-4.1/extras/ttf/Inter-Medium.ttf   public/fonts/Inter-500.ttf
cp /tmp/inter-4.1/extras/ttf/Inter-SemiBold.ttf public/fonts/Inter-600.ttf
cp /tmp/inter-4.1/extras/ttf/Inter-Bold.ttf     public/fonts/Inter-700.ttf

# 4. Verify byte-identical output against the table above
shasum -a 256 public/fonts/Inter-400.ttf public/fonts/Inter-500.ttf \
              public/fonts/Inter-600.ttf public/fonts/Inter-700.ttf
```

This mirrors the exact provenance-recording pattern `05-02-SUMMARY.md §80-92` used for Plus Jakarta Sans (source repo, per-weight source path, size/hash table, OFL license note).

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| rsms/inter release ZIP (statics under `extras/ttf/`) | Google Fonts `google/fonts` GitHub mirror or `fonts.google.com` download | Forces an optical-size filename decision (`Inter_18pt-*` etc.) the design's own `tokens/fonts.css` doesn't make (it references a single unprefixed variable font); adds an indirection hop since Google vendors from rsms/inter anyway |
| Four static TTFs | The single `Inter-VariableFont_opsz_wght.ttf` the design's `tokens/fonts.css` declares | **Rejected by D-03**, confirmed correct by this research (Priority 2): `@react-pdf/font` never sets a variation axis; a variable font registered once would render every weight identically — silent, gate-green, flat-document failure |

**Installation:** No `npm install` — this is a static-asset commit, not a package. Package Legitimacy Audit below is scoped accordingly.

## Package Legitimacy Audit

**Not applicable in the npm-registry sense** — this phase installs zero npm packages. The "package" here is a font binary from a GitHub release, not an npm/PyPI/crates artifact, so `slopcheck`/registry-verification tooling doesn't apply. Provenance is instead established the way Phase 5 established it for Plus Jakarta Sans: named upstream repository, tagged release, per-file SHA-256, OFL license text inspected directly from the downloaded archive.

| Artifact | Source | Provenance check performed | Disposition |
|---|---|---|---|
| `Inter-4.1.zip` | `github.com/rsms/inter` official release | Downloaded, SHA-256 recorded, `LICENSE.txt` inside the zip inspected and confirms OFL-1.1 + "The Inter Project Authors" copyright | Approved `[VERIFIED: downloaded + hashed + license-inspected this session]` |
| Four extracted static TTFs | `extras/ttf/` inside the verified zip | Each individually SHA-256'd; glyph coverage independently probed with fontkit (see Priority 3 results below) | Approved `[VERIFIED]` |

**Packages removed due to slopcheck verdict:** none (not applicable — no packages).
**Packages flagged as suspicious:** none.

## Architecture Patterns

### System Architecture Diagram

```
Proposal row (DB, unchanged)
        │
        ▼
renderProposalPdf(data)  [src/lib/pdf/render.ts, server-only]
        │
        ├─ React.createElement(ProposalDocument, { data })
        │         │
        │         ▼
        │   <Document> → <Page style={{ fontFamily: 'Inter', ... }}>
        │         (single fontFamily declaration, document.tsx:112 — unchanged this phase
        │          except the string 'PlusJakartaSans' → 'Inter')
        │
        ▼
@react-pdf/renderer renderToBuffer()
        │
        ├─ @react-pdf/font FontStore.getFont({fontFamily:'Inter', fontWeight})
        │     → FontFamily.resolve(descriptor)
        │     → exact-match lookup among the 4 registered FontSource entries
        │     → fontkit.open(FONT_DIR/Inter-{weight}.ttf)   ← per-weight file, not a variation axis
        │
        ▼
PDFKit writes 1 /FontDescriptor + 1 /FontFile2 (embedded, subsetted) per weight actually used
        │
        ▼
Buffer  →  computeContentHash()  (existing, PROP-17 — sorts+hashes all compressed streams)
        →  new D-10 helper: parse /FontDescriptor+/FontFile2 pairs, assert 4 distinct subsets
        →  new D-09 helper: reconstruct visible text (ToUnicode CMap), assert glyph inventory covered
```

### Recommended Project Structure
```
public/fonts/
├── Inter-400.ttf   # was PlusJakartaSans-400.ttf
├── Inter-500.ttf   # was PlusJakartaSans-500.ttf
├── Inter-600.ttf   # was PlusJakartaSans-600.ttf
└── Inter-700.ttf   # was PlusJakartaSans-700.ttf
    (9 Plus Jakarta Sans files deleted — see D-07 verification below)

__pdf-fixtures__/
├── fixtures.ts                    # unchanged (frozen data, family-agnostic)
├── expected.sha256.txt            # regenerated (blocking, D-12)
├── render-fixtures.test.ts        # unchanged (asserts contentHash === committed hash)
├── commission-free-fixture.test.ts# unchanged
└── inter-typography.test.ts       # NEW — D-09 glyph coverage + D-10 distinct-faces, one file
```

### Pattern 1: Weight-exact `Font.register` (unchanged shape, new family)
**What:** Register 4 `FontSource` entries under one family name, one per static file, each declaring its own `fontWeight`.
**When to use:** Any time `@react-pdf/renderer` needs more than one weight of a typeface — this is the ONLY correct pattern; a single variable-font registration cannot be weight-selected.
**Example (the only change is the family string and the four `src` filenames):**
```typescript
// Source: src/lib/pdf/document.tsx:35-43 (existing pattern, verified against
// @react-pdf/font 4.0.8's FontFamily.resolve — node_modules/@react-pdf/font/lib/index.js:307-344)
Font.register({
  family: 'Inter',
  fonts: [
    { src: path.join(FONT_DIR, 'Inter-400.ttf'), fontWeight: 400 },
    { src: path.join(FONT_DIR, 'Inter-500.ttf'), fontWeight: 500 },
    { src: path.join(FONT_DIR, 'Inter-600.ttf'), fontWeight: 600 },
    { src: path.join(FONT_DIR, 'Inter-700.ttf'), fontWeight: 700 },
  ],
});
```

### Pattern 2: Distinct-faces proof by parsing embedded FontDescriptors (D-10)
**What:** A regex-based extraction of every `/Type /FontDescriptor ... /FontName /X ... /FontFile2 N 0 R` object, followed by decompressing and hashing each referenced `/FontFile2` stream.
**When to use:** Exactly D-10's assertion — "four distinct embedded faces (400 ≠ 500 ≠ 600 ≠ 700)."
**Empirically verified this session** by rendering the current `happy-path-fr` fixture (still Plus Jakarta Sans) and parsing the raw bytes:

```
FontDescriptor count in rendered PDF: 4
FontFile2 count in rendered PDF: 4

obj 27: /FontName /JRJJHY+PlusJakartaSans-Bold      → FontFile2 obj 26, decompressed SHA-256: 23ad79a4…, 9569 bytes
obj 31: /FontName /TSLJXB+PlusJakartaSans-Regular   → FontFile2 obj 30, decompressed SHA-256: 55e7cb64…, 12053 bytes
obj 35: /FontName /HWLLDC+PlusJakartaSans-SemiBold  → FontFile2 obj 34, decompressed SHA-256: b1cf87a3…, 5561 bytes
obj 39: /FontName /VHFMND+PlusJakartaSans-Medium    → FontFile2 obj 38, decompressed SHA-256: ca0179f9…, 9875 bytes

distinct stream hashes: 4 of 4
```
(6-character prefix before `+` is PDFKit's random subset tag, regenerated every render — do not assert against it. The stable part is the `-Regular`/`-Medium`/`-SemiBold`/`-Bold` PostScript-name suffix, confirmed identical to the downloaded Inter TTFs' own `postscriptName` values: `Inter-Regular`, `Inter-Medium`, `Inter-SemiBold`, `Inter-Bold`.)

**Worked extraction technique (Node, sibling to `computeContentHash`, not a reuse of it):**
```typescript
// computeContentHash (render.ts) deliberately discards which stream is which —
// it sorts ALL compressed stream hashes together for determinism comparison.
// D-10 needs the opposite: per-object identity tied to font weight. Write a
// small sibling helper (new file or inline in the new test) rather than
// extending computeContentHash's contract:
function extractEmbeddedFontFaces(buffer: Buffer): Array<{ fontName: string; streamHash: string; byteLength: number }> {
  const text = buffer.toString('binary');
  const objRe = /(\d+)\s+0\s+obj\s*(.*?)endobj/gs;
  const objects = new Map<number, string>();
  for (const m of text.matchAll(objRe)) objects.set(Number(m[1]), m[2]);

  const fdRe = /\/Type\s*\/FontDescriptor.*?\/FontName\s*\/([A-Za-z0-9+_-]+).*?\/FontFile2\s+(\d+)\s+0\s+R/gs;
  const results: Array<{ fontName: string; streamHash: string; byteLength: number }> = [];
  for (const m of text.matchAll(fdRe)) {
    const [, fontName, objNumStr] = m;
    const body = objects.get(Number(objNumStr)) ?? '';
    const streamMatch = body.match(/stream\r?\n([\s\S]*?)\r?\nendstream/);
    if (!streamMatch) continue;
    const raw = Buffer.from(streamMatch[1], 'binary');
    const decompressed = (() => { try { return inflateSync(raw); } catch { return raw; } })();
    results.push({
      fontName,
      streamHash: createHash('sha256').update(decompressed).digest('hex'),
      byteLength: decompressed.byteLength,
    });
  }
  return results;
}

// Assertion for D-10 (after Inter is registered):
const faces = extractEmbeddedFontFaces(buffer);
expect(faces).toHaveLength(4);
expect(new Set(faces.map((f) => f.streamHash)).size).toBe(4); // guards against 4 descriptors pointing at byte-identical data
expect(faces.map((f) => f.fontName.split('+')[1]).sort()).toEqual(
  ['Inter-Bold', 'Inter-Medium', 'Inter-Regular', 'Inter-SemiBold'].sort(),
);
```

### Pattern 3: Deriving the glyph inventory from real i18n output (D-09)
**What:** CONTEXT.md forbids a hand-listed inventory. The inventory must come from what the document actually renders.
**Concrete technique verified this session:** the PDF's visible text comes from a closed, enumerable set of `dictionaries.ts` keys consumed by `document.tsx` (`pdf.*` + the five `proposal.*` keys used in the computation card / interests block), plus a handful of literal strings in `document.tsx` itself (`'LEASÉTIC'`, `'✓  '`, `'Page'`, and whatever `formatCurrency`/`formatDate`/`formatNumber` emit for the fixture's numeric/date inputs, which include `€`, `%`, digits, and locale punctuation). A test can build the inventory in-code by importing the real dictionary and iterating exactly those keys for both `lang: 'fr'` and `lang: 'en'`, rather than transcribing characters by hand:

```typescript
// Derives the real per-render character set — not a hand-curated list.
import { t, dictionaries } from '@/lib/i18n/dictionaries'; // adjust to actual export shape
const PDF_KEYS = [
  'pdf.tagline', 'pdf.title', 'pdf.ref.label', 'pdf.section.project',
  'pdf.section.interests', 'pdf.project.placeholder', 'pdf.project.ref.prefix',
  'pdf.computed.coefficient.label', 'pdf.loyer.label', 'pdf.loyer.subtext',
  'pdf.loyer.on.demand', 'pdf.validity.caption', 'pdf.footer.left',
  'proposal.montant.label', 'proposal.duree.label', 'proposal.duree.months',
  'proposal.interests.slb', 'proposal.interests.eval',
] as const;

function collectGlyphInventory(lang: 'fr' | 'en', renderedText: string): Set<number> {
  const chars = new Set<number>();
  for (const key of PDF_KEYS) for (const ch of t(key, lang)) chars.add(ch.codePointAt(0)!);
  for (const ch of renderedText) chars.add(ch.codePointAt(0)!); // + reconstructed visible text from the actual rendered PDF (see commission-free-fixture.test.ts's reconstructVisibleText helper) to also catch formatCurrency/formatDate/formatNumber output (€, %, digits, punctuation)
  return chars;
}
```
This session's static derivation (dictionary strings + literals, cross-checked against `sanitize-number.ts`'s documented U+202F/U+00A0 root cause) produced: `SPACE(0020) NARROW-NBSP(202F) EURO(20AC) RIGHT-SINGLE-QUOTE(2019) DEGREE(00B0) MIDDLE-DOT(00B7) CHECK-MARK(2713) É Ê è é à` plus full ASCII letters/digits/punctuation used in both languages. All resolved with `[VERIFIED: fontkit.hasGlyphForCodePoint against the downloaded Inter-{400,500,600,700}.ttf]` — see results table below.

### Anti-Patterns to Avoid
- **Registering the variable font as a shortcut.** `tokens/fonts.css` (the design spec) declares Inter as ONE variable file with `font-weight: 100 900`. That is a **web CSS** `@font-face` pattern; it does not transfer to `@react-pdf/renderer`'s registration model, which resolves purely by matching declared `fontWeight` values on separately-registered sources (Priority 2 finding). Do not "simplify" the four-file registration to one file.
- **Matching on the random subset-tag prefix in D-10's assertion.** PDFKit prepends a random 6-letter tag (`JRJJHY+`, `TSLJXB+`, …) to every embedded subset name on every render — this is NOT stable across renders and must not be part of the assertion. Match on the PostScript-name suffix after `+`, or better, on distinct stream-hash count alone.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Font weight → glyph resolution | A custom lookup table mapping requested weight to file path | `@react-pdf/renderer`'s `Font.register` (already in use, unchanged mechanism) | It already does exact-match + CSS-spec-compliant fallback resolution (`node_modules/@react-pdf/font/lib/index.js:313-344`); reinventing it risks diverging from PDFKit's own subsetting expectations |
| Glyph coverage checking | A hand-maintained "known safe characters" allowlist | `fontkit.openSync(path).hasGlyphForCodePoint(codepoint)` — already a transitive dependency, already used server-side by `@react-pdf/font` itself | Zero new dependency; ground-truth check against the actual binary rather than an assumption that could drift when the font source changes |
| PDF stream/content parsing | A full PDF parser library | The existing regex + `zlib.inflateSync` pattern already used by `render.ts`'s `computeContentHash` and `commission-free-fixture.test.ts`'s `decompressPdfStreams`/`reconstructVisibleText` | Proven correct against this exact `@react-pdf/renderer` 4.5.1 output shape in two other test suites already; a new parser is unnecessary surface area |

**Key insight:** Every piece of machinery D-09/D-10 needs already exists somewhere in this codebase (font resolution in `@react-pdf/font`, stream decompression in `render.ts` and `commission-free-fixture.test.ts`, glyph lookup in `fontkit`). This phase's new test file is glue, not new infrastructure.

## Runtime State Inventory

> Not a rename/refactor/migration phase in the schema-migration sense, but the phase does retire 9 committed binary files with no DB analog. Documenting per the same discipline since D-07 is a deletion.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data (DB) | None — fonts are not referenced by any DB row, `params_snapshot`, or config table | none |
| Live service config | None — no external service (n8n, Datadog, etc.) references font filenames | none |
| OS-registered state | None | none |
| Secrets/env vars | None — `FONT_DIR` is a computed path (`process.cwd()/public/fonts`), not an env var | none |
| Build artifacts | `.next/standalone/public/fonts/*` — Next copies `public/` verbatim into `.next/standalone/` at build time; a stale prior build's standalone dir will still hold old Plus Jakarta Sans files after `git rm`, but a fresh `npm run build` (already a CI gate) regenerates it correctly. Not blocking — no code change needed, just don't assume `.next/standalone/` reflects `public/fonts/` without rebuilding. | rebuild only (already covered by CI) |

**Full `public/fonts/` inventory verified this session (`ls public/fonts/`):**
```
PlusJakartaSans-300.woff2   PlusJakartaSans-400.ttf   PlusJakartaSans-400.woff2
PlusJakartaSans-500.ttf     PlusJakartaSans-500.woff2 PlusJakartaSans-600.ttf
PlusJakartaSans-600.woff2   PlusJakartaSans-700.ttf   PlusJakartaSans-700.woff2
```
Exactly 9 files — matches D-07's count precisely (4 TTF this phase orphans + 5 woff2 already dead since the web moved to `next/font/google`).

**D-07 codebase-reference verification (Priority 6) — one correction to the CONTEXT.md claim:**

CONTEXT.md D-07 states "outside `src/lib/pdf/document.tsx` and `tests/vendored-ui-integrity.test.ts`, nothing in the codebase references Plus Jakarta Sans." A repo-wide grep (excluding `node_modules`, `.next`, `.git`) found **6 additional source-tree files** with references — all comments/docstrings, zero functional code paths, so D-07's *deletion plan* is unaffected, but these will go stale after the swap and are worth a planner decision (in-scope drive-by fix vs. accepted drift):

| File | Line | Nature | Goes stale after swap? |
|---|---|---|---|
| `proxy.ts:72` | doc-comment listing repo structure ("fonts/ — self-hosted Plus Jakarta Sans") | comment only | Yes — purely descriptive, low-risk to leave or fix |
| `app/layout.tsx:11,16` | doc-comment: "Replaced the previous self-hosted Plus Jakarta Sans" (historical, stays true) and "...still uses Plus Jakarta Sans" (line 16 — **becomes factually wrong** once this phase ships) | comment only | Yes, line 16 specifically |
| `tests/reui-blocks-deletion.test.ts:7` | docstring citing `vendored-ui-integrity.test.ts`'s own framing ("Plus Jakarta Sans for the PDF") for context, no assertion | comment only | Yes, but harmless — describes the *other* test file's historical scope |
| `src/lib/pdf/sanitize-number.ts` (multiple lines) | docblock explaining the U+202F root cause is specific to "The Plus Jakarta Sans TTF subset" | comment only, functionally load-bearing sanitizer logic is untouched | Yes — becomes historically-inaccurate but D-01/CONTEXT.md's phase boundary explicitly excludes `sanitize-number.ts` from this phase's file list, and the deferred-idea note already covers revisiting it in Phase 43 |
| `src/lib/pdf/sanitize-number.test.ts` | same docblock pattern | comment only | Yes, same as above |

None of these six require code changes for D-07's guard-inversion or file-deletion to succeed — the CONTEXT.md verification was correct about *functional* references (there are none outside the two files it names) but the phrase "nothing... references" is imprecise about comments. Recommend the planner treats `app/layout.tsx:16` as a low-risk drive-by fix (one word) since it is the only one that becomes actively misleading about *current* PDF behavior, and leaves the rest as accepted drift consistent with the phase boundary.

## Common Pitfalls

### Pitfall 1: Registering Inter as the single design-spec variable font
**What goes wrong:** Every requested weight (400/500/600/700) silently renders identically — usually at whatever the variable font's default named instance is. No error, no tofu glyph, all existing gates (`typecheck`, `lint:check`, `npm test`, `npm run build`) stay green.
**Why it happens:** `tokens/fonts.css` (the authoritative *web* design spec) declares Inter as one `@font-face` with `font-weight: 100 900` — a valid CSS pattern that does not transfer to `@react-pdf/renderer`'s registration model.
**How to avoid:** Register exactly 4 static files, one `FontSource` per weight, per D-03 and Pattern 1 above.
**Warning signs:** A generated PDF where bold headings (title, loyer figure) look visually identical in weight to body text — this is the "flat document" CONTEXT.md describes. The D-10 distinct-faces proof exists specifically to catch this automatically.

### Pitfall 2: Asserting on PDFKit's random subset-tag prefix in the D-10 test
**What goes wrong:** A test that does `expect(fontName).toBe('JRJJHY+Inter-Bold')` (or similar) is flaky — the 6-character prefix before `+` is regenerated randomly on every single render call, confirmed empirically this session (PDFKit subsetting behavior, not something this repo controls).
**Why it happens:** Misreading the embedded `/FontName` as a stable identifier.
**How to avoid:** Split on `+` and assert only the PostScript-name suffix (`Inter-Regular`, `Inter-Medium`, `Inter-SemiBold`, `Inter-Bold`), or assert purely on the count of distinct stream hashes (weight-agnostic, most robust).

### Pitfall 3: Forgetting the byte-determinism fixture is a *blocking*, not optional, step
**What goes wrong:** CI goes red on `render-fixtures.test.ts` and `commission-free-fixture.test.ts` immediately after the font swap, because every fixture's `contentHash` changes (different embedded font bytes → different compressed stream hashes → different sorted-hash digest).
**Why it happens:** `computeContentHash` is deliberately sensitive to font changes (PROP-17's whole purpose).
**How to avoid:** Run `npm run pdf:update-fixture -- --confirm UPDATE-FIXTURE` in the SAME change that swaps the font registration, and commit the regenerated `expected.sha256.txt` alongside it. The script is dry-run by default (exits 1 without `--confirm UPDATE-FIXTURE`) — this is intentional friction, not a bug.
**Warning signs:** `render-fixtures.test.ts` failing with a message that explicitly names the regeneration command (`__pdf-fixtures__/render-fixtures.test.ts:43`) — this is a self-documenting failure, not a surprise.

### Pitfall 4: Confusing `sanitize-number.ts`'s continued presence with a leftover Plus-Jakarta-Sans dependency
**What goes wrong:** A reviewer sees `sanitize-number.ts`'s docblock still says "The Plus Jakarta Sans TTF subset... lacks U+202F" after the swap and assumes the sanitizer is now dead code that should be deleted.
**Why it happens:** The comment becomes historically inaccurate (Inter DOES have U+202F, verified this session — see Priority 3 results) but D-01 explicitly forbids touching this file in this phase; removing the sanitizer would change rendered output (U+202F would now render as a narrow no-break space rather than a plain space), which is exactly the kind of drift D-01's "family swap only" boundary exists to prevent.
**How to avoid:** Leave `sanitize-number.ts` and its call sites in `document.tsx` completely untouched this phase. This is already recorded as a Deferred Idea in CONTEXT.md ("Retiring `sanitize-number.ts`" — revisit in Phase 43 once the layout is re-baselined anyway, with the Phase 23 PDF-01 reproduction test as the gate).
**Warning signs:** Any task in the plan that touches `sanitize-number.ts` or its 4 call sites in `document.tsx` — this is out of scope and should be rejected at plan-check.

## Code Examples

### Priority 2 — empirical proof of D-03's weight-matching claim
```javascript
// Source: node_modules/@react-pdf/font/lib/index.js:307-344 (installed 4.0.8)
// FontFamily.resolve() — the ONLY font-selection code path @react-pdf/renderer uses.
resolve(descriptor) {
    const { fontWeight = 400, fontStyle = 'normal' } = descriptor;
    const styleSources = this.sources.filter((s) => s.fontStyle === fontStyle);
    const exactFit = styleSources.find((s) => s.fontWeight === fontWeight);
    if (exactFit) return exactFit;
    // ... CSS font-weight fallback-chain logic, still selecting AMONG registered
    // sources by their declared fontWeight — never touches a variation axis.
}
// getVariation() exists ONLY as an unimplemented stub on the internal StandardFont
// class (index.js:195-197, `throw new Error('Method not implemented.')`) and is
// never invoked anywhere in @react-pdf/font, @react-pdf/pdfkit, or @react-pdf/textkit
// (confirmed via repo-wide grep of node_modules/@react-pdf/*/lib/*.js — zero matches
// for getVariation/variationAxes/wght outside this one dead stub).
```

### Priority 3 — glyph coverage results (fontkit, against the downloaded Inter TTFs)
```
| Codepoint                              | 400 | 500 | 600 | 700 |
|-----------------------------------------|-----|-----|-----|-----|
| U+0020 SPACE                            | YES | YES | YES | YES |
| U+202F NARROW NO-BREAK SPACE            | YES | YES | YES | YES |
| U+00A0 NO-BREAK SPACE                   | YES | YES | YES | YES |
| U+20AC EURO SIGN                        | YES | YES | YES | YES |
| U+2019 RIGHT SINGLE QUOTATION MARK (’)  | YES | YES | YES | YES |
| U+00B0 DEGREE SIGN (°)                  | YES | YES | YES | YES |
| U+00E9 é / U+00C9 É / U+00CA Ê / U+00E8 è / U+00E0 à | YES (all) | YES (all) | YES (all) | YES (all) |
| U+00B7 MIDDLE DOT (·)                   | YES | YES | YES | YES |
| U+2713 CHECK MARK (✓)                   | YES | YES | YES | YES |
```
Full derived inventory (68 unique codepoints from every `pdf.*`/`proposal.*` dictionary string used by `document.tsx`, both languages, plus document literals): **zero missing glyphs across all four weights** `[VERIFIED: fontkit.hasGlyphForCodePoint, this session, against the exact 4 TTF files pinned above]`.

### Priority 5 — fixture regeneration (verified, zero DB dependency)
```typescript
// Source: scripts/update-pdf-fixture.ts (existing, unmodified by this research)
// Confirmed: imports ONLY __pdf-fixtures__/fixtures.ts (frozen literals) and
// src/lib/pdf's renderProposalPdf — no DB import anywhere in the call graph.
// Dry-run by default; requires explicit --confirm UPDATE-FIXTURE to write.
```
```bash
npm run pdf:update-fixture                                 # preview only, exits 1 if drift
npm run pdf:update-fixture -- --confirm UPDATE-FIXTURE      # writes __pdf-fixtures__/expected.sha256.txt
```
Both `render-fixtures.test.ts` (3 fixtures: happy-path-fr, happy-path-en, agent-commission-free) and `commission-free-fixture.test.ts` (asserts on the same `agent-commission-free` fixture's rendered bytes, not on `contentHash`) will need the font swap reflected — `commission-free-fixture.test.ts` doesn't consume `expected.sha256.txt` directly but does call `renderProposalPdf` and would break if the font registration throws (missing file) or if its text-reconstruction regex assumptions about the PDF's internal structure changed (they don't — the embedding shape is family-agnostic, confirmed by Pattern 2's worked example above).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Plus Jakarta Sans, 4 static TTFs, self-hosted since Phase 5 (woff2) / Phase 34 (TTF conversion for fontkit compatibility) | Inter, 4 static TTFs, self-hosted, same registration mechanism | This phase | PDF typeface converges with the web UI's typeface (already Inter via `next/font/google` since a prior phase per `app/layout.tsx`'s own comment), though the two surfaces remain byte-distinct binaries by design (D-06 canonical note: "The web and the PDF converge on Inter, but not on the same file") |

**Deprecated/outdated:**
- The institutional note "`shadcn init` breaks the Plus Jakarta Sans font" (referenced in this phase's own goal statement) is HISTORICAL for the UI surface — confirmed by `tests/vendored-ui-integrity.test.ts`'s own docstring (§16-24) and `34-03-SUMMARY.md`'s "two-font-surface finding" — the UI moved to Inter via `next/font/google` before this phase existed. The PDF surface is where the institutional risk still lives, which is exactly why this phase isolates the PDF font swap alone.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `rsms/inter` v4.1 (tag `v4.1`, released 2024-11-16) is the correct/current tagged release to pin, based on GitHub release-history search rather than an official "latest stable" API confirmation with a publish-date cross-check beyond the search snippet | Standard Stack / D-05 Pin | Low — the release asset was downloaded directly from the tag URL and its bytes hashed in this session; even if a newer tag exists, `v4.1` is a real, addressable, immutable release asset and remains reproducible. Executor should re-check `https://github.com/rsms/inter/releases` for a newer tag before acquiring, and update the pin if one exists, but the mechanism/rationale (plain `Inter-*.ttf`, no opsz prefix) holds for any rsms/inter release. |
| A2 | The full glyph inventory used to probe fontkit coverage (68 codepoints) was derived by static regex extraction of `dictionaries.ts` string literals plus manually-added document literals (`'LEASÉTIC'`, `'✓'`, digits, `€`, `%`), not by actually rendering the FR/EN PDF and reconstructing visible text via the ToUnicode CMap (the technique `commission-free-fixture.test.ts` uses) | Priority 3 / D-09 | Low-Medium — the static extraction covers every dictionary key document.tsx actually consumes (verified by reading document.tsx's full source), so it should be a superset-equivalent of what CMap reconstruction would find. The planner's actual D-09 test implementation MUST use the render+reconstruct technique (Pattern 3 code example), not hand-curation, to satisfy CONTEXT.md's "derived from real rendered output" requirement — this research's static approach was a proxy for hash-checking font coverage ahead of time, not a substitute for the real test. |

## Open Questions (RESOLVED)

> Both questions were resolved during planning (2026-09-08). Resolutions are recorded inline below.

1. **Should `app/layout.tsx:16`'s now-inaccurate "still uses Plus Jakarta Sans" comment be fixed in this phase?**
   - What we know: it's a one-line comment, zero functional impact either way, and becomes factually wrong the moment this phase ships.
   - What's unclear: whether touching a file outside D-01's explicit file list ("`document.tsx`, `public/fonts/`, guard test, fixture") is acceptable drive-by scope.
   - Recommendation: low-risk one-line fix, bundle it into the same commit as the guard-test inversion (D-08) since both are "make the comments/assertions match new reality" work. Not blocking either way.
   - **RESOLVED — implemented by `41-02` Task 2, step 8.** `app/layout.tsx:16` and `proxy.ts:72` are IN scope (both describe the *current* PDF font path and become factually wrong). `sanitize-number.ts` + its test are OUT of scope and recorded as accepted drift (touching them would change rendered output, which D-01 forbids); `tests/reui-blocks-deletion.test.ts:7` is OUT of scope because it is accurate as history.

2. **Exact D-05 zip URL stability** — GitHub release asset URLs for tagged releases are permanent by GitHub's own guarantee, but the executor should re-verify the `v4.1` tag is still the latest before acquiring, in case a newer Inter release has shipped between this research and execution.
   - Recommendation: re-run `curl -sI https://github.com/rsms/inter/releases/latest` (or check the releases page) at execution time; if a newer tag exists, re-derive the SHA-256 pins using the same `extras/ttf/Inter-{Regular,Medium,SemiBold,Bold}.ttf` paths (this directory structure has been stable across recent rsms/inter releases).
   - **RESOLVED — implemented by `41-02` Task 1 as a VERIFY-THEN-PIN-TO-v4.1 policy.** The executor records what `releases/latest` reports but acquires `v4.1` regardless: the four SHA-256 pins and the fontkit glyph-coverage probe in this document are valid only for that tag, and reproducibility of the PROP-17 byte-determinism baseline outranks currency. A newer tag becomes a Phase 43 note rather than an in-flight substitution.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.8 (`[VERIFIED: .planning/codebase/TESTING.md + package.json]`) |
| Config file | `vitest.config.ts` — default `jsdom` environment, override via `// @vitest-environment node` pragma |
| Quick run command | `npx vitest run __pdf-fixtures__/inter-typography.test.ts` (new file, once created) |
| Full suite command | `npm test` (= `vitest run`) |

### Phase Requirement → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DOC-09 (amended scope per D-02) | Every text node renders in Inter, Plus Jakarta Sans fully retired from font-registration path | structural (grep-on-source) | `npx vitest run tests/vendored-ui-integrity.test.ts` | ✅ exists, cases 3-4 need inversion (D-08) |
| DOC-09 | No missing-glyph/tofu, no font-registration failure | glyph-coverage (golden/byte-level) | `npx vitest run __pdf-fixtures__/inter-typography.test.ts` | ❌ Wave 0 — new file, D-09 |
| DOC-09 (D-10, "same proof") | Four distinct embedded font faces (not a collapsed variable font) | byte-level PDF-structure assertion | same file as above | ❌ Wave 0 — new file, D-10 |
| DOC-13 (byte-determinism, carried by this phase per D-12) | Re-rendering produces byte-identical PDFs; fixture reflects new font | golden/byte-determinism | `npx vitest run __pdf-fixtures__/render-fixtures.test.ts __pdf-fixtures__/commission-free-fixture.test.ts` | ✅ exists — BLOCKING regeneration step, not a new test |
| D-11 | Human visual pass, FR + EN | manual-only | N/A — human opens two generated PDFs | manual, justified: "automated glyph coverage cannot see 'technically renders, looks wrong'" (CONTEXT.md D-11's own rationale) |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/vendored-ui-integrity.test.ts __pdf-fixtures__/inter-typography.test.ts` (fast, targeted)
- **Per wave merge:** `npm test` (full suite — catches any incidental breakage in unrelated PDF-adjacent tests, e.g. `document.test.tsx` if it exists and asserts on `fontFamily: 'PlusJakartaSans'` anywhere)
- **Phase gate:** `npm test && npm run lint:check && npm run build` green before `/gsd-verify-work` — per this repo's CI gate order (`.planning/codebase/TESTING.md` §CI Gates) and the project's own lesson that `tsc`+`vitest` passing is not sufficient; `lint:check --max-warnings=0` and `build` must also pass.

### Wave 0 Gaps
- [ ] `__pdf-fixtures__/inter-typography.test.ts` — new file, covers DOC-09's glyph-coverage clause (D-09) and the distinct-faces proof (D-10). Must use `// @vitest-environment node` pragma (jsdom shifts `@react-pdf/renderer` bytes) and `vi.mock('server-only', () => ({}))` (matches every other file in `__pdf-fixtures__/`).
- [ ] Check whether `src/lib/pdf/document.test.tsx` exists and asserts `fontFamily: 'PlusJakartaSans'` anywhere — not found via this session's grep of dictionaries/document/render/sanitize files, but the planner should `find src/lib/pdf -name '*.test.tsx'` to confirm no other hidden fixture asserts on the old family string before executing D-08's inversion.

*(No framework install needed — Vitest, fontkit, and the stream-parsing pattern all already exist in the repo.)*

## Security Domain

`security_enforcement` is absent from `.planning/config.json` → treated as enabled. This phase's surface area is minimal (no new user input, no new auth path, no new network call at runtime) but is reviewed for completeness.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Not touched — no auth path change |
| V3 Session Management | No | Not touched |
| V4 Access Control | No | Not touched |
| V5 Input Validation | No | No new user input; font files are build-time/deploy-time assets, not runtime user input |
| V6 Cryptography | No | Not touched |
| Supply chain / asset integrity (not a numbered ASVS section but directly relevant) | Yes | SHA-256 pinning of the font source (this document's D-05 table) + the existing structural guard test (`tests/vendored-ui-integrity.test.ts` cases 3-4, inverted per D-08) is the standard control for "a vendored binary asset silently changes." |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Vendored-asset tampering — a `shadcn` install, a stray refactor, or a bad merge silently swaps/removes a font file or changes the registered family string, re-baselining the PROP-17 determinism contract without anyone noticing (this is literally threat `T-34-03-02` from `34-SECURITY.md`) | Tampering | The structural guard test (`tests/vendored-ui-integrity.test.ts` cases 3-4), inverted to pin `Inter` per D-08. This mechanism is unchanged by this phase — only the pinned value moves, exactly as D-08 specifies. Already proven to fail correctly under mutation (`34-03-SUMMARY.md §162-171`'s negative-check table). |
| Malicious/typosquatted font source | Tampering/Spoofing | Not applicable via npm registry (no package installed); mitigated by downloading directly from the named upstream GitHub repository's tagged release (not a third-party mirror) and recording the SHA-256 in this document for future audit. |

## Sources

### Primary (HIGH confidence)
- `node_modules/@react-pdf/font/lib/index.js` (installed v4.0.8) — full source read, confirms `FontFamily.resolve()` weight-matching mechanism and the unused `getVariation()` stub (Priority 2)
- `node_modules/@react-pdf/renderer/package.json`, `node_modules/fontkit/package.json` — exact installed versions
- `github.com/rsms/inter` release `v4.1` — official upstream release, ZIP downloaded and SHA-256 verified this session
- `github.com/rsms/inter`'s `LICENSE.txt` (inside the downloaded zip) — OFL-1.1 confirmed by direct inspection
- This session's own rendered PDF output (`renderProposalPdf` against the existing `happy-path-fr` fixture) — parsed directly for `/FontDescriptor`/`/FontFile2` structure (Priority 4)
- This session's `fontkit.hasGlyphForCodePoint` probe against the 4 downloaded Inter TTFs (Priority 3)
- `src/lib/i18n/dictionaries.ts`, `src/lib/pdf/document.tsx`, `src/lib/pdf/sanitize-number.ts` — read directly for the glyph-inventory derivation and D-07 reference sweep
- `__pdf-fixtures__/fixtures.ts`, `render-fixtures.test.ts`, `commission-free-fixture.test.ts`, `scripts/update-pdf-fixture.ts` — read directly for Priority 5 (fixture regeneration mechanics, confirmed zero DB dependency)
- `.planning/codebase/TESTING.md` — test framework/environment/CI-gate facts

### Secondary (MEDIUM confidence)
- WebSearch confirming `v4.1` (2024-11-16) as the latest visible rsms/inter release tag at research time — cross-verified by successfully downloading and hash-locking the asset from that exact tag URL

### Tertiary (LOW confidence)
- None used for load-bearing claims in this document.

## Metadata

**Confidence breakdown:**
- Standard stack / font source pin: HIGH — every hash was computed in this session against files this session downloaded from the named upstream URL.
- Architecture (weight resolution mechanism, PDF font-embedding structure): HIGH — read directly from installed package source and from parsing a real rendered PDF, not from training-data recollection.
- Pitfalls: HIGH — each pitfall is grounded in either the installed source code or an artifact this session directly produced (rendered PDF, fontkit probe).

**Research date:** 2026-09-08
**Valid until:** 30 days for the mechanism/architecture findings (stable, version-pinned); re-verify the `rsms/inter` release tag specifically if execution happens more than ~2 weeks after this research, since upstream Inter releases periodically.
