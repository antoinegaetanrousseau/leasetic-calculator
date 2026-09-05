/**
 * Single source of truth for "who may see this proposal, and may they change it".
 *
 * WHY THIS EXISTS (37-REVIEW.md WR-02). The rule used to be written out by hand at every
 * surface that needed it, and the copies drifted — for real, inside one phase:
 *
 *   - D-37-01 (`4a09292`) gave `app/(authed)/proposals/[id]/page.tsx` an admin bypass so the
 *     oversight click-through stops 404ing.
 *   - `app/api/proposals/[id]/pdf/route.ts` kept its own older copy of the same check. The page
 *     opened while its PDF panel rendered `{"error":"not_found"}`.
 *   - Nothing caught it — not tsc, not eslint, not the test suite. It took a manual browser walk
 *     (plan 37-05) and a follow-up commit (`7999759`) to bring the two back into line.
 *
 * So the rule lives here once. Adding a role to the bypass, or changing what owners may do, is a
 * one-line edit in one file rather than a grep across surfaces that may or may not be complete.
 *
 * This module is deliberately PURE — no I/O, no `server-only`, no imports beyond the `Role` type.
 * It decides nothing about *authentication*; callers must already have resolved the viewer via
 * `requireUser()`, whose `role` is a per-request DB read and never a client-supplied value
 * (T-37-01-01).
 */
import type { Role } from './require';

/** The minimum a proposal must expose for an access decision. */
export interface ProposalOwnership {
  userId: string;
}

/** The viewer, as resolved server-side by `requireUser()`. */
export interface ProposalViewer {
  id: string;
  role: Role;
}

export interface ProposalAccess {
  /**
   * May this viewer SEE the proposal? True for the owner, and for an admin under the D-37-01
   * oversight bypass. Note this answers the ownership arm ONLY — callers keep their own
   * `!proposal` check, because absence must stay an independent short-circuit ahead of any role
   * reasoning (CONTEXT.md D-37-01: "an admin requesting a nonexistent id gets the same 404 as
   * everyone else"). `canView` is `false` for a null proposal too, so a caller that forgets is
   * still fail-closed.
   */
  canView: boolean;
  /**
   * May this viewer CHANGE the proposal? Ownership only — an admin's oversight reach is
   * read-only by design (37-REVIEW.md WR-01). The write handlers are themselves owner-scoped
   * (`softDeleteProposal` / `restoreProposal` filter on `eq(proposals.userId, userId)`; the
   * `?duplicate=` prefill only spreads a source the session owns), so UI gated on `isOwner`
   * offers exactly what the server will honour.
   *
   * Widening this so an admin may delete or duplicate another partner's proposal is a separate
   * decision that has NOT been taken.
   */
  isOwner: boolean;
}

/**
 * Resolve what `viewer` may do with `proposal`.
 *
 * Fail-closed on a null/undefined proposal: `{ canView: false, isOwner: false }`.
 */
export function resolveProposalAccess(
  proposal: ProposalOwnership | null | undefined,
  viewer: ProposalViewer,
): ProposalAccess {
  if (!proposal) {
    return { canView: false, isOwner: false };
  }
  const isOwner = proposal.userId === viewer.id;
  const isAdmin = viewer.role === 'admin';
  return { canView: isOwner || isAdmin, isOwner };
}
