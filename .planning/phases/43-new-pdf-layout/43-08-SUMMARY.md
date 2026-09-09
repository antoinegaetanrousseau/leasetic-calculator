---
phase: 43-new-pdf-layout
plan: 08
subsystem: pdf
tags: [react-pdf, pdf-preview, human-verification, hyphenation, i18n, dictionaries]

# Dependency graph
requires:
  - phase: 43-new-pdf-layout
    provides: "43-07's fully green suite (200 files / 2711 tests) and D-15's still-open human visual pass — the automated gates prove byte-determinism and content presence, not that the page looks like the design"
provides:
  - "scripts/render-pdf-preview.ts + the pdf:preview npm script — a confirm-free, DB-free renderer that writes the three frozen fixtures to .preview/*.pdf on disk (Task 1, committed prior session, hash 2c82c67)"
  - "Antoine's D-15 human verdict against the reference PNGs, recorded verbatim (Task 2, this commit) — approved with two named defects, not a blanket approval"
  - "Two fully-diagnosed, scoped defects ready for a gap-closure plan to implement without re-asking Antoine anything: (1) default @react-pdf/renderer hyphenation breaking the FR/EN title mid-word, (2) VOTRE CONTACT card headline/label semantics inverted from what Antoine actually wants"
  - "A process finding: the title-hyphenation defect was seen and absorbed by two prior automated verification passes (43-05, 43-07) before a human caught it — recorded so the same normalise-instead-of-fix pattern isn't repeated"
affects: [44-backfill, gap-closure-plan-tbd]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified: []

key-decisions:
  - "No requirements marked complete by this plan, despite the plan's own `requirements:` frontmatter listing DOC-01/02/03 alongside the already-[x] DOC-04..11. DOC-01 and DOC-03 are the exact requirements the two open defects violate (DOC-01's 'matching the design spec' text and title scale; DOC-03's VOTRE CONTACT card structure) and REQUIREMENTS.md correctly still shows both unchecked. DOC-02 was not independently content-audited by this checkpoint (check 'c' covered card wrapping/geometry, not SOCIÉTÉ CLIENTE's field-by-field content), so it is left as-is rather than ticked on an assumption. Per the standing lesson that a plan's `requirements:` field records relevance, not ownership, this SUMMARY does not call `requirements mark-complete` for any ID."
  - "The phase is explicitly NOT closed. Two defects are open, one of which (VOTRE CONTACT semantics) requires a dictionaries.ts + document.tsx edit and a decision on the `partnerCo` fallback (Finding 3) before it can ship. A gap-closure plan must run before Phase 44's backfill, which is this milestone's one irreversible step and cannot run before the document it re-renders proposals into is correct."
  - "Both defects are diagnosed to the point a gap-closure plan can be scoped and written without re-asking Antoine anything further — exact fix locations, exact dictionary key additions/deletions, and measured geometry headroom are all recorded below."

patterns-established: []

requirements-completed: []

# Metrics
duration: ~6min (this continuation session; Task 1 was committed in a prior session at 2026-09-08T22:50:32Z, ~9h before this verdict was recorded)
completed: 2026-09-09
---

# Phase 43 Plan 08: Human Visual Pass Against the Reference PNGs (D-15) Summary

**Antoine approved the overall FR/EN render against the reference PNGs but flagged two real defects — default-hyphenation title wrap and inverted VOTRE CONTACT card semantics — so the phase closes with a scoped, evidence-backed gap list instead of a blanket sign-off.**

## Performance

- **Duration:** ~6 min (this continuation session, recording the verdict only)
- **Started:** 2026-09-09T09:54:00Z (continuation agent spawn)
- **Completed:** 2026-09-09T10:00:00Z
- **Tasks:** 2 (Task 1 committed in the prior session; Task 2 — this verdict — committed now)
- **Files modified:** 0 source files; 1 file created (this SUMMARY)

## Accomplishments

- Task 1 (prior session, commit `2c82c67`): `scripts/render-pdf-preview.ts` + `pdf:preview` npm script, rendering all three frozen fixtures to `.preview/*.pdf` with no database or blob access. Verified present on disk at continuation start: `agent-commission-free.pdf` (30,622 bytes), `happy-path-en.pdf` (30,723 bytes), `happy-path-fr.pdf` (30,454 bytes) — all well over the plan's 4,000-byte floor.
- Task 2 (this session): Antoine's verdict against the reference PNGs recorded verbatim below, covering all seven lettered checks (a-g) plus the commission and brand-spelling checks — six of nine explicit "all good", one explicit defect (title wrap), and a separate, unprompted content finding about the VOTRE CONTACT card that Antoine raised before giving the lettered verdict.
- Both defects fully diagnosed with root cause, fix location, and (for the contact card) measured geometry headroom, so a gap-closure plan can be written without re-asking Antoine anything.
- A process finding recorded: the title-hyphenation defect was independently encountered by two prior plans (43-05, 43-07) and normalised away rather than fixed — the human pass is what actually caught it.

## Task Commits

1. **Task 1: Add the pdf:preview renderer** - `2c82c67` (feat) — prior session
2. **Task 2: Human visual pass against the reference PNGs (D-15)** - (this commit, recorded below)

**Plan metadata:** pending (separate docs commit after this SUMMARY)

## Files Created/Modified

- `.planning/phases/43-new-pdf-layout/43-08-SUMMARY.md` - this file (created)

No source files were touched by this plan's remaining task. `scripts/render-pdf-preview.ts` and `package.json` were already committed in the prior session under `2c82c67`.

## Human Verdict — Recorded Verbatim (D-15)

Antoine's verdict, given 2026-09-09, against `.preview/happy-path-fr.pdf` and
`.preview/happy-path-en.pdf` beside `Quote-FR-A.reference.png` and `Quote-EN-A.reference.png`,
and `.preview/agent-commission-free.pdf` for the commission check:

> * a. All good
> * b. Title row —it shows the title in French with a split on the word "financière".
> * c. Cards - all good
> * d. Hero and table - all good
> * e. Acceptance block — all good
> * f. Footer — all good
> * g. Whole page — all good
> * Commission — all good
> * Brand — all good

Mapping letters to the plan's checklist (my annotation, not part of the quote): (a) Header,
(b) Title row, (c) Cards, (d) Hero and table, (e) Acceptance block, (f) Footer, (g) Whole page.
Eight of nine items are unqualified passes. Item (b) is the one explicit defect — see Defect 1.

### Separate finding, raised before the lettered verdict: VOTRE CONTACT card confusion

Antoine reported confusion about the card, quoted verbatim:

> "I am confused as to who is the advisor and who is partner in the contact section"

He then specified the structure he wants, quoted verbatim:

> "It's currently perfect as for the design but it's more the naming of the variables.
> You see, in my logic, the advisor is the Leasetic person on our internal team and the partner
> is actually the sales agents and sales partners/distributors.
>
> Ideally, we want to showcase that way:
>
> VOTRE CONTACT
> {{ partner.name }}          ← headline = the partner creating the proposal
> Partenaire   {{ partner.company }}
> Commercial   {{ partner.salesRep }}  ← only applicable for our distributing partners (SHARP/INQUARTO,etc)
> Téléphone    {{ partner.phone }}
> {{ advisor.name }}          ← headline = the Leasetic advisor
> Fonction     {{ advisor.role }}
> Téléphone    {{ advisor.phone }}
> Email        {{ advisor.email }}"

He then followed up with a scope reduction, quoted verbatim:

> "Let's delete and not use salesRep field."

Note that this finding was raised against check (c) "Cards" before the lettered verdict was
given — his "c. Cards - all good" answer in the lettered list is about card geometry (equal
width/height, no label wrap), which is genuinely fine. The naming/structure confusion is a
separate content defect, not a contradiction of "c. Cards - all good".

## Defects for Gap Closure

Recorded here as diagnosis only — this plan does not fix either. Evidence gathered by the
orchestrator prior to this continuation agent's spawn; not re-derived here.

### Defect 1 — Title row hyphenation break (verdict item b, both languages)

- **Symptom:** `Font.registerHyphenationCallback` is registered nowhere in `src/lib/pdf`, so
  `@react-pdf/renderer`'s default hyphenator is active and breaks mid-word: "Proposition de
  location finan-cière" (FR), "Equipment lease financing pro-posal" (EN). The reference PNG
  breaks cleanly after "de", with no hyphenation.
- **Fix location:** `Font.registerHyphenationCallback((word) => [word])` beside the existing
  `Font.register` calls in `src/lib/pdf/document.tsx`, so react-pdf only breaks at spaces.
- **Consequence for gap closure:** changes rendered bytes, so `expected.sha256.txt` needs
  regeneration (`scripts/update-pdf-fixture.ts --confirm UPDATE-FIXTURE`, per D-16). Also,
  `dehyphenate()` in `src/lib/pdf/layout.test.ts:130` becomes a silent no-op once the fix lands —
  the gap-closure plan should replace it with a positive assertion that NO wrap-hyphen break
  exists in the rendered title, converting the helper from a normaliser into a guard rather than
  leaving dead code that would silently stop proving anything.
- **Process finding — this defect was seen twice by automated passes and absorbed, not fixed:**
  `43-05-SUMMARY.md`'s verification note called the mid-word break "already accepted". Plan
  43-07 then hit it again while writing the layout proof and wrote the `dehyphenate()` helper
  specifically so its DOC-10 phrase assertion would pass "rather than inventing a document.tsx
  fix for something 43-05 already decided is fine" (per `layout.test.ts:25-40`'s own comment).
  The human visual pass in this plan is what actually caught it as a real defect against the
  reference PNG. Worth naming as a pattern to watch: an automated gate normalising a rendering
  artifact away (to keep an assertion passing) is not the same as that artifact being correct.

### Defect 2 — VOTRE CONTACT card semantics (Antoine's unprompted finding, not letter-keyed)

- **Current render:** headline = `inputs.partnerCo`, then six rows —
  Commercial (`inputs.partnerName`), Téléphone (`partnerPhone`), Conseiller (`advisor.name`),
  Fonction, Téléphone, Email. Two different entities (the selling partner and the Leasetic
  advisor) sit in one undifferentiated 6-row list, with two identically-labelled `Téléphone`
  rows and no visual or textual marker for where the Leasetic side begins.
- **Root cause:** the reference PNG headlines the advisor and uses a `Partenaire
  {{ partner.company }}` row as an explicit divider between the two entities. Phase 42 D-10
  inverted the order (partner first, per Antoine's own request at the time) and promoted the
  partner company to the card headline — which consumed the divider row and left nothing in its
  place, producing exactly the ambiguity Antoine flagged. `pdf.card.contact.advisorName`
  ("Conseiller") was invented during that D-10 inversion and the dictionary entry itself already
  notes it has "no design source".
- **Agreed target structure** (7 rows, after the "delete salesRep" reduction — every value
  already exists on the current data model, no new field, no data-model work required):
  ```
  VOTRE CONTACT
  {{ inputs.partnerName }}        <- headline 1
  Partenaire   {{ inputs.partnerCo }}
  Téléphone    {{ inputs.partnerTel || partner.companyTelephone }}
  {{ advisor?.name }}             <- headline 2, em dash when advisor is null
  Fonction     {{ advisor?.fonction }}
  Téléphone    {{ advisor?.telephone }}
  Email        {{ advisor?.email }}
  ```
- **Dictionary work implied:** DELETE `pdf.card.contact.salesRep` and
  `pdf.card.contact.advisorName` (verified: exactly one consumer each, both in
  `document.tsx` lines 310 and 312 — clean removal); ADD `pdf.card.contact.partner`
  ("Partenaire" / "Partner"). Per this repo's own discipline, both deletions must land in the
  same diff as their last `t()` call so typecheck stays green at the plan boundary.
- **Geometry — verified, no column widen needed:** measured with real Inter metrics at 8.5pt
  against the fixed 54pt label column in `card-key-value-row.tsx`: Partenaire 41.1pt, Téléphone
  42.1pt, Fonction 34.6pt, Email 21.4pt — all fit with headroom. Net row count actually drops
  (2 headlines + 4 data rows, from 1 headline + 6 data rows today).

### Finding 3 — consequence of Defect 2, needs a decision in gap closure (not yet Antoine's decision)

- `app/(authed)/proposals/new/parametres/page.tsx:108` sets
  `const partnerCo = u.companyName?.trim() || nameFallback;` — an account with no `companyName`
  silently falls back to the person's own name for the partner company value. Today that only
  produces a vague card headline. Under the new structure it becomes a row explicitly labelled
  `Partenaire`, so an account with no `companyName` would render "Partenaire   Delphine Specht" —
  labelling a person as a company in a client-facing document.
- **Two candidate fixes, not mutually exclusive** (for the gap-closure plan to pick, not decided
  here): (a) drop the `|| nameFallback`, so an unset `companyName` renders an em dash, consistent
  with DOC-11's existing absent-field convention; (b) give `companyName` an admin edit path — the
  same missing-edit-path shape `companyTelephone` had, fixed in PR #13
  (`fix/partner-company-telephone-edit`), whose action/row-menu-item/tests could be extended to
  cover `companyName` too.

## Decisions Made

See `key-decisions` in the frontmatter. The two most consequential:

1. **No requirement IDs marked complete by this plan.** DOC-01 and DOC-03 are the specific
   requirements the two recorded defects violate, and REQUIREMENTS.md already correctly shows
   both unchecked — ticking them here would have been the exact "frontmatter lists relevance,
   not ownership" mistake this project has been burned by before. DOC-02 (SOCIÉTÉ CLIENTE card
   content) was not independently audited by this checkpoint's questions, so it is left alone
   rather than assumed complete.
2. **The phase is not closed.** Per the plan's own `<resume-signal>`, Antoine did not say
   "approved" — he gave a lettered verdict with one explicit defect plus a separate structural
   finding. A gap-closure plan is required before Phase 44's backfill can run.

## Deviations from Plan

None - Task 2 executed exactly as written: the human verdict was solicited and is recorded here
verbatim, with no automated assertion substituted for it and no source-file fix attempted (fixing
is explicitly out of scope for this plan per its objective).

## Issues Encountered

None - the render artifacts from Task 1's prior-session commit were still present and valid on
disk (`.preview/*.pdf`, all above the byte floor) at this continuation agent's start, so no
re-render was necessary to record the already-obtained verdict.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Phase 43 is NOT closed.** D-15's human pass surfaced two real, scoped defects. A gap-closure
  plan must land both fixes — the hyphenation callback in `document.tsx` (+ fixture
  regeneration + `dehyphenate()` replacement in `layout.test.ts`) and the VOTRE CONTACT
  dictionary/document.tsx restructure (+ a decision on Finding 3's `partnerCo` fallback) — before
  DOC-01 and DOC-03 can be ticked complete.
- **Phase 44 (the backfill) is blocked on the gap-closure plan.** Per the roadmap's own
  sequencing note, Phase 44 is the milestone's one irreversible step and cannot run before the
  document it re-renders existing proposals into is correct. Running it against the current
  hyphenated-title, ambiguous-contact-card render would bake both defects into every backfilled
  proposal permanently.
- Both defects are diagnosed to fix-location, exact dictionary-key, and measured-geometry
  precision — a gap-closure plan can be scoped and written directly from this SUMMARY without
  re-asking Antoine anything.
- The `pdf:preview` command (`scripts/render-pdf-preview.ts`) remains available for the
  gap-closure plan's own re-verification pass once the fixes land — no new tooling needed.

## Self-Check: PASSED

- `2c82c67` confirmed in `git log --oneline --all`.
- `.preview/agent-commission-free.pdf`, `.preview/happy-path-en.pdf`, `.preview/happy-path-fr.pdf`
  confirmed present on disk at continuation start, all sizes well above the plan's 4,000-byte
  floor (30,622 / 30,723 / 30,454 bytes respectively).
- `git status --short` confirmed clean of any source-file changes before this SUMMARY was staged
  — only `.planning/` paths are part of this commit.

---
*Phase: 43-new-pdf-layout*
*Completed: 2026-09-09*
