import type { Asset, ExtrusionMode, MeshData, Scene } from '../types';
import { computeShapeMesh } from './depth-ops';

// Turns a scene into one mesh. This is the only place board space meets scene
// space, so the mapping between them lives here and nowhere else.
//
// A board mesh already comes out X across, Y up and Z deep, centred on the
// origin. That is exactly how an asset should stand in a scene, so placing one
// is a quarter turn about Y and a translation, with no axis swapping at all.

/** Quarter turns about scene up. Written as exact integers rather than through
 *  Math.cos, so a placement never drifts by a rounding error. */
function rotateY(x: number, z: number, rotation: number): [number, number] {
  switch (((rotation % 4) + 4) % 4) {
    case 1: return [z, -x];
    case 2: return [-x, -z];
    case 3: return [-z, x];
    default: return [x, z];
  }
}

export interface AssembleOptions {
  mode: ExtrusionMode;
  depthMultiplier: number;
}

// Scenes are always meshed with the optimiser on. It is not a preference.
// Measured on 100 assets of 32x32: 1,228,800 triangles and 84 MB unoptimised,
// against 1,200 triangles and 0.1 MB with it, and 261 ms against 4 ms. An
// unoptimised scene is not slow, it is unusable.
const OPTIMIZE = true;

export function assembleScene(
  scene: Scene,
  assets: Asset[],
  { mode, depthMultiplier }: AssembleOptions,
): MeshData {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const byId = new Map(assets.map((a) => [a.id, a]));
  // One asset placed twenty times is meshed once, not twenty times.
  const cache = new Map<string, MeshData>();

  for (const placement of scene.placements) {
    const asset = byId.get(placement.assetId);
    if (!asset) continue;
    const frame = asset.frames[placement.frameIndex] ?? asset.frames[0];
    if (!frame) continue;

    const key = `${placement.assetId}:${placement.frameIndex}`;
    let mesh = cache.get(key);
    if (!mesh) {
      mesh = computeShapeMesh(
        frame.colorMap, frame.depthMap, frame.shapeMap, frame.rotationMap,
        asset.gridWidth, asset.gridHeight, mode, depthMultiplier, OPTIMIZE,
      );
      cache.set(key, mesh);
    }
    if (mesh.positions.length === 0) continue;

    // The board mesh is centred, so its feet sit at minus half its height.
    // Lifting by half puts them on the ground plane.
    const lift = asset.gridHeight / 2 + placement.y;
    const base = positions.length / 3;

    for (let i = 0; i < mesh.positions.length; i += 3) {
      const [rx, rz] = rotateY(mesh.positions[i], mesh.positions[i + 2], placement.rotation);
      positions.push(rx + placement.x, mesh.positions[i + 1] + lift, rz + placement.z);

      // Normals turn with the geometry but are never translated.
      const [nx, nz] = rotateY(mesh.normals[i], mesh.normals[i + 2], placement.rotation);
      normals.push(nx, mesh.normals[i + 1], nz);

      colors.push(mesh.colors[i], mesh.colors[i + 1], mesh.colors[i + 2]);
    }

    for (const index of mesh.indices) indices.push(base + index);
  }

  return { positions, normals, colors, indices };
}
