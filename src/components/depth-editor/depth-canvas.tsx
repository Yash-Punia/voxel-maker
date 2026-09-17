import { useCallback, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { cellIndex } from '../../core/grid-utils';
import { depthToColor } from '../../core/depth-ops';
import { CANVAS_COLORS, CANVAS_LABEL_FONT } from '../../core/theme';
import { paintBoard, paintCenterGuides } from '../../core/canvas-view';
import { useCanvasViewport, type StageRenderer } from '../../hooks/use-canvas-viewport';

export type DepthViewMode = 'depth' | 'color';

interface DepthCanvasProps {
  viewMode?: DepthViewMode;
}

export function DepthCanvas({ viewMode = 'depth' }: DepthCanvasProps) {
  const isDrawing = useRef(false);
  const viewModeRef = useRef(viewMode);

  const draw = useCallback<StageRenderer>((ctx) => {
    const {
      gridWidth: w,
      gridHeight: h,
      colorMap,
      depthMap,
      showGrid,
      zoom,
      panOffset,
      cursorPos,
    } = useStore.getState();

    paintBoard(ctx, { zoom, panOffset }, w, h, CANVAS_COLORS);

    const ox = panOffset.x;
    const oy = panOffset.y;
    const mode = viewModeRef.current;
    const showNumbers = zoom >= 14;

    if (showNumbers) {
      ctx.font = `600 ${Math.min(zoom * 0.5, 14)}px ${CANVAS_LABEL_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = cellIndex(x, y, w);
        const color = colorMap[idx];
        if (!color) continue;
        const depth = depthMap[idx] ?? 1;
        const px = ox + x * zoom;
        const py = oy + y * zoom;

        ctx.fillStyle = mode === 'color' ? color : depthToColor(depth);
        ctx.fillRect(px, py, zoom, zoom);

        if (showNumbers) {
          ctx.fillStyle = depth > 16 ? CANVAS_COLORS.depthLabelDark : CANVAS_COLORS.depthLabelLight;
          ctx.fillText(String(depth), px + zoom / 2, py + zoom / 2);
        }
      }
    }

    if (showGrid && zoom >= 6) {
      ctx.strokeStyle = CANVAS_COLORS.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= w; x++) {
        ctx.moveTo(ox + x * zoom, oy);
        ctx.lineTo(ox + x * zoom, oy + h * zoom);
      }
      for (let y = 0; y <= h; y++) {
        ctx.moveTo(ox, oy + y * zoom);
        ctx.lineTo(ox + w * zoom, oy + y * zoom);
      }
      ctx.stroke();
    }

    paintCenterGuides(ctx, { zoom, panOffset }, w, h, CANVAS_COLORS.guide);

    if (cursorPos) {
      const lineWidth = zoom >= 12 ? 2 : 1.25;
      ctx.save();
      ctx.strokeStyle = CANVAS_COLORS.hoverStroke;
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(
        ox + cursorPos.x * zoom + lineWidth / 2,
        oy + cursorPos.y * zoom + lineWidth / 2,
        zoom - lineWidth,
        zoom - lineWidth,
      );
      ctx.restore();
    }
  }, []);

  const { wrapRef, canvasRef, render, endPan, cellFromEvent, tryStartPan, tryPan, handleWheel } =
    useCanvasViewport(draw);

  useEffect(() => {
    viewModeRef.current = viewMode;
    render();
  }, [viewMode, render]);

  const applyDepth = (cell: { x: number; y: number }) => {
    const s = useStore.getState();
    s.setDepth(cellIndex(cell.x, cell.y, s.gridWidth), s.activeDepth);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tryStartPan(e)) return;
    if (e.button !== 0) return;
    isDrawing.current = true;
    const s = useStore.getState();
    s.pushSnapshot({
      colorMap: [...s.colorMap],
      depthMap: [...s.depthMap],
      shapeMap: [...s.shapeMap],
      rotationMap: [...s.rotationMap],
    });
    const cell = cellFromEvent(e);
    if (cell) applyDepth(cell);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (tryPan(e)) return;
    const cell = cellFromEvent(e);
    useStore.getState().setCursorPos(cell);
    if (!isDrawing.current || !cell) return;
    applyDepth(cell);
  };

  const handleMouseUp = useCallback(() => {
    isDrawing.current = false;
    endPan();
  }, [endPan]);

  return (
    <div
      ref={wrapRef}
      className="relative size-full cursor-crosshair overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        useStore.getState().setCursorPos(null);
        handleMouseUp();
      }}
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
