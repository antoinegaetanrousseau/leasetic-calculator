'use client';

import { segmentedGroupClass, segmentedItemClass } from '@/components/ui/segmented';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { Badge } from '@/components/ui/badge';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import { useMemo, useState } from 'react';
import { computeLoyer, tKey } from '@/lib/calc';
import { formatCurrency, formatNumber } from '@/lib/i18n/format';
import { t, type Lang, type DictKey } from '@/lib/i18n/dictionaries';
import type { GlobalParamsRow } from '@/db/schema';

export interface ExplainToolProps {
  lang: Lang;
  latestParams: GlobalParamsRow;
}

const DURATIONS = [36, 48, 60] as const;
const VALIDITIES = [15, 30, 60] as const;

export function ExplainTool({ lang, latestParams }: ExplainToolProps) {
  const [amountHTRaw, setAmountHTRaw] = useState<string>('');
  const [durationMonths, setDurationMonths] = useState<36 | 48 | 60 | null>(null);
  // Default validity from latestParams, clamped to the allowed set {15,30,60};
  // if the admin's stored default isn't in the set, fallback to 30.
  const defaultValidity = ([15, 30, 60] as const).includes(
    latestParams.validityDays as 15 | 30 | 60,
  )
    ? (latestParams.validityDays as 15 | 30 | 60)
    : 30;
  const [validityDays, setValidityDays] = useState<15 | 30 | 60>(defaultValidity);

  const amountNum = amountHTRaw ? Number(amountHTRaw.replace(/\s/g, '')) : NaN;
  const tranche = useMemo(
    () => (Number.isFinite(amountNum) && amountNum > 0 ? tKey(amountNum) : null),
    [amountNum],
  );

  const result = useMemo(() => {
    if (!Number.isFinite(amountNum) || !durationMonths || amountNum <= 0) return null;
    return computeLoyer({
      amountHT: String(amountNum),
      durationMonths,
      validityDays,
      coefficients: latestParams.coefficients,
      commissionPct: Number(latestParams.commissionPct),
      maxAmount: Number(latestParams.maxAmount),
    });
  }, [amountNum, durationMonths, validityDays, latestParams]);

  // Discriminated union narrowing per ComputeLoyerState in src/lib/calc/formula.ts.
  const isOnDemand = result?.computed?.state === 'on-demand';
  const computedState =
    result?.computed?.state === 'computed' ? result.computed : null;

  return (
    <section className="card" style={{ marginBottom: 16 }} aria-labelledby="explain-title">
      <SectionTitle>{t('admin.coefficients.explain.title', lang)}</SectionTitle>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, marginBottom: 16 }}>
        {t('admin.coefficients.explain.sub', lang)}
      </p>

      {/* Three input controls in a row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <Field>
          <FieldLabel htmlFor="explain-amount">
            {t('admin.coefficients.explain.amount.label', lang)}
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="explain-amount"
              type="number"
              min={1}
              step={1}
              value={amountHTRaw}
              onChange={(e) => setAmountHTRaw(e.currentTarget.value)}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupText>{t('common.ht', lang)}</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
          {tranche && (
            <Badge
              variant="secondary"
              className="mt-1.5 self-start rounded-full border-transparent bg-[color-mix(in_oklab,var(--teal)_8%,transparent)] text-[11.2px] font-semibold text-teal"
            >
              {t(`admin.tranche.${tranche.slice(1)}.range` as DictKey, lang)}
            </Badge>
          )}
        </Field>

        <Field>
          <FieldLabel>{t('admin.coefficients.explain.duration.label', lang)}</FieldLabel>
          <div
            className={segmentedGroupClass}
            role="group"
            aria-label={t('admin.coefficients.explain.duration.label', lang)}
          >
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                className={segmentedItemClass(durationMonths === d)}
                onClick={() => setDurationMonths(d)}
                aria-pressed={durationMonths === d}
              >
                {t(`form.duration.${d}` as DictKey, lang)}
              </button>
            ))}
          </div>
        </Field>

        <Field>
          <FieldLabel>{t('admin.coefficients.explain.validity.label', lang)}</FieldLabel>
          <div
            className={segmentedGroupClass}
            role="group"
            aria-label={t('admin.coefficients.explain.validity.label', lang)}
          >
            {VALIDITIES.map((v) => (
              <button
                key={v}
                type="button"
                className={segmentedItemClass(validityDays === v)}
                onClick={() => setValidityDays(v)}
                aria-pressed={validityDays === v}
              >
                {t(`admin.coefficients.explain.validity.${v}` as DictKey, lang)}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {/* Output area — aria-live for screen reader updates */}
      <div aria-live="polite" style={{ marginTop: 16 }}>
        {!result && (
          <p style={{ color: 'var(--muted)', fontStyle: 'italic', fontSize: 13 }}>
            {t('admin.coefficients.explain.placeholder', lang)}
          </p>
        )}

        {isOnDemand && (
          <div
            style={{
              display: 'inline-block',
              padding: '6px 12px',
              borderRadius: 9999,
              background: 'rgba(224,133,48,0.12)',
              color: 'var(--gold)',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {t('result.sur.demande', lang)}
          </div>
        )}

        {computedState && (
          <FormulaTrail
            lang={lang}
            amountHT={amountNum}
            commissionPct={Number(latestParams.commissionPct)}
            coeff={computedState.coeff}
            loyerHT={computedState.loyerHT}
            durationMonths={durationMonths!}
            validityDays={validityDays}
          />
        )}
      </div>
    </section>
  );
}

interface FormulaTrailProps {
  lang: Lang;
  amountHT: number;
  /** commission_pct — ADMIN-09 sole non-editor surface where this is rendered. */
  commissionPct: number;
  coeff: string;
  loyerHT: string;
  durationMonths: 36 | 48 | 60;
  validityDays: 15 | 30 | 60;
}

/**
 * Step-by-step formula trail (D-09-07).
 *
 * D-09-07 format:
 *   loyer = montantHT × (1 + commission/100) × coefficient / 100
 *         = 50 000 × (1 + 5/100) × 2.3000 / 100
 *         = 50 000 × 1.05 × 2.3000 / 100
 *         = 1 207.50 €/mois
 *
 * commission_pct is explicitly rendered here per ADMIN-09 / UI-SPEC §13 carve-out.
 */
function FormulaTrail({
  lang,
  amountHT,
  commissionPct,
  coeff,
  loyerHT,
  durationMonths,
  validityDays,
}: FormulaTrailProps) {
  const formattedAmount = formatNumber(amountHT, lang, { maximumFractionDigits: 0 });
  const formattedCoeff = formatNumber(Number(coeff), lang, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
  const commissionFactor = formatNumber(1 + commissionPct / 100, lang, {
    maximumFractionDigits: 4,
  });
  const formattedLoyer = formatCurrency(Number(loyerHT), lang);

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-sans)',
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: 'var(--muted)',
    textTransform: 'uppercase',
    marginBottom: 6,
  };

  return (
    <div
      style={{
        background: 'var(--paper)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '20px 24px',
        marginTop: 8,
        fontFamily: 'ui-monospace, "Cascadia Code", "Fira Mono", monospace',
        fontSize: 13,
        lineHeight: 1.7,
        color: 'var(--ink)',
      }}
    >
      <div style={labelStyle}>{t('admin.coefficients.explain.formula.label', lang)}</div>
      <div style={{ color: 'var(--muted)', marginBottom: 12 }}>
        {t('admin.coefficients.explain.formula.symbolic', lang)}
      </div>

      <div style={labelStyle}>{t('admin.coefficients.explain.substitution.label', lang)}</div>
      <div>
        {'= '}{formattedAmount}{' × (1 + '}{commissionPct}{'/100) × '}{formattedCoeff}{' / 100'}
      </div>
      <div>
        {'= '}{formattedAmount}{' × '}{commissionFactor}{' × '}{formattedCoeff}{' / 100'}
      </div>
      <div
        style={{
          marginTop: 8,
          fontFamily: 'var(--font-sans)',
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--gd)',
        }}
      >
        {'= '}{formattedLoyer}{' '}{t('admin.coefficients.explain.result.per_month', lang)}
      </div>

      <div
        style={{
          marginTop: 12,
          fontSize: 12,
          color: 'var(--muted)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {t('admin.coefficients.explain.result.duration_validity', lang)
          .replace('{0}', String(durationMonths))
          .replace('{1}', String(validityDays))}
      </div>
    </div>
  );
}
