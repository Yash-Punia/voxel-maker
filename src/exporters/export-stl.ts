import type { MeshData } from '../types';

// Binary STL format:
// 80-byte header | 4-byte triangle count | per triangle: 12-byte normal + 3×12-byte vertex + 2-byte attribute

export function exportStl(mesh: MeshData, filename = 'voxbrush.stl'): void {
  const { positions, normals, indices } = mesh;
  const triCount = indices.length / 3;

  const buffer = new ArrayBuffer(80 + 4 + triCount * 50);
  const view = new DataView(buffer);

  // 80-byte header (ASCII, zero-padded)
  const header = 'VoxBrush STL Export';
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
  }

  view.setUint32(80, triCount, true);

  let offset = 84;
  for (let f = 0; f < triCount; f++) {
    const ia = indices[f * 3];
    const ib = indices[f * 3 + 1];
    const ic = indices[f * 3 + 2];

    // Face normal — average vertex normals
    const nx = (normals[ia * 3] + normals[ib * 3] + normals[ic * 3]) / 3;
    const ny = (normals[ia * 3 + 1] + normals[ib * 3 + 1] + normals[ic * 3 + 1]) / 3;
    const nz = (normals[ia * 3 + 2] + normals[ib * 3 + 2] + normals[ic * 3 + 2]) / 3;

    view.setFloat32(offset, nx, true); offset += 4;
    view.setFloat32(offset, ny, true); offset += 4;
    view.setFloat32(offset, nz, true); offset += 4;

    for (const vi of [ia, ib, ic]) {
      view.setFloat32(offset, positions[vi * 3],     true); offset += 4;
      view.setFloat32(offset, positions[vi * 3 + 1], true); offset += 4;
      view.setFloat32(offset, positions[vi * 3 + 2], true); offset += 4;
    }

    view.setUint16(offset, 0, true); offset += 2; // attribute byte count
  }

  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
