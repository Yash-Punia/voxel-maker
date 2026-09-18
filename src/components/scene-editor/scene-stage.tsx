import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';

import { useStore } from '../../store';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const CELL = 28;

/** Placement is a top-down grid, not 3D dragging. It is the same bargain the
 *  rest of the product makes: work in 2D, watch the result in 3D. */
export function SceneStage() {
  const scenes = useStore((s) => s.scenes);
  const activeSceneId = useStore((s) => s.activeSceneId);
  const assets = useStore((s) => s.assets);
  const createScene = useStore((s) => s.createScene);
  const placeAsset = useStore((s) => s.placeAsset);
  const removePlacement = useStore((s) => s.removePlacement);
  const updatePlacement = useStore((s) => s.updatePlacement);

  const [brush, setBrush] = useState<string | null>(null);

  const scene = scenes.find((s) => s.id === activeSceneId) ?? null;
  const activeBrush = brush ?? assets[0]?.id ?? null;

  const byCell = useMemo(() => {
    const map = new Map<string, { id: string; assetId: string; rotation: number }>();
    for (const p of scene?.placements ?? []) map.set(`${p.x},${p.z}`, p);
    return map;
  }, [scene]);

  const assetName = (id: string) => assets.find((a) => a.id === id)?.name ?? 'missing';

  if (!scene) {
    return (
      <div className="flex size-full items-center justify-center p-8">
        <div className="surface flex max-w-sm flex-col items-center gap-4 p-8 text-center">
          <h2 className="text-sm font-semibold text-text-primary">No scene yet</h2>
          <p className="text-xs leading-relaxed text-text-secondary">
            A scene arranges assets you have already drawn. It holds references, so
            editing an asset updates every scene that uses it.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => createScene()}>
            <Plus className="size-4" />
            Start a scene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex size-full flex-col items-center justify-center gap-4 overflow-auto p-8">
      <div className="rail max-w-[min(70vw,40rem)] gap-1 overflow-x-auto p-1.5">
        <span className="shrink-0 px-2 text-xs text-text-secondary">Placing</span>
        {assets.map((asset) => (
          <Tooltip key={asset.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-pressed={asset.id === activeBrush}
                onClick={() => setBrush(asset.id)}
                className={cn('chip shrink-0', asset.id === activeBrush && 'active')}
              >
                {asset.name}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Place {asset.name}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      <div
        role="grid"
        aria-label="Scene ground plan"
        className="grid shrink-0 overflow-hidden rounded-lg border border-border bg-bg-input"
        style={{ gridTemplateColumns: `repeat(${scene.width}, ${CELL}px)` }}
      >
        {Array.from({ length: scene.width * scene.depth }, (_, i) => {
          const x = i % scene.width;
          const z = Math.floor(i / scene.width);
          const placement = byCell.get(`${x},${z}`);
          return (
            <button
              key={i}
              type="button"
              aria-label={placement ? `${assetName(placement.assetId)} at ${x}, ${z}` : `Empty cell ${x}, ${z}`}
              onClick={() => {
                if (placement) removePlacement(placement.id);
                else if (activeBrush) placeAsset(activeBrush, x, z);
              }}
              onContextMenu={(e) => {
                // Right click turns what is already there, so a row of fences can
                // face different ways without needing a second tool.
                e.preventDefault();
                if (placement) updatePlacement(placement.id, { rotation: placement.rotation + 1 });
              }}
              className={cn(
                'flex size-7 cursor-pointer items-center justify-center border-r border-b border-border/40',
                'text-[9px] transition-all duration-150 active:scale-[0.98]',
                placement
                  ? 'bg-accent-soft text-accent hover:bg-accent/30'
                  : 'text-transparent hover:bg-bg-hover',
              )}
            >
              {placement ? assetName(placement.assetId).slice(0, 2) : ''}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-text-muted">
        Click to place, click again to remove, right click to turn.
      </p>
    </div>
  );
}
