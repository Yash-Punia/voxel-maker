import * as THREE from 'three';
import type { MeshData } from '../types';
import { createOffscreenScene } from '../core/offscreen-render';
import { toast } from '../core/toast';

// Renders the model from several angles into one sheet, for 2.5D, isometric and
// top-down games. Ships a colour sheet, an optional normal map that matches it
// cell for cell, and a JSON file so an engine can place every cell without
// guessing the layout.

export interface SpriteSheetOptions {
  angles: number;
  cellSize: number;
  /** Degrees above the horizon. */
  pitch: number;
  normalMap: boolean;
  /** Unity reads the green channel the other way up. Godot does not. */
  flipGreen: boolean;
  filename?: string;
}

interface SheetCell {
  angle: number;
  frame: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

const METADATA_VERSION = 1;

// One frame row for now. The axis exists so adding frames later does not
// reshape the sheet or the metadata.
const ROWS = 1;

export function exportSpriteSheet(mesh: MeshData, opts: SpriteSheetOptions): void {
  const { angles, cellSize, pitch, normalMap, flipGreen, filename = 'voxbrush' } = opts;

  if (mesh.positions.length === 0) {
    toast.error('Nothing to export', 'The canvas is empty.');
    return;
  }

  const scene = createOffscreenScene(mesh, {
    size: cellSize,
    camera: 'orthographic',
    pitch,
  });

  const colour = paint(scene, angles, cellSize);

  let normal: HTMLCanvasElement | null = null;
  if (normalMap) {
    // View-space normals are what a 2D sprite light wants, so the material's
    // own output needs no conversion beyond the optional channel flip.
    scene.setMaterial(new THREE.MeshNormalMaterial({ side: THREE.DoubleSide }));
    normal = paint(scene, angles, cellSize);
    if (flipGreen) invertGreen(normal);
    scene.setMaterial(null);
  }

  scene.dispose();

  const cells: SheetCell[] = [];
  const angleList: number[] = [];
  for (let i = 0; i < angles; i++) {
    angleList.push(Math.round((i / angles) * 360));
    cells.push({ angle: angleList[i], frame: 0, x: i * cellSize, y: 0, w: cellSize, h: cellSize });
  }

  const metadata = {
    version: METADATA_VERSION,
    image: `${filename}_sheet.png`,
    ...(normal ? { normal: `${filename}_normal.png` } : {}),
    cellWidth: cellSize,
    cellHeight: cellSize,
    columns: angles,
    rows: ROWS,
    pitch,
    angleOrder: 'counter-clockwise',
    angles: angleList,
    cells,
  };

  downloadCanvas(colour, `${filename}_sheet.png`);
  if (normal) downloadCanvas(normal, `${filename}_normal.png`);
  downloadBlob(
    new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' }),
    `${filename}_sheet.json`,
  );
}

/** Draws every angle into one row of a fresh sheet canvas. */
function paint(
  scene: { canvas: HTMLCanvasElement; render: (yawTurns: number) => void },
  angles: number,
  cellSize: number,
): HTMLCanvasElement {
  const sheet = document.createElement('canvas');
  sheet.width = cellSize * angles;
  sheet.height = cellSize * ROWS;
  const ctx = sheet.getContext('2d')!;

  for (let i = 0; i < angles; i++) {
    scene.render(i / angles);
    ctx.drawImage(scene.canvas, i * cellSize, 0);
  }

  return sheet;
}

function invertGreen(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')!;
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = image;
  for (let i = 0; i < data.length; i += 4) {
    // Leave transparent pixels alone so empty space is never lit.
    if (data[i + 3] === 0) continue;
    data[i + 1] = 255 - data[i + 1];
  }
  ctx.putImageData(image, 0, 0);
}

function downloadCanvas(canvas: HTMLCanvasElement, name: string): void {
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, name);
  }, 'image/png');
}

function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
