import { describe, expect, it } from 'vitest';

import { deriveStyleProfile, describeStyleProfile } from './style-profile';
import type { Asset, Frame } from '../types';

const PALETTE = ['#ff0000', '#00ff00', '#0000ff'];

/** A board of `painted` cells in one colour, the rest empty. */
function frame(painted: number, color = '#ff0000', shape = 'square', depth = 4): Frame {
  const size = 64;
  return {
    colorMap: Array.from({ length: size }, (_, i) => (i < painted ? color : '')),
    depthMap: new Array(size).fill(depth),
    shapeMap: new Array(size).fill(shape),
    rotationMap: new Array(size).fill(0),
  };
}

function asset(frames: Frame[], w = 8, h = 8): Asset {
  return { id: 'a', name: 'test', gridWidth: w, gridHeight: h, frames };
}

describe('deriveStyleProfile', () => {
  it('returns null for an empty project, so nothing is invented', () => {
    expect(deriveStyleProfile([asset([frame(0)])], PALETTE)).toBeNull();
  });

  it('returns null below the noise floor', () => {
    // 23 cells is one person's first few strokes, not a style.
    expect(deriveStyleProfile([asset([frame(23)])], PALETTE)).toBeNull();
    expect(deriveStyleProfile([asset([frame(24)])], PALETTE)).not.toBeNull();
  });

  it('ranks colours by how much of the work uses them', () => {
    const profile = deriveStyleProfile(
      [asset([frame(30, '#ff0000'), frame(10, '#00ff00')])],
      PALETTE,
    )!;
    expect(profile.colors[0].color).toBe('#ff0000');
    expect(profile.colors[1].color).toBe('#00ff00');
    expect(profile.colors[0].share).toBeGreaterThan(profile.colors[1].share);
  });

  it('reports the palette slot so the model can name an index', () => {
    const profile = deriveStyleProfile([asset([frame(30, '#0000ff')])], PALETTE)!;
    expect(profile.colors[0].index).toBe(2);
  });

  it('reports -1 for a colour that is not in the palette', () => {
    const profile = deriveStyleProfile([asset([frame(30, '#abcdef')])], PALETTE)!;
    expect(profile.colors[0].index).toBe(-1);
  });

  it('measures the depth range across every painted cell', () => {
    const profile = deriveStyleProfile(
      [asset([frame(30, '#ff0000', 'square', 2), frame(30, '#ff0000', 'square', 8)])],
      PALETTE,
    )!;
    expect(profile.depth.min).toBe(2);
    expect(profile.depth.max).toBe(8);
  });

  it('ignores empty frames when counting the sample', () => {
    const profile = deriveStyleProfile([asset([frame(30), frame(0)])], PALETTE)!;
    expect(profile.sampleSize).toBe(1);
  });

  it('measures density as the painted share of the board', () => {
    const profile = deriveStyleProfile([asset([frame(32)])], PALETTE)!;
    expect(profile.density).toBeCloseTo(0.5, 5);
  });

  it('counts shapes, so a shape the project never uses stays absent', () => {
    const profile = deriveStyleProfile(
      [asset([frame(30, '#ff0000', 'triangle')])],
      PALETTE,
    )!;
    expect(profile.shapes.map((s) => s.id)).toEqual(['triangle']);
  });
});

describe('describeStyleProfile', () => {
  it('names the colours, shapes and range the model has to match', () => {
    const profile = deriveStyleProfile([asset([frame(32, '#ff0000', 'triangle', 5)])], PALETTE)!;
    const text = describeStyleProfile(profile);
    expect(text).toContain('#ff0000');
    expect(text).toContain('triangle');
    expect(text).toContain('slot 0');
    // The prompt rides on every request, so it must stay short.
    expect(text.length).toBeLessThan(1200);
  });
});
