import { useCallback, useRef } from "react";
import { useStore } from "../../store";
import { cellIndex } from "../../core/grid-utils";
import { floodFill } from "../../core/flood-fill";
import { getShape } from "../../core/shapes";
import { CANVAS_COLORS } from "../../core/theme";
import { paintBoard, paintCenterGuides } from "../../core/canvas-view";
import { useCanvasViewport, type StageRenderer } from "../../hooks/use-canvas-viewport";
import type { SelectRect } from "../../types";

// Bresenham's line algorithm. Returns every grid cell along the line.
function bresenham(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  const dx = Math.abs(x1 - x0),
    dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1,
    sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0,
    y = y0;
  while (true) {
    cells.push({ x, y });
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
  return cells;
}

// Returns the mirrored cell for a given cell based on mirror mode
function mirrorCell(
  x: number,
  y: number,
  gridWidth: number,
  gridHeight: number,
  mode: string,
): { x: number; y: number } | null {
  if (mode === "horizontal") return { x: gridWidth - 1 - x, y };
  if (mode === "vertical") return { x, y: gridHeight - 1 - y };
  return null;
}

function drawHoverCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  opts?: { ghost?: boolean },
) {
  const lineWidth = zoom >= 12 ? 2 : 1.25;

  ctx.save();
  ctx.fillStyle = opts?.ghost ? CANVAS_COLORS.ghostFill : CANVAS_COLORS.hoverFill;
  ctx.strokeStyle = opts?.ghost ? CANVAS_COLORS.ghostStroke : CANVAS_COLORS.hoverStroke;
  ctx.lineWidth = lineWidth;
  if (opts?.ghost) ctx.setLineDash([4, 3]);
  ctx.fillRect(x, y, zoom, zoom);
  ctx.strokeRect(
    x + lineWidth / 2,
    y + lineWidth / 2,
    zoom - lineWidth,
    zoom - lineWidth,
  );
  ctx.restore();
}

export function PaintCanvas() {
  const isDrawing = useRef(false);
  const rectStart = useRef<{ x: number; y: number } | null>(null);
  const lineStartRef = useRef<{ x: number; y: number } | null>(null);
  const linePreviewRef = useRef<{ x: number; y: number }[]>([]);

  const draw = useCallback<StageRenderer>((ctx) => {
    const s = useStore.getState();
    const {
      gridWidth: w,
      gridHeight: h,
      colorMap,
      shapeMap,
      rotationMap,
      showGrid,
      zoom,
      panOffset,
      selectRect,
      cursorPos,
      mirrorMode,
      onionSkin,
      activeFrameIndex,
      tiledView,
    } = s;

    paintBoard(ctx, { zoom, panOffset }, w, h, CANVAS_COLORS);

    const ox = panOffset.x;
    const oy = panOffset.y;

    // Tiled view: the same board repeated around the real one, dimmed, so a
    // seam shows up where it will actually be seen. The centre copy is the only
    // one that is edited, the way a tiled mode works everywhere else.
    if (tiledView) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      for (let ty = -1; ty <= 1; ty++) {
        for (let tx = -1; tx <= 1; tx++) {
          if (tx === 0 && ty === 0) continue;
          const tileX = ox + tx * w * zoom;
          const tileY = oy + ty * h * zoom;
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const idx = cellIndex(x, y, w);
              const color = colorMap[idx];
              if (!color) continue;
              ctx.fillStyle = color;
              getShape(shapeMap[idx]).draw2D(
                ctx, tileX + x * zoom, tileY + y * zoom, zoom, rotationMap[idx],
              );
            }
          }
        }
      }
      ctx.restore();
    }

    // Onion skin: the frame before this one, ghosted underneath, so a pose can
    // be drawn against the one it follows.
    if (onionSkin && activeFrameIndex > 0) {
      const previous = s.assets.find((a) => a.id === s.activeAssetId)?.frames[activeFrameIndex - 1];
      if (previous) {
        ctx.save();
        ctx.globalAlpha = 0.28;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = cellIndex(x, y, w);
            const color = previous.colorMap[idx];
            if (!color) continue;
            ctx.fillStyle = color;
            getShape(previous.shapeMap[idx]).draw2D(
              ctx, ox + x * zoom, oy + y * zoom, zoom, previous.rotationMap[idx],
            );
          }
        }
        ctx.restore();
      }
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = cellIndex(x, y, w);
        const color = colorMap[idx];
        if (!color) continue;
        ctx.fillStyle = color;
        getShape(shapeMap[idx]).draw2D(ctx, ox + x * zoom, oy + y * zoom, zoom, rotationMap[idx]);
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

    // Mirror axis overlay
    if (mirrorMode !== "none") {
      ctx.save();
      ctx.strokeStyle = CANVAS_COLORS.mirrorAxis;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      if (mirrorMode === "horizontal") {
        const axisX = ox + (w / 2) * zoom;
        ctx.moveTo(axisX, oy);
        ctx.lineTo(axisX, oy + h * zoom);
      } else {
        const axisY = oy + (h / 2) * zoom;
        ctx.moveTo(ox, axisY);
        ctx.lineTo(ox + w * zoom, axisY);
      }
      ctx.stroke();
      ctx.restore();
    }

    if (cursorPos) {
      drawHoverCell(ctx, ox + cursorPos.x * zoom, oy + cursorPos.y * zoom, zoom);

      const mirrored = mirrorCell(cursorPos.x, cursorPos.y, w, h, mirrorMode);
      if (mirrored && (mirrored.x !== cursorPos.x || mirrored.y !== cursorPos.y)) {
        drawHoverCell(ctx, ox + mirrored.x * zoom, oy + mirrored.y * zoom, zoom, {
          ghost: true,
        });
      }
    }

    // Line preview overlay
    if (linePreviewRef.current.length > 0) {
      const { activeColor, activeShape, activeRotation } = s;
      ctx.globalAlpha = 0.65;
      ctx.fillStyle = activeColor;
      for (const cell of linePreviewRef.current) {
        getShape(activeShape).draw2D(ctx, ox + cell.x * zoom, oy + cell.y * zoom, zoom, activeRotation);
        const mc = mirrorCell(cell.x, cell.y, w, h, mirrorMode);
        if (mc) {
          getShape(activeShape).draw2D(ctx, ox + mc.x * zoom, oy + mc.y * zoom, zoom, activeRotation);
        }
      }
      ctx.globalAlpha = 1;
    }

    if (selectRect) {
      const { x1, y1, x2, y2 } = selectRect;
      const sx = ox + Math.min(x1, x2) * zoom;
      const sy = oy + Math.min(y1, y2) * zoom;
      const sw = (Math.abs(x2 - x1) + 1) * zoom;
      const sh = (Math.abs(y2 - y1) + 1) * zoom;
      ctx.save();
      ctx.fillStyle = CANVAS_COLORS.selectionFill;
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = CANVAS_COLORS.accent;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1);
      ctx.restore();
    }
  }, []);

  const {
    wrapRef,
    canvasRef,
    render,
    endPan,
    cellFromEvent,
    clampedCellFromEvent,
    tryStartPan,
    tryPan,
    handleWheel,
  } = useCanvasViewport(draw);

  // Paint a single cell + its mirror (if active) directly onto provided mutable maps
  const paintCellToMaps = (
    x: number,
    y: number,
    color: string,
    shape: string,
    rotation: number,
    colorMap: string[],
    shapeMap: string[],
    rotationMap: number[],
    gridWidth: number,
    gridHeight: number,
    mirrorMode: string,
  ) => {
    const paint = (cx: number, cy: number) => {
      if (cx < 0 || cx >= gridWidth || cy < 0 || cy >= gridHeight) return;
      const idx = cellIndex(cx, cy, gridWidth);
      colorMap[idx] = color;
      shapeMap[idx] = shape;
      rotationMap[idx] = rotation;
    };
    paint(x, y);
    const mc = mirrorCell(x, y, gridWidth, gridHeight, mirrorMode);
    if (mc) paint(mc.x, mc.y);
  };

  const applyTool = (
    cell: { x: number; y: number },
    modifiers?: { ctrl: boolean; shift: boolean },
  ) => {
    const s = useStore.getState();
    const {
      activeTool,
      activeColor,
      activeShape,
      activeRotation,
      gridWidth,
      gridHeight,
      colorMap,
      depthMap,
      selectRect,
      mirrorMode,
    } = s;
    const ctrlOnly = modifiers?.ctrl && !modifiers?.shift;
    const shiftOnly = modifiers?.shift && !modifiers?.ctrl;

    const inSelection = (x: number, y: number) => {
      if (!selectRect) return true;
      const { x1, y1, x2, y2 } = selectRect;
      return (
        x >= Math.min(x1, x2) &&
        x <= Math.max(x1, x2) &&
        y >= Math.min(y1, y2) &&
        y <= Math.max(y1, y2)
      );
    };

    if (!inSelection(cell.x, cell.y)) return;

    const applyToCell = (x: number, y: number) => {
      if (!inSelection(x, y)) return;
      const idx = cellIndex(x, y, gridWidth);
      if (activeTool === "pencil") {
        const hasContent = !!colorMap[idx];
        const existingColor = colorMap[idx];
        const existingShape = s.shapeMap[idx] ?? "square";
        const existingRotation = s.rotationMap[idx] ?? 0;

        // Modifiers only affect already-painted cells. On empty cells the
        // pencil always paints active color + active shape + active rotation.
        const newColor = ctrlOnly && hasContent ? existingColor : activeColor;
        const newShape = shiftOnly && hasContent ? existingShape : activeShape;
        const newRotation = shiftOnly && hasContent ? existingRotation : activeRotation;

        s.setCell(idx, newColor, newShape, newRotation);
      } else if (activeTool === "eraser") {
        s.setCell(idx, "", "square", 0);
      }
    };

    if (activeTool === "pencil" || activeTool === "eraser") {
      applyToCell(cell.x, cell.y);
      s.setCursorPos(cell);
      const mc = mirrorCell(cell.x, cell.y, gridWidth, gridHeight, mirrorMode);
      if (mc) applyToCell(mc.x, mc.y);
    } else if (activeTool === "fill") {
      const filled = floodFill(colorMap, cell.x, cell.y, activeColor, gridWidth, gridHeight);
      s.pushSnapshot({
        colorMap: [...colorMap],
        depthMap: [...depthMap],
        shapeMap: [...s.shapeMap],
        rotationMap: [...s.rotationMap],
      });
      s.setColorMap(filled);
    } else if (activeTool === "eyedropper") {
      const idx = cellIndex(cell.x, cell.y, gridWidth);
      const color = colorMap[idx];
      if (color) {
        s.setColor(color);
        s.setActiveShape(s.shapeMap[idx]);
        s.setActiveRotation(s.rotationMap[idx]);
      }
    }
  };

  const commitLine = useCallback(() => {
    const s = useStore.getState();
    const cells = linePreviewRef.current;
    if (cells.length === 0) return;

    const { selectRect, gridWidth, gridHeight, mirrorMode } = s;
    const newColorMap = [...s.colorMap];
    const newShapeMap = [...s.shapeMap];
    const newRotationMap = [...s.rotationMap];

    for (const cell of cells) {
      if (selectRect) {
        const { x1, y1, x2, y2 } = selectRect;
        if (
          cell.x < Math.min(x1, x2) ||
          cell.x > Math.max(x1, x2) ||
          cell.y < Math.min(y1, y2) ||
          cell.y > Math.max(y1, y2)
        )
          continue;
      }
      paintCellToMaps(
        cell.x,
        cell.y,
        s.activeColor,
        s.activeShape,
        s.activeRotation,
        newColorMap,
        newShapeMap,
        newRotationMap,
        gridWidth,
        gridHeight,
        mirrorMode,
      );
    }

    s.setColorMap(newColorMap);
    s.setShapeMap(newShapeMap);
    s.setRotationMap(newRotationMap);

    lineStartRef.current = null;
    linePreviewRef.current = [];
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tryStartPan(e)) return;
    if (e.button !== 0) return;

    const cell = cellFromEvent(e);
    const s = useStore.getState();

    if (s.activeTool === "line") {
      if (cell) {
        s.pushSnapshot({
          colorMap: [...s.colorMap],
          depthMap: [...s.depthMap],
          shapeMap: [...s.shapeMap],
          rotationMap: [...s.rotationMap],
        });
        lineStartRef.current = cell;
        linePreviewRef.current = [cell];
        render();
      }
      isDrawing.current = true;
      return;
    }

    if (s.activeTool === "rect-select") {
      if (cell) {
        rectStart.current = cell;
        s.setSelectRect({ x1: cell.x, y1: cell.y, x2: cell.x, y2: cell.y });
      }
      isDrawing.current = true;
      return;
    }

    isDrawing.current = true;
    if (cell) {
      if (s.activeTool === "pencil" || s.activeTool === "eraser") {
        s.pushSnapshot({
          colorMap: [...s.colorMap],
          depthMap: [...s.depthMap],
          shapeMap: [...s.shapeMap],
          rotationMap: [...s.rotationMap],
        });
      }
      applyTool(cell, { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (tryPan(e)) return;

    const cell = cellFromEvent(e);
    useStore.getState().setCursorPos(cell);
    const s = useStore.getState();

    if (s.activeTool === "line" && isDrawing.current && lineStartRef.current) {
      const target = cell ?? clampedCellFromEvent(e);
      linePreviewRef.current = bresenham(
        lineStartRef.current.x,
        lineStartRef.current.y,
        target.x,
        target.y,
      );
      render();
      return;
    }

    if (!isDrawing.current || !cell) return;

    if (s.activeTool === "rect-select" && rectStart.current) {
      s.setSelectRect({
        x1: rectStart.current.x,
        y1: rectStart.current.y,
        x2: cell.x,
        y2: cell.y,
      } as SelectRect);
      return;
    }

    applyTool(cell, { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey });
  };

  const handleMouseUp = useCallback(() => {
    if (useStore.getState().activeTool === "line" && isDrawing.current) {
      commitLine();
    }
    isDrawing.current = false;
    endPan();
    rectStart.current = null;
  }, [commitLine, endPan]);

  const activeTool = useStore((s) => s.activeTool);
  const cursor = activeTool === "eyedropper" ? "copy" : "crosshair";

  return (
    <div
      ref={wrapRef}
      className="relative size-full overflow-hidden"
      style={{ cursor }}
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
