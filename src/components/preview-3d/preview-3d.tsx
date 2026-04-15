import { useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { VoxelMesh } from './voxel-mesh';
import { SceneSetup } from './scene-setup';
import { ExportMenu } from './export-menu';

function CanvasExposer({ onReady }: { onReady: (canvas: HTMLCanvasElement) => void }) {
  const { gl } = useThree();
  useState(() => { onReady(gl.domElement); });
  return null;
}

export function Preview3D() {
  const [flat, setFlat] = useState(false);
  const [ortho, setOrtho] = useState(false);
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);

  return (
    <div className="flex flex-col bg-bg-panel overflow-hidden min-w-0 h-full">
      <div className="h-9 bg-bg-secondary border-b border-border flex items-center px-2.5 gap-2 shrink-0">
        <span className="font-semibold text-xs text-text-secondary uppercase tracking-[0.08em]">3D Preview</span>
        <div className="flex items-center gap-1.5 flex-1 justify-end">
          <button
            className={`btn${flat ? ' active' : ''}`}
            onClick={() => setFlat((v) => !v)}
            title="Toggle flat/shaded rendering"
          >
            {flat ? 'Flat' : 'Shaded'}
          </button>
          <button
            className={`btn${ortho ? ' active' : ''}`}
            onClick={() => setOrtho((v) => !v)}
            title="Toggle orthographic/perspective camera"
          >
            {ortho ? 'Ortho' : 'Persp'}
          </button>
          <ExportMenu getCanvas={() => glCanvasRef.current} />
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative" style={{ background: '#0d0d12' }}>
        <Canvas
          gl={{ preserveDrawingBuffer: true, antialias: true }}
          camera={ortho ? undefined : { position: [0, 0, 40], fov: 45, near: 0.1, far: 1000 }}
          orthographic={ortho}
          dpr={[1, 2]}
          style={{ width: '100%', height: '100%' }}
        >
          <CanvasExposer onReady={(c) => { glCanvasRef.current = c; }} />
          <SceneSetup flat={flat} />
          <VoxelMesh />
          <OrbitControls makeDefault enableDamping dampingFactor={0.08} target={[0, 0, 0]} />
        </Canvas>
      </div>
    </div>
  );
}
