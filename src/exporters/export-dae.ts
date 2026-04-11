import type { MeshData } from '../types';

export function exportDae(mesh: MeshData, filename = 'voxel-studio.dae'): void {
  const { positions, normals, colors, indices } = mesh;
  const vertexCount = positions.length / 3;
  const faceCount = indices.length / 3;

  // ── collect unique materials (group by color key) ──────────────────────────
  const colorKeyOf = (vi: number) => {
    const r = Math.round(colors[vi * 3] * 255);
    const g = Math.round(colors[vi * 3 + 1] * 255);
    const b = Math.round(colors[vi * 3 + 2] * 255);
    return `${r}_${g}_${b}`;
  };

  const matIndexOf = new Map<string, number>();
  const matColors: [number, number, number][] = [];

  for (let f = 0; f < faceCount; f++) {
    const key = colorKeyOf(indices[f * 3]);
    if (!matIndexOf.has(key)) {
      matIndexOf.set(key, matColors.length);
      const vi = indices[f * 3];
      matColors.push([colors[vi * 3], colors[vi * 3 + 1], colors[vi * 3 + 2]]);
    }
  }

  // ── position / normal arrays ───────────────────────────────────────────────
  const posArr = Array.from({ length: vertexCount }, (_, i) =>
    `${positions[i * 3].toFixed(6)} ${positions[i * 3 + 1].toFixed(6)} ${positions[i * 3 + 2].toFixed(6)}`
  ).join(' ');

  const normArr = Array.from({ length: vertexCount }, (_, i) =>
    `${normals[i * 3].toFixed(6)} ${normals[i * 3 + 1].toFixed(6)} ${normals[i * 3 + 2].toFixed(6)}`
  ).join(' ');

  // ── group face indices by material ─────────────────────────────────────────
  const facesByMat: number[][] = matColors.map(() => []);
  for (let f = 0; f < faceCount; f++) {
    const ia = indices[f * 3], ib = indices[f * 3 + 1], ic = indices[f * 3 + 2];
    const mi = matIndexOf.get(colorKeyOf(ia))!;
    // Each <p> entry: posIdx normIdx (interleaved, stride 2)
    facesByMat[mi].push(ia, ia, ib, ib, ic, ic);
  }

  // ── XML helpers ────────────────────────────────────────────────────────────
  const fx = (n: number) => n.toFixed(6);

  const effectsXml = matColors.map((c, i) => `
    <effect id="effect_${i}">
      <profile_COMMON>
        <technique sid="common">
          <lambert>
            <diffuse><color sid="diffuse">${fx(c[0])} ${fx(c[1])} ${fx(c[2])} 1</color></diffuse>
          </lambert>
        </technique>
      </profile_COMMON>
    </effect>`).join('');

  const materialsXml = matColors.map((_, i) => `
    <material id="mat_${i}" name="mat_${i}">
      <instance_effect url="#effect_${i}"/>
    </material>`).join('');

  const trianglesXml = facesByMat.map((pArr, mi) => {
    if (pArr.length === 0) return '';
    return `
      <triangles material="mat_${mi}" count="${pArr.length / 6}">
        <input semantic="VERTEX"  source="#mesh-vertices" offset="0"/>
        <input semantic="NORMAL"  source="#mesh-normals"  offset="1"/>
        <p>${pArr.join(' ')}</p>
      </triangles>`;
  }).join('');

  const bindMaterialXml = matColors.map((_, i) => `
          <instance_material symbol="mat_${i}" target="#mat_${i}"/>`).join('');

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">
  <asset>
    <created>${new Date().toISOString()}</created>
    <modified>${new Date().toISOString()}</modified>
    <unit name="meter" meter="1"/>
    <up_axis>Y_UP</up_axis>
  </asset>

  <library_effects>${effectsXml}
  </library_effects>

  <library_materials>${materialsXml}
  </library_materials>

  <library_geometries>
    <geometry id="mesh" name="mesh">
      <mesh>
        <source id="mesh-positions">
          <float_array id="mesh-positions-array" count="${vertexCount * 3}">${posArr}</float_array>
          <technique_common>
            <accessor source="#mesh-positions-array" count="${vertexCount}" stride="3">
              <param name="X" type="float"/>
              <param name="Y" type="float"/>
              <param name="Z" type="float"/>
            </accessor>
          </technique_common>
        </source>
        <source id="mesh-normals">
          <float_array id="mesh-normals-array" count="${vertexCount * 3}">${normArr}</float_array>
          <technique_common>
            <accessor source="#mesh-normals-array" count="${vertexCount}" stride="3">
              <param name="X" type="float"/>
              <param name="Y" type="float"/>
              <param name="Z" type="float"/>
            </accessor>
          </technique_common>
        </source>
        <vertices id="mesh-vertices">
          <input semantic="POSITION" source="#mesh-positions"/>
        </vertices>
        ${trianglesXml}
      </mesh>
    </geometry>
  </library_geometries>

  <library_visual_scenes>
    <visual_scene id="Scene" name="Scene">
      <node id="Mesh" name="Mesh" type="NODE">
        <instance_geometry url="#mesh">
          <bind_material>
            <technique_common>${bindMaterialXml}
            </technique_common>
          </bind_material>
        </instance_geometry>
      </node>
    </visual_scene>
  </library_visual_scenes>

  <scene>
    <instance_visual_scene url="#Scene"/>
  </scene>
</COLLADA>`;

  const blob = new Blob([xml], { type: 'model/vnd.collada+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
