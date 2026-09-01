import * as React from "react";

export interface PhoneIconProps extends React.SVGProps<SVGSVGElement> {
  /** Rendered width and height. Defaults to 24. */
  size?: number | string;
}

/**
 * Phone (hand-authored — Phase 30 product icon; the licensed Iconly set has
 * no literal handset glyph, per 30-UI-SPEC.md Assumption A-7). A classic
 * handset silhouette, matching the 1.5px stroke-weight outline style of the
 * rest of the vocabulary.
 */
export function PhoneIcon({ size = 24, ...props }: PhoneIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={props["aria-label"] ? undefined : true}
      {...props}
    >
      <g id="phone-1" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
        <g
          id="phone-2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <path
            id="phone-3"
            d="M20.5,16.92 L20.5,19.42 C20.5008,19.7047 20.3833,19.977 20.1757,20.1729 C19.9682,20.3688 19.6889,20.4711 19.4025,20.4575 C16.4227,20.1359 13.5601,19.1245 11.045,17.5075 C8.70571,16.0331 6.71891,14.0463 5.2445,11.707 C3.62191,9.1804 2.61032,6.30538 2.2925,3.31251 C2.27913,3.02704 2.38066,2.74839 2.57531,2.5411 C2.76996,2.33381 3.04093,2.21568 3.325,2.21501 L5.825,2.21501 C6.3225,2.21008 6.7472,2.5747 6.815,3.06751 C6.94373,4.06806 7.18242,5.05127 7.5225,6.00001 C7.66192,6.37543 7.5679,6.79704 7.2775,7.07751 L6.19,8.16501 C7.57023,10.6152 9.60481,12.6497 12.055,14.03 L13.1425,12.9425 C13.423,12.6521 13.8446,12.5581 14.22,12.6975 C15.1688,13.0376 16.152,13.2763 17.1525,13.405 C17.6507,13.4735 18.0165,13.9048 17.9975,14.4075 L20.5,16.92 Z"
          />
        </g>
      </g>
    </svg>
  );
}

export default PhoneIcon;
