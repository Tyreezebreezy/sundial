import { clamp01, clockPoint, n2, sectorPath } from "./geometry";
import { useSvgId, visualClass, type TimerVisualProps } from "./visualTypes";

const C = 120;
const R = 100;
const MAJOR_TICKS = Array.from({ length: 12 }, (_, i) => i * 30);

/**
 * Remaining time as a lit disk that goes dark clockwise from 12 o'clock.
 * Warm light falls from the upper left (illumination = "time still here").
 */
export function DiskTimer(props: TimerVisualProps) {
  const id = useSvgId();
  const p = props.state === "complete" ? 0 : clamp01(props.progress);
  const startDeg = (1 - p) * 360;
  const full = p >= 0.999;
  const empty = p <= 0.001;
  const edge = clockPoint(C, C, R, startDeg);

  return (
    <svg
      className={visualClass(props)}
      viewBox="0 0 240 240"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={`${id}-lit`} cx="0.34" cy="0.28" r="0.85">
          <stop offset="0" className="tv-stop-1" />
          <stop offset="0.55" className="tv-stop-2" />
          <stop offset="1" className="tv-stop-3" />
        </radialGradient>
      </defs>

      <g className="tv-detail tv-ticks">
        {MAJOR_TICKS.map((deg) => {
          const a = clockPoint(C, C, 111, deg);
          const b = clockPoint(C, C, deg % 90 === 0 ? 119 : 116, deg);
          return (
            <line
              key={deg}
              x1={n2(a.x)}
              y1={n2(a.y)}
              x2={n2(b.x)}
              y2={n2(b.y)}
            />
          );
        })}
      </g>

      <circle className="tv-track" cx={C} cy={C} r={R} />

      <g className="tv-lit">
        {full ? (
          <circle cx={C} cy={C} r={R} fill={`url(#${id}-lit)`} />
        ) : empty ? null : (
          <path
            d={sectorPath(C, C, R, startDeg, 360)}
            fill={`url(#${id}-lit)`}
          />
        )}
      </g>

      {!full && !empty && (
        <line
          className="tv-edge tv-detail"
          x1={C}
          y1={C}
          x2={n2(edge.x)}
          y2={n2(edge.y)}
        />
      )}
      <circle className="tv-hub tv-detail" cx={C} cy={C} r={3.5} />
    </svg>
  );
}
