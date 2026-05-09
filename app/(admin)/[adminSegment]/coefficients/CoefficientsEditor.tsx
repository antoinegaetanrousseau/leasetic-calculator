'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import type { z } from 'zod';
import { coeffEditorSchema, type CoeffEditorValues } from '@/lib/admin';
import { t, type Lang, type DictKey } from '@/lib/i18n/dictionaries';
import type { GlobalParamsRow } from '@/db/schema';
import { SaveConfirmModal } from './SaveConfirmModal';

export interface CoefficientsEditorProps {
  lang: Lang;
  /** Server component guarantees non-null (page throws otherwise). */
  latestParams: GlobalParamsRow;
}

const TRANCHES = ['t1', 't2', 't3', 't4'] as const;
const DURATIONS = ['36', '48', '60'] as const;

/**
 * RHF input type — the schema's INPUT side (validityDays is string/number before coerce).
 * Pattern from ProposalForm.tsx: use z.input for TFieldValues, CoeffEditorValues (output)
 * for TTransformed so handleSubmit's data is typed to the parsed/validated shape.
 */
type CoeffEditorInput = z.input<typeof coeffEditorSchema>;

export function CoefficientsEditor({ lang, latestParams }: CoefficientsEditorProps) {
  const form = useForm<CoeffEditorInput, unknown, CoeffEditorValues>({
    resolver: zodResolver(coeffEditorSchema),
    mode: 'onBlur',
    shouldFocusError: true,
    defaultValues: {
      commissionPct: String(latestParams.commissionPct),
      maxAmount: String(latestParams.maxAmount),
      validityDays: latestParams.validityDays,
      coefficients: latestParams.coefficients,
      note: '',
    },
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = form;

  // errors is typed to the input type — access nested errors via index to avoid
  // TS key-path complaints on the 4×3 coefficients grid.
  const coeffErrors = errors.coefficients as
    | Record<string, Record<string, { message?: string }>>
    | undefined;

  const [pending, setPending] = useState<CoeffEditorValues | null>(null);

  const onOpenConfirm = (data: CoeffEditorValues) => {
    setPending(data);
  };
  const onCloseModal = () => setPending(null);

  return (
    <>
      <section className="card" style={{ marginBottom: 16 }}>
        <div className="ctitle">
          <span className="dot" style={{ background: 'var(--gd)' }} aria-hidden="true" />
          <span>{t('admin.coefficients.editor.title', lang)}</span>
        </div>

        <form onSubmit={handleSubmit(onOpenConfirm)} noValidate>
          {/* Commission + max amount row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              marginTop: 16,
            }}
          >
            <div className="fld">
              <label htmlFor="commission-pct">
                {t('admin.coefficients.commission.label', lang)}
                <span className="req" aria-hidden="true">*</span>
              </label>
              <div className="ieu">
                <input
                  id="commission-pct"
                  type="text"
                  inputMode="decimal"
                  placeholder="5.00"
                  aria-invalid={errors.commissionPct ? true : undefined}
                  aria-describedby={
                    errors.commissionPct ? 'commission-pct-error' : undefined
                  }
                  className={errors.commissionPct ? 'invalid' : ''}
                  {...register('commissionPct')}
                />
                <span className="suffix">%</span>
              </div>
              {errors.commissionPct?.message && (
                <p id="commission-pct-error" role="alert" className="error-msg">
                  {t(errors.commissionPct.message as DictKey, lang)}
                </p>
              )}
            </div>

            <div className="fld">
              <label htmlFor="max-amount">
                {t('admin.coefficients.max_amount.label', lang)}
                <span className="req" aria-hidden="true">*</span>
              </label>
              <div className="ieu">
                <input
                  id="max-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="500000"
                  aria-invalid={errors.maxAmount ? true : undefined}
                  aria-describedby={errors.maxAmount ? 'max-amount-error' : undefined}
                  className={errors.maxAmount ? 'invalid' : ''}
                  {...register('maxAmount')}
                />
                <span className="suffix">{t('common.ht', lang)}</span>
              </div>
              {errors.maxAmount?.message && (
                <p id="max-amount-error" role="alert" className="error-msg">
                  {t(errors.maxAmount.message as DictKey, lang)}
                </p>
              )}
            </div>
          </div>

          {/* Validity default field */}
          <div className="fld" style={{ marginTop: 16 }}>
            <label htmlFor="validity-days">
              {t('admin.coefficients.validity.label', lang)}
              <span className="req" aria-hidden="true">*</span>
            </label>
            <input
              id="validity-days"
              type="number"
              min={1}
              step={1}
              aria-invalid={errors.validityDays ? true : undefined}
              aria-describedby={
                errors.validityDays ? 'validity-days-error' : 'validity-days-hint'
              }
              className={errors.validityDays ? 'invalid' : ''}
              {...register('validityDays', { valueAsNumber: true })}
            />
            <p
              id="validity-days-hint"
              style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}
            >
              {t('admin.coefficients.validity.hint', lang)}
            </p>
            {errors.validityDays?.message && (
              <p id="validity-days-error" role="alert" className="error-msg">
                {t(errors.validityDays.message as DictKey, lang)}
              </p>
            )}
          </div>

          {/* 4×3 coefficients table — UI-SPEC §3.1.1.3 */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: 24,
              marginBottom: 20,
            }}
          >
            <thead>
              <tr>
                <th
                  scope="col"
                  style={{
                    padding: '10px 12px',
                    borderBottom: '2px solid var(--border)',
                  }}
                />
                {DURATIONS.map((dk) => (
                  <th
                    key={dk}
                    scope="col"
                    style={{
                      fontSize: 11.8,
                      fontWeight: 700,
                      color: 'var(--muted)',
                      textAlign: 'center',
                      padding: '10px 12px',
                      borderBottom: '2px solid var(--border)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {t(`admin.cr.${dk}` as DictKey, lang)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TRANCHES.map((tk, ti) => (
                <tr key={tk}>
                  <th
                    scope="row"
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: 'var(--ink)',
                      padding: '10px 12px',
                      textAlign: 'left',
                      borderBottom:
                        ti < TRANCHES.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <div>{t(`admin.tranche.${tk.slice(1)}` as DictKey, lang)}</div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--muted)',
                        fontWeight: 400,
                      }}
                    >
                      {t(`admin.tranche.${tk.slice(1)}.range` as DictKey, lang)}
                    </div>
                  </th>
                  {DURATIONS.map((dk, di) => {
                    // RHF nesting: register('coefficients.t1.36') etc.
                    const fieldPath = `coefficients.${tk}.${dk}` as const;
                    const cellError = coeffErrors?.[tk]?.[dk]?.message;
                    return (
                      <td
                        key={dk}
                        style={{
                          padding: '6px 8px',
                          textAlign: 'center',
                          borderRight:
                            di < DURATIONS.length - 1 ? '1px solid var(--border)' : 'none',
                          borderBottom:
                            ti < TRANCHES.length - 1 ? '1px solid var(--border)' : 'none',
                        }}
                      >
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-invalid={cellError ? true : undefined}
                          className={cellError ? 'invalid' : ''}
                          style={{
                            fontFamily: 'ui-monospace, "Cascadia Code", monospace',
                            fontSize: 13,
                            textAlign: 'right',
                            width: 80,
                            padding: '4px 8px',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                          }}
                          {...register(fieldPath)}
                        />
                        {cellError && (
                          <p
                            role="alert"
                            style={{
                              fontSize: 11,
                              color: 'var(--danger)',
                              marginTop: 2,
                            }}
                          >
                            {t(cellError as DictKey, lang)}
                          </p>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Note field */}
          <div className="fld">
            <label htmlFor="note">
              {t('admin.coefficients.note.label', lang)}
            </label>
            <textarea
              id="note"
              placeholder={t('admin.coefficients.note.placeholder', lang)}
              rows={3}
              maxLength={500}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '0.65rem 0.9rem',
                fontSize: 14,
                color: 'var(--ink)',
                background: 'var(--surface)',
                minHeight: 80,
                resize: 'vertical',
                width: '100%',
                fontFamily: 'inherit',
              }}
              {...register('note')}
            />
          </div>

          {/* Save action row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 24,
              justifyContent: 'flex-end',
            }}
          >
            {!isDirty && (
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                {t('admin.coefficients.save.noop', lang)}
              </span>
            )}
            <button
              type="submit"
              className="btn-green"
              disabled={isSubmitting || !isDirty}
              aria-disabled={isSubmitting || !isDirty}
              aria-busy={isSubmitting || undefined}
              style={{
                opacity: isSubmitting || !isDirty ? 0.6 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Save size={17} strokeWidth={1.6} aria-hidden="true" />
              {t('admin.coefficients.save.btn', lang)}
            </button>
          </div>
        </form>
      </section>

      {pending && (
        <SaveConfirmModal
          lang={lang}
          latestParams={latestParams}
          pending={pending}
          onClose={onCloseModal}
          onConfirmed={onCloseModal}
        />
      )}
    </>
  );
}
