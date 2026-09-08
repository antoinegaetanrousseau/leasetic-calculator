import { Svg, Ellipse } from '@react-pdf/renderer';
import { pdfColors } from '../styles';

export interface LeaseticIconProps {
  size: number;
  opacity?: number;
}

/**
 * The Leasetic mark: four `#01CC72` ellipses, ported from
 * `.planning/assets/v1.9-quote-design/svg/leasetic-icon-color.svg` (D-07).
 *
 * Two of the source ellipses carry a rotation transform of -90 degrees about
 * their own centre. A 90° rotation of an axis-aligned ellipse about its own
 * centre is exactly a swap of `rx`/`ry`, so the rotation is pre-applied here
 * (D-07 option 1) and no `transform` attribute is emitted — the geometry is
 * correct whether or not react-pdf's partial SVG support honours the
 * transform. `src/lib/pdf/components/marks.test.tsx` records the verdict.
 */
export function LeaseticIcon({ size, opacity }: LeaseticIconProps) {
  return (
    <Svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      style={opacity !== undefined ? { opacity } : undefined}
    >
      <Ellipse cx={80} cy={50} rx={20} ry={50} fill={pdfColors.brandGreen} />
      <Ellipse cx={120} cy={150} rx={20} ry={50} fill={pdfColors.brandGreen} />
      {/* D-07: source is rx=20 ry=50, rotated -90 degrees about (150, 80); that origin
          is this ellipse's own centre, so the rx/ry swap below is an exact substitute. */}
      <Ellipse cx={150} cy={80} rx={50} ry={20} fill={pdfColors.brandGreen} />
      {/* D-07: source is rx=20 ry=50, rotated -90 degrees about (50, 120); that origin
          is this ellipse's own centre, so the rx/ry swap below is an exact substitute. */}
      <Ellipse cx={50} cy={120} rx={50} ry={20} fill={pdfColors.brandGreen} />
    </Svg>
  );
}
