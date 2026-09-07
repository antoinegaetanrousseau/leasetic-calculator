---
phase: 38-shell-dialogs-visual-conventions
plan: 03
subsystem: verification
tags: [uat, close-02, dark-mode, performance-trace, browser-verification, a11y]
requires:
  - 38-01 (dialog/sheet i18n close label — part of the shipped state being walked)
  - 38-02 (0.5rem padding + var(--ring) focus — part of the shipped state being walked)
provides:
  - 38-UAT.md (walk record; CLOSE-02 half complete, CLOSE-08 half awaits 38-04)
  - evidence/ (filmstrip frames, trace analysis, PDF-surface screenshot)
  - 31.1-VERIFICATION.md flipped human_needed -> passed, 6/7 -> 7/7
  - F-38-01 documented in app/globals.css and tests/dark-palette.test.ts
affects: [38-04]
duration: ~35min
completed: 2026-09-06
---

# Plan 38-03 — CLOSE-02: Phase 31.1's two abandoned human checks

Both checks **PASS**. `31.1-VERIFICATION.md` is flipped to `passed` / 7-of-7. One finding
(F-38-01) was surfaced and resolved in-phase by operator decision.

## Executed as an inline orchestrator plan, not a subagent

`gsd-executor` subagents carry Read/Write/Edit/Bash/Grep/Glob only — no browser tooling. D-38-02
requires Claude to *drive a browser* against an operator-supplied authenticated session, so this
plan could not be delegated. It ran inline in the orchestrator, which is the workflow's documented
fallback for runtimes/tasks where the executor tool surface cannot do the work.

## Task Commits

- `4e05a88` test(38-03): open 38-UAT.md, record walk environment and DB decision (Task 1)
- `3d96d92` test(38-03): CLOSE-02 both checks pass, with filmstrip and trace evidence (Task 2)
- (this commit) test(38-03): resolve F-38-01, flip 31.1-VERIFICATION.md to passed (Task 3)

## Task 1 — environment and the database conflict

Two source artifacts disagreed on which Neon branch to walk. Resolved to **development**, on the
empirical tiebreaker that `37-HUMAN-UAT.md` records a successful admin sign-in against it on
2026-09-06, postdating D-36-03's `Invalid password` observation. Confirmed again today.

`.env.production.local` was moved to `.env.production.local.OFF` before any `NODE_ENV=production`
command. This matters more than the guard suggests: `@next/env` resolves `.env.$NODE_ENV.local` at
HIGHER precedence than `.env.local`, and `scripts/check-local-db-branch.sh:24` hardcodes
`ENV_FILE=".env.local"` — so the guard reports "development" while a production build serves
PRODUCTION (OPS-05). Verified the effective resolution directly via `@next/env` under
`NODE_ENV=production` rather than trusting the guard: `ep-polished-band-…` (development). The
production endpoint `ep-icy-boat-…` was never opened.

## Deviations from Plan

1. **Port 3000, not 3001.** The plan's recipe reaches 3001 by hand-injecting `APP_URL` /
   `NEXT_PUBLIC_APP_URL` at build and start. With the production env file moved aside `.env.local`
   already sets both to `http://localhost:3000`, so serving there satisfies the same requirement
   (baked APP_URL must match the served port, or login silently no-ops on a CORS error) with one
   less moving part. Login succeeded, which is the empirical confirmation the pairing is coherent.
2. **Both theme paths traced, not just `lt_theme=dark`.** See below — the plan's stated case is the
   one that cannot fail.
3. **Verdict rests on causal trace ordering, not on the filmstrip alone.** See below.
4. **Two browsers.** Claude's in-app Browser pane cannot capture a performance trace; the
   DevTools-driven Chrome does not share its cookies. The operator signed in to both.

## Check 1 — no flash of light chrome (PASS)

The plan said to set the theme cookie to `dark`. That is the path where SSR already ships dark
markup and **nothing needs to flip** — it cannot flash. The path that can is cookie-absent /
`lt_theme=system`, where `app/layout.tsx` deliberately ships `data-theme="light"` as a neutral SSR
fallback and leaves the inline script to flip it before paint. Confirmed by curl:

    no lt_theme cookie : data-theme="light"   <- flip required
    lt_theme=system    : data-theme="light"   <- flip required
    lt_theme=dark      : data-theme="dark"    <- no flip

Both were traced at 6x CPU throttling. All 5 captured screencast frames are dark.

**Method note that matters.** The traces yielded only 2-3 screencast frames. That is a *sample*,
and a sample cannot prove the absence of a sub-frame flash — precisely the weakness D-38-03 names
and the reason `31.1-VERIFICATION.md` refused this check the first time. Resting a PASS on 5 frames
would have repeated the original error in a new costume. The verdict therefore rests on causal
ordering within the same runtime trace:

| | case B (SSR light, flip required) | case A (`lt_theme=dark`) |
|---|---|---|
| inline script | 340.2ms (+5.6ms) | 478.7ms (+3.6ms) |
| script ends | 345.8ms | 482.3ms |
| **first Paint** | **385.4ms** | **533.8ms** |
| **margin** | **+39.6ms** | **+51.5ms** |
| firstPaint marker | 420.8ms | 579.9ms |
| first `/_next/` chunk | 424.5ms (post-paint) | 485.4ms (post-paint) |

The inline no-flash script is the FIRST `EvaluateScript` in each trace (document URL, line 1
col 2476 — i.e. inline in `<head>`). `data-theme` is already `dark` tens of milliseconds before the
compositor's first Paint, so a light frame is not merely unobserved — it cannot have been
composited. This is runtime evidence, not the source-level inspection D-38-03 rejects.

Six pinned tokens confirmed from computed styles. Notation check worth keeping: custom properties
serialize *as authored*, so `--border` computing to `lab(100% 0 0/.08)` means the SERVED stylesheet
says `lab()` while the SOURCE says `oklch(1 0 0 / 8%)` — Lightning CSS re-serialized the colour
space at build time. Identical for achromatic colours (OKLab L=0.65 → Y=0.65³ → CIE L\* = 59.4). A
naive string comparison would have mis-reported this as token drift.

## Check 2 — PDF surface in dark mode (PASS, with F-38-01)

White page, `#1a2832` text, green loyer box — correct, screenshot committed. But the mechanism the
check names is not the one doing the work.

**F-38-01:** `html[data-theme="dark"] [data-pdf-surface]` (`app/globals.css:293`, which the 31.1
entry still cites as lines 214-218) matches **zero elements** — nothing in `src/` or `app/` sets
that attribute, confirmed repo-wide and in the live DOM. The PDF is a server-generated binary
rendered by Chrome's own viewer, which app CSS cannot reach; the white comes from
`src/lib/pdf/styles.ts`. Meanwhile `tests/dark-palette.test.ts:68` asserts only that the rule's
TEXT exists, so it stays green regardless — the Phase 28 "green gates saw none of six visual
defects" pattern in miniature.

Not auto-fixed: D-38-07 classes a CSS rule as fix-in-phase but does not disambiguate delete-vs-keep,
and `dark-palette.test.ts` is deliberately a tripwire whose own comments demand a conscious edit.
Escalated to the Task 3 checkpoint.

## Task 3 — adjudication (operator decisions, 2026-09-06)

1. **Flip `31.1-VERIFICATION.md` to `passed` / 7-of-7.** Done. SHELL-C7's row flips PARTIAL →
   VERIFIED with the trace evidence appended; the original caveat paragraph is left standing rather
   than rewritten, so the record shows what was known when. Frontmatter gains
   `human_verification_resolved*` fields pointing at `38-UAT.md`.
2. **F-38-01 → keep both, document as dormant.** Done, documentation only, zero behaviour change:
   a DORMANT block comment above the rule (matches nothing today; white comes from
   `src/lib/pdf/styles.ts`; retention deliberate for a future HTML-based preview; do not cite this
   rule as the reason the PDF renders white), and a SCOPE comment on the test explaining it checks
   only that the rule text exists. The test name was corrected from "the print/PDF surface still
   forces white in dark mode" — a claim it does not test — to "…rule is still declared for dark
   mode", which is what it does test.

## Files Created/Modified

- `38-UAT.md` — created; CLOSE-02 half complete, environment + DB decision recorded
- `evidence/` — 5 filmstrip frames, `close02-trace-analysis.txt`, PDF-surface screenshot
- `31.1-app-shell-refresh/31.1-VERIFICATION.md` — flipped to passed 7/7
- `app/globals.css` — DORMANT comment above the `[data-pdf-surface]` rule (comment only)
- `tests/dark-palette.test.ts` — SCOPE comment + corrected test name (no assertion changed)

## Gates

`npm run typecheck` exit 0 · `npm run lint:check` exit 0 · `npm run test` 175 files /
**2356 passed, 61 skipped**. `npm run build` was run once deliberately (this plan requires a
production build) — only after `.env.production.local` was moved aside and the resolved
`DATABASE_URL` was verified to be the development branch.

## Next Phase Readiness

Plan 38-04 reuses this session: server on **port 3000** (not 3001 — see deviation 1), both browsers
authenticated, dark theme currently pinned via `lt_theme=dark` set during check 1. `38-UAT.md`
awaits its CLOSE-08 half. Restore step still outstanding at end of 38-04:
`mv .env.production.local.OFF .env.production.local`.

---

## Self-Check: PASSED

- Both CLOSE-02 checks performed against a running build of the code this phase shipped — not
  source-read, not asserted.
- Evidence committed as reviewable files; the verdict is re-derivable from
  `evidence/close02-trace-analysis.txt` without the raw traces.
- `31.1-VERIFICATION.md` flipped only AFTER both checks passed and only inside the Task 3
  checkpoint, per D-38-08.
- The one finding was disclosed rather than smoothed over, escalated rather than auto-fixed, and
  resolved by operator decision.
