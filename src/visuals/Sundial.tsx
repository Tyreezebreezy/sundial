import { formatClock } from "../format";
import { polarToCartesian } from "./geometry";

function wedgePath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  if (endDeg <= startDeg) return "";
  const start = polarToCartesian(cx, cy, r, startDeg);
  const end = polarToCartesian(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

const TICK_DEGREES = [180, 225, 270, 315, 360];

export function Sundial({
  progress,
  remainingMs,
  size = 220,
}: {
  progress: number;
  remainingMs: number;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(1, progress));
  const cx = size / 2;
  const cy = size / 2 + size * 0.08;
  const r = size * 0.42;

  const rimStart = polarToCartesian(cx, cy, r, 180);
  const rimEnd = polarToCartesian(cx, cy, r, 360);
  const shadowEnd = 180 + (1 - clamped) * 180;
  const shadowPath = wedgePath(cx, cy, r, 180, shadowEnd);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label={`${formatClock(remainingMs)} remaining`}
    >
      <path
        d={`M ${rimStart.x} ${rimStart.y} A ${r} ${r} 0 1 1 ${rimEnd.x} ${rimEnd.y} L ${cx} ${cy} Z`}
        fill="color-mix(in srgb, var(--accent) 15%, var(--surface-muted))"
        stroke="var(--border)"
        strokeWidth={1}
      />

      {TICK_DEGREES.map((deg) => {
        const outer = polarToCartesian(cx, cy, r, deg);
        const inner = polarToCartesian(cx, cy, r * 0.88, deg);
        return (
          <line
            key={deg}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            stroke="var(--border)"
            strokeWidth={1.5}
          />
        );
      })}

      {shadowPath && (
        <path d={shadowPath} fill="var(--canvas)" opacity={0.72} />
      )}

      <polygon
        points={`${cx - 7},${cy} ${cx + 7},${cy} ${cx},${cy - r * 0.55}`}
        fill="var(--accent-strong)"
      />
      <circle cx={cx} cy={cy} r={4} fill="var(--accent-strong)" />

      <text
        x={cx}
        y={cy + size * 0.22}
        textAnchor="middle"
        fontSize={size * 0.14}
        fontWeight={600}
        fill="var(--text)"
      >
        {formatClock(remainingMs)}
      </text>
    </svg>
  );
}
