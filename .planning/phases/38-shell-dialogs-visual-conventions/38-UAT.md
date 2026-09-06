---
status: partial
phase: 38-shell-dialogs-visual-conventions
source: [31.1-VERIFICATION.md, 28-01-SUMMARY.md, 38-03-PLAN.md, 38-04-PLAN.md]
started: 2026-09-06T13:05:00Z
updated: 2026-09-06T13:12:00Z
database: development
database_reason: |
  Neon `development` branch (`ep-polished-band-alphc576-pooler`), with
  `.env.production.local` moved aside to `.env.production.local.OFF` for the duration.

  This resolves the documented conflict between two source artifacts, in favour of
  38-UI-SPEC.md over 38-CONTEXT.md D-38-01, on empirical grounds:

  - D-38-01 argued for the PRODUCTION branch because D-36-03 recorded that app-level login
    against the development branch fails (`[Better Auth]: Invalid password` — a copy-on-write
    fork frozen at 2026-05-27 whose credential hashes predate every rotation since).
  - 38-UI-SPEC.md § "CLOSE-02 — Verification Method" argued for the development branch,
    citing 37-HUMAN-UAT.md's recipe.
  - The tiebreaker is empirical and postdates D-38-01: 37-HUMAN-UAT.md records an admin
    signing in successfully against the development branch on 2026-09-06. D-36-03's failure
    is no longer current. Confirmed again today — login succeeded on this branch in both
    browsers used for this walk.

  The development branch is also read-only by construction for this phase's purposes, which
  is why it is preferred whenever it works.
---

## Current Test

CLOSE-02 complete (2/2 pass), F-38-01 resolved, 31.1-VERIFICATION.md flipped to passed 7/7.
Next: plan 38-04 — the CLOSE-08 light+dark walk.

## Environment

Recorded once here; every test below ran against it unless its own `verified` block says otherwise.

```
build     Next.js 16.2.4, `npm run build` (production build, output: standalone)
serve     `PORT=3000 npm run start` → http://localhost:3000
database  Neon development branch (ep-polished-band-alphc576-pooler)
env       .env.production.local moved aside to .env.production.local.OFF
operator  antoine.rousseau — performed every sign-in; Claude never authenticated (D-38-02)
mode      read-only — wizard step 1 observed but never submitted; nothing created/edited/deleted
```

**Deviation from 38-03-PLAN.md Task 1 recipe, recorded per D-38-08.** The plan's recipe serves
on port **3001** by hand-injecting `APP_URL` / `NEXT_PUBLIC_APP_URL` overrides at both build and
start. This walk serves on port **3000** with no overrides, because with `.env.production.local`
moved aside `.env.local` already sets both variables to `http://localhost:3000`. The requirement
the overrides exist to satisfy — the baked `NEXT_PUBLIC_APP_URL` must match the port actually
served, or the login button silently no-ops with a CORS error (project memory
`leasetic_app_url_must_match_custom_domain`) — is met either way, with one less moving part.
The port number is immaterial to what CLOSE-02 and CLOSE-08 verify. Login succeeded, which is
the empirical confirmation that the APP_URL/port pairing is coherent.

**Two browsers were used, deliberately.** Claude's in-app Browser pane cannot capture a
DevTools performance trace, and the DevTools-driven Chrome instance does not share cookies with
it. The operator therefore signed in to both. Which browser produced which result is recorded
per-test.

**Served-bundle confirmation (guards against project memory `leasetic_dev_server_stale_css_after_build`).**
Before any observation, the CSS actually served at
`/_next/static/chunks/0gpnk~cp42_u7.css` was asserted to carry this phase's changes rather than
a stale chunk: `padding:.5rem 1.5rem` present, zero occurrences of the old `.6rem`, 39
occurrences of `var(--ring)`, zero teal focus literals, and the three intentional non-focus teal
values surviving as minified `#2d7a8c12` / `#2d7a8c1a` / `#2d7a8c1f`.

## Tests

### 1. CLOSE-02 / SHELL-C7 — no flash of light chrome on first paint, dark theme

expected: |
  Verbatim from `31.1-VERIFICATION.md`'s `human_verification` entry: dark mode renders on a
  palette sampled from Colibris, with no flash of light chrome.

  Pass signature (D-38-03): in a CPU-throttled DevTools performance trace of a hard reload of
  an authenticated page in dark theme, **no light-chrome frame precedes the first painted dark
  frame**. Fail signature: a light frame appears before a dark one.

  The settled frame must additionally read the six tokens pinned by `tests/dark-palette.test.ts`,
  confirmed via computed styles rather than judged by eye:
  `--background` and `--sidebar` `#161616`, `--card` `#1e1e1e`,
  `--border` / `--sidebar-border` `oklch(1 0 0 / 8%)`, `--muted-foreground` `oklch(0.65 0 0)`.

why_human: |
  `tests/dark-palette.test.ts` asserts the CSS declarations exist. It cannot assert they
  composite before first paint. `31.1-VERIFICATION.md` scored 6/7 and stopped at
  `human_needed` precisely because this rendering-level claim had never been observed running,
  by any agent, human or automated; the prior attempt (31.1-07) started and the browser session
  dropped mid-check.

  D-38-03 therefore requires a *temporal* artifact. Interval screenshots during a throttled
  reload are explicitly rejected as the method — sampling can miss a sub-frame flash and yields
  absence-of-evidence, which is the exact weak claim the verifier already refused once.
  Source-level inspection of the inline theme script in `app/layout.tsx` is rejected for the
  same reason.

how_to_run: |
  See "Environment" above for build/serve/database. Then, in the DevTools-driven Chrome:

      1. Ensure the app is in dark theme (theme cookie dark) on an authenticated page.
      2. Apply CPU throttling (record the rate).
      3. Start a performance trace with reload enabled, so the trace covers first paint.
      4. Stop the trace; export the screencast frames in order with their timestamps.
      5. Save frames under evidence/ named so frame order and timestamp are reconstructable.
      6. Read the six pinned tokens from computed styles on the settled page.

result: pass
verified: |
  2026-09-06, Claude driving a DevTools-controlled Chrome (chrome-devtools MCP) against the
  operator-authenticated session described in "Environment". CPU throttling 6x, no network
  throttling. Two performance traces of a hard reload of http://localhost:3000/proposals.

  BOTH theme-resolution paths were traced, not just the one the plan named. The plan said "set
  the theme cookie to dark", which is the path where SSR already ships dark markup and nothing
  needs to flip — the easy case. The case that can actually flash is the cookie-absent /
  `lt_theme=system` path, where `app/layout.tsx` DELIBERATELY ships `data-theme="light"` as a
  neutral SSR fallback and leaves the inline script to flip it before paint. Confirmed by curl
  against the same server:
      no lt_theme cookie : data-theme="light"   <- flip required before paint
      lt_theme=system    : data-theme="light"   <- flip required before paint
      lt_theme=dark      : data-theme="dark"    <- no flip needed

  RESULT — no light frame in either path. All 5 captured screencast frames are dark:
      caseB-system-osdark_frame-01_t+247.2ms.jpg   dark
      caseB-system-osdark_frame-02_t+400.5ms.jpg   dark (full shell)
      caseB-system-osdark_frame-03_t+544.1ms.jpg   dark (settled)
      caseA-cookie-dark_frame-01_t+13.6ms.jpg      dark
      caseA-cookie-dark_frame-02_t+551.4ms.jpg     dark (settled)

  METHOD STRENGTHENED BEYOND THE FILMSTRIP. The trace yielded only 2-3 screencast frames, which
  is a SAMPLE — and a sample cannot prove the absence of a sub-frame flash. That is the precise
  weakness D-38-03 names, so resting the verdict on 5 frames would have repeated the error
  31.1-VERIFICATION.md refused. The decisive evidence is instead the CAUSAL ORDERING within the
  same runtime trace:

      case B (SSR ships light, flip required)   case A (SSR ships dark)
        inline script  340.2ms +5.6ms             inline script  478.7ms +3.6ms
        script ends    345.8ms                    script ends    482.3ms
        first Paint    385.4ms                    first Paint    533.8ms
        MARGIN        +39.6ms                     MARGIN        +51.5ms
        firstPaint     420.8ms                    firstPaint     579.9ms
        first chunk    424.5ms (post-paint)       first chunk    485.4ms

  The inline no-flash script is the FIRST EvaluateScript in each trace (attributed to the
  document URL /proposals, line 1 col 2476 — i.e. inline in <head>); every other script is a
  /_next/ chunk executing after first paint. Because `data-theme` is already "dark" ~40ms
  (case B) and ~52ms (case A) before the compositor's first Paint, a light frame is not merely
  unobserved — it cannot have been composited. This is runtime evidence, NOT the source-level
  inspection D-38-03 rejects: it is the observed execution order of the real run.

  SIX PINNED TOKENS confirmed from computed styles on the settled dark page (not judged by eye):
      --background       #161616              PASS
      --sidebar          #161616              PASS
      --card             #1e1e1e              PASS
      --border           lab(100% 0 0/.08)    PASS  (see note)
      --sidebar-border   lab(100% 0 0/.08)    PASS  (see note)
      --muted-foreground lab(59.4% 0 0)       PASS  (see note)
      body background    rgb(22,22,22) = #161616
      --ring             #01cc72  (this phase's new focus token, present in dark)

  NOTE on notation, checked rather than assumed: custom properties serialize AS AUTHORED, so the
  computed `lab(...)` means the SERVED stylesheet says lab(), while the SOURCE (app/globals.css
  :189,193) says `oklch(0.65 0 0)` / `oklch(1 0 0 / 8%)` — exactly what dark-palette.test.ts
  :100-102 pins. Lightning CSS re-serialized the colour space at build time. The values are
  mathematically identical for achromatic colours: OKLab L=0.65 -> Y=0.65^3=0.2746 ->
  CIE L* = 116*(0.65) - 16 = 59.4. And oklch(1 0 0) = lab(100% 0 0) = white. A naive string
  comparison would have mis-reported this as drift; it is not.

  Evidence: evidence/caseA-*.jpg, evidence/caseB-*.jpg, evidence/close02-trace-analysis.txt

### 2. CLOSE-02 — PDF/print surface in dark mode

expected: |
  With the app in dark theme, a proposal detail page's APERÇU PDF panel renders the PDF surface
  with a pure white background and `#1a2832` text, per the `[data-pdf-surface]` override at
  `app/globals.css` lines 214–218 — un-perturbed by this phase's `var(--ring)` focus change and
  `0.5rem` padding change.

why_human: |
  Same class of gap as check 1: the override is asserted to exist by
  `tests/dark-palette.test.ts`, but whether it wins the cascade in a real dark-theme render —
  after this phase edited the same stylesheet — has not been observed.

how_to_run: |
  In dark theme, open a proposal detail page and its APERÇU PDF panel. Read the computed
  background-color and color of the `[data-pdf-surface]` element rather than judging by eye.

result: pass
verified: |
  2026-09-06, same session. Opened /proposals/f54f6b24-509b-4222-8a67-8053112221ae
  (LC-2026-002, owned by delphine.specht — an admin viewing a proposal they do not own) in dark
  theme and inspected the APERÇU PDF panel.

  SUBSTANTIVE RESULT — PASS. The PDF surface renders a white page with dark navy body text and
  the green LOYER MENSUEL HT box, entirely un-perturbed by dark theme and by this phase's
  var(--ring) / 0.5rem padding changes. Evidence:
  evidence/close02-check2_pdf-surface-dark_LC-2026-002.png

  BUT THE STATED MECHANISM IS NOT THE ONE DOING THE WORK — recorded as finding F-38-01 below.
  The check expected the white surface to come from the `[data-pdf-surface]` override at
  app/globals.css:293. It does not. A repo-wide search finds `data-pdf-surface` in exactly three
  places, and NO component anywhere sets the attribute:
      app/globals.css:293        the dark override rule itself
      tests/dark-palette.test.ts:70  asserts the rule EXISTS IN THE STYLESHEET TEXT
      src/lib/pdf/styles.ts:12   a COMMENT noting ink '#1a2832' matches the rule
  Live DOM confirmation: document.querySelectorAll('[data-pdf-surface]').length === 0 on the
  proposal detail page in dark theme.

  The white surface actually comes from Chrome's native PDF viewer rendering a server-generated
  binary PDF (src/lib/pdf/document.tsx -> render.ts), whose colours come from
  src/lib/pdf/styles.ts. App CSS cannot reach inside that viewer at all. So globals.css:293 is
  dead CSS, and dark-palette.test.ts:68 is a TEXTUAL assertion that passes whether or not the
  rule matches anything — it would stay green if the rule were deleted from every element in the
  app, which is exactly the Phase 28 "green gates saw none of six visual defects" pattern.

  The check therefore PASSES on the outcome it cares about (white surface, dark text, in dark
  mode) while disclosing that its named mechanism is vestigial. Routing of F-38-01 is deferred to
  this plan's Task 3 adjudication rather than auto-fixed: D-38-07 classes a CSS rule as
  fix-in-phase, but the fix is not mechanical (delete the rule and its test assertion, or keep it
  dormant for a future HTML-based preview?), and dark-palette.test.ts is deliberately built as a
  tripwire whose own comments require "a conscious, deliberate test edit".

## Summary

total: 2
passed: 2
issues: 0
pending: 0
skipped: 0
blocked: 0

Findings raised (not check failures): 1 — F-38-01 (resolved in-phase).

## Gaps

### F-38-01 — `[data-pdf-surface]` is dead CSS, and its test cannot detect that

status: resolved — fixed in-phase 2026-09-06 per D-38-07 (operator chose option (b))
found_by: CLOSE-02 check 2, 2026-09-06
severity: low functional risk, moderate false-confidence risk

`html[data-theme="dark"] [data-pdf-surface]` (app/globals.css:293) matches zero elements: no
component in src/ or app/ ever sets the `data-pdf-surface` attribute. The PDF preview is a
server-generated binary rendered by Chrome's own PDF viewer, which app CSS cannot style.

`tests/dark-palette.test.ts:68` asserts only that the rule's TEXT exists in globals.css, so it
stays green regardless of whether the rule does anything. The dark PDF surface is correct today
by a different route (src/lib/pdf/styles.ts, ink '#1a2832'), so there is no user-visible defect
— the risk is that the pair reads as coverage of a behaviour nothing actually verifies.

Options considered:
  (a) delete the rule and the test assertion — removes false confidence, loses the tripwire if an
      HTML-based preview is ever reintroduced;
  (b) keep both, add a comment marking the rule dormant and why;
  (c) file as a requirement for a later phase.
D-38-07 mechanically classes "a CSS rule" as fix-in-phase, but does not disambiguate (a) vs (b).

RESOLUTION — operator chose (b) at the 38-03 Task 3 checkpoint, 2026-09-06. Applied:
  - app/globals.css: a DORMANT block comment above the rule stating it matches zero elements
    today, why the white surface is actually correct (src/lib/pdf/styles.ts via Chrome's PDF
    viewer), that retention is deliberate for a possible future HTML-based preview, and an
    explicit "do not cite this rule as the reason the PDF renders white".
  - tests/dark-palette.test.ts: a SCOPE comment above the assertion stating it checks only that
    the rule TEXT exists and would stay green either way, pointing readers who want rendered-
    output evidence at 38-UAT.md CLOSE-02 check 2. The test name was corrected from
    "the print/PDF surface still forces white in dark mode" (a claim it does not test) to
    "the print/PDF surface rule is still declared for dark mode" (what it does test).
  Zero behaviour change; 6/6 assertions still pass. The tripwire is kept, the false confidence
  is removed.
