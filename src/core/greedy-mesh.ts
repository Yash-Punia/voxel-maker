import type { ColorMap, DepthMap, ShapeMap, ExtrusionMode, MeshData } from '../types';

// ─── Greedy voxel meshing ───────────────────────────────────────────────────
// For square-shape cells only. Builds a 3D occupancy+color grid, then for
// each of 6 axis-aligned face directions runs a 2D greedy merge to produce
// fewer, larger quads of the same color.
//
// Non-square cells are skipped (caller handles them with computeShapeMesh).

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ];
}

function zRange(depth: number, mode: ExtrusionMode): [number, number] {
  if (mode === 'symmetric') {
    const s = -Math.floor(depth / 2);
    const e = Math.ceil(depth / 2);
    const off = depth % 2 === 1 ? -0.5 : 0;
    return [s + off, e + off];
  }
  if (mode === 'back') return [-depth, 0];
  return [0, depth];
}

export function computeGreedyMesh(
  colorMap: ColorMap,
  depthMap: DepthMap,
  shapeMap: ShapeMap,
  w: number,
  h: number,
  mode: ExtrusionMode,
  depthMultiplier = 1.0,
): MeshData {
  // ── Build occupancy grid over [0,w) × [0,h) × [zMin,zMax) of integer voxel slots
  //    Values: hex color string or null
  let zMin = Infinity, zMax = -Infinity;

  interface CellInfo { depth: number; zFrom: number; zTo: number; color: string; tx: number; ty: number; }
  const cells: CellInfo[] = [];

  for (let i = 0; i < colorMap.length; i++) {
    const color = colorMap[i];
    if (!color) continue;
    if ((shapeMap[i] ?? 'square') !== 'square') continue;
    const raw = depthMap[i] ?? 1;
    if (raw === 0) continue;
    const depth = Math.max(1, Math.round(raw * depthMultiplier));
    const [zFrom, zTo] = zRange(depth, mode);

    // symmetric-odd depth produces half-unit offsets — shift by 0.5 to snap to integer voxel slots
    const slotFrom = Math.round(zFrom * 2) / 2;
    const slotTo = Math.round(zTo * 2) / 2;

    const x = i % w;
    const y = Math.floor(i / w);
    const tx = x;
    const ty = h - 1 - y;

    cells.push({ depth, zFrom: slotFrom, zTo: slotTo, color, tx, ty });
    if (slotFrom < zMin) zMin = slotFrom;
    if (slotTo > zMax) zMax = slotTo;
  }

  if (cells.length === 0) return { positions: [], normals: [], colors: [], indices: [] };

  // Shift z by a half-unit if any slot is fractional, so all grid indices are integers.
  const zShift = zMin < 0 && Math.abs(zMin - Math.floor(zMin)) > 0.01 ? 0.5 : 0;
  const zOrigin = Math.floor(zMin + zShift);     // integer origin in world space
  const zDepth = Math.ceil(zMax + zShift) - zOrigin;

  // grid[x][y][z] = color | null — z is offset: world_z = zOrigin + grid_z
  const size = w * h * zDepth;
  const grid: (string | null)[] = new Array(size).fill(null);
  const gIdx = (x: number, y: number, z: number) => (z * h + y) * w + x;

  for (const c of cells) {
    const z0 = Math.round(c.zFrom + zShift) - zOrigin;
    const z1 = Math.round(c.zTo + zShift) - zOrigin;
    for (let z = z0; z < z1; z++) {
      grid[gIdx(c.tx, c.ty, z)] = c.color;
    }
  }

  // ── Greedy mesher: for each of 6 axis faces, slab-by-slab 2D greedy merge
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  let vIdx = 0;

  // Center grid around origin (matches computeShapeMesh convention)
  const ox = -w / 2;
  const oy = -h / 2;

  const pushQuad = (
    p0: [number, number, number],
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number],
    n: [number, number, number],
    color: string,
  ) => {
    const [r, g, b] = hexToRgb(color);
    const base = vIdx;
    for (const p of [p0, p1, p2, p3]) {
      positions.push(p[0], p[1], p[2]);
      normals.push(n[0], n[1], n[2]);
      colors.push(r, g, b);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    vIdx += 4;
  };

  // Greedy merge of a 2D mask keyed by color string; emits quads via callback.
  const greedyMerge = (
    mask: (string | null)[],
    dim1: number,
    dim2: number,
    emit: (u: number, v: number, du: number, dv: number, color: string) => void,
  ) => {
    const used = new Uint8Array(dim1 * dim2);
    for (let v = 0; v < dim2; v++) {
      for (let u = 0; u < dim1; u++) {
        const idx = v * dim1 + u;
        if (used[idx] || !mask[idx]) continue;
        const color = mask[idx]!;

        // Expand width
        let du = 1;
        while (u + du < dim1 && !used[v * dim1 + u + du] && mask[v * dim1 + u + du] === color) du++;

        // Expand height
        let dv = 1;
        outer: while (v + dv < dim2) {
          for (let i = 0; i < du; i++) {
            const k = (v + dv) * dim1 + u + i;
            if (used[k] || mask[k] !== color) break outer;
          }
          dv++;
        }

        for (let jv = 0; jv < dv; jv++)
          for (let ju = 0; ju < du; ju++)
            used[(v + jv) * dim1 + u + ju] = 1;

        emit(u, v, du, dv, color);
      }
    }
  };

  // ── ±X faces (plane dim: y × z)
  for (let x = 0; x <= w; x++) {
    // +X mask: face at x.5 points +X, visible if grid[x-1][y][z] is solid and grid[x][y][z] is empty
    const maskPos: (string | null)[] = new Array(h * zDepth).fill(null);
    const maskNeg: (string | null)[] = new Array(h * zDepth).fill(null);
    for (let z = 0; z < zDepth; z++) {
      for (let y = 0; y < h; y++) {
        const here = x < w ? grid[gIdx(x, y, z)] : null;
        const behind = x > 0 ? grid[gIdx(x - 1, y, z)] : null;
        if (behind && here !== behind) maskPos[z * h + y] = behind;
        if (here && behind !== here) maskNeg[z * h + y] = here;
      }
    }
    const wx = x + ox;
    greedyMerge(maskPos, h, zDepth, (u, v, du, dv, color) => {
      const y0 = u + oy, y1 = u + du + oy;
      const z0 = v + zOrigin - zShift, z1 = v + dv + zOrigin - zShift;
      pushQuad([wx, y0, z0], [wx, y1, z0], [wx, y1, z1], [wx, y0, z1], [1, 0, 0], color);
    });
    greedyMerge(maskNeg, h, zDepth, (u, v, du, dv, color) => {
      const y0 = u + oy, y1 = u + du + oy;
      const z0 = v + zOrigin - zShift, z1 = v + dv + zOrigin - zShift;
      pushQuad([wx, y1, z0], [wx, y0, z0], [wx, y0, z1], [wx, y1, z1], [-1, 0, 0], color);
    });
  }

  // ── ±Y faces (plane dim: x × z)
  for (let y = 0; y <= h; y++) {
    const maskPos: (string | null)[] = new Array(w * zDepth).fill(null);
    const maskNeg: (string | null)[] = new Array(w * zDepth).fill(null);
    for (let z = 0; z < zDepth; z++) {
      for (let x = 0; x < w; x++) {
        const here = y < h ? grid[gIdx(x, y, z)] : null;
        const behind = y > 0 ? grid[gIdx(x, y - 1, z)] : null;
        if (behind && here !== behind) maskPos[z * w + x] = behind;
        if (here && behind !== here) maskNeg[z * w + x] = here;
      }
    }
    const wy = y + oy;
    greedyMerge(maskPos, w, zDepth, (u, v, du, dv, color) => {
      const x0 = u + ox, x1 = u + du + ox;
      const z0 = v + zOrigin - zShift, z1 = v + dv + zOrigin - zShift;
      pushQuad([x1, wy, z0], [x0, wy, z0], [x0, wy, z1], [x1, wy, z1], [0, 1, 0], color);
    });
    greedyMerge(maskNeg, w, zDepth, (u, v, du, dv, color) => {
      const x0 = u + ox, x1 = u + du + ox;
      const z0 = v + zOrigin - zShift, z1 = v + dv + zOrigin - zShift;
      pushQuad([x0, wy, z0], [x1, wy, z0], [x1, wy, z1], [x0, wy, z1], [0, -1, 0], color);
    });
  }

  // ── ±Z faces (plane dim: x × y)
  for (let z = 0; z <= zDepth; z++) {
    const maskPos: (string | null)[] = new Array(w * h).fill(null);
    const maskNeg: (string | null)[] = new Array(w * h).fill(null);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const here = z < zDepth ? grid[gIdx(x, y, z)] : null;
        const behind = z > 0 ? grid[gIdx(x, y, z - 1)] : null;
        if (behind && here !== behind) maskPos[y * w + x] = behind;
        if (here && behind !== here) maskNeg[y * w + x] = here;
      }
    }
    const wz = z + zOrigin - zShift;
    greedyMerge(maskPos, w, h, (u, v, du, dv, color) => {
      const x0 = u + ox, x1 = u + du + ox;
      const y0 = v + oy, y1 = v + dv + oy;
      pushQuad([x0, y0, wz], [x1, y0, wz], [x1, y1, wz], [x0, y1, wz], [0, 0, 1], color);
    });
    greedyMerge(maskNeg, w, h, (u, v, du, dv, color) => {
      const x0 = u + ox, x1 = u + du + ox;
      const y0 = v + oy, y1 = v + dv + oy;
      pushQuad([x1, y0, wz], [x0, y0, wz], [x0, y1, wz], [x1, y1, wz], [0, 0, -1], color);
    });
  }

  return { positions, normals, colors, indices };
}
