'use client';

import { DurationSegmented } from './DurationSegmented';
import { t, type Lang } from '@/lib/i18n/dictionaries';

export interface ValiditySegmentedProps {
  /** Selected validity in days (15 / 30 / 60). Default 30 per D-7-05. */
  value: 15 | 30 | 60;
  onChange: (next: 15 | 30 | 60) => void;
  lang: Lang;
  disabled?: boolean;
}

/**
 * Per-proposal validity selector (PROP-25). Same visual contract as
 * <DurationSegmented> (D-7-16: one shared component, two configurations).
 * The label is rendered by the parent (LiveLoyerPreview); this component
 * renders only the 3-button group.
 *
 * NOTE: this is a thin wrapper around the generic DurationSegmented<V> from
 * Plan 07-04. The component's behaviour is segmented control, not duration-
 * specific; the wrapper exists so callers can pass `value: 15 | 30 | 60`
 * directly without hand-rolling the options array each call site.
 */
export function ValiditySegmented({
  value,
  onChange,
  lang,
  disabled = false,
}: ValiditySegmentedProps) {
  const options: ReadonlyArray<{ value: 15 | 30 | 60; label: string }> = [
    { value: 15, label: '15 ' + t('proposal.validity.suffix', lang) },
    { value: 30, label: '30 ' + t('proposal.validity.suffix', lang) },
    { value: 60, label: '60 ' + t('proposal.validity.suffix', lang) },
  ];

  return (
    <DurationSegmented<15 | 30 | 60>
      ariaLabel={t('proposal.validity.label', lang)}
      options={options}
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  );
}
