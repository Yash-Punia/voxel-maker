import type { Voxel } from '../types';

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

export function exportPly(voxels: Voxel[], filename = 'voxel-studio.ply'): void {
  const voxelSet = new Set(voxels.map((v) => `${v.x},${v.y},${v.z}`));
  const vertices: string[] = [];
  const faces: string[] = [];

  const DIRS = [
    { dx: 1, dy: 0, dz: 0, corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]] },
    { dx: -1, dy: 0, dz: 0, corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]] },
    { dx: 0, dy: 1, dz: 0, corners: [[0,1,0],[0,1,1],[1,1,1],[1,1,0]] },
    { dx: 0, dy: -1, dz: 0, corners: [[0,0,1],[0,0,0],[1,0,0],[1,0,1]] },
    { dx: 0, dy: 0, dz: 1, corners: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]] },
    { dx: 0, dy: 0, dz: -1, corners: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]] },
  ];

  let vIdx = 0;
  for (const voxel of voxels) {
    const { x, y, z, color } = voxel;
    const [r, g, b] = hexToRgb(color);

    for (const dir of DIRS) {
      if (voxelSet.has(`${x + dir.dx},${y + dir.dy},${z + dir.dz}`)) continue;
      const start = vIdx;
      for (const [cx, cy, cz] of dir.corners) {
        vertices.push(`${x + cx} ${y + cy} ${z + cz} ${r} ${g} ${b}`);
        vIdx++;
      }
      faces.push(`4 ${start} ${start + 1} ${start + 2} ${start + 3}`);
    }
  }

  const header = [
    'ply',
    'format ascii 1.0',
    'comment Voxel Studio Export',
    `element vertex ${vertices.length}`,
    'property float x',
    'property float y',
    'property float z',
    'property uchar red',
    'property uchar green',
    'property uchar blue',
    `element face ${faces.length}`,
    'property list uchar int vertex_indices',
    'end_header',
  ];

  const content = [...header, ...vertices, ...faces].join('\n');
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
