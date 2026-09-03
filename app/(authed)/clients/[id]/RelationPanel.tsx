'use client';

/**
 * Phase 34 Plan 12 Task 2 — the private relationship panel (FICHE-04,
 * D-01 tier three, D-02, D-18).
 *
 * D-01's third tier: the lead source and the description belong to the OWNING
 * partner alone. They live on `client_relationships`, not on the shared
 * company row, so two partners quoting the same SIREN never see each other's.
 * That is also why an edit here needs no audit row (D-03) — nobody else can
 * observe the result.
 *
 * This panel is the exact complement of the registry panel it sits beside:
 * everything here is editable and nothing here is registry data. Neither
 * component can reach the other's tier, and both a rendered-output assertion
 * and a source grep hold that boundary.
 *
 * Editing is in place, through the panel's own dialog (D-18). The empty state
 * keeps the Modifier control, because a partner who has recorded nothing yet
 * is precisely the one who needs the way in — that is UIC-05's stated
 * exception for an empty state with a next action.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { BookOpenIcon } from '@/components/ui/icons';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { LEAD_SOURCE_DICT_KEY, type LeadSource } from '@/lib/relationship/kinds';
import { EditRelationDialog } from './EditRelationDialog';

export interface RelationPanelProps {
  relationshipId: string;
  leadSource: LeadSource | null;
  description: string | null;
  lang: Lang;
}

export function RelationPanel({
  relationshipId,
  leadSource,
  description,
  lang,
}: RelationPanelProps) {
  const [open, setOpen] = useState(false);

  const hasContent = leadSource !== null || (description !== null && description.length > 0);

  return (
    <section className="card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <SectionTitle className="mb-0">{t('clients.relation.title', lang)}</SectionTitle>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          {t('clients.relation.modify', lang)}
        </Button>
      </div>

      {hasContent ? (
        <dl className="flex flex-col gap-3">
          {leadSource !== null && (
            <div
              data-testid="relation-field-lead-source"
              className="flex flex-col gap-0.5 sm:flex-row sm:gap-4"
            >
              <dt className="text-[12.5px] text-muted-foreground sm:w-40 sm:shrink-0">
                {t('clients.relation.field.leadSource', lang)}
              </dt>
              <dd className="text-[14px]">{t(LEAD_SOURCE_DICT_KEY[leadSource], lang)}</dd>
            </div>
          )}

          {description !== null && description.length > 0 && (
            <div
              data-testid="relation-field-description"
              className="flex flex-col gap-0.5 sm:flex-row sm:gap-4"
            >
              <dt className="text-[12.5px] text-muted-foreground sm:w-40 sm:shrink-0">
                {t('clients.relation.field.description', lang)}
              </dt>
              {/* Partner-authored text, rendered as a text node and never as markup. */}
              <dd className="text-[14px] whitespace-pre-wrap">{description}</dd>
            </div>
          )}
        </dl>
      ) : (
        <Empty className="px-5 py-10">
          <EmptyMedia variant="icon">
            <BookOpenIcon size={20} aria-hidden="true" />
          </EmptyMedia>
          <EmptyDescription className="text-[14.5px]">
            {t('clients.relation.empty', lang)}
          </EmptyDescription>
        </Empty>
      )}

      <EditRelationDialog
        open={open}
        onOpenChange={setOpen}
        relationshipId={relationshipId}
        defaultValues={{ leadSource, description }}
        lang={lang}
      />
    </section>
  );
}
