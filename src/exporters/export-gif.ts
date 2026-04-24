import * as THREE from 'three';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import type { MeshData } from '../types';

export interface GifExportOptions {
  frames?: number;       // number of frames (default 36 = 10° per frame)
  size?: number;         // output width/height in pixels (default 256)
  delay?: number;        // ms per frame (default 60)
  background?: string;   // CSS color (default #111116)
  filename?: string;
}

export async function exportGif(mesh: MeshData, opts: GifExportOptions = {}): Promise<void> {
  const {
    frames = 36,
    size = 256,
    delay = 60,
    background = '#111116',
    filename = 'voxbrush-turntable.gif',
  } = opts;

  if (mesh.positions.length === 0) {
    alert('Nothing to export — the canvas is empty.');
    return;
  }

  // ── offscreen scene setup ───────────────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(size, size, false);
  renderer.setClearColor(new THREE.Color(background), 1);

  const scene = new THREE.Scene();

  // Lights — mirror the main scene's lighting for consistent shading.
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(5, 10, 7);
  scene.add(dir);

  // Mesh
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(mesh.positions, 3));
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(mesh.normals,   3));
  geo.setAttribute('color',    new THREE.Float32BufferAttribute(mesh.colors,    3));
  geo.setIndex(mesh.indices);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();

  const material = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const modelMesh = new THREE.Mesh(geo, material);

  // Center mesh at origin for clean turntable rotation.
  const bbox = geo.boundingBox!;
  const center = new THREE.Vector3();
  bbox.getCenter(center);
  modelMesh.position.sub(center);

  const pivot = new THREE.Group();
  pivot.add(modelMesh);
  scene.add(pivot);

  // Camera — fit model in frame
  const sphere = geo.boundingSphere!;
  const radius = sphere.radius;
  const fov = 35;
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, radius * 20);
  const dist = radius / Math.sin((fov / 2) * Math.PI / 180) * 1.2;
  camera.position.set(0, radius * 0.4, dist);
  camera.lookAt(0, 0, 0);

  // ── frame capture ───────────────────────────────────────────────────────────
  const gif = GIFEncoder();
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.canvas.width = size;
  ctx.canvas.height = size;

  for (let i = 0; i < frames; i++) {
    pivot.rotation.y = (i / frames) * Math.PI * 2;
    renderer.render(scene, camera);

    // Copy WebGL canvas to a 2D canvas to read ImageData.
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(canvas, 0, 0);
    const { data } = ctx.getImageData(0, 0, size, size);

    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, size, size, { palette, delay });
  }

  gif.finish();

  // ── cleanup + download ─────────────────────────────────────────────────────
  geo.dispose();
  material.dispose();
  renderer.dispose();

  const blob = new Blob([gif.bytes() as unknown as BlobPart], { type: 'image/gif' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
