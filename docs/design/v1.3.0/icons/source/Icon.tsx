import type { ReactNode } from "react";

/**
 * SUNDIAL controls: one 20px optical grid, 1.5px round strokes, open geometry.
 * Arcs echo the dial; familiar action silhouettes remain readable at 16px.
 * Icon-only buttons carry their accessible name at the call site.
 */
const PATHS = {
  sliders: (
    <>
      <path d="M3.5 6h6M13.5 6h3M3.5 14h3M10.5 14h6" />
      <circle cx="11.5" cy="6" r="2" />
      <circle cx="8.5" cy="14" r="2" />
    </>
  ),
  close: <path d="m5 5 10 10M15 5 5 15" />,
  pause: <path d="M7 4.5v11M13 4.5v11" />,
  play: <path d="m6.5 4.5 8.5 5.5-8.5 5.5Z" />,
  skip: <path d="m4.5 5 7.5 5-7.5 5ZM15.5 5v10" />,
  more: (
    <>
      <circle cx="4.5" cy="10" r=".8" />
      <circle cx="10" cy="10" r=".8" />
      <circle cx="15.5" cy="10" r=".8" />
    </>
  ),
  power: <path d="M10 3v6M5.5 5.8a6 6 0 1 0 9 0" />,
  open: <path d="M10 4H4.5v11.5H16V10M12 3.5h4.5V8M16.5 3.5 10 10" />,
  chevron: <path d="m5 7.5 5 5 5-5" />,
  back: <path d="m11.5 4.5-5.5 5.5 5.5 5.5M6 10h10" />,
  plus: <path d="M10 4.5v11M4.5 10h11" />,
  reset: <path d="M4 8a6 6 0 1 1 .5 5M4 3.5V8h4.5" />,
  expand: <path d="M4 8V4h4M12 4h4v4M16 12v4h-4M8 16H4v-4" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
