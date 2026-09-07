# Phase 34 — acceptance walkthrough

**Sign in as `delphine.specht@leasetic.com`** for everything except step 12,
which is walked as `quentin.fischer@leasetic.com`, and steps 23–24, which need
an admin.

Two SIRENs are reserved and held by no fixture. Using the wrong one makes the
step unpassable, because `companies.siren` is UNIQUE:

| Reserved for | SIREN | Resolves to |
|---|---|---|
| **step 1** — create a client | `632012100` | L'ORÉAL |
| **step 11** — correct F-B's SIREN | `542051180` | TOTALENERGIES SE |

## The fixtures

| Label | What it is | Link |
|---|---|---|
| **F-A** | real SIREN, never synced | [Registre À Synchroniser](http://localhost:3000/clients/d0798cf0-96cc-4fe1-b810-4c26e14d1714) |
| **F-B** | already synced, full identity | [Registre Déjà Synchronisé](http://localhost:3000/clients/3a940514-9ed3-4e8c-9111-4052dbe60bf2) |
| **F-C** | fake SIREN, will not resolve | [Registre Introuvable](http://localhost:3000/clients/53ee2cee-62d2-4f50-97ff-3373c2e35e41) |
| **F-D** | ceased company | [Société Cessée Exemple](http://localhost:3000/clients/1103b76a-ee9c-4133-befa-d9af0a0bb219) |
| **F-E** | no SIREN at all | [Pépinières Vaugelas](http://localhost:3000/clients/7532d7bd-a143-4aa3-9ebc-0a3c0905ae76) |
| **F-F** | relation fields filled | [Relation Renseignée](http://localhost:3000/clients/4efd7ebb-370b-41c7-9984-829c4d671644) |
| **F-F′** | the SAME company, owned by the other partner | [as Quentin](http://localhost:3000/clients/4c47fdc8-c2f7-407d-ad7f-7ed5cef38c8e) |
| **F-G** | next action overdue | [Relance En Retard](http://localhost:3000/clients/3f5b9d4f-5b4b-43dd-bcb8-3b4f227ccb38) |
| **F-H** | next action in the future | [Relance À Venir](http://localhost:3000/clients/b01cb71b-035f-44b1-9242-0bd11832bc0e) |
| **F-I** | no next action, stale | [Relance Dormante](http://localhost:3000/clients/3a5752be-a37d-4bd8-9dce-0230d9d1cb92) |
| **F-J** | four timeline events | [Historique Complet](http://localhost:3000/clients/cc2d7ad6-96c7-4adb-aacf-f1fa8f1645c2) |

## The steps

Full text in `34-13-PLAN.md`. Report each as pass or fail beside its label.

**A — registry identity**

1. **Create a client** from `/clients` with `632012100`. Identity fills from the
   registry with no further input and no refresh click. *This is the only
   evidence that creation fills identity — phase 33 had no equivalent step.*
2. **Create a client** with `823456799`, which cannot resolve. The client is
   **created**, marked not-yet-synced. A bounded error, or no client, is a FAIL.
3. **F-A** → Actualiser. Identity fills, status becomes synced, date appears.
4. **F-A** → Activité. A `registry_synced` event sits at the top.
5. **F-B** — every identity field renders, with its sync date.
6. **F-B** — **the read-only proof.** No input, select, textarea or edit control
   for ANY registry field. The header "Modifier" offers exactly four: display
   name, website, phone, SIREN. Anything else editable is a FAIL.
7. **F-C** → Actualiser. A not-found message, no identity filled. Click again:
   same result, no crash, no partial fill.
8. **F-D** — the ceased state is legible at a glance, and not rendered as an
   accent or destructive fill.
9. **F-E** — not-synced state, and **no Actualiser control at all**.

**B — the sharing rule**

10. **F-B** — change display name, add a website and a phone. Saves.
11. **F-B** — correct the SIREN to `542051180`. Identity re-syncs, a second
    `registry_synced` event appears. *Do not use another fixture's SIREN.*
12. **F-F′ as Quentin** — the relation fields Delphine filled are **not
    visible**. This is the phase's central claim. If it fails, do not approve.

**C — the timeline**

13. **F-J** — ONE chronological list mixing notes and system events. Not two
    lists, not two tabs. The null-actor event reads as a system event.
14. **F-J** — the type filter narrows the same list; it does not reveal a
    second one.
15. **F-F** — change the stage from the header. A `stage_changed` event appears
    with no further action.
16. **F-F** — create and finalize a proposal. A `proposal_finalized` event
    appears on this relationship's timeline.
17. **F-F** — add a note with today's date. It appears at the top immediately.

**D — follow-up**

18. **Home page** — the "à relancer" card contains F-G and F-I. **F-H must be
    absent.**
19. **F-G** — set a new next-action date in the future. It leaves the card.

**E — the page shell and access**

20. No ranking, leaderboard, team total or any number about another partner
    anywhere.
21. **F-B** — all four tabs render. Reload on Activité: you stay on Activité.
22. **F-B** — Contacts and Propositions behave exactly as before this phase.
23. Open a relationship id belonging to the other partner: a **404**, not a 403,
    not an empty page. Then `?tab=activity` on that same id: the identical 404.
24. As an admin in agent view, open any `/clients/[id]`: the same 404.


---

## Status, 2026-09-04

Most of these steps were written before the phase had any real-database
evidence. It now has three mutation-verified integration suites and a live
production session, so this table records what is genuinely CLOSED and what
still needs a pair of eyes. **A step is only closed here if something would
FAIL when the behaviour breaks** — a passing test that survives its own
mutation is not evidence.

### Closed by evidence

| Step | Closed by |
|---|---|
| 2 | **Live, production.** "ZZ TEST registre introuvable" was created with an unresolvable SIREN and the client WAS created, marked not-synced. Deleted 2026-09-04 after serving as the acceptance case for the delete feature |
| 12 | `client-relationships.isolation.integration.test.ts` — B viewing the SAME company through their own relationship sees none of A's private tier, AND B probing A's id gets null. Both halves mutation-verified: each fails only its own mutation |
| 13, 14 (filter) | `listRelationshipEvents` returns ONE ordered list; `ActivityTimeline.test.tsx` covers the type filter narrowing that list |
| 15, 16, 17 | event writes covered by `relationship-events.insert.integration.test.ts` against real Postgres, incl. the `INSERT … SELECT` projection that shipped broken |
| 18 | `FICHE-04` integration test — A's overdue relationship is in A's list with bucket 0, absent from B's, and B's payload never contains A's note text |
| 20 | no ranking surface exists: repo-wide source assertion, no cross-partner query in the phase |
| 22 | Contacts verified LIVE in production after the `createContactAction` fix; Propositions untouched by this phase |
| 23, 24 | by composition — real Postgres proves a non-owner lookup returns `null`; `page.test.tsx` Tests 1, 2 and 2b prove `null` yields a plain 404 with no tab query, `?tab=` variant included. The page tests mock the query; that mock's premise is independently proven |

### Still needs a human — the short list

Run on **localhost against the development branch**, where the fixtures below
exist. Six steps, not twenty-four.

| Step | What to check | Why a test cannot |
|---|---|---|
| **1** | Create a client with `632012100`. Identity fills with no refresh click | end-to-end create → registry → render; every layer is tested, their composition is not |
| **3, 7** | F-A → Actualiser fills identity. F-C → Actualiser says not-found twice, no partial fill | a real network round-trip to the live SIRENE API |
| **8** | F-D's ceased state is legible, and not rendered as an accent or destructive fill | a visual judgement |
| **11** | Correct F-B's SIREN to `542051180` — identity re-syncs, a second `registry_synced` event appears | same, plus the re-sync path |
| **14** | Finalize a proposal on F-F and confirm the **PDF still generates** | the one genuine end-to-end regression risk this phase could have introduced |
| **21** | All four tabs render; reload on Activité stays on Activité | browser history behaviour |

Steps 4, 5, 6, 9, 10, 19 are covered by component and action tests and are
worth a glance while you are in there, but nothing rests on them alone.

### Not covered anywhere, and accepted

Deletion is irreversible — no archive tier. Operator decision, 2026-09-04;
archiving deferred to its own phase.


---

## RESULT — 2026-09-04: all 24 steps closed

Antoine walked the six human steps himself; the other eighteen were closed by
evidence (see the table above). **Five passed as written. Step 8 failed, and
finding that was the entire value of walking it.**

### Step 8 — the failure, and what it actually was

A genuinely ceased company (SIREN `923804504`, BOULANGERIE DE L'EUROPE) was
created and synced to `registry_status = 'error'` with `registry_state`,
`legal_name` and `city` all NULL. The client existed, so from the UI it looked
like it had worked — but the ceased state the step exists to check had never
rendered, because no identity was written at all.

Cause: Zod's `.optional()` accepts `undefined` and **rejects `null`**. The
SIRENE API omits nothing — it sends an explicit `null`. Since `results` is an
array of objects, one null in one field failed the whole payload, and
`syncCompanyRegistry` maps a parse failure to `'error'`.

**The trigger was not being ceased.** `923804504` carries the unclassified NAF
`00.00Z`, so `section_activite_principale` is null. Any company with an
unclassified activity was affected, ceased or active. Nothing caught it because
the only fixture was hand-written from the design doc and happened to populate
every field.

Fixed in `e2d0a15` — twelve fields to `.nullish()`, `orNull` hardened against a
null it can now receive, the real payload captured as a fixture, and
mutation-verified.

### Step 8 — re-walked on production, same evening

```
registry_status = 'synced'
registry_state  = 'C'                            ← ceased, and legible
address_line    = '395 RTE DEPARTEMENTALE 96'    ← locality stripped, not duplicated
naf_section     = null                           ← the null that broke the parser
```

That single re-check independently confirms three of the day's fixes: the null
tolerance, the address de-duplication, and the registry-sync event write (a
fourth `registry_synced` row was appended).

### Verdict

**Phase 34 acceptance: PASSED.** FICHE-01..05 and ACTV-01..05 ticked in
`.planning/REQUIREMENTS.md`.

The lesson worth carrying: the six steps left for a human were the ones no test
in this repo could stand in for, and one of them found a production defect that
2249 green tests did not. The hand-written fixture was the blind spot — it
documented the design's field list rather than the API's real behaviour.
