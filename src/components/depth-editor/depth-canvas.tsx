import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../../store';
import { cellIndex } from '../../core/grid-utils';
import { depthToColor } from '../../core/depth-ops';

export function DepthCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const spaceHeld = useRef(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const { gridWidth: w, gridHeight: h, colorMap, depthMap, showGrid, zoom, panOffset } = useStore.getState();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#111116';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const ox = panOffset.x;
    const oy = panOffset.y;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = cellIndex(x, y, w);
        const color = colorMap[idx];
        const depth = depthMap[idx] ?? 1;
        const px = ox + x * zoom;
        const py = oy + y * zoom;

        if (!color) {
          // Transparent cell — checkerboard
          ctx.fillStyle = (x + y) % 2 === 0 ? '#1e1e24' : '#28282e';
          ctx.fillRect(px, py, zoom, zoom);
        } else {
          ctx.fillStyle = depthToColor(depth);
          ctx.fillRect(px, py, zoom, zoom);
          // Show depth number if zoom is large enough
          if (zoom >= 16) {
            ctx.fillStyle = depth > 16 ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)';
            ctx.font = `${Math.min(zoom * 0.45, 12)}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(depth), px + zoom / 2, py + zoom / 2);
          }
        }
      }
    }

    // Grid lines
    if (showGrid && zoom >= 4) {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
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
  }, []);

  useEffect(() => {
    const unsub = useStore.subscribe(() => draw());
    return unsub;
  }, [draw]);

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

  const cellFromEvent = (e: React.MouseEvent | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const { zoom, panOffset, gridWidth, gridHeight } = useStore.getState();
    const cx = Math.floor((e.clientX - rect.left - panOffset.x) / zoom);
    const cy = Math.floor((e.clientY - rect.top - panOffset.y) / zoom);
    if (cx < 0 || cy < 0 || cx >= gridWidth || cy >= gridHeight) return null;
    return { x: cx, y: cy };
  };

  const applyDepth = (cell: { x: number; y: number }) => {
    const s = useStore.getState();
    const idx = cellIndex(cell.x, cell.y, s.gridWidth);
    s.setDepth(idx, s.activeDepth);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || spaceHeld.current) {
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY };
      return;
    }
    if (e.button !== 0) return;
    isDrawing.current = true;
    const s = useStore.getState();
    s.pushSnapshot({ colorMap: [...s.colorMap], depthMap: [...s.depthMap] });
    const cell = cellFromEvent(e);
    if (cell) applyDepth(cell);
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
    applyDepth(cell);
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
    isPanning.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const s = useStore.getState();
    const delta = e.deltaY > 0 ? -2 : 2;
    s.setZoom(Math.max(4, Math.min(32, s.zoom + delta)));
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
      onMouseLeave={() => useStore.getState().setCursorPos(null)}
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
