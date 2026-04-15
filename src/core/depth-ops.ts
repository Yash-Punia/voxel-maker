import type { ColorMap, DepthMap, ShapeMap, RotationMap, ExtrusionMode, MeshData, Voxel } from '../types';
import { cellCoords } from './grid-utils';
import { getShape } from './shapes';
import { computeGreedyMesh } from './greedy-mesh';

// ─── helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

function zRange(depth: number, mode: ExtrusionMode): [number, number] {
  if (mode === 'symmetric') {
    const zStart = -Math.floor(depth / 2);
    const zEnd = Math.ceil(depth / 2);
    const zOffset = depth % 2 === 1 ? -0.5 : 0;
    return [zStart + zOffset, zEnd + zOffset];
  }
  if (mode === 'back') return [-depth, 0];
  return [0, depth]; // 'single' / default
}

// ─── computeShapeMesh ─────────────────────────────────────────────────────────
// Canonical geometry pipeline used by 3D preview and all exporters.
// Extrudes each cell's shape profile along Z by its depth.
// Returns raw buffer arrays ready for BufferGeometry or format serialization.

export function computeShapeMesh(
  colorMap: ColorMap,
  depthMap: DepthMap,
  shapeMap: ShapeMap,
  rotationMap: RotationMap,
  w: number,
  h: number,
  mode: ExtrusionMode,
  depthMultiplier = 1.0,
  optimize = false,
): MeshData {
  // Optimize path: route square-shape cells through greedy voxel meshing,
  // then append non-square cells via the standard profile-based path.
  const squaresMesh = optimize
    ? computeGreedyMesh(colorMap, depthMap, shapeMap, w, h, mode, depthMultiplier)
    : { positions: [] as number[], normals: [] as number[], colors: [] as number[], indices: [] as number[] };

  const positions: number[] = [...squaresMesh.positions];
  const normals: number[] = [...squaresMesh.normals];
  const colors: number[] = [...squaresMesh.colors];
  const indices: number[] = [...squaresMesh.indices];
  let vIdx = positions.length / 3;

  // Center the grid around origin (same convention as the old cube mesh)
  const ox = -w / 2;
  const oy = -h / 2;

  for (let i = 0; i < colorMap.length; i++) {
    const color = colorMap[i];
    if (!color) continue;

    const depth = Math.max(1, Math.round((depthMap[i] ?? 1) * depthMultiplier));
    if ((depthMap[i] ?? 1) === 0) continue;

    const shapeId = shapeMap[i] ?? 'square';
    const rotation = rotationMap[i] ?? 0;

    // Squares are handled by the greedy mesher when optimize=true
    if (optimize && shapeId === 'square') continue;

    const shapeDef = getShape(shapeId);

    const { x, y } = cellCoords(i, w);
    const ty = h - 1 - y; // flip Y: canvas top → world bottom

    const [zFrom, zTo] = zRange(depth, mode);
    const [r, g, b] = hexToRgb(color);

    const { vertices, indices: triIndices } = shapeDef.getProfile(rotation);

    // Translate profile vertices from [0,1]² local space to world XY
    const wx = x + ox;
    const wy = ty + oy;
    const wv = vertices.map(([px, py]) => [wx + px, wy + py] as [number, number]);
    const nv = wv.length;

    // ── Front face (z = zTo, normal +Z) ──
    const frontBase = vIdx;
    for (const [vx, vy] of wv) {
      positions.push(vx, vy, zTo);
      normals.push(0, 0, 1);
      colors.push(r, g, b);
    }
    vIdx += nv;
    for (const [a, b2, c] of triIndices) {
      indices.push(frontBase + a, frontBase + b2, frontBase + c);
    }

    // ── Back face (z = zFrom, normal -Z, reversed winding) ──
    const backBase = vIdx;
    for (const [vx, vy] of wv) {
      positions.push(vx, vy, zFrom);
      normals.push(0, 0, -1);
      colors.push(r, g, b);
    }
    vIdx += nv;
    for (const [a, b2, c] of triIndices) {
      indices.push(backBase + a, backBase + c, backBase + b2); // reversed
    }

    // ── Side walls: one quad per polygon edge ──
    for (let e = 0; e < nv; e++) {
      const [x0, y0] = wv[e];
      const [x1, y1] = wv[(e + 1) % nv];

      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1e-6) continue; // skip degenerate edges

      // Outward normal for CCW polygon: (dy, -dx, 0) normalised
      const nx = dy / len;
      const ny = -dx / len;

      const base = vIdx;
      // Quad corners: bottom-left, bottom-right, top-right, top-left
      positions.push(
        x0, y0, zFrom,
        x1, y1, zFrom,
        x1, y1, zTo,
        x0, y0, zTo,
      );
      normals.push(
        nx, ny, 0,
        nx, ny, 0,
        nx, ny, 0,
        nx, ny, 0,
      );
      colors.push(
        r, g, b,
        r, g, b,
        r, g, b,
        r, g, b,
      );
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      vIdx += 4;
    }
  }

  return { positions, normals, colors, indices };
}

// ─── computeVoxels ────────────────────────────────────────────────────────────
// Kept for VOX export — voxel formats require discrete cube positions.

export function computeVoxels(
  colorMap: ColorMap,
  depthMap: DepthMap,
  w: number,
  h: number,
  mode: ExtrusionMode,
  shapeMap?: ShapeMap,
  rotationMap?: RotationMap,
  depthMultiplier = 1.0
): Voxel[] {
  const voxels: Voxel[] = [];

  for (let i = 0; i < colorMap.length; i++) {
    const color = colorMap[i];
    if (!color) continue;

    const rawDepth = depthMap[i] ?? 1;
    if (rawDepth === 0) continue;
    const depth = Math.max(1, Math.round(rawDepth * depthMultiplier));

    const shape = shapeMap?.[i] ?? 'square';
    const rotation = rotationMap?.[i] ?? 0;
    const { x, y } = cellCoords(i, w);
    const ty = h - 1 - y;

    if (mode === 'symmetric') {
      const zStart = -Math.floor(depth / 2);
      const zEnd = Math.ceil(depth / 2);
      const zOffset = depth % 2 === 1 ? -0.5 : 0;
      for (let zi = zStart; zi < zEnd; zi++) {
        voxels.push({ x, y: ty, z: zi + zOffset, color, shape, rotation });
      }
    } else if (mode === 'back') {
      for (let z = -depth; z < 0; z++) {
        voxels.push({ x, y: ty, z, color, shape, rotation });
      }
    } else {
      for (let z = 0; z < depth; z++) {
        voxels.push({ x, y: ty, z, color, shape, rotation });
      }
    }
  }

  return voxels;
}

// ─── depthToColor ─────────────────────────────────────────────────────────────

export function depthToColor(depth: number): string {
  if (depth === 0) return 'hsl(0, 80%, 25%)';
  // Cool-to-warm ramp: depth 1 → blue (210°), depth 32 → red (0°)
  const t = Math.min(1, (depth - 1) / 31);
  const hue = Math.round(210 - t * 210);
  const lightness = 30 + Math.round(t * 20);
  return `hsl(${hue}, 80%, ${lightness}%)`;
}
