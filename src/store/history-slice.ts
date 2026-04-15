import type { StateCreator } from 'zustand';
import type { Snapshot } from '../types';
import type { GridSlice } from './grid-slice';
import type { StoreState } from './index';

const MAX_HISTORY = 50;

export interface HistorySlice {
  undoStack: Snapshot[];
  redoStack: Snapshot[];
  pushSnapshot: (snap: Snapshot) => void;
  undo: () => void;
  redo: () => void;
}

export const createHistorySlice: StateCreator<
  StoreState,
  [['zustand/immer', never]],
  [],
  HistorySlice
> = (set, get) => ({
  undoStack: [],
  redoStack: [],

  pushSnapshot: (snap) =>
    set((state: HistorySlice) => {
      state.undoStack.push(snap);
      if (state.undoStack.length > MAX_HISTORY) {
        state.undoStack.shift();
      }
      state.redoStack = [];
    }),

  undo: () => {
    const s: GridSlice & HistorySlice = get();
    if (s.undoStack.length === 0) return;
    const prev = s.undoStack[s.undoStack.length - 1];
    const current: Snapshot = {
      colorMap: [...s.colorMap],
      depthMap: [...s.depthMap],
      shapeMap: [...s.shapeMap],
      rotationMap: [...s.rotationMap],
    };
    set((state: HistorySlice) => {
      state.undoStack.pop();
      state.redoStack = [current, ...state.redoStack];
      if (state.redoStack.length > MAX_HISTORY) state.redoStack.length = MAX_HISTORY;
    });
    s.setColorMap([...prev.colorMap]);
    s.setDepthMap([...prev.depthMap]);
    s.setShapeMap([...prev.shapeMap]);
    s.setRotationMap([...prev.rotationMap]);
  },

  redo: () => {
    const s: GridSlice & HistorySlice = get();
    if (s.redoStack.length === 0) return;
    const next = s.redoStack[0];
    const current: Snapshot = {
      colorMap: [...s.colorMap],
      depthMap: [...s.depthMap],
      shapeMap: [...s.shapeMap],
      rotationMap: [...s.rotationMap],
    };
    set((state: HistorySlice) => {
      state.redoStack = state.redoStack.slice(1);
      state.undoStack = [...state.undoStack, current];
      if (state.undoStack.length > MAX_HISTORY) state.undoStack.shift();
    });
    s.setColorMap([...next.colorMap]);
    s.setDepthMap([...next.depthMap]);
    s.setShapeMap([...next.shapeMap]);
    s.setRotationMap([...next.rotationMap]);
  },
});
