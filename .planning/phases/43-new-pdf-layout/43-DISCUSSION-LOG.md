# Phase 43: New PDF Layout - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-08
**Phase:** 43-New PDF Layout
**Areas discussed:** Gray-area selection, Fonction, Rendered reference, Interests block

---

## Gray-area selection

Four areas were offered: logo & footer icon mark, on-demand proposals, content with no home
in the design, and the "whose Fonction" contradiction.

| Option | Description | Selected |
|--------|-------------|----------|
| Logo & footer icon mark | SVG primitives vs committed PNG; the `rotate(-90 cx cy)` risk | |
| On-demand proposals | The design has no "sur demande" state | |
| Content with no home | Interests block, tagline, `PROJET` label | |
| Whose "Fonction" | DOC-03 as amended vs `leasetic_advisor.fonction` free text | |
| *Other (free text)* | — | ✓ |

**User's choice:** free text — *"Just take the design from the layout."*

**Notes:** Read as a governing instruction rather than a refusal to engage: the design files
are the tiebreaker, and Claude should resolve what it can without further questions. Captured
as **D-01**. Three of the four areas were then locked as defaults derived from that rule
(logo → D-07, on-demand → D-09, dropped chrome → D-06), each stated back to the operator
rather than applied silently. The fourth could not be derived from the design because the
design and a locked Phase 42 decision disagree, so it went back as a question.

---

## Fonction

The design puts `Fonction` under the advisor and `leasetic_advisor.fonction` is admin-typed
free text; Phase 42 D-16 shipped `pdf.partnerType.*` FR/EN pairs for the *partner's* type and
D-24 amended DOC-03 to require rendering them. The design's partner block has no Fonction row.

| Option | Description | Selected |
|--------|-------------|----------|
| Partner block gains a Fonction row | Advisor keeps free-text Fonction; partner block gains a row rendering the translated `partnerType`. Honours D-16/D-24, costs a second deliberate deviation on top of D-10 | |
| Follow the design exactly | Only the advisor gets a Fonction row, as typed. The `pdf.partnerType.*` pairs lose their only intended consumer; DOC-03's amendment and D-16 need retracting | ✓ |
| Advisor Fonction renders the translated pair | Take DOC-03's wording literally — makes `leasetic_advisor.fonction` an enum, contradicting the required free-text field and admin form Phase 42 just built | |

**User's choice:** Follow the design exactly.

**Notes:** Consistent with D-01. Captured as **D-02**, with **D-03** recording the upstream
amendment this forces (retract DOC-03's final clause and the matching ROADMAP planning note,
and decide the fate of the now-orphaned i18n keys and their passing test). **D-04** records
that D-10's card restructure is *not* affected — the two blocks are still re-ordered, only
the Fonction row's placement follows the design.

---

## Rendered reference

Raised after the operator supplied the full `Quote design system-handoff.zip`. Its `.dc.html`
files, SVGs and 7 of 8 token files were verified byte-identical to what is vendored
(`colors.css` differs only by carrying the stale accented `Leasétic` spelling). The genuinely
new content was the `_ds/` runtime, which makes the design files renderable.

| Option | Description | Selected |
|--------|-------------|----------|
| Vendor FR + EN PNGs | Render both headless, commit ~200KB to `.planning/assets/v1.9-quote-design/reference/` | ✓ |
| Vendor the full runtime too | Also commit `_ds_bundle.js` + `doc-page.js` + `support.js` (~1.7MB) for live re-rendering at any zoom | |
| Vendor nothing | Keep the zip in Downloads; re-extract when a visual is needed | |

**User's choice:** Vendor FR + EN PNGs.

**Notes:** Rendered at 2× via headless Chrome and committed with a README recording provenance
and the regeneration command. Captured as **D-14** — these PNGs, not the HTML, are the visual
acceptance target, because the `.dc.html` files do not show their own output without the
runtime. The operator separately pointed at his own extraction at
`~/Downloads/quote-design-system/project/`; those two files were diffed as well and are
identical to both the vendored copies and the zip's — a three-way match.

---

## Interests block

The current PDF prints `✓ Sale & leaseback` / `✓ Évaluation de parc` when ticked. The design
has no slot for it and DOC-01..08 never mention it. Flagged explicitly as the only thing the
redesign removes that a partner deliberately chose.

| Option | Description | Selected |
|--------|-------------|----------|
| Drop it — follow the design | Block disappears; `inputs.slb` / `inputs.evalParc` stay in the record and wizard, they stop printing | ✓ |
| Append to the project description | Fold ticked interests into the description line — the design's only free-text slot | |
| Keep a row in the conditions table | Add a row to `CONDITIONS FINANCIÈRES` — but that table is financial and interests are not | |

**User's choice:** Drop it — follow the design.

**Notes:** Captured as **D-05**. Consistent with D-01; recorded plainly in CONTEXT.md so the
removal is a decision on the record rather than an omission discovered later.

---

## Claude's Discretion

The operator chose "Write CONTEXT.md" over a further round, explicitly handing these to the
planner with recommendations recorded in CONTEXT.md rather than answers:

- The shape of the type-scale tokens (role names vs numeric keys)
- How the acceptance block is pinned (`margin-top:auto` vs `position:absolute`)
- How the financial table is built, and whether `KeyValueRow` / `SectionLabel` survive
- The em-dash helper's shape (single formatter strongly preferred over per-call-site handling)
- Whether Inter Tight is needed after all (Phase 41 D-04 deferred the call to this phase)
- One plan or several, and the seams between them
- Disposition of the i18n keys orphaned by D-02 and D-06 (delete vs annotate)

Not surfaced as questions because the design or an existing decision already answers them:
the new palette values and geometry (transcribed into D-11), null-advisor handling (D-13,
following Phase 42 D-09 and DOC-11), and the determinism contract (D-16 — `contentHash`, not
raw `sha256`).

---

## Deferred Ideas

- Re-rendering stored PDFs of existing proposals — Phase 44, MIG-01..05
- Multi-page proposals — the design and footer both assume `Page 1/1`
- Brand-aware PDF output for LOOPIX / COLIBRIS / SEENSYS — v1.9 is Leasetic-only
- Retiring `sanitize-number.ts` — carried from Phase 41's deferred list; note, do not act
- Translating `partnerType` on the admin and partner web surfaces — now fully inconsistent
  under D-02, worth a later decision
- Client-side e-signature — the acceptance block is print-and-sign, not a workflow

### Reviewed Todos (not folded)

- `ops-03-ovh-cutover-december-2026.md` — matched 0.6 on generic keywords; unrelated
  infrastructure milestone. Phase 41 declined the same match.
- `wr-07-db-guard-skip-rule.md` — matched 0.6 on generic keywords; a database-guard concern
  belonging with the Phase 39 work. Also declined by Phase 41.

Neither was re-asked, since Phase 41 reviewed and declined both two phases ago.
