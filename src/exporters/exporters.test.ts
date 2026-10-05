import { describe, expect, it } from 'vitest';

import { buildObj } from './export-obj';
import { buildPly } from './export-ply';
import { buildStl } from './export-stl';
import { buildSvg } from './export-svg';
import { buildVox } from './export-vox';
import { computeShapeMesh } from '../core/depth-ops';
import type { ColorMap, MeshData, RotationMap, ShapeMap, Voxel } from '../types';

// These files are the deliverable. A malformed one is not caught by anything
// upstream: it downloads, it opens, and it is wrong in someone else's tool.

function board(colors: string[], w: number, h: number) {
  const size = w * h;
  return {
    colorMap: colors as ColorMap,
    depthMap: new Array(size).fill(2),
    shapeMap: new Array(size).fill('square') as ShapeMap,
    rotationMap: new Array(size).fill(0) as RotationMap,
    w,
    h,
  };
}

const mesh = (colors: string[], w = 2, h = 2): MeshData => {
  const b = board(colors, w, h);
  return computeShapeMesh(b.colorMap, b.depthMap, b.shapeMap, b.rotationMap, b.w, b.h, 'symmetric', 1, false);
};

const SOLID = mesh(['#ff0000', '#00ff00', '#0000ff', '#ffffff']);
const EMPTY = mesh(['', '', '', '']);

describe('OBJ', () => {
  const { obj, mtl } = buildObj(SOLID, 'thing');

  it('points at its own material library', () => {
    expect(obj).toContain('mtllib thing.mtl');
  });

  it('writes one vertex line per vertex', () => {
    const lines = obj.split('\n').filter((l) => l.startsWith('v ')).length;
    expect(lines).toBe(SOLID.positions.length / 3);
  });

  it('writes one normal line per vertex', () => {
    const lines = obj.split('\n').filter((l) => l.startsWith('vn ')).length;
    expect(lines).toBe(SOLID.normals.length / 3);
  });

  it('writes one face per triangle', () => {
    const faces = obj.split('\n').filter((l) => l.startsWith('f ')).length;
    expect(faces).toBe(SOLID.indices.length / 3);
  });

  it('indexes faces from 1, because OBJ is not zero based', () => {
    // An off-by-one here shifts every face by a vertex and the model opens
    // inside out in every DCC tool there is.
    const faces = obj.split('\n').filter((l) => l.startsWith('f '));
    const indices = faces.flatMap((l) =>
      l.slice(2).trim().split(/\s+/).map((part) => Number(part.split('//')[0])),
    );
    expect(Math.min(...indices)).toBe(1);
    expect(Math.max(...indices)).toBe(SOLID.positions.length / 3);
  });

  it('declares every material it uses', () => {
    const used = new Set(
      obj.split('\n').filter((l) => l.startsWith('usemtl ')).map((l) => l.slice(7)),
    );
    const declared = new Set(
      mtl.split('\n').filter((l) => l.startsWith('newmtl ')).map((l) => l.slice(7)),
    );
    for (const name of used) expect(declared.has(name), name).toBe(true);
  });

  it('keeps every material colour inside the unit range', () => {
    for (const line of mtl.split('\n').filter((l) => l.startsWith('Kd '))) {
      for (const n of line.slice(3).split(' ').map(Number)) {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(1);
      }
    }
  });

  it('writes no numbers that a parser would reject', () => {
    expect(obj).not.toMatch(/NaN|Infinity|undefined/);
    expect(mtl).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('produces a valid, empty file for an empty board', () => {
    const empty = buildObj(EMPTY, 'thing');
    expect(empty.obj.split('\n').filter((l) => l.startsWith('f '))).toHaveLength(0);
  });
});

describe('PLY', () => {
  const ply = buildPly(SOLID);
  const lines = ply.split('\n');

  it('opens with the magic word and the format', () => {
    expect(lines[0]).toBe('ply');
    expect(lines[1]).toBe('format ascii 1.0');
  });

  it('declares counts that match the body, which is what a reader trusts', () => {
    const declaredVerts = Number(lines.find((l) => l.startsWith('element vertex '))!.slice(15));
    const declaredFaces = Number(lines.find((l) => l.startsWith('element face '))!.slice(13));
    expect(declaredVerts).toBe(SOLID.positions.length / 3);
    expect(declaredFaces).toBe(SOLID.indices.length / 3);

    const body = lines.slice(lines.indexOf('end_header') + 1).filter(Boolean);
    expect(body).toHaveLength(declaredVerts + declaredFaces);
  });

  it('ends its header', () => {
    expect(lines).toContain('end_header');
  });

  it('writes colours as bytes, not as floats', () => {
    const start = lines.indexOf('end_header') + 1;
    const first = lines[start].trim().split(/\s+/);
    for (const channel of first.slice(6, 9)) {
      const n = Number(channel);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(255);
    }
  });

  it('writes triangles, each declaring three vertices', () => {
    const start = lines.indexOf('end_header') + 1 + SOLID.positions.length / 3;
    for (const line of lines.slice(start).filter(Boolean)) {
      expect(line.trim().split(/\s+/)[0]).toBe('3');
    }
  });

  it('writes no numbers that a parser would reject', () => {
    expect(ply).not.toMatch(/NaN|Infinity|undefined/);
  });
});

describe('STL', () => {
  const buffer = buildStl(SOLID);
  const view = new DataView(buffer);

  it('is exactly as long as its own triangle count says', () => {
    // 80 byte header, a 4 byte count, then 50 bytes a triangle. A reader that
    // trusts the count and runs past the end is the classic STL failure.
    const count = view.getUint32(80, true);
    expect(count).toBe(SOLID.indices.length / 3);
    expect(buffer.byteLength).toBe(84 + count * 50);
  });

  it('writes finite coordinates', () => {
    const count = view.getUint32(80, true);
    for (let t = 0; t < count; t++) {
      for (let f = 0; f < 12; f++) {
        expect(Number.isFinite(view.getFloat32(84 + t * 50 + f * 4, true))).toBe(true);
      }
    }
  });

  it('is still a valid file when there is nothing in it', () => {
    const empty = buildStl(EMPTY);
    expect(new DataView(empty).getUint32(80, true)).toBe(0);
    expect(empty.byteLength).toBe(84);
  });
});

describe('SVG', () => {
  const svg = buildSvg(
    ['#ff0000', '', '', '#00ff00'],
    ['square', 'square', 'square', 'triangle'],
    [0, 0, 0, 1],
    2, 2, 16,
  );

  it('is a complete document, prolog included', () => {
    // A standalone .svg file wants the XML declaration, unlike inline markup.
    expect(svg.startsWith('<?xml')).toBe(true);
    expect(svg).toContain('<svg');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
  });

  it('sizes itself from the board and the cell size', () => {
    expect(svg).toContain('width="32"');
    expect(svg).toContain('height="32"');
  });

  it('draws one polygon per painted cell and none for the empty ones', () => {
    expect(svg.match(/<polygon/g) ?? []).toHaveLength(2);
  });

  it('carries the cell colours', () => {
    expect(svg).toContain('#ff0000');
    expect(svg).toContain('#00ff00');
  });

  it('writes no numbers that a parser would reject', () => {
    expect(svg).not.toMatch(/NaN|Infinity|undefined/);
  });
});

describe('VOX', () => {
  const voxels: Voxel[] = [
    { x: 0, y: 0, z: 0, color: '#ff0000', shape: 'square', rotation: 0 },
    { x: 1, y: 0, z: 0, color: '#00ff00', shape: 'square', rotation: 0 },
  ];
  const bytes = buildVox(voxels);

  it('opens with the VOX magic and a version', () => {
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('VOX ');
    expect(new DataView(bytes.buffer).getUint32(4, true)).toBe(150);
  });

  it('declares a MAIN chunk', () => {
    expect(String.fromCharCode(...bytes.slice(8, 12))).toBe('MAIN');
  });

  it('carries the voxels and a palette', () => {
    const text = String.fromCharCode(...bytes);
    expect(text).toContain('SIZE');
    expect(text).toContain('XYZI');
    expect(text).toContain('RGBA');
  });

  it('produces a file even with nothing to write', () => {
    expect(() => buildVox([])).not.toThrow();
    expect(buildVox([]).length).toBeGreaterThan(8);
  });
});
