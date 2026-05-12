import { redirect } from 'next/navigation';

/**
 * Phase 13 — D-04: legacy v1.1 `/proposals/new` route preserved as a server-
 * side redirect to the new wizard step 1 (`/proposals/new/parametres`).
 *
 * No `requireUser()` here — `/proposals/new/parametres` (plan 13-03) runs
 * `requireUser()` on entry per D-01. Keeping this file requireUser-free
 * minimizes drift: the auth boundary lives at the destination.
 *
 * Pre-Phase 13 bookmarks (e.g., a partner who saved `/proposals/new` to
 * their browser bar) silently land on the new wizard's first step.
 */
export const dynamic = 'force-dynamic';

export default function NewProposalLegacyRoute() {
  redirect('/proposals/new/parametres');
}
