import { Minus, Plus, Frame, Grid2x2 } from 'lucide-react';

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
    </div>
  );
}
