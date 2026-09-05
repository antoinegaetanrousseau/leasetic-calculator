/**
 * Phase 35 Plan 03 Task 3 — `MomentumCard` render tests (GAME-01..05).
 *
 * Retargeted 2026-09-05 for D-19a (the gamified visual treatment that
 * supersedes D-19). Every guard below is the SAME guard the pre-redesign
 * suite carried — pointed at the new markup, and sharpened where the new
 * markup allows a sharper claim. Nothing was deleted because an element
 * moved: the D-11 parity assertion, the "all nine rungs present" assertion,
 * the both-footer-STRINGS assertion and the no-controls / no-other-partners
 * vocabulary guards all still run, and three of them now assert more than
 * they did before.
 *
 * Retargeted again 2026-09-05 for the compaction pass. D-14/D-16 require both
 * footer statements to RENDER unconditionally — not to occupy a line-box
 * each — so the two-<p> assertion became a both-strings-in-one-element
 * assertion, which is strictly stronger: it pins the content AND the fact
 * that they now share one line. Case 13 is new and guards the operator's
 * layout instruction (three axis panels, one row of three columns) so a
 * later edit cannot silently restack them.
 *
 * Fixtures for `badgeProgress` are built with `deriveBadgeProgress` from
 * `@/lib/momentum/badges` (35-01) rather than a hand-typed ladder, so the
 * ladder under test is the real one.
 *
 * `render` from `@testing-library/react` is used (not `renderToString`,
 * `RelanceCard.test.tsx`'s choice) because several cases here need to
 * inspect `className` and `style` attributes on rendered elements, which a
 * string renderer cannot query.
 */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deriveBadgeProgress } from '@/lib/momentum/badges';
import type { MomentumRow, WeeklyMovements } from '@/lib/momentum/types';
import type { PipelineStage } from '@/lib/pipeline/stages';
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
    // `??` would swallow an EXPLICIT null, which is exactly the shape test
    // 6b needs to exercise — so honour the key's presence, not its truthiness.
    toStage: 'toStage' in over ? (over.toStage ?? null) : 'negociation',
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

  it('2. Active streak (D-12) renders the full sentence, weighting only the number+unit fragment', () => {
    const { container } = render(
      <MomentumCard
        lang="fr"
        streakWeeks={3}
        movements={EMPTY_MOVEMENTS}
        badgeProgress={ZERO_BADGE_PROGRESS}
        trackedSinceLabel="septembre 2026"
      />,
    );
    // The whole sentence still reads as one sentence, even though D-19a now
    // splits it across a display line and a supporting line.
    expect(container.textContent).toContain(
      "3 semaine(s). Un dossier doit avancer d'ici dimanche.",
    );

    const head = container.querySelector('[data-testid="momentum-streak-head"]');
    expect(head?.textContent).toBe('3 semaine(s).');
    expect(head?.className).toContain('font-bold');

    // D-12: the break condition is present and unweighted — it is
    // information, not an alarm, so it must never carry the display weight.
    const rest = container.querySelector('[data-testid="momentum-streak-rest"]');
    expect(rest?.textContent).toBe("Un dossier doit avancer d'ici dimanche.");
    expect(rest?.className).not.toMatch(/font-bold|font-semibold/);
  });

  it('3. Both permanent footer STRINGS render in the zero AND the non-zero streak state (D-14/D-16)', () => {
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
      expect(container.textContent).toContain('Activité suivie depuis septembre 2026.');
      expect(container.textContent).toContain(
        'Seules les propositions démarrées depuis une fiche client sont suivies ici.',
      );

      // The compaction pass merged the two <p> elements into one line. What
      // D-14/D-16 require is that both STATEMENTS render unconditionally, not
      // that each gets its own line-box — so this now pins both strings to a
      // single footnote element, which also proves the merge actually
      // happened and that neither string was abridged to make room.
      const footnotes = container.querySelectorAll('[data-testid="momentum-footnote"]');
      expect(footnotes.length).toBe(1);
      const footnote = footnotes[0];
      expect(footnote.textContent).toContain('Activité suivie depuis septembre 2026.');
      expect(footnote.textContent).toContain(
        'Seules les propositions démarrées depuis une fiche client sont suivies ici.',
      );
      // The separator is decoration, so it is hidden from assistive tech and
      // must never be the thing carrying meaning between the two statements.
      const separator = Array.from(footnote.querySelectorAll('span')).find(
        (el) => el.textContent === '·',
      );
      expect(separator?.getAttribute('aria-hidden')).toBe('true');
      unmount();
    }
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
      const disclosureEl = Array.from(container.querySelectorAll('p')).find((el) =>
        el.textContent?.includes('Seules les propositions'),
      );
      expect(disclosureEl).toBeTruthy();
      expect(disclosureEl?.querySelector('svg')).toBeNull();
      expect(disclosureEl?.className).not.toMatch(/destructive|text-red|text-amber|text-orange/);
      expect(disclosureEl?.getAttribute('style')).toBeNull();
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

    // SHARPENED for D-19a. The redesign introduced inline `style` and tier
    // colour to this component; a movement row must reach NEITHER. A tier
    // colour (or any colour at all) on a Perdu row is penalty framing under
    // another name, so the rows are asserted to be entirely unstyled —
    // including their descendants, which carry the visible text.
    for (const link of links) {
      expect(link.getAttribute('style')).toBeNull();
      for (const el of Array.from(link.querySelectorAll('*'))) {
        expect(el.getAttribute('style')).toBeNull();
      }
      expect(link.innerHTML).not.toMatch(/--tier-/);
    }
    // Descendant markup is identical too, once the two rows' own hrefs,
    // company-independent labels and keys are set aside: they differ only
    // where the copy contract says they differ (the stage label).
    expect(links[0].querySelectorAll('*').length).toBe(links[1].querySelectorAll('*').length);

    const anyDestructive = Array.from(container.querySelectorAll('*')).some((el) =>
      /destructive|text-red|text-amber|text-orange/.test(String(el.className ?? '')),
    );
    expect(anyDestructive).toBe(false);

    // The stage label "Perdu" itself is expected and allowed; penalty
    // vocabulary is not.
    expect(container.textContent).toContain('Perdu');
    for (const forbidden of ['reculé', 'perdu son', 'attention', '⚠']) {
      expect(container.textContent).not.toContain(forbidden);
    }
  });

  it('6b. WR-01/WR-02 — a stage_changed row with a missing or unknown toStage degrades, never crashes and never mislabels', () => {
    // WR-01: `toStage: null` on a `stage_changed` row previously fell through
    // to the `proposal_finalized` copy — a confident, WRONG sentence about
    // the partner's own book. WR-02: an unrecognised value previously reached
    // `t(undefined)` and threw a TypeError during the whole HomePage render.
    const rows: MomentumRow[] = [
      makeRow({ eventId: 'evt-null', relationshipId: 'rel-null', companyName: 'Nullco', toStage: null }),
      makeRow({
        eventId: 'evt-unknown',
        relationshipId: 'rel-unknown',
        companyName: 'Legacyco',
        // Deliberately outside PipelineStage: `toStage` is typed from an
        // unvalidated jsonb cast, so the type is a claim, not a guarantee.
        toStage: 'archived_2019' as PipelineStage,
      }),
      makeRow({ eventId: 'evt-ok', relationshipId: 'rel-ok', companyName: 'Okco', toStage: 'negociation' }),
    ];

    // Does not throw — the headline WR-02 claim.
    const { container } = render(
      <MomentumCard
        lang="fr"
        streakWeeks={1}
        movements={{ rows, total: 3 }}
        badgeProgress={ZERO_BADGE_PROGRESS}
        trackedSinceLabel="septembre 2026"
      />,
    );

    const links = Array.from(container.querySelectorAll('[data-testid="momentum-row"]'));
    expect(links.length).toBe(3);

    // Both degraded rows render the neutral generic sentence...
    expect(links[0].getAttribute('aria-label')).toBe('Nullco — dossier mis à jour, mardi');
    expect(links[1].getAttribute('aria-label')).toBe('Legacyco — dossier mis à jour, mardi');
    // ...and NOT the proposal-finalization copy (WR-01's silent mislabel).
    for (const link of links.slice(0, 2)) {
      expect(link.getAttribute('aria-label')).not.toContain('proposition envoyée');
    }
    // No dictionary key or `undefined` leaked into the visible text.
    expect(container.textContent).not.toContain('undefined');
    expect(container.textContent).not.toContain('dashboard.momentum.');

    // A valid neighbour still renders its real stage label.
    expect(links[2].getAttribute('aria-label')).toBe('Okco → Négociation, mardi');

    // D-11 still holds across the degraded path: identical chrome, no style.
    expect(links[0].className).toBe(links[2].className);
    for (const link of links) {
      expect(link.getAttribute('style')).toBeNull();
    }
  });

  it('6c. A genuine proposal_finalized row is unaffected by the toStage guard', () => {
    const { container } = render(
      <MomentumCard
        lang="fr"
        streakWeeks={1}
        movements={{
          rows: [
            makeRow({
              eventId: 'evt-prop',
              relationshipId: 'rel-prop',
              companyName: 'Propco',
              kind: 'proposal_finalized',
              toStage: null,
            }),
          ],
          total: 1,
        }}
        badgeProgress={ZERO_BADGE_PROGRESS}
        trackedSinceLabel="septembre 2026"
      />,
    );
    const link = container.querySelector('[data-testid="momentum-row"]');
    expect(link?.getAttribute('aria-label')).toBe('Propco — proposition envoyée, mardi');
  });

  it('7. Badge ladder readability (GAME-03): all 9 rungs present and legible, earned or not', () => {
    const zero = render(
      <MomentumCard
        lang="fr"
        streakWeeks={0}
        movements={EMPTY_MOVEMENTS}
        badgeProgress={ZERO_BADGE_PROGRESS}
        trackedSinceLabel="septembre 2026"
      />,
    );
    const zeroRungs = Array.from(
      zero.container.querySelectorAll('[data-testid="momentum-rung"]'),
    );
    expect(zeroRungs.length).toBe(9);
    expect(zero.container.querySelectorAll('[data-testid="momentum-axis"]').length).toBe(3);

    for (const tierLabel of ['Bronze', 'Argent', 'Or']) {
      expect(zero.container.textContent?.match(new RegExp(tierLabel, 'g'))?.length).toBe(3);
    }

    // D-19a explicitly forbids hiding an unearned criterion behind an
    // "unlock" affordance. Every rung's threshold text must therefore be
    // present and non-empty even when nothing is earned.
    for (const rung of zeroRungs) {
      expect(rung.getAttribute('data-earned')).toBe('false');
      expect((rung.textContent ?? '').trim().length).toBeGreaterThan(0);
    }
    expect(zero.container.textContent).toContain('Or (25 client(s))');
    expect(zero.container.textContent).toContain('Or (15 victoire(s))');
    expect(zero.container.textContent).toContain('Or (12 semaine(s))');
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
    // 25 clients earns all three clients rungs (bronze=3, silver=10, gold=25)
    // — monotonic, and still exactly nine rungs on the page.
    expect(rich.container.querySelectorAll('[data-testid="momentum-rung"]').length).toBe(9);
    const earned = Array.from(
      rich.container.querySelectorAll('[data-testid="momentum-rung"][data-earned="true"]'),
    );
    expect(earned.length).toBe(3);
    expect(earned.map((el) => el.getAttribute('data-tier'))).toEqual([
      'bronze',
      'silver',
      'gold',
    ]);
    const clientsAxis = rich.container.querySelector('[data-axis="clients"]');
    expect(
      clientsAxis?.querySelectorAll('[data-testid="momentum-rung"][data-earned="true"]').length,
    ).toBe(3);
    // The unearned axes keep every criterion readable alongside the earned ones.
    expect(rich.container.textContent).toContain('Bronze (1 victoire(s))');
    rich.unmount();
  });

  it('7b. D-19a progress indication: a fraction toward the next rung, and a graceful all-earned state', () => {
    const partial = render(
      <MomentumCard
        lang="fr"
        streakWeeks={0}
        movements={EMPTY_MOVEMENTS}
        badgeProgress={deriveBadgeProgress(
          { distinctClients: 4, wins: 0 },
          { currentWeeks: 0, longestWeeks: 0 },
        )}
        trackedSinceLabel="septembre 2026"
      />,
    );
    const clientsAxis = partial.container.querySelector('[data-axis="clients"]');
    // 4 clients: bronze (3) earned, next rung is silver (10).
    expect(clientsAxis?.textContent).toContain('4 / 10');
    expect(clientsAxis?.querySelector('[data-testid="momentum-track"] > div')).toBeTruthy();
    partial.unmount();

    const maxed = render(
      <MomentumCard
        lang="fr"
        streakWeeks={0}
        movements={EMPTY_MOVEMENTS}
        badgeProgress={deriveBadgeProgress(
          { distinctClients: 40, wins: 0 },
          { currentWeeks: 0, longestWeeks: 0 },
        )}
        trackedSinceLabel="septembre 2026"
      />,
    );
    const maxedAxis = maxed.container.querySelector('[data-axis="clients"]');
    // No next threshold exists, so no invented "40 / 40" fraction is shown.
    expect(maxedAxis?.textContent).toContain('Tous les paliers atteints');
    expect(maxedAxis?.textContent).not.toMatch(/\d+ \/ \d+/);
    maxed.unmount();
  });

  it('8. GAME-04 vocabulary guard: no comparative/ranking wording anywhere on the card', () => {
    const { container } = render(
      <MomentumCard
        lang="fr"
        streakWeeks={3}
        movements={{ rows: [makeRow({ eventId: 'e1', relationshipId: 'r1' })], total: 1 }}
        badgeProgress={deriveBadgeProgress(
          { distinctClients: 12, wins: 6 },
          { currentWeeks: 3, longestWeeks: 7 },
        )}
        trackedSinceLabel="septembre 2026"
      />,
    );
    // PERMANENT: this guards a requirement (GAME-04), not a copy preference —
    // do not relax this regex to accommodate future copy.
    expect(container.textContent).not.toMatch(
      /classement|leaderboard|moyenne|average|percentile|rank|top \d|par rapport|compared/i,
    );
    // SHARPENED for D-19a: the redesign added trophy-adjacent vocabulary
    // pressure. Nothing on this card may name a peer, a team, or a position.
    expect(container.textContent).not.toMatch(
      /équipe|team|collègue|colleague|meilleur|best|podium|\bvs\b|autres partenaires/i,
    );
  });

  it('9. GAME-05 / D-08 / D-16: zero controls — no button, no dismiss, no collapse affordance', () => {
    const { container } = render(
      <MomentumCard
        lang="fr"
        streakWeeks={1}
        movements={{ rows: [makeRow({ eventId: 'e1', relationshipId: 'r1' })], total: 1 }}
        badgeProgress={ZERO_BADGE_PROGRESS}
        trackedSinceLabel="septembre 2026"
      />,
    );
    expect(container.querySelectorAll('button').length).toBe(0);
    expect(container.querySelectorAll('[role="button"]').length).toBe(0);
    expect(container.querySelectorAll('input, select, details, summary').length).toBe(0);
    // Every interactive node on this card is a movement row link and nothing
    // else — no "voir tout", no opt-out, no expander.
    const anchors = Array.from(container.querySelectorAll('a'));
    expect(anchors.length).toBe(1);
    expect(anchors[0].getAttribute('data-testid')).toBe('momentum-row');
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
    // The D-19a labels are dictionary-backed in EN too.
    expect(container.textContent).toContain('Current streak');
    expect(container.textContent).toContain('Your tiers');
    expect(container.textContent).toContain('Gold (25 client(s))');
    expect(container.textContent).not.toContain('dashboard.momentum.');
  });

  it('13. Compaction layout: three axis panels in one row of three columns, stacking on narrow viewports', () => {
    const { container } = render(
      <MomentumCard
        lang="fr"
        streakWeeks={3}
        movements={EMPTY_MOVEMENTS}
        badgeProgress={ZERO_BADGE_PROGRESS}
        trackedSinceLabel="septembre 2026"
      />,
    );
    const grid = container.querySelector('[data-testid="momentum-axis-grid"]');
    expect(grid).toBeTruthy();
    // One card per axis, all three direct children of the same grid.
    expect(grid?.querySelectorAll('[data-testid="momentum-axis"]').length).toBe(3);
    // Three columns from `sm` up, one column below it — the operator's
    // "one row of three columns, stacking gracefully on narrow viewports".
    expect(grid?.className).toContain('sm:grid-cols-3');
    expect(grid?.className).toContain('grid-cols-1');

    // Within a column the three rungs stack unconditionally, so a criterion
    // never has to truncate to fit a third of the card's width. jsdom has no
    // layout engine, so this asserts the CLASS contract rather than a
    // measured box — the measured check lives in the browser pass.
    for (const axis of Array.from(container.querySelectorAll('[data-testid="momentum-axis"]'))) {
      const list = axis.querySelector('ul');
      expect(list?.className).toContain('grid-cols-1');
      expect(list?.className).not.toMatch(/grid-cols-[23]/);
      expect(list?.querySelectorAll('[data-testid="momentum-rung"]').length).toBe(3);
    }

    // Nothing was bought with a truncation, an ellipsis or an overflow clip
    // on a criterion — the exact thing GAME-03/D-13 forbids.
    for (const rung of Array.from(container.querySelectorAll('[data-testid="momentum-rung"]'))) {
      expect(rung.className).not.toMatch(/truncate|line-clamp|text-ellipsis|overflow-hidden/);
      const label = rung.querySelector('span:last-child');
      expect(label?.className).not.toMatch(/truncate|line-clamp|text-ellipsis/);
      expect((label?.textContent ?? '').trim().length).toBeGreaterThan(0);
    }
  });

  it('11. Server-component posture: no "use client" directive in the source', () => {
    const src = readFileSync(
      join(process.cwd(), 'app', '(authed)', '_components', 'MomentumCard.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/use client/);
  });

  it('12. Tier colour comes from tokens, never from a hex literal in the component', () => {
    const src = readFileSync(
      join(process.cwd(), 'app', '(authed)', '_components', 'MomentumCard.tsx'),
      'utf8',
    );
    // D-19a authorised tier colour; UIC-03 still requires it to live in the
    // design system, not scattered through a component.
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    for (const token of ['--tier-bronze', '--tier-silver', '--tier-gold']) {
      expect(src).toContain(token);
    }

    // And the tokens are declared for BOTH themes, so nothing on this card
    // inherits a light-theme colour in dark mode.
    const globals = readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8');
    const darkBlock = globals.match(/html\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
    for (const token of ['--tier-bronze', '--tier-silver', '--tier-gold']) {
      expect(globals).toContain(`${token}:`);
      expect(darkBlock).toContain(`${token}:`);
    }
  });
});
