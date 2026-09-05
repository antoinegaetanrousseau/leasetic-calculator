---
phase: 18-admin-surfaces
plan: 06
subsystem: ui
tags: [help-center, aide, i18n, ADMIN-09, HELP-01, THEME-02]
dependency_graph:
  requires:
    - .planning/phases/18-admin-surfaces/18-01-SUMMARY.md (Aide i18n keys + sidebar nav D-27)
    - src/lib/i18n/dictionaries.ts (aide.* keys shipped Plan 18-01)
    - src/components/ui/PageHero.tsx (Phase 16)
    - lucide-react (BookOpen, FileText, Mail icons)
  provides:
    - /aide landing route — 3-card placeholder grid (Commencer ici / Créer une proposition disabled / Contact mailto)
    - /aide/commencer-ici route — text-only starter article walking through wizard step 1 → 2 → 3
    - SUPPORT_EMAIL constant wired to antoine.rousseau@leasetic.com (2026-05-24 decision)
    - aide.commencer-ici.figure.placeholder i18n key (FR + EN, single key reused 3× with {0} step-number interpolation)
    - HELP-01 requirement structurally satisfied (landing + 1 article)
  affects:
    - HELP-02 follow-up plan (capture wizard screenshots, swap placeholders for <Image>)
    - 18-07 closing-out plan (Aide landing + article × 2 modes = 4 of 12 visual checkpoints)
tech_stack:
  added: []
  patterns:
    - "Aide figure placeholder convention: <figure class='aide-figure-placeholder'> + inline-style muted dashed border + centered italic grey text — signals 'intentionally pending' rather than broken; HELP-02 swaps for Next.js <Image> without touching surrounding prose"
    - "Single-i18n-key + {0} interpolation reuse pattern carried into Aide article (matches existing app/(authed)/page.tsx, timeAgo.ts, calcul/page.tsx call sites)"
key_files:
  created:
    - app/(authed)/aide/commencer-ici/page.tsx
    - app/(authed)/aide/commencer-ici/page.test.tsx
    - .planning/phases/18-admin-surfaces/18-06-SUMMARY.md
  modified:
    - src/lib/i18n/dictionaries.ts (added aide.commencer-ici.figure.placeholder FR + EN)
    - .planning/phases/18-admin-surfaces/deferred-items.md (added item #4 — screenshot deferral + follow-up to-dos)
decisions:
  - "SUPPORT_EMAIL = antoine.rousseau@leasetic.com (Task 1 decision, matches @leasetic.com launch-domain in STATE.md 2026-05-08; T-18-06-05 harvesting risk explicitly accepted per D-25)"
  - "Wizard screenshots DEFERRED to HELP-02 — blocked by seed-partner-launch.ts companyName gap making the partner test account fail wizard step 2 schema validation (proposalInputSchema.safeParse rejects empty partnerCo); both Antoine + Delphine reproduced the block. Filed as two separate task chips (fix seed script + backfill, fix topbar route-awareness). Article ships with styled <figure class='aide-figure-placeholder'> slots in lieu of <Image>."
  - "Single i18n key aide.commencer-ici.figure.placeholder reused 3× with {0} step-number interpolation (matches codebase .replace('{0}', value) convention) — HELP-02 only needs to (a) capture the PNGs, (b) swap each <figure> for <Image>. No copy churn required."
  - "Figure placeholder style: muted dashed border (1px dashed var(--border)), centered italic grey text (color:var(--muted), fontStyle:italic, fontSize:13), padding 32, minHeight 120 — visually intentional, not broken."
metrics:
  duration_min: 4
  completed_date: 2026-05-24
  tasks_complete: 4
  tasks_planned: 4
  tests_added: 7
  files_created: 3
  files_modified: 2
requirements_completed: [HELP-01, THEME-02]
---

# Phase 18 Plan 06: Aide / Help Center (HELP-01) Summary

**Aide landing 3-card grid + text-only starter article shipped — `/aide` ✦ `/aide/commencer-ici` both live, wizard screenshots deferred to HELP-02 (seed-script companyName gap is its own task chip).**

## Performance

- **Duration:** 4 min (continuation agent — Tasks 1–2 + deferred-items polish were committed in the prior session at `cd8483b`, `25071b8`, `fae3e57`)
- **Started:** 2026-05-24T21:40:20Z (continuation agent spawn)
- **Completed:** 2026-05-24T21:44:59Z
- **Tasks (continuation):** 2 of 2 remaining (Task 3 marked deferred, Task 4 executed as TDD pair)
- **Tasks (full plan):** 4 of 4 — Task 1 decision, Task 2 landing, Task 3 deferred to HELP-02, Task 4 article
- **Files (this session):** 3 created, 2 modified

## Accomplishments

- `/aide/commencer-ici` ships as a text-only starter article: H1 + lead + 5 H2 sections (overview, step1, step2, step3, next) + 3 styled `<figure class="aide-figure-placeholder">` slots + end-of-article CTA to `/proposals/new/parametres`. All copy sources from the `aide.commencer-ici.*` i18n keys shipped by Plan 18-01 (no copy duplication).
- Wizard screenshot capture (Task 3) explicitly deferred to HELP-02 with a structured deferral note + 3 follow-up to-do chips in `deferred-items.md` (seed-script companyName fix, topbar route-awareness, HELP-02 capture pass).
- New `aide.commencer-ici.figure.placeholder` i18n key (FR + EN) with `{0}` step-number interpolation — reused 3× via the codebase-wide `.replace('{0}', value)` convention. HELP-02 only needs to swap each `<figure>` for a Next.js `<Image>`; no copy churn.
- HELP-01 requirement structurally complete: Aide landing surface + 1 starter article both rendering; the screenshots are decoration, not the requirement, and ship in HELP-02.
- ADMIN-09 D-12 commission-invisibility envelope intact — 0 commission references in `aide.commencer-ici.*` keys; 9/9 grep-contract gate green.

## Task Commits

| Task   | Description                                                                                                                                | Type     | Commit     |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ---------- |
| Task 1 | SUPPORT_EMAIL decision (`antoine.rousseau@leasetic.com`)                                                                                   | decision | n/a        |
| Task 2 | `/aide` landing 3-card grid (D-25) — RED                                                                                                   | test     | `cd8483b`  |
| Task 2 | `/aide` landing 3-card grid (D-25) — GREEN                                                                                                 | feat     | `25071b8`  |
| —      | Defer FR accent polish in `aide.commencer-ici` body to HELP-02 (deferred-items item #3)                                                    | docs     | `fae3e57`  |
| Task 3 | Wizard screenshot capture — **DEFERRED to HELP-02** (seed-script companyName gap)                                                          | (none)   | (deferred) |
| Task 4 | `/aide/commencer-ici` text-only article + figure placeholders + figure-placeholder i18n key + deferred-items item #4 — RED                 | test     | `7d74628`  |
| Task 4 | `/aide/commencer-ici` text-only article + figure placeholders — GREEN                                                                      | feat     | `2350d43`  |

**Plan metadata commit:** see final commit in this plan (`docs(18-06): complete plan`).

## Files Created/Modified

### Continuation agent (this session)

- `app/(authed)/aide/commencer-ici/page.tsx` — server component, text-only article rendering 3 wizard sections + 3 styled `<figure class="aide-figure-placeholder">` slots (HELP-02 will swap for `<Image>`)
- `app/(authed)/aide/commencer-ici/page.test.tsx` — 7 vitest assertions (breadcrumb, H1, 5 H2 sections, 3 figure placeholders with interpolated step numbers, end-of-article CTA, max-width 720px, EN parity)
- `src/lib/i18n/dictionaries.ts` — added single new key `aide.commencer-ici.figure.placeholder` (FR: `Aperçu de l'étape {0} — à venir`, EN: `Step {0} preview — coming soon`); `_EnHasAllFrKeys` parity proof compiles clean
- `.planning/phases/18-admin-surfaces/deferred-items.md` — added item #4 (screenshot deferral + follow-up to-do chips for seed-script companyName + topbar route-awareness)

### Prior session (already landed)

- `app/(authed)/aide/page.tsx` — landing 3-card grid (Task 2 GREEN — commit `25071b8`)
- `app/(authed)/aide/page.test.tsx` — 7 vitest assertions (Task 2 RED — commit `cd8483b`)

## Decisions Made

1. **SUPPORT_EMAIL = `antoine.rousseau@leasetic.com`** — Task 1 user decision (2026-05-24). Matches the `@leasetic.com` launch-domain decision recorded in STATE.md 2026-05-08. Threat T-18-06-05 (mailto harvesting by bots) explicitly accepted per D-25 — future mitigation if spam volume becomes problematic: obfuscate via JS-rendered email or contact form.
2. **Skip wizard screenshots — ship article text-only** — User decision 2026-05-24. The wizard step 2 transition is blocked by a pre-existing seed-script gap (`scripts/seed-partner-launch.ts` doesn't set `users.companyName`; the wizard's session-derived hydration leaves `partnerCo` empty, which makes `proposalInputSchema.safeParse` fail on step 2). The blocker is the seed script, not the wizard. Rather than debug the seed (which is its own scope), placeholder slots ship and HELP-02 captures the screenshots once the seed is fixed.
3. **Single-key + `{0}` interpolation for figure placeholders** — Reused 3× via `.replace('{0}', String(stepNumber))`. Matches existing pattern (`app/(authed)/page.tsx:92`, `partners/timeAgo.ts:26`, `calcul/page.tsx:403`). One key per locale keeps the dictionary small and the EN parity proof clean.
4. **Placeholder style — muted dashed border + centered italic grey text** — `1px dashed var(--border)`, `padding:32`, `minHeight:120`, `color:var(--muted)`, `fontStyle:italic`. Visually intentional ("forthcoming") rather than broken ("missing image"). No commission-adjacent surface.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 4 — Scope adjustment, user-confirmed] Task 3 screenshot capture deferred to HELP-02**

- **Found during:** Task 3 checkpoint (capture wizard step screenshots).
- **Issue:** The user attempted to walk a test draft through the wizard for screenshot capture and hit a schema validation gate on the step 1 → step 2 transition. Root cause: `scripts/seed-partner-launch.ts` does not set `users.companyName`. The wizard's session-derived hydration on step 1 leaves `partnerCo` empty, which makes `proposalInputSchema.safeParse` fail on step 2. Both Antoine (admin attempting to capture as admin) and Delphine (the seeded partner test account) reproduced the block.
- **Fix:** User chose to ship the article text-only with styled placeholder figures (`<figure class="aide-figure-placeholder">`) rather than debug the seed-script gap inside Phase 18. The 3 `<Image>` slots originally planned (per UI-SPEC line 600-605) become muted dashed-border placeholders with the i18n string `Aperçu de l'étape N — à venir` / `Step N preview — coming soon`. Documented as a structured deferral in `deferred-items.md` item #4 with 3 separate follow-up to-do chips: (a) fix `seed-partner-launch.ts` companyName + backfill, (b) fix topbar route-awareness (currently always shows "Accueil"), (c) HELP-02 capture pass.
- **Files modified:** `app/(authed)/aide/commencer-ici/page.tsx` (placeholder figures instead of `<Image>`), `src/lib/i18n/dictionaries.ts` (new placeholder key FR + EN), `.planning/phases/18-admin-surfaces/deferred-items.md` (deferral + follow-up chips).
- **Verification:** 7/7 article tests green; placeholder copy interpolation verified in FR + EN; the EN test (Test 7) explicitly asserts the EN locale interpolation works.
- **Committed in:** `7d74628` (RED) + `2350d43` (GREEN).

**2. [Rule 1 — Plan-spec correction] `t()` does not take interpolation args; use `.replace('{0}', value)`**

- **Found during:** Task 4 implementation, after reading the `t()` signature in `dictionaries.ts:1612`.
- **Issue:** The PLAN.md resume instructions suggested the placeholder dictionary key might use `{0}` interpolation, but `t(key, lang)` in this codebase has only a 2-arg signature; substitution is done at the call site via `.replace('{0}', value)`.
- **Fix:** Stored a single key `aide.commencer-ici.figure.placeholder` (e.g. `Aperçu de l'étape {0} — à venir`), then in `page.tsx` called `t('aide.commencer-ici.figure.placeholder', lang).replace('{0}', String(stepNumber))`. Matches the established codebase convention (`app/(authed)/page.tsx:92`, `app/(authed)/proposals/new/calcul/page.tsx:403`, `app/(admin)/[adminSegment]/partners/timeAgo.ts:26-34`, etc.).
- **Files modified:** `app/(authed)/aide/commencer-ici/page.tsx`, `src/lib/i18n/dictionaries.ts`.
- **Verification:** Test 4 asserts interpolation works for FR (`Aperçu de l'étape 1/2/3 — à venir`); Test 7 asserts the same for EN. Both pass.
- **Committed in:** `7d74628` (test) + `2350d43` (impl).

---

**Total deviations:** 2 — both user-confirmed / inline plan-spec corrections. No scope creep.

**Impact on plan:** HELP-01 ships structurally complete (landing + article). Wizard screenshots are an HELP-02 dependency, not a HELP-01 requirement — the requirement is the help surface itself. Closing-out plan (18-07) gets one fewer surface variant to verify (placeholders vs. real screenshots is a single byte-swap in HELP-02; no chrome change).

## Issues Encountered

- **Pre-existing seed-script `companyName` gap surfaced during Task 3 attempt.** This is a pre-existing bug in `scripts/seed-partner-launch.ts` (it doesn't set `users.companyName` for the seeded partner test account). The gap is independent of Phase 18 and was not introduced by it. Filed as its own to-do chip per deferred-items.md item #4 — fix path: `UPDATE users SET company_name = 'Test Company' WHERE email = '<seeded partner email>' AND company_name IS NULL` + add `companyName: 'Test Company'` to the seed script's INSERT payload.
- **Pre-existing topbar route-awareness bug.** Topbar always renders the literal "Accueil" regardless of active route. Surfaced during Task 3 attempt (the partner navigated through several wizard pages and noticed the topbar didn't update). Also independent of Phase 18; filed as a separate to-do chip in deferred-items.md item #4.

## Known Stubs

1. **3 `<figure class="aide-figure-placeholder">` slots in `app/(authed)/aide/commencer-ici/page.tsx`** — These render the styled placeholder text instead of real wizard screenshots. HELP-02 will (a) capture `public/aide/wizard-step-{1,2,3}.png` once the seed companyName gap is closed, (b) swap each `<figure>` for a Next.js `<Image src="/aide/wizard-step-N.png" />`. The placeholder copy ships per locale (FR + EN) so the article reads as intentional during the interim.

## Threat Flags

No new security-relevant surface introduced beyond the plan's `<threat_model>`. Threat register confirmed:

- **T-18-06-01 (commission via step-2 screenshot)** — DEFERRED with the screenshot itself; HELP-02 must still satisfy the ADMIN-09 envelope at capture time.
- **T-18-06-02 (commission via article copy)** — mitigated: `grep -ni "commission" src/lib/i18n/dictionaries.ts | grep "aide.commencer-ici"` returns 0; 9/9 ADMIN-09 grep-contract tests green.
- **T-18-06-03 (XSS via article markup)** — mitigated: all copy comes from `t()` returns rendered as React text (auto-escaped); the new figure-placeholder key is also rendered as plain text inside `<span>` (no raw-HTML injection sinks); no user-supplied content interpolated.
- **T-18-06-04 (phishing via article CTA)** — accepted: CTA points to internal trusted `/proposals/new/parametres` route; no external redirect.
- **T-18-06-05 (SUPPORT_EMAIL harvesting)** — accepted per Task 1 decision; D-25 explicit.
- **T-18-06-06 (public asset tampering)** — DEFERRED with the assets; HELP-02 reactivates when PNGs land.

## Verification

```
npx vitest run 'app/(authed)/aide/' tests/admin-09-grep-contracts.test.ts
→ Test Files  3 passed (3)
  Tests       23 passed (23)
    - app/(authed)/aide/page.test.tsx              7 passed
    - app/(authed)/aide/commencer-ici/page.test.tsx 7 passed
    - tests/admin-09-grep-contracts.test.ts        9 passed

npx tsc --noEmit
→ exits 0 (TS clean, _EnHasAllFrKeys parity proof compiles)

grep -ni "commission" src/lib/i18n/dictionaries.ts | grep "aide.commencer-ici"
→ 0 hits (ADMIN-09 D-12 envelope intact)

ls app/(authed)/aide/commencer-ici/
→ page.test.tsx + page.tsx (both files present)
```

ADMIN-09 9-gate suite remains green (9/9 pass) — verified post-implementation.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- HELP-01 landing + article surface SHIPPED structurally. 18-07 closing-out can run the visual sign-off on `/aide` + `/aide/commencer-ici` × 2 modes = 4 of 12 checkpoints. Screenshots are absent but the chrome itself (sidebar Aide active state, breadcrumb, prose typography, CTA) is fully renderable in both light and dark via the Phase 16 token cascade.
- **HELP-02 entry criteria:** (a) `scripts/seed-partner-launch.ts` companyName fix landed + existing partner accounts backfilled, (b) topbar route-awareness fix landed (optional — not strictly blocking for screenshots, but better-looking demo), (c) capture pass per Task 3 contract (1280px viewport, retina, light-mode, commission-free), (d) swap 3 `<figure>` placeholders for `<Image>` elements in `app/(authed)/aide/commencer-ici/page.tsx`. No copy churn needed.
- Phase 18 Wave 2 surface plans (18-02 … 18-06) are now all SHIPPED. Wave 3 (closing-out — 18-07) can spawn.

## Self-Check: PASSED

Files verified to exist:
- ✓ `app/(authed)/aide/commencer-ici/page.tsx` — contains the article H1 + 5 H2 sections + 3 `<figure class="aide-figure-placeholder">` slots + CTA
- ✓ `app/(authed)/aide/commencer-ici/page.test.tsx` — contains 7 vitest assertions
- ✓ `src/lib/i18n/dictionaries.ts` — contains `aide.commencer-ici.figure.placeholder` in BOTH FR + EN blocks
- ✓ `.planning/phases/18-admin-surfaces/deferred-items.md` — contains item #4 (screenshot deferral + follow-up chips)
- ✓ `.planning/phases/18-admin-surfaces/18-06-SUMMARY.md` (this file)

Commits verified to exist (via `git log --oneline | grep`):
- ✓ `cd8483b` (Task 2 RED — prior session)
- ✓ `25071b8` (Task 2 GREEN — prior session)
- ✓ `fae3e57` (deferred-items polish — prior session)
- ✓ `7d74628` (Task 4 RED — this session)
- ✓ `2350d43` (Task 4 GREEN — this session)

---

*Phase: 18-admin-surfaces*
*Completed: 2026-05-24*
