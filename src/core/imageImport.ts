import type { ColorMap } from '../types';

export function quantizeImageToGrid(
  imageData: ImageData,
  targetW: number,
  targetH: number
): ColorMap {
  const colorMap: ColorMap = new Array(targetW * targetH).fill('');
  const srcW = imageData.width;
  const srcH = imageData.height;
  const data = imageData.data;

  for (let ty = 0; ty < targetH; ty++) {
    for (let tx = 0; tx < targetW; tx++) {
      // Nearest-neighbor sample
      const sx = Math.floor((tx / targetW) * srcW);
      const sy = Math.floor((ty / targetH) * srcH);
      const srcIdx = (sy * srcW + sx) * 4;
      const r = data[srcIdx];
      const g = data[srcIdx + 1];
      const b = data[srcIdx + 2];
      const a = data[srcIdx + 3];

      if (a < 32) {
        colorMap[ty * targetW + tx] = '';
      } else {
        colorMap[ty * targetW + tx] = rgbToHex(r, g, b);
      }
    }
  }

  return colorMap;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

export function loadImageFromFile(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height));
      URL.revokeObjectURL(url);
    };
    img.onerror = reject;
    img.src = url;
  });
}
