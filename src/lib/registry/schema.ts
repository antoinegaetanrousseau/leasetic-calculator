import { z } from 'zod';

/**
 * Phase 34 Plan 02 — the zod contract for the company-registry search payload.
 *
 * This module holds NO endpoint, NO transport and NO secret: it is the shape of
 * what comes back, and the pure mapper from that shape onto our columns. The
 * call itself lives in `./recherche-entreprises`.
 *
 * D-08 — unknown fields are IGNORED, not rejected. zod 4 strips keys it does not
 * declare, which is exactly the property we want: the registry can add a field
 * tomorrow and nothing here breaks. Do not widen these objects to keep unknown
 * keys, and do not tighten them to reject unknown keys; both defeat D-08.
 *
 * D-10 — registry text is UNTRUSTED input. Every string is trimmed and hard
 * truncated at a cap before it can reach a database column, and the trailing
 * `.max(...)` on each field is the assertion that the cap actually held. A
 * hostile 5 000-character legal name must become a boring 200-character row,
 * never a rejected parse (which would lose a real company) and never an
 * unbounded write.
 *
 * D-06 — the registry returns CODES and never labels. There is no label field
 * for the activity code, the legal form or the headcount band anywhere in the
 * payload, so none is parsed and none is produced here; `./labels` owns the two
 * small code→label tables the app ships.
 */

/** Legal names and the single-line address the registry already formats. */
const NAME_MAX = 200;
const ADDRESS_MAX = 200;
/** Commune labels are short; 120 is generous for the longest French commune. */
const COMMUNE_MAX = 120;
/** Every code field (`5599`, `35.11Z`, `52`, `A`, a postcode) is tiny. */
const CODE_MAX = 20;
/** An ISO date, `YYYY-MM-DD`. */
const DATE_MAX = 10;

/**
 * Trim, then truncate at `limit` rather than rejecting (D-10). Each call site
 * pipes into an explicit `.max(limit)` so the cap is visible per field and
 * provable by the parser, not only by this helper.
 */
const truncated = (limit: number) =>
  z
    .string()
    .trim()
    .transform((v) => (v.length > limit ? v.slice(0, limit) : v));

/** The `siege` sub-object: the head-office address, all three parts optional. */
const registrySiegeSchema = z.object({
  adresse: truncated(ADDRESS_MAX).pipe(z.string().max(ADDRESS_MAX)).optional(),
  code_postal: truncated(CODE_MAX).pipe(z.string().max(CODE_MAX)).optional(),
  libelle_commune: truncated(COMMUNE_MAX).pipe(z.string().max(COMMUNE_MAX)).optional(),
});

/**
 * One search hit. `siren` is the ONLY required field — it is what the caller
 * compares against the SIREN it asked for (D-05), so a result without one is
 * unusable by construction. Everything else is genuinely optional: the registry
 * omits fields for plenty of real companies.
 */
export const registryResultSchema = z.object({
  siren: truncated(CODE_MAX).pipe(z.string().max(CODE_MAX)),
  nom_raison_sociale: truncated(NAME_MAX).pipe(z.string().max(NAME_MAX)).optional(),
  nom_complet: truncated(NAME_MAX).pipe(z.string().max(NAME_MAX)).optional(),
  nature_juridique: truncated(CODE_MAX).pipe(z.string().max(CODE_MAX)).optional(),
  activite_principale: truncated(CODE_MAX).pipe(z.string().max(CODE_MAX)).optional(),
  section_activite_principale: truncated(CODE_MAX).pipe(z.string().max(CODE_MAX)).optional(),
  tranche_effectif_salarie: truncated(CODE_MAX).pipe(z.string().max(CODE_MAX)).optional(),
  date_creation: truncated(DATE_MAX).pipe(z.string().max(DATE_MAX)).optional(),
  etat_administratif: truncated(CODE_MAX).pipe(z.string().max(CODE_MAX)).optional(),
  siege: registrySiegeSchema.optional(),
});

export type RegistryResult = z.infer<typeof registryResultSchema>;

/**
 * The response envelope. Only `results` is read; the pagination counters the
 * endpoint also returns are stripped along with everything else we do not
 * declare (D-08).
 */
export const registrySearchResponseSchema = z.object({
  results: z.array(registryResultSchema),
});

export type RegistrySearchResponse = z.infer<typeof registrySearchResponseSchema>;

/**
 * The ten registry-tier fields, exactly as the design's § 2 mapping table
 * defines them. Every one is nullable because the registry omits fields, and
 * because a nullable column must be able to store the absence.
 */
export type RegistryIdentity = {
  legalName: string | null;
  addressLine: string | null;
  postalCode: string | null;
  city: string | null;
  legalForm: string | null;
  nafCode: string | null;
  nafSection: string | null;
  headcountBand: string | null;
  foundedOn: string | null;
  registryState: string | null;
};

/** An absent OR empty upstream value becomes null, never '' — the column stores NULL. */
const orNull = (value: string | undefined): string | null =>
  value === undefined || value.length === 0 ? null : value;

/**
 * Map one parsed search hit onto the registry tier (design § 2).
 *
 * `requestedSiren` is not decoration: it re-proves D-05 at the last possible
 * moment. `lookupCompanyBySiren` already refuses a result whose siren differs
 * from the one asked for, and this second gate exists so that a FUTURE caller
 * that forgets cannot mint an identity for the wrong company either. Attaching
 * a company to the wrong legal identity is the single worst failure this phase
 * can produce, so it is guarded twice on purpose. Returns null on a mismatch —
 * nothing from the mismatched result is copied out.
 */
export function toRegistryIdentity(
  result: RegistryResult,
  requestedSiren: string,
): RegistryIdentity | null {
  if (result.siren !== requestedSiren) return null;

  return {
    legalName: orNull(result.nom_raison_sociale) ?? orNull(result.nom_complet),
    addressLine: orNull(result.siege?.adresse),
    postalCode: orNull(result.siege?.code_postal),
    city: orNull(result.siege?.libelle_commune),
    legalForm: orNull(result.nature_juridique),
    nafCode: orNull(result.activite_principale),
    nafSection: orNull(result.section_activite_principale),
    headcountBand: orNull(result.tranche_effectif_salarie),
    foundedOn: orNull(result.date_creation),
    registryState: orNull(result.etat_administratif),
  };
}
