import type { Voxel } from '../types';

interface Face {
  v: [number, number, number, number]; // quad vertex indices (1-based)
  matName: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

// 6 faces per voxel: +X, -X, +Y, -Y, +Z, -Z
// Each face is a quad; we'll skip faces shared between two voxels
export function exportObj(voxels: Voxel[], filename = 'voxel-studio'): void {
  const voxelSet = new Set(voxels.map((v) => `${v.x},${v.y},${v.z}`));

  const vertices: string[] = [];
  const faces: Face[] = [];
  const colorMap = new Map<string, string>(); // hex -> matName

  let vIdx = 0;

  const DIRS = [
    { dx: 1, dy: 0, dz: 0, name: '+x', corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]] },
    { dx: -1, dy: 0, dz: 0, name: '-x', corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]] },
    { dx: 0, dy: 1, dz: 0, name: '+y', corners: [[0,1,0],[0,1,1],[1,1,1],[1,1,0]] },
    { dx: 0, dy: -1, dz: 0, name: '-y', corners: [[0,0,1],[0,0,0],[1,0,0],[1,0,1]] },
    { dx: 0, dy: 0, dz: 1, name: '+z', corners: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]] },
    { dx: 0, dy: 0, dz: -1, name: '-z', corners: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]] },
  ];

  for (const voxel of voxels) {
    const { x, y, z, color } = voxel;
    const matName = 'mat_' + color.slice(1);
    if (!colorMap.has(color)) colorMap.set(color, matName);

    for (const dir of DIRS) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      const nz = z + dir.dz;
      if (voxelSet.has(`${nx},${ny},${nz}`)) continue; // hidden face

      const faceVerts: number[] = [];
      for (const [cx, cy, cz] of dir.corners) {
        vertices.push(`v ${x + cx} ${y + cy} ${z + cz}`);
        faceVerts.push(++vIdx);
      }
      faces.push({
        v: faceVerts as [number, number, number, number],
        matName,
      });
    }
  }

  // Build .obj
  const obj: string[] = [
    '# Voxel Studio Export',
    `mtllib ${filename}.mtl`,
    '',
    ...vertices,
    '',
  ];

  let currentMat = '';
  for (const face of faces) {
    if (face.matName !== currentMat) {
      obj.push(`usemtl ${face.matName}`);
      currentMat = face.matName;
    }
    obj.push(`f ${face.v[0]} ${face.v[1]} ${face.v[2]} ${face.v[3]}`);
  }

  // Build .mtl
  const mtl: string[] = ['# Voxel Studio Materials', ''];
  for (const [hex, matName] of colorMap) {
    const [r, g, b] = hexToRgb(hex);
    mtl.push(`newmtl ${matName}`);
    mtl.push(`Kd ${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)}`);
    mtl.push(`Ka 0.1 0.1 0.1`);
    mtl.push(`Ks 0.0 0.0 0.0`);
    mtl.push('');
  }

  downloadText(obj.join('\n'), `${filename}.obj`);
  downloadText(mtl.join('\n'), `${filename}.mtl`);
}

function downloadText(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
