---
id: wr-07-db-guard-skip-rule
title: Harden the DB guard's NODE_ENV=test SKIP rule
created: 2026-09-07
source: 39-REVIEW.md (WR-07) / 39-REVIEW-FIX.md
severity: warning
status: pending
---

# Harden the DB guard's NODE_ENV=test SKIP rule

Carried out of Phase 39's code-review fix pass as the one finding where the
code still does what the review objected to. The pinning test and written
analysis landed (`3686e88`); the behavioural hardening deliberately did not.

## Why it was deferred, not skipped

The obvious broadening — "skip only when no `.env*` exists in cwd" — is unsafe
in this repo: `.env.example` is committed, so **every** checkout matches it and
the guard would refuse inside the `MIGRATE PROD` GitHub Action and CI's
ephemeral-branch step, where `DATABASE_URL` is legitimately a production
secret. That would break two production paths to close a warning.

The safe narrow version is written down in `scripts/_db-branch-guard.ts`. It
flips a pinned expectation in the `CASES` matrix and requires a matching change
in `scripts/check-local-db-branch.sh` in the same edit, so bash and TS do not
drift apart.

## Why it needs an operator decision

Three production paths depend on the current rule (local test runs, MIGRATE
PROD, CI ephemeral branches). Changing it is an operations call, not a
refactor — it should land as its own reviewed change with the CI paths
exercised, not folded into a review-fix pass.

## Acceptance

- [ ] Narrow skip rule applied in `scripts/_db-branch-guard.ts` AND
      `scripts/check-local-db-branch.sh` in one edit (no bash/TS drift)
- [ ] `CASES` matrix expectation updated with rationale
- [ ] MIGRATE PROD and the CI ephemeral-branch step verified unaffected
- [ ] Differential test still proves bash and TS agree on the new rule
