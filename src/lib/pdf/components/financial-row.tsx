import { Text, View } from '@react-pdf/renderer';
import { pdfColors, pdfFontSizes, pdfFontWeights } from '../styles';

export interface FinancialRowProps {
  label: string;
  value: string;
  emphasis?: boolean;
  last?: boolean;
}

/**
 * The 9pt label/value row of the `CONDITIONS FINANCIÈRES` table
 * (`Quote-FR-A.dc.html` §85-97): `table-layout:fixed` with a
 * `<colgroup><col style="width:42%"><col style="width:58%">`.
 *
 * react-pdf has no table primitive, so this row is the direct port of that
 * colgroup: `flexBasis: '42%'` / `flexBasis: '58%'` on a flex row reproduces
 * the fixed two-column proportion the design's `<table>` declares. Each row
 * is `padding:5px 0;border-bottom:1px solid #D6DCE5` except the last
 * (`Total des loyers HT`), which is `padding:6px 0 0` with no bottom border —
 * `emphasis` + `last` together select that final row's bold/no-rule shape.
 */
export function FinancialRow({ label, value, emphasis, last }: FinancialRowProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        paddingVertical: last ? undefined : 3.75,
        paddingTop: last ? 4.5 : undefined,
        paddingBottom: last ? 0 : undefined,
        borderBottomWidth: last ? undefined : 0.75,
        borderBottomColor: last ? undefined : pdfColors.hairline,
      }}
    >
      <Text
        style={{
          flexBasis: '42%',
          fontSize: pdfFontSizes.heroCaption,
          fontWeight: emphasis ? pdfFontWeights.semibold : pdfFontWeights.regular,
          color: emphasis ? pdfColors.navy : pdfColors.bodyBlue,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          flexBasis: '58%',
          textAlign: 'right',
          fontSize: pdfFontSizes.heroCaption,
          fontWeight: pdfFontWeights.semibold,
          color: pdfColors.navy,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
