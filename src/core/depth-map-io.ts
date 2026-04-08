import type { DepthMap, ColorMap } from '../types';

// ─── Export ──────────────────────────────────────────────────────────────────
// Renders depthMap as a grayscale PNG.
// brightness = depth / 32 * 255; empty cells (no color) → black (0).

export function exportDepthMapPng(
  depthMap: DepthMap,
  colorMap: ColorMap,
  gridWidth: number,
  gridHeight: number,
): void {
  const canvas = document.createElement('canvas');
  canvas.width = gridWidth;
  canvas.height = gridHeight;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(gridWidth, gridHeight);
  const data = imageData.data;

  for (let i = 0; i < gridWidth * gridHeight; i++) {
    const hasColor = !!colorMap[i];
    const depth = hasColor ? (depthMap[i] ?? 1) : 0;
    const v = Math.round(Math.min(1, depth / 32) * 255);
    const p = i * 4;
    data[p] = v;
    data[p + 1] = v;
    data[p + 2] = v;
    data[p + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'depth-map.png';
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

// ─── Import ──────────────────────────────────────────────────────────────────
// Loads a grayscale PNG, samples each pixel, maps brightness → depth [1, 32].
// Resamples to gridWidth × gridHeight using nearest-neighbor.
// Pixels with brightness 0 → depth 0 (suppress).

export function importDepthMapPng(
  file: File,
  gridWidth: number,
  gridHeight: number,
): Promise<DepthMap> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = gridWidth;
      canvas.height = gridHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, gridWidth, gridHeight);
      const imageData = ctx.getImageData(0, 0, gridWidth, gridHeight);
      const data = imageData.data;

      const depthMap: DepthMap = new Array(gridWidth * gridHeight).fill(0);
      for (let i = 0; i < gridWidth * gridHeight; i++) {
        const brightness = data[i * 4]; // R channel of grayscale
        depthMap[i] = brightness === 0 ? 0 : Math.max(1, Math.round((brightness / 255) * 32));
      }
      resolve(depthMap);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}
