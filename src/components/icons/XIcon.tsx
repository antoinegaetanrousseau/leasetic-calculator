import * as React from "react";

export interface XIconProps extends React.SVGProps<SVGSVGElement> {
  /** Rendered width and height. Defaults to 24. */
  size?: number | string;
}

/** Close Square (Iconly #488) */
export function XIcon({ size = 24, ...props }: XIconProps) {
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
      <g id="x-1" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
      <g id="x-2" transform="translate(2.000000, 2.000000)" fill="currentColor">
      <path d="M14.334,0 C17.723,0 20,2.378 20,5.916 L20,14.084 C20,17.622 17.723,20 14.333,20 L5.665,20 C2.276,20 0,17.622 0,14.084 L0,5.916 C0,2.378 2.276,0 5.665,0 L14.334,0 Z M14.334,1.5 L5.665,1.5 C3.135,1.5 1.5,3.233 1.5,5.916 L1.5,14.084 C1.5,16.767 3.135,18.5 5.665,18.5 L14.333,18.5 C16.864,18.5 18.5,16.767 18.5,14.084 L18.5,5.916 C18.5,3.233 16.864,1.5 14.334,1.5 Z M8.1305,7.0626 L9.998,8.93 L11.8645,7.0647 C12.1575,6.7717 12.6315,6.7717 12.9245,7.0647 C13.2175,7.3577 13.2175,7.8317 12.9245,8.1247 L11.058,9.99 L12.9265,11.8596 C13.2195,12.1526 13.2195,12.6266 12.9265,12.9196 C12.7805,13.0666 12.5875,13.1396 12.3965,13.1396 C12.2045,13.1396 12.0125,13.0666 11.8665,12.9196 L9.998,11.05 L8.1325,12.9167 C7.9865,13.0637 7.7945,13.1367 7.6025,13.1367 C7.4105,13.1367 7.2185,13.0637 7.0725,12.9167 C6.7795,12.6237 6.7795,12.1497 7.0725,11.8567 L8.938,9.99 L7.0705,8.1226 C6.7775,7.8296 6.7775,7.3556 7.0705,7.0626 C7.3645,6.7696 7.8385,6.7696 8.1305,7.0626 Z" id="x-3"></path>
      </g>
      </g>
    </svg>
  );
}

export default XIcon;
