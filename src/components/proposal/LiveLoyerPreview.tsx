'use client';

import { useMemo, useRef, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Edit3, Lock } from 'lucide-react';
import {
  computeLoyer,
  generateLcRef,
  type ComputeLoyerResult,
  type ComputeLoyerState,
  type ProposalInput,
} from '@/lib/calc';
import { formatCurrency, formatNumber } from '@/lib/i18n/format';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { useDebouncedValue } from './useDebouncedValue';
import { CopyRefButton } from './CopyRefButton';
import { ValiditySegmented } from './ValiditySegmented';

export interface LiveLoyerPreviewProps {
  lang: Lang;
  /**
   * D-7-12: coefficients-expired UI state machinery is wired but not
   * triggered in Phase 7 (no global_params staleness check until Phase 8).
   * Phase 8 flips this from a global_params freshness probe.
   */
  coefficientsExpired?: boolean;
}

type EffectiveState = ComputeLoyerState['state'] | 'expired';

/**
 * Sticky right-column live-preview card (PROP-07 + PROP-24 + PROP-25).
 *
 * Subscribes to the parent form's [amountHT, durationMonths, validityDays]
 * via useWatch + useDebouncedValue (300ms — D-7-02 / UI-SPEC §5.2). The
 * computeLoyer call is the same module Phase 8's server route will recompute
 * with on save (CALC-07).
 *
 * State machine mirrors v10 updateInline (lines 1425-1454):
 *   idle / expired / missing / on-demand / computed
 *
 * LC reference: generated ONCE on idle→non-idle transition (matches v10
 * generate() line 1741). Held until form is reset (parent's reset() clears
 * amountHT → idle → next non-idle gets a fresh LC). The calc engine returns
 * lcRef='' in its 'computed' branch — this component owns the ref lifecycle
 * (07-01-SUMMARY gotcha #3 + PITFALLS §10.7 separation).
 */
export function LiveLoyerPreview({
  lang,
  coefficientsExpired = false,
}: LiveLoyerPreviewProps) {
  const { control, setValue } = useFormContext<ProposalInput>();

  const watched = useWatch({
    control,
    name: ['amountHT', 'durationMonths', 'validityDays'],
  });
  const [amountHT, durationMonths, validityDays] = watched;

  // Debounce the watched tuple (D-7-02). The debounced object is referentially
  // stable across re-renders that don't change the underlying values, but the
  // useMemo below depends on the inner primitives so this is safe.
  const debounced = useDebouncedValue(
    { amountHT, durationMonths, validityDays },
    300,
  );

  const [lcRef, setLcRef] = useState<string>('');

  /**
   * Compute the live result. Returns null when the form has not yet had its
   * required inputs filled (matches v10's `!a || a <= 25000 || !dur` idle
   * branch — but we let computeLoyer itself do the ≤ 25 000 check; we just
   * gate on "no input typed yet" / "no duration picked").
   */
  const result: ComputeLoyerResult | null = useMemo(() => {
    if (
      !debounced.amountHT ||
      debounced.amountHT.length === 0 ||
      debounced.durationMonths === undefined
    ) {
      return null;
    }
    return computeLoyer({
      amountHT: debounced.amountHT,
      durationMonths: debounced.durationMonths as 36 | 48 | 60,
      validityDays: (debounced.validityDays ?? 30) as 15 | 30 | 60,
    });
  }, [debounced.amountHT, debounced.durationMonths, debounced.validityDays]);

  // Effective state: 'expired' (D-7-12 stub) takes precedence over computed.
  const effectiveState: EffectiveState = useMemo(() => {
    if (result === null) return 'idle';
    if (coefficientsExpired) return 'expired';
    return result.computed.state;
  }, [result, coefficientsExpired]);

  /**
   * LC ref lifecycle (v10 line 1741 pattern + 07-01-SUMMARY gotcha #3).
   *
   * Generated ONCE on idle→non-idle transition; cleared on transitions BACK
   * to idle. Implemented via "store-info-from-previous-render" pattern
   * (https://react.dev/reference/react/useState#storing-information-from-previous-renders)
   * — calling setState during render with a guard avoids the
   * react-hooks/set-state-in-effect lint error and React triggers an
   * immediate re-render with the new value (no DOM commit between).
   *
   * This pattern is preferred over useEffect because the LC ref is DERIVED
   * from a render-time state transition, not synchronized with an external
   * system. Phase 6's error.tsx applied the same lint-rule fix (see
   * STATE.md Decisions Log).
   */
  const prevStateRef = useRef<EffectiveState>('idle');
  if (effectiveState !== prevStateRef.current) {
    prevStateRef.current = effectiveState;
    if (effectiveState === 'idle') {
      if (lcRef !== '') setLcRef('');
    } else if (lcRef === '') {
      setLcRef(generateLcRef());
    }
  }

  return (
    <aside
      className="card"
      style={{
        position: 'sticky',
        top: 'calc(var(--topbar-h) + 24px)',
        minHeight: 320,
      }}
      aria-label={t('proposal.section.preview', lang)}
    >
      <div className="ctitle">
        <span>{t('proposal.section.preview', lang)}</span>
      </div>

      {effectiveState === 'idle' && <IdleBody lang={lang} />}
      {effectiveState === 'expired' && <ExpiredBody lang={lang} />}
      {effectiveState === 'missing' && <MissingBody lang={lang} />}
      {effectiveState === 'on-demand' && <OnDemandBody lang={lang} />}
      {effectiveState === 'computed' &&
        result &&
        result.computed.state === 'computed' && (
          <ComputedBody
            lang={lang}
            loyerHT={result.computed.loyerHT}
            coeff={result.computed.coeff}
            durationMonths={debounced.durationMonths as 36 | 48 | 60}
          />
        )}

      {/* LC ref + Copy button — visible when state is computed or on-demand. */}
      {(effectiveState === 'computed' || effectiveState === 'on-demand') &&
        lcRef && (
          <>
            <hr
              style={{
                border: 'none',
                borderTop: '1px solid var(--border)',
                margin: '16px 0',
              }}
            />
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--ink)',
                  userSelect: 'all',
                  marginBottom: 8,
                }}
              >
                {lcRef}
              </div>
              <CopyRefButton lcRef={lcRef} lang={lang} />
            </div>
          </>
        )}

      {/* Validity selector — always visible (PROP-25 + D-7-04 + D-7-16). */}
      <hr
        style={{
          border: 'none',
          borderTop: '1px solid var(--border)',
          margin: '16px 0',
        }}
      />
      <div>
        <div
          style={{
            textTransform: 'uppercase',
            fontSize: '11.8px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: 'var(--muted)',
            marginBottom: 8,
          }}
        >
          {t('proposal.validity.label', lang)}
        </div>
        <ValiditySegmented
          lang={lang}
          value={(validityDays ?? 30) as 15 | 30 | 60}
          onChange={(v) =>
            setValue('validityDays', v, { shouldDirty: true })
          }
        />
        {effectiveState === 'computed' && (
          <p
            style={{
              fontSize: '11.2px',
              color: 'var(--muted)',
              marginTop: 8,
              textAlign: 'center',
            }}
          >
            {t('proposal.validity.computed.label', lang).replace(
              '{0}',
              String(validityDays ?? 30),
            )}
          </p>
        )}
      </div>
    </aside>
  );
}

// ── State bodies ────────────────────────────────────────────────────────────

function IdleBody({ lang }: { lang: Lang }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '24px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Edit3
        size={38}
        strokeWidth={1.3}
        color="var(--muted)"
        style={{ opacity: 0.4 }}
        aria-hidden="true"
      />
      <p style={{ fontSize: '14.5px', color: 'var(--muted)', marginTop: 12 }}>
        {t('result.inline.placeholder', lang)}
      </p>
    </div>
  );
}

function ExpiredBody({ lang }: { lang: Lang }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '24px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Lock
        size={38}
        strokeWidth={1.3}
        color="var(--gold)"
        style={{ opacity: 0.6 }}
        aria-hidden="true"
      />
      <p style={{ fontSize: '14.5px', color: 'var(--muted)', marginTop: 12 }}>
        {t('result.inline.expired', lang)}
      </p>
    </div>
  );
}

function MissingBody({ lang }: { lang: Lang }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '24px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Edit3
        size={38}
        strokeWidth={1.3}
        color="var(--muted)"
        style={{ opacity: 0.4 }}
        aria-hidden="true"
      />
      <p style={{ fontSize: '14.5px', color: 'var(--muted)', marginTop: 12 }}>
        {t('result.inline.missing', lang)}
      </p>
    </div>
  );
}

function OnDemandBody({ lang }: { lang: Lang }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div
        style={{
          textTransform: 'uppercase',
          fontSize: '11.2px',
          fontWeight: 600,
          letterSpacing: '0.08em',
          color: 'var(--muted)',
          marginBottom: 6,
        }}
      >
        {t('result.loyer.label', lang)}
      </div>
      <div
        style={{
          fontSize: '22px',
          fontWeight: 700,
          color: 'var(--navy)',
          lineHeight: 1.1,
        }}
      >
        {t('result.sur.demande', lang)}
      </div>
      <div style={{ fontSize: '11.2px', color: 'var(--muted)', marginTop: 6 }}>
        {t('result.inline.over.max', lang)}
      </div>
    </div>
  );
}

function ComputedBody({
  lang,
  loyerHT,
  coeff,
  durationMonths,
}: {
  lang: Lang;
  loyerHT: string;
  coeff: string;
  durationMonths: 36 | 48 | 60;
}) {
  const loyerNum = Number(loyerHT);
  const coeffNum = Number(coeff);

  // formatCurrency (Phase 6 D-28) — explicit fr-FR / en-GB locale.
  const formattedLoyer = formatCurrency(loyerNum, lang);

  // Coefficient suffix — v10 line 1452: "<dur> mois · coeff. <coeff>%"
  const formattedCoeff = formatNumber(coeffNum, lang, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
  const suffix = t('result.coeff.suffix', lang)
    .replace('{0}', String(durationMonths))
    .replace('{1}', formattedCoeff);

  return (
    <div
      style={{ textAlign: 'center', padding: '8px 0' }}
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        style={{
          textTransform: 'uppercase',
          fontSize: '11.2px',
          fontWeight: 600,
          letterSpacing: '0.08em',
          color: 'var(--muted)',
          marginBottom: 6,
        }}
      >
        {t('result.loyer.label', lang)}
      </div>
      <div
        style={{
          fontSize: '30px',
          fontWeight: 700,
          color: 'var(--navy)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
          lineHeight: 1,
          margin: '4px 0',
        }}
      >
        {formattedLoyer}
      </div>
      <div style={{ fontSize: '11.2px', color: 'var(--muted)' }}>{suffix}</div>
    </div>
  );
}
