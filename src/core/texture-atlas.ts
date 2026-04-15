import type { MeshData } from '../types';

// Builds a small 1-pixel-per-color atlas PNG from a mesh's vertex colors
// and emits per-vertex UVs pointing to each color's atlas cell center.
// Atlas is laid out as a square grid (16×16 = 256 colors max) with
// nearest-neighbour filtering assumed at render time.

export interface AtlasResult {
  uvs: number[];               // 2 floats per vertex, same order as mesh.positions
  atlasBlob: Promise<Blob>;    // PNG blob of the atlas
  atlasDataUrl: Promise<string>; // data:image/png;base64,… (for inline formats)
  atlasWidth: number;
  atlasHeight: number;
  uniqueColors: string[];      // hex colors, index = atlas cell order
}

export function buildAtlas(mesh: MeshData): AtlasResult {
  const { colors } = mesh;
  const vertexCount = colors.length / 3;

  // ── collect unique colors (key by rounded RGB hex) ──────────────────────────
  const indexOf = new Map<string, number>();
  const uniqueColors: string[] = [];

  const keyAt = (vi: number): string => {
    const r = Math.round(colors[vi * 3] * 255);
    const g = Math.round(colors[vi * 3 + 1] * 255);
    const b = Math.round(colors[vi * 3 + 2] * 255);
    return `${r},${g},${b}`;
  };

  for (let vi = 0; vi < vertexCount; vi++) {
    const k = keyAt(vi);
    if (!indexOf.has(k)) {
      indexOf.set(k, uniqueColors.length);
      const [r, g, b] = k.split(',').map(Number);
      uniqueColors.push('#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join(''));
    }
  }

  // ── atlas layout: square grid padded to next power of 2 for GPU friendliness
  const count = Math.max(1, uniqueColors.length);
  const sideRaw = Math.ceil(Math.sqrt(count));
  const side = Math.max(4, nextPow2(sideRaw)); // min 4×4 for GPU sampling safety

  // ── paint the atlas canvas ──────────────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, side, side);
  uniqueColors.forEach((hex, i) => {
    const col = i % side;
    const row = Math.floor(i / side);
    ctx.fillStyle = hex;
    ctx.fillRect(col, row, 1, 1);
  });

  // ── per-vertex UVs: center of each color's cell, flipped V (image coords → GL)
  const uvs = new Array<number>(vertexCount * 2);
  for (let vi = 0; vi < vertexCount; vi++) {
    const idx = indexOf.get(keyAt(vi))!;
    const col = idx % side;
    const row = Math.floor(idx / side);
    const u = (col + 0.5) / side;
    const v = 1 - (row + 0.5) / side; // glTF V origin is bottom-left
    uvs[vi * 2] = u;
    uvs[vi * 2 + 1] = v;
  }

  const atlasBlob = new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('atlas toBlob failed'))), 'image/png');
  });

  const atlasDataUrl = Promise.resolve(canvas.toDataURL('image/png'));

  return { uvs, atlasBlob, atlasDataUrl, atlasWidth: side, atlasHeight: side, uniqueColors };
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export function downloadAtlas(atlasBlob: Promise<Blob>, filename: string): void {
  atlasBlob.then((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  });
}
