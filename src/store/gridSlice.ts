import type { ColorMap, DepthMap } from '../types';

export interface GridSlice {
  gridWidth: number;
  gridHeight: number;
  colorMap: ColorMap;
  depthMap: DepthMap;
  setCell: (index: number, color: string) => void;
  setDepth: (index: number, depth: number) => void;
  setColorMap: (map: ColorMap) => void;
  setDepthMap: (map: DepthMap) => void;
  resizeGrid: (w: number, h: number) => void;
  clearGrid: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createGridSlice = (set: any): GridSlice => ({
  gridWidth: 16,
  gridHeight: 16,
  colorMap: new Array(16 * 16).fill(''),
  depthMap: new Array(16 * 16).fill(1),

  setCell: (index, color) =>
    set((state: GridSlice) => {
      state.colorMap[index] = color;
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

  resizeGrid: (w, h) =>
    set((state: GridSlice) => {
      const newColor: ColorMap = new Array(w * h).fill('');
      const newDepth: DepthMap = new Array(w * h).fill(1);
      const minW = Math.min(w, state.gridWidth);
      const minH = Math.min(h, state.gridHeight);
      for (let y = 0; y < minH; y++) {
        for (let x = 0; x < minW; x++) {
          newColor[y * w + x] = state.colorMap[y * state.gridWidth + x];
          newDepth[y * w + x] = state.depthMap[y * state.gridWidth + x];
        }
      }
      state.gridWidth = w;
      state.gridHeight = h;
      state.colorMap = newColor;
      state.depthMap = newDepth;
    }),

  clearGrid: () =>
    set((state: GridSlice) => {
      state.colorMap = new Array(state.gridWidth * state.gridHeight).fill('');
      state.depthMap = new Array(state.gridWidth * state.gridHeight).fill(1);
    }),
});
