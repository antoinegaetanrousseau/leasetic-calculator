/**
 * Plain (non-`'use server'`) module shared by `src/lib/crm/actions.ts`,
 * `src/lib/crm/registry-sync.ts` and their client callers.
 *
 * WHY IT EXISTS AT ALL: a `'use server'` file may export ONLY async
 * functions — Next.js fails the production build with "Only async functions
 * are allowed to be exported in a 'use server' file." the moment any module
 * imports a non-function export from one. So anything the client and the
 * action must agree on lives here instead. Same reason, same shape as
 * `src/lib/pipeline/constants.ts`.
 */

/**
 * What `refreshCompanyRegistryAction` resolves to, and what
 * `syncCompanyRegistry` reports back to it.
 *
 * These are the RECOVERABLE outcomes, and they travel as RETURNED values
 * rather than thrown sentinels (D-24 / 33-REVIEW CR-01): Next.js does not send
 * a Server Function's thrown error message to the client in a PRODUCTION
 * build — it substitutes a generic message plus a digest — so an
 * `e.message === SENTINEL` handshake works under `npm run dev` and silently
 * degrades to a generic toast once deployed. A returned value crosses the
 * serialisation boundary intact.
 *
 *   - `no_siren`    — the company has no SIREN yet, so there is nothing to look
 *                     up. The dialog offers the SIREN field instead of a
 *                     dead-end toast.
 *   - `not_found`   — a SETTLED answer: this SIREN is not in the registry, or
 *                     the registry disagrees about which company it is (D-05).
 *                     Refreshing again will not help; correcting the SIREN will.
 *   - `unavailable` — a RETRYABLE answer: timeout, upstream failure, or an
 *                     unusable payload. The "Actualiser" control is the retry.
 *
 * Every OTHER failure class still throws the single bounded error key, so a
 * caller can never distinguish "not owned" from "not found" from "database
 * down". This union carries no company id, no company name and no other
 * partner's data.
 */
export type RegistryRefreshResult =
  | { ok: true }
  | { ok: false; reason: 'no_siren' | 'not_found' | 'unavailable' };

/**
 * What `deleteClientRelationshipAction` resolves to.
 *
 * A RETURNED union, for the same reason `RegistryRefreshResult` is one
 * (D-24 / 33-REVIEW CR-01): Next.js redacts a Server Function's thrown
 * message in a production build, so a recoverable outcome the UI must branch
 * on can never travel as a thrown sentinel. It works in `npm run dev` and
 * degrades to a generic toast once deployed — which is exactly how the SIREN
 * gate shipped broken in Phase 33.
 *
 *   - `has_proposals` — the client has at least one FINALIZED proposal. A
 *                       finalized proposal is a real commercial document with
 *                       an LC reference and a PDF; the foreign key would
 *                       merely null its link, leaving a document that no
 *                       longer knows whose it was. Operator decision,
 *                       2026-09-04: refuse instead. Drafts and already-deleted
 *                       proposals do not block.
 *   - `not_found`     — no such relationship, OR it belongs to another
 *                       partner. ONE reason for both, so a probing caller
 *                       cannot use this action to test whether an id exists
 *                       (D-18, the same contract the page's 404 keeps).
 *
 * `count` is the caller's OWN finalized-proposal count. It is safe to return
 * because the query behind it is owner-scoped: a non-owner never reaches this
 * branch at all.
 */
export type DeleteClientResult =
  | { ok: true }
  | { ok: false; reason: 'has_proposals'; count: number }
  | { ok: false; reason: 'not_found' };
