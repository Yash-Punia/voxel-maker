import type { ColorMap, DepthMap, ExtrusionMode, Voxel } from '../types';
import { cellCoords } from './grid-utils';

export function computeVoxels(
  colorMap: ColorMap,
  depthMap: DepthMap,
  w: number,
  h: number,
  mode: ExtrusionMode
): Voxel[] {
  const voxels: Voxel[] = [];

  for (let i = 0; i < colorMap.length; i++) {
    const color = colorMap[i];
    if (!color) continue; // transparent

    const depth = depthMap[i] ?? 1;
    if (depth === 0) continue; // suppressed

    const { x, y } = cellCoords(i, w);
    // Flip Y: canvas Y=0 is top, Three.js Y increases upward
    const ty = h - 1 - y;

    if (mode === 'symmetric') {
      // Integer voxel stack centered as close to z=0 as possible.
      // Each voxel at integer z occupies cube [z, z+1], so a stack of N voxels
      // starting at zStart has its physical center at zStart + N/2.
      // For even N that center is exactly 0; for odd N it lands at 0.5.
      // Subtract 0.5 from every z when N is odd so the physical center is always 0.
      const zStart = -Math.floor(depth / 2);
      const zEnd   =  Math.ceil(depth / 2);
      const zOffset = depth % 2 === 1 ? -0.5 : 0; // center odd stacks at z=0
      for (let zi = zStart; zi < zEnd; zi++) {
        voxels.push({ x, y: ty, z: zi + zOffset, color });
      }
    } else {
      // single-sided: z in [0, depth)
      for (let z = 0; z < depth; z++) {
        voxels.push({ x, y: ty, z, color });
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
