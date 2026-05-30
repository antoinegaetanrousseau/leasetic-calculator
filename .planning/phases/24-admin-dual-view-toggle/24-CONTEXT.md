# Phase 24: Admin Dual-View Toggle - Context

**Gathered:** 2026-05-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver an **admin-only Admin/Agent view toggle** in the sidebar's bottom settings area (alongside theme + locale controls). The toggle swaps which navigation route set the sidebar renders — admin set vs agent set — and is **session-only** (no cookie / no DB column). Authorization is **unchanged** in both views: the admin keeps full admin rights, admin routes remain directly reachable, and the agent view exposes no admin-only data beyond what the agent routes already render.

Requirements: VIEW-01, VIEW-02, VIEW-03, VIEW-04 (see `.planning/REQUIREMENTS.md`).

**In scope:** the toggle control, the nav remap, session-only view state, redirect-on-switch behavior, auto-reconcile when landing on an admin route.
**Out of scope:** persisting the view across sessions; any authorization change; any new agent-facing capability; changing the existing admin or agent route sets themselves.

</domain>

<decisions>
## Implementation Decisions

### Switch landing behavior (discussed)
- **D-01:** On every view switch, **redirect to the new view's home.** Switching to Agent view navigates to agent home `/`; switching back to Admin view navigates to admin home `/[adminSegment]`. The nav set and the page the admin lands on always agree — the admin is never stranded on a route the new view's nav can't reach (e.g. Coefficients, which has no Agent-view equivalent).
- **D-02:** **Auto-reconcile to Admin view when landing on an admin route.** If the admin is in Agent view and directly opens an admin URL (bookmark, typed address, or a link), the page loads (authz unchanged per VIEW-04) **and** the effective view resets to Admin so the sidebar matches the page. Net model: the effective view is `agent` only while on a non-admin route with the flag set; physically being on any `(admin)` route forces `admin`.

### Claude's Discretion (unpicked gray areas — decided with sensible defaults)
- **D-03 — Toggle affordance:** Render a **segmented `Admin | Agent` control** consistent with the existing `ThemeToggle` / `LocaleToggle` styling in the sidebar footer. In the **collapsed (72px) sidebar**, follow the existing collapsed-footer pattern (single pill/icon button that cycles or expands), matching how theme/locale already degrade when collapsed. Final visual treatment is a UI-design concern — `/gsd-ui-phase 24` may refine it (UI hint = yes).
- **D-04 — Session-state mechanism:** Store the view flag in **`sessionStorage`** (e.g. `leasetic.view = 'agent' | 'admin'`), **not** a cookie or DB column (satisfies VIEW-03 "session-only"). `sessionStorage` is **required** (not merely preferred) because D-01's redirect crosses route-group boundaries and remounts the sidebar — see Constraints below. The flag MUST be **cleared on logout** (and absent ⇒ defaults to Admin) so a fresh login always lands in Admin view per VIEW-03. Default when absent: **Admin**.
- **D-05 — Agent-view visual cue:** The toggle's own `Admin | Agent` selected state is the **only** indicator that an admin is previewing Agent view. No extra badge/banner — avoids scope creep and visual noise.

### Constraints / implications for research & planning
- **C-01 — View flag must survive a sidebar remount.** Agent home `/` lives in the `(authed)` route group (`app/(authed)/layout.tsx`, which sets `isAdmin={role === 'admin'}`); admin home `/[adminSegment]` lives in the `(admin)` group (`app/(admin)/[adminSegment]/layout.tsx`, hardcoded `isAdmin={true}`). These are **separate layouts → separate `Shell` → separate `RetractableSidebar` instances.** D-01's redirect therefore remounts the sidebar, so a pure in-memory React flag would be wiped on the jump (landing on `/`, the `(authed)` layout would see `role==='admin'` and re-render the admin nav). This is why D-04 mandates `sessionStorage` over component state.
- **C-02 — The `(authed)` layout currently renders the admin nav for admins.** Today `app/(authed)/layout.tsx` passes `isAdmin={role === 'admin'}`, so an admin on `/` already sees the 6-item admin nav. For Agent view to work, the effective `isAdmin` passed to the sidebar on non-admin routes must be **derived from the view flag** for admin users, not from role alone. The toggle's job is precisely to override that server-derived `isAdmin` on the client.
- **C-03 — Non-admin users must never see the toggle** (VIEW-01). Gate strictly on the real role (`role === 'admin'`), independent of the view flag.
- **C-04 — Toggle is nav-only, never an authz change** (VIEW-04). No middleware/guard changes; admin routes stay reachable in both views.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — VIEW-01..VIEW-04 (the four requirements this phase satisfies) + the "Persisting the view toggle across sessions" out-of-scope note.
- `.planning/ROADMAP.md` → "### Phase 24: Admin Dual-View Toggle" — goal, success criteria (4), and the agent/admin route-set enumerations. Also the v1.4 Cross-Cutting Invariants (ADMIN-09 commission invisibility still applies to the agent route set).

### Code to read before planning
- `src/components/ui/RetractableSidebar.tsx` — the single `'use client'` island; holds `partnerNavItems()` (4) + `adminNavItems()` (6) and the collapsed/expanded footer where the toggle goes. Already uses `useSyncExternalStore` over `localStorage` for collapse — the same external-store pattern is the template for the `sessionStorage` view flag.
- `src/components/ui/Shell.tsx` — server component that builds `adminHrefs` from `adminSegment` and forwards `isAdmin` to the sidebar.
- `app/(authed)/layout.tsx` — sets `isAdmin={role === 'admin'}` (the value that must become view-flag-aware for admins; see C-02).
- `app/(admin)/[adminSegment]/layout.tsx` — hardcodes `isAdmin={true}`; the route group whose presence forces Admin view (D-02).
- `src/lib/route-meta.ts` (`getRouteMeta`, `ActiveNav`) — active-nav derivation used for sidebar highlighting; relevant to agent-view highlighting on shared routes.
- Logout path (Better Auth sign-out handler) — must clear the `sessionStorage` view flag per D-04 (locate during research).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RetractableSidebar`'s `useSyncExternalStore` + custom-event pattern (currently bound to `localStorage['leasetic.sidebar.collapsed']`) is directly reusable for a `sessionStorage['leasetic.view']` store with same-tab reactivity.
- `LocaleToggle` / `ThemeToggle` (rendered `fullWidth` in the expanded footer; degraded to pill/icon buttons when collapsed) are the styling + collapsed-degradation templates for the new `Admin | Agent` control.
- `setTheme` / `setLang` server actions show the existing toggle→action wiring, though the view toggle is **client-only** (no server action / no persistence).

### Established Patterns
- Sidebar is the only client boundary in `src/components/ui/`; admin hrefs are resolved server-side in `Shell` and forwarded as props because the client island can't read `process.env.ADMIN_URL_SEGMENT`. Any redirect target for admin home must be built from the forwarded `adminSegment`, not hardcoded.
- Two distinct layouts render `Shell` (route-group split) — the core architectural fact behind C-01/C-02.

### Integration Points
- `isAdmin` prop flow: `(authed)`/`(admin)` layout → `Shell` → `RetractableSidebar`. The view flag intercepts this for admin users on non-admin routes.
- Logout handler ↔ `sessionStorage` clear (D-04).

</code_context>

<specifics>
## Specific Ideas

- Agent route set (VIEW-02): Accueil `/`, Nouvelle proposition, Propositions `/proposals`, Aide.
- Admin route set (VIEW-02): Accueil `/[adminSegment]`, Coefficients, Partenaires `/[adminSegment]/partners`, Toutes les propositions `/[adminSegment]/lc-references`, Aide.
- Default view on each login: **Admin** (VIEW-03).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 24-admin-dual-view-toggle*
*Context gathered: 2026-05-30*
