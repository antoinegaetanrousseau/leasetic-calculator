import { Document, Page, Text, View, Font } from '@react-pdf/renderer';
import path from 'node:path';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { formatCurrency, formatDate, formatNumber } from '@/lib/i18n/format';
import { pdfColors, pdfFontSizes, pdfFontWeights, pdfPageMargins } from './styles';
import { SectionLabel } from './components/section-label';
import { KeyValueRow } from './components/key-value-row';

// ── Font.register: once, at module load ──────────────────────────────────────
// PROP-19: Plus Jakarta Sans woff2 self-hosted under public/fonts/. The PDF
// renderer fetches the font bytes during render — register-once-render-many.
//
// Path resolution: in Node runtime, `process.cwd()` is the Next project root
// when the route handler runs. Phase 5 self-hosted 5 weights; PDF needs 4
// (300 unused — bodies stay at 400 minimum for readability).
//
// Determinism: file:// absolute paths guarantee the same font bytes regardless
// of machine; PROP-17 / T-08-05-01 — font drift = CI red via Plan 08-06 gate.

const FONT_DIR = path.join(process.cwd(), 'public', 'fonts');

// PROP-19 / determinism (T-08-05-04): Plus Jakarta Sans self-hosted.
//
// Font format: TTF (converted from the Phase 5 woff2 set via wawoff2 decompressor).
// Reason: @react-pdf/renderer uses PDFKit/fontkit for font subsetting. fontkit's
// TTFSubset correctly handles multi-weight subsetting with TTF; the woff2 brotli
// path fails with DataView bounds errors when multiple weights share the same
// Brotli decompression buffer (fontkit upstream issue). The TTF files are derived
// from the same woff2 source and committed alongside them in public/fonts/.
// Determinism is preserved: same font binary bytes on every machine.
//
// Note: Plus Jakarta Sans has no separate italic cut. fontStyle: 'italic' is
// not used in the document (validity caption is regular weight only).
Font.register({
  family: 'PlusJakartaSans',
  fonts: [
    { src: path.join(FONT_DIR, 'PlusJakartaSans-400.ttf'), fontWeight: 400 },
    { src: path.join(FONT_DIR, 'PlusJakartaSans-500.ttf'), fontWeight: 500 },
    { src: path.join(FONT_DIR, 'PlusJakartaSans-600.ttf'), fontWeight: 600 },
    { src: path.join(FONT_DIR, 'PlusJakartaSans-700.ttf'), fontWeight: 700 },
  ],
});

/**
 * Determinism contract (PROP-17 / UI-SPEC §3.3.15):
 *   - No Date.now() — creation date comes from the proposal row
 *   - No Math.random() in the render tree
 *   - All hex colors as literals (styles.ts inlines them)
 *   - <Document creationDate, modificationDate, producer, creator> all set
 *     to constants so PDF metadata bytes stay stable
 */

export interface ProposalDocumentProps {
  /** The proposal row's snapshot. Caller passes the as-INSERTed values
   *  (D-A2: language is the proposal's snapshot lang, not session lang). */
  data: {
    lcRef: string;
    language: Lang;
    createdAt: Date;
    inputs: {
      partnerCo: string;
      partnerName: string;
      clientCo: string;
      clientName?: string;
      clientRole?: string;
      clientTel?: string;
      clientEmail?: string;
      clientSiren?: string;
      slb?: boolean;
      evalParc?: boolean;
      amountHT: string;            // digit-only
      durationMonths: 36 | 48 | 60;
      validityDays: 15 | 30 | 60;
      projectDesc?: string;
      partnerRef?: string;
    };
    computed: {
      state: 'computed' | 'on-demand';
      trancheKey?: 't1' | 't2' | 't3' | 't4';
      loyerHT?: string;            // digit-string
      coeff?: string;              // digit-string
      isOnDemand?: boolean;
    };
  };
}

// ── Inline recipient row labels (planner discretion T-08-05-07 / D-A3) ──────
// Short bilingual strings used as KeyValueRow keyText inside the recipient block.
// Not threaded through the runtime t() system — these are PDF-only literals.
// If Phase 9/10 wants centralization, it's a 6-key migration (logged SUMMARY).
const LABELS: Record<'partnerCo' | 'partnerName' | 'clientCo' | 'contact' | 'role' | 'tel' | 'email' | 'siren', Record<Lang, string>> = {
  partnerCo:   { fr: 'Société',     en: 'Company'  },
  partnerName: { fr: 'Commercial',  en: 'Sales rep' },
  clientCo:    { fr: 'Société',     en: 'Company'   },
  contact:     { fr: 'Contact',     en: 'Contact'   },
  role:        { fr: 'Fonction',    en: 'Role'       },
  tel:         { fr: 'Téléphone',   en: 'Phone'      },
  email:       { fr: 'Email',       en: 'Email'      },
  siren:       { fr: 'SIREN',       en: 'SIREN'      },
};

function lbl(key: keyof typeof LABELS, lang: Lang): string {
  return LABELS[key][lang];
}

export function ProposalDocument({ data }: ProposalDocumentProps) {
  const { lcRef, language: lang, createdAt, inputs, computed } = data;
  const expiresAt = new Date(createdAt.getTime() + inputs.validityDays * 86_400_000);
  const projectText = inputs.projectDesc?.trim() || t('pdf.project.placeholder', lang);
  const partnerRefText = inputs.partnerRef?.trim()
    ? `${t('pdf.project.ref.prefix', lang)} ${inputs.partnerRef.trim()}`
    : null;

  return (
    <Document
      title={`Proposition ${lcRef}`}
      author="Leasétic"
      subject="Financial lease proposal"
      keywords={`leasetic,proposal,${lcRef}`}
      creator="Leasetic Matrice v1.1"
      producer="Leasetic Matrice v1.1"
      creationDate={createdAt}
      modificationDate={createdAt}
    >
      <Page size="A4" style={{
        paddingTop: pdfPageMargins.top,
        paddingBottom: pdfPageMargins.bottom,
        paddingHorizontal: pdfPageMargins.horizontal,
        fontFamily: 'PlusJakartaSans',
        fontSize: pdfFontSizes.body,
        color: pdfColors.ink,
        backgroundColor: pdfColors.surface,
      }}>
        {/* ── Header band ───────────────────────────────────────────────── */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16,
        }}>
          <View>
            <Text style={{
              fontSize: pdfFontSizes.title,
              fontWeight: pdfFontWeights.bold,
              color: pdfColors.navy,
            }}>LEASÉTIC</Text>
            <Text style={{
              fontSize: pdfFontSizes.caption,
              fontWeight: pdfFontWeights.regular,
              color: pdfColors.muted,
              marginTop: 2,
            }}>{t('pdf.tagline', lang)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{
              fontSize: pdfFontSizes.body,
              fontWeight: pdfFontWeights.semibold,
              color: pdfColors.navy,
            }}>{t('pdf.ref.label', lang)} {lcRef}</Text>
            <Text style={{
              fontSize: pdfFontSizes.caption,
              fontWeight: pdfFontWeights.regular,
              color: pdfColors.muted,
              marginTop: 2,
            }}>{formatDate(createdAt, lang)}</Text>
          </View>
        </View>
        <View style={{
          height: 1,
          backgroundColor: pdfColors.border,
          marginVertical: 16,
        }} />

        {/* ── Title row ─────────────────────────────────────────────────── */}
        <Text style={{
          fontSize: pdfFontSizes.title,
          fontWeight: pdfFontWeights.bold,
          color: pdfColors.navy,
          marginBottom: 24,
        }}>{t('pdf.title', lang)}</Text>

        {/* ── Recipient block ───────────────────────────────────────────── */}
        <View style={{ marginBottom: 12 }}>
          <SectionLabel>{t('pdf.section.recipient', lang)}</SectionLabel>
          <KeyValueRow keyText={lbl('partnerCo', lang)} valueText={inputs.partnerCo} />
          <KeyValueRow keyText={lbl('partnerName', lang)} valueText={inputs.partnerName} />
          <View style={{ height: 1, backgroundColor: pdfColors.border, marginVertical: 6 }} />
          <KeyValueRow keyText={lbl('clientCo', lang)} valueText={inputs.clientCo} />
          {inputs.clientName && (
            <KeyValueRow keyText={lbl('contact', lang)} valueText={inputs.clientName} />
          )}
          {inputs.clientRole && (
            <KeyValueRow keyText={lbl('role', lang)} valueText={inputs.clientRole} />
          )}
          {inputs.clientTel && (
            <KeyValueRow keyText={lbl('tel', lang)} valueText={inputs.clientTel} />
          )}
          {inputs.clientEmail && (
            <KeyValueRow keyText={lbl('email', lang)} valueText={inputs.clientEmail} />
          )}
          {inputs.clientSiren && (
            <KeyValueRow keyText={lbl('siren', lang)} valueText={inputs.clientSiren} />
          )}
        </View>

        {/* ── Project block ─────────────────────────────────────────────── */}
        <View style={{ marginBottom: 12 }}>
          <SectionLabel>{t('pdf.section.project', lang)}</SectionLabel>
          <Text style={{
            fontSize: pdfFontSizes.body,
            fontWeight: pdfFontWeights.medium,
            color: pdfColors.ink,
            marginBottom: 4,
          }}>
            {projectText}
          </Text>
          {partnerRefText && (
            <Text style={{
              fontSize: pdfFontSizes.caption,
              fontWeight: pdfFontWeights.regular,
              color: pdfColors.muted,
            }}>
              {partnerRefText}
            </Text>
          )}
        </View>

        {/* ── Computation breakdown ─────────────────────────────────────── */}
        <View style={{
          borderWidth: 1,
          borderColor: pdfColors.border,
          borderRadius: 8,
          padding: 16,
          marginBottom: 12,
        }}>
          <KeyValueRow
            keyText={t('proposal.montant.label', lang)}
            valueText={formatCurrency(Number(inputs.amountHT), lang)}
          />
          <KeyValueRow
            keyText={t('proposal.duree.label', lang)}
            valueText={`${inputs.durationMonths} ${t('proposal.duree.months', lang)}`}
          />
          {computed.state === 'computed' && computed.coeff && (
            <KeyValueRow
              keyText={t('pdf.computed.coefficient.label', lang)}
              valueText={`${formatNumber(Number(computed.coeff), lang, { minimumFractionDigits: 4, maximumFractionDigits: 4 })} %`}
            />
          )}
        </View>

        {/* ── Loyer feature card (visual climax) ────────────────────────── */}
        <View style={{
          borderWidth: 1,
          borderColor: pdfColors.green,
          borderRadius: 8,
          padding: 24,
          marginBottom: 16,
          backgroundColor: pdfColors.greenTint,
        }}>
          <Text style={{
            fontSize: pdfFontSizes.caption,
            fontWeight: pdfFontWeights.bold,
            color: pdfColors.muted,
            textTransform: 'uppercase',
            letterSpacing: 0.06,
            marginBottom: 6,
          }}>{t('pdf.loyer.label', lang)}</Text>
          {computed.state === 'on-demand' || !computed.loyerHT ? (
            <Text style={{
              fontSize: pdfFontSizes.title,
              fontWeight: pdfFontWeights.bold,
              color: pdfColors.navy,
            }}>{t('pdf.loyer.on.demand', lang)}</Text>
          ) : (
            <Text style={{
              fontSize: pdfFontSizes.loyer,
              fontWeight: pdfFontWeights.bold,
              color: pdfColors.navy,
              letterSpacing: -0.5,
            }}>{formatCurrency(Number(computed.loyerHT), lang)}</Text>
          )}
          <Text style={{
            fontSize: pdfFontSizes.body,
            fontWeight: pdfFontWeights.regular,
            color: pdfColors.muted,
            marginTop: 4,
          }}>
            {t('pdf.loyer.subtext', lang).replace('{0}', String(inputs.durationMonths))}
          </Text>
        </View>

        {/* ── Interests block (conditional) ─────────────────────────────── */}
        {(inputs.slb || inputs.evalParc) && (
          <View style={{ marginBottom: 12 }}>
            <SectionLabel>{t('pdf.section.interests', lang)}</SectionLabel>
            {inputs.slb && (
              <Text style={{
                fontSize: pdfFontSizes.body,
                fontWeight: pdfFontWeights.regular,
                color: pdfColors.ink,
                marginBottom: 4,
              }}>
                {`✓  ${t('proposal.interests.slb', lang)}`}
              </Text>
            )}
            {inputs.evalParc && (
              <Text style={{
                fontSize: pdfFontSizes.body,
                fontWeight: pdfFontWeights.regular,
                color: pdfColors.ink,
              }}>
                {`✓  ${t('proposal.interests.eval', lang)}`}
              </Text>
            )}
          </View>
        )}

        {/* ── Validity caption ─────────────────────────────────────────── */}
        <Text style={{
          fontSize: pdfFontSizes.body,
          fontWeight: pdfFontWeights.regular,
          color: pdfColors.muted,
          marginBottom: 24,
          lineHeight: 1.5,
        }}>
          {t('pdf.validity.caption', lang)
            .replace('{0}', formatDate(expiresAt, lang))
            .replace('{1}', String(inputs.validityDays))}
        </Text>

        {/* ── Footer (D-A3 minimal) ─────────────────────────────────────── */}
        <View style={{
          position: 'absolute',
          bottom: pdfPageMargins.bottom,
          left: pdfPageMargins.horizontal,
          right: pdfPageMargins.horizontal,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: pdfColors.border,
        }}>
          <Text style={{
            fontSize: pdfFontSizes.footer,
            fontWeight: pdfFontWeights.regular,
            color: pdfColors.muted,
          }}>
            {t('pdf.footer.left', lang)
              .replace('{0}', lcRef)
              .replace('{1}', formatDate(createdAt, lang))}
          </Text>
          <Text
            style={{
              fontSize: pdfFontSizes.footer,
              fontWeight: pdfFontWeights.regular,
              color: pdfColors.muted,
            }}
            render={({ pageNumber }: { pageNumber: number }) => `Page ${pageNumber}`}
            fixed
          />
        </View>
      </Page>
    </Document>
  );
}
