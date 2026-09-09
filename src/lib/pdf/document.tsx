import { Document, Page, Text, View, Font } from '@react-pdf/renderer';
import path from 'node:path';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { formatCurrency, formatDate, formatNumber } from '@/lib/i18n/format';
import { pdfColors, pdfFontSizes, pdfFontWeights, pdfPageBase, pdfPageMargins } from './styles';
import { sanitizePdfNumber } from './sanitize-number';
import { LeaseticLockup } from './components/leasetic-lockup';
import { LeaseticIcon } from './components/leasetic-icon';
import { Eyebrow } from './components/eyebrow';
import { CardKeyValueRow } from './components/card-key-value-row';
import { FinancialRow } from './components/financial-row';
import { emDash } from './em-dash';

// ── Font.register: once, at module load ──────────────────────────────────────
// PROP-19: Inter TTFs self-hosted under public/fonts/ (Phase 41 — replaces the
// previously-registered family). The PDF renderer fetches the font bytes
// during render — register-once-render-many.
//
// Path resolution: in Node runtime, `process.cwd()` is the Next project root
// when the route handler runs. PDF needs 4 weights: 400/500/600/700.
//
// Determinism: file:// absolute paths guarantee the same font bytes regardless
// of machine; PROP-17 / T-08-05-01 — font drift = CI red via Plan 08-06 gate.
// These exact binaries are pinned by SHA-256 in 41-RESEARCH.md and guarded by
// tests/vendored-ui-integrity.test.ts cases 3-4.

const FONT_DIR = path.join(process.cwd(), 'public', 'fonts');

// PROP-19 / determinism (T-08-05-04): Inter self-hosted (Phase 41).
//
// Font format: TTF (static weights from the rsms/inter v4.1 release).
// Reason: @react-pdf/renderer uses PDFKit/fontkit for font subsetting. fontkit's
// TTFSubset correctly handles multi-weight subsetting with TTF; the woff2 brotli
// path fails with DataView bounds errors when multiple weights share the same
// Brotli decompression buffer (fontkit upstream issue) — this is why the four
// static Inter TTFs are used here instead of a variable font or woff2 (D-03).
// Determinism is preserved: same font binary bytes on every machine.
//
// Note: Inter's italic cuts (Inter-Italic.ttf etc.) are deliberately not
// registered. fontStyle: 'italic' is not used in the document (validity
// caption is regular weight only).
Font.register({
  family: 'Inter',
  fonts: [
    { src: path.join(FONT_DIR, 'Inter-400.ttf'), fontWeight: 400 },
    { src: path.join(FONT_DIR, 'Inter-500.ttf'), fontWeight: 500 },
    { src: path.join(FONT_DIR, 'Inter-600.ttf'), fontWeight: 600 },
    { src: path.join(FONT_DIR, 'Inter-700.ttf'), fontWeight: 700 },
  ],
});

// ── Hyphenation callback: disable mid-word hyphenation ────────────────────
// DOC-01 / Gap 1 (43-VERIFICATION.md): closes the defect Antoine's D-15 human
// visual pass caught (43-08-SUMMARY.md, Defect 1). @react-pdf/renderer's
// default hyphenator was breaking the title mid-word — "Proposition de
// location finan-cière" (FR) and "Equipment lease financing pro-posal" (EN)
// — where the reference PNGs break cleanly at a space, with no hyphen.
// Returning the word as a single unsplittable unit tells the layout engine
// there is no legal in-word break point, so it may only wrap at spaces.
// This is module-load global state for the renderer, exactly like
// Font.register above — deliberately registered right beside it so the two
// can never drift apart. It is deterministic: a pure function of `word`,
// no I/O, no state, no recursion.
Font.registerHyphenationCallback((word) => [word]);

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
      // FIELD-03: proposalInputSchema requires clientSiret, but a proposal
      // finalized before Phase 42 carries no clientSiret key at all in its
      // stored `inputs` jsonb. Phase 44 re-renders exactly those rows, so
      // this stays optional on the props interface even though the schema
      // requires it going forward.
      clientSiret?: string;
      // FIELD-03: same reasoning as clientSiret above — a pre-Phase-42
      // proposal's stored `inputs` carries no partnerTel key.
      partnerTel?: string;
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
    // D-12 — sibling of inputs/computed, NEVER nested inside inputs: D-09
    // forbids the advisor entering proposals.inputs, and mirroring that
    // boundary in the props shape keeps a future reader from snapshotting it.
    partner: {
      companyTelephone: string | null;
    };
    // D-13: a missing advisor row is a valid state — it renders em dashes
    // under DOC-11 and must never block a partner from finalizing. Exactly
    // these four content columns: getAdvisor() returns the full advisor row,
    // but its non-content columns must never reach the document — the actor
    // id of whoever last saved the row is an information-disclosure risk,
    // and its mutable last-saved timestamp would break the PROP-17
    // determinism contract.
    advisor: {
      name: string | null;
      fonction: string | null;
      telephone: string | null;
      email: string | null;
    } | null;
  };
}


export function ProposalDocument({ data }: ProposalDocumentProps) {
  const { lcRef, language: lang, createdAt, inputs, computed, partner, advisor } = data;
  const expiresAt = new Date(createdAt.getTime() + inputs.validityDays * 86_400_000);
  const projectText = inputs.projectDesc?.trim() || t('pdf.project.placeholder', lang);

  // Partner-phone resolution (D-12/D-13): inputs.partnerTel is the immutable
  // snapshot captured at proposal creation — the authoritative source. Fall
  // back to the live partner.companyTelephone only for a pre-Phase-42
  // proposal whose stored inputs carries no partnerTel key at all. Both are
  // the partner COMPANY's line — the individual's own line (PROF-02's
  // finalization gate) is deliberately never rendered anywhere in this
  // document.
  const partnerPhone = inputs.partnerTel?.trim() || partner.companyTelephone;

  return (
    <Document
      title={`Proposition ${lcRef}`}
      author="Leasetic"
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
        fontFamily: 'Inter',
        fontSize: pdfPageBase.fontSize,
        // D-10/D-11's base `lineHeight: 1.45` is deliberately NOT set here. Root-caused
        // via bisection (43-06 Task 2): @react-pdf/renderer 4.5.1 silently drops every
        // dynamic `render`-prop <Text> in the whole document (the legal footer's
        // page-number/lcRef text below never reaches the content stream, no error)
        // whenever this document's actual content volume is combined with an inherited
        // `lineHeight` anywhere in the ancestor chain — reproduced with `lineHeight` on
        // <Page> itself and, independently, with it hoisted onto a wrapping <View> using
        // flexGrow/height/a literal pixel height instead (all three still dropped the
        // text; only removing the inherited value entirely brings it back). Every Text
        // node in this document that needs a specific line-height already sets its own
        // (hero value 1.05, validity/conditions body 1.65, legal footer 1.5, etc.); the
        // remaining single-line labels/headlines are visually insensitive to this base
        // value's absence. Flagged for the D-15 human visual pass to confirm.
        color: pdfColors.navy,
        backgroundColor: pdfColors.surface,
        flexDirection: 'column',
      }}>
        {/* ── Header band (DOC-01, D-07 — the real lockup, no LEASETIC text node) ── */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
          <LeaseticLockup height={19.5} />
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{
              fontSize: pdfFontSizes.eyebrow,
              fontWeight: pdfFontWeights.regular,
              color: pdfColors.labelTeal,
              letterSpacing: 0.45,
            }}>{t('pdf.header.proposition.eyebrow', lang)}</Text>
            <Text style={{
              fontSize: pdfFontSizes.propositionNo,
              fontWeight: pdfFontWeights.semibold,
              color: pdfColors.navy,
              letterSpacing: -0.13,
              marginTop: 1.5,
            }}>{lcRef}</Text>
            <Text style={{
              fontSize: pdfFontSizes.pill,
              fontWeight: pdfFontWeights.regular,
              color: pdfColors.labelTeal,
              marginTop: 1.5,
            }}>{t('pdf.header.issued', lang).replace('{0}', formatDate(createdAt, lang))}</Text>
          </View>
        </View>

        {/* ── The 2px navy rule (D-11) ──────────────────────────────────── */}
        <View style={{
          height: 1.5,
          backgroundColor: pdfColors.navy,
          marginTop: 7.5,
          marginBottom: 10.5,
        }} />

        {/* ── Title row (DOC-01) — 21pt h1 + description, two unconditional pills ── */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 10.5,
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: pdfFontSizes.h1,
              fontWeight: pdfFontWeights.semibold,
              color: pdfColors.navy,
              letterSpacing: -0.525,
              lineHeight: 1.1,
              marginBottom: 3,
            }}>{t('pdf.title', lang)}</Text>
            <Text style={{
              fontSize: pdfFontSizes.projectDesc,
              fontWeight: pdfFontWeights.regular,
              color: pdfColors.bodyBlue,
            }}>{projectText}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 4.5, justifyContent: 'flex-end' }}>
            {/* DOC-11: the partner-ref pill renders unconditionally — an absent
                partnerRef is expressed as an em dash, not by hiding the pill. */}
            <View style={{
              borderWidth: 0.75,
              borderColor: pdfColors.hairline,
              borderRadius: 999,
              paddingVertical: 3,
              paddingHorizontal: 8.25,
            }}>
              <Text style={{ fontSize: pdfFontSizes.pill, color: pdfColors.bodyBlue }}>
                {t('pdf.pill.partnerRef', lang).replace('{0}', emDash(inputs.partnerRef))}
              </Text>
            </View>
            <View style={{
              borderWidth: 0.75,
              borderColor: pdfColors.hairline,
              borderRadius: 999,
              paddingVertical: 3,
              paddingHorizontal: 8.25,
            }}>
              <Text style={{ fontSize: pdfFontSizes.pill, color: pdfColors.bodyBlue }}>
                {t('pdf.pill.term', lang).replace('{0}', String(inputs.durationMonths))}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Card grid: SOCIÉTÉ CLIENTE + VOTRE CONTACT (DOC-02, DOC-03, D-04) ── */}
        <View style={{ flexDirection: 'row', marginBottom: 10.5 }}>
          {/* SOCIÉTÉ CLIENTE (DOC-02) */}
          <View style={{
            flexGrow: 1,
            flexBasis: 0,
            marginRight: 7.5,
            backgroundColor: pdfColors.cardFill,
            borderRadius: 10.5,
            paddingVertical: 9.75,
            paddingHorizontal: 11.25,
          }}>
            <Eyebrow>{t('pdf.card.client.title', lang)}</Eyebrow>
            <Text style={{
              fontSize: pdfFontSizes.cardHeadline,
              fontWeight: pdfFontWeights.semibold,
              letterSpacing: -0.11,
              color: pdfColors.navy,
              marginBottom: 4.5,
            }}>{inputs.clientCo}</Text>
            <CardKeyValueRow label={t('pdf.card.client.siren', lang)} value={emDash(inputs.clientSiren)} />
            <CardKeyValueRow label={t('pdf.card.client.siret', lang)} value={emDash(inputs.clientSiret)} />
            <CardKeyValueRow label={t('pdf.card.client.recipient', lang)} value={emDash(inputs.clientName)} />
            <CardKeyValueRow label={t('pdf.card.client.role', lang)} value={emDash(inputs.clientRole)} />
            <CardKeyValueRow label={t('pdf.card.client.phone', lang)} value={emDash(inputs.clientTel)} />
            <CardKeyValueRow label={t('pdf.card.client.email', lang)} value={emDash(inputs.clientEmail)} />
          </View>

          {/* VOTRE CONTACT (DOC-03, restructured per D-04) */}
          <View style={{
            flexGrow: 1,
            flexBasis: 0,
            backgroundColor: pdfColors.cardFill,
            borderRadius: 10.5,
            paddingVertical: 9.75,
            paddingHorizontal: 11.25,
          }}>
            <Eyebrow>{t('pdf.card.contact.title', lang)}</Eyebrow>
            {/* DOC-03, amended by the D-15 human verdict recorded in 43-08-SUMMARY.md: the card
                is two entities, each with its own headline — the partner first (D-04's ordering
                intent survives), the Leasetic advisor second. The partner company is an
                explicitly labelled `Partenaire` row so a company is never mistaken for a person.
                The prior sales-representative row/key was deleted at the operator's instruction.
                Every value goes through `emDash` per DOC-11, including both headlines. */}
            <Text style={{
              fontSize: pdfFontSizes.cardHeadline,
              fontWeight: pdfFontWeights.semibold,
              letterSpacing: -0.11,
              color: pdfColors.navy,
              marginBottom: 4.5,
            }}>{emDash(inputs.partnerName)}</Text>
            <CardKeyValueRow label={t('pdf.card.contact.partner', lang)} value={emDash(inputs.partnerCo)} />
            <CardKeyValueRow label={t('pdf.card.contact.partnerPhone', lang)} value={emDash(partnerPhone)} />
            <Text style={{
              fontSize: pdfFontSizes.cardHeadline,
              fontWeight: pdfFontWeights.semibold,
              letterSpacing: -0.11,
              color: pdfColors.navy,
              marginBottom: 4.5,
              marginTop: 4.5,
            }}>{emDash(advisor?.name)}</Text>
            <CardKeyValueRow label={t('pdf.card.contact.advisorRole', lang)} value={emDash(advisor?.fonction)} />
            <CardKeyValueRow label={t('pdf.card.contact.advisorPhone', lang)} value={emDash(advisor?.telephone)} />
            <CardKeyValueRow label={t('pdf.card.contact.advisorEmail', lang)} value={emDash(advisor?.email)} />
          </View>
        </View>

        {/* ── Loyer hero + CONDITIONS FINANCIÈRES table (DOC-04, DOC-05, D-08, D-09) ──
            The design's `1.05fr 1.15fr` grid with a 10px gap — react-pdf has no grid
            primitive, so flexGrow + flexBasis: 0 is the port. */}
        {(() => {
          const isOnDemand = computed.state === 'on-demand' || !computed.loyerHT;
          const loyerText = isOnDemand
            ? t('pdf.loyer.on.demand', lang)
            : sanitizePdfNumber(formatCurrency(Number(computed.loyerHT), lang));
          const total = isOnDemand
            ? null
            : Math.round(Number(computed.loyerHT) * inputs.durationMonths * 100) / 100;
          return (
            <View style={{ flexDirection: 'row', alignItems: 'stretch', marginBottom: 10.5 }}>
              {/* Hero (DOC-04) — no background fill, no green anywhere (D-08). */}
              <View style={{
                flexGrow: 1.05,
                flexBasis: 0,
                marginRight: 7.5,
                borderWidth: 1.125,
                borderColor: pdfColors.navy,
                borderRadius: 10.5,
                padding: 15,
                flexDirection: 'column',
                justifyContent: 'center',
              }}>
                <Eyebrow marginBottom={4.5}>{t('pdf.loyer.label', lang)}</Eyebrow>
                <Text style={{
                  fontSize: pdfFontSizes.h1,
                  fontWeight: pdfFontWeights.semibold,
                  color: pdfColors.navy,
                  letterSpacing: -0.63,
                  lineHeight: 1.05,
                }}>{loyerText}</Text>
                <Text style={{
                  fontSize: pdfFontSizes.heroCaption,
                  fontWeight: pdfFontWeights.regular,
                  color: pdfColors.bodyBlue,
                  marginTop: 4.5,
                }}>
                  {t('pdf.loyer.subtext', lang).replace('{0}', String(inputs.durationMonths))}
                </Text>
              </View>

              {/* Table card (DOC-05) */}
              <View style={{
                flexGrow: 1.15,
                flexBasis: 0,
                backgroundColor: pdfColors.cardFill,
                borderRadius: 10.5,
                paddingVertical: 9.75,
                paddingHorizontal: 11.25,
              }}>
                <Eyebrow marginBottom={6.75}>{t('pdf.table.title', lang)}</Eyebrow>
                <FinancialRow
                  label={t('pdf.table.amount', lang)}
                  value={sanitizePdfNumber(formatCurrency(Number(inputs.amountHT), lang))}
                />
                <FinancialRow
                  label={t('pdf.table.term', lang)}
                  value={t('pdf.pill.term', lang).replace('{0}', String(inputs.durationMonths))}
                />
                <FinancialRow
                  label={t('pdf.computed.coefficient.label', lang)}
                  value={isOnDemand
                    ? emDash(null)
                    : `${sanitizePdfNumber(formatNumber(Number(computed.coeff), lang, { minimumFractionDigits: 4, maximumFractionDigits: 4 }))} %`}
                />
                <FinancialRow
                  label={t('pdf.table.monthlyRent', lang)}
                  value={loyerText}
                />
                <FinancialRow
                  label={t('pdf.table.total', lang)}
                  value={total === null ? emDash(null) : sanitizePdfNumber(formatCurrency(total, lang))}
                  emphasis
                  last
                />
              </View>
            </View>
          );
        })()}

        {/* D-05: the interests block (✓ Sale & leaseback / ✓ Évaluation de parc) is
            deliberately dropped by the redesign — the design has no slot for it anywhere
            and DOC-01..08 never mention it. The two underlying wizard fields stay in the
            wizard and in the immutable inputs snapshot; they simply stop printing here. */}

        {/* ── Conditions (DOC-06) ───────────────────────────────────────── */}
        <View style={{
          borderTopWidth: 0.75,
          borderTopColor: pdfColors.hairline,
          paddingTop: 7.5,
          marginBottom: 9,
        }}>
          <Eyebrow marginBottom={3}>{t('pdf.conditions.title', lang)}</Eyebrow>
          <Text style={{
            fontSize: pdfFontSizes.pill,
            lineHeight: 1.65,
            color: pdfColors.bodyBlue,
          }}>
            {t('pdf.validity.caption', lang)
              .replace('{0}', formatDate(expiresAt, lang))
              .replace('{1}', String(inputs.validityDays))}
          </Text>
        </View>

        {/* ── Acceptance block (DOC-07) — pinned to the bottom of the page via
            marginTop: 'auto' inside the <Page>'s flex column (the design's own
            mechanism; Yoga supports it), regardless of how much content precedes it ── */}
        <View style={{
          marginTop: 'auto',
          borderWidth: 0.75,
          borderColor: pdfColors.hairline,
          borderRadius: 10.5,
          paddingVertical: 12,
          paddingHorizontal: 13.5,
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: 10.5,
          }}>
            <Eyebrow marginBottom={0}>{t('pdf.acceptance.title', lang)}</Eyebrow>
            <Text style={{ fontSize: pdfFontSizes.pill, color: pdfColors.labelTeal }}>
              {t('pdf.acceptance.note', lang)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', marginBottom: 10.5 }}>
            <View style={{ flexGrow: 1, flexBasis: 0, marginRight: 12 }}>
              <Text style={{ fontSize: pdfFontSizes.pill, color: pdfColors.labelTeal, marginBottom: 16.5 }}>
                {t('pdf.acceptance.place', lang)}
              </Text>
              <View style={{ borderBottomWidth: 0.75, borderBottomColor: pdfColors.navy }} />
            </View>
            <View style={{ flexGrow: 1, flexBasis: 0, marginRight: 12 }}>
              <Text style={{ fontSize: pdfFontSizes.pill, color: pdfColors.labelTeal, marginBottom: 16.5 }}>
                {t('pdf.acceptance.date', lang)}
              </Text>
              <View style={{ borderBottomWidth: 0.75, borderBottomColor: pdfColors.navy }} />
            </View>
            <View style={{ flexGrow: 1.5, flexBasis: 0 }}>
              <Text style={{ fontSize: pdfFontSizes.pill, color: pdfColors.labelTeal, marginBottom: 16.5 }}>
                {t('pdf.acceptance.signatory', lang)}
              </Text>
              <View style={{ borderBottomWidth: 0.75, borderBottomColor: pdfColors.navy }} />
            </View>
          </View>

          <View style={{ flexDirection: 'row' }}>
            <View style={{ flexGrow: 1, flexBasis: 0, marginRight: 12 }}>
              <Text style={{ fontSize: pdfFontSizes.pill, color: pdfColors.labelTeal, marginBottom: 22.5 }}>
                {t('pdf.acceptance.signature', lang)}
              </Text>
              <View style={{ borderBottomWidth: 0.75, borderBottomColor: pdfColors.navy }} />
            </View>
            <View style={{
              flexGrow: 1.5,
              flexBasis: 0,
              borderWidth: 0.75,
              borderStyle: 'dashed',
              borderColor: pdfColors.stampBorder,
              borderRadius: 7.5,
              height: 40.5,
              paddingVertical: 6,
              paddingHorizontal: 7.5,
            }}>
              <Text style={{ fontSize: pdfFontSizes.pill, color: pdfColors.stampText }}>
                {t('pdf.acceptance.stamp', lang)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Legal footer (DOC-08) ─────────────────────────────────────── */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginTop: 9,
          paddingTop: 6.75,
          borderTopWidth: 0.75,
          borderTopColor: pdfColors.hairline,
        }}>
          <View>
            <Text style={{
              fontSize: pdfFontSizes.legalFooter,
              lineHeight: 1.5,
              color: pdfColors.labelTeal,
            }}>
              <Text style={{ fontWeight: pdfFontWeights.semibold, color: pdfColors.navy }}>
                {t('pdf.footer.legal.brand', lang)}
              </Text>
              {t('pdf.footer.legal.rest', lang)}
            </Text>
            <Text style={{
              fontSize: pdfFontSizes.legalFooter,
              lineHeight: 1.5,
              color: pdfColors.labelTeal,
            }}>
              {t('pdf.footer.legal.line2', lang)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text
              style={{
                fontSize: pdfFontSizes.legalFooter,
                color: pdfColors.labelTeal,
              }}
              render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
                `${lcRef} · Page ${pageNumber}/${totalPages}`}
              fixed
            />
            <View style={{ marginLeft: 6 }}>
              <LeaseticIcon size={13.5} opacity={0.14} />
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
