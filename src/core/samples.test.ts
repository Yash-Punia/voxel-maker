import { describe, expect, it } from 'vitest';

import { SAMPLES, materializeSample } from './samples';

// Samples are the first thing a new person loads. A broken one reads as a broken
// product, and nothing in the type system checks that a row string matches the
// board it claims to fill.

describe('every shipped sample', () => {
  it('has a unique id', () => {
    const ids = SAMPLES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('declares as many rows as its board is tall', () => {
    for (const sample of SAMPLES) {
      expect(sample.rows.length, sample.id).toBe(sample.gridHeight);
    }
  });

  it('has no row longer than its board is wide', () => {
    for (const sample of SAMPLES) {
      for (const row of sample.rows) {
        expect(row.length, sample.id).toBeLessThanOrEqual(sample.gridWidth);
      }
    }
  });

  it('defines every character its rows use', () => {
    for (const sample of SAMPLES) {
      for (const row of sample.rows) {
        for (const char of row) {
          if (char === ' ' || char === '.') continue;
          expect(sample.palette[char], `${sample.id} uses "${char}"`).toBeDefined();
        }
      }
    }
  });

  it('uses only real hex colours in its palette', () => {
    for (const sample of SAMPLES) {
      for (const color of Object.values(sample.palette)) {
        expect(color, sample.id).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  it('paints at least one cell, so no sample loads as a blank board', () => {
    for (const sample of SAMPLES) {
      const { colorMap } = materializeSample(sample);
      expect(colorMap.some(Boolean), sample.id).toBe(true);
    }
  });
});

describe('materializeSample', () => {
  it('returns maps exactly as long as the board', () => {
    for (const sample of SAMPLES) {
      const result = materializeSample(sample);
      const size = sample.gridWidth * sample.gridHeight;
      expect(result.colorMap, sample.id).toHaveLength(size);
      expect(result.depthMap, sample.id).toHaveLength(size);
      expect(result.shapeMap, sample.id).toHaveLength(size);
      expect(result.rotationMap, sample.id).toHaveLength(size);
    }
  });

  it('carries the declared board size through', () => {
    for (const sample of SAMPLES) {
      const result = materializeSample(sample);
      expect(result.gridWidth).toBe(sample.gridWidth);
      expect(result.gridHeight).toBe(sample.gridHeight);
    }
  });

  it('keeps every depth inside what a cell can hold', () => {
    for (const sample of SAMPLES) {
      for (const depth of materializeSample(sample).depthMap) {
        expect(depth, sample.id).toBeGreaterThanOrEqual(0);
        expect(depth, sample.id).toBeLessThanOrEqual(32);
      }
    }
  });

  it('keeps every rotation to a quarter turn', () => {
    for (const sample of SAMPLES) {
      for (const rotation of materializeSample(sample).rotationMap) {
        expect([0, 1, 2, 3], sample.id).toContain(rotation);
      }
    }
  });

  it('leaves unpainted cells empty', () => {
    for (const sample of SAMPLES) {
      const { colorMap } = materializeSample(sample);
      for (const color of colorMap) {
        if (color === '') continue;
        expect(color, sample.id).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });
});
