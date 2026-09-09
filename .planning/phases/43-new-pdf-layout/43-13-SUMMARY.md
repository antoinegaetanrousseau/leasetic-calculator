---
phase: 43-new-pdf-layout
plan: 13
subsystem: pdf
tags: [checkpoint, human-verification, gap-closure, doc-02]

# Dependency graph
requires:
  - phase: 43-new-pdf-layout
    provides: "43-09 (hyphenation callback), 43-10 (VOTRE CONTACT restructure), 43-11 (partnerCo option (a)) and 43-12 (clientSiret fixtures + single re-baseline) — the four automated gap-closure plans whose combined result this checkpoint asks a human to observe on a real finalized proposal"
provides:
  - "Operator confirmation, recorded verbatim, closing the final missing[] bullet of 43-VERIFICATION.md Gap 3 — the capture-to-print SIRET path no automated test can exercise"
  - "Operator confirmation that the title no longer wrap-hyphenates (Gap 1) and that the VOTRE CONTACT card reads as two distinct entities (Gap 2), observed on the same real document"
  - "A recorded, non-blocking observation that the contact card's VALUES were all absent on the operator's account — structure correct, data unpopulated"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/phases/43-new-pdf-layout/43-13-SUMMARY.md
  modified: []

key-decisions:
  - "DOC-01 and DOC-02 are marked complete by this plan. This is the first plan in the gap closure entitled to tick either: 43-09 deferred DOC-01 pending fixture regeneration (landed in 43-12), and 43-12 deferred DOC-02 pending exactly this operator confirmation. With the operator's YES on (a), every missing[] bullet across all three gaps of 43-VERIFICATION.md is now closed with either automated proof or a recorded human observation. DOC-03 was already ticked by 43-11."
  - "The operator's report that the VOTRE CONTACT card 'shows all empty' is recorded as an observation, NOT as a Gap 2 failure, and does NOT reopen DOC-03. The operator answered YES to question (c) — the card is now unambiguous — and the screenshot confirms the exact 7-row structure 43-10 shipped. Every VALUE rendering as an em dash is DOC-11's absent-field convention working correctly against an account with no companyName / companyTelephone and an unconfigured Leasetic advisor. That is a data-population concern, not a layout defect, and it is out of scope for a phase whose requirements are about structure. It is flagged below for follow-up rather than patched here."
  - "The absent-advisor headline renders as a bare em dash, which reads as visual noise rather than as a headline. Recorded as a NEW observation surfaced by this checkpoint — it was invisible until 43-10 gave the advisor its own headline row. Not actioned in this plan: this plan modifies no source files by design, and inventing a fix here would bypass the planning gate the same way the defects this phase closed were originally allowed to ship."

patterns-established: []

requirements-completed: [DOC-01, DOC-02]

# Metrics
tasks-completed: 1
files-changed: 0
commits: 1
---

# Plan 43-13 — Operator confirmation: a captured SIRET prints on a real finalized proposal

## Objective

Close the ONE `missing[]` bullet in `43-VERIFICATION.md` Gap 3 that no automated test can cover:

> "Operator confirmation on ONE real finalized proposal that a captured SIRET appears in the
> rendered PDF — the only path no automated test covers."

This plan modified no source files and ran no automated gate. 43-12 already proved the suite, the
lint gate and the fixture determinism green.

## Preflight (performed before pausing)

1. **Dev server** — started and confirmed serving on `http://localhost:3000` (`npm run dev`,
   Next.js 16.2.4, Turbopack, environment `.env.local`). Wizard entry at `/proposals/new`; step
   order is `parametres` → `calcul` → `verification`.
2. **Partner login required** — the operator was told the wizard and `/clients` refuse admin
   accounts, and that an account without a `companyName` would correctly render an em dash beside
   `Partenaire` (43-11's fix, not a bug).
3. **No database migration was run** at any point in this gap closure — verified across the 17
   commits spanning 43-09 through 43-12: no file under `drizzle/`, `migrations/`, and no `*.sql`
   file was touched.

The operator was additionally warned, before starting, that `.env.local` resolves to the
**production** Neon branch and that the proposal they were about to create would be real
production data.

## Operator verdict — recorded verbatim

> all three yes, c: shows all empty.

Accompanied by a screenshot of the rendered `VOTRE CONTACT` card:

```
VOTRE CONTACT
Delphine Specht          <- headline 1 (partner name)
Partenaire      —
Téléphone       —

—                        <- headline 2 (advisor name, absent)
Fonction        —
Téléphone       —
Email           —
```

### Mapping the verdict to the three questions

| # | Question | Verdict |
|---|----------|---------|
| (a) | Does the `SIRET` row show the 14-digit number you typed, rather than an em dash? | **YES** — closes Gap 3's final bullet |
| (b) | Does the title read cleanly, with no hyphen splitting a word across the line break? | **YES** — confirms 43-09 on a real document |
| (c) | Is it now unambiguous who is the partner and who is the Leasetic advisor? | **YES**, with the observation "shows all empty" |

## What (a) closes

Gap 3's four `missing[]` bullets are now all closed:

1. ✅ Valid `clientSiret` on the happy-path fixtures, one fixture deliberately without it — 43-12
2. ✅ Positive assertion that a populated SIRET renders — 43-12
3. ✅ `expected.sha256.txt` regenerated after the fixture change — 43-12
4. ✅ **Operator confirmation on ONE real finalized proposal** — this plan

The verification report's read of the write paths is confirmed correct by observation, not just by
inspection: `finalize-wizard.ts:172` (`LegacyDraftIncomplete`) and `submit.ts:77`
(`proposalInputSchema.safeParse` with the SIREN-prefix refine) do enforce the field, and a
wizard-finalized proposal does print it. Gap 3 was a fixture and coverage hole, not a live defect —
as diagnosed.

## The "shows all empty" observation

**This does not reopen DOC-03, and the operator did not report it as a failure.** Question (c) was
answered YES: the card is unambiguous. The screenshot confirms the card renders exactly the 7-row
structure Antoine specified verbatim in 43-08-SUMMARY.md and 43-10 shipped — partner name as
headline 1, `Partenaire` and `Téléphone` rows, advisor name as headline 2, then `Fonction`,
`Téléphone` and `Email`.

What is empty is every **value**, which is three separate data-population facts about the
operator's own account and environment, none of them introduced by this phase:

| Row | Why it is an em dash |
|-----|----------------------|
| `Partenaire` | The account has no `users.companyName`. This is precisely 43-11 (option (a)) working: before it, this row would have printed "Delphine Specht" — a person's name under a company label. |
| `Téléphone` (partner) | The account has no `companyTelephone`. Phase 42 shipped the column; PR #13 (`fix/partner-company-telephone-edit`) shipped the admin edit path, but this account's value was never set. |
| advisor headline, `Fonction`, `Téléphone`, `Email` | The single global `leasetic_advisor` row is blank. *(Corrected 2026-09-09: an earlier draft of this line said "for this partner" — wrong. `getAdvisor()` takes no arguments and reads one fixed-id singleton, so this is one blank row affecting every proposal, not per-partner state.)* Known and previously diagnosed — the data-absence finding recorded during the 43-08 checkpoint, not a rendering fault. |

Every one of these is DOC-11's absent-field em-dash convention behaving as specified. The phase's
requirements are about **structure**; populating this data is a separate concern.

### New observation worth a follow-up

With the advisor absent, **headline 2 renders as a bare `—`**. A lone em dash in headline weight
reads as visual noise rather than as an absent name, and arguably the whole advisor block should
collapse when no advisor is configured rather than print four empty rows under an empty headline.

This was invisible before 43-10, because the advisor had no headline of its own to leave behind.
It is **not** actioned here: this plan modifies no source files by design, and patching a rendering
decision inside a recording-only checkpoint would bypass the planning gate — which is the same
shortcut that let the two defects this phase just closed ship in the first place.

## Requirements

- **DOC-01** — marked complete. Gap 1's three bullets: callback added (43-09), `dehyphenate()`
  converted to a falsifiable guard (43-09), fixture regenerated (43-12). Operator confirmed (b) on
  a real document.
- **DOC-02** — marked complete. Gap 3's four bullets, above. Operator confirmed (a).
- **DOC-03** — already marked complete by 43-11. Operator confirmed (c) on a real document, which
  retroactively validates that tick against a human reading rather than structural correctness
  alone.

## Follow-ups (out of scope, not blocking phase completion)

1. **Advisor data is unconfigured** (RESOLVED 2026-09-09 by configuration — see item 2 below; same single blank row) — the advisor block prints four empty
   rows under an empty headline on real proposals today. This is a shipping-relevant data gap, not
   a layout gap.
2. **Bare em-dash headline** when the advisor is absent — consider collapsing the advisor block
   entirely rather than rendering an empty headline plus four em-dash rows.

   *(RESOLVED 2026-09-09, no code change — operator decision. Investigation found the premise
   behind items 1 and 2 was misleading in two ways. First, **the advisor is a global singleton**,
   not per-partner: `getAdvisor()` takes no arguments and reads one fixed row
   (`ADVISOR_ROW_ID = 00000000-0000-0000-0000-000000000001`, seeded by
   `drizzle/0011_phase42_captured_data.sql`), so filling the one admin form at
   `/{ADMIN_URL_SEGMENT}/advisor` populates the block on **every** proposal in the system at once —
   these are not two separate follow-ups but one blank singleton row. Second, the geometry
   objection was weaker than assumed: both cards are `flexGrow:1 / flexBasis:0` in a flex row and
   SOCIÉTÉ CLIENTE is invariably 8 lines (`clientCo` is a required prop, its 6 rows unconditional),
   so the row height is pinned by the client card and collapsing the advisor block would not have
   moved page geometry — only left whitespace inside the card.*

   *The decisive constraint is `43-CONTEXT.md` **D-13**, which locks the opposite of collapsing:
   "A null advisor, or any null column, renders em dashes under DOC-11 — the card keeps its
   geometry and the proposal still finalizes." Collapsing would require formally amending a
   decision locked in this same phase, to fix a state that one admin form makes unreachable.*
   
   *Worth recording for whoever revisits this: DOC-11's text governs a field's **label** followed
   by an em dash. The three advisor rows have labels, so DOC-11 covers them. The headline at
   `document.tsx:334` renders `emDash(advisor?.name)` as a bare, UNLABELLED em dash — which DOC-11
   never asked for. If the degraded path ever needs hardening (e.g. the seed row is wiped), the
   minimal DOC-11-compatible change is to give that headline a static "Conseiller Leasetic" /
   "Leasetic advisor" fallback, touching only the unlabelled headline and leaving D-13 and all
   three labelled rows intact. Deliberately NOT done now: it would move PDF bytes and force a
   fixture re-baseline to harden a state configuration already prevents.*
3. **`users.companyName` has no edit path.** The operator declined option (b) in 43-11
   deliberately, so `Partenaire` will render an em dash for every account whose `companyName` was
   never set. Correct by decision, but worth revisiting before these PDFs go to clients.

## Phase status

Gap 3's final bullet is closed. **Phase 44's backfill is no longer blocked by this phase's open
defects.**
