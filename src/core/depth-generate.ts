import type { ColorMap, DepthMap } from '../types';

export type DepthGenMode = 'luminosity' | 'color-index' | 'noise';

export interface DepthGenOptions {
  min: number;   // minimum depth for filled cells (1–32)
  max: number;   // maximum depth for filled cells (1–32)
  invert: boolean;
  seed?: number; // for noise mode
}

// ── helpers ───────────────────────────────────────────────────────────────────

function hexToLuminosity(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  // Relative luminance (perceptual)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Simple seeded LCG random — returns next value and updated seed
function lcg(seed: number): { value: number; next: number } {
  const next = (seed * 1664525 + 1013904223) & 0xffffffff;
  return { value: (next >>> 0) / 0xffffffff, next };
}

function mapRange(t: number, min: number, max: number, invert: boolean): number {
  const v = invert ? 1 - t : t;
  return Math.round(min + v * (max - min));
}

// ── generateDepth ──────────────────────────────────────────────────────────────

export function generateDepth(
  colorMap: ColorMap,
  mode: DepthGenMode,
  palette: string[],
  options: DepthGenOptions,
): DepthMap {
  const { min, max, invert, seed = 42 } = options;
  const clampedMin = Math.max(1, Math.min(32, min));
  const clampedMax = Math.max(clampedMin, Math.min(32, max));

  const result: DepthMap = new Array(colorMap.length).fill(1);

  // Build palette lookup for color-index mode
  const paletteIndex = new Map<string, number>();
  palette.forEach((c, i) => { if (c) paletteIndex.set(c.toLowerCase(), i); });
  const paletteSize = palette.filter(Boolean).length;

  let noiseSeed = seed;

  for (let i = 0; i < colorMap.length; i++) {
    const color = colorMap[i];
    if (!color) {
      result[i] = 0;
      continue;
    }

    let t: number;

    if (mode === 'luminosity') {
      t = hexToLuminosity(color);
    } else if (mode === 'color-index') {
      const idx = paletteIndex.get(color.toLowerCase()) ?? 0;
      t = paletteSize > 1 ? idx / (paletteSize - 1) : 0;
    } else {
      // noise
      const rng = lcg(noiseSeed + i);
      t = rng.value;
      noiseSeed = rng.next;
    }

    result[i] = mapRange(t, clampedMin, clampedMax, invert);
  }

  return result;
}
