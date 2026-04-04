export function cellIndex(x: number, y: number, w: number): number {
  return y * w + x;
}

export function cellCoords(idx: number, w: number): { x: number; y: number } {
  return { x: idx % w, y: Math.floor(idx / w) };
}

export function neighbors4(
  x: number,
  y: number,
  w: number,
  h: number
): Array<{ x: number; y: number }> {
  const result: Array<{ x: number; y: number }> = [];
  if (x > 0) result.push({ x: x - 1, y });
  if (x < w - 1) result.push({ x: x + 1, y });
  if (y > 0) result.push({ x, y: y - 1 });
  if (y < h - 1) result.push({ x, y: y + 1 });
  return result;
}
