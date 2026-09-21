import { useId } from "react";

/**
 * One state grammar for every visual (idle quiet, study warm, break calmer,
 * paused muted, complete brief brighten then settle). The visuals never own
 * timer authority: they are a pure function of these props.
 */
export type TimerVisualState =
  "idle" | "study" | "break" | "timer" | "paused" | "complete";

export type TimerVisualSize = "small" | "medium" | "large";

export interface TimerVisualProps {
  remainingMs: number;
  durationMs: number;
  /** remaining / duration, 1 -> 0 */
  progress: number;
  state: TimerVisualState;
  /** Detail tier: small drops ticks and fine detail. Pixel size comes from CSS. */
  size: TimerVisualSize;
  reducedMotion: boolean;
}

/** SVG-safe unique id prefix (useId returns ":r1:" style ids). */
export function useSvgId(): string {
  return "tv" + useId().replace(/[^a-zA-Z0-9]/g, "");
}

export function visualClass(props: TimerVisualProps): string {
  return `tv tv--${props.state} tv--${props.size}`;
}
