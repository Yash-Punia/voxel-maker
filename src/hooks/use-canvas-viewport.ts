import { useCallback, useEffect, useRef } from 'react';
import type React from 'react';
import { useStore } from '../store';
import { cellAtPoint, clampCell, fitView, setupCanvas, zoomAround } from '../core/canvas-view';
import { APP_EVENTS } from '../core/app-events';

/** Draws one frame. The hook hands over a context already cleared and scaled
 *  to CSS pixels, so a stage only has to describe its own content. */
export type StageRenderer = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) => void;

export interface CanvasViewport {
  wrapRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  render: () => void;
  fit: () => void;
  cellFromEvent: (e: { clientX: number; clientY: number }) => { x: number; y: number } | null;
  clampedCellFromEvent: (e: { clientX: number; clientY: number }) => { x: number; y: number };
  tryStartPan: (e: React.MouseEvent) => boolean;
  tryPan: (e: React.MouseEvent) => boolean;
  endPan: () => void;
  handleWheel: (e: React.WheelEvent) => void;
}

/**
 * Owns everything a stage canvas does that is not tool-specific: sizing the
 * backing store, redrawing on store changes, framing the board, panning and
 * zooming. Tool input stays in the canvas component that calls this.
 */
export function useCanvasViewport(draw: StageRenderer): CanvasViewport {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const spaceHeld = useRef(false);
  const hasFitted = useRef(false);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const width = wrap.clientWidth;
    const height = wrap.clientHeight;
    if (width === 0 || height === 0) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, width, height);
    draw(ctx, width, height);
  }, [draw]);

  const fit = useCallback(() => {
    const { w, h } = sizeRef.current;
    if (w === 0 || h === 0) return;
    const s = useStore.getState();
    const next = fitView(w, h, s.gridWidth, s.gridHeight);
    s.setView(next.zoom, next.panOffset);
  }, []);

  // Size the canvas to its wrapper, then frame the board the first time we
  // learn the viewport size. Later resizes leave the user's framing alone.
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ro = new ResizeObserver(() => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      const prev = sizeRef.current;
      sizeRef.current = { w, h };
      if (w === 0 || h === 0) return;

      setupCanvas(canvas, w, h);
      if (!hasFitted.current) {
        hasFitted.current = true;
        fit();
      } else if (prev.w > 0 && (prev.w !== w || prev.h !== h)) {
        // Keep the board where it looks like it is. Opening the assistant
        // narrows the stage, and without this the artwork slides off-centre.
        const s = useStore.getState();
        s.setPanOffset({
          x: Math.round(s.panOffset.x + (w - prev.w) / 2),
          y: Math.round(s.panOffset.y + (h - prev.h) / 2),
        });
      }
      render();
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [render, fit]);

  useEffect(() => useStore.subscribe(() => render()), [render]);

  // Refit when the board itself changes size, since the old framing is
  // meaningless against a different grid.
  useEffect(
    () =>
      useStore.subscribe((s, prev) => {
        if (s.gridWidth === prev.gridWidth && s.gridHeight === prev.gridHeight) return;
        fit();
      }),
    [fit],
  );

  useEffect(() => {
    document.addEventListener(APP_EVENTS.fitView, fit);
    return () => document.removeEventListener(APP_EVENTS.fitView, fit);
  }, [fit]);

  const pointerPos = useCallback((e: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const cellFromEvent = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const p = pointerPos(e);
      const s = useStore.getState();
      return cellAtPoint(p.x, p.y, s, s.gridWidth, s.gridHeight);
    },
    [pointerPos],
  );

  // Same as cellFromEvent but never returns null, so a drag that leaves the
  // board still resolves to the nearest cell.
  const clampedCellFromEvent = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const p = pointerPos(e);
      const s = useStore.getState();
      return clampCell(
        {
          x: Math.floor((p.x - s.panOffset.x) / s.zoom),
          y: Math.floor((p.y - s.panOffset.y) / s.zoom),
        },
        s.gridWidth,
        s.gridHeight,
      );
    },
    [pointerPos],
  );

  const tryStartPan = useCallback((e: React.MouseEvent) => {
    if (e.button !== 1 && !(spaceHeld.current && e.button === 0)) return false;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY };
    return true;
  }, []);

  const tryPan = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return false;
    const s = useStore.getState();
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    panStart.current = { x: e.clientX, y: e.clientY };
    s.setPanOffset({ x: s.panOffset.x + dx, y: s.panOffset.y + dy });
    return true;
  }, []);

  const endPan = useCallback(() => {
    isPanning.current = false;
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      const s = useStore.getState();
      const p = pointerPos(e);
      const step = e.deltaY > 0 ? -2 : 2;
      const next = zoomAround(s, s.zoom + step, p.x, p.y);
      s.setView(next.zoom, next.panOffset);
    },
    [pointerPos],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceHeld.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      spaceHeld.current = false;
      isPanning.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  return {
    wrapRef,
    canvasRef,
    render,
    fit,
    cellFromEvent,
    clampedCellFromEvent,
    tryStartPan,
    tryPan,
    endPan,
    handleWheel,
  };
}
