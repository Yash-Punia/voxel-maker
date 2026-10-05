import { describe, expect, it } from 'vitest';

import { MAX_ZOOM, MIN_ZOOM, cellAtPoint, clampCell, clampZoom, fitView, zoomAround } from './canvas-view';

// cellAtPoint runs on every pointer event: an error here paints the wrong cell,
// and the person sees it as the tool being unreliable rather than as a bug.

describe('clampZoom', () => {
  it('holds the range the canvas can actually draw', () => {
    expect(clampZoom(0)).toBe(MIN_ZOOM);
    expect(clampZoom(-50)).toBe(MIN_ZOOM);
    expect(clampZoom(9999)).toBe(MAX_ZOOM);
    expect(clampZoom(20)).toBe(20);
  });
});

describe('fitView', () => {
  it('centres the board in the viewport', () => {
    const view = fitView(1000, 1000, 16, 16);
    const drawn = 16 * view.zoom;
    expect(view.panOffset.x).toBe(Math.round((1000 - drawn) / 2));
    expect(view.panOffset.y).toBe(Math.round((1000 - drawn) / 2));
  });

  it('picks a whole pixel zoom, so cells never land on half pixels', () => {
    const view = fitView(1000, 1000, 16, 16);
    expect(Number.isInteger(view.zoom)).toBe(true);
  });

  it('fits inside the margin it was given', () => {
    const margin = 96;
    const view = fitView(800, 600, 32, 32);
    expect(32 * view.zoom).toBeLessThanOrEqual(600 - margin * 2);
  });

  it('follows the smaller side of a non-square viewport', () => {
    const wide = fitView(2000, 400, 16, 16);
    const tall = fitView(400, 2000, 16, 16);
    expect(wide.zoom).toBe(tall.zoom);
  });

  it('stays usable in a viewport smaller than its own margins', () => {
    // The rails can leave almost nothing on a short window. It must still return
    // a drawable zoom rather than zero or a negative.
    const view = fitView(100, 80, 64, 64);
    expect(view.zoom).toBeGreaterThanOrEqual(MIN_ZOOM);
  });

  it('gives a bigger board a smaller zoom', () => {
    expect(fitView(1000, 1000, 64, 64).zoom).toBeLessThan(fitView(1000, 1000, 8, 8).zoom);
  });
});

describe('zoomAround', () => {
  const view = { zoom: 10, panOffset: { x: 100, y: 100 } };

  it('keeps the board point under the cursor fixed', () => {
    const anchorX = 250;
    const anchorY = 180;
    const before = (anchorX - view.panOffset.x) / view.zoom;

    const next = zoomAround(view, 20, anchorX, anchorY);
    const after = (anchorX - next.panOffset.x) / next.zoom;
    // Within a pixel, because the offset is rounded to whole pixels.
    expect(Math.abs(after - before)).toBeLessThan(0.1);
  });

  it('returns the same object when the zoom would not change', () => {
    // Identity, so a scroll at the limit does not push a new view into the store.
    expect(zoomAround(view, 10, 0, 0)).toBe(view);
    expect(zoomAround({ ...view, zoom: MAX_ZOOM }, 9999, 0, 0).zoom).toBe(MAX_ZOOM);
  });

  it('clamps the target zoom', () => {
    expect(zoomAround(view, 9999, 0, 0).zoom).toBe(MAX_ZOOM);
    expect(zoomAround(view, -5, 0, 0).zoom).toBe(MIN_ZOOM);
  });

  it('keeps the offset on whole pixels', () => {
    const next = zoomAround(view, 17, 333, 217);
    expect(Number.isInteger(next.panOffset.x)).toBe(true);
    expect(Number.isInteger(next.panOffset.y)).toBe(true);
  });
});

describe('cellAtPoint', () => {
  const view = { zoom: 10, panOffset: { x: 100, y: 50 } };

  it('maps the board origin to cell 0,0', () => {
    expect(cellAtPoint(100, 50, view, 16, 16)).toEqual({ x: 0, y: 0 });
  });

  it('maps anywhere inside a cell to that cell', () => {
    expect(cellAtPoint(109, 59, view, 16, 16)).toEqual({ x: 0, y: 0 });
    expect(cellAtPoint(110, 50, view, 16, 16)).toEqual({ x: 1, y: 0 });
  });

  it('returns null outside the board rather than a clamped cell', () => {
    // Null and a clamped edge cell mean different things: one is "no paint", the
    // other is "paint the edge", and confusing them smears the border.
    expect(cellAtPoint(99, 50, view, 16, 16)).toBeNull();
    expect(cellAtPoint(100, 49, view, 16, 16)).toBeNull();
    expect(cellAtPoint(100 + 160, 50, view, 16, 16)).toBeNull();
    expect(cellAtPoint(100, 50 + 160, view, 16, 16)).toBeNull();
  });

  it('includes the last cell and excludes the pixel after it', () => {
    expect(cellAtPoint(100 + 159, 50 + 159, view, 16, 16)).toEqual({ x: 15, y: 15 });
    expect(cellAtPoint(100 + 160, 50 + 160, view, 16, 16)).toBeNull();
  });

  it('round trips against fitView at several zooms', () => {
    for (const grid of [8, 16, 32, 64]) {
      const v = fitView(1200, 900, grid, grid);
      for (const cell of [0, 1, grid - 1]) {
        const px = v.panOffset.x + cell * v.zoom + v.zoom / 2;
        const py = v.panOffset.y + cell * v.zoom + v.zoom / 2;
        expect(cellAtPoint(px, py, v, grid, grid)).toEqual({ x: cell, y: cell });
      }
    }
  });
});

describe('clampCell', () => {
  it('pulls a cell back onto the board', () => {
    expect(clampCell({ x: -5, y: 99 }, 16, 16)).toEqual({ x: 0, y: 15 });
  });

  it('leaves a cell that is already on it', () => {
    expect(clampCell({ x: 3, y: 4 }, 16, 16)).toEqual({ x: 3, y: 4 });
  });

  it('handles a one cell board', () => {
    expect(clampCell({ x: 7, y: 7 }, 1, 1)).toEqual({ x: 0, y: 0 });
  });
});
