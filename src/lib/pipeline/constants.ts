/**
 * Phase 33 Plan 06 Task 1 — Rule 3 auto-fix (blocking).
 *
 * `SIREN_REQUIRED` was originally declared AND exported directly from
 * `src/lib/pipeline/actions.ts` (plan 33-04). That file carries the
 * `'use server'` directive, and Next.js enforces that a `'use server'`
 * file may export ONLY async functions — any other export (a plain string
 * constant, in this case) fails the production build with "Only async
 * functions are allowed to be exported in a 'use server' file." the moment
 * ANY module imports it, client or server. This was invisible through plan
 * 33-04 and 33-05 because nothing imported `SIREN_REQUIRED` yet; this
 * plan's `MarkWonDialog` (a client component) is the first consumer, and
 * `npm run build` failed the instant it tried.
 *
 * Fix: the sentinel now lives in this plain module — no `'use server'`, no
 * `import 'server-only'`, safe to import from server or client code alike.
 * `src/lib/pipeline/actions.ts` imports it from here for its own internal
 * `throw new Error(SIREN_REQUIRED)` and deliberately does NOT re-export it
 * (re-exporting a non-function value from a `'use server'` file trips the
 * identical constraint). `MarkWonDialog.tsx` imports it from here directly,
 * not from `actions.ts`.
 */
export const SIREN_REQUIRED = 'pipeline.error.sirenRequired';
