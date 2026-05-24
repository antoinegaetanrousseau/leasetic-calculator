# Phase 18 — Deferred Items (out of scope)

Pre-existing issues discovered during Plan 18-01 execution but NOT caused by it.

## 1. PDF byte-drift in `__pdf-fixtures__/render-fixtures.test.ts`

**Discovered:** 2026-05-24 during 18-01 full-suite verification.
**Status:** Pre-existing — failure reproduces on the commit BEFORE 18-01 changes (git stash verified).
**Failing tests (2):**
- `happy-path-en` — expected `b0b7cb…f1ca0`, actual `dfcda4…f8797d`
- (paired regression in fr fixture)

**Plausible cause:** font / pdfkit version drift (auto-update of an indirect dependency) since the fixture was last regenerated. The fixture regeneration runbook lives at `PROP-17 + UI-SPEC §3.3.15`; one-shot:
```
npm run pdf:update-fixture -- --confirm UPDATE-FIXTURE
```
followed by committing the regenerated `__pdf-fixtures__/expected.sha256.txt`.

**Action:** defer to a follow-up plan in Phase 18 (likely 18-07 closing-out) OR a dedicated `chore(pdf): regenerate fixture` commit when someone has time to visually verify the new bytes match the intended layout. Plan 18-01 does NOT touch the PDF render path; running the regenerator under 18-01 would silently absorb whatever upstream drift caused the change, which violates the "verify before absorbing" discipline of PROP-17.

## 2. `localStorage` undefined in jsdom test environment — FIXED in 18-01 (auto Rule 3)

**Discovered:** 2026-05-24 during 18-01 Task 3 sidebar test execution.
**Status:** **RESOLVED** via in-process polyfill in `__tests__/setup-dom.ts`.
**Rule:** Rule 3 (blocking — prevented validation of newly-added D-27 sidebar tests).
**Root cause:** jsdom 25.0.1 + Node 25.9.0 + Vitest 2.1.8 combination did not expose `window.localStorage` in the test VM context. Confirmed independent of 18-01 changes via smoke test.
**Fix:** added minimal in-memory polyfill for both `localStorage` and `sessionStorage` in setup-dom.ts. Idempotent — if a future jsdom upgrade restores native Storage, the polyfill installer no-ops.
**Documented:** see commit log + setup-dom.ts JSDoc.

## 3. Aide article body — FR accents polish (HELP-02 follow-up)

**Discovered:** 2026-05-24 during 18-06 Task 1 checkpoint (SUPPORT_EMAIL decision).
**Status:** **DEFERRED** — explicitly accepted by user on 2026-05-24 ("Ship ASCII-safe").
**Scope:** the FR body strings under `aide.commencer-ici.section.*` in `src/lib/i18n/dictionaries.ts` (lines ~813-826) were drafted ASCII-safe per Plan 18-01 D-21 planner discipline (no `é`/`è`/`à`/`ê`/`ô` in body prose). EN counterparts at lines ~1576+ are already polished and require no follow-up.

**FR keys to polish (≈10 body strings, accent-only — no copy edits):**
- `aide.commencer-ici.lead`
- `aide.commencer-ici.section.overview.body`
- `aide.commencer-ici.section.step1.body`
- `aide.commencer-ici.section.step2.body`
- `aide.commencer-ici.section.step3.body`
- `aide.commencer-ici.section.next.body`

Section TITLES and breadcrumb already carry full accents (`Aperçu`, `Étape`, `Vérifier`, `← Centre d'aide`, `Vous découvrez`, etc.) — the gap is body prose only.

**Action:** schedule as `HELP-02` follow-up or a `chore(i18n): polish FR accents in aide.commencer-ici body` commit before the next partner-facing demo. No code change needed beyond character substitution; existing tests cover key presence, not character composition.

**Rationale for deferring:** 18-06 ships HELP-01 (landing + 1 starter article). Body comprehension is intact (French readers parse ASCII-stripped French without friction); polish is cosmetic and decoupled from the structural launch. Per user 2026-05-24: "accept the article as drafted (ASCII body, accented titles)".

## 4. Aide article wizard screenshots (steps 1/2/3) — HELP-02 follow-up

**Discovered:** 2026-05-24 during 18-06 Task 3 checkpoint (capture wizard step screenshots).
**Status:** **DEFERRED to HELP-02** — explicitly chosen by user on 2026-05-24 ("Skip all wizard screenshots, ship article text-only").
**Blocker:** `scripts/seed-partner-launch.ts` does not set `users.companyName`. The proposal wizard's session-derived hydration on step 1 leaves `partnerCo` empty, which makes `proposalInputSchema.safeParse` fail when the user navigates to step 2. Both Antoine (admin) and Delphine (partner) hit this gate when attempting to walk a test draft through the wizard for screenshot capture. The wizard itself is correct; the gap is the seed script.

**What ships in 18-06 instead:** Article walks through wizard step 1 → 2 → 3 in text, but each of the 3 `<figure>` slots renders a styled placeholder (`Aperçu de l'étape N — à venir` / `Step N preview — coming soon`) with a muted dashed border + centered grey text so the absence reads as intentional, not broken.

**Follow-up to-dos filed as separate task chips (NOT Phase 18 scope):**
1. **Fix `seed-partner-launch.ts` companyName gap.** Add `companyName: 'Test Company'` (or equivalent test value) to the seed script's user INSERT payload AND backfill existing seeded partner accounts (`UPDATE users SET company_name = 'Test Company' WHERE email = '<seeded partner email>' AND company_name IS NULL`). Once seeded accounts have a companyName, the wizard step 1 → step 2 transition unblocks for partners attempting to create demo drafts.
2. **Fix topbar route-awareness.** Topbar currently shows the literal "Accueil" on every page regardless of route. Should derive the title from the active route's metadata or breadcrumb segment.
3. **HELP-02 capture pass.** Once the companyName gap above is closed, capture the 3 wizard step screenshots per the 18-06 Task 3 contract (1280px viewport, retina, light-mode, commission-free per ADMIN-09 envelope D-12) and swap the placeholders in `app/(authed)/aide/commencer-ici/page.tsx` for `<Image>` elements pointing at `public/aide/wizard-step-{1,2,3}.png`.

**Rationale for deferring:** the wizard companyName gap is its own bug with its own seed-script fix, independent of HELP-01. Shipping HELP-01 with placeholders unblocks the landing + article surface and lets the closing-out plan visual sign-off (12 checkpoints in 18-07) continue with the structural surface in place. The placeholders are visually intentional (dashed border + muted text) so a partner reading the article understands the screenshots are forthcoming rather than broken.

