import type { ColorMap, DepthMap, ShapeMap, RotationMap } from '../types';

export interface GridSlice {
  gridWidth: number;
  gridHeight: number;
  colorMap: ColorMap;
  depthMap: DepthMap;
  shapeMap: ShapeMap;
  rotationMap: RotationMap;
  setCell: (index: number, color: string, shape: string, rotation: number) => void;
  setDepth: (index: number, depth: number) => void;
  setColorMap: (map: ColorMap) => void;
  setDepthMap: (map: DepthMap) => void;
  setShapeMap: (map: ShapeMap) => void;
  setRotationMap: (map: RotationMap) => void;
  resizeGrid: (w: number, h: number) => void;
  clearGrid: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createGridSlice = (set: any): GridSlice => ({
  gridWidth: 16,
  gridHeight: 16,
  colorMap: new Array(16 * 16).fill(''),
  depthMap: new Array(16 * 16).fill(1),
  shapeMap: new Array(16 * 16).fill('square'),
  rotationMap: new Array(16 * 16).fill(0),

  setCell: (index, color, shape, rotation) =>
    set((state: GridSlice) => {
      state.colorMap[index] = color;
      state.shapeMap[index] = shape;
      state.rotationMap[index] = rotation;
    }),

  setDepth: (index, depth) =>
    set((state: GridSlice) => {
      state.depthMap[index] = depth;
    }),

  setColorMap: (map) =>
    set((state: GridSlice) => {
      state.colorMap = map;
    }),

  setDepthMap: (map) =>
    set((state: GridSlice) => {
      state.depthMap = map;
    }),

  setShapeMap: (map) =>
    set((state: GridSlice) => {
      state.shapeMap = map;
    }),

  setRotationMap: (map) =>
    set((state: GridSlice) => {
      state.rotationMap = map;
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
    }),

  clearGrid: () =>
    set((state: GridSlice) => {
      const size = state.gridWidth * state.gridHeight;
      state.colorMap = new Array(size).fill('');
      state.depthMap = new Array(size).fill(1);
      state.shapeMap = new Array(size).fill('square');
      state.rotationMap = new Array(size).fill(0);
    }),
});
