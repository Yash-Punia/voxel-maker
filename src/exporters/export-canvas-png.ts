import type { ColorMap, ShapeMap, RotationMap } from '../types';
import { getShape } from '../core/shapes';

// Exports the 2D paint canvas as a raster PNG.
// Renders each cell's shape at configurable cellSize using the shape's draw2D.
// Distinct from the 3D snapshot — this is the flat pixel art as authored.

export function exportCanvasPng(
  colorMap: ColorMap,
  shapeMap: ShapeMap,
  rotationMap: RotationMap,
  gridWidth: number,
  gridHeight: number,
  cellSize = 16,
  filename = 'voxbrush-canvas.png',
): void {
  const canvas = document.createElement('canvas');
  canvas.width = gridWidth * cellSize;
  canvas.height = gridHeight * cellSize;
  const ctx = canvas.getContext('2d')!;

  // Transparent background by default — no fill. Cells render over transparency.

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const idx = y * gridWidth + x;
      const color = colorMap[idx];
      if (!color) continue;

      const shapeId = shapeMap[idx] ?? 'square';
      const rotation = rotationMap[idx] ?? 0;
      const shape = getShape(shapeId);

      ctx.fillStyle = color;
      shape.draw2D(ctx, x * cellSize, y * cellSize, cellSize, rotation);
    }
  }

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}
