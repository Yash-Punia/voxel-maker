import type { Asset } from '../types';

// What the project already looks like, measured rather than described. The
// assistant is given this so a new asset comes out matching the ones beside it.
//
// This is the answer to the only complaint asset packs cannot fix: every indie
// game built from a pack looks like that pack. A set is worth paying for when it
// looks like the person's own game, and matching means matching something
// measurable, not a word like "cosy" in a prompt.

export interface StyleProfile {
  /** Palette entries actually used, commonest first. */
  colors: { index: number; color: string; share: number }[];
  /** Shape ids actually used, commonest first. */
  shapes: { id: string; share: number }[];
  depth: { min: number; max: number; median: number };
  /** Painted cells as a share of the board, averaged over the assets. */
  density: number;
  /** The commonest board size in the project. */
  size: { width: number; height: number };
  /** How many painted assets this was measured from. */
  sampleSize: number;
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function topShares<T extends string | number>(counts: Map<T, number>, total: number, limit: number) {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, n]) => ({ key, share: total > 0 ? n / total : 0 }));
}

/** Returns null when there is not enough painted work to describe a style. One
 *  barely-painted board is noise, and a made-up profile is worse than none. */
export function deriveStyleProfile(assets: Asset[], palette: string[]): StyleProfile | null {
  const colorCounts = new Map<string, number>();
  const shapeCounts = new Map<string, number>();
  const sizeCounts = new Map<string, number>();
  const depths: number[] = [];
  const densities: number[] = [];
  let painted = 0;
  let sampleSize = 0;

  for (const asset of assets) {
    for (const frame of asset.frames) {
      let framePainted = 0;
      for (let i = 0; i < frame.colorMap.length; i++) {
        const color = frame.colorMap[i];
        if (!color) continue;
        framePainted++;
        painted++;
        colorCounts.set(color, (colorCounts.get(color) ?? 0) + 1);
        shapeCounts.set(frame.shapeMap[i], (shapeCounts.get(frame.shapeMap[i]) ?? 0) + 1);
        depths.push(frame.depthMap[i]);
      }
      if (framePainted === 0) continue;
      sampleSize++;
      densities.push(framePainted / frame.colorMap.length);
      const key = `${asset.gridWidth}x${asset.gridHeight}`;
      sizeCounts.set(key, (sizeCounts.get(key) ?? 0) + 1);
    }
  }

  // Under this there is no pattern to match, only one person's first few cells.
  if (sampleSize === 0 || painted < 24) return null;

  depths.sort((a, b) => a - b);
  const commonSize = [...sizeCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const [width, height] = commonSize.split('x').map(Number);

  return {
    colors: topShares(colorCounts, painted, 12).map(({ key, share }) => ({
      index: palette.indexOf(key as string),
      color: key as string,
      share,
    })),
    shapes: topShares(shapeCounts, painted, 6).map(({ key, share }) => ({
      id: key as string,
      share,
    })),
    depth: { min: depths[0], max: depths[depths.length - 1], median: median(depths) },
    density: densities.reduce((a, b) => a + b, 0) / densities.length,
    size: { width, height },
    sampleSize,
  };
}

const pct = (n: number): string => `${Math.round(n * 100)}%`;

/** The profile as prompt text. Kept short: this rides on every request. */
export function describeStyleProfile(profile: StyleProfile): string {
  const colors = profile.colors
    .map((c) => `${c.color}${c.index >= 0 ? ` (slot ${c.index})` : ''} ${pct(c.share)}`)
    .join(', ');
  const shapes = profile.shapes.map((s) => `${s.id} ${pct(s.share)}`).join(', ');

  return [
    `This project already has ${profile.sampleSize} painted board${profile.sampleSize === 1 ? '' : 's'}. Anything you add has to sit beside them, so match what they do:`,
    `- Colours in use, commonest first: ${colors}. Prefer these over other palette slots, and do not invent colours outside the palette.`,
    `- Shapes in use: ${shapes}. A project that never uses a shape is making that choice.`,
    `- Depth runs ${profile.depth.min} to ${profile.depth.max}, typically ${profile.depth.median}. Stay in that range so one asset does not tower over the rest.`,
    `- Boards are usually ${profile.size.width} by ${profile.size.height} and about ${pct(profile.density)} filled. A much denser or emptier asset reads as a different set.`,
  ].join('\n');
}
