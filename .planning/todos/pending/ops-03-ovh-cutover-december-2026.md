---
id: ops-03-ovh-cutover-december-2026
title: Provision an OVH-compatible target and run scripts/smoke-ovh.ts
created: 2026-09-07
source: 40-CONTEXT.md (D-40-15) / 39-CONTEXT.md (D-12, D-13)
severity: info
status: pending
---

# Provision an OVH-compatible target and run scripts/smoke-ovh.ts

Carried forward from Phase 40's OPS-03 amendment. OPS-03 is ticked `[x]` in
`.planning/REQUIREMENTS.md` because the requirement's own text closes on
"*or* the OVH cutover is formally re-dated with a decision", and that dated
decision was taken. This todo exists so the tick does not bury the actual
commitment.

## Why it was deferred, not skipped

D-40-15 rejected burying the December 2026 date in `STATE.md`'s deferred
list, which already carries eight inherited items — one more undated bullet
there would have made it easier to lose. It also rejected filing a v1.9
requirement against a milestone that does not exist yet. A standalone
pending todo, named after the requirement it carries forward, is the
narrowest place for a commitment that is genuinely still open.

**The blocker is the environment, not the command.** `scripts/smoke-ovh.ts`
is 358 lines and exercises a 7-step black-box lifecycle; it stays ready and
deliberately unrun. No OVH-compatible target is currently provisioned for it
to run against.

**Date:** December 2026.

**Antoine's next step, named:** provision an OVH-compatible target — a Node
runtime + Postgres + S3-compatible object storage — so `scripts/smoke-ovh.ts`
has something to run against.

## Why it needs an operator decision

**What was rejected and why (D-12):** rehearsing the harness against the
existing Vercel deployment was considered and rejected. It would prove the
harness itself works but not portability to a non-Vercel target, and it
would create and delete a real proposal in production to do so. Provisioning
a genuinely separate OVH-compatible environment is the only way to test the
actual claim (portability), and that provisioning decision belongs to
Antoine.

## Acceptance

- [ ] An OVH-compatible target is provisioned (Node + Postgres + S3-compatible storage)
- [ ] `scripts/smoke-ovh.ts` runs against it and all 7 lifecycle steps pass
- [ ] The result is recorded, and OPS-03's amendment in `.planning/REQUIREMENTS.md` is updated to cite the run rather than the re-dating decision
