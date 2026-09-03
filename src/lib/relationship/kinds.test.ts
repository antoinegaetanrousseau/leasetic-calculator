import { describe, expect, it } from 'vitest';
import {
  EVENT_KIND_DICT_KEY,
  isSystemEventKind,
  LEAD_SOURCE_DICT_KEY,
  LEAD_SOURCES,
  REGISTRY_STATE_DICT_KEY,
  REGISTRY_STATES,
  REGISTRY_STATUS_DICT_KEY,
  REGISTRY_STATUSES,
  RELATIONSHIP_EVENT_KINDS,
  SYSTEM_EVENT_KINDS,
} from './kinds';

describe('RELATIONSHIP_EVENT_KINDS', () => {
  it('has exactly 6 entries in D-14 order', () => {
    expect(RELATIONSHIP_EVENT_KINDS).toEqual([
      'note',
      'stage_changed',
      'proposal_finalized',
      'outcome_set',
      'registry_synced',
      'next_action_set',
    ]);
    expect(RELATIONSHIP_EVENT_KINDS).toHaveLength(6);
  });
});

describe('SYSTEM_EVENT_KINDS', () => {
  it('is RELATIONSHIP_EVENT_KINDS minus "note"', () => {
    expect(SYSTEM_EVENT_KINDS).toEqual(RELATIONSHIP_EVENT_KINDS.filter((k) => k !== 'note'));
  });

  it('isSystemEventKind is true for every kind except "note"', () => {
    for (const kind of RELATIONSHIP_EVENT_KINDS) {
      expect(isSystemEventKind(kind)).toBe(kind !== 'note');
    }
  });

  it('isSystemEventKind is false for an arbitrary non-kind string', () => {
    expect(isSystemEventKind('not_a_kind')).toBe(false);
  });
});

describe('LEAD_SOURCES', () => {
  it('has exactly the 5 FICHE-04 values', () => {
    expect(LEAD_SOURCES).toEqual(['recommandation', 'prospection', 'salon', 'site_web', 'autre']);
    expect(LEAD_SOURCES).toHaveLength(5);
  });
});

describe('REGISTRY_STATUSES', () => {
  it('has exactly the 4 sync outcomes', () => {
    expect(REGISTRY_STATUSES).toEqual(['synced', 'pending', 'not_found', 'error']);
    expect(REGISTRY_STATUSES).toHaveLength(4);
  });
});

describe('REGISTRY_STATES', () => {
  it('is D-11\'s two-value etat_administratif vocabulary', () => {
    expect(REGISTRY_STATES).toEqual(['A', 'C']);
  });
});

describe('dictionary key maps', () => {
  it('EVENT_KIND_DICT_KEY has one clients.timeline.kind.* entry per event kind', () => {
    expect(Object.keys(EVENT_KIND_DICT_KEY)).toHaveLength(RELATIONSHIP_EVENT_KINDS.length);
    for (const kind of RELATIONSHIP_EVENT_KINDS) {
      expect(EVENT_KIND_DICT_KEY[kind].startsWith('clients.timeline.kind.')).toBe(true);
    }
  });

  it('LEAD_SOURCE_DICT_KEY has one clients.relation.source.* entry per lead source', () => {
    expect(Object.keys(LEAD_SOURCE_DICT_KEY)).toHaveLength(LEAD_SOURCES.length);
    for (const source of LEAD_SOURCES) {
      expect(LEAD_SOURCE_DICT_KEY[source].startsWith('clients.relation.source.')).toBe(true);
    }
  });

  it('maps the site_web VALUE onto the .siteWeb KEY, not onto .site_web', () => {
    // The enum value is snake_case (it is the DB CHECK value); the dictionary key
    // is camelCase. Interpolating the value would mint a key that does not exist.
    expect(LEAD_SOURCE_DICT_KEY.site_web).toBe('clients.relation.source.siteWeb');
  });

  it('REGISTRY_STATUS_DICT_KEY has one clients.registry.status.* entry per status', () => {
    expect(Object.keys(REGISTRY_STATUS_DICT_KEY)).toHaveLength(REGISTRY_STATUSES.length);
    for (const status of REGISTRY_STATUSES) {
      expect(REGISTRY_STATUS_DICT_KEY[status].startsWith('clients.registry.status.')).toBe(true);
    }
  });

  it('REGISTRY_STATE_DICT_KEY has one clients.registry.state.* entry per state', () => {
    expect(Object.keys(REGISTRY_STATE_DICT_KEY)).toHaveLength(REGISTRY_STATES.length);
    for (const state of REGISTRY_STATES) {
      expect(REGISTRY_STATE_DICT_KEY[state].startsWith('clients.registry.state.')).toBe(true);
    }
  });
});
