import * as React from "react";

export interface BuildingIconProps extends React.SVGProps<SVGSVGElement> {
  /** Rendered width and height. Defaults to 24. */
  size?: number | string;
}

/**
 * Building (hand-authored — Phase 30 product icon; the licensed Iconly set
 * has no literal building/office glyph, per 30-UI-SPEC.md Assumption A-7).
 * A simple office block with three rows of windows and a door, matching the
 * 1.5px stroke-weight outline style of the rest of the vocabulary.
 */
export function BuildingIcon({ size = 24, ...props }: BuildingIconProps) {
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
      <g id="building-1" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
        <g
          id="building-2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <path
            id="building-3"
            d="M5,21 L5,4.5 C5,3.6716 5.6716,3 6.5,3 L17.5,3 C18.3284,3 19,3.6716 19,4.5 L19,21 M5,21 L19,21 M8,7 L9.6,7 M14.4,7 L16,7 M8,10.5 L9.6,10.5 M14.4,10.5 L16,10.5 M8,14 L9.6,14 M14.4,14 L16,14 M10.5,21 L10.5,17.75 C10.5,17.3358 10.8358,17 11.25,17 L12.75,17 C13.1642,17 13.5,17.3358 13.5,17.75 L13.5,21"
          />
        </g>
      </g>
    </svg>
  );
}

export default BuildingIcon;
