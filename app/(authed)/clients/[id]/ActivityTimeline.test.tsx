/**
 * Phase 34 Plan 11 Task 1 — ActivityTimeline (ACTV-01, ACTV-02, D-19).
 *
 * Coverage (per <behavior>):
 *   1.  A mixed array renders as ONE list, in the order given.
 *   2.  The filter defaults to "all" — a note and a system event are both visible.
 *   3.  "notes" hides system events, "system" hides notes, and returning to
 *       "all" reproduces the initial DOM order exactly (a lens, not two lists).
 *   4.  A null actor renders as the system.
 *   5.  A present actor renders that actor's label.
 *   6.  stage_changed interpolates both stage labels at the call site.
 *   7.  stage_changed with a null fromStage falls back to the kind label.
 *   8.  Day buckets render today / yesterday / earlier in order, empty ones absent.
 *   9.  Zero events renders the UIC-05 empty state.
 *   10. Structural — the component reads no clock of its own.
 *   11. A body carrying markup renders as text.
 *
 * The clock is a fixture and every fixture instant is derived FROM it at local
 * noon, so the suite is timezone-independent: a hand-written wall-clock literal
 * would fall onto the previous local day west of UTC.
 */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { t } from '@/lib/i18n/dictionaries';
import type { RelationshipEventListRow } from '@/lib/db/queries';
import { ActivityTimeline } from './ActivityTimeline';

const NOW = Date.parse('2026-09-03T10:00:00Z');
const SOURCE_PATH = 'app/(authed)/clients/[id]/ActivityTimeline.tsx';

/** Local noon, `dayOffset` days from the local day containing NOW. */
function atLocalNoon(dayOffset: number): Date {
  const d = new Date(NOW);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  return d;
}

function makeEvent(over: Partial<RelationshipEventListRow> & { id: string }): RelationshipEventListRow {
  return {
    id: over.id,
    kind: over.kind ?? 'note',
    actorId: over.actorId === undefined ? 'user-1' : over.actorId,
    actorDisplayName: over.actorDisplayName === undefined ? 'Antoine Rousseau' : over.actorDisplayName,
    occurredAt: over.occurredAt ?? atLocalNoon(0),
    body: over.body ?? null,
    payload: over.payload ?? null,
  };
}

/** The rendered stream, newest first, as event ids. */
function renderedOrder(): string[] {
  return screen
    .queryAllByTestId('timeline-event')
    .map((el) => el.getAttribute('data-event-id') ?? '');
}

function clickFilter(name: string): void {
  fireEvent.click(screen.getByRole('button', { name }));
}

const MIXED: RelationshipEventListRow[] = [
  makeEvent({ id: 'ev-1', kind: 'note', body: 'Rappelé la DAF', occurredAt: atLocalNoon(0) }),
  makeEvent({
    id: 'ev-2',
    kind: 'stage_changed',
    actorId: 'user-1',
    occurredAt: atLocalNoon(0),
    payload: { fromStage: 'prospect', toStage: 'qualifie' },
  }),
  makeEvent({ id: 'ev-3', kind: 'note', body: 'Devis envoyé', occurredAt: atLocalNoon(-1) }),
  makeEvent({
    id: 'ev-4',
    kind: 'registry_synced',
    actorId: null,
    actorDisplayName: null,
    occurredAt: atLocalNoon(-10),
  }),
];

afterEach(() => {
  cleanup();
});

describe('ActivityTimeline — ACTV-01 one stream', () => {
  it('Test 1: renders notes and system events in ONE list, in the order given', () => {
    render(<ActivityTimeline events={MIXED} relationshipId="rel-1" lang="fr" nowMs={NOW} />);

    // The query already ordered by occurred_at DESC — the component does not re-sort.
    expect(renderedOrder()).toEqual(['ev-1', 'ev-2', 'ev-3', 'ev-4']);
  });

  it('Test 2: the filter defaults to "all" — a note and a system event are both visible', () => {
    render(<ActivityTimeline events={MIXED} relationshipId="rel-1" lang="fr" nowMs={NOW} />);

    expect(screen.getByText('Rappelé la DAF')).toBeInTheDocument();
    expect(screen.getByText(t('clients.timeline.kind.registrySynced', 'fr'))).toBeInTheDocument();
    expect(renderedOrder()).toHaveLength(4);
  });

  it('Test 3: the filter is a lens — all → notes → system → all restores the exact order', () => {
    render(<ActivityTimeline events={MIXED} relationshipId="rel-1" lang="fr" nowMs={NOW} />);

    const initial = renderedOrder();
    expect(initial).toEqual(['ev-1', 'ev-2', 'ev-3', 'ev-4']);

    clickFilter(t('clients.timeline.filter.notes', 'fr'));
    expect(renderedOrder()).toEqual(['ev-1', 'ev-3']);

    clickFilter(t('clients.timeline.filter.system', 'fr'));
    expect(renderedOrder()).toEqual(['ev-2', 'ev-4']);

    clickFilter(t('clients.timeline.filter.all', 'fr'));
    // Identical DOM order, which two rendered lists behind a visibility toggle
    // could not reproduce.
    expect(renderedOrder()).toEqual(initial);
  });
});

describe('ActivityTimeline — ACTV-02 attribution', () => {
  it('Test 4: a null actor renders as the system, never blank and never "unknown"', () => {
    render(
      <ActivityTimeline
        events={[makeEvent({ id: 'ev-sys', kind: 'registry_synced', actorId: null, actorDisplayName: null })]}
        relationshipId="rel-1"
        lang="fr"
        nowMs={NOW}
      />,
    );

    const row = screen.getByTestId('timeline-event');
    const actor = within(row).getByTestId('timeline-actor');
    expect(actor).toHaveTextContent(t('clients.timeline.actor.system', 'fr'));
    expect(actor.textContent?.trim()).not.toBe('');
    expect(row.textContent).not.toMatch(/inconnu|unknown/i);
  });

  it('Test 5: an event with an actor renders that actor label', () => {
    render(
      <ActivityTimeline
        events={[makeEvent({ id: 'ev-note', kind: 'note', body: 'Appel', actorDisplayName: 'Rodrigo Diaz' })]}
        relationshipId="rel-1"
        lang="fr"
        nowMs={NOW}
      />,
    );

    expect(screen.getByTestId('timeline-actor')).toHaveTextContent('Rodrigo Diaz');
  });

  it('Test 6: stage_changed interpolates both stage labels at the call site', () => {
    render(
      <ActivityTimeline
        events={[
          makeEvent({
            id: 'ev-stage',
            kind: 'stage_changed',
            payload: { fromStage: 'prospect', toStage: 'negociation' },
          }),
        ]}
        relationshipId="rel-1"
        lang="fr"
        nowMs={NOW}
      />,
    );

    const expected = t('clients.timeline.event.stageChanged', 'fr')
      .replace('{0}', t('pipeline.stage.prospect', 'fr'))
      .replace('{1}', t('pipeline.stage.negociation', 'fr'));

    expect(screen.getByText(expected)).toBeInTheDocument();
    // The raw storage strings never reach the screen.
    expect(screen.getByTestId('timeline-event').textContent).not.toContain('negociation');
  });

  it('Test 7: stage_changed with a null fromStage falls back to the kind label', () => {
    render(
      <ActivityTimeline
        events={[
          makeEvent({
            id: 'ev-legacy',
            kind: 'stage_changed',
            payload: { fromStage: null, toStage: 'qualifie' },
          }),
        ]}
        relationshipId="rel-1"
        lang="fr"
        nowMs={NOW}
      />,
    );

    const row = screen.getByTestId('timeline-event');
    expect(row).toHaveTextContent(t('clients.timeline.kind.stageChanged', 'fr'));
    expect(row.textContent).not.toContain('null');
    expect(row.textContent).not.toContain('{0}');
  });
});

describe('ActivityTimeline — day buckets and the clock', () => {
  it('Test 8: buckets render today / yesterday / earlier in order, and an empty bucket renders nothing', () => {
    render(<ActivityTimeline events={MIXED} relationshipId="rel-1" lang="fr" nowMs={NOW} />);

    expect(
      screen.getAllByTestId('timeline-bucket').map((el) => el.getAttribute('data-bucket')),
    ).toEqual(['today', 'yesterday', 'earlier']);

    cleanup();

    // Only a yesterday event: no "today" heading and no "earlier" heading.
    render(
      <ActivityTimeline
        events={[makeEvent({ id: 'ev-y', occurredAt: atLocalNoon(-1) })]}
        relationshipId="rel-1"
        lang="fr"
        nowMs={NOW}
      />,
    );

    expect(
      screen.getAllByTestId('timeline-bucket').map((el) => el.getAttribute('data-bucket')),
    ).toEqual(['yesterday']);
    expect(screen.queryByText(t('clients.timeline.bucket.today', 'fr'))).not.toBeInTheDocument();
    expect(screen.queryByText(t('clients.timeline.bucket.earlier', 'fr'))).not.toBeInTheDocument();
  });

  it('Test 10: the component reads no clock of its own — the clock is a prop', () => {
    const source = readFileSync(SOURCE_PATH, 'utf-8');

    expect(source).not.toMatch(/Date\.now\(\)/);
    expect(source).not.toMatch(/new Date\(\)/);
    expect(source).toContain('nowMs');
  });
});

describe('ActivityTimeline — empty state and untrusted text', () => {
  it('Test 9: zero events renders the UIC-05 empty state, not a blank area', () => {
    render(<ActivityTimeline events={[]} relationshipId="rel-1" lang="fr" nowMs={NOW} />);

    expect(screen.getByText(t('clients.timeline.empty', 'fr'))).toBeInTheDocument();
    expect(screen.queryAllByTestId('timeline-event')).toHaveLength(0);
  });

  it('Test 11: a body carrying markup renders as text, never as markup (D-10)', () => {
    const hostile = '<script>alert(1)</script>';
    const { container } = render(
      <ActivityTimeline
        events={[makeEvent({ id: 'ev-xss', kind: 'note', body: hostile })]}
        relationshipId="rel-1"
        lang="fr"
        nowMs={NOW}
      />,
    );

    expect(screen.getByText(hostile)).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).toContain('&lt;script&gt;');
  });
});
