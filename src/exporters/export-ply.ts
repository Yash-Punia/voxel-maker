import type { MeshData } from '../types';

export function exportPly(mesh: MeshData, filename = 'voxel-studio.ply'): void {
  const { positions, normals, colors, indices } = mesh;
  const vertexCount = positions.length / 3;
  const faceCount = indices.length / 3;

  const header = [
    'ply',
    'format ascii 1.0',
    'comment Voxel Studio Export',
    `element vertex ${vertexCount}`,
    'property float x',
    'property float y',
    'property float z',
    'property float nx',
    'property float ny',
    'property float nz',
    'property uchar red',
    'property uchar green',
    'property uchar blue',
    `element face ${faceCount}`,
    'property list uchar int vertex_indices',
    'end_header',
  ];

  const vertexLines: string[] = [];
  for (let i = 0; i < vertexCount; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    const nx = normals[i * 3];
    const ny = normals[i * 3 + 1];
    const nz = normals[i * 3 + 2];
    const r = Math.round(colors[i * 3] * 255);
    const g = Math.round(colors[i * 3 + 1] * 255);
    const b = Math.round(colors[i * 3 + 2] * 255);
    vertexLines.push(`${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)} ${nx.toFixed(6)} ${ny.toFixed(6)} ${nz.toFixed(6)} ${r} ${g} ${b}`);
  }

  const faceLines: string[] = [];
  for (let f = 0; f < faceCount; f++) {
    const a = indices[f * 3];
    const b = indices[f * 3 + 1];
    const c = indices[f * 3 + 2];
    faceLines.push(`3 ${a} ${b} ${c}`);
  }

  const content = [...header, ...vertexLines, ...faceLines].join('\n');
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
