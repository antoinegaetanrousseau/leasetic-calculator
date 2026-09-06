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

CLOSE-02 check 1 — dark-mode first-paint filmstrip.

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

result: [pending]
verified: [pending]

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

result: [pending]
verified: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
