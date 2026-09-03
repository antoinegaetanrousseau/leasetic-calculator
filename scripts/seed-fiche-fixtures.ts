/**
 * Phase 34 — Development-only fixture seeder for the fiche-client acceptance walkthrough.
 *
 * WHY THIS EXISTS
 * Plan 34-13 task 2 asks the operator to walk twenty-four acceptance steps across
 * TEN distinct states — a never-synced identity, an already-synced one, a lookup
 * that cannot resolve, a company that has ceased trading, a company with no SIREN
 * at all, a filled-in relationship shared with a SECOND partner, an overdue
 * follow-up, a future one that must NOT surface, a dormant one, and a populated
 * timeline. The `development` Neon branch holds NONE of them: every relationship
 * on it predates Phase 34, so every registry column is NULL, `relationship_events`
 * is empty, and not one row carries a `next_action_at`.
 *
 * This is not a hypothetical. Phase 33 shipped an acceptance walkthrough that
 * could not be performed for exactly this reason, and one of its steps was
 * reported as passing against a row that could not possibly have shown the state
 * it claimed (33-REVIEW CR-03: the fixture left `pdf_generated_at` NULL, and the
 * derivation the step checked reads it). `scripts/seed-pipeline-fixtures.ts` was
 * written after the fact to repair that. This script exists so Phase 34 does not
 * repeat it: the fixtures land FIRST, and every acceptance step names the row it
 * is checked against.
 *
 * WHAT IT IS NOT
 * Not a migration, not a production tool. It hard-refuses the production and
 * preview Neon branches with no override flag, exactly like
 * `scripts/seed-pipeline-fixtures.ts` and `scripts/seed-reconciliation-fixtures.ts`,
 * whose structure this follows.
 *
 * Run:
 *   npm run db:seed:fiche-fixtures -- --dry-run   # print, write nothing
 *   npm run db:seed:fiche-fixtures                # insert / converge (idempotent)
 *   npm run db:seed:fiche-fixtures -- --remove --dry-run
 *   npm run db:seed:fiche-fixtures -- --remove    # revert
 *
 * Idempotency and revert:
 *   `companies.source` has a CHECK that admits only NULL, 'proposal_extraction'
 *   and 'hubspot_import', so a fixture company CANNOT carry a bespoke source
 *   marker. Fixture companies are therefore identified by their exact SIREN (or,
 *   for the deliberately SIREN-less row this script OWNS, by its exact name), all
 *   listed in FIXTURES below. Timeline events carry their marker inside
 *   `payload->>'fixture'`, prefixed FIXTURE_PREFIX — `relationship_events` has no
 *   natural key and `payload` is jsonb the renderer reads by named key only
 *   (`fromStage` / `toStage`), so an extra key is inert.
 *
 *   Re-running CONVERGES rather than merely skipping: a second run restores every
 *   fixture column to its seeded value. That is deliberate — a fixture whose state
 *   the operator has just walked through (a stage change, a cleared follow-up
 *   date) must be resettable without a drop-and-reseed. It also means a re-run
 *   mid-walkthrough will undo hand-made changes to fixture rows.
 *
 *   --remove deletes the seeded events, then the fixture relationships, then any
 *   fixture company left with no relationship — and refuses outright when a
 *   fixture relationship has gained hand-added children, since both `contacts`
 *   and `relationship_events` cascade on relationship delete and would take that
 *   real data with them. It also refuses when a proposal points at a fixture
 *   relationship: that FK is ON DELETE SET NULL, so the revert would silently
 *   orphan a real proposal rather than fail loudly.
 *
 * Design notes:
 *   - THE REAL SIRENs ARE LOAD-BEARING, AND SO IS THE THIRD ONE. The existing
 *     `8234567xx` fixtures are not real SIREN numbers and the public registry
 *     will not resolve them — perfect for the not-found path, useless for proving
 *     a successful sync. REAL_SIRENS below were each verified live against
 *     `recherche-entreprises.api.gouv.fr` before being committed, accepting a
 *     candidate only when `results[0].siren` equalled the SIREN queried (D-05's
 *     assertion, performed by hand). Two are seeded; the others are held by NO
 *     fixture, because `companies.siren` is UNIQUE and the walkthrough's
 *     SIREN-correction and client-creation steps need somewhere legal to land.
 *   - F-I's `updated_at` is forced 400 days back, not 45. The "à relancer" card
 *     is limited to five rows IN SQL and ordered by staleness (34-05-SUMMARY),
 *     so a merely-past-the-threshold row can be outranked by older leftovers and
 *     pushed off the card entirely.
 *   - F-E ADOPTS `Pépinières Vaugelas` when the pipeline seeder has already run.
 *     It is that seeder's row, so this script neither writes nor deletes it; the
 *     two row sets stay disjoint — this script matches on its own prefix only,
 *     and never on the pipeline seeder's idempotency keys or its rows. Only
 *     when it is absent does this script seed — and then own — its own
 *     SIREN-less company.
 *   - No fixture uses the two reserved stages. D-04 keeps both out of reach of
 *     everything in v1.6, and this script is not an exception. An acceptance
 *     criterion greps this file for them, so they do not appear even in prose.
 *   - No proposals are seeded at all. The Propositions tab reuses Phase 33's
 *     fixtures, and step 16 asks the operator to finalize a real one by hand.
 */
import './_load-env';
import { neon } from '@neondatabase/serverless';

/** Marks every timeline event this script owns, inside `payload->>'fixture'`. */
const FIXTURE_PREFIX = 'seed-fiche-';

/**
 * Neon endpoints this script must never touch, from
 * docs/operations/neon-branch-routing.md § Lifecycle. There is deliberately no
 * override env var: a fixture seeder running against production is never correct.
 */
const FORBIDDEN_ENDPOINTS: ReadonlyArray<{ prefix: string; scope: string }> = [
  { prefix: 'ep-icy-boat-alx5o1tz', scope: 'PRODUCTION (Neon branch `main`)' },
  { prefix: 'ep-delicate-night-als4ogpc', scope: 'PREVIEW (Neon branch `preview`)' },
];

/**
 * Real, currently-active, obviously-public French SIRENs. Each was verified with
 *
 *   curl -s 'https://recherche-entreprises.api.gouv.fr/search?q=<SIREN>&per_page=1'
 *
 * and accepted only because `results[0].siren` equalled the SIREN queried. Large
 * public companies, so no customer data is implied (T-34-13-04).
 *
 * Only the first two are seeded. The last two are held by NO fixture on purpose:
 * `companies.siren` is UNIQUE, so a walkthrough step that corrects a SIREN — or
 * creates a client from one — needs a value no fixture already holds, or the
 * write fails into the bounded error toast and the step becomes unpassable.
 */
const REAL_SIRENS = {
  /** F-A — never synced, so the operator's Actualiser click fills it live. */
  seededNotYetSynced: { siren: '552032534', name: 'DANONE' },
  /** F-B — seeded as already synced, with hand-written identity values. */
  seededAlreadySynced: { siren: '380129866', name: 'ORANGE' },
  /** Held by nothing — the target of the SIREN-correction step. */
  reservedForCorrection: { siren: '542051180', name: 'TOTALENERGIES SE' },
  /** Held by nothing — the SIREN the creation step builds a brand-new client from. */
  reservedForCreation: { siren: '632012100', name: "L'OREAL" },
} as const;

/** The five partner-settable stages (D-04 keeps the other two out of reach). */
type SeedStage = 'prospect' | 'qualifie' | 'proposition_envoyee' | 'negociation' | 'perdu';

type SeedRegistryStatus = 'pending' | 'synced' | 'not_found' | 'error';

/**
 * The registry tier exactly as the SIRENE lookup would have written it (D-01).
 * Seeded by hand here ONLY because the walkthrough needs an already-synced row
 * to exist before the operator touches anything — nothing but the lookup writes
 * these columns in the application (D-02).
 */
type SeedIdentity = {
  legalName: string;
  addressLine: string;
  postalCode: string;
  city: string;
  /** The raw legal-form CODE — D-06 ships no label table for it. */
  legalForm: string;
  nafCode: string;
  /** One of the 21 NAF section letters; 'M' renders "Activités spécialisées, scientifiques et techniques". */
  nafSection: string;
  /** INSEE `tranche_effectif_salarie` CODE; '32' renders "250 à 499 salariés". */
  headcountBand: string;
  /** A `date` column — 'YYYY-MM-DD'. */
  foundedOn: string;
  /** D-11 `etat_administratif`: 'A' active, 'C' ceased. */
  registryState: 'A' | 'C';
  /** Fixed, not relative: the panel prints it and a moving date makes the step unverifiable. */
  syncedAt: string;
};

type SeedEvent = {
  /** Suffix of the `payload.fixture` marker — unique across the file. */
  key: string;
  kind: 'note' | 'stage_changed' | 'proposal_finalized' | 'outcome_set' | 'registry_synced' | 'next_action_set';
  /** `null` is the SYSTEM (D-14) — the timeline must render it as such, never blank. */
  actor: 'owner' | null;
  body: string | null;
  payload: Record<string, unknown> | null;
  /** Resolved at run time so the day buckets land on the calendar, not on an offset. */
  occurredAt: () => string;
  proves: string;
};

type SeedFixture = {
  /** The stable label the walkthrough addresses this row by. */
  label: string;
  name: string;
  /** `null` means a company with NO siren — the only route to the "no refresh control" step. */
  siren: string | null;
  registryStatus: SeedRegistryStatus;
  identity: SeedIdentity | null;
  stage: SeedStage;
  owner: 'partnerA' | 'partnerB';
  contactName: string;
  leadSource: 'recommandation' | 'prospection' | 'salon' | 'site_web' | 'autre' | null;
  description: string | null;
  /** Days from now; NEGATIVE is the past. `null` leaves `next_action_at` NULL. */
  nextActionDays: number | null;
  nextActionNote: string | null;
  /** Forces `client_relationships.updated_at` back — the staleness clock (34-05). */
  updatedAtDaysAgo: number | null;
  /** A SECOND relationship on the SAME company, owned by the other partner. */
  secondRelationshipOwner: 'partnerA' | 'partnerB' | null;
  events: readonly SeedEvent[];
  /**
   * When set, this row is ADOPTED from another seeder if a company of this name
   * already exists: nothing is written and nothing is ever deleted. Only the
   * fallback (this script's own row) is owned.
   */
  adoptExistingNamed: string | null;
  proves: string;
};

/** Local midnight, `offsetDays` from today, as a Date. Calendar arithmetic, like the timeline's own buckets. */
function startOfLocalDay(offsetDays = 0): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

/** `daysAgo` calendar days back, at `hour` local — always inside that calendar day. */
function localDayAtHour(daysAgo: number, hour: number): string {
  const d = startOfLocalDay(-daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

/** `hoursBack` ago, but never before local midnight — so it is always in TODAY's bucket. */
function earlierToday(hoursBack: number): string {
  const floor = startOfLocalDay().getTime() + 60_000;
  return new Date(Math.max(floor, Date.now() - hoursBack * 3_600_000)).toISOString();
}

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

const FIXTURES: readonly SeedFixture[] = [
  {
    label: 'F-A',
    name: 'Registre À Synchroniser',
    siren: REAL_SIRENS.seededNotYetSynced.siren,
    registryStatus: 'pending',
    identity: null,
    stage: 'qualifie',
    owner: 'partnerA',
    contactName: 'Hélène Aubry',
    leadSource: null,
    description: null,
    nextActionDays: null,
    nextActionNote: null,
    updatedAtDaysAgo: null,
    secondRelationshipOwner: null,
    events: [],
    adoptExistingNamed: null,
    proves:
      'steps 3-4 — a REAL siren that has never been synced, so Actualiser fills the panel live and appends a registry_synced event',
  },
  {
    label: 'F-B',
    name: 'Registre Déjà Synchronisé',
    siren: REAL_SIRENS.seededAlreadySynced.siren,
    registryStatus: 'synced',
    identity: {
      legalName: 'REGISTRE DEJA SYNCHRONISE SA',
      addressLine: '12 RUE DE LA REPUBLIQUE',
      postalCode: '69002',
      city: 'LYON',
      legalForm: '5710',
      nafCode: '70.22Z',
      // 'M' → "Activités spécialisées, scientifiques et techniques" (the 21-section table).
      nafSection: 'M',
      // '32' → "250 à 499 salariés" (src/lib/registry/labels.ts).
      headcountBand: '32',
      foundedOn: '1998-04-15',
      registryState: 'A',
      syncedAt: '2026-08-12T09:30:00.000Z',
    },
    stage: 'proposition_envoyee',
    owner: 'partnerA',
    contactName: 'Marc Bertrand',
    leadSource: null,
    description: null,
    nextActionDays: null,
    nextActionNote: null,
    updatedAtDaysAgo: null,
    secondRelationshipOwner: null,
    events: [],
    adoptExistingNamed: null,
    proves:
      'steps 5-6, 10-11, 21-22 — every identity field populated and read-only, with a FIXED past sync date the step can name',
  },
  {
    label: 'F-C',
    name: 'Registre Introuvable',
    siren: '823456791',
    registryStatus: 'pending',
    identity: null,
    stage: 'prospect',
    owner: 'partnerA',
    contactName: 'Sophie Castel',
    leadSource: null,
    description: null,
    nextActionDays: null,
    nextActionNote: null,
    updatedAtDaysAgo: null,
    secondRelationshipOwner: null,
    events: [],
    adoptExistingNamed: null,
    proves: 'step 7 — a syntactically valid siren the registry cannot resolve, twice in a row, with no partial fill',
  },
  {
    label: 'F-D',
    name: 'Société Cessée Exemple',
    siren: '823456792',
    registryStatus: 'synced',
    identity: {
      legalName: 'SOCIETE CESSEE EXEMPLE SARL',
      addressLine: '4 PLACE DU MARCHE',
      postalCode: '33000',
      city: 'BORDEAUX',
      legalForm: '5499',
      nafCode: '47.11D',
      nafSection: 'G',
      headcountBand: '12',
      foundedOn: '2004-09-01',
      // D-11: 'C' is the whole point of this row.
      registryState: 'C',
      syncedAt: '2026-08-20T14:05:00.000Z',
    },
    stage: 'qualifie',
    owner: 'partnerA',
    contactName: 'Damien Ferrand',
    leadSource: null,
    description: null,
    nextActionDays: null,
    nextActionNote: null,
    updatedAtDaysAgo: null,
    secondRelationshipOwner: null,
    events: [],
    adoptExistingNamed: null,
    proves: 'step 8 (D-11) — a company that has ceased trading, legible at a glance and not as an accent fill',
  },
  {
    label: 'F-E',
    name: 'Sans SIREN Exemple',
    siren: null,
    registryStatus: 'pending',
    identity: null,
    stage: 'qualifie',
    owner: 'partnerA',
    contactName: 'Claire Vaugelas',
    leadSource: null,
    description: null,
    nextActionDays: null,
    nextActionNote: null,
    updatedAtDaysAgo: null,
    secondRelationshipOwner: null,
    events: [],
    // The pipeline seeder's SIREN-less row. Adopted read-only when present.
    adoptExistingNamed: 'Pépinières Vaugelas',
    proves: 'step 9 — no siren at all, so the Actualiser control must not exist: there is nothing to look up',
  },
  {
    label: 'F-F',
    name: 'Relation Renseignée',
    siren: '823456793',
    registryStatus: 'pending',
    identity: null,
    stage: 'negociation',
    owner: 'partnerA',
    contactName: 'Yann Delcourt',
    leadSource: 'salon',
    description:
      'Rencontrés sur le salon Batimat, stand B12. Renouvellent 40 postes et 6 imprimantes au T1 2027, budget déjà arbitré.',
    nextActionDays: null,
    nextActionNote: null,
    updatedAtDaysAgo: null,
    // The OTHER partner, on the SAME company — this is criterion 3's fixture.
    secondRelationshipOwner: 'partnerB',
    events: [],
    adoptExistingNamed: null,
    proves:
      'steps 12, 15-17 — a filled private tier plus a SECOND relationship on the same company owned by the other partner, whose private tier is empty',
  },
  {
    label: 'F-G',
    name: 'Relance En Retard',
    siren: '823456794',
    registryStatus: 'pending',
    identity: null,
    stage: 'qualifie',
    owner: 'partnerA',
    contactName: 'Inès Rambaud',
    leadSource: 'prospection',
    description: null,
    // due: next_action_at IS NOT NULL AND next_action_at <= now() (34-05).
    nextActionDays: -3,
    nextActionNote: 'Rappeler pour confirmer le budget 2027.',
    updatedAtDaysAgo: null,
    secondRelationshipOwner: null,
    events: [],
    adoptExistingNamed: null,
    proves: 'steps 18-19 — the DUE bucket: a next action three days in the past, which must head the à-relancer card',
  },
  {
    label: 'F-H',
    name: 'Relance À Venir',
    siren: '823456795',
    registryStatus: 'pending',
    identity: null,
    stage: 'qualifie',
    owner: 'partnerA',
    contactName: 'Bruno Lachaud',
    leadSource: 'site_web',
    description: null,
    // Neither due nor stale — on schedule, and the single most likely misreading
    // of "driven by next-action date" (34-05). It must NOT appear on the card.
    nextActionDays: 10,
    nextActionNote: 'Relance prévue après leur clôture comptable.',
    updatedAtDaysAgo: null,
    secondRelationshipOwner: null,
    events: [],
    adoptExistingNamed: null,
    proves: 'step 18 — the NEGATIVE case: a future next action is on schedule and must be absent from the card',
  },
  {
    label: 'F-I',
    name: 'Relance Dormante',
    siren: '823456796',
    registryStatus: 'pending',
    identity: null,
    stage: 'prospect',
    owner: 'partnerA',
    contactName: 'Théo Marsan',
    leadSource: 'recommandation',
    description: null,
    // stale: next_action_at IS NULL AND updated_at < now() - interval '30 days'.
    nextActionDays: null,
    nextActionNote: null,
    // 400, not 45: the card is LIMIT 5 in SQL and ordered by staleness, so a row
    // that merely clears the 30-day threshold can be outranked off the list.
    updatedAtDaysAgo: 400,
    secondRelationshipOwner: null,
    events: [],
    adoptExistingNamed: null,
    proves: 'step 18 — the STALE bucket: no next action and untouched long enough to outrank every leftover row',
  },
  {
    label: 'F-J',
    name: 'Historique Complet',
    siren: '823456797',
    registryStatus: 'synced',
    identity: {
      legalName: 'HISTORIQUE COMPLET SAS',
      addressLine: '27 AVENUE JEAN JAURES',
      postalCode: '44000',
      city: 'NANTES',
      legalForm: '5710',
      nafCode: '62.02A',
      nafSection: 'J',
      headcountBand: '21',
      foundedOn: '2012-06-11',
      registryState: 'A',
      syncedAt: '2026-08-28T08:15:00.000Z',
    },
    stage: 'negociation',
    owner: 'partnerA',
    contactName: 'Nadia Chevrier',
    leadSource: 'autre',
    description: null,
    nextActionDays: null,
    nextActionNote: null,
    updatedAtDaysAgo: null,
    secondRelationshipOwner: null,
    events: [
      {
        key: 'j1',
        kind: 'note',
        actor: 'owner',
        body: "Appel de suivi : ils valident le principe, il reste à caler la durée. Relance à prévoir après leur comité d'investissement.",
        payload: null,
        occurredAt: () => earlierToday(2),
        proves: 'step 13 — a NOTE with a body and a real author, in the TODAY bucket',
      },
      {
        key: 'j2',
        kind: 'stage_changed',
        actor: 'owner',
        // D-21 / WR-16: BOTH stages, so the timeline sentence renders in full.
        payload: { fromStage: 'qualifie', toStage: 'negociation' },
        body: null,
        occurredAt: () => localDayAtHour(1, 15),
        proves: 'step 13 — a system event carrying fromStage AND toStage, in the YESTERDAY bucket',
      },
      {
        key: 'j3',
        kind: 'registry_synced',
        actor: 'owner',
        body: null,
        payload: null,
        occurredAt: () => localDayAtHour(3, 10),
        proves: 'step 13 — a third kind, attributed, in the EARLIER bucket',
      },
      {
        key: 'j4',
        kind: 'next_action_set',
        // NULL actor: D-14's "the system did it". ACTV-02 requires this to render
        // as the system, never as a blank author and never as the reader's name.
        actor: null,
        body: null,
        payload: null,
        occurredAt: () => localDayAtHour(5, 9),
        proves: 'step 13 — the actor_id = NULL event, which must render as the system',
      },
    ],
    adoptExistingNamed: null,
    proves: 'steps 13-14 — ONE chronological list across three day buckets, four kinds, and a system-attributed event',
  },
];

/** Fixture SIRENs, for identification on --remove. */
const FIXTURE_SIRENS = FIXTURES.map((f) => f.siren).filter((s): s is string => s !== null);
/**
 * Names of SIREN-less fixture companies this script OWNS. An adopted row's name
 * (`adoptExistingNamed`) is deliberately absent: it belongs to another seeder and
 * --remove must never reach it (T-34-13-03).
 */
const FIXTURE_OWNED_SIRENLESS_NAMES = FIXTURES.filter((f) => f.siren === null).map((f) => f.name);
/** Every contact name this script inserts — anything else on a fixture row is hand-added. */
const FIXTURE_CONTACT_NAMES = FIXTURES.map((f) => f.contactName);

function fail(message: string): never {
  console.error('[seed-fiche] FATAL: ' + message);
  process.exit(2);
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const remove = process.argv.includes('--remove');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    fail('DATABASE_URL is not set.');
  }

  // bug_011 discipline: URL.hostname, never URL.host — `host` carries the port,
  // so a connection string with an explicit :5432 would slip a prefix match.
  let hostname: string;
  try {
    hostname = new URL(databaseUrl).hostname;
  } catch {
    fail('DATABASE_URL is malformed.');
  }

  const forbidden = FORBIDDEN_ENDPOINTS.find((e) => hostname.startsWith(e.prefix));
  if (forbidden) {
    fail(
      'refusing to seed fixtures into ' +
        forbidden.scope +
        ' (' +
        hostname +
        '). This script is development-only and has no override flag.',
    );
  }
  console.log('[seed-fiche] target host: ' + hostname);

  const sql = neon(databaseUrl);

  // Two DISTINCT partner accounts. Resolved the same way the pipeline seeder
  // resolves them, and NOT inherited by "copies the sibling's structure": the
  // cross-partner isolation step is walked by signing in as the SECOND one, and
  // F-F's second relationship cannot exist without it.
  const partners = (await sql`
    select id, email from users where role = 'partner' order by email limit 2`) as Array<{
    id: string;
    email: string;
  }>;
  if (partners.length < 2) {
    fail(
      'need at least 2 users with role=partner to build the cross-partner fixture; found ' +
        String(partners.length) +
        '.',
    );
  }
  const ownerIds = { partnerA: partners[0].id, partnerB: partners[1].id };
  const ownerIdList = [partners[0].id, partners[1].id];

  if (remove) {
    // Every statement below is scoped to the SEEDED owners as well as the fixture
    // companies. Company identity alone is not enough — `companies` is a SHARED
    // registry (CRM-01), so a partner may have attached their own relationship to
    // one of these companies since the seed, and an unscoped delete would take
    // that relationship and cascade away their contacts and their timeline
    // (33-REVIEW CR-05).
    //
    // Two of the fixture companies carry REAL sirens, which is precisely the case
    // where a hand-made relationship is plausible. The three guards below are the
    // mitigation, and --remove --dry-run is inspected before --remove is run.

    // Guard 1: the contacts FK cascades on relationship delete. `<> all` — never
    // `<> any`, which is true whenever the name differs from at least ONE element
    // of the array and therefore fires on every row (33-REVIEW CR-02).
    const handEnteredContacts = (await sql`
      select count(*)::int as n from contacts c
      join client_relationships r on r.id = c.client_relationship_id
      join companies co on co.id = r.company_id
      where (co.siren = any(${FIXTURE_SIRENS}) or co.name = any(${FIXTURE_OWNED_SIRENLESS_NAMES}))
        and r.owner_id = any(${ownerIdList})
        and c.name <> all(${FIXTURE_CONTACT_NAMES})`) as Array<{ n: number }>;
    if (handEnteredContacts[0].n > 0) {
      fail(
        String(handEnteredContacts[0].n) +
          ' hand-entered contact(s) live on fixture relationships and would be destroyed by the ' +
          'cascade. Refusing to revert. Move or delete them deliberately first.',
      );
    }

    // Guard 2: relationship_events cascades too, and the walkthrough asks the
    // operator to WRITE notes on fixture rows. A note a partner typed is real
    // data even though the row it hangs off is a fixture.
    const handEnteredEvents = (await sql`
      select count(*)::int as n from relationship_events e
      join client_relationships r on r.id = e.client_relationship_id
      join companies co on co.id = r.company_id
      where (co.siren = any(${FIXTURE_SIRENS}) or co.name = any(${FIXTURE_OWNED_SIRENLESS_NAMES}))
        and r.owner_id = any(${ownerIdList})
        and coalesce(e.payload->>'fixture', '') not like ${FIXTURE_PREFIX + '%'}`) as Array<{ n: number }>;
    if (handEnteredEvents[0].n > 0) {
      fail(
        String(handEnteredEvents[0].n) +
          ' hand-added timeline event(s) live on fixture relationships and would be destroyed by the ' +
          'cascade. Refusing to revert.',
      );
    }

    // Guard 3: proposals.client_relationship_id is ON DELETE SET NULL, so the
    // revert would not fail — it would quietly detach a real proposal from its
    // client. Refuse instead of losing the link.
    const attachedProposals = (await sql`
      select count(*)::int as n from proposals p
      join client_relationships r on r.id = p.client_relationship_id
      join companies co on co.id = r.company_id
      where (co.siren = any(${FIXTURE_SIRENS}) or co.name = any(${FIXTURE_OWNED_SIRENLESS_NAMES}))
        and r.owner_id = any(${ownerIdList})`) as Array<{ n: number }>;
    if (attachedProposals[0].n > 0) {
      fail(
        String(attachedProposals[0].n) +
          ' proposal(s) point at fixture relationships. The FK is ON DELETE SET NULL, so reverting ' +
          'would silently orphan them. Refusing to revert.',
      );
    }

    if (dryRun) {
      const preview = (await sql`select
        (select count(*)::int from relationship_events e
          join client_relationships r on r.id = e.client_relationship_id
          join companies co on co.id = r.company_id
          where (co.siren = any(${FIXTURE_SIRENS}) or co.name = any(${FIXTURE_OWNED_SIRENLESS_NAMES}))
            and r.owner_id = any(${ownerIdList})) as fixture_events,
        (select count(*)::int from client_relationships r join companies co on co.id = r.company_id
          where (co.siren = any(${FIXTURE_SIRENS}) or co.name = any(${FIXTURE_OWNED_SIRENLESS_NAMES}))
            and r.owner_id = any(${ownerIdList})) as relationships,
        (select count(*)::int from contacts c join client_relationships r on r.id = c.client_relationship_id
          join companies co on co.id = r.company_id
          where (co.siren = any(${FIXTURE_SIRENS}) or co.name = any(${FIXTURE_OWNED_SIRENLESS_NAMES}))
            and r.owner_id = any(${ownerIdList})) as contacts_cascaded,
        (select count(*)::int from companies
          where siren = any(${FIXTURE_SIRENS}) or name = any(${FIXTURE_OWNED_SIRENLESS_NAMES})) as companies`) as Array<
        Record<string, number>
      >;
      const rows = (await sql`
        select co.name, co.siren, r.owner_id from client_relationships r
        join companies co on co.id = r.company_id
        where (co.siren = any(${FIXTURE_SIRENS}) or co.name = any(${FIXTURE_OWNED_SIRENLESS_NAMES}))
          and r.owner_id = any(${ownerIdList})
        order by co.name`) as Array<{ name: string; siren: string | null; owner_id: string }>;
      console.log('[seed-fiche] DRY RUN — would delete:');
      console.log('  ' + JSON.stringify(preview[0], null, 2).replace(/\n/g, '\n  '));
      for (const r of rows) {
        console.log(
          '  - ' +
            r.name +
            ' (siren=' +
            (r.siren ?? 'NONE') +
            ', owner=' +
            (r.owner_id === ownerIds.partnerA ? partners[0].email : partners[1].email) +
            ')',
        );
      }
      const adopted = FIXTURES.filter((f) => f.adoptExistingNamed !== null).map((f) => f.adoptExistingNamed);
      console.log('  NOT touched (adopted from another seeder): ' + adopted.join(', '));
      return;
    }

    const events = await sql`
      delete from relationship_events e
      using client_relationships r, companies co
      where r.id = e.client_relationship_id
        and co.id = r.company_id
        and (co.siren = any(${FIXTURE_SIRENS}) or co.name = any(${FIXTURE_OWNED_SIRENLESS_NAMES}))
        and r.owner_id = any(${ownerIdList})
      returning e.id`;
    const rels = await sql`
      delete from client_relationships r
      using companies co
      where co.id = r.company_id
        and (co.siren = any(${FIXTURE_SIRENS}) or co.name = any(${FIXTURE_OWNED_SIRENLESS_NAMES}))
        and r.owner_id = any(${ownerIdList})
      returning r.id`;
    // Only companies left with no relationship at all — never one another
    // partner has since attached to.
    const cos = await sql`
      delete from companies co
      where (co.siren = any(${FIXTURE_SIRENS}) or co.name = any(${FIXTURE_OWNED_SIRENLESS_NAMES}))
        and not exists (select 1 from client_relationships r where r.company_id = co.id)
      returning co.id`;

    console.log('[seed-fiche] revert complete:');
    console.log('  timeline events deleted:  ' + String(events.length));
    console.log('  relationships deleted:    ' + String(rels.length) + ' (contacts cascaded)');
    console.log('  companies deleted:        ' + String(cos.length));
    return;
  }

  console.log('[seed-fiche] partnerA (walkthrough account) = ' + partners[0].email);
  console.log('[seed-fiche] partnerB (cross-partner step)  = ' + partners[1].email);

  if (dryRun) {
    console.log('[seed-fiche] DRY RUN — no rows will be written.\n');
    for (const f of FIXTURES) {
      console.log(
        '  [' +
          f.label +
          '] ' +
          f.name +
          ' | siren=' +
          (f.siren ?? 'NONE') +
          ' | registry=' +
          f.registryStatus +
          (f.identity ? ' (identity populated, état=' + f.identity.registryState + ')' : ' (identity NULL)') +
          ' | stage=' +
          f.stage +
          ' | ' +
          f.owner,
      );
      console.log('       proves: ' + f.proves);
      if (f.adoptExistingNamed !== null) {
        console.log(
          '       ADOPTS "' + f.adoptExistingNamed + '" if it exists (written by no one here, deleted by no one here);',
        );
        console.log('       otherwise inserts "' + f.name + '" with siren NULL, owned by this script.');
      }
      if (f.leadSource !== null || f.description !== null) {
        console.log(
          '       private tier: lead_source=' +
            String(f.leadSource) +
            (f.description === null ? '' : ', description set'),
        );
      }
      if (f.nextActionDays !== null) {
        console.log(
          '       next_action_at = ' +
            String(f.nextActionDays) +
            ' days from now (' +
            (f.nextActionDays < 0 ? 'DUE' : 'on schedule — must NOT appear on the card') +
            ')',
        );
      }
      if (f.updatedAtDaysAgo !== null) {
        console.log('       updated_at forced ' + String(f.updatedAtDaysAgo) + ' days back (STALE bucket)');
      }
      if (f.secondRelationshipOwner !== null) {
        console.log(
          '       + SECOND relationship on the same company owned by ' +
            f.secondRelationshipOwner +
            ', private tier NULL',
        );
      }
      for (const e of f.events) {
        console.log(
          '       event ' +
            e.key +
            ' | kind=' +
            e.kind +
            ' | actor=' +
            (e.actor ?? 'NULL (system)') +
            ' | occurred=' +
            e.occurredAt(),
        );
        console.log('         proves: ' + e.proves);
      }
    }
    console.log('\n[seed-fiche] SIRENs held by NO fixture, for the walkthrough steps that need a free one:');
    console.log(
      '  creation step:   ' +
        REAL_SIRENS.reservedForCreation.siren +
        ' (' +
        REAL_SIRENS.reservedForCreation.name +
        ')',
    );
    console.log(
      '  correction step: ' +
        REAL_SIRENS.reservedForCorrection.siren +
        ' (' +
        REAL_SIRENS.reservedForCorrection.name +
        ')',
    );
    console.log('\n[seed-fiche] dry run complete. Re-run without --dry-run to insert.');
    return;
  }

  let companiesInserted = 0;
  let relationshipsInserted = 0;
  let eventsInserted = 0;
  let converged = 0;
  const navigation: Array<{ label: string; name: string; relationshipId: string; owner: string }> = [];

  for (const f of FIXTURES) {
    const ownerId = ownerIds[f.owner];

    // ── company ────────────────────────────────────────────────────────────
    // An adopted row is READ, never written and never counted as ours.
    let adopted = false;
    let companyId: string | undefined;

    if (f.adoptExistingNamed !== null) {
      const donorCompany = (await sql`
        select id from companies where name = ${f.adoptExistingNamed} and siren is null limit 1`) as Array<{
        id: string;
      }>;
      if (donorCompany[0]) {
        companyId = donorCompany[0].id;
        adopted = true;
        console.log('[seed-fiche] ' + f.label + ' adopts existing "' + f.adoptExistingNamed + '" — not written, not owned.');
      }
    }

    if (companyId === undefined) {
      const existingCompany = (f.siren === null
        ? await sql`select id from companies where name = ${f.name} limit 1`
        : await sql`select id from companies where siren = ${f.siren} limit 1`) as Array<{ id: string }>;

      if (existingCompany[0]) {
        companyId = existingCompany[0].id;
        // Converge the registry tier back to the fixture's declared state, so a
        // re-run after the operator has clicked Actualiser restores the fixture.
        await sql`
          update companies set
            name = ${f.name},
            registry_status = ${f.registryStatus},
            legal_name = ${f.identity?.legalName ?? null},
            address_line = ${f.identity?.addressLine ?? null},
            postal_code = ${f.identity?.postalCode ?? null},
            city = ${f.identity?.city ?? null},
            legal_form = ${f.identity?.legalForm ?? null},
            naf_code = ${f.identity?.nafCode ?? null},
            naf_section = ${f.identity?.nafSection ?? null},
            headcount_band = ${f.identity?.headcountBand ?? null},
            founded_on = ${f.identity?.foundedOn ?? null},
            registry_state = ${f.identity?.registryState ?? null},
            registry_synced_at = ${f.identity?.syncedAt ?? null},
            updated_at = now()
          where id = ${companyId}`;
        converged += 1;
      } else {
        const insertedCompany = (await sql`
          insert into companies
            (name, siren, registry_status, legal_name, address_line, postal_code, city,
             legal_form, naf_code, naf_section, headcount_band, founded_on, registry_state,
             registry_synced_at)
          values
            (${f.name}, ${f.siren}, ${f.registryStatus},
             ${f.identity?.legalName ?? null}, ${f.identity?.addressLine ?? null},
             ${f.identity?.postalCode ?? null}, ${f.identity?.city ?? null},
             ${f.identity?.legalForm ?? null}, ${f.identity?.nafCode ?? null},
             ${f.identity?.nafSection ?? null}, ${f.identity?.headcountBand ?? null},
             ${f.identity?.foundedOn ?? null}, ${f.identity?.registryState ?? null},
             ${f.identity?.syncedAt ?? null})
          returning id`) as Array<{ id: string }>;
        companyId = insertedCompany[0].id;
        companiesInserted += 1;
      }
    }

    // ── relationship (unique on company_id + owner_id) ──────────────────────
    const nextActionAt = f.nextActionDays === null ? null : daysFromNow(f.nextActionDays);
    const updatedAt = f.updatedAtDaysAgo === null ? new Date().toISOString() : daysFromNow(-f.updatedAtDaysAgo);

    const existingRelationship = (await sql`
      select id from client_relationships
      where company_id = ${companyId} and owner_id = ${ownerId} limit 1`) as Array<{ id: string }>;

    let relationshipId: string;
    if (adopted && existingRelationship[0]) {
      // The adopted row's relationship belongs to the other seeder too. Read it,
      // report it, write nothing.
      relationshipId = existingRelationship[0].id;
    } else {
      const upserted = (await sql`
        insert into client_relationships
          (company_id, owner_id, stage, lead_source, description, next_action_at, next_action_note, updated_at)
        values
          (${companyId}, ${ownerId}, ${f.stage}, ${f.leadSource}, ${f.description},
           ${nextActionAt}, ${f.nextActionNote}, ${updatedAt})
        on conflict (company_id, owner_id) do update set
          stage = excluded.stage,
          lead_source = excluded.lead_source,
          description = excluded.description,
          next_action_at = excluded.next_action_at,
          next_action_note = excluded.next_action_note,
          updated_at = excluded.updated_at
        returning id`) as Array<{ id: string }>;
      relationshipId = upserted[0].id;
      if (!existingRelationship[0]) relationshipsInserted += 1;
    }

    navigation.push({
      label: f.label,
      name: adopted ? (f.adoptExistingNamed ?? f.name) : f.name,
      relationshipId,
      owner: f.owner === 'partnerA' ? partners[0].email : partners[1].email,
    });

    // ── contact, so the Contacts tab is not empty ───────────────────────────
    if (!adopted) {
      await sql`
        insert into contacts (client_relationship_id, name, role)
        select ${relationshipId}, ${f.contactName}, 'Gérant'
        where not exists (
          select 1 from contacts where client_relationship_id = ${relationshipId} and name = ${f.contactName})`;
    }

    // ── the SECOND relationship on the SAME company, other partner ──────────
    if (f.secondRelationshipOwner !== null && !adopted) {
      const secondOwnerId = ownerIds[f.secondRelationshipOwner];
      const existingSecond = (await sql`
        select id from client_relationships
        where company_id = ${companyId} and owner_id = ${secondOwnerId} limit 1`) as Array<{ id: string }>;
      // Private tier explicitly NULL: that emptiness IS what the cross-partner
      // step measures (D-01, CRM-02).
      const second = (await sql`
        insert into client_relationships
          (company_id, owner_id, stage, lead_source, description, next_action_at, next_action_note)
        values (${companyId}, ${secondOwnerId}, 'prospect', null, null, null, null)
        on conflict (company_id, owner_id) do update set
          lead_source = excluded.lead_source,
          description = excluded.description,
          next_action_at = excluded.next_action_at,
          next_action_note = excluded.next_action_note
        returning id`) as Array<{ id: string }>;
      if (!existingSecond[0]) relationshipsInserted += 1;
      navigation.push({
        label: f.label + ' (2nd partner)',
        name: f.name,
        relationshipId: second[0].id,
        owner: f.secondRelationshipOwner === 'partnerA' ? partners[0].email : partners[1].email,
      });
    }

    // ── timeline events ────────────────────────────────────────────────────
    for (const e of f.events) {
      const marker = FIXTURE_PREFIX + e.key;
      const payload = { ...(e.payload ?? {}), fixture: marker };
      const actorId = e.actor === null ? null : ownerId;
      const occurredAt = e.occurredAt();

      const present = (await sql`
        select id from relationship_events
        where client_relationship_id = ${relationshipId} and payload->>'fixture' = ${marker}
        limit 1`) as Array<{ id: string }>;

      if (present[0]) {
        // Converge the timestamp so the day buckets stay correct however many
        // days after the seed the walkthrough is actually walked.
        await sql`
          update relationship_events
          set occurred_at = ${occurredAt}, actor_id = ${actorId}, body = ${e.body},
              payload = ${JSON.stringify(payload)}::jsonb
          where id = ${present[0].id}`;
        continue;
      }

      await sql`
        insert into relationship_events (client_relationship_id, kind, actor_id, occurred_at, body, payload)
        values (${relationshipId}, ${e.kind}, ${actorId}, ${occurredAt}, ${e.body},
                ${JSON.stringify(payload)}::jsonb)`;
      eventsInserted += 1;
    }
  }

  console.log(
    '[seed-fiche] done — companies +' +
      String(companiesInserted) +
      ', relationships +' +
      String(relationshipsInserted) +
      ', timeline events +' +
      String(eventsInserted) +
      ' (' +
      String(converged) +
      ' company row(s) converged back to their fixture state)',
  );
  console.log('');
  console.log('[seed-fiche] ACCOUNTS');
  console.log('  primary walkthrough account: ' + partners[0].email);
  console.log('  second partner (the cross-partner isolation step is walked as THIS one): ' + partners[1].email);
  console.log('');
  console.log('[seed-fiche] SIRENs held by NO fixture — the steps that need a free one must use these:');
  console.log(
    '  client-creation step:   ' +
      REAL_SIRENS.reservedForCreation.siren +
      ' (' +
      REAL_SIRENS.reservedForCreation.name +
      ')',
  );
  console.log(
    '  SIREN-correction step:  ' +
      REAL_SIRENS.reservedForCorrection.siren +
      ' (' +
      REAL_SIRENS.reservedForCorrection.name +
      ')',
  );
  console.log('');
  console.log('[seed-fiche] NAVIGATION — /clients/<id> per label:');
  for (const n of navigation) {
    console.log('  ' + n.label.padEnd(20) + n.name.padEnd(28) + '/clients/' + n.relationshipId + '  [' + n.owner + ']');
  }
}

main().catch((e: unknown) => {
  console.error('[seed-fiche] unexpected failure:', e);
  process.exit(1);
});
