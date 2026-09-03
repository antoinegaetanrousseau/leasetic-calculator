'use client';

/**
 * Phase 34 Plan 11 Task 1 — the Activité stream (ACTV-01, ACTV-02, ACTV-03, D-19).
 *
 * ONE CHRONOLOGICAL STREAM. ACTV-01 is specific: a single timeline mixing
 * manual notes with system events, and the ROADMAP restates it as "no separate
 * tabs for the two". The type filter below is a LENS over one array — it
 * narrows `events` in place and never changes the order, never renders a second
 * list, and starts on `all` so the first thing a partner sees is the mixed
 * stream. Two lists behind a visibility toggle would look identical on screen
 * and would fail the `all → notes → all` DOM-order test, which is the point.
 *
 * BUILT BY REUSE (D-19). The visual primitives are the licensed ReUI timeline
 * components, imported directly and composed in the same order the vendored
 * `solution-crm-5` demo composes them. Nothing is imported FROM that demo: the
 * vendored tree is ESLint-excluded for both the import-restriction layer and
 * the SHELL-06 hardcoded-JSX-text layer, so a timeline living there would ship
 * untranslated copy with no gate catching it, and would be overwritten wholesale
 * by the next registry refresh. Living here it IS linted, and every string has
 * to go through `t()`.
 *
 * THE CLOCK IS A PROP. `nowMs` is read once on the server by the page that
 * renders this component. Deriving the day buckets from the browser's clock
 * during render would make a row's bucket depend on the viewer's machine, and
 * a clock read inside a component body is a purity violation the linter
 * rejects. Same contract as `ProposalRow` and the home page's follow-up card.
 *
 * UIC-03 ACCENT RESERVE: event kinds are differentiated by glyph and by type
 * weight, never by an accent or destructive fill — the timeline is a record,
 * not a set of alerts. And there is deliberately NO per-event edit or delete
 * control: D-14 provides no update path for an event, and ACTV-01 describes a
 * record of what happened rather than a document to revise.
 *
 * EVERY VALUE IS A REACT TEXT NODE (D-10). Note bodies are partner-authored and
 * payload values are registry-derived; both are rendered as children, never as
 * markup.
 */
import { useMemo, useState } from 'react';

import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from '@/components/reui/timeline';
import { Empty, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  FileTextIcon,
  HistoryIcon,
  ProposalIcon,
  RefreshIcon,
  type IconProps,
} from '@/components/ui/icons';
import { t, type DictKey, type Lang } from '@/lib/i18n/dictionaries';
import { formatDate } from '@/lib/i18n/format';
import { PIPELINE_STAGES, STAGE_DICT_KEY, type PipelineStage } from '@/lib/pipeline/stages';
import {
  EVENT_KIND_DICT_KEY,
  isSystemEventKind,
  type RelationshipEventKind,
} from '@/lib/relationship/kinds';
import type { RelationshipEventListRow } from '@/lib/db/queries';

export interface ActivityTimelineProps {
  /** Already owner-scoped and already ordered `occurred_at DESC` — in SQL (34-05). */
  events: RelationshipEventListRow[];
  relationshipId: string;
  lang: Lang;
  /** Unix-ms "now", read from the clock ONCE on the server and passed down. */
  nowMs: number;
}

/** The three filter options, in render order. `all` is the initial state. */
const TYPE_FILTERS = ['all', 'notes', 'system'] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number];

const TYPE_FILTER_DICT_KEY: Record<TypeFilter, DictKey> = {
  all: 'clients.timeline.filter.all',
  notes: 'clients.timeline.filter.notes',
  system: 'clients.timeline.filter.system',
};

/** The three day buckets, in render order. An empty one renders nothing at all. */
const BUCKET_ORDER = ['today', 'yesterday', 'earlier'] as const;
type BucketKey = (typeof BUCKET_ORDER)[number];

const BUCKET_DICT_KEY: Record<BucketKey, DictKey> = {
  today: 'clients.timeline.bucket.today',
  yesterday: 'clients.timeline.bucket.yesterday',
  earlier: 'clients.timeline.bucket.earlier',
};

/** One glyph per kind — the only per-kind differentiation (UIC-03). */
const KIND_ICON: Record<RelationshipEventKind, (props: IconProps) => React.ReactElement> = {
  note: FileTextIcon,
  stage_changed: ArrowRightIcon,
  proposal_finalized: ProposalIcon,
  outcome_set: CheckCircleIcon,
  registry_synced: RefreshIcon,
  next_action_set: HistoryIcon,
};

/**
 * Local midnight, `offset` days from the local day containing `ms`. Buckets are
 * a CALENDAR question — an event logged at 23:50 is still "today" at 00:10 the
 * next minute only if the calendar says so — so both sides of every comparison
 * are day boundaries rather than raw instants, and the boundary is stepped with
 * `setDate` so a DST day is 23h or 25h long without shifting the bucket.
 */
function startOfDay(ms: number, offset = 0): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d.getTime();
}

function bucketOf(occurredAt: Date, nowMs: number): BucketKey {
  const day = startOfDay(occurredAt.getTime());
  if (day >= startOfDay(nowMs)) return 'today';
  if (day >= startOfDay(nowMs, -1)) return 'yesterday';
  return 'earlier';
}

/**
 * A stage read out of an event payload, or `null` when it is absent or is not
 * one of the seven known stages. Payload is `jsonb`, so nothing about its shape
 * is guaranteed by the type system.
 */
function stageFromPayload(payload: Record<string, unknown> | null, key: string): PipelineStage | null {
  const value = payload?.[key];
  if (typeof value !== 'string') return null;
  return (PIPELINE_STAGES as readonly string[]).includes(value) ? (value as PipelineStage) : null;
}

/**
 * The second line of an event, or `null` when the kind label alone says it all.
 *
 * `stage_changed` interpolates at the CALL SITE via `.replace()` — the house
 * convention, the dictionary never holds a template. When `fromStage` is
 * missing (an event written before 34-08 put both stages in the payload) the
 * sentence is dropped entirely rather than printed with a hole in it, and the
 * row falls back to its plain kind label.
 */
function eventDetail(event: RelationshipEventListRow, lang: Lang): string | null {
  if (event.kind === 'stage_changed') {
    const from = stageFromPayload(event.payload, 'fromStage');
    const to = stageFromPayload(event.payload, 'toStage');
    if (!from || !to) return null;
    return t('clients.timeline.event.stageChanged', lang)
      .replace('{0}', t(STAGE_DICT_KEY[from], lang))
      .replace('{1}', t(STAGE_DICT_KEY[to], lang));
  }
  return event.body;
}

function matchesFilter(kind: RelationshipEventKind, filter: TypeFilter): boolean {
  if (filter === 'all') return true;
  return filter === 'system' ? isSystemEventKind(kind) : !isSystemEventKind(kind);
}

function EventRow({
  event,
  step,
  lang,
}: {
  event: RelationshipEventListRow;
  step: number;
  lang: Lang;
}) {
  const Glyph = KIND_ICON[event.kind];
  const detail = eventDetail(event, lang);

  // ACTV-02: a null actor is the SYSTEM, and that is its only rendering — never
  // a blank author, never an "unknown", and never the reader's own name.
  const actor = event.actorDisplayName ?? t('clients.timeline.actor.system', lang);

  return (
    <TimelineItem
      step={step}
      className="ms-10 pb-6"
      data-testid="timeline-event"
      data-event-id={event.id}
      data-event-kind={event.kind}
    >
      <TimelineHeader>
        <TimelineSeparator className="bg-border! group-data-[orientation=vertical]/timeline:-left-7 group-data-[orientation=vertical]/timeline:h-[calc(100%-1.5rem-0.5rem)] group-data-[orientation=vertical]/timeline:translate-y-7" />
        <TimelineTitle className="text-[14.5px] font-semibold text-foreground">
          {t(EVENT_KIND_DICT_KEY[event.kind], lang)}
        </TimelineTitle>
        <TimelineIndicator className="flex size-6 items-center justify-center border border-border bg-background text-muted-foreground group-data-[orientation=vertical]/timeline:-left-7">
          <Glyph size={14} aria-hidden="true" />
        </TimelineIndicator>
      </TimelineHeader>

      <TimelineContent className="mt-0.5">
        <div className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted-foreground">
          <span data-testid="timeline-actor" className="font-medium text-foreground">
            {actor}
          </span>
          <TimelineDate
            className="mb-0 tabular-nums"
            dateTime={event.occurredAt.toISOString()}
          >
            {formatDate(event.occurredAt, lang, {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </TimelineDate>
        </div>

        {detail !== null && detail.length > 0 && (
          <p className="mt-1 whitespace-pre-wrap text-[14px] text-foreground">{detail}</p>
        )}
      </TimelineContent>
    </TimelineItem>
  );
}

export function ActivityTimeline({ events, relationshipId, lang, nowMs }: ActivityTimelineProps) {
  const [filter, setFilter] = useState<TypeFilter>('all');

  // ONE array, narrowed in place. The order is the query's, never re-derived.
  const visible = useMemo(
    () => events.filter((event) => matchesFilter(event.kind, filter)),
    [events, filter],
  );

  const buckets = useMemo(
    () =>
      BUCKET_ORDER.map((key) => ({
        key,
        entries: visible.filter((event) => bucketOf(event.occurredAt, nowMs) === key),
      })).filter((bucket) => bucket.entries.length > 0),
    [visible, nowMs],
  );

  const titleId = `activity-timeline-title-${relationshipId}`;

  return (
    <section aria-labelledby={titleId}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id={titleId} className="text-[15px] font-semibold tracking-tight">
          {t('clients.timeline.title', lang)}
        </h2>

        <ToggleGroup
          multiple={false}
          value={[filter]}
          onValueChange={(next: string[]) => {
            const chosen = next[0];
            if (!chosen) return;
            setFilter(chosen as TypeFilter);
          }}
          variant="outline"
          size="sm"
          aria-label={t('clients.timeline.title', lang)}
          className="flex-wrap"
        >
          {TYPE_FILTERS.map((option) => (
            <ToggleGroupItem key={option} value={option} className="px-3">
              {t(TYPE_FILTER_DICT_KEY[option], lang)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {buckets.length === 0 ? (
        <Empty className="px-5 py-10">
          <EmptyMedia variant="icon">
            <HistoryIcon size={20} aria-hidden="true" />
          </EmptyMedia>
          <EmptyDescription className="text-[14.5px]">
            {t('clients.timeline.empty', lang)}
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="space-y-6">
          {buckets.map((bucket) => (
            <div key={bucket.key} data-testid="timeline-bucket" data-bucket={bucket.key}>
              <div className="mb-3 flex items-center gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t(BUCKET_DICT_KEY[bucket.key], lang)}
                </h3>
                <span className="h-px grow bg-border" aria-hidden="true" />
              </div>

              {/* `value={0}` keeps every step un-completed: the "completed" state
                  paints the indicator with the accent, which UIC-03 reserves. */}
              <Timeline value={0}>
                {bucket.entries.map((event, index) => (
                  <EventRow key={event.id} event={event} step={index + 1} lang={lang} />
                ))}
              </Timeline>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
