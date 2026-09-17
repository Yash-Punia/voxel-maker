// How the assistant sees and edits the board. The model reads a compact legend
// plus one character per cell, which keeps a 64x64 board inside a few hundred
// tokens and stays legible enough for it to reason about shapes.

import { useStore } from '../store';
import { cellIndex } from '../core/grid-utils';
import { SHAPES } from '../core/shapes';

const LEGEND_CHARS = '123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const EMPTY = '.';
// Depth 0-32 in one character: 0-9 then a-w.
const DEPTH_CHARS = '0123456789abcdefghijklmnopqrstuvw';

export interface BoardSnapshot {
  width: number;
  height: number;
  colors: { legend: Record<string, string>; rows: string[] };
  depths: { note: string; rows: string[] };
  shapes?: { legend: Record<string, string>; rows: string[] };
}

export function readBoard(): BoardSnapshot {
  const s = useStore.getState();
  const { gridWidth: w, gridHeight: h, colorMap, depthMap, shapeMap } = s;

  const colorChar = new Map<string, string>();
  const legend: Record<string, string> = {};
  const shapeChar = new Map<string, string>();
  const shapeLegend: Record<string, string> = {};
  let usesShapes = false;

  const colorRows: string[] = [];
  const depthRows: string[] = [];
  const shapeRows: string[] = [];

  for (let y = 0; y < h; y++) {
    let colorRow = '';
    let depthRow = '';
    let shapeRow = '';
    for (let x = 0; x < w; x++) {
      const idx = cellIndex(x, y, w);
      const color = colorMap[idx];
      if (!color) {
        colorRow += EMPTY;
        depthRow += EMPTY;
        shapeRow += EMPTY;
        continue;
      }

      let ch = colorChar.get(color);
      if (!ch) {
        ch = LEGEND_CHARS[colorChar.size] ?? '?';
        colorChar.set(color, ch);
        legend[ch] = color;
      }
      colorRow += ch;

      const depth = Math.max(0, Math.min(32, depthMap[idx] ?? 1));
      depthRow += DEPTH_CHARS[depth];

      const shape = shapeMap[idx] ?? 'square';
      if (shape !== 'square') usesShapes = true;
      let sch = shapeChar.get(shape);
      if (!sch) {
        sch = LEGEND_CHARS[shapeChar.size] ?? '?';
        shapeChar.set(shape, sch);
        shapeLegend[sch] = shape;
      }
      shapeRow += sch;
    }
    colorRows.push(colorRow);
    depthRows.push(depthRow);
    shapeRows.push(shapeRow);
  }

  const snapshot: BoardSnapshot = {
    width: w,
    height: h,
    colors: { legend, rows: colorRows },
    depths: {
      note: 'One character per cell: 0-9 then a-w for depth 10-32. "." is an empty cell.',
      rows: depthRows,
    },
  };
  if (usesShapes) snapshot.shapes = { legend: shapeLegend, rows: shapeRows };
  return snapshot;
}

/** Takes one undo snapshot. The agent calls this once per turn, before its
 *  first write, so Ctrl+Z reverts the assistant's whole turn at once. */
/** One snapshot for a whole agent turn. It pins the asset list as well as the
 *  board, because a turn can create assets and Ctrl+Z has to take those back
 *  too, not just the painting. */
export function pushAgentSnapshot(): void {
  const s = useStore.getState();
  s.pushSnapshot({
    colorMap: [...s.colorMap],
    depthMap: [...s.depthMap],
    shapeMap: [...s.shapeMap],
    rotationMap: [...s.rotationMap],
    assetIds: s.assets.map((a) => a.id),
  });
}

export interface CellEdit {
  x: number;
  y: number;
  color?: string;
  shape?: string;
  rotation?: number;
}

const SHAPE_IDS = new Set(SHAPES.map((s) => s.id));

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

/** Accepts a hex string, a palette index as a number or a string, or "" to
 *  erase. Anything else throws, because a silently ignored colour is worse
 *  than a failed tool call. */
export function resolveColor(value: unknown): string {
  if (value === '' || value === null || value === undefined) return '';
  if (isHexColor(value)) return (value as string).toLowerCase();

  const index =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value.trim())
        ? Number(value.trim())
        : null;

  if (index !== null && Number.isInteger(index)) {
    const color = useStore.getState().palette[index];
    if (color) return color.toLowerCase();
    throw new Error(`palette slot ${index} is out of range (0-31)`);
  }

  throw new Error(`"${String(value)}" is not a #rrggbb colour, a palette index, or "" for erase`);
}

export function resolveShape(value: unknown, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  const id = String(value);
  if (!SHAPE_IDS.has(id)) throw new Error(`"${id}" is not a shape id`);
  return id;
}

export function resolveRotation(value: unknown, fallback: number): number {
  if (value === undefined || value === null) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 3) throw new Error('rotation must be 0, 1, 2 or 3');
  return n;
}

/**
 * Applies a batch of cell edits in one store write. Painting cell by cell
 * through setCell would re-render and rebuild the 3D mesh once per cell.
 */
export function applyCellEdits(edits: CellEdit[]): number {
  const s = useStore.getState();
  const { gridWidth: w, gridHeight: h } = s;
  const colorMap = [...s.colorMap];
  const shapeMap = [...s.shapeMap];
  const rotationMap = [...s.rotationMap];
  let written = 0;

  for (const edit of edits) {
    if (edit.x < 0 || edit.x >= w || edit.y < 0 || edit.y >= h) continue;
    const idx = cellIndex(edit.x, edit.y, w);
    if (edit.color !== undefined) {
      colorMap[idx] = edit.color;
      if (edit.color === '') {
        shapeMap[idx] = 'square';
        rotationMap[idx] = 0;
        written++;
        continue;
      }
    }
    if (edit.shape !== undefined) shapeMap[idx] = edit.shape;
    if (edit.rotation !== undefined) rotationMap[idx] = edit.rotation;
    written++;
  }

  s.setColorMap(colorMap);
  s.setShapeMap(shapeMap);
  s.setRotationMap(rotationMap);
  return written;
}

export function applyDepthEdits(edits: { x: number; y: number; depth: number }[]): number {
  const s = useStore.getState();
  const { gridWidth: w, gridHeight: h } = s;
  const depthMap = [...s.depthMap];
  let written = 0;

  for (const edit of edits) {
    if (edit.x < 0 || edit.x >= w || edit.y < 0 || edit.y >= h) continue;
    depthMap[cellIndex(edit.x, edit.y, w)] = Math.max(0, Math.min(32, Math.round(edit.depth)));
    written++;
  }

  s.setDepthMap(depthMap);
  return written;
}

/** Bresenham, shared with the line tool's behaviour. */
export function linePoints(x1: number, y1: number, x2: number, y2: number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;
  let err = dx - dy;
  let x = x1;
  let y = y1;
  for (;;) {
    points.push({ x, y });
    if (x === x2 && y === y2) break;
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
  return points;
}
