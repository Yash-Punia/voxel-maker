import type { StateCreator } from 'zustand';
import type { Asset, Frame } from '../types';
import type { StoreState } from './index';

// A project holds many assets under one palette and one depth scale. That shared
// palette is the product: it is what makes a set look like it belongs together,
// and it is why a per-asset palette is refused.
//
// The asset being edited stays flat in grid-slice, as colorMap, depthMap,
// shapeMap and rotationMap. This slice holds every other asset, and switching
// writes the flat maps back before loading the next one. Keeping the active
// asset flat means no canvas, tool, hook or assistant tool had to change.

export interface AssetSlice {
  assets: Asset[];
  activeAssetId: string;
  activeFrameIndex: number;
  createAsset: (name?: string) => void;
  renameAsset: (id: string, name: string) => void;
  duplicateAsset: (id: string) => void;
  deleteAsset: (id: string) => void;
  moveAsset: (id: string, toIndex: number) => void;
  switchAsset: (id: string) => void;
  /** Copies the live board back into its asset. Call before saving or exporting. */
  commitActiveAsset: () => void;
  addFrame: () => void;
  duplicateFrame: () => void;
  deleteFrame: (index: number) => void;
  moveFrame: (from: number, to: number) => void;
  setActiveFrame: (index: number) => void;
  loadAssets: (assets: Asset[], activeId: string) => void;
  resetAssets: (w: number, h: number) => void;
}

let counter = 0;
function newId(): string {
  counter += 1;
  return `a${Date.now().toString(36)}${counter}`;
}

function blankFrame(w: number, h: number): Frame {
  const size = w * h;
  return {
    colorMap: new Array(size).fill(''),
    depthMap: new Array(size).fill(1),
    shapeMap: new Array(size).fill('square'),
    rotationMap: new Array(size).fill(0),
  };
}

export function makeAsset(name: string, w: number, h: number): Asset {
  return { id: newId(), name, gridWidth: w, gridHeight: h, frames: [blankFrame(w, h)] };
}

/** A unique name, so duplicating "barrel" twice does not give two "barrel copy". */
function uniqueName(assets: Asset[], base: string): string {
  if (!assets.some((a) => a.name === base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base} ${n}`;
    if (!assets.some((a) => a.name === candidate)) return candidate;
  }
}

const FIRST = makeAsset('asset 1', 16, 16);

export const createAssetSlice: StateCreator<
  StoreState,
  [['zustand/immer', never]],
  [],
  AssetSlice
> = (set) => ({
  assets: [FIRST],
  activeAssetId: FIRST.id,
  activeFrameIndex: 0,

  createAsset: (name) =>
    set((state) => {
      commit(state);
      const asset = makeAsset(uniqueName(state.assets, name ?? 'asset'), state.gridWidth, state.gridHeight);
      state.assets.push(asset);
      apply(state, asset);
      state.isDirty = true;
    }),

  renameAsset: (id, name) =>
    set((state) => {
      const asset = state.assets.find((a) => a.id === id);
      if (!asset) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      asset.name = uniqueName(state.assets.filter((a) => a.id !== id), trimmed);
      state.isDirty = true;
    }),

  duplicateAsset: (id) =>
    set((state) => {
      commit(state);
      const index = state.assets.findIndex((a) => a.id === id);
      if (index === -1) return;
      const source = state.assets[index];
      const copy: Asset = {
        ...structuredClone(source),
        id: newId(),
        name: uniqueName(state.assets, `${source.name} copy`),
      };
      state.assets.splice(index + 1, 0, copy);
      apply(state, copy);
      state.isDirty = true;
    }),

  deleteAsset: (id) =>
    set((state) => {
      // A project always holds at least one asset, so the stage never renders nothing.
      if (state.assets.length <= 1) return;
      const index = state.assets.findIndex((a) => a.id === id);
      if (index === -1) return;
      state.assets.splice(index, 1);
      state.undoStack = state.undoStack.filter((snap) => snap.assetId !== id);
      state.redoStack = state.redoStack.filter((snap) => snap.assetId !== id);
      if (state.activeAssetId === id) {
        apply(state, state.assets[Math.min(index, state.assets.length - 1)]);
      }
      state.isDirty = true;
    }),

  moveAsset: (id, toIndex) =>
    set((state) => {
      const from = state.assets.findIndex((a) => a.id === id);
      const to = Math.max(0, Math.min(state.assets.length - 1, toIndex));
      if (from === -1 || from === to) return;
      const [asset] = state.assets.splice(from, 1);
      state.assets.splice(to, 0, asset);
      state.isDirty = true;
    }),

  switchAsset: (id) =>
    set((state) => {
      if (id === state.activeAssetId) return;
      const target = state.assets.find((a) => a.id === id);
      if (!target) return;
      commit(state);
      apply(state, target);
    }),

  addFrame: () =>
    set((state) => {
      const asset = activeAsset(state);
      if (!asset) return;
      commit(state);
      asset.frames.splice(state.activeFrameIndex + 1, 0, blankFrame(asset.gridWidth, asset.gridHeight));
      applyFrame(state, asset, state.activeFrameIndex + 1);
      state.isDirty = true;
    }),

  duplicateFrame: () =>
    set((state) => {
      const asset = activeAsset(state);
      if (!asset) return;
      commit(state);
      const copy = structuredClone(asset.frames[state.activeFrameIndex]);
      asset.frames.splice(state.activeFrameIndex + 1, 0, copy);
      applyFrame(state, asset, state.activeFrameIndex + 1);
      state.isDirty = true;
    }),

  deleteFrame: (index) =>
    set((state) => {
      const asset = activeAsset(state);
      // An asset always keeps at least one frame, the way a project keeps at
      // least one asset, so the stage never renders nothing.
      if (!asset || asset.frames.length <= 1) return;
      if (index < 0 || index >= asset.frames.length) return;
      // Commit first, or deleting a frame that is not the open one throws away
      // whatever is on the board right now.
      commit(state);
      asset.frames.splice(index, 1);
      applyFrame(state, asset, Math.min(index, asset.frames.length - 1));
      state.isDirty = true;
    }),

  moveFrame: (from, to) =>
    set((state) => {
      const asset = activeAsset(state);
      if (!asset) return;
      const target = Math.max(0, Math.min(asset.frames.length - 1, to));
      if (from === target || from < 0 || from >= asset.frames.length) return;
      commit(state);
      const [frame] = asset.frames.splice(from, 1);
      asset.frames.splice(target, 0, frame);
      applyFrame(state, asset, target);
      state.isDirty = true;
    }),

  setActiveFrame: (index) =>
    set((state) => {
      const asset = activeAsset(state);
      if (!asset || index === state.activeFrameIndex) return;
      if (index < 0 || index >= asset.frames.length) return;
      commit(state);
      applyFrame(state, asset, index);
    }),

  commitActiveAsset: () => set((state) => { commit(state); }),

  loadAssets: (assets, activeId) =>
    set((state) => {
      state.assets = assets;
      const target = assets.find((a) => a.id === activeId) ?? assets[0];
      apply(state, target);
      clearHistory(state);
    }),

  /** Back to a single empty asset, for a new project. */
  resetAssets: (w, h) =>
    set((state) => {
      const asset = makeAsset('asset 1', w, h);
      state.assets = [asset];
      apply(state, asset);
      clearHistory(state);
    }),
});

/* The two halves of a switch. `commit` copies the live board into its asset,
 * `apply` loads an asset onto the live board. Both are plain functions over the
 * draft so every action above stays one `set`. */

function activeAsset(state: StoreState): Asset | undefined {
  return state.assets.find((a) => a.id === state.activeAssetId);
}

function commit(state: StoreState): void {
  const asset = activeAsset(state);
  if (!asset) return;
  asset.gridWidth = state.gridWidth;
  asset.gridHeight = state.gridHeight;
  asset.frames[state.activeFrameIndex] = {
    colorMap: [...state.colorMap],
    depthMap: [...state.depthMap],
    shapeMap: [...state.shapeMap],
    rotationMap: [...state.rotationMap],
  };
}

function clearHistory(state: StoreState): void {
  state.undoStack = [];
  state.redoStack = [];
}

function apply(state: StoreState, asset: Asset): void {
  applyFrame(state, asset, 0);
}

/** Loads one frame of one asset onto the live board. Every switch, whether of
 *  asset or of frame, ends here. */
function applyFrame(state: StoreState, asset: Asset, index: number): void {
  const frame = asset.frames[index];
  if (!frame) return;
  state.activeAssetId = asset.id;
  state.activeFrameIndex = index;
  state.gridWidth = asset.gridWidth;
  state.gridHeight = asset.gridHeight;
  state.colorMap = [...frame.colorMap];
  state.depthMap = [...frame.depthMap];
  state.shapeMap = [...frame.shapeMap];
  state.rotationMap = [...frame.rotationMap];
}
