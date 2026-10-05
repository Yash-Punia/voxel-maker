import { describe, expect, it } from 'vitest';

import { assembleScene } from './scene-assembly';
import type { Asset, Scene } from '../types';

// The only place board space meets scene space. Getting it wrong puts props
// underground, inside each other, or lit from the wrong side, and all three
// still render.

const OPTS = { mode: 'symmetric' as const, depthMultiplier: 1 };

function asset(id: string, w = 2, h = 2): Asset {
  const size = w * h;
  return {
    id,
    name: id,
    gridWidth: w,
    gridHeight: h,
    frames: [{
      colorMap: new Array(size).fill('#ff0000'),
      depthMap: new Array(size).fill(2),
      shapeMap: new Array(size).fill('square'),
      rotationMap: new Array(size).fill(0),
    }],
  };
}

function scene(placements: Scene['placements']): Scene {
  return { id: 's', name: 'scene', width: 16, depth: 16, placements };
}

const place = (over: Partial<Scene['placements'][number]> = {}) => ({
  id: 'p', assetId: 'a', x: 0, z: 0, y: 0, rotation: 0, frameIndex: 0, ...over,
});

/** Every Y coordinate in the assembled mesh. */
const ys = (mesh: { positions: number[] }) => mesh.positions.filter((_, i) => i % 3 === 1);
const xs = (mesh: { positions: number[] }) => mesh.positions.filter((_, i) => i % 3 === 0);
const zs = (mesh: { positions: number[] }) => mesh.positions.filter((_, i) => i % 3 === 2);

describe('assembleScene', () => {
  it('produces nothing for an empty scene', () => {
    expect(assembleScene(scene([]), [asset('a')], OPTS).positions).toHaveLength(0);
  });

  it('skips a placement whose asset is gone rather than throwing', () => {
    const mesh = assembleScene(scene([place({ assetId: 'missing' })]), [asset('a')], OPTS);
    expect(mesh.positions).toHaveLength(0);
  });

  it('stands an asset on the ground rather than half buried', () => {
    // A board mesh is centred, so without the lift its feet sit below zero and
    // the prop is sunk into the floor.
    const mesh = assembleScene(scene([place()]), [asset('a', 2, 2)], OPTS);
    expect(Math.min(...ys(mesh))).toBeCloseTo(0, 5);
  });

  it('lifts by the amount asked for', () => {
    const mesh = assembleScene(scene([place({ y: 3 })]), [asset('a', 2, 2)], OPTS);
    expect(Math.min(...ys(mesh))).toBeCloseTo(3, 5);
  });

  it('puts a placement where the ground coordinates say', () => {
    const mesh = assembleScene(scene([place({ x: 5, z: 7 })]), [asset('a', 2, 2)], OPTS);
    const cx = (Math.min(...xs(mesh)) + Math.max(...xs(mesh))) / 2;
    const cz = (Math.min(...zs(mesh)) + Math.max(...zs(mesh))) / 2;
    expect(cx).toBeCloseTo(5, 5);
    expect(cz).toBeCloseTo(7, 5);
  });

  it('keeps every array in step', () => {
    const mesh = assembleScene(scene([place(), place({ id: 'q', x: 4 })]), [asset('a')], OPTS);
    expect(mesh.positions.length % 3).toBe(0);
    expect(mesh.normals).toHaveLength(mesh.positions.length);
    expect(mesh.colors).toHaveLength(mesh.positions.length);
  });

  it('rebases indices, so the second placement does not point at the first', () => {
    const one = assembleScene(scene([place()]), [asset('a')], OPTS);
    const two = assembleScene(scene([place(), place({ id: 'q', x: 4 })]), [asset('a')], OPTS);
    const vertexCount = two.positions.length / 3;

    expect(two.indices).toHaveLength(one.indices.length * 2);
    for (const i of two.indices) {
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(vertexCount);
    }
    // The second half must reach past the first placement's vertices.
    expect(Math.max(...two.indices)).toBeGreaterThanOrEqual(one.positions.length / 3);
  });

  it('turns a placement about scene up in quarter steps', () => {
    const wide = asset('a', 4, 1);
    const flat = assembleScene(scene([place()]), [wide], OPTS);
    const turned = assembleScene(scene([place({ rotation: 1 })]), [wide], OPTS);

    const span = (v: number[]) => Math.max(...v) - Math.min(...v);
    // A 4 by 1 board is wide in X. A quarter turn makes it deep in Z instead.
    expect(span(xs(flat))).toBeGreaterThan(span(zs(flat)));
    expect(span(zs(turned))).toBeGreaterThan(span(xs(turned)));
  });

  it('turns normals with the geometry, or the lighting comes from the wrong side', () => {
    const mesh = assembleScene(scene([place({ rotation: 1 })]), [asset('a')], OPTS);
    // The front face pointed at +Z. After one quarter turn it points along X.
    const hasSidewaysNormal = mesh.normals.some((_, i) =>
      i % 3 === 0 && Math.abs(mesh.normals[i]) > 0.9);
    expect(hasSidewaysNormal).toBe(true);
  });

  it('leaves normals unit length through a turn', () => {
    const mesh = assembleScene(scene([place({ rotation: 3 })]), [asset('a')], OPTS);
    for (let i = 0; i < mesh.normals.length; i += 3) {
      const length = Math.hypot(mesh.normals[i], mesh.normals[i + 1], mesh.normals[i + 2]);
      expect(length).toBeCloseTo(1, 5);
    }
  });

  it('a full turn lands back where it started', () => {
    const at0 = assembleScene(scene([place({ rotation: 0 })]), [asset('a')], OPTS);
    const at4 = assembleScene(scene([place({ rotation: 4 })]), [asset('a')], OPTS);
    expect(at4.positions).toEqual(at0.positions);
  });

  it('handles a negative rotation the same as its positive twin', () => {
    const minus1 = assembleScene(scene([place({ rotation: -1 })]), [asset('a')], OPTS);
    const plus3 = assembleScene(scene([place({ rotation: 3 })]), [asset('a')], OPTS);
    expect(minus1.positions).toEqual(plus3.positions);
  });

  it('meshes a repeated asset once and reuses it', () => {
    const many = Array.from({ length: 10 }, (_, i) => place({ id: `p${i}`, x: i }));
    const one = assembleScene(scene([place()]), [asset('a')], OPTS);
    const ten = assembleScene(scene(many), [asset('a')], OPTS);
    // Ten copies of the same geometry, so exactly ten times the vertices.
    expect(ten.positions).toHaveLength(one.positions.length * 10);
  });

  it('falls back to frame 0 when the frame index is out of range', () => {
    const mesh = assembleScene(scene([place({ frameIndex: 99 })]), [asset('a')], OPTS);
    expect(mesh.positions.length).toBeGreaterThan(0);
  });
});
