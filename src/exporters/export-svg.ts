import type { ColorMap, ShapeMap, RotationMap } from '../types';
import { getShape } from '../core/shapes';

// Exports the 2D paint canvas as an SVG vector image.
// Each painted cell becomes a <polygon> using its shape profile.

/** The SVG document. Split from the download so the output can be asserted. */
export function buildSvg(
  colorMap: ColorMap,
  shapeMap: ShapeMap,
  rotationMap: RotationMap,
  gridWidth: number,
  gridHeight: number,
  cellSize = 16,
): string {
  const w = gridWidth * cellSize;
  const h = gridHeight * cellSize;

  const polys: string[] = [];

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const idx = y * gridWidth + x;
      const color = colorMap[idx];
      if (!color) continue;

      const shapeId = shapeMap[idx] ?? 'square';
      const rotation = rotationMap[idx] ?? 0;
      const shape = getShape(shapeId);
      const { vertices } = shape.getProfile(rotation);

      const ox = x * cellSize;
      const oy = y * cellSize;

      const points = vertices
        .map(([vx, vy]) => `${(ox + vx * cellSize).toFixed(2)},${(oy + vy * cellSize).toFixed(2)}`)
        .join(' ');

      polys.push(`  <polygon points="${points}" fill="${color}"/>`);
    }
  }

  const svg = `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">
  <rect width="${w}" height="${h}" fill="#111116"/>
${polys.join('\n')}
</svg>`;

  return svg;
}

export function exportSvg(
  colorMap: ColorMap,
  shapeMap: ShapeMap,
  rotationMap: RotationMap,
  gridWidth: number,
  gridHeight: number,
  cellSize = 16,
  filename = 'voxbrush.svg',
): void {
  const svg = buildSvg(colorMap, shapeMap, rotationMap, gridWidth, gridHeight, cellSize);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
