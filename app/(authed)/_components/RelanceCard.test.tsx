/**
 * Phase 34 Plan 09 Task 1 — the "à relancer" home-page card (ACTV-04/05, CRM-02).
 *
 * Rendered with `renderToString` because `RelanceCard` is a SERVER component:
 * there is no client boundary to hydrate and the empty case must produce a
 * literally empty string, which only a string renderer can assert.
 *
 * The clock is a fixture (`NOW`) and every fixture date is derived FROM it, so
 * the suite is timezone-independent: "same day" is asserted with the exact
 * `NOW` instant rather than a hand-written wall-clock literal that would fall
 * onto the previous day west of UTC-10.
 */
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { t } from '@/lib/i18n/dictionaries';
import { formatDate } from '@/lib/i18n/format';
import type { FollowUpRow } from '@/lib/db/queries';
import { RelanceCard } from './RelanceCard';

const DAY_MS = 86_400_000;
const NOW = Date.parse('2026-09-03T10:00:00Z');

/** A string that belongs to a partner who is NOT the caller (T-34-09-04). */
const OTHER_PARTNER = 'CONCURRENT SARL';

function makeRow(over: Partial<FollowUpRow> & { relationshipId: string }): FollowUpRow {
  return {
    relationshipId: over.relationshipId,
    companyName: over.companyName ?? 'Alpha SAS',
    siren: over.siren ?? '123456789',
    stage: over.stage ?? 'contact',
    nextActionAt: over.nextActionAt ?? null,
    nextActionNote: over.nextActionNote ?? null,
    updatedAt: over.updatedAt ?? new Date(NOW - 40 * DAY_MS),
    bucket: over.bucket ?? 1,
  };
}

describe('RelanceCard — ACTV-04/05', () => {
  it('Test 1: renders nothing at all when there is nothing to chase', () => {
    // <decision_record>: an empty follow-up list is good news, not an empty
    // state. No card, no header, no "Rien à relancer" furniture — and this is
    // also what makes the admin case fall out with no role branch.
    const html = renderToString(<RelanceCard rows={[]} lang="fr" nowMs={NOW} />);
    expect(html).toBe('');
  });

  it('Test 2: renders each row as a full-row link to that relationship client page', () => {
    const rows = [
      makeRow({ relationshipId: 'rel-1', companyName: 'Alpha SAS' }),
      makeRow({ relationshipId: 'rel-2', companyName: 'Bêta SARL' }),
    ];
    const html = renderToString(<RelanceCard rows={rows} lang="fr" nowMs={NOW} />);

    expect(html).toContain('href="/clients/rel-1"');
    expect(html).toContain('href="/clients/rel-2"');
    expect(html).toContain('Alpha SAS');
    expect(html).toContain('Bêta SARL');
    // One addressable row per given row — no aggregate, no summary row.
    expect(html.split('data-testid="relance-row"').length - 1).toBe(2);
  });

  it('Test 3: bucket 0 renders overdue in the past and the dated due label today', () => {
    const overdueHtml = renderToString(
      <RelanceCard
        rows={[makeRow({ relationshipId: 'rel-late', bucket: 0, nextActionAt: new Date(NOW - 3 * DAY_MS) })]}
        lang="fr"
        nowMs={NOW}
      />,
    );
    expect(overdueHtml).toContain(t('dashboard.relance.overdue', 'fr'));

    // Same instant as `now` → the action is due TODAY, not late.
    const dueAt = new Date(NOW);
    const dueHtml = renderToString(
      <RelanceCard
        rows={[makeRow({ relationshipId: 'rel-today', bucket: 0, nextActionAt: dueAt })]}
        lang="fr"
        nowMs={NOW}
      />,
    );
    const expected = t('dashboard.relance.due', 'fr').replace(
      '{0}',
      formatDate(dueAt, 'fr', { year: 'numeric', month: 'short', day: 'numeric' }),
    );
    expect(dueHtml).toContain(expected);
    expect(dueHtml).not.toContain(t('dashboard.relance.overdue', 'fr'));
  });

  it('Test 4: bucket 1 renders the stale label with the day count interpolated', () => {
    const html = renderToString(
      <RelanceCard
        rows={[makeRow({ relationshipId: 'rel-stale', bucket: 1, nextActionAt: null, updatedAt: new Date(NOW - 47 * DAY_MS) })]}
        lang="fr"
        nowMs={NOW}
      />,
    );
    expect(html).toContain(t('dashboard.relance.stale', 'fr').replace('{0}', '47'));
  });

  it('Test 5: every visible string comes from t() — no hardcoded French survives an EN render', () => {
    const rows = [
      makeRow({ relationshipId: 'rel-1', bucket: 0, nextActionAt: new Date(NOW - DAY_MS) }),
      makeRow({ relationshipId: 'rel-2', bucket: 1, updatedAt: new Date(NOW - 47 * DAY_MS) }),
    ];
    const fr = renderToString(<RelanceCard rows={rows} lang="fr" nowMs={NOW} />);
    const en = renderToString(<RelanceCard rows={rows} lang="en" nowMs={NOW} />);

    for (const key of ['dashboard.relance.title', 'dashboard.relance.viewAll', 'dashboard.relance.overdue'] as const) {
      expect(fr).toContain(t(key, 'fr'));
      expect(en).toContain(t(key, 'en'));
      // The FR copy must be entirely absent from the EN render: any French
      // string surviving the language switch is a hardcoded literal.
      expect(en).not.toContain(t(key, 'fr'));
    }
    expect(en).toContain(t('dashboard.relance.stale', 'en').replace('{0}', '47'));
    expect(en).not.toContain('Sans activité');
    expect(en).not.toContain('relancer');
  });

  it('Test 6: nothing that was not handed in as a row can appear (CRM-02)', () => {
    const rows = [makeRow({ relationshipId: 'rel-mine', companyName: 'Alpha SAS' })];
    const html = renderToString(<RelanceCard rows={rows} lang="fr" nowMs={NOW} />);

    expect(html).not.toContain(OTHER_PARTNER);
    // No count, ranking or total: the only digits in the markup belong to the
    // rows themselves (the id, the stale day count) — never a tally.
    expect(html).not.toContain('/clients/rel-other');
    expect(html.split('data-testid="relance-row"').length - 1).toBe(rows.length);
  });
});
