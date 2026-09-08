---
phase: 41-typography-migration
reviewed: 2026-09-08T11:24:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src/lib/pdf/document.tsx
  - __pdf-fixtures__/inter-typography.test.ts
  - __pdf-fixtures__/fontkit.d.ts
  - tests/vendored-ui-integrity.test.ts
  - __pdf-fixtures__/expected.sha256.txt
  - app/layout.tsx
  - proxy.ts
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase 41: Code Review Report

**Reviewed:** 2026-09-08T11:24:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

This is a narrow, well-scoped font swap (Plus Jakarta Sans → Inter, 4 static TTFs, weight-exact
`Font.register`) and its verification is unusually thorough. I did not accept the executor's
claims on faith — I independently reproduced both mutation checks described in the summaries:

- Collapsing all four `FontSource` entries to `Inter-400.ttf` correctly fails D-10's
  distinct-embedded-faces assertion (`expected 4, got 1` on both FR and EN).
- Stubbing `collectRenderedCodepoints` to return an empty set correctly fails D-09's
  non-vacuity gate (`expected 0 to be >= 50`).

Both mutations were applied, verified to fail, and reverted; the working tree was confirmed
clean afterward. I also independently re-hashed all four committed `Inter-*.ttf` binaries and
confirmed they match the SHA-256 pins recorded in `41-RESEARCH.md` and `41-02-SUMMARY.md`
byte-for-byte, ran the full `npm test` scope for the affected files (5 consecutive runs, all
green, confirming the CMap-bfchar-union fix for cross-font glyph-ID collision is in fact
deterministic), ran `eslint --max-warnings=0` and `tsc --noEmit` against every file in scope
(both clean), and diffed `c039172..HEAD` to confirm the actual changed-file set matches exactly
what this review's scope claims (no drive-by changes outside the declared boundary).

The one substantive finding is a narrow test-design gap in `inter-typography.test.ts`: the
per-codepoint glyph-resolution test has no non-vacuity guard of its own and silently passes
against an empty codepoint set when run in isolation (confirmed by reproducing it with `-t`).
In the file's own describe-block order and under every documented invocation in this phase's
own RESEARCH.md (full-file `npx vitest run <file>` or `npm test`), the sibling test's `>= 50`
gate runs first and catches this — so it is not exploitable under the workflow this repo
actually documents, hence WARNING rather than BLOCKER.

## Warnings

### WR-01: D-09's per-codepoint glyph-resolution test has no non-vacuity guard of its own

**File:** `__pdf-fixtures__/inter-typography.test.ts:214-238`
**Issue:** The test `'every codepoint in the derived FR+EN inventory resolves in all four
registered Inter faces'` iterates `for (const cp of inventory) { expect(...).toBe(true) }` with
no assertion that `inventory` is non-empty. The *sibling* test above it
(`'the derived inventory is non-vacuous...'`, lines 185-212) carries the `>= 50` non-vacuity
gate, and in the file's default (non-shuffled) execution order that sibling runs first and would
fail before this one could pass vacuously. I reproduced the gap directly: stubbing
`collectRenderedCodepoints` to return `new Set()` and running the *whole file* correctly fails
(the sibling's gate catches it), but running only this one test in isolation
(`npx vitest run __pdf-fixtures__/inter-typography.test.ts -t "every codepoint in the derived
FR\+EN inventory resolves"`) with the same stub in place **passes** — the `for` loop over an
empty set makes zero assertions and the test reports green. Any invocation that filters to this
test alone (a debug `-t` run, an editor's "run this test" action, a future `.only`, or a
test-impact-analysis tool that selects individual test names rather than whole files) loses the
non-vacuity protection this suite was explicitly designed to have (per the file's own docblock,
"the exact failure a variable font would have produced" / D-10's parallel comment about
gate-green-but-flat documents). This repo's documented invocation patterns (RESEARCH.md's
Validation Architecture: `npx vitest run __pdf-fixtures__/inter-typography.test.ts`, always
whole-file) do not currently hit this gap, which is why it is a WARNING and not a BLOCKER.
**Fix:** Add the same non-vacuity assertion to this test, or restructure so both checks live in
one `it` block / share a `beforeAll` that gates on the same precondition:
```typescript
it('every codepoint in the derived FR+EN inventory resolves in all four registered Inter faces', async () => {
  const frResult = await renderProposalPdf({ data: FR_FIXTURE.data });
  const enResult = await renderProposalPdf({ data: EN_FIXTURE.data });
  const frCodepoints = collectRenderedCodepoints(decompressPdfStreams(frResult.buffer));
  const enCodepoints = collectRenderedCodepoints(decompressPdfStreams(enResult.buffer));
  const inventory = new Set<number>([...frCodepoints, ...enCodepoints]);

  expect(inventory.size, 'inventory is empty — derivation pipeline broke').toBeGreaterThanOrEqual(50);

  for (const weight of INTER_WEIGHTS) {
    // ... unchanged
  }
});
```

## Info

### IN-01: `extractEmbeddedFontFaces`'s `byteLength` field is computed but never asserted

**File:** `__pdf-fixtures__/inter-typography.test.ts:151-181`
**Issue:** Every call site of `extractEmbeddedFontFaces` (three call sites, lines 257, 277, 288)
destructures or maps only `fontName` and `streamHash`; the `byteLength` property on each result
object is computed (via `decompressed.byteLength`) but never read by any assertion. This mirrors
the worked example in `41-RESEARCH.md` verbatim (where it was diagnostic output printed to a
console during research, not a test assertion), so it is faithful to the source pattern rather
than an oversight — but left as-is in shipped test code it is dead data threaded through every
result object for no consumer.
**Fix:** Either drop `byteLength` from the return type/results, or use it in an assertion (e.g.
`expect(faces.every(f => f.byteLength > 0)).toBe(true)` as a cheap "the stream actually
decompressed to something" check) so the field earns its place in the type.

### IN-02: Duplicated render + codepoint-derivation logic across three tests in the same file

**File:** `__pdf-fixtures__/inter-typography.test.ts:185-238`
**Issue:** The block `renderProposalPdf(FR)` + `renderProposalPdf(EN)` +
`collectRenderedCodepoints(decompressPdfStreams(...))` ×2 + `new Set([...fr, ...en])` is
repeated verbatim across the two D-09 tests (lines 186-192 and 215-221). This is a
maintainability nit, not a correctness issue — out of the v1 review's performance scope, and the
duplication does not risk drift since both copies derive the same value from the same fixtures —
but it's easy to fix and would shrink the file.
**Fix:** Hoist the FR/EN render + inventory derivation into a shared `beforeAll` (or a small
helper called once per `describe` block) and reference the resulting `inventory` in both tests.

---

_Reviewed: 2026-09-08T11:24:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
