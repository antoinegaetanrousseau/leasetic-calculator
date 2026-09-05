# Phase 14: Admin Polish — Partners + History + Home - Discussion Log

> **Audit trail only.** Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-12
**Phase:** 14-admin-polish-partners-history-home
**Areas discussed:** Directory & route migration, History surface architecture, CreatePartnerModal disposition, Partner home redesign, Recent list shape, MetricTile click-through, History sidebar ↔ standalone interaction, MetricTile date scope, /proposals shape, Diff display UX, Dashboard ↔ /proposals reconciliation

---

## Directory & route migration (accounts/ → partners/)

| Option | Description | Selected |
|---|---|---|
| Rename accounts/ → partners/ | Rename directory; 308 redirect; revert Shell.tsx temp patch | ✓ |
| Add partners/ alongside accounts/ | Both routes work; alias | |
| Only add partners/new/ | Asymmetric — keep accounts/ for list | |

**Notes:** Cleanest end-state. Bookmarks preserved via 308. Today's temp Shell.tsx patch reverts in Phase 14 plans.

---

## Coefficient history surface

| Option | Description | Selected |
|---|---|---|
| Sidebar inside /coefficients | Matches success criterion #5 verbatim | |
| Standalone /history route | Dedicated page | |
| Both — sidebar + standalone page | Sidebar (5 recent) + paginated full page | ✓ |

**Notes:** Phase 14 scope inflation acknowledged — adds an extra surface beyond ROUTE-02 minimum. Worth the audit-trail discoverability.

---

## CreatePartnerModal disposition

| Option | Description | Selected |
|---|---|---|
| Delete entirely | Strict ROUTE-02 #2 compliance | |
| Keep as emergency fallback | Code stays, unmounted | ✓ (initial — clarified in follow-up) |
| Fold modal logic into shared form | Shared `<CreatePartnerForm>` between modal + route | |

**Notes:** Modal code stays in repo for future UX improvements. CTA in partner list now points to /partners/new (satisfies ROUTE-02 #2 via behavior).

---

## Partner home redesign

| Option | Description | Selected |
|---|---|---|
| Additive: tiles + existing list | Lowest disruption | |
| Dashboard restructure | Full redesign per Figma node 9:46 | ✓ (initial — reconciled to deferral) |
| Hero + tiles only, list stays | Middle option | |

**Notes:** Initially picked dashboard restructure; reconciled with /proposals deferral to "Defer dashboard too".

---

## 'Créer un partenaire' CTA route

| Option | Description | Selected |
|---|---|---|
| Keep modal trigger | Modal stays active | |
| CTA → /partners/new (per ROUTE-02 verbatim) | Modal code shelved | ✓ |
| User-toggle preference | Settings flag for path choice | |

**Notes:** Clarifies the modal-disposition: code stays, CTA changes. ROUTE-02 #2 satisfied behaviorally.

---

## Recent proposals preview (dashboard)

| Option | Description | Selected |
|---|---|---|
| 5 rows + 'Voir toutes →' to /proposals | Lowest implementation risk | ✓ (then deferred) |
| 10 rows + 'Voir toutes' | Higher density | |
| 5 rows + no separate /proposals route | Inline expand | |

**Notes:** Locked but then the entire dashboard restructure was deferred to v1.3 — see reconciliation below.

---

## MetricTile click-through behavior

| Option | Description | Selected |
|---|---|---|
| Clickable, filtered routes | Quick-filter shortcuts | |
| Display-only | Pure metrics | ✓ (then deferred) |
| Clickable, all → same /proposals | Unfiltered | |

**Notes:** Locked decision carries forward to v1.3 when MetricTiles ship. Display-only chosen for cleaner mental model.

---

## History sidebar ↔ standalone /history interaction

| Option | Description | Selected |
|---|---|---|
| Sidebar shows 5, 'Voir tout → /history' | Discoverable | ✓ |
| Sidebar shows 5, no link to /history | Cleaner separation | |
| Sidebar shows 5 with 'expand' → modal | Avoids /history route | |

**Notes:** Sidebar discovers the standalone page; AdminNavCard "Historique" also routes there.

---

## MetricTile "Ce mois-ci" date scope

| Option | Description | Selected |
|---|---|---|
| Calendar month (Europe/Paris) | Aligns with admin reporting | ✓ (then deferred) |
| Rolling 30 days | Smoother visual | |
| Last 7 days | Recent-week activity | |

**Notes:** Locked for v1.3 carry-forward.

---

## /proposals route shape

| Option | Description | Selected |
|---|---|---|
| Copy current home verbatim | Move existing list to /proposals | |
| Cleaner list with StatusChip rendering | Move + upgrade visual | |
| New design (separate UI work) | Defer redesign | ✓ |

**Notes:** "Defer redesign" carries forward; standalone route also deferred entirely after reconciliation.

---

## Diff display on /history

| Option | Description | Selected |
|---|---|---|
| Side-by-side panel on row click | Avant / Après two columns | ✓ |
| Inline expansion | Collapsible rows | |
| Summary-only | Lightest implementation | |

**Notes:** Side-by-side panel with `--gold` highlighting for changed fields; summary line in italic at bottom.

---

## Dashboard ↔ /proposals reconciliation

| Option | Description | Selected |
|---|---|---|
| Move list to /proposals (verbatim copy) | Dashboard + thin /proposals | |
| Dashboard at new /dashboard route | Two routes coexist | |
| Defer dashboard too | Skip partner-home work in Phase 14 | ✓ |

**Notes:** Cleanest resolution. Phase 14 stays admin-focused; partner-home work consolidated to v1.3.

---

## Claude's Discretion

Captured in the `Claude's Discretion` subsection of CONTEXT.md `<decisions>`.

## Deferred Ideas

Captured in the `<deferred>` section of CONTEXT.md.
