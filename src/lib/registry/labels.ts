/**
 * Phase 34 Plan 02 — the two code→label tables the app owns (D-06).
 *
 * The company registry returns CODES and never labels: there is no `libelle`
 * for the headcount band, the activity code or the legal form anywhere in the
 * payload. So either the app owns a table or a partner reads "52". These two
 * tables are the proportionate answer, and they are DELIBERATELY the only two:
 *
 *   - the full NAF nomenclature (~700 rows) and the full legal-form list
 *     (~100 rows) are recorded as Deferred Ideas in 34-CONTEXT.md (D-06).
 *     They are not missing work. Do not "complete" them: the activity code is
 *     displayed beside its 21-entry SECTION label, and the legal form is
 *     displayed as its code, until someone asks otherwise.
 *
 * These strings are French INSEE vocabulary and do NOT go through `t()`. They
 * get no FR/EN dictionary entries, for three reasons: the values are official
 * French administrative nomenclature with no sanctioned English rendering; the
 * registry data around them (legal name, address, commune) is French whatever
 * the UI language is; and 37 machine-translated approximations would be worse
 * copy than the original. The FIELD labels around them ("Effectif", "Activité")
 * ARE dictionary keys.
 *
 * No `server-only` import: the client-side identity panel renders this output.
 */

/**
 * INSEE's `tranche_effectif_salarie` code list — 16 codes.
 *
 * The codes are not intuitive and an earlier draft of the design spec had the
 * example wrong: `32` is "250 à 499 salariés" and `42` is "1 000 à 1 999
 * salariés". This is the published list, not an illustration.
 */
export const HEADCOUNT_BAND_LABELS: Readonly<Record<string, string>> = Object.freeze({
  NN: 'Unité non employeuse',
  '00': '0 salarié',
  '01': '1 ou 2 salariés',
  '02': '3 à 5 salariés',
  '03': '6 à 9 salariés',
  '11': '10 à 19 salariés',
  '12': '20 à 49 salariés',
  '21': '50 à 99 salariés',
  '22': '100 à 199 salariés',
  '31': '200 à 249 salariés',
  '32': '250 à 499 salariés',
  '41': '500 à 999 salariés',
  '42': '1 000 à 1 999 salariés',
  '51': '2 000 à 4 999 salariés',
  '52': '5 000 à 9 999 salariés',
  '53': '10 000 salariés et plus',
});

/** The 21 sections of NAF rév. 2, A through U. */
export const NAF_SECTION_LABELS: Readonly<Record<string, string>> = Object.freeze({
  A: 'Agriculture, sylviculture et pêche',
  B: 'Industries extractives',
  C: 'Industrie manufacturière',
  D: "Production et distribution d'électricité, de gaz, de vapeur et d'air conditionné",
  E: "Production et distribution d'eau ; assainissement, gestion des déchets et dépollution",
  F: 'Construction',
  G: "Commerce ; réparation d'automobiles et de motocycles",
  H: 'Transports et entreposage',
  I: 'Hébergement et restauration',
  J: 'Information et communication',
  K: "Activités financières et d'assurance",
  L: 'Activités immobilières',
  M: 'Activités spécialisées, scientifiques et techniques',
  N: 'Activités de services administratifs et de soutien',
  O: 'Administration publique',
  P: 'Enseignement',
  Q: 'Santé humaine et action sociale',
  R: 'Arts, spectacles et activités récréatives',
  S: 'Autres activités de services',
  T: "Activités des ménages en tant qu'employeurs",
  U: 'Activités extra-territoriales',
});

/**
 * Render a code through a table, falling back to the RAW CODE.
 *
 * The fallback is the load-bearing part. INSEE has revised these lists before,
 * and a partner seeing "99" is a far smaller failure than a client page that
 * crashes or silently blanks the field on a code we have not met yet.
 */
function labelOrRawCode(
  table: Readonly<Record<string, string>>,
  code: string | null | undefined,
): string | null {
  if (typeof code !== 'string') return null;
  const trimmed = code.trim();
  if (trimmed.length === 0) return null;
  return table[trimmed] ?? trimmed;
}

/** `'32'` → "250 à 499 salariés"; an unknown code → the code; blank → null. */
export function headcountBandLabel(code: string | null | undefined): string | null {
  return labelOrRawCode(HEADCOUNT_BAND_LABELS, code);
}

/** `'M'` → "Activités spécialisées, scientifiques et techniques"; unknown → the code. */
export function nafSectionLabel(code: string | null | undefined): string | null {
  return labelOrRawCode(NAF_SECTION_LABELS, code);
}
