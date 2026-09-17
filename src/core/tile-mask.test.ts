import { describe, expect, it } from 'vitest';

import { TILE_BITS, TILE_COUNT, tileSides } from './tile-mask';

// The mask is a contract with whatever engine reads the sheet, so the bit
// meanings are asserted rather than trusted to stay put.

describe('the tile mask', () => {
  it('has one bit per side, and they do not overlap', () => {
    const bits = Object.values(TILE_BITS);
    expect(bits).toEqual([1, 2, 4, 8]);
    expect(bits.reduce((a, b) => a | b, 0)).toBe(TILE_COUNT - 1);
  });

  it('names nothing for an isolated tile and everything for a surrounded one', () => {
    expect(tileSides(0)).toEqual([]);
    expect(tileSides(15)).toHaveLength(4);
  });

  it('reads each side back out of its own bit', () => {
    expect(tileSides(TILE_BITS.north)).toEqual(['north']);
    expect(tileSides(TILE_BITS.west)).toEqual(['west']);
  });

  it('reads a combination', () => {
    expect(tileSides(TILE_BITS.north | TILE_BITS.south).sort()).toEqual(['north', 'south']);
  });

  it('gives every mask a distinct set of sides', () => {
    const seen = new Set<string>();
    for (let mask = 0; mask < TILE_COUNT; mask++) seen.add(tileSides(mask).sort().join(','));
    expect(seen.size).toBe(TILE_COUNT);
  });
});
