import { Text, View } from '@react-pdf/renderer';
import { pdfColors, pdfFontSizes, pdfFontWeights } from '../styles';

export interface KeyValueRowProps {
  keyText: string;
  valueText: string;
}

/**
 * 2-column flex row used inside Recipient + Project + Computation cards.
 * UI-SPEC §3.3.6: key column 80pt fixed, value column flex 1, 4pt vertical gap.
 */
export function KeyValueRow({ keyText, valueText }: KeyValueRowProps) {
  return (
    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
      <Text style={{
        width: 80,
        fontSize: pdfFontSizes.body,
        fontWeight: pdfFontWeights.medium,
        color: pdfColors.muted,
      }}>{keyText}</Text>
      <Text style={{
        flex: 1,
        fontSize: pdfFontSizes.body,
        fontWeight: pdfFontWeights.medium,
        color: pdfColors.ink,
      }}>{valueText}</Text>
    </View>
  );
}
