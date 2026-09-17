import { describe, expect, it } from 'vitest';

import { SHAPES, SHAPE_MAP, getShape } from './shapes';

// Every shape feeds both the 2D canvas and the 3D extrusion. A bad profile does
// not throw, it quietly produces a mesh with holes, so the invariants are
// checked here rather than noticed in an export weeks later.

describe('the shape registry', () => {
  it('has no duplicate ids', () => {
    const ids = SHAPES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('exposes every shape through the lookup map', () => {
    expect(Object.keys(SHAPE_MAP)).toHaveLength(SHAPES.length);
  });

  it('falls back to square for an unknown id, so bad data never crashes a board', () => {
    expect(getShape('not-a-shape').id).toBe('square');
    expect(getShape('').id).toBe('square');
  });

  it('returns the real shape for a known id', () => {
    for (const shape of SHAPES) expect(getShape(shape.id).id).toBe(shape.id);
  });
});

describe('every shape profile', () => {
  const rotations = [0, 1, 2, 3];

  it('produces at least one triangle at every rotation', () => {
    for (const shape of SHAPES) {
      for (const rotation of rotations) {
        const { indices } = shape.getProfile(rotation);
        expect(indices.length, `${shape.id} at rotation ${rotation}`).toBeGreaterThan(0);
      }
    }
  });

  it('indexes only vertices that exist', () => {
    for (const shape of SHAPES) {
      for (const rotation of rotations) {
        const { vertices, indices } = shape.getProfile(rotation);
        for (const tri of indices) {
          for (const i of tri) {
            expect(i, `${shape.id} at rotation ${rotation}`).toBeGreaterThanOrEqual(0);
            expect(i, `${shape.id} at rotation ${rotation}`).toBeLessThan(vertices.length);
          }
        }
      }
    }
  });

  it('stays inside its own cell, so shapes never bleed into their neighbours', () => {
    for (const shape of SHAPES) {
      for (const rotation of rotations) {
        for (const [x, y] of shape.getProfile(rotation).vertices) {
          expect(x, `${shape.id} at rotation ${rotation}`).toBeGreaterThanOrEqual(0);
          expect(x, `${shape.id} at rotation ${rotation}`).toBeLessThanOrEqual(1);
          expect(y, `${shape.id} at rotation ${rotation}`).toBeGreaterThanOrEqual(0);
          expect(y, `${shape.id} at rotation ${rotation}`).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('keeps the same triangle count through a rotation', () => {
    for (const shape of SHAPES) {
      const base = shape.getProfile(0).indices.length;
      for (const rotation of rotations) {
        expect(shape.getProfile(rotation).indices.length, shape.id).toBe(base);
      }
    }
  });

  it('gives the full-cell shapes the whole cell', () => {
    // square and half are the two the greedy mesher may merge, so their corners
    // have to be exact or merged faces leave gaps.
    const square = getShape('square').getProfile(0).vertices;
    const xs = square.map(([x]) => x);
    const ys = square.map(([, y]) => y);
    expect(Math.min(...xs)).toBe(0);
    expect(Math.max(...xs)).toBe(1);
    expect(Math.min(...ys)).toBe(0);
    expect(Math.max(...ys)).toBe(1);
  });
});
