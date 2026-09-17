import type { Asset, MeshData } from '../types';
import { createOffscreenScene } from '../core/offscreen-render';
import { toast } from '../core/toast';

// A 4-bit auto-tile set: sixteen variants indexed by which sides have a matching
// neighbour. An engine indexes the sheet by that number directly, so the order
// is the contract and the JSON states it rather than leaving it to be inferred.

export const TILE_BITS = { north: 1, east: 2, south: 4, west: 8 } as const;
const TILE_COUNT = 16;

export interface TilesetOptions {
  cellSize: number;
  pitch: number;
  filename?: string;
}

/** Each entry is one masked asset and the mesh already computed for it. */
export interface TilesetEntry {
  asset: Asset;
  mesh: MeshData;
}

function sideNames(mask: number): string[] {
  return Object.entries(TILE_BITS)
    .filter(([, bit]) => (mask & bit) !== 0)
    .map(([name]) => name);
}

export function exportTileset(entries: TilesetEntry[], opts: TilesetOptions): void {
  const { cellSize, pitch, filename = 'voxbrush' } = opts;

  // One slot per mask. A later asset with the same mask wins, which is what a
  // person redrawing a variant expects.
  const slots = new Array<TilesetEntry | undefined>(TILE_COUNT);
  for (const entry of entries) {
    const mask = entry.asset.tileMask;
    if (mask === undefined || mask < 0 || mask > 15) continue;
    if (entry.mesh.positions.length === 0) continue;
    slots[mask] = entry;
  }

  const present = slots.filter(Boolean).length;
  if (present === 0) {
    toast.error('No tiles to export', 'Give at least one asset a tile mask first.');
    return;
  }
  if (present < TILE_COUNT) {
    toast.warning(
      'The tileset is incomplete',
      `${present} of ${TILE_COUNT} variants have an asset. The missing slots export as empty cells.`,
    );
  }

  const sheet = document.createElement('canvas');
  sheet.width = cellSize * TILE_COUNT;
  sheet.height = cellSize;
  const ctx = sheet.getContext('2d')!;

  slots.forEach((entry, mask) => {
    if (!entry) return;
    const scene = createOffscreenScene(entry.mesh, { size: cellSize, camera: 'orthographic', pitch });
    scene.render(0);
    ctx.drawImage(scene.canvas, mask * cellSize, 0);
    scene.dispose();
  });

  const metadata = {
    version: 1,
    kind: '4-bit-autotile',
    image: `${filename}_tileset.png`,
    cellWidth: cellSize,
    cellHeight: cellSize,
    columns: TILE_COUNT,
    rows: 1,
    bits: TILE_BITS,
    tiles: slots.map((entry, mask) => ({
      mask,
      x: mask * cellSize,
      y: 0,
      w: cellSize,
      h: cellSize,
      sides: sideNames(mask),
      asset: entry?.asset.name ?? null,
    })),
  };

  sheet.toBlob((blob) => {
    if (blob) download(blob, `${filename}_tileset.png`);
  }, 'image/png');
  download(
    new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' }),
    `${filename}_tileset.json`,
  );
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
