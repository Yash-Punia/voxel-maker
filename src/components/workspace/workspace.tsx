import { Suspense, lazy } from 'react';
import { Expand, X } from 'lucide-react';

import { useStore } from '../../store';
import { PaintCanvas } from '../paint-editor/paint-canvas';
import { ShapeRail } from '../paint-editor/shape-rail';
import { PaletteRail } from '../paint-editor/palette-rail';
import { DepthCanvas } from '../depth-editor/depth-canvas';
import { DepthRail } from '../depth-editor/depth-rail';
import { ExportPanel } from '../export/export-panel';
import { SceneStage } from '../scene-editor/scene-stage';
import { SceneRail } from '../scene-editor/scene-rail';
import { AssetRail } from './asset-rail';
import { FrameRail } from './frame-rail';
import { TopBar } from '../layout/top-bar';
import { IconButton } from '@/components/ui/icon-button';
import { Kbd } from '@/components/ui/kbd';

const Preview3D = lazy(async () => {
  const mod = await import('../preview-3d/preview-3d');
  return { default: mod.Preview3D };
});

function SelectionChip() {
  const selectRect = useStore((s) => s.selectRect);
  const setSelectRect = useStore((s) => s.setSelectRect);
  if (!selectRect) return null;

  return (
    <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
      <button
        type="button"
        className="rail cursor-pointer gap-2 px-3 py-2 text-xs text-text-secondary transition-all duration-150 hover:text-text-primary active:scale-[0.98]"
        onClick={() => setSelectRect(null)}
      >
        <X className="size-3.5 text-accent" />
        Painting is locked to the selection
        <Kbd keys="Esc" />
      </button>
    </div>
  );
}

/** The stage. One editor at a time, with the rails that belong to it floating
 *  over the edges and the 3D model always visible in the corner. */
export function Workspace() {
  const mode = useStore((s) => s.mode);
  const depthView = useStore((s) => s.depthView);
  const setMode = useStore((s) => s.setMode);
  const isModel = mode === 'model';

  return (
    <main className="relative min-h-0 flex-1 overflow-hidden bg-stage">
      {mode === 'draw' && <PaintCanvas />}
      {mode === 'depth' && <DepthCanvas viewMode={depthView} />}
      {mode === 'scene' && <SceneStage />}
      {mode === 'export' && <ExportPanel />}

      {/* One mounted 3D view for the whole session. It fills the stage in model
          mode and drops to a corner card everywhere else, so switching modes
          never rebuilds the scene. */}
      <div
        className={
          isModel
            ? 'stage-glow absolute inset-0'
            : 'stage-glow absolute bottom-4 left-4 z-10 h-36 w-48 overflow-hidden rounded-xl border border-border shadow-rail'
        }
      >
        <Suspense fallback={null}>
          <Preview3D />
        </Suspense>
        {!isModel && (
          <div className="absolute top-1.5 right-1.5">
            <IconButton
              label="Open the model view"
              shortcut="Ctrl+3"
              side="right"
              size="sm"
              className="bg-bg-panel/80 backdrop-blur-sm"
              onClick={() => setMode('model')}
            >
              <Expand className="size-3.5" />
            </IconButton>
          </div>
        )}
      </div>

      {/* The set, then its frames under it. Top centre is the one band with no
          rail above or beside it. */}
      {mode === 'scene' && (
        <div className="absolute top-16 left-1/2 z-10 -translate-x-1/2">
          <SceneRail />
        </div>
      )}

      {/* One object, two rows: which asset, then which frame of it. They were two
          floating pills, which stacked three borders and three shadows on the
          top of the stage for what is really one question. */}
      {(mode === 'draw' || mode === 'depth') && (
        <div className="rail rail-v absolute top-16 left-1/2 z-10 -translate-x-1/2 items-stretch gap-1.5 p-1.5">
          <AssetRail />
          <div className="h-px bg-border" />
          <FrameRail />
        </div>
      )}

      {mode === 'draw' && (
        <>
          <div className="absolute top-1/2 left-4 z-10 max-h-[calc(100%-7rem)] -translate-y-1/2 overflow-y-auto">
            <ShapeRail />
          </div>
          <div className="absolute top-1/2 right-4 z-10 max-h-[calc(100%-7rem)] -translate-y-1/2 overflow-y-auto">
            <PaletteRail />
          </div>
          <SelectionChip />
        </>
      )}

      {mode === 'depth' && (
        <div className="absolute top-1/2 right-4 z-10 max-h-[calc(100%-7rem)] -translate-y-1/2 overflow-y-auto">
          <DepthRail />
        </div>
      )}

      <TopBar />
    </main>
  );
}
