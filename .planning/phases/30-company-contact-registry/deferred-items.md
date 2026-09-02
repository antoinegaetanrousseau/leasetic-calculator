# Deferred Items — Phase 30 (company-contact-registry)

Items discovered during plan execution that are out of scope for the discovering plan
per the Scope Boundary rule ("only auto-fix issues directly caused by the current
task's changes"). Logged here, not fixed.

## Plan 30-08 — `/proposals/[id]` has no admin-bypass in its ownership check

**Found during:** Task 3, wiring the admin relationship detail page's Propositions
card to reuse `ProposalRow` (which links each row to `/proposals/[id]`).

**Issue:** `app/(authed)/proposals/[id]/page.tsx` gates strictly on
`proposal.userId !== session.user.id → notFound()` with no admin exception. An admin
who clicks through from the new `/[adminSegment]/companies/[id]/relations/[relationshipId]`
page to a specific proposal's detail page will get a 404, even though they are
authorized to see the relationship-level summary (LC ref, amount, date, status) that
led them there.

**Why not fixed here:** `proposals/[id]/page.tsx` is a file this plan does not modify —
widening its authorization model to admit admins is a cross-cutting, security-relevant
change (touches every caller of that route, not just the new admin surface) and falls
under Rule 4 (architectural change), not Rules 1-3. It is also not a regression
introduced by this plan: the exact same click-through gap already exists in the
established admin flow at `/proposals?user_id={partnerId}` (Phase 18's
`admin.partners.action.viewProposals` → the proposals LIST already supports an
admin `user_id` override, per `app/(authed)/proposals/page.tsx`, but the detail page
it links to does not carry the same override) — this plan's new "Voir →" flow
surfaces the identical, pre-existing characteristic in a new location rather than
creating a new one.

**Suggested resolution (future plan):** Add an explicit `role === 'admin'` bypass
to `proposals/[id]/page.tsx`'s ownership check (matching the pattern already used in
`proposals/page.tsx`'s `adminUserIdOverride`), with an explicit product decision on
whether the ADMIN-09 commission-invisibility envelope needs a corresponding
adjustment for that surface (the detail page renders more inputs than the row/list
view). Good candidate for Phase 33/34 (pipeline/activity surfaces), which already
plans to extend admin oversight.

**Status:** deferred, not blocking — the relationship-level summary (counts, LC ref,
amount, date, status) is already visible to the admin on the pages this plan ships;
only the full proposal detail page is unreachable.
