import type { MeshData } from '../types';
import { buildAtlas, downloadAtlas } from '../core/texture-atlas';

export interface ObjOptions {
  atlas?: boolean; // when true, exports a texture atlas PNG + UVs; otherwise per-material colors
}

/** The .obj and its .mtl. Split from the download so the output can be
 *  asserted. Vertex-colour mode only: the atlas path needs a canvas. */
export function buildObj(mesh: MeshData, filename = 'voxbrush'): { obj: string; mtl: string } {
  const { positions, normals, colors, indices } = mesh;
  const vertexCount = positions.length / 3;

  const obj: string[] = ['# VoxBrush Export', `mtllib ${filename}.mtl`, ''];

  // Write vertices, normals, and per-vertex colors as comments
  for (let i = 0; i < vertexCount; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    obj.push(`v ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}`);
  }
  obj.push('');

  for (let i = 0; i < vertexCount; i++) {
    const nx = normals[i * 3];
    const ny = normals[i * 3 + 1];
    const nz = normals[i * 3 + 2];
    obj.push(`vn ${nx.toFixed(6)} ${ny.toFixed(6)} ${nz.toFixed(6)}`);
  }
  obj.push('');

  // Build material map from vertex colors (round to 2 decimal places to group similar colors)
  const matMap = new Map<string, string>(); // key -> matName
  const mtlEntries = new Map<string, [number, number, number]>(); // matName -> rgb

  function getMatName(vi: number): string {
    const r = colors[vi * 3];
    const g = colors[vi * 3 + 1];
    const b = colors[vi * 3 + 2];
    const key = `${r.toFixed(3)},${g.toFixed(3)},${b.toFixed(3)}`;
    if (!matMap.has(key)) {
      const matName = `mat_${matMap.size}`;
      matMap.set(key, matName);
      mtlEntries.set(matName, [r, g, b]);
    }
    return matMap.get(key)!;
  }

  // Group triangles by material
  const facesByMat = new Map<string, string[]>();
  const faceCount = indices.length / 3;
  for (let f = 0; f < faceCount; f++) {
    const a = indices[f * 3];
    const b = indices[f * 3 + 1];
    const c = indices[f * 3 + 2];
    const matName = getMatName(a);
    if (!facesByMat.has(matName)) facesByMat.set(matName, []);
    // OBJ is 1-indexed; format: v//vn
    facesByMat.get(matName)!.push(`f ${a + 1}//${a + 1} ${b + 1}//${b + 1} ${c + 1}//${c + 1}`);
  }

  for (const [matName, faces] of facesByMat) {
    obj.push(`usemtl ${matName}`);
    for (const f of faces) obj.push(f);
    obj.push('');
  }

  // Build .mtl
  const mtl: string[] = ['# VoxBrush Materials', ''];
  for (const [matName, [r, g, b]] of mtlEntries) {
    mtl.push(`newmtl ${matName}`);
    mtl.push(`Kd ${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)}`);
    mtl.push('Ka 0.1 0.1 0.1');
    mtl.push('Ks 0.0 0.0 0.0');
    mtl.push('');
  }

  return { obj: obj.join('\n'), mtl: mtl.join('\n') };
}

export function exportObj(mesh: MeshData, filename = 'voxbrush', options: ObjOptions = {}): void {
  if (options.atlas) {
    exportObjAtlas(mesh, filename);
    return;
  }

  const { obj, mtl } = buildObj(mesh, filename);
  downloadText(obj, `${filename}.obj`);
  downloadText(mtl, `${filename}.mtl`);
}

// ─── Atlas mode ──────────────────────────────────────────────────────────────
// Emits a single material referencing a texture atlas PNG. Faces use v/vt/vn.
function exportObjAtlas(mesh: MeshData, filename: string): void {
  const { positions, normals, indices } = mesh;
  const vertexCount = positions.length / 3;
  const atlas = buildAtlas(mesh);

  const texName = `${filename}-atlas.png`;

  const obj: string[] = ['# VoxBrush Export (atlas mode)', `mtllib ${filename}.mtl`, ''];

  for (let i = 0; i < vertexCount; i++) {
    obj.push(`v ${positions[i * 3].toFixed(6)} ${positions[i * 3 + 1].toFixed(6)} ${positions[i * 3 + 2].toFixed(6)}`);
  }
  obj.push('');

  for (let i = 0; i < vertexCount; i++) {
    obj.push(`vt ${atlas.uvs[i * 2].toFixed(6)} ${atlas.uvs[i * 2 + 1].toFixed(6)}`);
  }
  obj.push('');

  for (let i = 0; i < vertexCount; i++) {
    obj.push(`vn ${normals[i * 3].toFixed(6)} ${normals[i * 3 + 1].toFixed(6)} ${normals[i * 3 + 2].toFixed(6)}`);
  }
  obj.push('');

  obj.push('usemtl atlas');
  const faceCount = indices.length / 3;
  for (let f = 0; f < faceCount; f++) {
    const a = indices[f * 3] + 1;
    const b = indices[f * 3 + 1] + 1;
    const c = indices[f * 3 + 2] + 1;
    obj.push(`f ${a}/${a}/${a} ${b}/${b}/${b} ${c}/${c}/${c}`);
  }

  const mtl = [
    '# VoxBrush Materials (atlas)',
    '',
    'newmtl atlas',
    'Ka 0.1 0.1 0.1',
    'Kd 1.0 1.0 1.0',
    'Ks 0.0 0.0 0.0',
    `map_Kd ${texName}`,
    '',
  ].join('\n');

  downloadText(obj.join('\n'), `${filename}.obj`);
  downloadText(mtl, `${filename}.mtl`);
  downloadAtlas(atlas.atlasBlob, texName);
}

function downloadText(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
