import { clamp01, n2 } from "./geometry";
import { useSvgId, visualClass, type TimerVisualProps } from "./visualTypes";

const CX = 120;
const LEFT = 54;
const RIGHT = 186;
const TOP = 30;
const NECK_TOP = 114;
const NECK_BOTTOM = 126;
const BOTTOM = 210;
const BULB_H = NECK_TOP - TOP; // 84, same for both bulbs
const NECK_HALF = 4;

// A rounded shoulder rather than a straight-sided funnel: each side leaves
// the rim vertical and arrives at the neck horizontal (a quadratic curve
// whose control point sits at the corner between those two directions),
// the way a blown-glass vessel actually narrows into its waist.
const TOP_BULB = `M ${LEFT} ${TOP} L ${RIGHT} ${TOP} Q ${RIGHT} ${NECK_TOP} ${CX + NECK_HALF} ${NECK_TOP} L ${CX - NECK_HALF} ${NECK_TOP} Q ${LEFT} ${NECK_TOP} ${LEFT} ${TOP} Z`;
const BOTTOM_BULB = `M ${CX - NECK_HALF} ${NECK_BOTTOM} Q ${LEFT} ${NECK_BOTTOM} ${LEFT} ${BOTTOM} L ${RIGHT} ${BOTTOM} Q ${RIGHT} ${NECK_BOTTOM} ${CX + NECK_HALF} ${NECK_BOTTOM} Z`;

/**
 * Top bulb = remaining, bottom bulb = elapsed. Sand levels follow the real
 * geometry: a triangular bulb's volume grows with the square of its fill
 * height, so the surface height is proportional to sqrt(remaining) - the
 * surface drifts down slowly while the bulb is wide, then drops faster at
 * the end, exactly like a real hourglass.
 */
export function HourglassTimer(props: TimerVisualProps) {
  const id = useSvgId();
  const p = props.state === "complete" ? 0 : clamp01(props.progress);
  const root = Math.sqrt(p);
  const topSurface = NECK_TOP - BULB_H * root;
  const bottomSurface = BOTTOM - BULB_H * (1 - root);
  const running =
    props.state === "study" ||
    props.state === "break" ||
    props.state === "timer";
  const streaming = running && !props.reducedMotion && p > 0.001;

  const streamTop = NECK_TOP - 4;
  // The stream flows in 4 steps per 200 ms tick of the timer's own update
  // loop - no CSS animation loop (a 60 Hz infinite animation measured at
  // ~50% of a CPU core across the two windows; this costs nothing extra).
  const phase = 3 - (Math.floor(props.remainingMs / 200) % 4);

  return (
    <div className={`${visualClass(props)} tv-hourglass`} aria-hidden="true">
      <svg viewBox="0 0 240 240" focusable="false">
        <defs>
          <clipPath id={`${id}-top`}>
            <path d={TOP_BULB} />
          </clipPath>
          <clipPath id={`${id}-bottom`}>
            <path d={BOTTOM_BULB} />
          </clipPath>
          <linearGradient id={`${id}-sand`} x1="0" y1="0" x2="1" y2="0.6">
            <stop offset="0" className="tv-stop-1" />
            <stop offset="0.6" className="tv-stop-2" />
            <stop offset="1" className="tv-stop-3" />
          </linearGradient>
        </defs>

        <path className="tv-track" d={TOP_BULB} />
        <path className="tv-track" d={BOTTOM_BULB} />

        <g className="tv-lit">
          <rect
            x={LEFT}
            y={n2(topSurface)}
            width={RIGHT - LEFT}
            height={n2(NECK_TOP - topSurface)}
            fill={`url(#${id}-sand)`}
            clipPath={`url(#${id}-top)`}
          />
          <rect
            x={LEFT}
            y={n2(bottomSurface)}
            width={RIGHT - LEFT}
            height={n2(BOTTOM - bottomSurface)}
            fill={`url(#${id}-sand)`}
            clipPath={`url(#${id}-bottom)`}
          />
        </g>

        <path className="tv-glass" d={TOP_BULB} />
        <path className="tv-glass" d={BOTTOM_BULB} />
        <rect
          className="tv-cap"
          x={LEFT - 10}
          y={TOP - 8}
          width={RIGHT - LEFT + 20}
          height={8}
          rx={2}
        />
        <rect
          className="tv-cap"
          x={LEFT - 10}
          y={BOTTOM}
          width={RIGHT - LEFT + 20}
          height={8}
          rx={2}
        />
      </svg>
      {/* HTML, not SVG: shifting a dash pattern is a cheap transform, whereas
          animating an SVG stroke repaints the whole hourglass every frame. */}
      {streaming && (
        <span
          className="tv-stream"
          style={{
            top: `${(streamTop / 240) * 100}%`,
            height: `${(Math.max(0, bottomSurface - streamTop) / 240) * 100}%`,
            ["--tv-phase" as string]: phase,
          }}
        />
      )}
    </div>
  );
}
