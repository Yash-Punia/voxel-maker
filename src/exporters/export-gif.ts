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

/** One mesh turns on a turntable. Several play as the animation they are, because
 *  a spinning walk cycle shows neither the spin nor the walk. */
export async function exportGif(meshes: MeshData[], opts: GifExportOptions = {}): Promise<void> {
  const {
    frames = 36,
    size = 256,
    delay = 60,
    background = '#111116',
    filename = 'voxbrush-turntable.gif',
  } = opts;

  const drawable = meshes.filter((mesh) => mesh.positions.length > 0);
  if (drawable.length === 0) {
    toast.error('Nothing to export', 'The canvas is empty.');
    return;
  }

  const animated = drawable.length > 1;

  const gif = GIFEncoder();
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.canvas.width = size;
  ctx.canvas.height = size;

  const writeFrame = (scene: { canvas: HTMLCanvasElement }) => {
    // Copy the WebGL canvas to a 2D canvas to read ImageData.
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(scene.canvas, 0, 0);
    const { data } = ctx.getImageData(0, 0, size, size);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, size, size, { palette, delay });
  };

  if (animated) {
    // Each animation frame is its own board, so it needs its own scene. The
    // camera stays still: the subject is the animation, not the turn.
    for (const mesh of drawable) {
      const scene = createOffscreenScene(mesh, { size, background });
      scene.render(0);
      writeFrame(scene);
      scene.dispose();
    }
  } else {
    const scene = createOffscreenScene(drawable[0], { size, background });
    for (let i = 0; i < frames; i++) {
      scene.render(i / frames);
      writeFrame(scene);
    }
    scene.dispose();
  }

  gif.finish();

  const blob = new Blob([gif.bytes() as unknown as BlobPart], { type: 'image/gif' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
