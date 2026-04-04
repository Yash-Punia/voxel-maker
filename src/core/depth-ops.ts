import type { ColorMap, DepthMap, ShapeMap, RotationMap, ExtrusionMode, Voxel } from '../types';
import { cellCoords } from './grid-utils';

export function computeVoxels(
  colorMap: ColorMap,
  depthMap: DepthMap,
  w: number,
  h: number,
  mode: ExtrusionMode,
  shapeMap?: ShapeMap,
  rotationMap?: RotationMap
): Voxel[] {
  const voxels: Voxel[] = [];

  for (let i = 0; i < colorMap.length; i++) {
    const color = colorMap[i];
    if (!color) continue; // transparent

    const depth = depthMap[i] ?? 1;
    if (depth === 0) continue; // suppressed

    const shape = shapeMap?.[i] ?? 'square';
    const rotation = rotationMap?.[i] ?? 0;
    const { x, y } = cellCoords(i, w);
    // Flip Y: canvas Y=0 is top, Three.js Y increases upward
    const ty = h - 1 - y;

    if (mode === 'symmetric') {
      const zStart = -Math.floor(depth / 2);
      const zEnd   =  Math.ceil(depth / 2);
      const zOffset = depth % 2 === 1 ? -0.5 : 0;
      for (let zi = zStart; zi < zEnd; zi++) {
        voxels.push({ x, y: ty, z: zi + zOffset, color, shape, rotation });
      }
    } else {
      for (let z = 0; z < depth; z++) {
        voxels.push({ x, y: ty, z, color, shape, rotation });
      }
    }
  }

  return voxels;
}

export function depthToColor(depth: number): string {
  if (depth === 0) return 'hsl(0, 80%, 25%)'; // red tint for suppressed
  const brightness = 20 + Math.round((depth / 32) * 60);
  return `hsl(210, 60%, ${brightness}%)`;
}
