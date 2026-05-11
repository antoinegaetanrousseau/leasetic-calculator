# Project Retrospective — Matrice Commerciale

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.1 — Hosted Web App Foundation

**Shipped:** 2026-05-11
**Phases:** 6 | **Plans:** 46 | **Commits:** 236 | **LOC:** 16,139 (`src/` + `app/`)
**Timeline:** 2026-05-05 → 2026-05-11 (6 days end-to-end)

### What Was Built

- **Hosted web app on Vercel** — Next.js 16 + Neon Postgres + Vercel Blob + Better Auth 1.6.9; OVH-portable adapter discipline mechanically enforced from first commit
- **Admin-invited auth + hidden `/[adminSegment]` admin tree** — env-driven URL obscurity + 2-layer `requireAdmin()` gate; admin-mediated invitation + reset flows via one-time `InviteUrlModal`; no SMTP dependency
- **Pure-TS v10 calculation engine** with 30-case CI golden corpus (±0.01 € parity); live preview (300ms debounce) on a 14-input proposal form; full 5-state machine
- **Persistent PDF proposals with `params_snapshot` immutability** — old PDFs render byte-identically forever even after admin coefficient edits; deterministic `@react-pdf/renderer` with CI-gated SHA-256
- **Admin surface** — coefficients editor + append-only history + first-login "Vérifier les coefficients" banner + sole-allowed commission-visibility "Explain calculation" tool; 6-column partners list with proposal counts
- **Cutover + operational layer** — `docs/operations/deploy-ovh.md` runbook + scripted full-lifecycle smoke (`scripts/smoke-ovh.ts`); twice-monthly Vercel Cron purge; email-pattern test-data discriminator (no schema column); CI grep gate blocking v10 localStorage key resurrection

### What Worked

- **Foundation-first phasing.** Phase 5 (Bootstrap & Deploy) explicitly produced the adapter spine + CI gates + healthz round-trip before any feature code. Every later phase consumed these foundations; the no-Vercel-only-imports rule was never violated because the gate caught it before the violation could land.
- **`params_snapshot` jsonb as the immutability mechanism.** Phase 8's choice of Stripe-Option-A (deep-copy snapshot at INSERT time) made PDF immutability an *invariant by data shape* instead of a code-path guarantee. No future phase could accidentally break it. Reading proposal detail page = read snapshot = identical render forever.
- **Phase-9 post-execution review + fix loop.** 12 findings (3 critical + 6 warning + 3 info), 9 auto-fixed via `gsd-code-fixer`, all 42 STRIDE threats verified closed in the same audit pass. The Generator/Verifier separation worked: executors built, reviewer caught what builders missed, fixer applied targeted patches, security auditor confirmed the closure. Same pattern repeated cleanly in Phase 10 (9 findings, 7 fixed, 55 threats closed).
- **6 days end-to-end.** Parallel-ready waves (especially Phase 8's 4-plan Wave 2) and Opus-as-planner + Sonnet-as-executor kept the orchestration tight. Phase 10 (the operational phase) was the smallest at 4 hours of work because all its patterns were already locked from Phases 5–9.

### What Was Inefficient

- **Drizzle correlated-subquery SQL footgun caught only in production.** The `${schema.users.id}` interpolation emitting unqualified `"id"` (which Postgres bound to `proposals.id` uuid instead of `users.id` text) passed every CI gate: typecheck (no type signal at the template-literal level), unit tests (fixtures, not real Drizzle SQL), lint (no static catch), build (no execution against Postgres). The partners page 500'd for the user before we knew. Hindsight: a tiny CI step that runs critical queries against a Neon preview branch would have caught it. **Action: add a read-only DB-smoke step to CI in v1.2 or v1.3.**
- **Frontmatter discipline drift.** The milestone audit found only 36 of 108 REQ-IDs claimed via `requirements_completed` in SUMMARY frontmatter, despite REQUIREMENTS.md showing 105 `[x]` complete. The traceability table is the canonical source, but per-plan frontmatter would catch coverage gaps faster. **Action: in v1.2, the planner template should default `requirements_completed: []` empty for the executor to fill rather than leaving it absent.**
- **Two stale `[~]` partial markers in REQUIREMENTS.md.** CALC-07 and PROP-01 were marked `[~]` at Phase 7 with notes about Phase 8 follow-up; when Phase 8 shipped, the markers weren't updated. The audit caught both; they're cosmetic but easy to miss. **Action: when a phase completes a requirement that was previously partial, the phase SUMMARY should explicitly bump the REQUIREMENTS.md checkbox.**
- **Heuristic accomplishments extraction in `milestone.complete`.** The auto-generated v1.1 entry in MILESTONES.md was full of fragments like "One-liner:", "File:", "Found during:" — the tool's regex extraction grabbed lines that didn't make sense out of context. Required manual rewrite. **Action: either fix the extraction heuristic upstream, or skip auto-generation in favor of explicit curated text.**

### Patterns Established

- **Phase-level threat model + post-execution code review + retroactive security audit triple.** Phases 9 and 10 produced PLAN-level `<threat_model>` blocks (ASVS L1), then post-execution `REVIEW.md` (12+9 findings caught), then `SECURITY.md` retroactively verifying each `mitigate` disposition has implementation evidence. The chain compresses beautifully: review-finds → fixer-applies → audit-confirms-in-the-same-pass. Worth keeping for any security-sensitive phase in v1.2+.
- **`verifier_enabled: false` is a viable project policy** when SUMMARY + REVIEW + SECURITY + milestone audit cover the verification ground. v1.1 had no per-phase VERIFICATION.md and shipped cleanly; the milestone audit verified the substitution explicitly.
- **Adapter discipline (`lib/storage` + `lib/db`) with CI grep gates** scales beautifully across phases. Cross-phase wiring stays clean because the gate prevents drift at PR time, not at audit time.
- **Typed-confirmation gates on destructive production operations** (`MIGRATE PROD`, `PURGE-SOFT-DELETED`, `PURGE-TEST-DATA`, `SMOKE-OVH`) — repeated 6 times across the milestone with the same shape. The discipline scaled cleanly.
- **Pre-staged `MILESTONE-CONTEXT.md` for the next milestone** (v1.2 was sketched in Figma + captured in `.planning/MILESTONE-CONTEXT.md` on the same day v1.1 closed). Worth keeping — feeds directly into `/gsd-new-milestone` without re-elicitation.

### Key Lessons

1. **Generator self-evaluation has a real blind spot for runtime-specific bugs.** Unit tests use fixtures; build checks types; lint checks syntax — none execute the actual SQL against the actual DB. Bug categories in this class: ORM template emission, env-var contract with the runtime (Vercel Cron's reserved `CRON_SECRET`), correlated subquery name resolution, JSONB key-order assumptions. Add a thin post-deploy DB-smoke probe to v1.2+ CI.
2. **Hidden-URL admin gates need an env-var presence check at deploy time.** ADMIN_URL_SEGMENT was empty in Vercel production for 4 days post-Phase-6 launch before anyone noticed (the admin tree was returning 404 by design when empty — fail-closed worked, but the misconfiguration was invisible until someone actually tried). A `/healthz` extension that confirms required env vars are present (not values, just non-empty) would catch this class.
3. **`milestone.complete` heuristics need curation.** The auto-extracted accomplishments list is too noisy to ship as-is; the milestone wrap-up step should always include manual curation. Better to acknowledge this upfront than relitigate the extraction quality each milestone.
4. **The `verifier_enabled: false` choice held up.** No per-phase VERIFICATION.md, no measurable verification gap. Future projects can adopt this confidently *if* they also adopt the REVIEW + SECURITY + milestone-audit triple as the substitute.
5. **6-day milestones are sustainable for one developer + AI.** The bottleneck isn't planning or execution — it's user-facing surfaces that need design taste (the v1.2 wizard is being scaffolded from Figma, not from prose). The Phase 10 work was almost entirely scripts + docs + adapter wiring — that's the rhythm v1.2 should expect to break from when it hits the wizard UI.

### Cost Observations

- **Model mix:** Opus 4.7 as planner + orchestrator (~30% of token spend); Sonnet 4.6 as executor + auditor + fixer (~65%); other models trivial (~5%)
- **Sessions:** Approximately 12-15 distinct GSD invocations across the milestone (discuss-phase × 6 + plan-phase × 6 + execute-phase × 6 + code-review × 3 + security × 2 + audit-milestone × 1 + complete-milestone × 1)
- **Notable:** Phase 9 + Phase 10 each had a planner-timeout-then-continue cycle (Anthropic SSE idle timeout at ~36 min / 32 tool uses); the workflow's filesystem-fallback handled both cleanly. Total wall-clock was ~10-15 minutes lost across both. Not worth optimizing yet.
- **One bug found in production cost ~30 minutes** (partner-page 500 → log diagnosis → Drizzle template fix → commit + push + redeploy + verify). Cheap given the bug never reached a real partner.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~10 | 4 | Established GSD discipline; 4 phases over ~4 days (Apr 26 → Apr 30); no per-phase REVIEW/SECURITY (single-file scope didn't warrant it) |
| v1.1 | ~15 | 6 | Added per-phase REVIEW (Phases 8/9/10) + SECURITY (Phases 9/10); Generator/Verifier separation paid off in 21 caught findings |

### Cumulative Quality

| Milestone | Tests | Coverage | Notable additions |
|-----------|-------|----------|-------------------|
| v1.0 | On-load self-checks (assertCalc 6/6 + assertEscape 8/8 + assertValidity 6/6) running in browser at page load; no automated CI | n/a (no CI) | Manual test runbooks only |
| v1.1 | 399 Vitest tests + Drizzle migration discipline + ESLint + 3 CI grep gates + PDF byte-determinism gate + Neon DB round-trip on `/healthz` | typecheck + lint + tests + build on every PR | First automated test suite; first CI |

### Top Lessons (Verified Across Milestones)

1. **Adapter discipline with mechanical enforcement beats convention** — v1.0's "send the file" model had no enforcement needed because there was no abstraction layer; v1.1's OVH-portability claim only holds because ESLint + CI grep gates *can't* drift. Future milestones with multi-environment claims should establish the gates Day 1.
2. **`params_snapshot` and `audit_log` as invariants-by-data-shape** generalize. Anywhere the spec says "old artifacts stay unchanged even when X edits," the cheapest implementation is "copy the relevant state into the artifact at creation time." Cheaper than enforcement code paths; impossible to accidentally break.
3. **Manual test runbooks survive into the AI-paired workflow.** v1.0's PARITY-AUDIT / SEC-TEST runbooks were the only verification path; v1.1 has Vitest + CI but still relies on Antoine-eyes-on-Vercel for visual confirmation. Both regimes coexist comfortably. Don't drop manual checklists when adding automation.
