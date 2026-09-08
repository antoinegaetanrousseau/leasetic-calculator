import { Text, View } from '@react-pdf/renderer';
import { pdfColors, pdfFontSizes } from '../styles';

export interface CardKeyValueRowProps {
  label: string;
  value: string;
}

/**
 * The 8.5pt label/value row of the design's two-column card grid
 * (`Quote-FR-A.dc.html` §57-64, §69-76): `grid-template-columns:auto 1fr`
 * with a 10px column gap and a 4px row gap.
 *
 * react-pdf has no grid primitive, so the fixed 54pt label column plus
 * `flex: 1` is the port. 54pt is sized for the widest label in either
 * language (`Destinataire` at 8.5pt) and leaves the design's ~7.5pt gutter
 * before the value column. If the visual pass in plan 43-08 reports a
 * wrapped label, this width is the one number to adjust.
 */
export function CardKeyValueRow({ label, value }: CardKeyValueRowProps) {
  return (
    <View style={{ flexDirection: 'row', marginBottom: 3 }}>
      <Text style={{ width: 54, fontSize: pdfFontSizes.cardKv, color: pdfColors.labelTeal }}>
        {label}
      </Text>
      <Text style={{ flex: 1, fontSize: pdfFontSizes.cardKv, color: pdfColors.bodyBlue }}>
        {value}
      </Text>
    </View>
  );
}
