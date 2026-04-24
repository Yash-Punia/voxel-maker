import type { Voxel } from '../types';

function hexToRgba(hex: string): [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b, 255];
}

// Quantize colors to at most 255 unique entries (index 0 reserved)
function buildPalette(voxels: Voxel[]): { palette: string[]; indexMap: Map<string, number> } {
  const seen = new Set<string>();
  for (const v of voxels) seen.add(v.color);

  const colors = Array.from(seen).slice(0, 255);
  const indexMap = new Map<string, number>();
  colors.forEach((c, i) => indexMap.set(c, i + 1));

  return { palette: colors, indexMap };
}

export function exportVox(voxels: Voxel[], filename = 'voxbrush.vox'): void {
  // .vox uses integer coords; round z (may be ±0.5 for odd symmetric depths) and
  // shift the entire model so all coords are non-negative.
  const minZ = voxels.length ? Math.min(...voxels.map((v) => Math.round(v.z))) : 0;
  const zShift = minZ < 0 ? -minZ : 0;

  const intVoxels = voxels.map((v) => ({ ...v, z: Math.round(v.z) + zShift }));

  // Guard: .vox max is 256^3
  for (const v of intVoxels) {
    if (v.x > 255 || v.y > 255 || v.z > 255) {
      alert('Model exceeds MagicaVoxel 256³ limit. Some voxels will be clipped.');
      break;
    }
  }

  const clipped = intVoxels.filter((v) => v.x >= 0 && v.y >= 0 && v.z >= 0 && v.x <= 255 && v.y <= 255 && v.z <= 255);
  const { palette, indexMap } = buildPalette(clipped);

  // Size
  const maxX = clipped.reduce((m, v) => Math.max(m, v.x), 0) + 1;
  const maxY = clipped.reduce((m, v) => Math.max(m, v.y), 0) + 1;
  const maxZ = clipped.reduce((m, v) => Math.max(m, v.z), 0) + 1;

  // XYZI chunk: 4 bytes per voxel
  const xyziData = new Uint8Array(clipped.length * 4);
  clipped.forEach((v, i) => {
    // .vox is Z-up; swap Y and Z
    xyziData[i * 4 + 0] = v.x;
    xyziData[i * 4 + 1] = v.z; // .vox Y = our Z
    xyziData[i * 4 + 2] = v.y; // .vox Z = our Y
    xyziData[i * 4 + 3] = indexMap.get(v.color) ?? 1;
  });

  // RGBA chunk: 256 colors × 4 bytes
  const rgbaData = new Uint8Array(256 * 4);
  palette.forEach((hex, i) => {
    const [r, g, b, a] = hexToRgba(hex);
    rgbaData[(i + 1) * 4 + 0] = r;
    rgbaData[(i + 1) * 4 + 1] = g;
    rgbaData[(i + 1) * 4 + 2] = b;
    rgbaData[(i + 1) * 4 + 3] = a;
  });

  // Build chunks
  function makeChunk(id: string, content: Uint8Array): Uint8Array {
    const buf = new Uint8Array(4 + 4 + 4 + content.byteLength);
    const dv = new DataView(buf.buffer);
    // id
    for (let i = 0; i < 4; i++) dv.setUint8(i, id.charCodeAt(i));
    dv.setUint32(4, content.byteLength, true); // content size
    dv.setUint32(8, 0, true); // children size
    buf.set(content, 12);
    return buf;
  }

  // SIZE chunk
  const sizeData = new Uint8Array(12);
  const sizeDv = new DataView(sizeData.buffer);
  sizeDv.setUint32(0, maxX, true);
  sizeDv.setUint32(4, maxZ, true); // .vox Y = our Z
  sizeDv.setUint32(8, maxY, true); // .vox Z = our Y

  const sizeChunk = makeChunk('SIZE', sizeData);
  const xyziChunk = makeChunk('XYZI', new Uint8Array([
    ...new Uint8Array(new Uint32Array([clipped.length]).buffer),
    ...xyziData,
  ]));
  const rgbaChunk = makeChunk('RGBA', rgbaData);

  // MAIN chunk wraps everything
  const children = new Uint8Array([...sizeChunk, ...xyziChunk, ...rgbaChunk]);
  const mainContent = new Uint8Array(0);
  const mainHeader = new Uint8Array(12);
  const mainDv = new DataView(mainHeader.buffer);
  mainDv.setUint8(0, 'M'.charCodeAt(0));
  mainDv.setUint8(1, 'A'.charCodeAt(0));
  mainDv.setUint8(2, 'I'.charCodeAt(0));
  mainDv.setUint8(3, 'N'.charCodeAt(0));
  mainDv.setUint32(4, mainContent.byteLength, true);
  mainDv.setUint32(8, children.byteLength, true);

  // File header: VOX + version
  const fileHeader = new Uint8Array(8);
  const fhDv = new DataView(fileHeader.buffer);
  fhDv.setUint8(0, 'V'.charCodeAt(0));
  fhDv.setUint8(1, 'O'.charCodeAt(0));
  fhDv.setUint8(2, 'X'.charCodeAt(0));
  fhDv.setUint8(3, ' '.charCodeAt(0));
  fhDv.setUint32(4, 150, true); // version

  const full = new Uint8Array([...fileHeader, ...mainHeader, ...children]);
  const blob = new Blob([full], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
