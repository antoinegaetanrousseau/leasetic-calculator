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

CLOSE-02, CLOSE-08 and GAP-02's verification legs all walked. Awaiting operator adjudication
(plan 38-04 Task 3) before ticking requirements and restoring the environment.

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

## CLOSE-08 — Phase 28 browser-verification backlog

Walked 2026-09-06 by Claude driving a DevTools-controlled Chrome against the operator-authenticated
session in "Environment". Heights and focus geometry are **measured** via `getBoundingClientRect()`
and `getComputedStyle()`, never judged by eye. Read-only except for one disclosed write (F-38-04).

**All height figures below are POST-F-38-02-fix.** The walk found the legacy buttons rendering at
37.7px rather than the 36px plan 38-02 claimed, fixed it in-phase, rebuilt, and re-measured. The
pre-fix figures are kept in F-38-02 so the correction is auditable.

| # | Surface | Route | Theme | `.btn-*` present | Measured | Result |
|---|---|---|---|---|---|---|
| 1 | Wizard step 1 | `/proposals/new/parametres` | light | **none** | 2 shadcn @ 36px; zero `.btn-*` in DOM | **not observable** — see F-38-03, F-38-04 |
| 2 | Proposals list | `/proposals` | light | `.btn-out`, `.btn-green` | `.btn-out` 38px · `.btn-green` 36px | pass |
| 2 | Proposals list | `/proposals` | dark | `.btn-out`, `.btn-green` | `.btn-out` 38px · `.btn-green` 36px (identical) | pass |
| 3 | Coefficients | `/{admin}/coefficients` | light | `.btn-green` | `.btn-green` 36px | pass |
| 3 | Coefficients | `/{admin}/coefficients` | dark | `.btn-green` | 36px (identical) | pass |
| 4 | Paramètres | `/parametres` | light | `.btn-out`, `.btn-green` | `.btn-out` 38px · `.btn-green` 36px | pass |
| 4 | Paramètres | `/parametres` | dark | `.btn-out`, `.btn-green` | identical | pass |
| 5a | Partners list | `/{admin}/partners` | light | `.btn-green` | 36px | pass |
| 5a | Partners list | `/{admin}/partners` | dark | `.btn-green` | 36px (identical) | pass |
| 5b | Create-partner form | `/{admin}/partners/new` | light | `.btn-out`, `.btn-green` | `.btn-out` 38px @ top 1185.2 · `.btn-green` 36px @ top 1186.2 | pass — 1px offset is A-38-02's expected border delta |
| 5c | LC references | `/{admin}/lc-references` | light | **none rendered** | 16 rows, zero `.btn-*` | **not observable** — pagination-conditional, see F-38-06 |
| 6 | NotFoundCard | `/clients` (404 as admin) | dark | `.btn-green` | rendered | incidental pass |

**Heights are theme-independent** — every dark row re-measured identically to its light row, which is
expected (the padding/line-box rule carries no theme condition) and is recorded rather than assumed.

### Row alignment

The plan's acceptance criterion asked for measured legacy-vs-shadcn pairs. **No surface in this walk
renders a legacy `.btn-*` in the same row as a shadcn `Button`** — the two populations are disjoint in
practice. So the alignment claim is verified against the shadcn contract itself rather than a
co-located pair:

```
shadcn Button `default` (h-9), measured in-page   : 36.0px   (line-height 20px)
.btn-green / .btn-navy  after F-38-02 fix         : 36.0px   ← parity
.btn-out                after F-38-02 fix         : 38.0px   ← +2px border (A-38-02: expected)
```

Before the fix these were 37.7px and 39.7px. Arithmetic, verified in-browser both ways:
`8px pad + 20px line box + 8px pad = 36`; `.btn-out` adds `1px + 1px` border = 38.

### Focus ring (UIC-11)

Measured on `.btn-out` at `/parametres` under **real keyboard focus** (a `Tab` keypress, not
`element.focus()` — `:focus-visible` does not match programmatic focus, and testing it that way
returns an empty ring and looks like a defect):

```
:focus-visible          = true
box-shadow: rgb(1,204,114) 0 0 0 2px,               <- solid 2px inner ring, --ring #01cc72
            oklab(0.741781 -0.1679 0.0817899/0.5)
                        0 0 0 5px                    <- 5px halo at 50% (color-mix layer)
outline: none
```

Two-layer geometry confirmed, materially different from the retired flat
`0 0 0 3px rgba(45,122,140,0.18)`. `.search-bar:focus-within` renders the **identical** ring and
retains `border-color: var(--teal)` (`lab(48.496 0 0)`, matching the `--teal` token).

**Measured contrast of the ring against the dark surfaces** (WCAG non-text minimum is 3.0):

| Surface | New ring `#01cc72` | Retired ring `rgba(45,122,140,.18)` composited |
|---|---|---|
| `--background` `#161616` | **8.52:1** | 1.19:1 |
| `--card` `#1e1e1e` | **7.84:1** | 1.20:1 |
| sidebar-accent `#262626` | **7.12:1** | 1.19:1 |

This reproduces 38-UI-SPEC.md's quoted 7.12:1 and 1.19:1 exactly. Note the retired figure is only
1.19:1 once the 18% alpha is composited over the surface — comparing the *solid* `#2d7a8c` instead
gives 3.08:1 and would have made the retired ring look acceptable. A-38-03's payoff is real and now
measured, not quoted: the dark-theme focus indicator moved from **below** the WCAG non-text floor to
roughly 2.4x above it.

### Vertical rhythm

No card, table row or button group showed disturbed spacing after the height change at either theme.
The change reduced legacy button heights by ~1.7px (`.btn-green`/`.btn-navy`) and ~1.7px (`.btn-out`)
from their pre-walk rendered values; nothing observed depended on the old height.

---

## GAP-02 — dialog close accessible name (FR/EN)

D-38-12 asked for four observations: {dialog, sheet} x {fr, en}. **Two were obtained; two are
blocked by an access-control design decision, not by a defect.**

| # | Surface | `<html lang>` | Accessible name | Source of reading | Result |
|---|---|---|---|---|---|
| 1 | Mobile sidebar sheet — close button | `fr` | **`Fermer`** | DOM: `.sr-only` text, no `aria-label` override -> accname = content | pass |
| 2 | Mobile sidebar sheet — close button | `en` | **`Close`** | same | pass |
| 3 | `dialog.tsx` consumer — close button | `fr` | — | — | **blocked, not observable** |
| 4 | `dialog.tsx` consumer — close button | `en` | — | — | **blocked, not observable** |

**Why 3 and 4 are blocked.** Every `dialog.tsx` consumer in the codebase lives under `/clients/*`
(`CreateClientDialog`, `EditRelationDialog`, `EditCompanyDialog`, `MarkWonDialog`, `MarkLostDialog`,
`ContactFormDialog`, `NextActionDialog`) plus `MergeDialog` on the admin reconciliation queue.
`/clients` calls `requireRelationshipHolder()`, which **refuses admins via `notFound()` by design**
(CRM-02) — confirmed live: `/clients` returned "Page introuvable" for this ADMIN session. The
reconciliation queue is empty, so `MergeDialog` has nothing to open. This is correct application
behaviour, not a defect, and it is not something to work around by creating data.

Mitigating evidence for the unobserved half, stated as mitigation rather than substitution:
`dialog.tsx` and `sheet.tsx` carry the *byte-identical* edit
(`{t('common.close.aria', resolveDomLang())}`), both are pinned by `tests/dialog-close-label.test.ts`,
and the sheet observation exercises that exact call path at runtime in both languages.

**`<html lang>` actually flips (D-38-09's precondition).** Observed directly: `fr` before, and `en`
immediately after clicking EN in the user-menu `LocaleToggle`, with the UI re-rendering ("Mes
propositions" -> "My proposals"). `setLang`'s `revalidatePath('/', 'layout')` keeps the attribute
current, so `resolveDomLang()` has a correct value to read.

**Visual contract (zero visual change) upheld** — the close control keeps its icon, `absolute top-4
right-4` position, `icon-sm` size and `ghost` variant; only the `.sr-only` text changed.

**Hydration warnings: none.** The console was checked with error+warn filters across the preserved
navigation history while a sheet was open. Zero messages. Recorded explicitly per the plan, rather
than left unmentioned.

## Summary

CLOSE-02 (plan 38-03):
total: 2
passed: 2
issues: 0
pending: 0
skipped: 0
blocked: 0

CLOSE-08 + GAP-02 (plan 38-04):
surfaces walked: 6 (of 7 named; 2 not observable)
light rows: 7   dark rows: 4   (heights measured identical across themes)
passed: 9
not observable: 3 (wizard step 1, LC-references pagination control, dialog.tsx FR/EN)
failed: 0

Findings raised: 6 — F-38-01, F-38-02, F-38-05 resolved in-phase;
F-38-03, F-38-06 filed as follow-ups; F-38-04 is a disclosed process finding.

## Gaps

### F-38-02 — legacy `.btn-*` rendered at 37.7px, not the 36px plan 38-02 claimed

status: resolved — fixed in-phase 2026-09-06 (D-38-07: a CSS rule)
found_by: CLOSE-08 walk, row-alignment measurement
severity: the substance of GAP-04's success criterion 4 — a fourth undeclared button height

`38-02-SUMMARY.md` states twice that the `0.5rem` padding change lands the legacy classes "on the
36px `default` step". Measured in the browser, they landed at **37.7px** (`.btn-green`/`.btn-navy`)
and **39.7px** (`.btn-out`).

Cause: these classes set padding but **no height and no line-height**, so height is content-driven.
They inherited the body line box of **21.7px** (14px Inter), while shadcn's `text-sm` pins **20px**:

    before:  8 + 21.7 + 8              = 37.7px   (+1.7px vs a real Button)
             37.7 + 1 + 1 border       = 39.7px   (+3.7px)
    after:   8 + 20   + 8              = 36.0px   (parity)
             36 + 1 + 1 border         = 38.0px   (A-38-02's expected ~2px delta, now exact)

So GAP-04's padding fix moved the height 3.2px closer but did not achieve the parity its own summary
claims — the buttons remained a fourth undeclared height, which is precisely the defect GAP-04
exists to remove. Fix applied: `line-height: 20px` on the shared
`.btn-green, .btn-navy, .btn-out` rule (app/globals.css), with a comment recording the arithmetic
and why 20px. Hypothesis was verified in-browser BEFORE editing (setting the property on live
elements produced exactly 36/38) and re-verified after a rebuild against the served CSS.

Note this does not invalidate 38-02's other work: `0.5rem` is still the correct on-grid padding per
UIC-01, and the focus-ring half of GAP-04 was correct as shipped. `38-02-SUMMARY.md` is left
unedited — it is a historical record; this entry is the correction.

### F-38-03 — `ProposalForm` is dead code, and CLOSE-08 surface #1 was mis-mapped

status: open — filed for a later phase (D-38-07: needs a component change, not a CSS/token/i18n edit)
found_by: CLOSE-08 walk, surface #1
severity: low runtime risk, moderate planning-record risk

`38-WALK-SURFACES.md` Table 1 maps CLOSE-08 surface #1 (wizard step 1) to
`src/components/proposal/ProposalForm.tsx` lines 537 (`.btn-out`) and 547 (`.btn-navy`).
Wizard step 1 renders **zero** `.btn-*` elements — confirmed live
(`document.querySelectorAll('[class*="btn-"]').length === 0`).

`/proposals/new/parametres` is served by `page.tsx` + `ParametresFormCard.tsx` +
`WizardStep1Wiring.tsx`. Those import only `ProposalFormProvider` (the RHF context) from
`ProposalForm.tsx` — **never the `ProposalForm` component itself**. A repo-wide search for
`<ProposalForm` finds only two hits, both inside `ProposalForm.tsx`'s own comments. The component
and its action row are unrendered.

Consequences worth recording:
- 38-CONTEXT.md **D-38-04's premise is false for surface #1**: it asserts "every CLOSE-08 surface
  renders a `.btn-out`", citing `ProposalForm.tsx:537` for the wizard. It does not.
- The `grep -rl` blast-radius counts (21/3/19/32) count **files containing the class string**, not
  rendered surfaces. They overstate GAP-04's true reach by at least this file.

Recommended follow-up: delete `ProposalForm` (the component) or document why it is retained, and
correct Table 1. Filed rather than fixed here because deleting an exported component is a component
change, which D-38-07 routes out of phase.

### F-38-04 — wizard step 1 is not observable read-only (disclosed write)

status: disclosed — operator decided 2026-09-06 to leave the row in place
found_by: CLOSE-08 walk, surface #1
severity: process — invalidates the plan's read-only premise for one surface

Navigating to `/proposals/new/parametres` **created a persisted draft**, before any interaction:

    id         675135aa-f5ff-4cd3-94f1-7a0ef2439286
    lc_ref     LC-2026-003        <- a sequential reference is consumed
    status     draft
    created_at 2026-09-06T13:28:55.910Z

Confirmed by read-only query against the development branch. Draft count went 14 -> 15 (there was
already a stray draft from 2026-09-03). Nothing was submitted; nothing existing was modified or
deleted; the production branch was never opened.

38-04-PLAN.md Task 1 says to "observe wizard step 1, never submit it", assuming observation is free.
It is not: this wizard mints a draft and burns an LC reference on entry, so **CLOSE-08 surface #1
cannot be walked read-only at all**. Operator decision: leave the row (deleting would be a second
unapproved write, and deletion would not return the consumed reference), record it here, and do not
re-enter the wizard for the dark pass. A later verification of this surface needs a disposable
database.

### F-38-05 — the mobile sidebar sheet announced hardcoded English on a `lang="fr"` page

status: resolved — fixed in-phase 2026-09-06 (D-38-07: an i18n string)
found_by: GAP-02 FR observation, via the DevTools accessibility tree
severity: the same user-facing a11y defect GAP-02 was raised to fix

Observed in the accessibility tree while `document.documentElement.lang` was `fr`:

    dialog "Sidebar" description="Displays the mobile sidebar."
    heading "Sidebar" level="2"

`src/components/ui/sidebar.tsx:200-201` hardcoded `<SheetTitle>Sidebar</SheetTitle>` and
`<SheetDescription>Displays the mobile sidebar.</SheetDescription>` inside an `sr-only`
`SheetHeader`. GAP-02 fixed the close *button* in `dialog.tsx` and `sheet.tsx` and missed this
header two lines away in the same vendored, **ESLint-excluded** `src/components/ui/**` directory —
and it survived for exactly the reason GAP-02 did: `sr-only` text is announced to screen-reader
users and seen by nobody else.

Fix: added `shell.sidebar.title` / `shell.sidebar.description` (FR + EN) to `dictionaries.ts` and
wired both through `t(..., resolveDomLang())`, the pattern 38-01 established. Extended
`tests/dialog-close-label.test.ts` with three assertions, **mutation-tested for non-vacuity**:
restoring the literal fails exactly the two new guards; reverting passes 8/8. Re-verified live —
FR now announces "Barre latérale" / "Affiche la barre latérale mobile."; EN announces "Sidebar" /
"Displays the mobile sidebar."

### F-38-06 — `38-WALK-SURFACES.md` describes pagination controls as "per-row" links

status: open — documentation correction, low priority
found_by: CLOSE-08 walk, surfaces 5c and 3

Table 1 describes `PartnersList.tsx:213` and `LcReferencesList.tsx:167` as a "per-row link". Both
are the **"Charger plus" pagination control**, rendered only inside `{nextCursor && ...}`. With the
current dataset (16 LC references, one page) they do not render at all, so those `.btn-out`
instances could not be observed. Same applies to `HistoryTable.tsx:169` and `LoadMoreButton`.

Not a code defect — the shared CSS rule governing them was measured directly on other rendered
`.btn-out` instances — but the surface list should say "pagination control (conditional on
`nextCursor`)" so a later walker knows it needs a multi-page dataset.

### Method note — one near-miss false finding, recorded deliberately

`.search-bar:focus-within` initially measured with an **empty** `box-shadow`, which looked like a
broken focus ring. It was not: `.search-bar` carries `transition: box-shadow .15s`, and the reading
was taken at t=0. Two animation frames in it read `0.24px` / `0.6px` at alpha `0.12` — exactly 16%
of the way through a 150ms transition. Settled (400ms) it renders the full correct ring.

Recorded because "focus ring missing on the search bar" would have been a plausible, confident and
wrong entry in this table, and the same trap applies to any future walker measuring a transitioned
property.

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
