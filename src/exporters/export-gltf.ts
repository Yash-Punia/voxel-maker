import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import type { MeshData } from '../types';
import { buildAtlas } from '../core/texture-atlas';

export interface GltfOptions {
  atlas?: boolean;
}

export function buildMeshScene(mesh: MeshData): THREE.Scene {
  const scene = new THREE.Scene();

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(mesh.positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(mesh.normals, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(mesh.colors, 3));
  geo.setIndex(mesh.indices);

  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const threeMesh = new THREE.Mesh(geo, mat);
  scene.add(threeMesh);

  return scene;
}

function buildAtlasScene(mesh: MeshData, dataUrl: string): THREE.Scene {
  const scene = new THREE.Scene();

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(mesh.positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(mesh.normals, 3));
  geo.setIndex(mesh.indices);

  const atlas = buildAtlas(mesh);
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(atlas.uvs, 2));

  const img = new Image();
  img.src = dataUrl;
  const tex = new THREE.Texture(img);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  tex.name = 'atlas';

  const mat = new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide });
  const threeMesh = new THREE.Mesh(geo, mat);
  scene.add(threeMesh);

  return scene;
}

export function exportGltf(mesh: MeshData, binary = false, filename = 'voxel-studio', options: GltfOptions = {}): void {
  const ready = options.atlas
    ? buildAtlas(mesh).atlasDataUrl.then((url) => buildAtlasScene(mesh, url))
    : Promise.resolve(buildMeshScene(mesh));

  ready.then((scene) => {
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
      { binary, embedImages: true },
    );
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
