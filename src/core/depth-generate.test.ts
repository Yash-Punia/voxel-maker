import { describe, expect, it } from 'vitest';

import { generateDepth } from './depth-generate';

const PALETTE = ['#000000', '#808080', '#ffffff'];
const OPTIONS = { min: 1, max: 8, invert: false };

describe('generateDepth', () => {
  const board = ['#000000', '#ffffff', '', '#808080'];

  it('leaves empty cells at zero so they stay transparent', () => {
    const depths = generateDepth(board, 'luminosity', PALETTE, OPTIONS);
    expect(depths[2]).toBe(0);
  });

  it('keeps every painted cell inside the requested range', () => {
    const depths = generateDepth(board, 'luminosity', PALETTE, OPTIONS);
    for (const [i, depth] of depths.entries()) {
      if (!board[i]) continue;
      expect(depth).toBeGreaterThanOrEqual(1);
      expect(depth).toBeLessThanOrEqual(8);
    }
  });

  it('returns one depth per cell', () => {
    expect(generateDepth(board, 'luminosity', PALETTE, OPTIONS)).toHaveLength(board.length);
  });

  it('makes a brighter colour deeper than a darker one', () => {
    const depths = generateDepth(board, 'luminosity', PALETTE, OPTIONS);
    expect(depths[1]).toBeGreaterThan(depths[0]);
  });

  it('inverting turns that around', () => {
    const depths = generateDepth(board, 'luminosity', PALETTE, { ...OPTIONS, invert: true });
    expect(depths[1]).toBeLessThan(depths[0]);
  });

  it('clamps a range the UI should never send but might', () => {
    const depths = generateDepth(board, 'luminosity', PALETTE, { min: -5, max: 99, invert: false });
    for (const [i, depth] of depths.entries()) {
      if (!board[i]) continue;
      expect(depth).toBeGreaterThanOrEqual(1);
      expect(depth).toBeLessThanOrEqual(32);
    }
  });

  it('survives a min above its max rather than producing an empty range', () => {
    const depths = generateDepth(board, 'luminosity', PALETTE, { min: 9, max: 3, invert: false });
    for (const [i, depth] of depths.entries()) {
      if (!board[i]) continue;
      expect(Number.isFinite(depth)).toBe(true);
      expect(depth).toBeGreaterThanOrEqual(1);
    }
  });

  it('is deterministic in noise mode for a given seed', () => {
    const a = generateDepth(board, 'noise', PALETTE, { ...OPTIONS, seed: 7 });
    const b = generateDepth(board, 'noise', PALETTE, { ...OPTIONS, seed: 7 });
    expect(a).toEqual(b);
  });

  it('handles a colour that is not in the palette', () => {
    const odd = ['#abcdef'];
    const depths = generateDepth(odd, 'color-index', PALETTE, OPTIONS);
    expect(Number.isFinite(depths[0])).toBe(true);
    expect(depths[0]).toBeGreaterThanOrEqual(1);
  });
});
