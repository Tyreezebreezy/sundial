/** Point `deg` degrees clockwise from 12 o'clock. */
export function clockPoint(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

/** Trim path coordinates to 2 decimals so SVG attributes stay short. */
export function n2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Clockwise arc from `fromDeg` to `toDeg` (degrees clockwise from 12 o'clock). */
export function arcPath(
  cx: number,
  cy: number,
  r: number,
  fromDeg: number,
  toDeg: number,
): string {
  const a = clockPoint(cx, cy, r, fromDeg);
  const b = clockPoint(cx, cy, r, toDeg);
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${n2(a.x)} ${n2(a.y)} A ${r} ${r} 0 ${large} 1 ${n2(b.x)} ${n2(b.y)}`;
}

/** Filled sector clockwise from `fromDeg` to `toDeg`. */
export function sectorPath(
  cx: number,
  cy: number,
  r: number,
  fromDeg: number,
  toDeg: number,
): string {
  const a = clockPoint(cx, cy, r, fromDeg);
  const b = clockPoint(cx, cy, r, toDeg);
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${n2(a.x)} ${n2(a.y)} A ${r} ${r} 0 ${large} 1 ${n2(b.x)} ${n2(b.y)} Z`;
}

export function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
