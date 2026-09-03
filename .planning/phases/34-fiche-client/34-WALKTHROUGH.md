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
