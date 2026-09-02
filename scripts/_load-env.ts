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
 * PRECEDENCE (verified against the installed dotenv 16.4.7, where `override`
 * defaults to false — the first value assigned to a key wins):
 *   1. the real process environment — CI secrets always win; nothing here clobbers them
 *   2. .env.local                   — the local developer's file
 *   3. .env                         — optional fallback, absent in this repo by design
 *
 * That is deliberately the same order Next.js applies, so a script and the app can
 * never disagree about the value of a key.
 *
 * Do NOT "fix" a missing variable by committing a `.env` file — that would
 * duplicate secrets into a second location. Add it to `.env.local` instead.
 *
 * TWO RULES WHEN USING THIS
 *   - Keep it the FIRST import in the file. ES module imports evaluate in source
 *     order, and some consumers (drizzle.config.ts) read process.env at module
 *     scope, i.e. before any function of theirs runs.
 *   - Paths are resolved from process.cwd(), matching the existing convention in
 *     scripts/migrate.ts. Run these via their npm scripts from the project root.
 */
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });
