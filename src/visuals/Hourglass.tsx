import { formatClock } from "../format";

const W = 160;
const H = 220;
const TOP_Y = 20;
const NECK_TOP_Y = 104;
const NECK_BOTTOM_Y = 116;
const BOTTOM_Y = 200;
const LEFT_X = 20;
const RIGHT_X = 140;
const CENTER_X = 80;

const TOP_BULB_PATH = `M ${LEFT_X} ${TOP_Y} L ${RIGHT_X} ${TOP_Y} L ${CENTER_X} ${NECK_TOP_Y} Z`;
const BOTTOM_BULB_PATH = `M ${CENTER_X} ${NECK_BOTTOM_Y} L ${RIGHT_X} ${BOTTOM_Y} L ${LEFT_X} ${BOTTOM_Y} Z`;

export function Hourglass({
  progress,
  remainingMs,
  size = 160,
}: {
  progress: number;
  remainingMs: number;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(1, progress));
  const topCutoff = TOP_Y + clamped * (NECK_TOP_Y - TOP_Y);
  const bottomCutoff = BOTTOM_Y - (1 - clamped) * (BOTTOM_Y - NECK_BOTTOM_Y);
  const streaming = clamped > 0.01 && clamped < 0.99;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={size}
      height={size * (H / W)}
      role="img"
      aria-label={`${formatClock(remainingMs)} remaining`}
    >
      <defs>
        <clipPath id="hg-top-bulb">
          <path d={TOP_BULB_PATH} />
        </clipPath>
        <clipPath id="hg-bottom-bulb">
          <path d={BOTTOM_BULB_PATH} />
        </clipPath>
      </defs>

      <path
        d={TOP_BULB_PATH}
        fill="var(--surface-muted)"
        stroke="var(--border)"
        strokeWidth={2}
      />
      <path
        d={BOTTOM_BULB_PATH}
        fill="var(--surface-muted)"
        stroke="var(--border)"
        strokeWidth={2}
      />

      <rect
        x={LEFT_X}
        y={TOP_Y}
        width={RIGHT_X - LEFT_X}
        height={Math.max(0, topCutoff - TOP_Y)}
        fill="var(--accent)"
        clipPath="url(#hg-top-bulb)"
      />
      <rect
        x={LEFT_X}
        y={bottomCutoff}
        width={RIGHT_X - LEFT_X}
        height={Math.max(0, BOTTOM_Y - bottomCutoff)}
        fill="var(--accent)"
        clipPath="url(#hg-bottom-bulb)"
      />

      {streaming && (
        <line
          x1={CENTER_X}
          y1={NECK_TOP_Y}
          x2={CENTER_X}
          y2={NECK_BOTTOM_Y}
          stroke="var(--accent-strong)"
          strokeWidth={2}
          className="hourglass-stream"
        />
      )}

      <text
        x={W / 2}
        y={H - 4}
        textAnchor="middle"
        fontSize={16}
        fontWeight={600}
        fill="var(--text)"
      >
        {formatClock(remainingMs)}
      </text>
    </svg>
  );
}
