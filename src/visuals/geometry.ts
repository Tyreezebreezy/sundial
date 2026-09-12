export function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
