import 'dotenv/config';
import type { Config } from 'drizzle-kit';

/**
 * drizzle-kit configuration.
 *
 * Schema source: src/db/schema.ts
 * Output: drizzle/  (versioned SQL migration files, committed to git)
 *
 * Usage:
 *   npm run db:generate      → reads schema, diffs against last migration, writes drizzle/{NNNN}_*.sql
 *   npm run db:check         → validates that drizzle/* is consistent with the schema
 *
 * NEVER USE: drizzle-kit push. Push is forbidden in this codebase per BOOT-09/10
 * (see STATE.md locked decision). Migrations are applied to production ONLY via
 * the explicit GitHub Action workflow (plan 05-06, .github/workflows/db-migrate.yml).
 *
 * For local development, the workflow is:
 *   1. Edit src/db/schema.ts
 *   2. Run `npm run db:generate` — produces drizzle/{NNNN}_*.sql
 *   3. Review the SQL, commit it
 *   4. Apply locally: `npx drizzle-kit migrate` against the local DATABASE_URL (this command
 *      reads the committed SQL files; it does NOT diff the schema like `push` does)
 */
export default {
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
} satisfies Config;
