// The 4-bit auto-tile vocabulary. It lives here rather than in the exporter
// because the asset rail needs it to draw four checkboxes, and importing the
// exporter for that would pull the whole thing into the main bundle and undo
// its code splitting.

export const TILE_BITS = { north: 1, east: 2, south: 4, west: 8 } as const;

export const TILE_COUNT = 16;

/** The sides a mask says have a matching neighbour. */
export function tileSides(mask: number): string[] {
  return Object.entries(TILE_BITS)
    .filter(([, bit]) => (mask & bit) !== 0)
    .map(([name]) => name);
}
