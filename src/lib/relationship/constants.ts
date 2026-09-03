/**
 * Plain module — carrying NO server-action directive — shared by
 * `src/lib/relationship/actions.ts` and its client callers.
 *
 * WHY IT EXISTS AT ALL: a file carrying that directive may export ONLY async
 * functions. Next.js fails the production build with "Only async functions are
 * allowed to be exported in a [server] file." the moment any module imports a
 * non-function export from one. So anything the client and the action must
 * agree on lives here instead, exactly as `src/lib/pipeline/constants.ts` does
 * for the pipeline write layer.
 *
 * The directive string is deliberately not quoted anywhere in this file: an
 * acceptance grep counts its occurrences here and must find zero, so prose
 * mentioning it would defeat the check (the same reason 34-05 reworded a
 * comment that quoted the expression its own guard greps for).
 */
import type { DictKey } from '@/lib/i18n/dictionaries';

/**
 * The single bounded error key thrown by EVERY failure class in
 * `src/lib/relationship/actions.ts` — parse failure, zero rows affected, a
 * relationship the caller does not own, a relationship that does not exist, a
 * database outage. Nothing distinguishes them, which is the point: a partner
 * probing another partner's relationship id must not be able to tell
 * "not found" from "not yours" (T-34-06-02).
 *
 * `satisfies DictKey` is a compile-time proof that the key exists in
 * `src/lib/i18n/dictionaries.ts` (plan 34-01 minted it there, and no later plan
 * edits that file). The client toasts this key directly; it is never parsed,
 * matched or branched on.
 */
export const RELATIONSHIP_BOUNDED_ERROR = 'relationship.toast.error' satisfies DictKey;

/**
 * NO RESULT UNION HERE, DELIBERATELY. D-24 (and 33-REVIEW CR-01 behind it)
 * requires a RECOVERABLE outcome to travel as a RETURNED discriminated result
 * — `{ ok: false, reason: … }` — because Next.js substitutes a generic message
 * plus a digest for a Server Function's thrown error in a production build, so
 * a thrown sentinel is invisible to the client where it matters.
 *
 * None of this plan's three actions has a recoverable outcome: every way they
 * can fail is either the caller's own malformed input or a relationship they
 * cannot touch, and both end in the same toast. If a future private-tier write
 * gains a branch the UI must react to, its result union belongs in this file —
 * never a sentinel string thrown from the actions module.
 */
