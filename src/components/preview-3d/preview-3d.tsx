import { useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei/core/OrbitControls';

import { useStore } from '../../store';
import { usePlayback } from '../../hooks/use-playback';
import { APP_EVENTS } from '../../core/app-events';
import { setPreviewCanvas } from './preview-canvas-handle';
import { VoxelMesh } from './voxel-mesh';
import { SceneSetup } from './scene-setup';

function CanvasHandle() {
  const gl = useThree((state) => state.gl);
  const controls = useThree((state) => state.controls) as { reset?: () => void } | null;

  useEffect(() => {
    setPreviewCanvas(gl.domElement);
    return () => setPreviewCanvas(null);
  }, [gl]);

  useEffect(() => {
    const onFrame = () => controls?.reset?.();
    document.addEventListener(APP_EVENTS.frameModel, onFrame);
    return () => document.removeEventListener(APP_EVENTS.frameModel, onFrame);
  }, [controls]);

  return null;
}

/** The 3D viewport. Mounted once for the whole session: it is the stage in
 *  model mode and a corner card everywhere else, so the model is always live. */
export function Preview3D() {
  usePlayback();
  const orthographic = useStore((s) => s.orthographic);

  return (
    <Canvas
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      camera={
        orthographic
          ? { position: [0, 0, 40], zoom: 22, near: -200, far: 400 }
          : { position: [0, 0, 40], fov: 45, near: 0.1, far: 1000 }
      }
      orthographic={orthographic}
      dpr={[1, 2]}
      className="size-full"
    >
      <CanvasHandle />
      <SceneSetup />
      <VoxelMesh />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} target={[0, 0, 0]} />
    </Canvas>
  );
}
