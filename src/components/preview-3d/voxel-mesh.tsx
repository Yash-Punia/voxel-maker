import { useMemo } from 'react';
import * as THREE from 'three';
import { useStore } from '../../store';
import { computeShapeMesh } from '../../core/depth-ops';

export function VoxelMesh() {
  const { colorMap, depthMap, shapeMap, rotationMap, gridWidth, gridHeight, extrusionMode } = useStore();

  const geometry = useMemo(() => {
    const mesh = computeShapeMesh(
      colorMap, depthMap, shapeMap, rotationMap,
      gridWidth, gridHeight, extrusionMode
    );
    if (mesh.positions.length === 0) return null;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(mesh.positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(mesh.normals, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(mesh.colors, 3));
    geo.setIndex(mesh.indices);
    return geo;
  }, [colorMap, depthMap, shapeMap, rotationMap, gridWidth, gridHeight, extrusionMode]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors side={THREE.DoubleSide} />
    </mesh>
  );
}
