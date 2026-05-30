# Phase 24: Admin Dual-View Toggle - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-30
**Phase:** 24-admin-dual-view-toggle
**Areas discussed:** Switch landing behavior

---

## Area selection

Four gray areas were offered (multiSelect): Switch landing behavior, Toggle affordance & collapsed state, Session-state granularity, Agent-view visual cue.

**User selected:** Switch landing behavior (only).
The other three were delegated to Claude's discretion (see below).

---

## Switch landing behavior

### Q1 — Where does the admin land on a view switch?

| Option | Description | Selected |
|--------|-------------|----------|
| Always go to new view's home | Agent → `/`, Admin → `/[adminSegment]`. Predictable; never strands on an orphaned route. | ✓ |
| Stay put; redirect only if orphaned | Swap nav in place on shared routes; redirect only when current route is absent in target view. | |
| Stay put always; nav swaps only | Never redirect; can leave admin on Coefficients with the agent nav (looks broken). | |

**User's choice:** Always go to new view's home → **D-01**.

### Q2 — Admin in Agent view directly opens an admin URL (page must still load per VIEW-04). What does the nav do?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-switch back to Admin | Landing on an admin route reconciles the view to Admin so nav matches the page. | ✓ |
| Stay in Agent view | Honor the toggle state; agent nav shown over an admin page (can look inconsistent). | |

**User's choice:** Auto-switch back to Admin → **D-02**.

**Notes:** Together D-01 + D-02 mean the effective view is `agent` only on a non-admin route with the flag set; physically being on any `(admin)` route forces `admin`. Surfaced the architectural consequence (separate route-group layouts → sidebar remount on redirect) which drove the sessionStorage decision (C-01).

---

## Claude's Discretion

User chose "I'm ready for context" and delegated the three unpicked areas:

- **Toggle affordance & collapsed state (D-03):** segmented `Admin | Agent` control matching `ThemeToggle`/`LocaleToggle`; collapsed-sidebar degradation follows the existing footer pattern. UI-design refinement deferred to `/gsd-ui-phase 24`.
- **Session-state granularity (D-04):** `sessionStorage['leasetic.view']` (no cookie/DB), cleared on logout, defaults to Admin. Made mandatory (not just preferred) by C-01.
- **Agent-view visual cue (D-05):** none beyond the toggle's own selected state.

## Deferred Ideas

None — discussion stayed within phase scope.
