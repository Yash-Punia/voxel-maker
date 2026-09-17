import { describe, expect, it } from 'vitest';

import { cellIndex, cellCoords, neighbors4 } from './grid-utils';

// Every tool, every exporter and every AI edit addresses cells through these
// three functions, so an off-by-one here is an off-by-one everywhere.

describe('cellIndex and cellCoords', () => {
  it('round trip for every cell of a non-square board', () => {
    const w = 5;
    const h = 3;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        expect(cellCoords(cellIndex(x, y, w), w)).toEqual({ x, y });
      }
    }
  });

  it('puts the origin at the top left', () => {
    expect(cellIndex(0, 0, 8)).toBe(0);
    expect(cellIndex(1, 0, 8)).toBe(1);
    expect(cellIndex(0, 1, 8)).toBe(8);
  });
});

describe('neighbors4', () => {
  it('gives four neighbours in the middle', () => {
    expect(neighbors4(2, 2, 5, 5)).toHaveLength(4);
  });

  it('clips at every corner, so a fill never walks off the board', () => {
    expect(neighbors4(0, 0, 5, 5)).toHaveLength(2);
    expect(neighbors4(4, 0, 5, 5)).toHaveLength(2);
    expect(neighbors4(0, 4, 5, 5)).toHaveLength(2);
    expect(neighbors4(4, 4, 5, 5)).toHaveLength(2);
  });

  it('gives three along an edge', () => {
    expect(neighbors4(2, 0, 5, 5)).toHaveLength(3);
    expect(neighbors4(0, 2, 5, 5)).toHaveLength(3);
  });

  it('handles a one cell board without looping', () => {
    expect(neighbors4(0, 0, 1, 1)).toHaveLength(0);
  });
});
