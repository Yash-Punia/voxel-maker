import type { StateCreator } from 'zustand';
import type { Tool, ExtrusionMode, SelectRect, MirrorMode } from '../types';
import type { StoreState } from './index';

export const DEFAULT_SHAPE = 'square';

export const DEFAULT_PALETTE: string[] = [
  '#ff0000', '#ff8800', '#ffff00', '#00ff00',
  '#00ffff', '#0000ff', '#8800ff', '#ff00ff',
  '#ffffff', '#cccccc', '#888888', '#444444',
  '#000000', '#8B4513', '#228B22', '#4169E1',
  '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff',
  '#f72585', '#7209b7', '#3a0ca3', '#4cc9f0',
  '#e9c46a', '#f4a261', '#e76f51', '#264653',
  '#2a9d8f', '#57cc99', '#80ed99', '#c7f9cc',
];

export interface ToolSlice {
  activeTool: Tool;
  activeColor: string;
  activeDepth: number;
  activeShape: string;
  activeRotation: number;
  extrusionMode: ExtrusionMode;
  showGrid: boolean;
  zoom: number;
  panOffset: { x: number; y: number };
  palette: string[];
  mirrorMode: MirrorMode;
  depthMultiplier: number;
  selectRect: SelectRect | null;
  cursorPos: { x: number; y: number } | null;
  activePaletteIndex: number | null;
  shortcutScope: 'paint' | 'depth' | null;
  setTool: (t: Tool) => void;
  setMirrorMode: (m: MirrorMode) => void;
  setDepthMultiplier: (v: number) => void;
  setColor: (c: string) => void;
  setActivePaletteIndex: (i: number | null) => void;
  pickPaletteSlot: (i: number) => void;
  setActiveDepth: (d: number) => void;
  setActiveShape: (id: string) => void;
  setActiveRotation: (r: number) => void;
  rotateActiveShape: () => void;
  setExtrusionMode: (m: ExtrusionMode) => void;
  setShowGrid: (v: boolean) => void;
  setZoom: (z: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  setPaletteColor: (index: number, color: string) => void;
  setPalette: (colors: string[]) => void;
  setSelectRect: (rect: SelectRect | null) => void;
  setCursorPos: (pos: { x: number; y: number } | null) => void;
  setShortcutScope: (scope: 'paint' | 'depth' | null) => void;
}

export const createToolSlice: StateCreator<
  StoreState,
  [['zustand/immer', never]],
  [],
  ToolSlice
> = (set) => ({
  activeTool: 'pencil',
  activeColor: '#ff0000',
  activeDepth: 1,
  activeShape: DEFAULT_SHAPE,
  activeRotation: 0,
  extrusionMode: 'symmetric',
  showGrid: true,
  zoom: 16,
  panOffset: { x: 0, y: 0 },
  palette: DEFAULT_PALETTE,
  mirrorMode: 'none',
  depthMultiplier: 1.0,
  selectRect: null,
  cursorPos: null,
  activePaletteIndex: 0,
  shortcutScope: 'paint',

  setTool: (t) => set((state: ToolSlice) => { state.activeTool = t; }),
  setMirrorMode: (m) => set((state: ToolSlice) => { state.mirrorMode = m; }),
  setDepthMultiplier: (v) => set((state: ToolSlice) => { state.depthMultiplier = Math.max(0.25, Math.min(4.0, v)); }),
  setColor: (c) => set((state: ToolSlice) => {
    state.activeColor = c;
    // Color was set from outside the palette (e.g. eyedropper, hex input).
    // Clear the active palette slot so no swatch shows as selected.
    state.activePaletteIndex = null;
  }),
  setActivePaletteIndex: (i) => set((state: ToolSlice) => { state.activePaletteIndex = i; }),
  pickPaletteSlot: (i) => set((state: ToolSlice) => {
    const color = state.palette[i];
    if (color) state.activeColor = color;
    state.activePaletteIndex = i;
  }),
  setActiveDepth: (d) => set((state: ToolSlice) => { state.activeDepth = Math.max(0, Math.min(32, d)); }),
  setActiveShape: (id) => set((state: ToolSlice) => { state.activeShape = id; }),
  setActiveRotation: (r) => set((state: ToolSlice) => { state.activeRotation = r; }),
  rotateActiveShape: () => set((state: ToolSlice) => { state.activeRotation = (state.activeRotation + 1) % 4; }),
  setExtrusionMode: (m) => set((state: ToolSlice) => { state.extrusionMode = m; }),
  setShowGrid: (v) => set((state: ToolSlice) => { state.showGrid = v; }),
  setZoom: (z) => set((state: ToolSlice) => { state.zoom = Math.max(4, Math.min(32, z)); }),
  setPanOffset: (offset) => set((state: ToolSlice) => { state.panOffset = offset; }),
  setPaletteColor: (index, color) => set((state: ToolSlice) => { state.palette[index] = color; }),
  setPalette: (colors) => set((state: ToolSlice) => { state.palette = colors; }),
  setSelectRect: (rect) => set((state: ToolSlice) => { state.selectRect = rect; }),
  setCursorPos: (pos) => set((state: ToolSlice) => { state.cursorPos = pos; }),
  setShortcutScope: (scope) => set((state: ToolSlice) => { state.shortcutScope = scope; }),
});
