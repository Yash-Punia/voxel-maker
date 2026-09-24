// Pure view maths shared by the paint and depth canvases: how the artboard is
// framed inside a viewport, and which cell a pointer position lands on.

export interface ViewState {
  zoom: number;
  panOffset: { x: number; y: number };
}

export const MIN_ZOOM = 4;
export const MAX_ZOOM = 48;

export function clampZoom(z: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
}

// Largest whole-pixel zoom that leaves a margin of breathing room around the
// board, plus the offset that centres it. The default margin clears the
// floating rails, which sit about 72px in from each edge.
export function fitView(
  viewportWidth: number,
  viewportHeight: number,
  gridWidth: number,
  gridHeight: number,
  margin = 96,
): ViewState {
  const usableW = Math.max(viewportWidth - margin * 2, 32);
  const usableH = Math.max(viewportHeight - margin * 2, 32);
  const zoom = clampZoom(Math.floor(Math.min(usableW / gridWidth, usableH / gridHeight)));
  return {
    zoom,
    panOffset: {
      x: Math.round((viewportWidth - gridWidth * zoom) / 2),
      y: Math.round((viewportHeight - gridHeight * zoom) / 2),
    },
  };
}

// Keeps the point under the cursor fixed while the zoom level changes.
export function zoomAround(
  view: ViewState,
  nextZoom: number,
  anchorX: number,
  anchorY: number,
): ViewState {
  const zoom = clampZoom(nextZoom);
  if (zoom === view.zoom) return view;
  const scale = zoom / view.zoom;
  return {
    zoom,
    panOffset: {
      x: Math.round(anchorX - (anchorX - view.panOffset.x) * scale),
      y: Math.round(anchorY - (anchorY - view.panOffset.y) * scale),
    },
  };
}

export function cellAtPoint(
  px: number,
  py: number,
  view: ViewState,
  gridWidth: number,
  gridHeight: number,
): { x: number; y: number } | null {
  const x = Math.floor((px - view.panOffset.x) / view.zoom);
  const y = Math.floor((py - view.panOffset.y) / view.zoom);
  if (x < 0 || y < 0 || x >= gridWidth || y >= gridHeight) return null;
  return { x, y };
}

export function clampCell(
  cell: { x: number; y: number },
  gridWidth: number,
  gridHeight: number,
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(gridWidth - 1, cell.x)),
    y: Math.max(0, Math.min(gridHeight - 1, cell.y)),
  };
}

// Draws the artboard sheet: drop shadow, light checkerboard, rounded edge.
export function paintBoard(
  ctx: CanvasRenderingContext2D,
  view: ViewState,
  gridWidth: number,
  gridHeight: number,
  colors: { boardLight: string; boardDark: string; boardShadow: string },
): void {
  const { zoom, panOffset } = view;
  const w = gridWidth * zoom;
  const h = gridHeight * zoom;

  ctx.save();
  ctx.shadowColor = colors.boardShadow;
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = colors.boardLight;
  ctx.fillRect(panOffset.x, panOffset.y, w, h);
  ctx.restore();

  // Half a cell, clamped, so the checker always reads as a transparency
  // texture rather than a second grid competing with the artwork.
  const checker = Math.max(6, Math.min(12, Math.round(zoom / 2)));
  ctx.save();
  ctx.beginPath();
  ctx.rect(panOffset.x, panOffset.y, w, h);
  ctx.clip();
  ctx.fillStyle = colors.boardDark;
  const cols = Math.ceil(w / checker);
  const rows = Math.ceil(h / checker);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if ((row + col) % 2 === 0) continue;
      ctx.fillRect(
        panOffset.x + col * checker,
        panOffset.y + row * checker,
        checker,
        checker,
      );
    }
  }
  ctx.restore();
}

// Sizes the backing store to the device pixel ratio and returns a context
// already scaled to CSS pixels, so text and the board shadow stay sharp on
// retina displays while cell rects still land on whole pixels.
export function setupCanvas(
  canvas: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number,
): CanvasRenderingContext2D {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.round(cssWidth * dpr));
  const h = Math.max(1, Math.round(cssHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  return ctx;
}

// Faint cross through the middle of the board. Pixel art is built around its
// centre line far more often than its edges.
export function paintCenterGuides(
  ctx: CanvasRenderingContext2D,
  view: ViewState,
  gridWidth: number,
  gridHeight: number,
  color: string,
): void {
  const { zoom, panOffset } = view;
  const w = gridWidth * zoom;
  const h = gridHeight * zoom;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(panOffset.x + w / 2, panOffset.y);
  ctx.lineTo(panOffset.x + w / 2, panOffset.y + h);
  ctx.moveTo(panOffset.x, panOffset.y + h / 2);
  ctx.lineTo(panOffset.x + w, panOffset.y + h / 2);
  ctx.stroke();
  ctx.restore();
}
