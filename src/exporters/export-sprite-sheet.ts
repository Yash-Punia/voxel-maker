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

/** One mesh per animation frame, in order. A still asset passes one. */
export function exportSpriteSheet(frames: MeshData[], opts: SpriteSheetOptions): void {
  const { angles, cellSize, pitch, normalMap, flipGreen, filename = 'voxbrush' } = opts;

  const drawable = frames.filter((mesh) => mesh.positions.length > 0);
  if (drawable.length === 0) {
    toast.error('Nothing to export', 'The canvas is empty.');
    return;
  }

  const rows = drawable.length;
  const colour = paint(drawable, angles, cellSize, pitch, false, false);
  const normal = normalMap ? paint(drawable, angles, cellSize, pitch, true, flipGreen) : null;

  const cells: SheetCell[] = [];
  const angleList: number[] = [];
  for (let i = 0; i < angles; i++) angleList.push(Math.round((i / angles) * 360));
  for (let frame = 0; frame < rows; frame++) {
    for (let i = 0; i < angles; i++) {
      cells.push({
        angle: angleList[i],
        frame,
        x: i * cellSize,
        y: frame * cellSize,
        w: cellSize,
        h: cellSize,
      });
    }
  }

  const metadata = {
    version: METADATA_VERSION,
    image: `${filename}_sheet.png`,
    ...(normal ? { normal: `${filename}_normal.png` } : {}),
    cellWidth: cellSize,
    cellHeight: cellSize,
    columns: angles,
    rows,
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

/** Angles across, frames down. Each frame is its own scene, because a frame is
 *  a whole board and its mesh has nothing in common with the one before it. */
function paint(
  frames: MeshData[],
  angles: number,
  cellSize: number,
  pitch: number,
  normals: boolean,
  flipGreen: boolean,
): HTMLCanvasElement {
  const sheet = document.createElement('canvas');
  sheet.width = cellSize * angles;
  sheet.height = cellSize * frames.length;
  const ctx = sheet.getContext('2d')!;

  frames.forEach((mesh, row) => {
    const scene = createOffscreenScene(mesh, { size: cellSize, camera: 'orthographic', pitch });
    if (normals) {
      // View-space normals are what a 2D sprite light wants, so the material's
      // own output needs no conversion beyond the optional channel flip.
      scene.setMaterial(new THREE.MeshNormalMaterial({ side: THREE.DoubleSide }));
    }
    for (let i = 0; i < angles; i++) {
      scene.render(i / angles);
      ctx.drawImage(scene.canvas, i * cellSize, row * cellSize);
    }
    scene.dispose();
  });

  if (normals && flipGreen) invertGreen(sheet);
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
