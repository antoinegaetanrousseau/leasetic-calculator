---
phase: 41
slug: typography-migration
status: verified
threats_open: 0
asvs_level: 1
created: 2026-09-08
---

# Phase 41 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|----------------|
| upstream GitHub release → repository | Inter font binaries enter the repo from `github.com/rsms/inter` and become the PROP-17 byte-determinism baseline; untrusted until hash-verified | 4 static TTF binaries |
| repository → rendered PDF | `Font.register` reads `public/fonts/*.ttf` at render time via absolute `file://` paths in the Node runtime; a changed/renamed/missing binary changes or breaks every delivered proposal | font bytes → embedded PDF streams |
| `public/fonts/` → public web | Next copies `public/` verbatim into the standalone build; TTFs are fetchable at `/fonts/Inter-*.ttf` | OFL-1.1 licensed, non-secret binaries |
| CI → repository | An untracked test file runs locally and is silently skipped by CI, producing a green pipeline that proves nothing | test coverage integrity |
| `.planning/*.md` (documentation) | REQUIREMENTS.md / ROADMAP.md amendment-in-place; a requirement ID or coverage tally silently dropped breaks milestone traceability | requirement/criteria text only, no runtime surface |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-41-01-01 | Tampering | `.planning/REQUIREMENTS.md` DOC-09 | mitigate | ID-preserving rewrite | closed |
| T-41-01-02 | Repudiation | `.planning/ROADMAP.md` Phase 41 criteria | mitigate | dated scope-reconciliation blockquote citing 41-CONTEXT.md | closed |
| T-41-01-03 | DoS (scope) | Phase 43 requirement set | mitigate | type-scale clause relocated to DOC-01 + ROADMAP Phase 43 criterion 6 | closed |
| T-41-02-01 (carries T-34-03-02) | Tampering | `src/lib/pdf/document.tsx` + `public/fonts/` | mitigate | inverted (not deleted) structural guard, cases 3–4 | closed |
| T-41-02-SC | Tampering / Spoofing | Inter binaries from `github.com/rsms/inter` v4.1 | mitigate | named upstream tagged release, zip SHA-256 + 4 per-file SHA-256 pins, TrueType-format check, OFL-1.1 license inspection | closed |
| T-41-02-02 | Tampering (silent) | weight resolution in `@react-pdf/font` 4.0.8 | mitigate | 4 weight-exact `FontSource` entries + D-10 distinct-faces proof | closed |
| T-41-02-03 | DoS | rendered proposal PDFs in production | mitigate | guard case 4 on-disk check + `npm run build` gate + `__pdf-fixtures__` suites rendering real bytes in CI | closed |
| T-41-02-04 | Information Disclosure | `/fonts/Inter-*.ttf` publicly fetchable | accept | D-06 — Inter is OFL-1.1, freely redistributable, no secret | closed |
| T-41-03-01 | Tampering (silent) | font weight resolution / embedded faces | mitigate | D-10: exactly 4 distinct decompressed `/FontFile2` stream hashes + sorted PostScript-name check | closed |
| T-41-03-02 | DoS | rendered proposals with unsupported characters | mitigate | D-09: `fontkit.hasGlyphForCodePoint` for every codepoint reconstructed from real FR/EN renders, all 4 weights | closed |
| T-41-03-03 | Repudiation / vacuous gate | `__pdf-fixtures__/inter-typography.test.ts` | mitigate | `git ls-files` confirms tracked; non-vacuity gate (>=50 codepoints + high-risk set) present — **closed with caveat, see below** | closed (caveat) |
| T-41-03-04 | Tampering (visual, machine-undetectable) | delivered proposal document | mitigate | blocking human visual pass (D-11), performed and recorded | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Verification Evidence

| Threat ID | Evidence |
|-----------|----------|
| T-41-01-01 | `grep -c "DOC-09" .planning/REQUIREMENTS.md` → 4 (>= 3 required); `grep -n "Coverage:\*\* 24/24"` → line 159 present |
| T-41-01-02 | `.planning/REQUIREMENTS.md:18` blockquote — "Scope reconciled 2026-09-08 ... Authority: `.planning/phases/41-typography-migration/41-CONTEXT.md`"; `.planning/ROADMAP.md` Phase 41 block carries the matching "Criteria 1 and 3 reconciled 2026-09-08 ... `41-CONTEXT.md` D-02 / D-04" blockquote |
| T-41-01-03 | `.planning/REQUIREMENTS.md` DOC-01 bullet ends with the relocated "ten-step type scale ... relocated here from DOC-09" clause; `.planning/ROADMAP.md` Phase 43 block criterion 6: "Every text node uses the design's ten-step type scale ... relocated here from Phase 41 by the D-02 amendment" |
| T-41-02-01 | `src/lib/pdf/document.tsx:36` `family: 'Inter'`; `tests/vendored-ui-integrity.test.ts` case 3 (lines ~130-145) asserts `toContain("family: 'Inter'")` + loops `Inter-${weight}.ttf`; case 4 (~149-158) asserts on-disk existence via `existsSync`. Independently re-ran `npx vitest run tests/vendored-ui-integrity.test.ts` → 5/5 pass |
| T-41-02-SC | `41-02-SUMMARY.md` provenance table: zip SHA-256 `9883fdd4...56b11e` verified OK; four per-file SHA-256 pins. Independently re-hashed all four committed binaries this session — byte-for-byte match: `Inter-400.ttf`=`40d692fc...`, `Inter-500.ttf`=`97ad806f...`, `Inter-600.ttf`=`78a843fa...`, `Inter-700.ttf`=`28831609...`. `file public/fonts/Inter-*.ttf` confirms "TrueType Font data" for all four, license line quoted in SUMMARY (SIL OFL 1.1) |
| T-41-02-02 | `src/lib/pdf/document.tsx:41-44` — four separate `FontSource` entries, `fontWeight: 400/500/600/700` (grep confirms all 4 present); `__pdf-fixtures__/inter-typography.test.ts:255-283` D-10 distinct-stream-hash proof |
| T-41-02-03 | guard case 4 (on-disk check); `package.json` `"build": "next build"` runs as CI gate (`.github/workflows/*.yml:69`); `"test": "vitest run"` (no path filter) runs before build at `.github/workflows/*.yml:60` — `__pdf-fixtures__/*.test.ts` execute in CI |
| T-41-02-04 | Accepted risk — see Accepted Risks Log below |
| T-41-03-01 | `__pdf-fixtures__/inter-typography.test.ts:255-266` — `expect(faces).toHaveLength(4)` + `expect(new Set(faces.map(f => f.streamHash)).size).toBe(4)`, repeated for EN at lines 275-283. Code reviewer independently reproduced the collapse-to-`Inter-400.ttf` mutation and confirmed it fails as designed (41-REVIEW.md, not re-run here per instruction) |
| T-41-03-02 | `__pdf-fixtures__/inter-typography.test.ts:214-238` — `font.hasGlyphForCodePoint(cp)` asserted true for every codepoint in the FR+EN union, looped across all 4 `INTER_WEIGHTS` |
| T-41-03-03 | `git ls-files __pdf-fixtures__/inter-typography.test.ts` → prints the path (tracked). Non-vacuity gate at lines 185-212 (`>= 50` + 8 required high-risk codepoints) runs and passes. **Caveat (WR-01, 41-REVIEW.md):** the sibling per-codepoint test at lines 214-238 has no independent non-vacuity guard of its own — it relies on file-order execution after the gated test above it. Confirmed by direct inspection: an isolated `-t` filter run against a stubbed-empty inventory would pass vacuously. Not reachable under this repo's documented invocation (`npm test` / whole-file `npx vitest run`, confirmed via CI workflow at T-41-02-03's evidence) — WARNING severity per code review, not a BLOCKER. Disposition: **CLOSED with caveat**, tracked with a concrete fix in `41-REVIEW.md` WR-01, not re-opened here |
| T-41-03-04 | `41-03-SUMMARY.md` "Human Visual Approval (D-11)" — Antoine's verbatim "approved" response, dated 2026-09-08, explicitly attributed as his own and not an auto-mode self-approval. Not re-verified per task instruction (human gate already discharged) |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-41-01 | T-41-02-04 | `/fonts/Inter-*.ttf` is publicly fetchable once deployed. Inter is SIL Open Font License 1.1, freely redistributable, carries no secret, and is already public at its upstream source. No access control is warranted for a non-secret static asset. Locked decision D-06 in `41-CONTEXT.md`. | Antoine (via locked decision D-06, 41-CONTEXT.md) | 2026-09-08 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-08 | 12 | 12 (1 with documented caveat: T-41-03-03) | 0 | gsd-security-auditor |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-08

---

## Notes for Future Audits

- **T-41-03-03 caveat carries forward.** If a future phase changes test invocation patterns in this repo (adds `.only`, wires a test-impact-analysis tool that selects individual test names, or documents an isolated `-t` invocation as a supported workflow), re-open T-41-03-03 and require the fix already specified in `41-REVIEW.md` WR-01 (add an explicit `>= 50` non-vacuity assertion inside the per-codepoint test itself, not only its sibling).
- **DOC-13** (byte-determinism fixture reflecting the *new design*) is intentionally NOT this phase's concern — Phase 41 regenerated the fixture for the font-only baseline (satisfies D-12), but the full DOC-13 requirement is owned by Phase 43. Not a Phase 41 gap.
