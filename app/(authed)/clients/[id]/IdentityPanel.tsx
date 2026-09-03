/**
 * Phase 34 Plan 12 Task 1 — the registry identity panel (FICHE-02, D-01 tier
 * one, D-02, D-06, D-11).
 *
 * A server component, and a READ-ONLY one by construction: the registry owns
 * identity (D-01), so no partner-facing form may write any field on this
 * panel (D-02). That rule is structural rather than stylistic, so it is
 * guarded twice — a grep contract on this file and an assertion that counts
 * form controls in the rendered DOM, in both IdentityPanel.test.tsx and
 * page.test.tsx. The only interactive element here is the refresh control,
 * which re-runs the SIRENE lookup; it writes nothing a caller supplied.
 *
 * Every value renders as a React text node. Registry data is untrusted
 * third-party text on a row shared between partners (D-10), so it is never
 * interpolated as markup and never composed into a URL.
 *
 * D-06 shapes what is displayed: the API returns codes and never labels, so
 * headcount and the NAF section go through the two small tables the app owns,
 * both of which fall back to the raw code, and the legal form displays as its
 * code because the ~100-row table is deliberately not shipped.
 *
 * An absent field is OMITTED rather than rendered as a dash. A company that
 * has never been synced would otherwise be eight blank rows, which reads as a
 * broken panel; UIC-05's empty state plus the refresh control tells a partner
 * why it is empty and what to do about it.
 */
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { BuildingIcon } from '@/components/ui/icons';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { t, type DictKey, type Lang } from '@/lib/i18n/dictionaries';
import { formatDate } from '@/lib/i18n/format';
// Reached through the module namespace so each table helper is named exactly
// once in this file, on the line that calls it.
import * as registryLabels from '@/lib/registry/labels';
import {
  REGISTRY_STATE_DICT_KEY,
  REGISTRY_STATUS_DICT_KEY,
  type RegistryState,
  type RegistryStatus,
} from '@/lib/relationship/kinds';
import { cn } from '@/lib/utils';
import { RegistryRefreshButton } from './RegistryRefreshButton';

/**
 * The registry-tier subset of `ClientRelationshipDetail`. Written out rather
 * than `Pick<...>`-ed so this panel's surface is auditable on its own: adding
 * a field here is a visible edit, not a silent widening.
 */
export interface RegistryIdentity {
  legalName: string | null;
  addressLine: string | null;
  postalCode: string | null;
  city: string | null;
  /** The raw legal-form CODE — D-06 ships no legal-form table. */
  legalForm: string | null;
  nafCode: string | null;
  nafSection: string | null;
  headcountBand: string | null;
  /** A `date` column: Drizzle hands back 'YYYY-MM-DD', not a Date. */
  foundedOn: string | null;
  registryState: RegistryState | null;
  registryStatus: RegistryStatus;
  registrySyncedAt: Date | null;
}

export interface IdentityPanelProps {
  relationshipId: string;
  identity: RegistryIdentity;
  siren: string | null;
  lang: Lang;
}

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};

interface FieldRow {
  /** Suffix of the row's `data-testid`, and its React key. */
  slug: string;
  labelKey: DictKey;
  value: string;
}

/** Join the parts that are actually present, dropping the rest. */
function joinPresent(parts: (string | null | undefined)[], separator: string): string | null {
  const kept = parts
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter((part) => part.length > 0);
  return kept.length > 0 ? kept.join(separator) : null;
}

/** `'2001-03-04'` → a locale-formatted date. A malformed value is dropped. */
function formatRegistryDay(day: string | null, lang: Lang): string | null {
  if (!day) return null;
  const parsed = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatDate(parsed, lang, { ...DATE_OPTS, timeZone: 'UTC' });
}

function buildRows(identity: RegistryIdentity, lang: Lang): FieldRow[] {
  const rows: FieldRow[] = [];

  const push = (slug: string, labelKey: DictKey, value: string | null) => {
    if (value !== null && value.length > 0) {
      rows.push({ slug, labelKey, value });
    }
  };

  push('legal-name', 'clients.registry.field.legalName', identity.legalName);
  push(
    'address',
    'clients.registry.field.address',
    joinPresent(
      [identity.addressLine, joinPresent([identity.postalCode, identity.city], ' ')],
      ', ',
    ),
  );
  push('legal-form', 'clients.registry.field.legalForm', identity.legalForm);
  push(
    'activity',
    'clients.registry.field.activity',
    joinPresent(
      [identity.nafCode, registryLabels.nafSectionLabel(identity.nafSection)],
      ' — ',
    ),
  );
  push(
    'headcount',
    'clients.registry.field.headcount',
    registryLabels.headcountBandLabel(identity.headcountBand),
  );
  push('founded-on', 'clients.registry.field.foundedOn', formatRegistryDay(identity.foundedOn, lang));

  return rows;
}

export function IdentityPanel({ relationshipId, identity, siren, lang }: IdentityPanelProps) {
  const rows = buildRows(identity, lang);
  const ceased = identity.registryState === 'C';

  const syncLine = identity.registrySyncedAt
    ? t('clients.registry.syncedAt', lang).replace(
        '{0}',
        formatDate(identity.registrySyncedAt, lang, DATE_OPTS),
      )
    : t('clients.registry.neverSynced', lang);

  return (
    <section className="card mb-4" data-testid="identity-panel">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <SectionTitle className="mb-0">{t('clients.registry.title', lang)}</SectionTitle>
          <Badge variant="outline">
            {t(REGISTRY_STATUS_DICT_KEY[identity.registryStatus], lang)}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12.5px] text-muted-foreground">{syncLine}</span>
          {/* No SIREN means no lookup key, so the control is not offered at
              all rather than offered and refused. */}
          {siren !== null && <RegistryRefreshButton relationshipId={relationshipId} lang={lang} />}
        </div>
      </div>

      {rows.length === 0 && identity.registryState === null ? (
        <Empty className="px-5 py-10">
          <EmptyMedia variant="icon">
            <BuildingIcon size={20} aria-hidden="true" />
          </EmptyMedia>
          <EmptyDescription className="text-[14.5px]">
            {t('clients.registry.empty', lang)}
          </EmptyDescription>
        </Empty>
      ) : (
        <dl className="flex flex-col gap-3">
          {rows.map((row) => (
            <div
              key={row.slug}
              data-testid={`identity-field-${row.slug}`}
              className="flex flex-col gap-0.5 sm:flex-row sm:gap-4"
            >
              <dt className="text-[12.5px] text-muted-foreground sm:w-40 sm:shrink-0">
                {t(row.labelKey, lang)}
              </dt>
              <dd className="text-[14px] break-words">{row.value}</dd>
            </div>
          ))}

          {identity.registryState !== null && (
            <div
              data-testid="identity-field-state"
              data-ceased={ceased ? 'true' : 'false'}
              className="flex flex-col gap-0.5 sm:flex-row sm:gap-4"
            >
              <dt className="text-[12.5px] text-muted-foreground sm:w-40 sm:shrink-0">
                {t('clients.registry.field.state', lang)}
              </dt>
              <dd className="text-[14px]">
                {/* D-11: a partner must see a ceased company before quoting
                    it. Prominence is carried by weight and a neutral badge —
                    UIC-03 reserves the destructive fill for actions that
                    destroy something, and a company's own status is not one. */}
                <Badge variant="outline" className={cn(ceased && 'font-bold')}>
                  {t(REGISTRY_STATE_DICT_KEY[identity.registryState], lang)}
                </Badge>
              </dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}
