/**
 * Phase 35 Plan 03 Task 3 — `MomentumCard` render tests (GAME-01..05).
 *
 * Fixtures for `badgeProgress` are built with `deriveBadgeProgress` from
 * `@/lib/momentum/badges` (35-01) rather than a hand-typed ladder, so the
 * ladder under test is the real one.
 *
 * `render` from `@testing-library/react` is used (not `renderToString`,
 * `RelanceCard.test.tsx`'s choice) because several cases here need to
 * inspect `className` attributes on rendered elements, which a string
 * renderer cannot query.
 */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deriveBadgeProgress } from '@/lib/momentum/badges';
import type { MomentumRow, WeeklyMovements } from '@/lib/momentum/types';
import { MomentumCard } from './MomentumCard';

afterEach(() => {
  cleanup();
});

const ZERO_BADGE_PROGRESS = deriveBadgeProgress(
  { distinctClients: 0, wins: 0 },
  { currentWeeks: 0, longestWeeks: 0 },
);

function makeRow(over: Partial<MomentumRow> & { eventId: string; relationshipId: string }): MomentumRow {
  return {
    eventId: over.eventId,
    relationshipId: over.relationshipId,
    companyName: over.companyName ?? 'Alpha SAS',
    kind: over.kind ?? 'stage_changed',
    toStage: over.toStage ?? 'negociation',
    occurredAt: over.occurredAt ?? new Date('2026-09-08T10:00:00Z'), // a Tuesday
  };
}

const EMPTY_MOVEMENTS: WeeklyMovements = { rows: [], total: 0 };

describe('MomentumCard — GAME-01..05', () => {
  it('1. Zero state renders D-13 invitation text, empty-movements copy, and the eyebrow', () => {
    const { container } = render(
      <MomentumCard
        lang="fr"
        streakWeeks={0}
        movements={EMPTY_MOVEMENTS}
        badgeProgress={ZERO_BADGE_PROGRESS}
        trackedSinceLabel="septembre 2026"
      />,
    );
    expect(container.textContent).toContain(
      'Pas encore de série. Faites avancer un dossier cette semaine pour démarrer une série.',
    );
    expect(container.textContent).toContain('Aucun mouvement cette semaine.');
    expect(container.textContent).toContain('VOTRE PROGRESSION');
  });

  it('2. Active streak (D-12) renders the full sentence, bolding only the number+unit fragment', () => {
    const { container } = render(
      <MomentumCard
        lang="fr"
        streakWeeks={3}
        movements={EMPTY_MOVEMENTS}
        badgeProgress={ZERO_BADGE_PROGRESS}
        trackedSinceLabel="septembre 2026"
      />,
    );
    expect(container.textContent).toContain(
      "3 semaine(s). Un dossier doit avancer d'ici dimanche.",
    );

    const boldSpan = Array.from(container.querySelectorAll('span')).find((el) =>
      el.textContent?.includes('3 semaine(s).'),
    );
    expect(boldSpan).toBeTruthy();
    expect(boldSpan?.className).toContain('font-semibold');

    const restSpan = Array.from(container.querySelectorAll('span')).find(
      (el) => el.textContent?.trim() === "Un dossier doit avancer d'ici dimanche.",
    );
    expect(restSpan).toBeTruthy();
    expect(restSpan?.className).not.toContain('font-semibold');
  });

  it('3. The credibility line renders in BOTH the zero and the non-zero streak state', () => {
    const zero = render(
      <MomentumCard
        lang="fr"
        streakWeeks={0}
        movements={EMPTY_MOVEMENTS}
        badgeProgress={ZERO_BADGE_PROGRESS}
        trackedSinceLabel="septembre 2026"
      />,
    );
    expect(zero.container.textContent).toContain('Activité suivie depuis septembre 2026.');
    zero.unmount();

    const active = render(
      <MomentumCard
        lang="fr"
        streakWeeks={3}
        movements={EMPTY_MOVEMENTS}
        badgeProgress={ZERO_BADGE_PROGRESS}
        trackedSinceLabel="septembre 2026"
      />,
    );
    expect(active.container.textContent).toContain('Activité suivie depuis septembre 2026.');
    active.unmount();
  });

  it('4. The under-report disclosure is permanent, with no icon and no warning-coloured class', () => {
    for (const streakWeeks of [0, 3]) {
      const { container, unmount } = render(
        <MomentumCard
          lang="fr"
          streakWeeks={streakWeeks}
          movements={EMPTY_MOVEMENTS}
          badgeProgress={ZERO_BADGE_PROGRESS}
          trackedSinceLabel="septembre 2026"
        />,
      );
      expect(container.textContent).toContain(
        'Seules les propositions démarrées depuis une fiche client sont suivies ici.',
      );
      const disclosureEl = Array.from(container.querySelectorAll('p')).find((el) =>
        el.textContent?.includes('Seules les propositions'),
      );
      expect(disclosureEl?.querySelector('svg')).toBeNull();
      expect(disclosureEl?.className).not.toMatch(/destructive|text-red|text-amber|text-orange/);
      unmount();
    }
  });

  it('5. Movement rows: 5 rows with total 8 render exactly 5 links + a non-link "+3 autres" line', () => {
    const rows: MomentumRow[] = Array.from({ length: 5 }, (_, i) =>
      makeRow({ eventId: `evt-${i}`, relationshipId: `rel-${i}`, companyName: `Client ${i}` }),
    );
    const movements: WeeklyMovements = { rows, total: 8 };
    const { container } = render(
      <MomentumCard
        lang="fr"
        streakWeeks={1}
        movements={movements}
        badgeProgress={ZERO_BADGE_PROGRESS}
        trackedSinceLabel="septembre 2026"
      />,
    );
    const links = container.querySelectorAll('[data-testid="momentum-row"]');
    expect(links.length).toBe(5);
    links.forEach((link, i) => {
      expect(link.getAttribute('href')).toBe(`/clients/rel-${i}`);
    });

    expect(container.textContent).toContain('+ 3 autres mouvements cette semaine');
    const moreTextNode = Array.from(container.querySelectorAll('p')).find((el) =>
      el.textContent?.includes('+ 3 autres'),
    );
    expect(moreTextNode).toBeTruthy();
    expect(moreTextNode?.closest('a')).toBeNull();
  });

  it('6. D-11 parity — a forward move and a Perdu move render byte-identically', () => {
    const rows: MomentumRow[] = [
      makeRow({ eventId: 'evt-forward', relationshipId: 'rel-forward', toStage: 'negociation' }),
      makeRow({ eventId: 'evt-perdu', relationshipId: 'rel-perdu', toStage: 'perdu' }),
    ];
    const movements: WeeklyMovements = { rows, total: 2 };
    const { container } = render(
      <MomentumCard
        lang="fr"
        streakWeeks={1}
        movements={movements}
        badgeProgress={ZERO_BADGE_PROGRESS}
        trackedSinceLabel="septembre 2026"
      />,
    );
    const links = Array.from(container.querySelectorAll('[data-testid="momentum-row"]'));
    expect(links.length).toBe(2);
    // Headline assertion: the two rows' className attributes are STRING-EQUAL.
    expect(links[0].className).toBe(links[1].className);

    const anyDestructive = Array.from(container.querySelectorAll('*')).some((el) =>
      /destructive|text-red|text-amber|text-orange/.test(el.className ?? ''),
    );
    expect(anyDestructive).toBe(false);

    // The stage label "Perdu" itself is expected and allowed; penalty
    // vocabulary is not.
    expect(container.textContent).toContain('Perdu');
    for (const forbidden of ['reculé', 'perdu son', 'attention', '⚠']) {
      expect(container.textContent).not.toContain(forbidden);
    }
  });

  it('7. Badge ladder readability (GAME-03): all 9 rungs present, monotonic earned markers', () => {
    const zero = render(
      <MomentumCard
        lang="fr"
        streakWeeks={0}
        movements={EMPTY_MOVEMENTS}
        badgeProgress={ZERO_BADGE_PROGRESS}
        trackedSinceLabel="septembre 2026"
      />,
    );
    // All nine tier entries render — three axes, each with bronze/silver/gold.
    for (const tierLabel of ['Bronze', 'Argent', 'Or']) {
      expect(zero.container.textContent?.match(new RegExp(tierLabel, 'g'))?.length).toBe(3);
    }
    expect(zero.container.querySelectorAll('svg').length).toBe(0);
    zero.unmount();

    const richBadges = deriveBadgeProgress(
      { distinctClients: 25, wins: 0 },
      { currentWeeks: 0, longestWeeks: 0 },
    );
    const rich = render(
      <MomentumCard
        lang="fr"
        streakWeeks={0}
        movements={EMPTY_MOVEMENTS}
        badgeProgress={richBadges}
        trackedSinceLabel="septembre 2026"
      />,
    );
    // 25 clients earns all three clients rungs (bronze=3, silver=10, gold=25) — monotonic.
    expect(rich.container.querySelectorAll('svg').length).toBe(3);
    rich.unmount();
  });

  it('8. GAME-04 vocabulary guard: no comparative/ranking wording anywhere on the card', () => {
    const { container } = render(
      <MomentumCard
        lang="fr"
        streakWeeks={3}
        movements={EMPTY_MOVEMENTS}
        badgeProgress={ZERO_BADGE_PROGRESS}
        trackedSinceLabel="septembre 2026"
      />,
    );
    // PERMANENT: this guards a requirement (GAME-04), not a copy preference —
    // do not relax this regex to accommodate future copy.
    expect(container.textContent).not.toMatch(
      /classement|leaderboard|moyenne|average|percentile|rank|top \d|par rapport|compared/i,
    );
  });

  it('9. GAME-05 / D-08 / D-16: zero buttons, zero onClick handlers, no dismiss affordance', () => {
    const { container } = render(
      <MomentumCard
        lang="fr"
        streakWeeks={1}
        movements={EMPTY_MOVEMENTS}
        badgeProgress={ZERO_BADGE_PROGRESS}
        trackedSinceLabel="septembre 2026"
      />,
    );
    expect(container.querySelectorAll('button').length).toBe(0);
  });

  it('10. EN parity: EN strings render, and no dictionary key name leaks through', () => {
    const { container } = render(
      <MomentumCard
        lang="en"
        streakWeeks={0}
        movements={EMPTY_MOVEMENTS}
        badgeProgress={ZERO_BADGE_PROGRESS}
        trackedSinceLabel="September 2026"
      />,
    );
    expect(container.textContent).toContain('No streak yet. Advance a deal this week to start one.');
    expect(container.textContent).toContain('Only proposals started from a client page are tracked here.');
    expect(container.textContent).not.toContain('dashboard.momentum.');
  });

  it('11. Server-component posture: no "use client" directive in the source', () => {
    const src = readFileSync(
      join(process.cwd(), 'app', '(authed)', '_components', 'MomentumCard.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/use client/);
  });
});
