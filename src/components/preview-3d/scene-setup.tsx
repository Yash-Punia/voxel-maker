import { Grid } from '@react-three/drei/core/Grid';

import { useStore } from '../../store';

export function SceneSetup() {
  const flat = useStore((s) => s.flatShading);
  const showFloor = useStore((s) => s.showFloor);

  return (
    <>
      <ambientLight intensity={flat ? 1.6 : 0.75} />
      {!flat && (
        <>
          {/* Primary light from front-right-top (same side as camera) */}
          <directionalLight position={[10, 15, 30]} intensity={1.35} />
          {/* Fill light from left-back */}
          <directionalLight position={[-10, 5, -20]} intensity={0.5} />
        </>
      )}
      {showFloor && (
        <Grid
          args={[64, 64]}
          cellSize={1}
          cellThickness={0.3}
          cellColor="#26262c"
          sectionSize={8}
          sectionThickness={0.8}
          sectionColor="#3c3c46"
          fadeDistance={80}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid
          position={[0, -8.5, 0]}
        />
      )}
    </>
  );
}
