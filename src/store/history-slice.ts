import type { StateCreator } from 'zustand';
import type { Scene, Snapshot } from '../types';
import type { StoreState } from './index';

const MAX_HISTORY = 50;

/** A scene holds flat references, so it clones field by field. structuredClone
 *  is no use here: half these calls hold an immer draft. */
export function cloneScenes(scenes: Scene[]): Scene[] {
  return scenes.map((scene) => ({ ...scene, placements: scene.placements.map((p) => ({ ...p })) }));
}

/** Pushes a snapshot onto an immer draft, for the slices that have to record one
 *  from inside their own set() rather than through the action. */
export function pushUndo(state: StoreState, snap: Snapshot): void {
  state.undoStack.push(snap);
  if (state.undoStack.length > MAX_HISTORY) state.undoStack.shift();
  state.redoStack = [];
}

/** The whole document as it stands, board and arrangements together. */
export function captureDocument(state: StoreState): Snapshot {
  return {
    assetId: state.activeAssetId,
    frameIndex: state.activeFrameIndex,
    colorMap: [...state.colorMap],
    depthMap: [...state.depthMap],
    shapeMap: [...state.shapeMap],
    rotationMap: [...state.rotationMap],
    scenes: cloneScenes(state.scenes),
    activeSceneId: state.activeSceneId,
  };
}

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
  if (snap.scenes) s.loadScenes(cloneScenes(snap.scenes), snap.activeSceneId ?? null);
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
    const current: Snapshot = captureDocument(s);
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
    const current: Snapshot = captureDocument(s);
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
