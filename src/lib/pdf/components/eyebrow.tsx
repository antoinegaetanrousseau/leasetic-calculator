import { Text } from '@react-pdf/renderer';
import { pdfColors, pdfFontSizes, pdfFontWeights } from '../styles';

export interface EyebrowProps {
  children: string;
  marginBottom?: number;
}

/**
 * The 7.5pt uppercase section label used by every block in the new Claude
 * Design layout (D-10/D-11). Ported from the design's repeated inline
 * eyebrow style (`Quote-FR-A.dc.html` §54, §66, etc.): `font-size:7.5pt;
 * letter-spacing:.06em;text-transform:uppercase;color:#3a6a75`.
 *
 * `letterSpacing: 0.45` is the design's `.06em` at 7.5pt converted to points
 * (react-pdf's `letterSpacing` is in points, not em — see `styles.ts`'s unit
 * rule comment).
 *
 * Deliberately no uppercase-transform style here — the dictionary strings
 * plan 43-03 added (PROPOSITION N°, SOCIÉTÉ CLIENTE, VOTRE CONTACT, ...) are
 * already stored uppercased, so transforming case at render time is
 * redundant and keeps the FR `N°` and accented capitals exact and the
 * output deterministic.
 */
export function Eyebrow({ children, marginBottom = 6 }: EyebrowProps) {
  return (
    <Text
      style={{
        fontSize: pdfFontSizes.eyebrow,
        fontWeight: pdfFontWeights.regular,
        color: pdfColors.labelTeal,
        letterSpacing: 0.45,
        marginBottom,
      }}
    >
      {children}
    </Text>
  );
}
