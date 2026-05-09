import { Text, View } from '@react-pdf/renderer';
import { pdfColors, pdfFontSizes, pdfFontWeights } from '../styles';

export interface SectionLabelProps {
  children: string;
}

/**
 * Uppercase muted section header. UI-SPEC §3.3.6.
 * 9pt weight 700 letter-spacing 0.06 muted; marginBottom 6pt.
 */
export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={{
        fontSize: pdfFontSizes.caption,
        fontWeight: pdfFontWeights.bold,
        color: pdfColors.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.06,
      }}>{children}</Text>
    </View>
  );
}
