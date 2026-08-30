import * as React from "react";

export interface RefreshIconProps extends React.SVGProps<SVGSVGElement> {
  /** Rendered width and height. Defaults to 24. */
  size?: number | string;
}

/** Refresh (Iconly #54689) */
export function RefreshIcon({ size = 24, ...props }: RefreshIconProps) {
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
      <path fillRule="evenodd" clipRule="evenodd" d="M8.615 5.82422C5.92821 5.82422 3.75 8.00243 3.75 10.6892C3.75 11.8785 4.17571 12.9654 4.88386 13.8105C5.1499 14.128 5.10819 14.601 4.7907 14.8671C4.47322 15.1331 4.00018 15.0914 3.73414 14.7739C2.80829 13.669 2.25 12.2439 2.25 10.6892C2.25 7.174 5.09979 4.32422 8.615 4.32422H15.386C18.9014 4.32422 21.75 7.17418 21.75 10.6892C21.75 14.2044 18.9012 17.0532 15.386 17.0532H8.615C8.20079 17.0532 7.865 16.7174 7.865 16.3032C7.865 15.889 8.20079 15.5532 8.615 15.5532H15.386C18.0728 15.5532 20.25 13.376 20.25 10.6892C20.25 8.00226 18.0726 5.82422 15.386 5.82422H8.615Z" fill="currentColor"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M11.7666 13.1494C12.0595 13.4423 12.0595 13.9171 11.7666 14.21L9.67384 16.3028L11.7667 18.3965C12.0595 18.6894 12.0595 19.1643 11.7665 19.4571C11.4736 19.75 10.9987 19.7499 10.7059 19.4569L8.08285 16.8329C7.79005 16.54 7.7901 16.0652 8.08295 15.7724L10.706 13.1494C10.9988 12.8565 11.4737 12.8565 11.7666 13.1494Z" fill="currentColor"/>
    </svg>
  );
}

export default RefreshIcon;
