import type { StateCreator } from 'zustand';
import type { Placement, Scene } from '../types';
import type { StoreState } from './index';

// A scene arranges assets. It holds references and never artwork, so editing an
// asset updates every scene that uses it, and a scene costs almost nothing to
// store however many props it places.

export interface SceneSlice {
  scenes: Scene[];
  activeSceneId: string | null;
  createScene: (name?: string) => void;
  renameScene: (id: string, name: string) => void;
  deleteScene: (id: string) => void;
  switchScene: (id: string) => void;
  resizeScene: (width: number, depth: number) => void;
  placeAsset: (assetId: string, x: number, z: number) => void;
  removePlacement: (id: string) => void;
  updatePlacement: (id: string, patch: Partial<Omit<Placement, 'id'>>) => void;
  clearScene: () => void;
  loadScenes: (scenes: Scene[], activeId: string | null) => void;
}

let counter = 0;
const newId = (prefix: string): string => {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter}`;
};

const DEFAULT_SIZE = 16;

function uniqueName(scenes: Scene[], base: string): string {
  if (!scenes.some((s) => s.name === base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base} ${n}`;
    if (!scenes.some((s) => s.name === candidate)) return candidate;
  }
}

export const createSceneSlice: StateCreator<
  StoreState,
  [['zustand/immer', never]],
  [],
  SceneSlice
> = (set) => ({
  // No scene until one is asked for. Most projects are a set of props and never
  // arrange anything, and an empty scene tab would be clutter for them.
  scenes: [],
  activeSceneId: null,

  createScene: (name) =>
    set((state) => {
      const scene: Scene = {
        id: newId('s'),
        name: uniqueName(state.scenes, name ?? 'scene'),
        width: DEFAULT_SIZE,
        depth: DEFAULT_SIZE,
        placements: [],
      };
      state.scenes.push(scene);
      state.activeSceneId = scene.id;
      state.isDirty = true;
    }),

  renameScene: (id, name) =>
    set((state) => {
      const scene = state.scenes.find((s) => s.id === id);
      const trimmed = name.trim();
      if (!scene || !trimmed) return;
      scene.name = uniqueName(state.scenes.filter((s) => s.id !== id), trimmed);
      state.isDirty = true;
    }),

  deleteScene: (id) =>
    set((state) => {
      const index = state.scenes.findIndex((s) => s.id === id);
      if (index === -1) return;
      state.scenes.splice(index, 1);
      if (state.activeSceneId === id) {
        state.activeSceneId = state.scenes[Math.min(index, state.scenes.length - 1)]?.id ?? null;
      }
      state.isDirty = true;
    }),

  switchScene: (id) =>
    set((state) => {
      if (state.scenes.some((s) => s.id === id)) state.activeSceneId = id;
    }),

  resizeScene: (width, depth) =>
    set((state) => {
      const scene = state.scenes.find((s) => s.id === state.activeSceneId);
      if (!scene) return;
      scene.width = Math.max(1, Math.min(64, Math.round(width)));
      scene.depth = Math.max(1, Math.min(64, Math.round(depth)));
      // Anything now outside the ground plane goes, rather than sitting where
      // it cannot be seen or clicked.
      scene.placements = scene.placements.filter(
        (p) => p.x >= 0 && p.x < scene.width && p.z >= 0 && p.z < scene.depth,
      );
      state.isDirty = true;
    }),

  placeAsset: (assetId, x, z) =>
    set((state) => {
      const scene = state.scenes.find((s) => s.id === state.activeSceneId);
      if (!scene) return;
      if (!state.assets.some((a) => a.id === assetId)) return;
      if (x < 0 || x >= scene.width || z < 0 || z >= scene.depth) return;
      // One placement per ground cell, so clicking a filled cell replaces what
      // is there instead of stacking two props inside each other.
      scene.placements = scene.placements.filter((p) => !(p.x === x && p.z === z));
      scene.placements.push({ id: newId('p'), assetId, x, z, y: 0, rotation: 0, frameIndex: 0 });
      state.isDirty = true;
    }),

  removePlacement: (id) =>
    set((state) => {
      const scene = state.scenes.find((s) => s.id === state.activeSceneId);
      if (!scene) return;
      scene.placements = scene.placements.filter((p) => p.id !== id);
      state.isDirty = true;
    }),

  updatePlacement: (id, patch) =>
    set((state) => {
      const scene = state.scenes.find((s) => s.id === state.activeSceneId);
      const placement = scene?.placements.find((p) => p.id === id);
      if (!scene || !placement) return;
      if (patch.rotation !== undefined) placement.rotation = ((patch.rotation % 4) + 4) % 4;
      if (patch.y !== undefined) placement.y = Math.max(0, Math.round(patch.y));
      if (patch.frameIndex !== undefined) placement.frameIndex = Math.max(0, Math.round(patch.frameIndex));
      state.isDirty = true;
    }),

  clearScene: () =>
    set((state) => {
      const scene = state.scenes.find((s) => s.id === state.activeSceneId);
      if (!scene) return;
      scene.placements = [];
      state.isDirty = true;
    }),

  loadScenes: (scenes, activeId) =>
    set((state) => {
      state.scenes = scenes;
      state.activeSceneId = scenes.some((s) => s.id === activeId) ? activeId : (scenes[0]?.id ?? null);
    }),
});
