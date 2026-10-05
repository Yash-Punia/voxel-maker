import { describe, expect, it } from 'vitest';

import { computeShapeMesh, computeVoxels } from './depth-ops';
import type { ColorMap, DepthMap, RotationMap, ShapeMap } from '../types';

// Everything the app exports comes out of these two functions. A mesh with the
// wrong vertex count still renders, it just renders wrong, so the invariants
// are asserted rather than eyeballed in a preview.

interface Board {
  colorMap: ColorMap;
  depthMap: DepthMap;
  shapeMap: ShapeMap;
  rotationMap: RotationMap;
  w: number;
  h: number;
}

function board(colors: string[], w: number, h: number, depth = 2, shape = 'square'): Board {
  return {
    colorMap: colors,
    depthMap: new Array(w * h).fill(depth),
    shapeMap: new Array(w * h).fill(shape),
    rotationMap: new Array(w * h).fill(0),
    w,
    h,
  };
}

const mesh = (b: Board, optimize = false) =>
  computeShapeMesh(b.colorMap, b.depthMap, b.shapeMap, b.rotationMap, b.w, b.h, 'symmetric', 1, optimize);

describe('computeShapeMesh', () => {
  it('produces nothing for an empty board', () => {
    const result = mesh(board(['', '', '', ''], 2, 2));
    expect(result.positions).toHaveLength(0);
    expect(result.indices).toHaveLength(0);
  });

  it('produces geometry for a single painted cell', () => {
    const result = mesh(board(['#ff0000', '', '', ''], 2, 2));
    expect(result.positions.length).toBeGreaterThan(0);
    expect(result.indices.length).toBeGreaterThan(0);
  });

  it('keeps positions, normals and colours in step', () => {
    const result = mesh(board(['#ff0000', '#00ff00', '', '#0000ff'], 2, 2));
    // Three arrays, three floats per vertex, so all three must divide equally
    // and agree on the vertex count.
    expect(result.positions.length % 3).toBe(0);
    expect(result.normals).toHaveLength(result.positions.length);
    expect(result.colors).toHaveLength(result.positions.length);
  });

  it('indexes only vertices that exist', () => {
    const result = mesh(board(['#ff0000', '#00ff00', '#0000ff', '#ffffff'], 2, 2));
    const vertexCount = result.positions.length / 3;
    for (const i of result.indices) {
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(vertexCount);
    }
  });

  it('emits whole triangles', () => {
    const result = mesh(board(['#ff0000', '#00ff00', '#0000ff', '#ffffff'], 2, 2));
    expect(result.indices.length % 3).toBe(0);
  });

  it('skips a cell at depth zero, which is how a cell is suppressed', () => {
    const b = board(['#ff0000', '#00ff00', '', ''], 2, 2);
    b.depthMap = [0, 2, 0, 0];
    const only = mesh(board(['', '#00ff00', '', ''], 2, 2));
    expect(mesh(b).positions).toHaveLength(only.positions.length);
  });

  it('gives every colour channel a value inside the unit range', () => {
    const result = mesh(board(['#ff0000', '#123456', '', ''], 2, 2));
    for (const channel of result.colors) {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(1);
    }
  });

  it('optimising a solid board never adds triangles', () => {
    const b = board(new Array(16).fill('#ff0000'), 4, 4);
    // Merging coplanar faces is the whole point, so the optimised mesh must not
    // come back larger than the naive one.
    expect(mesh(b, true).indices.length).toBeLessThanOrEqual(mesh(b, false).indices.length);
  });

  it('optimising keeps the mesh valid', () => {
    const b = board(new Array(16).fill('#ff0000'), 4, 4);
    const result = mesh(b, true);
    const vertexCount = result.positions.length / 3;
    expect(result.indices.length % 3).toBe(0);
    for (const i of result.indices) expect(i).toBeLessThan(vertexCount);
  });
});

describe('computeVoxels', () => {
  const b = board(['#ff0000', '', '', ''], 2, 2, 3);

  it('gives one voxel per unit of depth', () => {
    const voxels = computeVoxels(b.colorMap, b.depthMap, b.w, b.h, 'symmetric', b.shapeMap, b.rotationMap);
    expect(voxels).toHaveLength(3);
  });

  it('carries the cell colour onto every voxel', () => {
    const voxels = computeVoxels(b.colorMap, b.depthMap, b.w, b.h, 'symmetric', b.shapeMap, b.rotationMap);
    expect(voxels.every((v) => v.color === '#ff0000')).toBe(true);
  });

  it('produces nothing for an empty board', () => {
    const empty = board(['', '', '', ''], 2, 2);
    expect(computeVoxels(empty.colorMap, empty.depthMap, 2, 2, 'symmetric')).toHaveLength(0);
  });

  it('skips cells at depth zero', () => {
    const zeroed = board(['#ff0000', ''], 2, 1);
    zeroed.depthMap = [0, 0];
    expect(computeVoxels(zeroed.colorMap, zeroed.depthMap, 2, 1, 'symmetric')).toHaveLength(0);
  });

  it('scales with the depth multiplier', () => {
    const doubled = computeVoxels(b.colorMap, b.depthMap, b.w, b.h, 'symmetric', b.shapeMap, b.rotationMap, 2);
    expect(doubled).toHaveLength(6);
  });

  it('puts a single extrusion in front of the board and a symmetric one across it', () => {
    const single = computeVoxels(b.colorMap, b.depthMap, b.w, b.h, 'single', b.shapeMap, b.rotationMap);
    const symmetric = computeVoxels(b.colorMap, b.depthMap, b.w, b.h, 'symmetric', b.shapeMap, b.rotationMap);
    expect(Math.min(...single.map((v) => v.z))).toBeGreaterThanOrEqual(0);
    expect(Math.min(...symmetric.map((v) => v.z))).toBeLessThan(0);
  });
});
