import { arcPath, clamp01, clockPoint, n2 } from "./geometry";
import { useSvgId, visualClass, type TimerVisualProps } from "./visualTypes";

const C = 120;
const PLATE = 92;
const ARC = 106;
const SWEEP = 90; // shadow sweeps from -90deg to +90deg across the top of the plate
/* Sundial hour lines are unevenly spaced (wider toward the horizon). A fixed
   symbolic table - not a solar calculation. */
const HOUR_LINES = [-90, -67, -48, -33, -20, -10, 0, 10, 20, 33, 48, 67, 90];

function shadowLength(deg: number): number {
  // shortest at "noon" (mid-session), longest at the edges
  return 34 + 62 * Math.abs(Math.sin((deg * Math.PI) / 180)) ** 1.15;
}

/**
 * The signature visual. A fixed gnomon casts a tapered shadow across the
 * dial; as time passes the shadow rotates and changes length while warm
 * light shifts to the opposite side. The gold rim arc is the time left.
 */
export function SundialTimer(props: TimerVisualProps) {
  const id = useSvgId();
  const p = props.state === "complete" ? 0 : clamp01(props.progress);
  const deg = -SWEEP + (1 - p) * 2 * SWEEP;

  const dir = {
    x: Math.sin((deg * Math.PI) / 180),
    y: -Math.cos((deg * Math.PI) / 180),
  };
  const perp = { x: -dir.y, y: dir.x };
  const len = shadowLength(deg);
  const tip = { x: C + dir.x * len, y: C + dir.y * len };
  const baseHalf = 4;
  const tipHalf = 8;
  const shadow = [
    [C + perp.x * baseHalf, C + perp.y * baseHalf],
    [C - perp.x * baseHalf, C - perp.y * baseHalf],
    [tip.x - perp.x * tipHalf, tip.y - perp.y * tipHalf],
    [tip.x + perp.x * tipHalf, tip.y + perp.y * tipHalf],
  ]
    .map(([x, y]) => `${n2(x)},${n2(y)}`)
    .join(" ");
  // warm light comes from the side opposite the shadow
  const sun = { x: C - dir.x * PLATE * 0.6, y: C - dir.y * PLATE * 0.6 };

  return (
    <svg
      className={visualClass(props)}
      viewBox="0 0 240 240"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={`${id}-plate`}>
          <circle cx={C} cy={C} r={PLATE} />
        </clipPath>
        <radialGradient
          id={`${id}-light`}
          gradientUnits="userSpaceOnUse"
          cx={n2(sun.x)}
          cy={n2(sun.y)}
          r={PLATE * 1.25}
        >
          <stop offset="0" className="tv-light-1" />
          <stop offset="1" className="tv-light-2" />
        </radialGradient>
        <linearGradient
          id={`${id}-shadow`}
          gradientUnits="userSpaceOnUse"
          x1={C}
          y1={C}
          x2={n2(tip.x)}
          y2={n2(tip.y)}
        >
          <stop offset="0" className="tv-shadow-1" />
          <stop offset="1" className="tv-shadow-2" />
        </linearGradient>
      </defs>

      <circle className="tv-track" cx={C} cy={C} r={PLATE} />
      <circle
        cx={C}
        cy={C}
        r={PLATE}
        fill={`url(#${id}-light)`}
        className="tv-lit"
      />

      <g className="tv-detail tv-ticks">
        {HOUR_LINES.map((d) => {
          const a = clockPoint(C, C, d === 0 ? PLATE - 15 : PLATE - 10, d);
          const b = clockPoint(C, C, PLATE - 3, d);
          return (
            <line key={d} x1={n2(a.x)} y1={n2(a.y)} x2={n2(b.x)} y2={n2(b.y)} />
          );
        })}
      </g>

      <polygon
        className="tv-shadow"
        points={shadow}
        fill={`url(#${id}-shadow)`}
        clipPath={`url(#${id}-plate)`}
      />

      <path className="tv-sweep" d={arcPath(C, C, ARC, -SWEEP, SWEEP)} />
      {p > 0.001 && (
        <path
          className="tv-sweep-lit tv-lit"
          d={arcPath(C, C, ARC, deg, SWEEP)}
        />
      )}

      <ellipse className="tv-gnomon-base" cx={C} cy={C + 6} rx={9} ry={2.5} />
      <polygon
        className="tv-gnomon-a"
        points={`${C},${C - 30} ${C},${C + 6} ${C - 6},${C + 6}`}
      />
      <polygon
        className="tv-gnomon-b"
        points={`${C},${C - 30} ${C + 6},${C + 6} ${C},${C + 6}`}
      />
    </svg>
  );
}
