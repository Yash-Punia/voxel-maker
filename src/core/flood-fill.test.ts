import { describe, expect, it } from 'vitest';

import { floodFill } from './flood-fill';

// 3x3 boards, written as rows so the shape being filled is visible in the test.
const board = (rows: string[][]) => rows.flat();

describe('floodFill', () => {
  it('fills a connected region and nothing else', () => {
    const before = board([
      ['a', 'a', 'b'],
      ['a', 'a', 'b'],
      ['b', 'b', 'b'],
    ]);
    const after = floodFill(before, 0, 0, 'z', 3, 3);
    expect(after).toEqual(board([
      ['z', 'z', 'b'],
      ['z', 'z', 'b'],
      ['b', 'b', 'b'],
    ]));
  });

  it('does not cross a diagonal, because the fill is four-connected', () => {
    const before = board([
      ['a', 'b', 'a'],
      ['b', 'b', 'b'],
      ['a', 'b', 'a'],
    ]);
    const after = floodFill(before, 0, 0, 'z', 3, 3);
    // Only the corner it started in changes. The opposite corner touches it at
    // a point, which does not count.
    expect(after[0]).toBe('z');
    expect(after[2]).toBe('a');
    expect(after[6]).toBe('a');
    expect(after[8]).toBe('a');
  });

  it('fills empty cells, which is how the bucket paints bare board', () => {
    const before = board([
      ['', '', 'b'],
      ['', '', 'b'],
      ['b', 'b', 'b'],
    ]);
    const after = floodFill(before, 0, 0, 'z', 3, 3);
    expect(after.filter((c) => c === 'z')).toHaveLength(4);
  });

  it('returns the same array when the target already is the fill colour', () => {
    const before = board([['a', 'a'], ['a', 'a']]);
    // Identity, not just equality: the no-op must not push a fresh board into
    // the store and mark the project dirty.
    expect(floodFill(before, 0, 0, 'a', 2, 2)).toBe(before);
  });

  it('never mutates the board it was given', () => {
    const before = board([['a', 'a'], ['a', 'a']]);
    const copy = [...before];
    floodFill(before, 0, 0, 'z', 2, 2);
    expect(before).toEqual(copy);
  });

  it('fills the whole board when it is one colour', () => {
    const before = new Array(16).fill('a');
    expect(floodFill(before, 2, 2, 'z', 4, 4).every((c) => c === 'z')).toBe(true);
  });
});
