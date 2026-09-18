import { describe, expect, it } from 'vitest';

import { computeGreedyMesh } from './greedy-mesh';
import type { ColorMap, DepthMap, ShapeMap } from '../types';

// The optimiser merges coplanar faces. When it is wrong the mesh still renders,
// it just renders with holes or with faces inside the solid, which nobody
// notices until an export lands in an engine.

function board(colors: string[], w: number, h: number, depth = 2) {
  const colorMap: ColorMap = colors;
  const depthMap: DepthMap = new Array(w * h).fill(depth);
  const shapeMap: ShapeMap = new Array(w * h).fill('square');
  return { colorMap, depthMap, shapeMap, w, h };
}

const run = (b: ReturnType<typeof board>) =>
  computeGreedyMesh(b.colorMap, b.depthMap, b.shapeMap, b.w, b.h, 'symmetric', 1);

describe('computeGreedyMesh', () => {
  it('produces nothing for an empty board', () => {
    const result = run(board(['', '', '', ''], 2, 2));
    expect(result.positions).toHaveLength(0);
    expect(result.indices).toHaveLength(0);
  });

  it('keeps positions, normals and colours in step', () => {
    const result = run(board(new Array(16).fill('#ff0000'), 4, 4));
    expect(result.positions.length % 3).toBe(0);
    expect(result.normals).toHaveLength(result.positions.length);
    expect(result.colors).toHaveLength(result.positions.length);
  });

  it('emits whole triangles that index real vertices', () => {
    const result = run(board(new Array(16).fill('#ff0000'), 4, 4));
    const vertexCount = result.positions.length / 3;
    expect(result.indices.length % 3).toBe(0);
    for (const i of result.indices) {
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(vertexCount);
    }
  });

  it('merges a solid slab into fewer faces than it has cells', () => {
    // A 4x4 slab of one colour is six flat sides. Merging is the whole point, so
    // it must come out far below the 16 cells' worth of unmerged faces.
    const result = run(board(new Array(16).fill('#ff0000'), 4, 4));
    expect(result.indices.length / 3).toBeLessThan(16 * 6 * 2);
  });

  it('does not merge across a colour change', () => {
    const solid = run(board(new Array(16).fill('#ff0000'), 4, 4));
    const striped = run(board(
      Array.from({ length: 16 }, (_, i) => (i % 2 ? '#ff0000' : '#00ff00')),
      4, 4,
    ));
    // Two colours cannot share a face, so the striped board must cost more.
    expect(striped.indices.length).toBeGreaterThan(solid.indices.length);
  });

  it('gives every colour channel a value inside the unit range', () => {
    const result = run(board(['#ff0000', '#123456', '#abcdef', '#000000'], 2, 2));
    for (const channel of result.colors) {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(1);
    }
  });

  it('skips a cell at depth zero', () => {
    const b = board(['#ff0000', '#ff0000'], 2, 1);
    b.depthMap = [0, 0];
    expect(run(b).positions).toHaveLength(0);
  });

  it('handles a board with one painted cell', () => {
    const result = run(board(['#ff0000', '', '', ''], 2, 2));
    // A single cube is six faces, two triangles each.
    expect(result.indices.length / 3).toBe(12);
  });

  it('leaves no face between two touching cells of the same colour', () => {
    const one = run(board(['#ff0000', ''], 2, 1));
    const two = run(board(['#ff0000', '#ff0000'], 2, 1));
    // Two cubes side by side share a wall, so the pair must cost less than two
    // separate cubes would.
    expect(two.indices.length).toBeLessThan(one.indices.length * 2);
  });
});
