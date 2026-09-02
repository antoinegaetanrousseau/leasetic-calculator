/**
 * Phase 31 Plan 02 — D-10 side-identity-key derivation and canonical
 * unordered-pair ordering.
 *
 * D-10, as refined in 31-01-SUMMARY.md: the pair a flagged ambiguity is keyed
 * on is NOT the literal normalized-name pair — two candidates that "match
 * only on name_normalized" share the SAME name_normalized, which would
 * degenerate to `(x, x)`. The key is instead an unordered pair of per-side
 * identity keys, each computable before any company row exists:
 *   - `siren:<9 digits>` when the side carries a valid SIREN
 *   - `owner:<ownerId>|name:<name_normalized>` otherwise
 *
 * `canonicalPair`'s lexicographic ordering exists so the tuple written to
 * `company_pair_decisions` always agrees with the hand-written
 * `LEAST`/`GREATEST` unique index (`company_pair_decisions_pair_uq`) — the
 * lookup and the eventual insert must compare the same two strings in the
 * same order-independent way.
 */

export interface SideKeyInput {
  siren: string | undefined;
  ownerId: string;
  nameNormalized: string;
}

export function deriveSideKey(input: SideKeyInput): string {
  if (input.siren !== undefined) {
    return `siren:${input.siren}`;
  }
  return `owner:${input.ownerId}|name:${input.nameNormalized}`;
}

export interface CanonicalPair {
  sideAKey: string;
  sideBKey: string;
}

/**
 * Orders two side keys lexicographically ascending so `(a, b)` and `(b, a)`
 * always produce the same `{ sideAKey, sideBKey }` tuple — matching the
 * `LEAST`/`GREATEST` unique index. Throws on a self-pair: two identical keys
 * would violate `company_pair_decisions_distinct_sides_check`.
 */
export function canonicalPair(keyA: string, keyB: string): CanonicalPair {
  if (keyA === keyB) {
    throw new Error(`canonicalPair: self-pair is not allowed (key: ${keyA})`);
  }
  return keyA < keyB
    ? { sideAKey: keyA, sideBKey: keyB }
    : { sideAKey: keyB, sideBKey: keyA };
}
