# Phase 18: Admin Surfaces - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-24
**Phase:** 18-admin-surfaces
**Areas discussed:** Figma design import + Admin Home stats + Recent activity card + Partners table design + Partners rename scope + Coefficients warning banner + Coefficients history layout + Créer partenaire form refresh + Admin sidebar nav + Aide / Help Center scope + Aide content layer + Aide categories + Aide starter article + Stat tile color rule + Partners table empty states + Partners table pagination

---

## Figma design import

Approach: Fetched Figma frames `41:46` (Admin Home), `42:46` (Liste partenaires), `43:46` (Créer partenaire), `45:46` (Coefficients), `93:177` (Aide landing), `93:2773` (Aide article) via `mcp__0c362372-5270-457f-b11b-4797e40bf045__get_screenshot` and inspected each visually. Used the metadata dump to identify frame IDs and their parents. No painted dark-mode duplicates exist for admin surfaces (unlike `82:*` for partner side).

**Discoveries logged:**
- Figma typo `Acceuil` in Admin Home topbar — ignored, ship with `Accueil`.
- Figma spelling `Coéfficients` (acute accent) in Coefficients topbar — ignored, ship with `Coefficients`.
- Generic-template content in Aide frames (Dashly X, lorem ipsum, generic categories).

---

## Admin Home — stat tiles (D-01..D-04)

### Partenaires actifs counting rule
| Option | Description | Selected |
|--------|-------------|----------|
| status='active' only | Excludes invited + inactive. Matches literal label. | ✓ |
| active + invited | Counts everything except deactivated. | |
| active + at least 1 proposal | Stricter — only volume-generating partners. | |

### Propositions ce mois counting rule
| Option | Description | Selected |
|--------|-------------|----------|
| All non-deleted, all statuses, Europe/Paris current month | Reuses Phase 17 helper cross-partner. Includes drafts. | ✓ |
| Finalized only (status='active'), Europe/Paris current month | Excludes drafts. | |
| Any non-draft (active + expired + deleted), Europe/Paris current month | Most permissive. | |

### Recent activity data source
| Option | Description | Selected |
|--------|-------------|----------|
| Union 3 sources at query time | Merge coefficient_history + partner-status-changes + invitations. No new table. | ✓ |
| Coefficients-only (defer partner events) | MVP — only coefficient_history. | |
| Add a unified `admin_activity` audit table now | Net-new table + triggers. Scope creep. | |

### Stat tile value color (asked later in flow)
| Option | Description | Selected |
|--------|-------------|----------|
| Count-style stats teal; time-style stats gold | Figma rule. Distinct cue per stat type. | |
| Always teal (gold reserved for warnings only) | Strict palette discipline. Deviates from Figma. | ✓ |
| Stats author chooses per-instance (color prop) | Most flexible, least consistent. | |

---

## Recent activity card behavior (D-05..D-07)

### Row count + Voir tout link
| Option | Description | Selected |
|--------|-------------|----------|
| Top 5 rows + `Voir tout →` link to /history | Mirrors Partner Home Propositions récentes. | ✓ |
| Top 10 rows, no link (self-contained card) | More content visible, no overflow. | |
| Top 5 + `Voir tout` opens a new aggregated /history view | Broadens /history scope. Bigger work. | |

### Row link behavior
| Option | Description | Selected |
|--------|-------------|----------|
| No — read-only timeline | Simplest. Matches Figma which shows no hover affordance. | ✓ |
| Yes — each row links to the relevant detail page | Adds plumbing per source type. | |

---

## Partners table (D-08..D-14)

### Dernière activité column source
| Option | Description | Selected |
|--------|-------------|----------|
| Most recent proposal creation per partner | Reuses proposals.created_at. Fallback —. | ✓ |
| Last auth session timestamp | Better Auth sessions or new field. Passive logins counted. | |
| Greater of: last proposal OR last login | Most accurate, two data sources. | |

### Filter pill row tabs
| Option | Description | Selected |
|--------|-------------|----------|
| 3 tabs (Tous / Actifs / Désactivés) per Figma | Fewer pills, cleaner. | |
| 4 tabs (Tous / Actifs / Invités / Désactivés) | Adds Invités tab for tracking pending invites. Deviates from Figma. | ✓ |

### Overflow menu (⋯) actions per row
| Option | Description | Selected |
|--------|-------------|----------|
| Renvoyer l'invitation (Invité only) | Re-send invitation email. | ✓ |
| Désactiver le compte (Actif only) | Toggle active → inactive. | ✓ |
| Réactiver le compte (Désactivé only) | Toggle inactive → active. | ✓ |
| Voir les propositions du partenaire | Link to /proposals?user_id={id}. New scope (admin user_id query). | ✓ |

### Rename scope (AccountsList → PartnersList)
| Option | Description | Selected |
|--------|-------------|----------|
| Full rename: file + symbol + test + all imports + leftover `Accounts` copy | grep returns 0 hits. | ✓ |
| File + symbol rename only, leave leftover strings | Less disruption. | |

---

## Coefficients (D-19..D-22)

### Warning banner dismiss behavior
| Option | Description | Selected |
|--------|-------------|----------|
| Persistent (no dismiss button) | Always shows. Matches Figma literal. | |
| Dismissable per-session (sessionStorage) | User dismisses once per session, sees it again on next visit. | ✓ |
| Dismissable per-user-forever (localStorage) | Risk: user forgets the warning. | |

### Warning banner token
| Option | Description | Selected |
|--------|-------------|----------|
| Existing `--gold` token | Palette stability honored. Per ADMIN-14 spec wording. | ✓ |
| New `--warning-orange` token | True orange shade. Violates palette stability. | |

### CoefficientHistorySidebar treatment
| Option | Description | Selected |
|--------|-------------|----------|
| Refresh in place — keep component, restyle | Preserves pagination + diff. Minimal risk. | ✓ |
| Replace with smaller CoefficientHistoryCard | Matches Figma literally. Loses inline diff. | |
| Both — show new card AND keep existing sidebar | Confusing UI. | |

### Diff affordance on history rows
| Option | Description | Selected |
|--------|-------------|----------|
| Yes — rows clickable, opens diff in panel/modal | Preserves Phase 14 affordance. | |
| No — rows read-only; diff only on /history full page | Card stays simple per Figma. | ✓ |

---

## Créer partenaire (D-15..D-18)

### Action row placement
| Option | Description | Selected |
|--------|-------------|----------|
| Outside the card (per Figma literal) — separate Annuler card + Envoyer button | Matches Phase 17 wizard pattern. | ✓ |
| Inside the card at the bottom (current behavior) | Keeps form + action as one unit. | |
| Outside as a sticky footer | Form is short, stickiness wouldn't trigger. | |

### Error state display
| Option | Description | Selected |
|--------|-------------|----------|
| Inline below input (red text, no icon) — current pattern | RHF default. Zero new work. | |
| Inline below input + red border on field | Stronger signal. Small CSS addition. | ✓ |
| Toast notification on submit failure | Used for server errors as fallback. | |

### Success affordance
| Option | Description | Selected |
|--------|-------------|----------|
| InviteUrlModal opens (current, ADMIN-13 locked) | Already implemented. | ✓ |
| InviteUrlModal + green success toast | Redundant feedback. | |

### Cancel button destination
| Option | Description | Selected |
|--------|-------------|----------|
| Back to /partners (with confirm if dirty) | Standard. Prevents accidental data loss. | ✓ |
| Back to /partners (no confirm) | Simpler. Invite is reversible. | |

---

## Admin sidebar (D-27)

### Sidebar items in Phase 18
| Option | Description | Selected |
|--------|-------------|----------|
| Figma literal: Accueil / Nouvelle proposition / Propositions / Partenaires / Coefficients / Aide | Matches design. Implies admin gains partner-style flows + Aide. | ✓ |
| Pragmatic: Accueil / Partenaires / Coefficients / Historique | Keeps Phase 14 sidebar untouched. | |
| Mid-path with disabled Aide placeholder | Visual parity minus cross-flow items. | |
| Mid-path: Accueil / Nouvelle proposition / Propositions / Partenaires / Coefficients (drop Historique + Aide) | Admins get partner-style flows but Aide deferred. | |

### Aide link target (asked before scope expansion)
| Option | Description | Selected |
|--------|-------------|----------|
| Skip Aide link in Phase 18 | Cleanest. | |
| mailto: link only | Zero new code. | |
| Stub /aide page | Real route, minimal content. | |
| **User free-text:** Links to a separate page + subsequent subpages (Figma node 93-177) | User wants real Help Center built. | ✓ |

---

## Help Center / Aide (D-23..D-28, HELP-01)

### Aide scope in Phase 18
| Option | Description | Selected |
|--------|-------------|----------|
| Defer Aide entirely to new HELP-01 phase | Cleanest scope discipline. | |
| Phase 18 ships /aide landing only, articles deferred | Curate categories now, articles in HELP-01. | |
| Phase 18 ships full Aide flow (landing + category pages + 1 article) | Significant scope expansion. | ✓ |
| Sidebar Aide → mailto: only | Zero route. | |

### Sidebar Aide visibility if deferred (moot — full flow chosen)
| Option | Description | Selected |
|--------|-------------|----------|
| Show Aide in sidebar with placeholder | Visual parity. Risk: broken affordance. | |
| Hide Aide until its phase ships | Cleanest UX. | |
| **User free-text:** Include this build in Phase 18 | Reaffirms full flow. | ✓ |

### Aide content layer
| Option | Description | Selected |
|--------|-------------|----------|
| Markdown files in /content/aide/{lang}/{category}/{slug}.md | Filesystem-backed. Git PR edits. | |
| Hardcoded TSX components per article | Type-safe. Per-edit dev time. | ✓ |
| Headless CMS (Sanity / Contentful / Strapi) | Editor-friendly. New dependency. | |
| Defer content layer — ship landing + 1 mocked article | Visual shell only. Storage decided later. | |

### Aide categories in Phase 18
| Option | Description | Selected |
|--------|-------------|----------|
| I'll provide curated list now (4–6 categories) | User curates explicitly. | |
| Ship Figma 6 categories as-is | Less ideal — generic placeholder content. | |
| Minimal 3-card placeholder: Commencer ici / Créer une proposition / Contact | Pragmatic minimum. | ✓ |

### Starter article
| Option | Description | Selected |
|--------|-------------|----------|
| Commencer ici — quick-start guide through wizard | Most user-facing. ~500–1000 words FR + EN. Includes screenshots. | ✓ |
| Contact / Assistance — email + working hours only | Lowest content load. | |
| Skip starter article — all cards link to `Bientôt disponible` | Zero articles in Phase 18. | |
| I'll write the starter article myself before plan/execute | User-owned content drop. | |

---

## Stat tile + empty states + pagination (D-13, D-12)

### Stat tile color rule
See "Admin Home — stat tiles" above. Decision: always teal.

### Partners table empty states
| Option | Description | Selected |
|--------|-------------|----------|
| Zero partners: `Aucun partenaire pour le moment.` + inline `Inviter un partenaire` CTA; filter-empty: `Aucun partenaire ne correspond aux filtres.` + clear-filters link | Friendly first-run + informative filter-empty. | ✓ |
| Zero partners: centered illustration + CTA | New asset needed. More designed. | |
| Minimal `Aucun résultat.` for both | Cheapest. | |

### Partners table pagination
| Option | Description | Selected |
|--------|-------------|----------|
| Cursor pagination like /proposals | Reuses Phase 17 primitive. Scales. | ✓ |
| Render all rows (v1.3 is <50 partners) | Simplest. Risk: breaks at scale. | |
| Cap at 50 with `Voir tous → ?all=1` escape hatch | Defers true pagination. | |

---

## Claude's Discretion

- i18n key naming convention for net-new admin + Aide keys
- Stat tile component reuse decision (MetricTile vs new AdminStatTile)
- Recent activity row component shape + avatar source
- Aide article internal structure (heading hierarchy, image embed format, CTA placement)

## Deferred Ideas

- Unified `/history` audit feed (cross-source). Currently coefficient-only; partial accepted.
- `admin_activity` audit table — rejected for Phase 18 (D-05 chose query-time union).
- Aide articles beyond `Commencer ici` (HELP-02).
- Aide content storage strategy revisit when article count grows (>5–10).
- Partners table `last_session_at` enrichment (deferred — D-08 uses last-proposal-created).
- `/proposals` admin scoping deeper UX (filter chip showing "Filtre admin: …", clear-filter affordance, etc.).
- Help Center search box on Aide landing.
- Dark-mode painted Figma frames for admin surfaces (currently derived via tokens).
