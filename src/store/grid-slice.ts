import type { StateCreator } from 'zustand';
import type { ColorMap, DepthMap, ShapeMap, RotationMap } from '../types';
import type { StoreState } from './index';

export interface GridSlice {
  gridWidth: number;
  gridHeight: number;
  colorMap: ColorMap;
  depthMap: DepthMap;
  shapeMap: ShapeMap;
  rotationMap: RotationMap;
  isDirty: boolean;
  projectName: string | null;
  setCell: (index: number, color: string, shape: string, rotation: number) => void;
  setDepth: (index: number, depth: number) => void;
  setColorMap: (map: ColorMap) => void;
  setDepthMap: (map: DepthMap) => void;
  setShapeMap: (map: ShapeMap) => void;
  setRotationMap: (map: RotationMap) => void;
  resizeGrid: (w: number, h: number) => void;
  clearGrid: () => void;
  shiftCanvas: (dx: number, dy: number) => void;
  clearDirty: () => void;
  setProjectName: (name: string | null) => void;
}

export const createGridSlice: StateCreator<
  StoreState,
  [['zustand/immer', never]],
  [],
  GridSlice
> = (set) => ({
  gridWidth: 16,
  gridHeight: 16,
  colorMap: new Array(16 * 16).fill(''),
  depthMap: new Array(16 * 16).fill(1),
  shapeMap: new Array(16 * 16).fill('square'),
  rotationMap: new Array(16 * 16).fill(0),
  isDirty: false,
  projectName: null,

  setCell: (index, color, shape, rotation) =>
    set((state: GridSlice) => {
      state.colorMap[index] = color;
      state.shapeMap[index] = shape;
      state.rotationMap[index] = rotation;
      state.isDirty = true;
    }),

  setDepth: (index, depth) =>
    set((state: GridSlice) => {
      state.depthMap[index] = depth;
      state.isDirty = true;
    }),

  setColorMap: (map) =>
    set((state: GridSlice) => {
      state.colorMap = map;
      state.isDirty = true;
    }),

  setDepthMap: (map) =>
    set((state: GridSlice) => {
      state.depthMap = map;
      state.isDirty = true;
    }),

  setShapeMap: (map) =>
    set((state: GridSlice) => {
      state.shapeMap = map;
      state.isDirty = true;
    }),

  setRotationMap: (map) =>
    set((state: GridSlice) => {
      state.rotationMap = map;
      state.isDirty = true;
    }),

  resizeGrid: (w, h) =>
    set((state: GridSlice) => {
      const newColor: ColorMap = new Array(w * h).fill('');
      const newDepth: DepthMap = new Array(w * h).fill(1);
      const newShape: ShapeMap = new Array(w * h).fill('square');
      const newRotation: RotationMap = new Array(w * h).fill(0);
      const minW = Math.min(w, state.gridWidth);
      const minH = Math.min(h, state.gridHeight);
      for (let y = 0; y < minH; y++) {
        for (let x = 0; x < minW; x++) {
          const oldIdx = y * state.gridWidth + x;
          const newIdx = y * w + x;
          newColor[newIdx] = state.colorMap[oldIdx];
          newDepth[newIdx] = state.depthMap[oldIdx];
          newShape[newIdx] = state.shapeMap[oldIdx];
          newRotation[newIdx] = state.rotationMap[oldIdx];
        }
      }
      state.gridWidth = w;
      state.gridHeight = h;
      state.colorMap = newColor;
      state.depthMap = newDepth;
      state.shapeMap = newShape;
      state.rotationMap = newRotation;
      state.isDirty = true;
    }),

  clearGrid: () =>
    set((state: GridSlice) => {
      const size = state.gridWidth * state.gridHeight;
      state.colorMap = new Array(size).fill('');
      state.depthMap = new Array(size).fill(1);
      state.shapeMap = new Array(size).fill('square');
      state.rotationMap = new Array(size).fill(0);
      state.isDirty = false;
    }),

  shiftCanvas: (dx, dy) =>
    set((state: GridSlice) => {
      const { gridWidth: w, gridHeight: h } = state;
      const size = w * h;
      const newColor: ColorMap = new Array(size).fill('');
      const newDepth: DepthMap = new Array(size).fill(1);
      const newShape: ShapeMap = new Array(size).fill('square');
      const newRotation: RotationMap = new Array(size).fill(0);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const src = y * w + x;
          const dst = ny * w + nx;
          newColor[dst] = state.colorMap[src];
          newDepth[dst] = state.depthMap[src];
          newShape[dst] = state.shapeMap[src];
          newRotation[dst] = state.rotationMap[src];
        }
      }
      state.colorMap = newColor;
      state.depthMap = newDepth;
      state.shapeMap = newShape;
      state.rotationMap = newRotation;
      state.isDirty = true;
    }),

  clearDirty: () =>
    set((state: GridSlice) => {
      state.isDirty = false;
    }),

  setProjectName: (name) =>
    set((state: GridSlice) => {
      state.projectName = name;
    }),
});
