# Phase 27: Status-Pill Rendering Fix - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-30
**Phase:** 27-status-pill-rendering-fix
**Areas discussed:** Fix scope, Home chip placement

---

## Fix scope

| Option | Description | Selected |
|--------|-------------|----------|
| Two named surfaces only | Fix home "Propositions récentes" pill (UIFIX-02) + re-verify /proposals (UIFIX-03); stay strictly within phase requirements; smallest blast radius. | ✓ |
| Sweep all chip-in-grid lists | Also audit + fix the same fixed-track bug on admin LC-references + partners lists so it can't resurface; larger scope, touches admin surfaces. | |

**User's choice:** Two named surfaces only
**Notes:** Admin chip-in-grid audit captured as a Deferred Idea (D-01). Matches the literal UIFIX-02/03 requirement scope.

---

## Home chip placement

| Option | Description | Selected |
|--------|-------------|----------|
| Keep position, fix sizing only | Chip stays left-most on the home row; only fix it to hug content. True to a pure "rendering fix". | |
| Align home with /proposals | Move the home chip to the trailing position so both surfaces read identically. More consistent, but reorders the home row layout. | ✓ |

**User's choice:** Align home with /proposals
**Notes:** Owner wants the home pill to read the same as /proposals (trailing chip + content-hugging), not merely un-clipped in place. Recorded as D-02; home row column order becomes clientCo → lcRef → amount → chip.

---

## Claude's Discretion

- Exact CSS mechanism for the hug-content fix (content-track vs. `justify-self`/`width: fit-content` vs. shared utility) — left to the planner, carried from Phase 25 D-03.

## Deferred Ideas

- Audit + fix chip-in-grid sizing on admin surfaces (LC-references list, partners list) — same inline fixed-track pattern may exist; out of scope this phase per D-01.
