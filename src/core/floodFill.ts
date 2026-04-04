import type { ColorMap } from '../types';
import { cellIndex, neighbors4 } from './gridUtils';

export function floodFill(
  colorMap: ColorMap,
  startX: number,
  startY: number,
  fillColor: string,
  w: number,
  h: number
): ColorMap {
  const targetColor = colorMap[cellIndex(startX, startY, w)];
  if (targetColor === fillColor) return colorMap;

  const result = [...colorMap];
  const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
  const visited = new Set<number>();

  while (queue.length > 0) {
    const { x, y } = queue.shift()!;
    const idx = cellIndex(x, y, w);
    if (visited.has(idx)) continue;
    if (result[idx] !== targetColor) continue;
    visited.add(idx);
    result[idx] = fillColor;
    for (const nb of neighbors4(x, y, w, h)) {
      const nIdx = cellIndex(nb.x, nb.y, w);
      if (!visited.has(nIdx) && result[nIdx] === targetColor) {
        queue.push(nb);
      }
    }
  }

  return result;
}
