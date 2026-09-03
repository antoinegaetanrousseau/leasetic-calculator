/**
 * The Phase 34 relationship vocabularies — single source of truth for the
 * TypeScript side of the three new CHECK-constrained columns, following the
 * Phase 33 D-02 contract ("a TypeScript union plus a DB CHECK, never a lookup
 * table"), exactly as `src/lib/pipeline/stages.ts` does for the stage column.
 *
 * The DB halves live in `src/db/schema.ts`:
 *   - RELATIONSHIP_EVENT_KINDS ←→ `relationship_events_kind_check`      (D-14)
 *   - LEAD_SOURCES             ←→ `client_relationships_lead_source_check`
 *   - REGISTRY_STATUSES        ←→ `companies_registry_status_check`
 *   - REGISTRY_STATES          ←→ `companies_registry_state_check`      (D-11)
 *
 * Each tuple below and its CHECK enumerate IDENTICAL value sets, in identical
 * order. Changing one without the other is a migration bug, not a type error:
 * TypeScript cannot see the CHECK, so a widened union compiles cleanly and then
 * fails at INSERT time in production. Any edit here needs a migration.
 *
 * `lead_source` is NOT `client_relationships.source`. That column is the Phase 31
 * D-08 provenance marker restricted to NULL | 'proposal_extraction' |
 * 'hubspot_import', and its vocabulary must never meet this one — see
 * 34-01-PLAN.md <decision_record>.
 *
 * No `server-only` import here: this module is consumed by client components
 * (the timeline filters, the relation dialog) as well as server actions and
 * query modules.
 */
import type { DictKey } from '@/lib/i18n/dictionaries';

/** D-14's six-value event vocabulary, in D-14 order. */
export const RELATIONSHIP_EVENT_KINDS = [
  'note',
  'stage_changed',
  'proposal_finalized',
  'outcome_set',
  'registry_synced',
  'next_action_set',
] as const;

export type RelationshipEventKind = (typeof RELATIONSHIP_EVENT_KINDS)[number];

/**
 * Every kind except `note` — i.e. the kinds a server action writes on the
 * caller's behalf rather than the caller typing. Drives the timeline's
 * "système" filter (ACTV-03).
 */
export const SYSTEM_EVENT_KINDS = [
  'stage_changed',
  'proposal_finalized',
  'outcome_set',
  'registry_synced',
  'next_action_set',
] as const satisfies readonly RelationshipEventKind[];

export type SystemEventKind = (typeof SYSTEM_EVENT_KINDS)[number];

export function isSystemEventKind(value: string): value is SystemEventKind {
  return (SYSTEM_EVENT_KINDS as readonly string[]).includes(value);
}

/** FICHE-04's five lead sources. */
export const LEAD_SOURCES = [
  'recommandation',
  'prospection',
  'salon',
  'site_web',
  'autre',
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

/** FICHE-02's four sync outcomes. `pending` is the column default (D-01). */
export const REGISTRY_STATUSES = ['synced', 'pending', 'not_found', 'error'] as const;

export type RegistryStatus = (typeof REGISTRY_STATUSES)[number];

/** D-11's `etat_administratif`: 'A' active, 'C' ceased. */
export const REGISTRY_STATES = ['A', 'C'] as const;

export type RegistryState = (typeof REGISTRY_STATES)[number];

/** Maps each event kind to its `clients.timeline.kind.*` dictionary key. */
export const EVENT_KIND_DICT_KEY: Record<RelationshipEventKind, DictKey> = {
  note: 'clients.timeline.kind.note',
  stage_changed: 'clients.timeline.kind.stageChanged',
  proposal_finalized: 'clients.timeline.kind.proposalFinalized',
  outcome_set: 'clients.timeline.kind.outcomeSet',
  registry_synced: 'clients.timeline.kind.registrySynced',
  next_action_set: 'clients.timeline.kind.nextActionSet',
};

/**
 * Maps each lead source to its `clients.relation.source.*` dictionary key.
 *
 * Written out explicitly rather than interpolated from the value: the enum value
 * is `site_web` (snake_case, matching the DB CHECK) while the dictionary key is
 * `.siteWeb` (camelCase, matching the dictionary's house style). Deriving one
 * from the other would produce `clients.relation.source.site_web`, which does
 * not exist.
 */
export const LEAD_SOURCE_DICT_KEY: Record<LeadSource, DictKey> = {
  recommandation: 'clients.relation.source.recommandation',
  prospection: 'clients.relation.source.prospection',
  salon: 'clients.relation.source.salon',
  site_web: 'clients.relation.source.siteWeb',
  autre: 'clients.relation.source.autre',
};

/** Maps each sync outcome to its `clients.registry.status.*` dictionary key. */
export const REGISTRY_STATUS_DICT_KEY: Record<RegistryStatus, DictKey> = {
  synced: 'clients.registry.status.synced',
  pending: 'clients.registry.status.pending',
  not_found: 'clients.registry.status.notFound',
  error: 'clients.registry.status.error',
};

/** Maps each administrative state to its `clients.registry.state.*` dictionary key. */
export const REGISTRY_STATE_DICT_KEY: Record<RegistryState, DictKey> = {
  A: 'clients.registry.state.active',
  C: 'clients.registry.state.ceased',
};
