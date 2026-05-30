# Phase 25: Teal Rebrand & Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-30
**Phase:** 25-teal-rebrand-polish
**Areas discussed:** Green→teal boundary, Pale-green tints, Dark-mode teal, Status-pill fix scope, Phase rescope

---

## Green→teal boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Clean sweep | Every --gd green accent → teal; only logo + "Actif" success green stay | ✓ |
| Sweep, keep metric values green | Recolor most, but MetricTile month values stay green | |
| Let me specify exceptions | Owner names specific green elements to keep | |

**User's choice:** Clean sweep
**Notes:** Resolved before the rescope. Superseded by the decision to drop the rebrand entirely (see Phase rescope below) — recorded for the audit trail of how the boundary would have worked.

---

## Pale-green tints

| Option | Description | Selected |
|--------|-------------|----------|
| Tints follow the accent | Active-nav pill / icon squares / hover washes → teal tints; "Actif" green tint stays | ✓ |
| Foreground only | Recolor saturated foreground only; leave pale-green tints | |
| Let me see them first | Review each pale-green usage individually | |

**User's choice:** Tints follow the accent
**Notes:** Also superseded by the rescope.

---

## Dark-mode teal

| Option | Description | Selected |
|--------|-------------|----------|
| Lighten for dark, gated on AA | Brighter dark-mode teal variant, value chosen to pass WCAG AA | — |
| Keep identical #2d7a8c | Same value both modes (current behavior) | — |
| You decide during contrast audit | Defer; keep identical unless audit fails AA | — |

**User's choice:** *(none — interrupted)*
**Notes:** While this question was being asked, the owner interrupted: *"scratch that plan entirely. Let's keep the green. Too much work and not enough value."* This triggered the Phase rescope below.

---

## Phase rescope (owner-initiated)

| Option | Description | Selected |
|--------|-------------|----------|
| COPY + pill fix only; shelve teal | Phase = COPY-01..04 + UIFIX-01; teal noted as deferred/backlog | ✓ |
| COPY + pill fix only; kill teal entirely | Same slim phase, but drop teal permanently | |
| Also reconsider pill fix / labels | Trim the remaining COPY/UIFIX work too | |

**User's choice:** COPY + pill fix only; shelve teal
**Notes:** BRAND-01/02/03 removed from phase deliverables. Green affirmed as the brand accent. Teal idea shelved (revisitable), not killed. → CONTEXT D-01.

---

## Status-pill fix scope

| Option | Description | Selected |
|--------|-------------|----------|
| All chip variants | Fix hug-content for every chip (shared .chip base) | ✓ |
| Proposal status pill only | Touch only the literal UIFIX-01 target | |

**User's choice:** All chip variants
**Notes:** Near-zero extra cost since all chips share the `.chip` base. → CONTEXT D-03.

## Claude's Discretion

- Mechanism of the chip sizing fix (container fix vs. utility class) left to planning; D-03 fixes scope + behavior only.

## Deferred Ideas

- **Teal accent rebrand (`#2d7a8c`)** — shelved, not killed. The hard part if revisited: split the overloaded `--gd` token into distinct accent (→ teal) vs. success (→ stays `#129657`) tokens before recoloring ~63 sites + hardcoded tints, then re-run a light+dark WCAG AA audit. Maps to roadmap BRAND-01/02/03.
