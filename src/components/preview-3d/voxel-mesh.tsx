import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useStore } from '../../store';
import { computeShapeMesh } from '../../core/depth-ops';

export function VoxelMesh() {
  const colorMap = useStore((s) => s.colorMap);
  const depthMap = useStore((s) => s.depthMap);
  const shapeMap = useStore((s) => s.shapeMap);
  const rotationMap = useStore((s) => s.rotationMap);
  const gridWidth = useStore((s) => s.gridWidth);
  const gridHeight = useStore((s) => s.gridHeight);
  const extrusionMode = useStore((s) => s.extrusionMode);
  const depthMultiplier = useStore((s) => s.depthMultiplier);

  const geometry = useMemo(() => {
    const mesh = computeShapeMesh(
      colorMap, depthMap, shapeMap, rotationMap,
      gridWidth, gridHeight, extrusionMode, depthMultiplier
    );
    if (mesh.positions.length === 0) return null;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(mesh.positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(mesh.normals, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(mesh.colors, 3));
    geo.setIndex(mesh.indices);
    return geo;
  }, [colorMap, depthMap, shapeMap, rotationMap, gridWidth, gridHeight, extrusionMode, depthMultiplier]);

  // The preview never unmounts, so every edit would otherwise leave its old
  // buffers on the GPU.
  const previous = useRef<THREE.BufferGeometry | null>(null);
  useEffect(() => {
    const stale = previous.current;
    previous.current = geometry;
    if (stale && stale !== geometry) stale.dispose();
  }, [geometry]);
  useEffect(() => () => previous.current?.dispose(), []);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors side={THREE.DoubleSide} />
    </mesh>
  );
}
