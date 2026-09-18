import { beforeEach, describe, expect, it } from 'vitest';

import { useStore } from '../store';
import {
  applyCellEdits,
  applyDepthEdits,
  isHexColor,
  linePoints,
  resolveColor,
  resolveRotation,
  resolveShape,
} from './board-io';

// This is the enforcement boundary. Everything the model produces passes through
// here, and the project rule is that a tool validates and clamps every field it
// is handed. A value that slips through writes straight into someone's artwork
// with nothing upstream to catch it, so the rejections matter more than the
// acceptances.

const s = () => useStore.getState();

beforeEach(() => {
  useStore.getState().resetAssets(4, 4);
  useStore.getState().setPalette(['#ff0000', '#00ff00', '#0000ff']);
});

describe('isHexColor', () => {
  it('accepts a full six digit hex in either case', () => {
    expect(isHexColor('#ff5c38')).toBe(true);
    expect(isHexColor('#FF5C38')).toBe(true);
  });

  it('rejects the shapes that look close enough to slip through', () => {
    expect(isHexColor('#fff')).toBe(false);
    expect(isHexColor('ff5c38')).toBe(false);
    expect(isHexColor('#ff5c3')).toBe(false);
    expect(isHexColor('#ff5c388')).toBe(false);
    expect(isHexColor('#gggggg')).toBe(false);
    expect(isHexColor('red')).toBe(false);
    expect(isHexColor(0xff5c38)).toBe(false);
    expect(isHexColor(null)).toBe(false);
    expect(isHexColor(undefined)).toBe(false);
  });
});

describe('resolveColor', () => {
  it('treats empty, null and undefined as erase', () => {
    expect(resolveColor('')).toBe('');
    expect(resolveColor(null)).toBe('');
    expect(resolveColor(undefined)).toBe('');
  });

  it('normalises case, so the same colour is never stored two ways', () => {
    expect(resolveColor('#FF5C38')).toBe('#ff5c38');
  });

  it('takes a palette index as a number or as a string', () => {
    expect(resolveColor(1)).toBe('#00ff00');
    expect(resolveColor('1')).toBe('#00ff00');
    expect(resolveColor(' 2 ')).toBe('#0000ff');
  });

  it('throws on a palette slot that is empty or out of range', () => {
    expect(() => resolveColor(31)).toThrow();
    expect(() => resolveColor(999)).toThrow();
    expect(() => resolveColor(-1)).toThrow();
  });

  it('throws rather than silently ignoring a value it cannot read', () => {
    // A silently dropped colour leaves the board looking like the tool worked.
    expect(() => resolveColor('red')).toThrow();
    expect(() => resolveColor('#fff')).toThrow();
    expect(() => resolveColor(1.5)).toThrow();
    expect(() => resolveColor({})).toThrow();
    expect(() => resolveColor(true)).toThrow();
  });
});

describe('resolveShape', () => {
  it('falls back when nothing was given', () => {
    expect(resolveShape(undefined, 'square')).toBe('square');
    expect(resolveShape(null, 'triangle')).toBe('triangle');
  });

  it('accepts a real shape id', () => {
    expect(resolveShape('triangle', 'square')).toBe('triangle');
  });

  it('throws on an id the registry does not have', () => {
    expect(() => resolveShape('hexagon', 'square')).toThrow();
    expect(() => resolveShape('', 'square')).toThrow();
    expect(() => resolveShape(42, 'square')).toThrow();
  });
});

describe('resolveRotation', () => {
  it('falls back when nothing was given', () => {
    expect(resolveRotation(undefined, 2)).toBe(2);
    expect(resolveRotation(null, 0)).toBe(0);
  });

  it('accepts the four quarter turns, as number or string', () => {
    expect(resolveRotation(0, 0)).toBe(0);
    expect(resolveRotation(3, 0)).toBe(3);
    expect(resolveRotation('2', 0)).toBe(2);
  });

  it('throws outside the four, rather than wrapping silently', () => {
    expect(() => resolveRotation(4, 0)).toThrow();
    expect(() => resolveRotation(-1, 0)).toThrow();
    expect(() => resolveRotation(1.5, 0)).toThrow();
    expect(() => resolveRotation('north', 0)).toThrow();
  });
});

describe('applyCellEdits', () => {
  it('writes inside the board and reports how many landed', () => {
    expect(applyCellEdits([{ x: 0, y: 0, color: '#ff0000' }])).toBe(1);
    expect(s().colorMap[0]).toBe('#ff0000');
  });

  it('drops coordinates outside the board instead of writing past the end', () => {
    const written = applyCellEdits([
      { x: -1, y: 0, color: '#ff0000' },
      { x: 0, y: -1, color: '#ff0000' },
      { x: 4, y: 0, color: '#ff0000' },
      { x: 0, y: 4, color: '#ff0000' },
      { x: 999, y: 999, color: '#ff0000' },
    ]);
    expect(written).toBe(0);
    expect(s().colorMap.every((c) => c === '')).toBe(true);
  });

  it('keeps the map exactly as long as the board', () => {
    applyCellEdits([{ x: 9, y: 9, color: '#ff0000' }]);
    expect(s().colorMap).toHaveLength(16);
  });

  it('erasing resets the shape and rotation with the colour', () => {
    applyCellEdits([{ x: 0, y: 0, color: '#ff0000', shape: 'triangle', rotation: 2 }]);
    applyCellEdits([{ x: 0, y: 0, color: '' }]);
    // A cleared cell that kept a triangle would reappear as one on the next paint.
    expect(s().shapeMap[0]).toBe('square');
    expect(s().rotationMap[0]).toBe(0);
  });

  it('writes shape alone without touching colour', () => {
    applyCellEdits([{ x: 1, y: 1, color: '#ff0000' }]);
    applyCellEdits([{ x: 1, y: 1, shape: 'triangle' }]);
    expect(s().colorMap[5]).toBe('#ff0000');
    expect(s().shapeMap[5]).toBe('triangle');
  });

  it('writes a whole batch in one go', () => {
    const edits = Array.from({ length: 16 }, (_, i) => ({ x: i % 4, y: Math.floor(i / 4), color: '#ff0000' }));
    expect(applyCellEdits(edits)).toBe(16);
    expect(s().colorMap.every((c) => c === '#ff0000')).toBe(true);
  });
});

describe('applyDepthEdits', () => {
  it('clamps into the range a cell can hold', () => {
    applyDepthEdits([{ x: 0, y: 0, depth: 999 }, { x: 1, y: 0, depth: -5 }]);
    expect(s().depthMap[0]).toBe(32);
    expect(s().depthMap[1]).toBe(0);
  });

  it('rounds a fractional depth rather than storing it', () => {
    applyDepthEdits([{ x: 0, y: 0, depth: 3.7 }]);
    expect(s().depthMap[0]).toBe(4);
  });

  it('drops out of bounds coordinates', () => {
    expect(applyDepthEdits([{ x: 99, y: 99, depth: 4 }])).toBe(0);
  });
});

describe('linePoints', () => {
  it('includes both ends', () => {
    const points = linePoints(0, 0, 3, 0);
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points[points.length - 1]).toEqual({ x: 3, y: 0 });
  });

  it('returns a single cell when both ends are the same', () => {
    expect(linePoints(2, 2, 2, 2)).toEqual([{ x: 2, y: 2 }]);
  });

  it('walks a straight line one cell at a time', () => {
    expect(linePoints(0, 0, 3, 0)).toHaveLength(4);
    expect(linePoints(0, 0, 0, 3)).toHaveLength(4);
  });

  it('walks a diagonal without doubling back', () => {
    expect(linePoints(0, 0, 3, 3)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ]);
  });

  it('works in every direction', () => {
    expect(linePoints(3, 3, 0, 0)).toHaveLength(4);
    expect(linePoints(3, 0, 0, 3)).toHaveLength(4);
  });

  it('never repeats a cell', () => {
    const points = linePoints(0, 0, 7, 3);
    const keys = points.map((p) => `${p.x},${p.y}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
