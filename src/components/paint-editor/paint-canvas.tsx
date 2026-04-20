import { useEffect, useRef, useCallback } from "react";
import { useStore } from "../../store";
import { cellIndex } from "../../core/grid-utils";
import { floodFill } from "../../core/flood-fill";
import { getShape } from "../../core/shapes";
import type { SelectRect } from "../../types";

// Bresenham's line algorithm — returns all grid cells along the line
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
  const inset = Math.max(1, Math.min(zoom * 0.12, 4));
  const size = Math.max(zoom - inset * 2, 1);
  const lineWidth = zoom >= 12 ? 2 : 1.25;

  ctx.save();
  ctx.fillStyle = opts?.ghost
    ? "rgba(107,107,255,0.10)"
    : "rgba(107,107,255,0.18)";
  ctx.strokeStyle = opts?.ghost
    ? "rgba(107,107,255,0.55)"
    : "rgba(160,160,255,0.95)";
  ctx.lineWidth = lineWidth;
  if (opts?.ghost) ctx.setLineDash([4, 3]);
  ctx.fillRect(x + inset, y + inset, size, size);
  ctx.strokeRect(
    x + inset + lineWidth / 2,
    y + inset + lineWidth / 2,
    size - lineWidth,
    size - lineWidth,
  );
  ctx.restore();
}

export function PaintCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const spaceHeld = useRef(false);
  const rectStart = useRef<{ x: number; y: number } | null>(null);
  const lineStartRef = useRef<{ x: number; y: number } | null>(null);
  const linePreviewRef = useRef<{ x: number; y: number }[]>([]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
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
    } = s;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = "#111116";
    ctx.fillRect(0, 0, cw, ch);

    const ox = panOffset.x;
    const oy = panOffset.y;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = cellIndex(x, y, w);
        const color = colorMap[idx];
        const px = ox + x * zoom;
        const py = oy + y * zoom;
        if (color) {
          ctx.fillStyle = color;
          getShape(shapeMap[idx]).draw2D(ctx, px, py, zoom, rotationMap[idx]);
        } else {
          const checker = (x + y) % 2 === 0 ? "#1e1e24" : "#28282e";
          ctx.fillStyle = checker;
          ctx.fillRect(px, py, zoom, zoom);
        }
      }
    }

    if (showGrid && zoom >= 4) {
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
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

    if (cursorPos) {
      const hoverX = ox + cursorPos.x * zoom;
      const hoverY = oy + cursorPos.y * zoom;
      drawHoverCell(ctx, hoverX, hoverY, zoom);

      const mirrored = mirrorCell(cursorPos.x, cursorPos.y, w, h, mirrorMode);
      if (mirrored && (mirrored.x !== cursorPos.x || mirrored.y !== cursorPos.y)) {
        drawHoverCell(
          ctx,
          ox + mirrored.x * zoom,
          oy + mirrored.y * zoom,
          zoom,
          { ghost: true },
        );
      }
    }

    // Mirror axis overlay
    if (mirrorMode === "horizontal") {
      const axisX = ox + (w / 2) * zoom;
      ctx.save();
      ctx.strokeStyle = "rgba(107,107,255,0.5)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(axisX, oy);
      ctx.lineTo(axisX, oy + h * zoom);
      ctx.stroke();
      ctx.restore();
    } else if (mirrorMode === "vertical") {
      const axisY = oy + (h / 2) * zoom;
      ctx.save();
      ctx.strokeStyle = "rgba(107,107,255,0.5)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(ox, axisY);
      ctx.lineTo(ox + w * zoom, axisY);
      ctx.stroke();
      ctx.restore();
    }

    // Line preview overlay
    if (linePreviewRef.current.length > 0) {
      const { activeColor, activeShape, activeRotation } = useStore.getState();
      ctx.globalAlpha = 0.65;
      ctx.fillStyle = activeColor;
      for (const cell of linePreviewRef.current) {
        const px = ox + cell.x * zoom;
        const py = oy + cell.y * zoom;
        getShape(activeShape).draw2D(ctx, px, py, zoom, activeRotation);
        // Mirror preview
        const mc = mirrorCell(cell.x, cell.y, w, h, mirrorMode);
        if (mc) {
          getShape(activeShape).draw2D(
            ctx,
            ox + mc.x * zoom,
            oy + mc.y * zoom,
            zoom,
            activeRotation,
          );
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
      ctx.strokeStyle = "#6b6bff";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(107, 107, 255, 0.1)";
      ctx.fillRect(sx, sy, sw, sh);
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

  const cellFromEvent = (
    e: React.MouseEvent | MouseEvent,
  ): { x: number; y: number } | null => {
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

  const clampCell = (cell: {
    x: number;
    y: number;
  }): { x: number; y: number } => {
    const { gridWidth, gridHeight } = useStore.getState();
    return {
      x: Math.max(0, Math.min(gridWidth - 1, cell.x)),
      y: Math.max(0, Math.min(gridHeight - 1, cell.y)),
    };
  };

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
        const newColor =
          ctrlOnly && hasContent ? existingColor : activeColor;
        const newShape =
          shiftOnly && hasContent ? existingShape : activeShape;
        const newRotation =
          shiftOnly && hasContent ? existingRotation : activeRotation;

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
      const filled = floodFill(
        colorMap,
        cell.x,
        cell.y,
        activeColor,
        gridWidth,
        gridHeight,
      );
      s.pushSnapshot({
        colorMap: [...colorMap],
        depthMap: [...depthMap],
        shapeMap: [...s.shapeMap],
        rotationMap: [...s.rotationMap],
      });
      s.setColorMap(filled);
    } else if (activeTool === "eyedropper") {
      const color = colorMap[cellIndex(cell.x, cell.y, gridWidth)];
      if (color) {
        s.setColor(color);
        s.setActiveShape(s.shapeMap[cellIndex(cell.x, cell.y, gridWidth)]);
        s.setActiveRotation(
          s.rotationMap[cellIndex(cell.x, cell.y, gridWidth)],
        );
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
    if (e.button === 1 || spaceHeld.current) {
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY };
      return;
    }
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
        draw();
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
    const cell = cellFromEvent(e);
    useStore.getState().setCursorPos(cell);

    if (isPanning.current) {
      const s = useStore.getState();
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      panStart.current = { x: e.clientX, y: e.clientY };
      s.setPanOffset({ x: s.panOffset.x + dx, y: s.panOffset.y + dy });
      return;
    }

    const s = useStore.getState();

    if (s.activeTool === "line" && isDrawing.current && lineStartRef.current) {
      const target =
        cell ??
        clampCell({
          x: Math.floor(
            (e.clientX -
              (canvasRef.current?.getBoundingClientRect().left ?? 0) -
              s.panOffset.x) /
              s.zoom,
          ),
          y: Math.floor(
            (e.clientY -
              (canvasRef.current?.getBoundingClientRect().top ?? 0) -
              s.panOffset.y) /
              s.zoom,
          ),
        });
      linePreviewRef.current = bresenham(
        lineStartRef.current.x,
        lineStartRef.current.y,
        target.x,
        target.y,
      );
      draw();
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
    const s = useStore.getState();
    if (s.activeTool === "line" && isDrawing.current) {
      commitLine();
    }
    isDrawing.current = false;
    isPanning.current = false;
    rectStart.current = null;
  }, [commitLine]);

  const handleMouseLeave = () => {
    useStore.getState().setCursorPos(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const s = useStore.getState();
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? -2 : 2;
      s.setZoom(Math.max(4, Math.min(32, s.zoom + delta)));
    } else {
      s.rotateActiveShape();
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceHeld.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeld.current = false;
        isPanning.current = false;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseUp]);

  return (
    <div
      ref={wrapRef}
      className="flex-1 overflow-hidden relative"
      style={{
        cursor:
          useStore.getState().activeTool === "eyedropper"
            ? "crosshair"
            : "default",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
