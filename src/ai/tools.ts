// The assistant's tool surface. Every read the app can do, the model can do;
// every write goes through the same store actions the UI uses, so the undo
// stack, the dirty flag and the 3D rebuild all behave exactly as if a person
// had done it.

import { useStore } from '../store';
import { floodFill } from '../core/flood-fill';
import { SHAPES } from '../core/shapes';
import { SAMPLES, materializeSample } from '../core/samples';
import { SAMPLE_PALETTES } from '../core/palette-samples';
import { generateDepth, type DepthGenMode } from '../core/depth-generate';
import { DEFAULT_PALETTE } from '../store/tool-slice';
import type { ToolSpec } from './types';
import {
  applyCellEdits,
  applyDepthEdits,
  linePoints,
  readBoard,
  resolveColor,
  resolveRotation,
  resolveShape,
  type CellEdit,
} from './board-io';
import type { EditorMode, ExtrusionMode, MirrorMode } from '../types';

const num = (value: unknown, label: string): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`${label} must be a number`);
  return Math.round(n);
};

const json = (value: unknown): string => JSON.stringify(value);

const INT = { type: 'integer' } as const;
// Deliberately one plain type rather than a union. Schema validators differ on
// anyOf, and a tool surface that only works on some providers is worse than a
// parameter that takes "3" as well as 3.
const COLOR = {
  type: 'string',
  description:
    'A #rrggbb colour such as "#ff5c38", or a palette index as a string such as "3", or "" to erase the cell.',
} as const;

function rectCells(input: Record<string, unknown>): { x: number; y: number }[] {
  const x = num(input.x, 'x');
  const y = num(input.y, 'y');
  const width = num(input.width, 'width');
  const height = num(input.height, 'height');
  if (width <= 0 || height <= 0) throw new Error('width and height must be 1 or more');
  const cells: { x: number; y: number }[] = [];
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) cells.push({ x: x + dx, y: y + dy });
  }
  return cells;
}

export const AI_TOOLS: ToolSpec[] = [
  {
    name: 'get_project',
    description:
      'Read the project state: board size, which mode is open, the 32-slot palette with its indices, the active colour, shape, rotation and brush depth, the extrusion settings, and how many cells are painted. Call this first in a new conversation, and again after anything resizes the board or changes the palette.',
    mutates: false,
    schema: { type: 'object', properties: {}, additionalProperties: false },
    run: () => {
      const s = useStore.getState();
      let painted = 0;
      for (const c of s.colorMap) if (c) painted++;
      return json({
        projectName: s.projectName,
        mode: s.mode,
        board: { width: s.gridWidth, height: s.gridHeight, paintedCells: painted },
        palette: s.palette.map((color, index) => ({ index, color })),
        active: {
          color: s.activeColor,
          paletteIndex: s.activePaletteIndex,
          shape: s.activeShape,
          rotation: s.activeRotation,
          depth: s.activeDepth,
          tool: s.activeTool,
          mirror: s.mirrorMode,
        },
        extrusion: { mode: s.extrusionMode, depthMultiplier: s.depthMultiplier },
        unsavedChanges: s.isDirty,
      });
    },
  },
  {
    name: 'read_board',
    description:
      'Read the artwork itself. Returns a legend mapping single characters to colours, then one row string per board row, plus the matching depth rows and, when the board uses non-square shapes, shape rows. "." is an empty cell. Row 0 is the top, column 0 is the left. Call this before editing anything that has to line up with what is already drawn.',
    mutates: false,
    schema: { type: 'object', properties: {}, additionalProperties: false },
    run: () => json(readBoard()),
  },
  {
    name: 'list_shapes',
    description:
      'List the shape ids a cell can hold. Every cell is one of these, drawn inside its own square, and rotation turns it in 90 degree steps. Use this before setting a shape you have not used yet.',
    mutates: false,
    schema: { type: 'object', properties: {}, additionalProperties: false },
    run: () => json(SHAPES.map((s) => ({ id: s.id, label: s.label, fillsWholeCell: s.isFullCell }))),
  },
  {
    name: 'list_presets',
    description:
      'List the built-in palettes and the sample projects, with the ids that set_palette and load_sample take.',
    mutates: false,
    schema: { type: 'object', properties: {}, additionalProperties: false },
    run: () =>
      json({
        palettes: SAMPLE_PALETTES.map((p) => ({ id: p.id, name: p.name, colors: p.colors })),
        samples: SAMPLES.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          size: `${s.gridWidth}x${s.gridHeight}`,
        })),
      }),
  },

  {
    name: 'set_cells',
    description:
      'Paint or erase a list of individual cells. This is the main drawing tool. Each cell takes x, y and a colour, and optionally a shape id and a rotation. Send one call with every cell you want to change rather than one call per cell.',
    mutates: true,
    schema: {
      type: 'object',
      properties: {
        cells: {
          type: 'array',
          items: {
            type: 'object',
            properties: { x: INT, y: INT, color: COLOR, shape: { type: 'string' }, rotation: INT },
            required: ['x', 'y', 'color'],
            additionalProperties: false,
          },
        },
      },
      required: ['cells'],
      additionalProperties: false,
    },
    run: (input) => {
      const raw = input.cells;
      if (!Array.isArray(raw) || raw.length === 0) throw new Error('cells must be a non-empty array');
      const s = useStore.getState();
      const edits: CellEdit[] = raw.map((cell) => {
        const c = cell as Record<string, unknown>;
        const color = resolveColor(c.color);
        return {
          x: num(c.x, 'x'),
          y: num(c.y, 'y'),
          color,
          shape: color === '' ? 'square' : resolveShape(c.shape, s.activeShape),
          rotation: color === '' ? 0 : resolveRotation(c.rotation, 0),
        };
      });
      return `Painted ${applyCellEdits(edits)} cells.`;
    },
  },
  {
    name: 'fill_rect',
    description:
      'Fill an axis-aligned rectangle with one colour, and optionally one shape and rotation. x and y are the top-left corner. Pass "" as the colour to erase the rectangle.',
    mutates: true,
    schema: {
      type: 'object',
      properties: {
        x: INT, y: INT, width: INT, height: INT,
        color: COLOR,
        shape: { type: 'string' },
        rotation: INT,
      },
      required: ['x', 'y', 'width', 'height', 'color'],
      additionalProperties: false,
    },
    run: (input) => {
      const color = resolveColor(input.color);
      const shape = color === '' ? 'square' : resolveShape(input.shape, 'square');
      const rotation = color === '' ? 0 : resolveRotation(input.rotation, 0);
      const edits = rectCells(input).map((cell) => ({ ...cell, color, shape, rotation }));
      const written = applyCellEdits(edits);
      return color === '' ? `Erased ${written} cells.` : `Filled ${written} cells with ${color}.`;
    },
  },
  {
    name: 'draw_line',
    description:
      'Draw a one-cell-wide line between two points, endpoints included. Pass "" as the colour to erase along the line.',
    mutates: true,
    schema: {
      type: 'object',
      properties: {
        x1: INT, y1: INT, x2: INT, y2: INT,
        color: COLOR,
        shape: { type: 'string' },
        rotation: INT,
      },
      required: ['x1', 'y1', 'x2', 'y2', 'color'],
      additionalProperties: false,
    },
    run: (input) => {
      const color = resolveColor(input.color);
      const shape = color === '' ? 'square' : resolveShape(input.shape, 'square');
      const rotation = color === '' ? 0 : resolveRotation(input.rotation, 0);
      const points = linePoints(
        num(input.x1, 'x1'), num(input.y1, 'y1'),
        num(input.x2, 'x2'), num(input.y2, 'y2'),
      );
      const written = applyCellEdits(points.map((p) => ({ ...p, color, shape, rotation })));
      return `Drew a line across ${written} cells.`;
    },
  },
  {
    name: 'flood_fill',
    description:
      'Flood fill from one cell, replacing every connected cell that currently holds the same colour. Matches the paint bucket in the UI.',
    mutates: true,
    schema: {
      type: 'object',
      properties: { x: INT, y: INT, color: COLOR },
      required: ['x', 'y', 'color'],
      additionalProperties: false,
    },
    run: (input) => {
      const s = useStore.getState();
      const x = num(input.x, 'x');
      const y = num(input.y, 'y');
      const color = resolveColor(input.color);
      if (x < 0 || y < 0 || x >= s.gridWidth || y >= s.gridHeight) {
        throw new Error(`(${x}, ${y}) is outside the ${s.gridWidth}x${s.gridHeight} board`);
      }
      s.setColorMap(floodFill(s.colorMap, x, y, color, s.gridWidth, s.gridHeight));
      return `Flood filled from (${x}, ${y}) with ${color || 'empty'}.`;
    },
  },
  {
    name: 'clear_board',
    description:
      'Erase every cell and reset every depth to 1. The palette and the board size are kept. Only call this when the user asks to start the drawing over.',
    mutates: true,
    schema: { type: 'object', properties: {}, additionalProperties: false },
    run: () => {
      useStore.getState().clearGrid();
      return 'Cleared the board.';
    },
  },
  {
    name: 'shift_board',
    description:
      'Move the whole drawing by a number of cells. Anything pushed past an edge is lost. Useful for centring artwork.',
    mutates: true,
    schema: {
      type: 'object',
      properties: { dx: INT, dy: INT },
      required: ['dx', 'dy'],
      additionalProperties: false,
    },
    run: (input) => {
      const dx = num(input.dx, 'dx');
      const dy = num(input.dy, 'dy');
      useStore.getState().shiftCanvas(dx, dy);
      return `Shifted the board by (${dx}, ${dy}).`;
    },
  },
  {
    name: 'resize_board',
    description:
      'Change the board size. Existing artwork keeps its top-left position and anything outside the new size is cut off. Sizes run from 4 to 64.',
    mutates: true,
    schema: {
      type: 'object',
      properties: { width: INT, height: INT },
      required: ['width', 'height'],
      additionalProperties: false,
    },
    run: (input) => {
      const width = Math.max(4, Math.min(64, num(input.width, 'width')));
      const height = Math.max(4, Math.min(64, num(input.height, 'height')));
      useStore.getState().resizeGrid(width, height);
      return `Board is now ${width}x${height}.`;
    },
  },

  {
    name: 'set_depths',
    description:
      'Set the depth of individual cells. Depth is how many units the cell extrudes in 3D, from 0 to 32, where 0 suppresses the cell entirely. Only painted cells produce geometry.',
    mutates: true,
    schema: {
      type: 'object',
      properties: {
        cells: {
          type: 'array',
          items: {
            type: 'object',
            properties: { x: INT, y: INT, depth: INT },
            required: ['x', 'y', 'depth'],
            additionalProperties: false,
          },
        },
      },
      required: ['cells'],
      additionalProperties: false,
    },
    run: (input) => {
      const raw = input.cells;
      if (!Array.isArray(raw) || raw.length === 0) throw new Error('cells must be a non-empty array');
      const edits = raw.map((cell) => {
        const c = cell as Record<string, unknown>;
        return { x: num(c.x, 'x'), y: num(c.y, 'y'), depth: num(c.depth, 'depth') };
      });
      return `Set the depth of ${applyDepthEdits(edits)} cells.`;
    },
  },
  {
    name: 'fill_depth_rect',
    description: 'Set one depth value across an axis-aligned rectangle. x and y are the top-left corner.',
    mutates: true,
    schema: {
      type: 'object',
      properties: { x: INT, y: INT, width: INT, height: INT, depth: INT },
      required: ['x', 'y', 'width', 'height', 'depth'],
      additionalProperties: false,
    },
    run: (input) => {
      const depth = num(input.depth, 'depth');
      const written = applyDepthEdits(rectCells(input).map((cell) => ({ ...cell, depth })));
      return `Set ${written} cells to depth ${depth}.`;
    },
  },
  {
    name: 'auto_depth',
    description:
      'Generate a depth for every painted cell from the artwork itself. "luminosity" gives brighter colours more depth, "color-index" uses the palette slot, "noise" is random. Fast way to give a flat drawing a believable 3D profile.',
    mutates: true,
    schema: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['luminosity', 'color-index', 'noise'] },
        min: INT,
        max: INT,
        invert: { type: 'boolean' },
      },
      required: ['mode'],
      additionalProperties: false,
    },
    run: (input) => {
      const s = useStore.getState();
      const mode = String(input.mode) as DepthGenMode;
      const min = Math.max(1, input.min === undefined ? 1 : num(input.min, 'min'));
      const max = Math.min(32, input.max === undefined ? 8 : num(input.max, 'max'));
      const invert = input.invert === true;
      s.setDepthMap(generateDepth(s.colorMap, mode, s.palette, { min, max, invert }));
      return `Generated depth from ${mode} across ${min} to ${max}${invert ? ', inverted' : ''}.`;
    },
  },

  {
    name: 'set_palette',
    description:
      'Replace the 32-slot palette, either with a built-in preset id from list_presets or with your own list of #rrggbb colours. Shorter lists are padded with black. This does not repaint anything already on the board.',
    mutates: true,
    schema: {
      type: 'object',
      properties: {
        preset: { type: 'string' },
        colors: { type: 'array', items: { type: 'string' } },
      },
      additionalProperties: false,
    },
    run: (input) => {
      const pad = (colors: string[]) => {
        const out = colors.slice(0, 32).map((c) => {
          const color = resolveColor(c);
          if (!color) throw new Error('palette colours cannot be empty');
          return color;
        });
        while (out.length < 32) out.push('#000000');
        return out;
      };

      if (typeof input.preset === 'string') {
        const preset = SAMPLE_PALETTES.find((p) => p.id === input.preset);
        if (!preset) throw new Error(`"${input.preset}" is not a palette id`);
        useStore.getState().setPalette(pad(preset.colors));
        return `Palette set to ${preset.name}.`;
      }
      if (Array.isArray(input.colors) && input.colors.length > 0) {
        useStore.getState().setPalette(pad(input.colors as string[]));
        return `Palette set to ${Math.min(input.colors.length, 32)} custom colours.`;
      }
      useStore.getState().setPalette([...DEFAULT_PALETTE]);
      return 'Palette reset to the default.';
    },
  },
  {
    name: 'load_sample',
    description:
      'Replace the whole board with one of the sample projects from list_presets. This throws away the current drawing, so only call it when the user asks for a sample.',
    mutates: true,
    schema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
      additionalProperties: false,
    },
    run: (input) => {
      const sample = SAMPLES.find((s) => s.id === input.id);
      if (!sample) throw new Error(`"${String(input.id)}" is not a sample id`);
      const m = materializeSample(sample);
      const s = useStore.getState();
      s.resizeGrid(m.gridWidth, m.gridHeight);
      s.setColorMap(m.colorMap);
      s.setDepthMap(m.depthMap);
      s.setShapeMap(m.shapeMap);
      s.setRotationMap(m.rotationMap);
      return `Loaded the ${sample.name} sample at ${m.gridWidth}x${m.gridHeight}.`;
    },
  },
  {
    name: 'set_tool_state',
    description:
      'Change what the person picks up next, or which mode they are looking at: the active colour, shape, rotation and brush depth, the mirror mode, the extrusion direction and multiplier, and the editor mode. Switch to "model" when you want them to see the result in 3D, or "depth" when the work is about thickness.',
    mutates: false,
    schema: {
      type: 'object',
      properties: {
        color: COLOR,
        shape: { type: 'string' },
        rotation: INT,
        depth: INT,
        mirror: { type: 'string', enum: ['none', 'horizontal', 'vertical'] },
        extrusion: { type: 'string', enum: ['single', 'symmetric', 'back'] },
        depthMultiplier: { type: 'number' },
        mode: { type: 'string', enum: ['draw', 'depth', 'model', 'export'] },
      },
      additionalProperties: false,
    },
    run: (input) => {
      const s = useStore.getState();
      const changed: string[] = [];
      if (input.color !== undefined) {
        const color = resolveColor(input.color);
        if (!color) throw new Error('the active colour cannot be empty');
        s.setColor(color);
        changed.push(`colour ${color}`);
      }
      if (input.shape !== undefined) {
        s.setActiveShape(resolveShape(input.shape, s.activeShape));
        changed.push(`shape ${String(input.shape)}`);
      }
      if (input.rotation !== undefined) {
        s.setActiveRotation(resolveRotation(input.rotation, 0));
        changed.push(`rotation ${String(input.rotation)}`);
      }
      if (input.depth !== undefined) {
        s.setActiveDepth(num(input.depth, 'depth'));
        changed.push(`depth ${String(input.depth)}`);
      }
      if (input.mirror !== undefined) {
        s.setMirrorMode(String(input.mirror) as MirrorMode);
        changed.push(`mirror ${String(input.mirror)}`);
      }
      if (input.extrusion !== undefined) {
        s.setExtrusionMode(String(input.extrusion) as ExtrusionMode);
        changed.push(`extrusion ${String(input.extrusion)}`);
      }
      if (input.depthMultiplier !== undefined) {
        s.setDepthMultiplier(Number(input.depthMultiplier));
        changed.push(`multiplier ${String(input.depthMultiplier)}`);
      }
      if (input.mode !== undefined) {
        s.setMode(String(input.mode) as EditorMode);
        changed.push(`mode ${String(input.mode)}`);
      }
      return changed.length ? `Set ${changed.join(', ')}.` : 'Nothing to change.';
    },
  },
];

export const TOOLS_BY_NAME = new Map(AI_TOOLS.map((tool) => [tool.name, tool]));

export function runTool(name: string, input: Record<string, unknown>): { output: string; isError: boolean } {
  const tool = TOOLS_BY_NAME.get(name);
  if (!tool) return { output: `There is no tool called "${name}".`, isError: true };
  try {
    return { output: tool.run(input), isError: false };
  } catch (error) {
    return { output: (error as Error).message, isError: true };
  }
}

/** Used by the agent to decide whether a turn needs an undo snapshot. */
export function toolMutates(name: string): boolean {
  return TOOLS_BY_NAME.get(name)?.mutates ?? false;
}
