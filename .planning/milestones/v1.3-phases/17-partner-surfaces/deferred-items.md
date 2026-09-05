# Phase 17 — Deferred Items

Out-of-scope discoveries logged during Plan 17-08 (closure verification). Per SCOPE BOUNDARY, only issues directly caused by the current task's changes are fixed inline; everything else is recorded here for a follow-up phase.

## Pre-existing test failures discovered during full-suite gate (Plan 17-08, Task 3)

Discovered on `npm test` run executed 2026-05-24. Total: **11 failed / 924 passed / 4 skipped (out of 939 tests)**.

### Cluster 1 — `src/components/ui/RetractableSidebar.test.tsx` (9 failures)

**Symptom:** Every test in the file fails in `beforeEach` with:
```
TypeError: window.localStorage.clear is not a function
  ❯ src/components/ui/RetractableSidebar.test.tsx:15:23
     13|
     14| beforeEach(() => {
     15|   window.localStorage.clear();
       |                       ^
```

**Last modified:** commit `d8e4be1` (Phase 11 Plan 04 — `test(11-04): add failing RetractableSidebar tests (RED) — COMP-02`). Not touched by Phase 17.

**Likely root cause:** jsdom / vitest version drift where `window.localStorage` is now a getter-only stub. Unrelated to Phase 17.

**Triage:** Out of scope for Phase 17 (pre-existing). Recommend a Phase 18+ infra plan to either (a) bump jsdom + vitest in lockstep, (b) wrap `localStorage` with a polyfill in the vitest setup, or (c) refactor the test to use `vi.stubGlobal('localStorage', { clear: vi.fn(), … })`.

### Cluster 2 — `__pdf-fixtures__/render-fixtures.test.ts` (2 failures)

**Symptom:** PROP-17 byte-determinism gate detects fixture drift on both `happy-path-fr` and `happy-path-en`:
- happy-path-fr — expected `6189c125…`, actual `bf884502…`
- happy-path-en — expected `b0b7cbb0…`, actual `dfcda414…`

**Last modified (fixtures + lib):** commits `0cd71eb` / `89c52c5` (Phase 8 Plan 06 — `feat(08-06): fixture data + Vitest determinism gate (PROP-17)`). Not touched by Phase 17.

**Likely root cause:** Underlying `@react-pdf/renderer`, fontkit, or transient dep update has changed the byte-output of the PDF without changing the visible rendering. The fixture's `expected.sha256.txt` was committed against an older toolchain version.

**Triage:** Out of scope for Phase 17 (no PDF / `src/lib/pdf` code modified in this phase). Standard remediation per the assertion message:
```bash
npm run pdf:update-fixture -- --confirm UPDATE-FIXTURE
```
followed by visually diff-ing the regenerated PDFs against the committed reference renders to confirm no layout regression, then commit the fresh hashes.

Recommend deferring to a Phase 18+ infra plan so it can carry its own visual-diff sign-off.

## ADMIN-09 (in-scope) — passes

`tests/admin-09-grep-contracts.test.ts` — **9/9 green** (32ms). Phase 17's commission-invisibility invariant (D-12 envelope) remains intact across all 5 partner surfaces.

## TypeScript — passes

`npx tsc --noEmit` — **exit 0** (i18n `_EnHasAllFrKeys` parity proof + full project compile both clean).
