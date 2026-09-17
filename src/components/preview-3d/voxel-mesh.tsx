import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useStore } from '../../store';
import { computeShapeMesh } from '../../core/depth-ops';

export function VoxelMesh() {
  // While playing, the mesh comes from the frame being played rather than the
  // live board. Playback must never write to the document, so the board is left
  // exactly as the person left it and only the preview moves.
  const played = useStore((s) =>
    s.playing ? s.assets.find((a) => a.id === s.activeAssetId)?.frames[s.playbackFrame] : undefined,
  );

  const liveColorMap = useStore((s) => s.colorMap);
  const liveDepthMap = useStore((s) => s.depthMap);
  const liveShapeMap = useStore((s) => s.shapeMap);
  const liveRotationMap = useStore((s) => s.rotationMap);

  const colorMap = played?.colorMap ?? liveColorMap;
  const depthMap = played?.depthMap ?? liveDepthMap;
  const shapeMap = played?.shapeMap ?? liveShapeMap;
  const rotationMap = played?.rotationMap ?? liveRotationMap;

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
