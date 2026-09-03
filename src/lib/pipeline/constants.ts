/**
 * Plain (non-`'use server'`) module shared by `src/lib/pipeline/actions.ts`
 * and its client callers.
 *
 * WHY IT EXISTS AT ALL: a `'use server'` file may export ONLY async
 * functions — Next.js fails the production build with "Only async functions
 * are allowed to be exported in a 'use server' file." the moment any module
 * imports a non-function export from one. So anything the client and the
 * action must agree on lives here instead.
 *
 * HISTORY — this file used to export a `SIREN_REQUIRED` string sentinel that
 * `markProposalWonAction` threw and `MarkWonDialog` matched on `e.message`.
 * That handshake was removed (33-REVIEW CR-01): Next.js does not send a
 * Server Function's thrown error message to the client in a PRODUCTION
 * build — it substitutes a generic message plus a digest — so the comparison
 * was always false once deployed, and D-08's inline SIREN field could never
 * appear for a real partner. The gate now travels as a RETURNED value, which
 * crosses the serialisation boundary intact, and the sentinel is gone.
 */

/**
 * What `markProposalWonAction` resolves to.
 *
 * `{ ok: false, reason: 'siren_required' }` is the ONE recoverable failure
 * class: the caller already owns the proposal (the owner-scoped read that
 * selects it ran first) and the company it points at simply has no SIREN
 * yet, so D-08's dialog reveals an inline SIREN field rather than a
 * dead-end toast. It carries no company id, no company name and no other
 * partner's data.
 *
 * Every OTHER failure class still throws the single bounded error key, so
 * a caller can never distinguish "not owned" from "not found" from
 * "database down".
 */
export type MarkWonResult = { ok: true } | { ok: false; reason: 'siren_required' };
