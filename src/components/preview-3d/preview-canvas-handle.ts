// The PNG snapshot exporter needs the live WebGL canvas, and the export screen
// is a different mode from the preview that owns it. One module-level handle
// beats threading a ref through the shell.
let previewCanvas: HTMLCanvasElement | null = null;

export function setPreviewCanvas(canvas: HTMLCanvasElement | null): void {
  previewCanvas = canvas;
}

export function getPreviewCanvas(): HTMLCanvasElement | null {
  return previewCanvas;
}
