import * as THREE from 'three';
import type { MeshData } from '../types';

// One offscreen WebGL scene, shared by every exporter that renders the model to
// pixels. Keeping it here means the turntable and the sprite sheet cannot drift
// apart in lighting, framing or material.
//
// Every scene is temporary, so the caller must call dispose(). A leaked context
// is not freed by the garbage collector and browsers cap how many exist.

export interface OffscreenSceneOptions {
  /** Square output edge in pixels. */
  size: number;
  /** CSS colour. Omit for a transparent background. */
  background?: string;
  camera?: 'perspective' | 'orthographic';
  /** Degrees above the horizon. Omit to keep the legacy turntable placement. */
  pitch?: number;
}

export interface OffscreenScene {
  canvas: HTMLCanvasElement;
  /** Turns around the Y axis, 0 to 1. */
  render(yawTurns: number): void;
  /** Swap the mesh material, or pass null to restore the vertex-colour one. */
  setMaterial(material: THREE.Material | null): void;
  dispose(): void;
}

export function createOffscreenScene(
  mesh: MeshData,
  { size, background, camera: cameraKind = 'perspective', pitch }: OffscreenSceneOptions,
): OffscreenScene {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const transparent = background === undefined;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true,
    alpha: transparent,
  });
  renderer.setSize(size, size, false);
  if (transparent) renderer.setClearColor(0x000000, 0);
  else renderer.setClearColor(new THREE.Color(background), 1);

  const scene = new THREE.Scene();

  // Mirror the main scene's lighting so an export shades like the preview.
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(5, 10, 7);
  scene.add(dir);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(mesh.positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(mesh.normals, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(mesh.colors, 3));
  geo.setIndex(mesh.indices);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();

  const baseMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide });
  // Typed to the Material base so the normal pass can swap a different one in.
  const modelMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> = new THREE.Mesh(geo, baseMaterial);

  // Centre the model so it turns about its own middle.
  const center = new THREE.Vector3();
  geo.boundingBox!.getCenter(center);
  modelMesh.position.sub(center);

  const pivot = new THREE.Group();
  pivot.add(modelMesh);
  scene.add(pivot);

  const radius = geo.boundingSphere!.radius;
  const fov = 35;
  const dist = (radius / Math.sin(((fov / 2) * Math.PI) / 180)) * 1.2;

  let camera: THREE.Camera;
  if (cameraKind === 'orthographic') {
    // Sprite cells must tile on a grid, so the footprint cannot change with
    // distance. Only an orthographic camera gives that.
    const half = radius * 1.2;
    camera = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, dist * 20);
  } else {
    camera = new THREE.PerspectiveCamera(fov, 1, 0.1, radius * 20);
  }

  if (pitch === undefined) {
    // The turntable's original placement, kept exactly so its output does not shift.
    camera.position.set(0, radius * 0.4, dist);
  } else {
    const p = (pitch * Math.PI) / 180;
    camera.position.set(0, dist * Math.sin(p), dist * Math.cos(p));
  }
  camera.lookAt(0, 0, 0);

  let override: THREE.Material | null = null;

  return {
    canvas,

    render(yawTurns: number) {
      pivot.rotation.y = yawTurns * Math.PI * 2;
      renderer.render(scene, camera);
    },

    setMaterial(material) {
      override?.dispose();
      override = material;
      modelMesh.material = material ?? baseMaterial;
    },

    dispose() {
      override?.dispose();
      geo.dispose();
      baseMaterial.dispose();
      renderer.dispose();
    },
  };
}
