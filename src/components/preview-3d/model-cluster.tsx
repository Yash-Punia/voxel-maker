import { Sun, Box, Grid3x3, Maximize } from 'lucide-react';

import { useStore } from '../../store';
import { APP_EVENTS, emitAppEvent } from '../../core/app-events';
import { IconButton } from '@/components/ui/icon-button';

/** Top-bar cluster for model mode. */
export function ModelCluster() {
  const flatShading = useStore((s) => s.flatShading);
  const setFlatShading = useStore((s) => s.setFlatShading);
  const orthographic = useStore((s) => s.orthographic);
  const setOrthographic = useStore((s) => s.setOrthographic);
  const showFloor = useStore((s) => s.showFloor);
  const setShowFloor = useStore((s) => s.setShowFloor);

  return (
    <div className="rail">
      <IconButton
        label={flatShading ? 'Turn shading on' : 'Turn shading off'}
        active={!flatShading}
        onClick={() => setFlatShading(!flatShading)}
      >
        <Sun className="size-4" />
      </IconButton>
      <IconButton
        label={orthographic ? 'Perspective camera' : 'Orthographic camera'}
        active={orthographic}
        onClick={() => setOrthographic(!orthographic)}
      >
        <Box className="size-4" />
      </IconButton>
      <IconButton
        label="Floor grid"
        active={showFloor}
        onClick={() => setShowFloor(!showFloor)}
      >
        <Grid3x3 className="size-4" />
      </IconButton>
      <div className="rail-sep" />
      <IconButton
        label="Frame the model"
        onClick={() => emitAppEvent(APP_EVENTS.frameModel)}
      >
        <Maximize className="size-4" />
      </IconButton>
    </div>
  );
}
