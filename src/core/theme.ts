// Canvas-drawn colours. The 2D canvases need literal values, so they cannot
// read the Tailwind tokens. This file is the single source of truth for every
// colour painted into a canvas; the values mirror the @theme block in
// src/styles/index.css and must be changed in both places together.

export const CANVAS_COLORS = {
  // The artboard reads as a light sheet floating on the dark stage, so
  // transparency is obvious and dark artwork stays legible.
  boardLight: '#f7f7f8',
  boardDark: '#ececee',
  boardShadow: 'rgba(0, 0, 0, 0.55)',

  grid: 'rgba(24, 24, 27, 0.10)',
  guide: 'rgba(24, 24, 27, 0.22)',

  accent: '#ff5c38',
  hoverFill: 'rgba(255, 92, 56, 0.20)',
  hoverStroke: 'rgba(255, 92, 56, 0.95)',
  ghostFill: 'rgba(255, 92, 56, 0.10)',
  ghostStroke: 'rgba(255, 92, 56, 0.50)',
  mirrorAxis: 'rgba(255, 92, 56, 0.55)',
  selectionFill: 'rgba(255, 92, 56, 0.12)',

  depthLabelDark: 'rgba(9, 9, 11, 0.78)',
  depthLabelLight: 'rgba(255, 255, 255, 0.92)',
} as const;

// Depth labels sit inside a grid, so they use the mono stack for even widths.
export const CANVAS_LABEL_FONT =
  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace";

// Shape picker icons render to their own small canvas.
export const SHAPE_ICON_ACTIVE = CANVAS_COLORS.accent;
export const SHAPE_ICON_IDLE = '#a0a0aa';
