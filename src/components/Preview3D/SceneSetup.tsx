import { Grid } from '@react-three/drei';

interface SceneSetupProps {
  flat: boolean;
}

export function SceneSetup({ flat }: SceneSetupProps) {
  return (
    <>
      <ambientLight intensity={flat ? 1.5 : 0.6} />
      {!flat && (
        <>
          {/* Primary light from front-right-top (same side as camera) */}
          <directionalLight position={[10, 15, 30]} intensity={1.2} />
          {/* Fill light from left-back */}
          <directionalLight position={[-10, 5, -20]} intensity={0.4} />
        </>
      )}
      {/* Reference grid on XZ plane — floor under the model */}
      <Grid
        args={[64, 64]}
        cellSize={1}
        cellThickness={0.3}
        cellColor="#3a3a42"
        sectionSize={8}
        sectionThickness={0.8}
        sectionColor="#5a5a6a"
        fadeDistance={80}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
        position={[0, -8.5, 0]}
      />
    </>
  );
}
