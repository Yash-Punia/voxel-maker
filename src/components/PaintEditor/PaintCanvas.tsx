import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../../store';
import { cellIndex } from '../../core/gridUtils';
import { floodFill } from '../../core/floodFill';
import type { SelectRect } from '../../types';

export function PaintCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const spaceHeld = useRef(false);
  const rectStart = useRef<{ x: number; y: number } | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const s = useStore.getState();
    const { gridWidth: w, gridHeight: h, colorMap, showGrid, zoom, panOffset, selectRect } = s;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = '#111116';
    ctx.fillRect(0, 0, cw, ch);

    const ox = panOffset.x;
    const oy = panOffset.y;

    // Draw cells
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const color = colorMap[cellIndex(x, y, w)];
        const px = ox + x * zoom;
        const py = oy + y * zoom;
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(px, py, zoom, zoom);
        } else {
          // Checkerboard for transparent
          const checker = (x + y) % 2 === 0 ? '#1e1e24' : '#28282e';
          ctx.fillStyle = checker;
          ctx.fillRect(px, py, zoom, zoom);
        }
      }
    }

    // Grid lines
    if (showGrid && zoom >= 4) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= w; x++) {
        ctx.beginPath();
        ctx.moveTo(ox + x * zoom, oy);
        ctx.lineTo(ox + x * zoom, oy + h * zoom);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y++) {
        ctx.beginPath();
        ctx.moveTo(ox, oy + y * zoom);
        ctx.lineTo(ox + w * zoom, oy + y * zoom);
        ctx.stroke();
      }
    }

    // Select rect overlay
    if (selectRect) {
      const { x1, y1, x2, y2 } = selectRect;
      const sx = ox + Math.min(x1, x2) * zoom;
      const sy = oy + Math.min(y1, y2) * zoom;
      const sw = (Math.abs(x2 - x1) + 1) * zoom;
      const sh = (Math.abs(y2 - y1) + 1) * zoom;
      ctx.strokeStyle = '#6b6bff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(107, 107, 255, 0.1)';
      ctx.fillRect(sx, sy, sw, sh);
    }
  }, []);

  // Subscribe to store changes without React re-render
  useEffect(() => {
    const unsub = useStore.subscribe(() => draw());
    return unsub;
  }, [draw]);

  // Resize canvas to fill container
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = wrap.clientWidth;
      canvas.height = wrap.clientHeight;
      draw();
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [draw]);

  const cellFromEvent = (e: React.MouseEvent | MouseEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const { zoom, panOffset, gridWidth, gridHeight } = useStore.getState();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cx = Math.floor((mx - panOffset.x) / zoom);
    const cy = Math.floor((my - panOffset.y) / zoom);
    if (cx < 0 || cy < 0 || cx >= gridWidth || cy >= gridHeight) return null;
    return { x: cx, y: cy };
  };

  const applyTool = (cell: { x: number; y: number }) => {
    const s = useStore.getState();
    const { activeTool, activeColor, gridWidth, gridHeight, colorMap, depthMap, selectRect } = s;

    // Check selection constraint
    if (selectRect) {
      const { x1, y1, x2, y2 } = selectRect;
      const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
      if (cell.x < minX || cell.x > maxX || cell.y < minY || cell.y > maxY) return;
    }

    const idx = cellIndex(cell.x, cell.y, gridWidth);

    if (activeTool === 'pencil') {
      s.setCell(idx, activeColor);
      s.setCursorPos(cell);
    } else if (activeTool === 'eraser') {
      s.setCell(idx, '');
      s.setCursorPos(cell);
    } else if (activeTool === 'fill') {
      const filled = floodFill(colorMap, cell.x, cell.y, activeColor, gridWidth, gridHeight);
      s.pushSnapshot({ colorMap: [...colorMap], depthMap: [...depthMap] });
      s.setColorMap(filled);
    } else if (activeTool === 'eyedropper') {
      const color = colorMap[idx];
      if (color) s.setColor(color);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || spaceHeld.current) {
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY };
      return;
    }
    if (e.button !== 0) return;

    const cell = cellFromEvent(e);
    const s = useStore.getState();

    if (s.activeTool === 'rect-select') {
      if (cell) {
        rectStart.current = cell;
        s.setSelectRect({ x1: cell.x, y1: cell.y, x2: cell.x, y2: cell.y });
      }
      isDrawing.current = true;
      return;
    }

    isDrawing.current = true;
    if (cell) {
      // Push snapshot before drawing stroke starts
      if (s.activeTool === 'pencil' || s.activeTool === 'eraser') {
        s.pushSnapshot({ colorMap: [...s.colorMap], depthMap: [...s.depthMap] });
      }
      applyTool(cell);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const cell = cellFromEvent(e);
    if (cell) useStore.getState().setCursorPos(cell);

    if (isPanning.current) {
      const s = useStore.getState();
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      panStart.current = { x: e.clientX, y: e.clientY };
      s.setPanOffset({ x: s.panOffset.x + dx, y: s.panOffset.y + dy });
      return;
    }

    if (!isDrawing.current || !cell) return;
    const s = useStore.getState();

    if (s.activeTool === 'rect-select' && rectStart.current) {
      s.setSelectRect({ x1: rectStart.current.x, y1: rectStart.current.y, x2: cell.x, y2: cell.y } as SelectRect);
      return;
    }

    applyTool(cell);
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
    isPanning.current = false;
    rectStart.current = null;
  };

  const handleMouseLeave = () => {
    useStore.getState().setCursorPos(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const s = useStore.getState();
    const delta = e.deltaY > 0 ? -2 : 2;
    const newZoom = Math.max(4, Math.min(32, s.zoom + delta));
    s.setZoom(newZoom);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.code === 'Space') spaceHeld.current = true; };
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') { spaceHeld.current = false; isPanning.current = false; } };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div ref={wrapRef} className="canvas-wrap"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      style={{ cursor: useStore.getState().activeTool === 'eyedropper' ? 'crosshair' : 'default' }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
