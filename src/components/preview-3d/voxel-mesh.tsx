import { useMemo } from 'react';
import * as THREE from 'three';
import { useStore } from '../../store';
import { computeVoxels } from '../../core/depth-ops';

// 6 face directions: normal + 4 corner offsets
const FACES = [
  { normal: [1, 0, 0], corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]] },
  { normal: [-1, 0, 0], corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]] },
  { normal: [0, 1, 0], corners: [[0,1,0],[0,1,1],[1,1,1],[1,1,0]] },
  { normal: [0, -1, 0], corners: [[0,0,1],[0,0,0],[1,0,0],[1,0,1]] },
  { normal: [0, 0, 1], corners: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]] },
  { normal: [0, 0, -1], corners: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]] },
];

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

export function VoxelMesh() {
  const { colorMap, depthMap, shapeMap, rotationMap, gridWidth, gridHeight, extrusionMode } = useStore();

  const geometry = useMemo(() => {
    const voxels = computeVoxels(colorMap, depthMap, gridWidth, gridHeight, extrusionMode, shapeMap, rotationMap);
    const voxelSet = new Set(voxels.map((v) => `${v.x},${v.y},${v.z}`));

    // Center the grid around origin so X=horizontal, Y=vertical, Z=depth
    const ox = -gridWidth / 2;
    const oy = -gridHeight / 2;

    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    let vIdx = 0;

    for (const voxel of voxels) {
      const { x, y, z, color } = voxel;
      const [r, g, b] = hexToRgb(color);
      // Apply centering offset
      const wx = x + ox;
      const wy = y + oy;

      for (const face of FACES) {
        const [nx, ny, nz] = face.normal;
        const neighbor = `${x + nx},${y + ny},${z + nz}`;
        if (voxelSet.has(neighbor)) continue; // hidden face

        const base = vIdx;
        for (const [cx, cy, cz] of face.corners) {
          positions.push(wx + cx, wy + cy, z + cz);
          normals.push(nx, ny, nz);
          colors.push(r, g, b);
          vIdx++;
        }
        // Two triangles per quad
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }

    if (positions.length === 0) return null;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    return geo;
  }, [colorMap, depthMap, shapeMap, rotationMap, gridWidth, gridHeight, extrusionMode]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors side={THREE.FrontSide} />
    </mesh>
  );
}
