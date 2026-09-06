/**
 * Shared environment loader for every plain-Node entry point — the `tsx` scripts
 * under scripts/ and drizzle.config.ts.
 *
 * Import this INSTEAD of 'dotenv/config'.
 *
 * WHY THIS EXISTS
 * `import 'dotenv/config'` loads `.env` and nothing else. This repo has no `.env`
 * — local secrets live in `.env.local` (and `.env.production.local`). Next.js
 * loads `.env.local` automatically, so the app always worked, but plain `tsx`
 * scripts do not, so every DB script failed locally with:
 *
 *     FATAL: DATABASE_URL is not set
 *
 * CI never saw it: .github/workflows/db-migrate.yml injects DATABASE_URL as a real
 * environment variable from secrets, so finding no `.env` is harmless there. That
 * app-works / CI-works / local-script-fails asymmetry is why this went unnoticed.
 *
 * PRECEDENCE (OPS-05, D-02 — corrected 2026-09-06; this module previously loaded
 * only `.env.local` then `.env` while its docstring falsely claimed it matched
 * Next.js)
 * The real process environment outranks every file (CI secrets always win; nothing
 * here clobbers them), and below that, the candidate file order is:
 *   `.env.$NODE_ENV.local` -> `.env.local` -> `.env.$NODE_ENV` -> `.env`
 * (with `.env.local` excluded outright when `NODE_ENV=test`, so a developer's
 * local value can never leak into a test run). That order is NOT re-inlined
 * here — `scripts/_env-precedence.ts`'s `envFileOrder` is the single place it is
 * written down, and this module loops over its return value with dotenv's
 * `config()` at its own default (a later file never replaces an already-set key,
 * i.e. first-writer-wins).
 *
 * Do NOT "fix" a missing variable by committing a `.env` file — that would
 * duplicate secrets into a second location. Add it to `.env.local` instead.
 *
 * === WRITE-TARGET GUARD (OPS-05, D-03 — sequencing hazard, read before editing) ===
 * Immediately after loading, this module calls `assertSafeDatabaseTarget()`
 * (`scripts/_db-branch-guard.ts`), so it runs at module scope — before any consumer's
 * first statement — for every one of the 14 `tsx`/config consumers that
 * `import './_load-env'` (13 `scripts/*.ts` files plus `drizzle.config.ts`), through
 * that single shared import. Its ONE argument is the PRE-load environment snapshot;
 * see the comment on `preLoadEnv` below for why passing it is load-bearing rather
 * than incidental (39-REVIEW WR-02).
 *
 * This is a no-op when NO `.env*` candidate file exists on disk (the SKIP rule in
 * `scripts/_db-branch-guard.ts`), which is what keeps the `MIGRATE PROD` GitHub
 * Action and CI's ephemeral-branch migration step working — neither has a local
 * env file, so the guard silently passes there.
 *
 * D-03 IS A HARD ORDERING CONSTRAINT: correcting the precedence above WITHOUT this
 * guard call would newly expose all 14 write-capable consumers to
 * `.env.production.local`. The precedence fix and the guard call landed in the
 * SAME edit by construction, and `tests/load-env-contracts.test.ts` Contract 1
 * fails if a future edit ever removes the guard call while keeping the corrected
 * precedence — do not separate them.
 *
 * `scripts/probe-write-isolation.ts` deliberately does NOT import this module and
 * must NOT be "fixed" to do so (Phase 36 D-36-03: it must never read a stored env
 * file). `tests/load-env-contracts.test.ts` Contract 3 pins that exemption.
 *
 * TWO RULES WHEN USING THIS
 *   - Keep it the FIRST import in the file. ES module imports evaluate in source
 *     order, and some consumers (drizzle.config.ts) read process.env at module
 *     scope, i.e. before any function of theirs runs.
 *   - Paths are resolved from process.cwd(), matching the existing convention in
 *     scripts/migrate.ts. Run these via their npm scripts from the project root.
 */
import { config } from 'dotenv';
import { envFileOrder } from './_env-precedence';
import { assertSafeDatabaseTarget } from './_db-branch-guard';

// Snapshot the environment BEFORE any file is loaded (39-REVIEW WR-02). `config()`
// WRITES process.env.DATABASE_URL, so a guard left to read the ambient environment
// afterwards always takes resolveDatabaseUrl's `processEnv.DATABASE_URL` branch and
// reports `source: 'process.env'` for every refusal — never the file that actually
// caused it, which is precisely what D-07 exists to tell the operator. Handing the
// guard the PRE-load snapshot makes it re-resolve through the file order and name the
// winning file, while a DATABASE_URL that was genuinely already in the environment is
// still present in the snapshot and still outranks every file, so the documented
// precedence is unchanged. `tests/load-env-attribution.test.ts` pins both halves.
const preLoadEnv: NodeJS.ProcessEnv = { ...process.env };

for (const path of envFileOrder(process.env.NODE_ENV ?? 'development')) {
  config({ path });
}

assertSafeDatabaseTarget({ processEnv: preLoadEnv });
