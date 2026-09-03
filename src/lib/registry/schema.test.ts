import { describe, it, expect } from 'vitest';
import {
  registrySearchResponseSchema,
  toRegistryIdentity,
  type RegistryResult,
} from './schema';
import fixture from './__fixtures__/search-response.json';

/**
 * Phase 34 Plan 02 Task 1 — the payload parser (D-06, D-08, D-10).
 *
 * The fixture is hand-written from the measured field list in
 * docs/superpowers/specs/2026-09-03-fiche-client-design.md § 2, using EDF's
 * public SIREN (552100554) so it can never be mistaken for customer data.
 * No test here performs a network call — the parser is pure.
 */
describe('registrySearchResponseSchema (D-08 / D-10)', () => {
  it('test 1: parses the captured fixture and maps every measured field onto its key', () => {
    const parsed = registrySearchResponseSchema.safeParse(fixture);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const first = parsed.data.results[0];
    expect(first.siren).toBe('552100554');

    const identity = toRegistryIdentity(first, '552100554');
    expect(identity).toEqual({
      legalName: 'ELECTRICITE DE FRANCE',
      addressLine: '22 AVENUE DE WAGRAM 75008 PARIS 8',
      postalCode: '75008',
      city: 'PARIS 8',
      legalForm: '5599',
      nafCode: '35.11Z',
      nafSection: 'D',
      headcountBand: '52',
      foundedOn: '1955-01-01',
      registryState: 'A',
    });
  });

  it('test 2: strips unknown fields at every level (D-08 — an upstream addition cannot break us)', () => {
    const payload = {
      results: [
        {
          siren: '552100554',
          nom_raison_sociale: 'ELECTRICITE DE FRANCE',
          champ_ajoute_en_amont: 'valeur inattendue',
          siege: {
            adresse: '22 AVENUE DE WAGRAM 75008 PARIS 8',
            code_postal: '75008',
            libelle_commune: 'PARIS 8',
            nouveau_champ_siege: 'valeur inattendue',
          },
        },
      ],
      nouveau_bloc_racine: { anything: true },
    };

    const parsed = registrySearchResponseSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data).not.toHaveProperty('nouveau_bloc_racine');
    expect(parsed.data.results[0]).not.toHaveProperty('champ_ajoute_en_amont');
    expect(parsed.data.results[0].siege).not.toHaveProperty('nouveau_champ_siege');
    // The fixture's own extras are stripped too.
    const fromFixture = registrySearchResponseSchema.parse(fixture);
    expect(fromFixture.results[0]).not.toHaveProperty('categorie_entreprise');
    expect(fromFixture.results[0]).not.toHaveProperty('complements');
    expect(fromFixture.results[0].siege).not.toHaveProperty('siret');
  });

  it('test 3: an empty results array parses — not_found is the caller’s decision, not the parser’s', () => {
    const parsed = registrySearchResponseSchema.safeParse({ results: [] });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.results).toHaveLength(0);
  });

  it('test 4: every optional field may be absent — the registry omits fields for some companies', () => {
    const parsed = registrySearchResponseSchema.safeParse({
      results: [{ siren: '552100554', nom_raison_sociale: 'ELECTRICITE DE FRANCE' }],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const first = parsed.data.results[0];
    expect(first.siege).toBeUndefined();
    expect(first.activite_principale).toBeUndefined();

    const identity = toRegistryIdentity(first, '552100554');
    expect(identity).not.toBeNull();
    expect(identity?.legalName).toBe('ELECTRICITE DE FRANCE');
    // Absent upstream values become null, never '' — the column must store NULL.
    expect(identity?.addressLine).toBeNull();
    expect(identity?.city).toBeNull();
    expect(identity?.nafCode).toBeNull();
    expect(identity?.registryState).toBeNull();
  });

  it('test 5: a hostile 5 000-character name is truncated to the cap, not rejected (D-10)', () => {
    const parsed = registrySearchResponseSchema.safeParse({
      results: [{ siren: '552100554', nom_raison_sociale: 'A'.repeat(5000) }],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.results[0].nom_raison_sociale).toHaveLength(200);
  });

  it('test 6: a non-array results, or a numeric siren, fails to parse', () => {
    expect(registrySearchResponseSchema.safeParse({ results: 'nope' }).success).toBe(false);
    expect(registrySearchResponseSchema.safeParse({ results: [{ siren: 552100554 }] }).success).toBe(
      false,
    );
    expect(registrySearchResponseSchema.safeParse({}).success).toBe(false);
  });
});

describe('toRegistryIdentity (D-05 defence in depth, D-06)', () => {
  it('falls back to nom_complet when nom_raison_sociale is absent', () => {
    const result = registrySearchResponseSchema.parse({
      results: [{ siren: '552100554', nom_complet: 'ELECTRICITE DE FRANCE' }],
    }).results[0];
    expect(toRegistryIdentity(result, '552100554')?.legalName).toBe('ELECTRICITE DE FRANCE');
  });

  it('returns null when the result carries a different siren than the one requested', () => {
    const result = registrySearchResponseSchema.parse(fixture).results[0];
    expect(toRegistryIdentity(result, '123456789')).toBeNull();
  });

  it('produces no nafLabel — the registry has no label to map (D-06)', () => {
    const result: RegistryResult = registrySearchResponseSchema.parse(fixture).results[0];
    const identity = toRegistryIdentity(result, '552100554');
    expect(identity).not.toBeNull();
    expect(Object.keys(identity ?? {})).not.toContain('nafLabel');
    expect(Object.keys(identity ?? {})).toHaveLength(10);
  });
});
