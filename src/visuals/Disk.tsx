import { formatClock } from "../format";
import { polarToCartesian } from "./geometry";

/**
 * Remaining-time wedge, anchored at 12 o'clock, sweeping clockwise as
 * progress (remaining/duration) falls from 1 to 0 - the "missing" slice
 * always starts at 12 and grows clockwise, so what's left is always the
 * sliver just before 12.
 */
function pieSlicePath(
  cx: number,
  cy: number,
  r: number,
  progress: number,
): string {
  const clamped = Math.max(0, Math.min(1, progress));
  if (clamped >= 0.999) {
    return [
      `M ${cx} ${cy - r}`,
      `A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}`,
      `A ${r} ${r} 0 1 1 ${cx} ${cy - r}`,
      "Z",
    ].join(" ");
  }
  if (clamped <= 0.001) return "";

  const emptyDeg = (1 - clamped) * 360;
  const startAngle = -90 + emptyDeg;
  const endAngle = 270;
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const sweepDeg = endAngle - startAngle;
  const largeArc = sweepDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

export function Disk({
  progress,
  remainingMs,
  size = 220,
}: {
  progress: number;
  remainingMs: number;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - Math.max(4, size * 0.03);
  const path = pieSlicePath(cx, cy, r, progress);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label={`${formatClock(remainingMs)} remaining`}
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="var(--surface-muted)"
        stroke="var(--border)"
        strokeWidth={1}
      />
      {path && <path d={path} fill="var(--accent)" />}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.17}
        fontWeight={600}
        fill="var(--text)"
      >
        {formatClock(remainingMs)}
      </text>
    </svg>
  );
}
