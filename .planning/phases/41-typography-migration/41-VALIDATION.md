---
phase: 41
slug: typography-migration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-08
---

# Phase 41 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `41-RESEARCH.md` § "Validation Architecture". The per-task map below is
> populated by the planner; the infrastructure, sampling and Wave 0 rows are fixed.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.8 |
| **Config file** | `vitest.config.ts` — default `jsdom` environment; PDF tests override with `// @vitest-environment node` |
| **Quick run command** | `npx vitest run tests/vendored-ui-integrity.test.ts __pdf-fixtures__/inter-typography.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5s quick / full suite per repo baseline |

**Phase gate (repo CI order — `tsc` + `vitest` alone is NOT sufficient):**
`npm test && npm run lint:check && npm run build`

---

## Sampling Rate

- **After every task commit:** Run the quick run command above
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** `npm test && npm run lint:check && npm run build` must be green
- **Max feedback latency:** 30 seconds for the quick command

---

## Per-Task Verification Map

*Populated by the planner. Every implementation task must map to one of the commands below,
or declare a Wave 0 dependency on `__pdf-fixtures__/inter-typography.test.ts`.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| _tbd_ | 01 | 1 | DOC-09 (D-05, D-03, D-06) | — | Four static Inter TTFs present on disk at pinned SHA-256 | structural | `npx vitest run tests/vendored-ui-integrity.test.ts` | ✅ exists | ⬜ pending |
| _tbd_ | 01 | 1 | DOC-09 (D-08) | T-34-03-02 | Guard pins `family: 'Inter'`; renaming a TTF fails the suite | structural | `npx vitest run tests/vendored-ui-integrity.test.ts` | ✅ exists | ⬜ pending |
| _tbd_ | 02 | 1 | DOC-09 (D-09) | — | Every FR/EN codepoint (incl. U+202F, €, ’, °) resolves in all four faces | glyph-coverage | `npx vitest run __pdf-fixtures__/inter-typography.test.ts` | ❌ W0 | ⬜ pending |
| _tbd_ | 02 | 1 | DOC-09 (D-10) | — | Four distinct `/FontFile2` embedded subsets (400 ≠ 500 ≠ 600 ≠ 700) | byte-level PDF structure | `npx vitest run __pdf-fixtures__/inter-typography.test.ts` | ❌ W0 | ⬜ pending |
| _tbd_ | 02 | 2 | DOC-13 (D-12, BLOCKING) | — | Re-render is byte-identical; fixture reflects the font swap | golden / byte-determinism | `npx vitest run __pdf-fixtures__/render-fixtures.test.ts __pdf-fixtures__/commission-free-fixture.test.ts` | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__pdf-fixtures__/inter-typography.test.ts` — new, git-tracked file covering D-09 (glyph
      coverage) and D-10 (distinct embedded faces). Must carry the `// @vitest-environment node`
      pragma (jsdom shifts `@react-pdf/renderer` output bytes) and
      `vi.mock('server-only', () => ({}))`, matching every other file in `__pdf-fixtures__/`.
      **Must be `git add`-ed — an untracked test file passes locally and is silently skipped by CI.**
- [ ] Confirm no other test asserts on the old family string before inverting D-08:
      `find src/lib/pdf tests __pdf-fixtures__ -name '*.test.ts*' | xargs grep -l PlusJakartaSans`

*No framework install needed — Vitest, fontkit and the PDF stream-parsing pattern all already exist.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Rendered FR and EN proposals "read correctly" in Inter | D-11 | Automated glyph coverage cannot see "technically renders, looks wrong" — every glyph can resolve while weights collapse, spacing degrades, or a line breaks badly | Antoine generates one FR proposal PDF and one EN proposal PDF from the running app and opens both. Confirm: no tofu, visibly distinct weights (400/500/600/700), correct accented vowels, `€`, `’`, `°`, and narrow no-break spaces in French figures. Phase does not close until this passes. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s for the quick command
- [ ] D-11 human visual pass recorded
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
