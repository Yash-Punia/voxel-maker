import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import type { Voxel } from '../types';

function hexToColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

export function buildVoxelScene(voxels: Voxel[]): THREE.Scene {
  const scene = new THREE.Scene();
  const colorGroups = new Map<string, THREE.InstancedMesh>();
  const countByColor = new Map<string, number>();

  for (const v of voxels) {
    countByColor.set(v.color, (countByColor.get(v.color) ?? 0) + 1);
  }

  const geo = new THREE.BoxGeometry(1, 1, 1);
  for (const [color, count] of countByColor) {
    const mat = new THREE.MeshStandardMaterial({ color: hexToColor(color) });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    colorGroups.set(color, mesh);
  }

  const usedCount = new Map<string, number>();
  const dummy = new THREE.Object3D();
  for (const v of voxels) {
    const mesh = colorGroups.get(v.color)!;
    const idx = usedCount.get(v.color) ?? 0;
    dummy.position.set(v.x + 0.5, v.y + 0.5, v.z + 0.5);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    usedCount.set(v.color, idx + 1);
  }

  for (const mesh of colorGroups.values()) {
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
  }

  return scene;
}

export function exportGltf(voxels: Voxel[], binary = false, filename = 'voxel-studio'): void {
  const scene = buildVoxelScene(voxels);
  const exporter = new GLTFExporter();
  exporter.parse(
    scene,
    (result) => {
      if (binary) {
        const blob = new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' });
        downloadBlob(blob, `${filename}.glb`);
      } else {
        const json = JSON.stringify(result, null, 2);
        const blob = new Blob([json], { type: 'model/gltf+json' });
        downloadBlob(blob, `${filename}.gltf`);
      }
    },
    (error) => console.error('GLTFExporter error:', error),
    { binary }
  );
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
