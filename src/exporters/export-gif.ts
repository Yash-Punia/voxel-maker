import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import type { MeshData } from '../types';
import { createOffscreenScene } from '../core/offscreen-render';
import { toast } from '../core/toast';

export interface GifExportOptions {
  frames?: number;       // number of frames (default 36 = 10° per frame)
  size?: number;         // output width/height in pixels (default 256)
  delay?: number;        // ms per frame (default 60)
  background?: string;   // CSS color (default #111116)
  filename?: string;
}

export async function exportGif(mesh: MeshData, opts: GifExportOptions = {}): Promise<void> {
  const {
    frames = 36,
    size = 256,
    delay = 60,
    background = '#111116',
    filename = 'voxbrush-turntable.gif',
  } = opts;

  if (mesh.positions.length === 0) {
    toast.error('Nothing to export', 'The canvas is empty.');
    return;
  }

  const scene = createOffscreenScene(mesh, { size, background });

  const gif = GIFEncoder();
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.canvas.width = size;
  ctx.canvas.height = size;

  for (let i = 0; i < frames; i++) {
    scene.render(i / frames);

    // Copy the WebGL canvas to a 2D canvas to read ImageData.
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(scene.canvas, 0, 0);
    const { data } = ctx.getImageData(0, 0, size, size);

    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, size, size, { palette, delay });
  }

  gif.finish();
  scene.dispose();

  const blob = new Blob([gif.bytes() as unknown as BlobPart], { type: 'image/gif' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
