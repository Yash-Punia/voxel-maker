import { describe, expect, it } from 'vitest';

import { isVxsFile, readAssets, VXS_VERSION } from './vxs-format';
import type { VxsFile } from '../types';

// This is the only code path that meets a file someone saved months ago. A bug
// here loses their work silently, so every version the app has ever written is
// covered.

const v1 = (): VxsFile => ({
  version: '1.0',
  palette: ['#ff0000'],
  gridWidth: 2,
  gridHeight: 2,
  colorMap: ['#ff0000', '', '', '#00ff00'],
  depthMap: [3, 1, 1, 4],
});

const v2 = (): VxsFile => ({
  ...v1(),
  version: '2.0',
  shapeMap: ['triangle', 'square', 'square', 'square'],
  rotationMap: [2, 0, 0, 1],
});

describe('isVxsFile', () => {
  it('accepts every version the app has written', () => {
    expect(isVxsFile(v1())).toBe(true);
    expect(isVxsFile(v2())).toBe(true);
    expect(isVxsFile({ version: '3.0', palette: [], assets: [{ id: 'a' }] })).toBe(true);
  });

  it('rejects anything that is not a project', () => {
    expect(isVxsFile(null)).toBe(false);
    expect(isVxsFile('a string')).toBe(false);
    expect(isVxsFile({})).toBe(false);
    expect(isVxsFile({ version: '2.0' })).toBe(false);
    // A version and nothing else is the shape a truncated download leaves.
    expect(isVxsFile({ version: '3.0', assets: [] })).toBe(false);
  });

  it('rejects a v2 file missing its board', () => {
    const broken = v2();
    delete broken.depthMap;
    expect(isVxsFile(broken)).toBe(false);
  });
});

describe('readAssets', () => {
  it('turns a v1 board into one asset, filling the fields v1 never had', () => {
    const [asset] = readAssets(v1());
    expect(asset.gridWidth).toBe(2);
    expect(asset.frames).toHaveLength(1);
    expect(asset.frames[0].colorMap).toEqual(['#ff0000', '', '', '#00ff00']);
    // v1 predates shapes, so every cell has to come back as the default.
    expect(asset.frames[0].shapeMap).toEqual(['square', 'square', 'square', 'square']);
    expect(asset.frames[0].rotationMap).toEqual([0, 0, 0, 0]);
  });

  it('keeps v2 shape and rotation data', () => {
    const [asset] = readAssets(v2());
    expect(asset.frames[0].shapeMap).toEqual(['triangle', 'square', 'square', 'square']);
    expect(asset.frames[0].rotationMap).toEqual([2, 0, 0, 1]);
  });

  it('passes a v3 asset list straight through', () => {
    const assets = readAssets({
      version: VXS_VERSION,
      palette: [],
      assets: [
        { id: 'x', name: 'barrel', gridWidth: 4, gridHeight: 4, frames: [] },
        { id: 'y', name: 'crate', gridWidth: 8, gridHeight: 8, frames: [] },
      ],
    });
    expect(assets.map((a) => a.name)).toEqual(['barrel', 'crate']);
  });

  it('gives every migrated asset the same map length as its board', () => {
    const [asset] = readAssets(v1());
    const size = asset.gridWidth * asset.gridHeight;
    expect(asset.frames[0].colorMap).toHaveLength(size);
    expect(asset.frames[0].depthMap).toHaveLength(size);
    expect(asset.frames[0].shapeMap).toHaveLength(size);
    expect(asset.frames[0].rotationMap).toHaveLength(size);
  });
});
