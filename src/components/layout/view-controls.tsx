import { Minus, Plus, Frame, Grid2x2, Layers } from 'lucide-react';

import { useStore } from '../../store';
import { APP_EVENTS, emitAppEvent } from '../../core/app-events';
import { IconButton } from '@/components/ui/icon-button';

/** Zoom, framing and the grid overlay. Only the 2D stages have a view to
 *  control, so the mode bar hides this everywhere else. */
export function ViewControls() {
  const zoom = useStore((s) => s.zoom);
  const setZoom = useStore((s) => s.setZoom);
  const showGrid = useStore((s) => s.showGrid);
  const setShowGrid = useStore((s) => s.setShowGrid);
  const onionSkin = useStore((s) => s.onionSkin);
  const setOnionSkin = useStore((s) => s.setOnionSkin);
  const tiledView = useStore((s) => s.tiledView);
  const setTiledView = useStore((s) => s.setTiledView);
  const frameCount = useStore(
    (s) => s.assets.find((a) => a.id === s.activeAssetId)?.frames.length ?? 1,
  );

  return (
    <div className="flex items-center gap-1">
      <IconButton label="Zoom out" shortcut="[" side="top" size="sm" onClick={() => setZoom(zoom - 2)}>
        <Minus className="size-3.5" />
      </IconButton>
      <span className="min-w-10 text-center font-mono text-[11px] text-text-muted">{zoom}px</span>
      <IconButton label="Zoom in" shortcut="]" side="top" size="sm" onClick={() => setZoom(zoom + 2)}>
        <Plus className="size-3.5" />
      </IconButton>
      <IconButton
        label="Fit the board to the view"
        shortcut="H"
        side="top"
        size="sm"
        onClick={() => emitAppEvent(APP_EVENTS.fitView)}
      >
        <Frame className="size-3.5" />
      </IconButton>
      <IconButton
        label="Grid overlay"
        shortcut="G"
        side="top"
        size="sm"
        active={showGrid}
        onClick={() => setShowGrid(!showGrid)}
      >
        <Grid2x2 className="size-3.5" />
      </IconButton>
      <IconButton
        label="Tiled view, repeat the board around itself"
        side="top"
        size="sm"
        active={tiledView}
        onClick={() => setTiledView(!tiledView)}
      >
        <Grid2x2 className="size-3.5 rotate-45" />
      </IconButton>
      {/* Only meaningful once there is a frame before this one. */}
      {frameCount > 1 && (
        <IconButton
          label="Onion skin, ghost the previous frame"
          side="top"
          size="sm"
          active={onionSkin}
          onClick={() => setOnionSkin(!onionSkin)}
        >
          <Layers className="size-3.5" />
        </IconButton>
      )}
    </div>
  );
}
