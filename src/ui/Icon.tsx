import type { ReactNode } from "react";

/**
 * SUNDIAL line icons: one family, 20px grid, 1.5px round strokes (styled by
 * .icon in base.css). Icon-only buttons must still carry an aria-label.
 */
const PATHS = {
  sliders: (
    <>
      <path d="M3 6h7M14 6h3M3 14h3M10 14h7" />
      <circle cx="12" cy="6" r="2" />
      <circle cx="8" cy="14" r="2" />
    </>
  ),
  close: <path d="M5 5l10 10M15 5L5 15" />,
  pause: <path d="M7.5 4.5v11M12.5 4.5v11" />,
  play: <path d="M7 4.5l8 5.5-8 5.5z" />,
  skip: <path d="M5 5l7 5-7 5zM15 5v10" />,
  more: (
    <>
      <circle cx="4.5" cy="10" r="1" />
      <circle cx="10" cy="10" r="1" />
      <circle cx="15.5" cy="10" r="1" />
    </>
  ),
  power: <path d="M10 3v6.5M5.6 6a6 6 0 1 0 8.8 0" />,
  open: <path d="M8 4H4v4M4 4l5 5M12 16h4v-4M16 16l-5-5" />,
  chevron: <path d="M5 8l5 5 5-5" />,
  back: <path d="M12 4L6 10l6 6" />,
  plus: <path d="M10 4v12M4 10h12" />,
  reset: <path d="M4.5 10a5.5 5.5 0 1 0 1.8-4.1M4 3.5v3h3" />,
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
