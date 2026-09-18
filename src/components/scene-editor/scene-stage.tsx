import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, RotateCw, Trash2 } from 'lucide-react';

import { useStore } from '../../store';
import type { Placement } from '../../types';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { IconButton } from '@/components/ui/icon-button';
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
  const [selected, setSelected] = useState<string | null>(null);

  const scene = scenes.find((s) => s.id === activeSceneId) ?? null;
  const activeBrush = brush ?? assets[0]?.id ?? null;

  const byCell = useMemo(() => {
    const map = new Map<string, Placement>();
    for (const p of scene?.placements ?? []) map.set(`${p.x},${p.z}`, p);
    return map;
  }, [scene]);

  const chosen = scene?.placements.find((p) => p.id === selected) ?? null;
  const chosenAsset = chosen ? assets.find((a) => a.id === chosen.assetId) : undefined;

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
                // Clicking an occupied cell selects it. Removing is an explicit
                // action in the inspector, so a mis-click cannot delete work.
                if (placement) setSelected(placement.id === selected ? null : placement.id);
                else if (activeBrush) {
                  placeAsset(activeBrush, x, z);
                  setSelected(null);
                }
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
                placement && placement.id === selected
                  ? 'bg-accent text-white'
                  : placement
                    ? 'bg-accent-soft text-accent hover:bg-accent/30'
                    : 'text-transparent hover:bg-bg-hover',
              )}
            >
              {placement ? assetName(placement.assetId).slice(0, 2) : ''}
            </button>
          );
        })}
      </div>

      {chosen ? (
        <div className="rail gap-1 p-1.5">
          <span className="px-2 text-xs text-text-primary">
            {assetName(chosen.assetId)} at {chosen.x}, {chosen.z}
          </span>
          <div className="rail-sep" />
          <IconButton
            label="Turn a quarter"
            size="sm"
            side="top"
            onClick={() => updatePlacement(chosen.id, { rotation: chosen.rotation + 1 })}
          >
            <RotateCw className="size-3.5" />
          </IconButton>
          <IconButton
            label="Raise off the ground"
            size="sm"
            side="top"
            onClick={() => updatePlacement(chosen.id, { y: chosen.y + 1 })}
          >
            <ArrowUp className="size-3.5" />
          </IconButton>
          <IconButton
            label="Lower towards the ground"
            size="sm"
            side="top"
            disabled={chosen.y === 0}
            onClick={() => updatePlacement(chosen.id, { y: chosen.y - 1 })}
          >
            <ArrowDown className="size-3.5" />
          </IconButton>
          <span className="px-1 font-mono text-[11px] text-text-muted">
            turn {chosen.rotation}, lift {chosen.y}
          </span>
          {(chosenAsset?.frames.length ?? 1) > 1 && (
            <>
              <div className="rail-sep" />
              <label className="flex items-center gap-1.5 px-1 text-[11px] text-text-secondary">
                Frame
                <select
                  aria-label="Animation frame shown"
                  className="field h-7 px-1.5 text-[11px]"
                  value={chosen.frameIndex}
                  onChange={(e) => updatePlacement(chosen.id, { frameIndex: Number(e.target.value) })}
                >
                  {chosenAsset!.frames.map((_, i) => (
                    <option key={i} value={i}>{i + 1}</option>
                  ))}
                </select>
              </label>
            </>
          )}
          <div className="rail-sep" />
          <IconButton
            label="Remove from the scene"
            size="sm"
            side="top"
            onClick={() => {
              removePlacement(chosen.id);
              setSelected(null);
            }}
          >
            <Trash2 className="size-3.5" />
          </IconButton>
        </div>
      ) : (
        <p className="text-[11px] text-text-muted">
          Click to place, click a placement to select it, right click to turn.
        </p>
      )}
    </div>
  );
}
