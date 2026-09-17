import type { StateCreator } from 'zustand';
import type { Snapshot } from '../types';
import type { StoreState } from './index';

const MAX_HISTORY = 50;

/** Puts a snapshot back, returning to its asset first when it belongs to
 *  another one. Without this a stack that spans assets paints the wrong board,
 *  which is why switching used to have to throw the stack away. */
function restore(s: StoreState, snap: Snapshot): void {
  // An agent turn pinned the set, so anything it created goes back with it.
  if (snap.assetIds && snap.assetIds.length !== s.assets.length) {
    for (const asset of s.assets) {
      if (!snap.assetIds.includes(asset.id)) s.deleteAsset(asset.id);
    }
    // Those boards are gone, so redoing forward to a state that referenced them
    // would restore the painting without the assets. Better to end the line.
    s.clearRedo();
  }
  if (snap.assetId && snap.assetId !== s.activeAssetId) {
    if (!s.assets.some((a) => a.id === snap.assetId)) return;
    s.switchAsset(snap.assetId);
  }
  if (snap.frameIndex !== undefined && snap.frameIndex !== s.activeFrameIndex) {
    s.setActiveFrame(snap.frameIndex);
  }
  s.setColorMap([...snap.colorMap]);
  s.setDepthMap([...snap.depthMap]);
  s.setShapeMap([...snap.shapeMap]);
  s.setRotationMap([...snap.rotationMap]);
}


export interface HistorySlice {
  undoStack: Snapshot[];
  redoStack: Snapshot[];
  pushSnapshot: (snap: Snapshot) => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  clearRedo: () => void;
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
    set((state) => {
      state.undoStack.push({ assetId: state.activeAssetId, frameIndex: state.activeFrameIndex, ...snap });
      if (state.undoStack.length > MAX_HISTORY) {
        state.undoStack.shift();
      }
      state.redoStack = [];
    }),

  undo: () => {
    const s: StoreState = get();
    if (s.undoStack.length === 0) return;
    const prev = s.undoStack[s.undoStack.length - 1];
    const current: Snapshot = {
      assetId: s.activeAssetId,
      frameIndex: s.activeFrameIndex,
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
    restore(s, prev);
  },

  redo: () => {
    const s: StoreState = get();
    if (s.redoStack.length === 0) return;
    const next = s.redoStack[0];
    const current: Snapshot = {
      assetId: s.activeAssetId,
      frameIndex: s.activeFrameIndex,
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
    restore(s, next);
  },

  clearHistory: () =>
    set((state: HistorySlice) => {
      state.undoStack = [];
      state.redoStack = [];
    }),

  clearRedo: () =>
    set((state: HistorySlice) => {
      state.redoStack = [];
    }),
});
