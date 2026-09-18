import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';
import { TILE_BITS } from '../../core/tile-mask';

import { useStore } from '../../store';
import type { Asset } from '../../types';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { IconButton } from '@/components/ui/icon-button';
import { cn } from '@/lib/utils';

const THUMB = 36;

/** Flat colour cells, no shapes. At 44px a 16-wide board gives under 3px per
 *  cell, so shape outlines are invisible and painting them costs a redraw on
 *  every edit for nothing. */
function Thumbnail({ asset, live }: { asset: Asset; live: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  // Only the open asset reads the live board, because its frame is written back
  // on switch and would otherwise show the last committed state. Selecting these
  // unconditionally would re-render every thumbnail in the rail on every painted
  // cell, for the sake of the one that changed.
  const cells = useStore((s) => (live ? s.colorMap : asset.frames[0].colorMap));
  const w = useStore((s) => (live ? s.gridWidth : asset.gridWidth));
  const h = useStore((s) => (live ? s.gridHeight : asset.gridHeight));

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, THUMB, THUMB);
    const cell = Math.min(THUMB / w, THUMB / h);
    const ox = (THUMB - cell * w) / 2;
    const oy = (THUMB - cell * h) / 2;

    for (let i = 0; i < cells.length; i++) {
      const color = cells[i];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + (i % w) * cell, oy + Math.floor(i / w) * cell, Math.ceil(cell), Math.ceil(cell));
    }
  }, [cells, w, h]);

  return <canvas ref={ref} width={THUMB} height={THUMB} className="size-9 select-none" />;
}

/** The set. Every asset in the project, one palette between them. */
export function AssetRail() {
  const assets = useStore((s) => s.assets);
  const activeAssetId = useStore((s) => s.activeAssetId);
  const switchAsset = useStore((s) => s.switchAsset);
  const createAsset = useStore((s) => s.createAsset);
  const duplicateAsset = useStore((s) => s.duplicateAsset);
  const deleteAsset = useStore((s) => s.deleteAsset);
  const renameAsset = useStore((s) => s.renameAsset);
  const setTileMask = useStore((s) => s.setTileMask);
  const scenes = useStore((s) => s.scenes);

  const [confirming, setConfirming] = useState<Asset | null>(null);
  const [renaming, setRenaming] = useState<Asset | null>(null);
  const [draft, setDraft] = useState('');
  const [masking, setMasking] = useState<Asset | null>(null);

  // A confirm has to name the whole consequence, and deleting an asset reaches
  // into every scene that stands it somewhere.
  const describeDelete = (): string => {
    const base = 'The board, its depth and its shapes go with it. The palette and every other asset stay. Ctrl+Z does not bring it back.';
    if (!confirming) return base;
    let cells = 0;
    let used = 0;
    for (const scene of scenes) {
      const hits = scene.placements.filter((p) => p.assetId === confirming.id).length;
      if (hits === 0) continue;
      cells += hits;
      used++;
    }
    if (cells === 0) return base;
    return `It also stands in ${cells} place${cells === 1 ? '' : 's'} across ${used} scene${used === 1 ? '' : 's'}, and every one of those is removed. ${base}`;
  };

  const openRename = (asset: Asset) => {
    setRenaming(asset);
    setDraft(asset.name);
  };

  const commitRename = () => {
    if (renaming) renameAsset(renaming.id, draft);
    setRenaming(null);
  };

  return (
    <>
      <div className="flex max-w-[min(42vw,22rem)] items-center gap-1 overflow-x-auto">
        {assets.map((asset) => {
          const active = asset.id === activeAssetId;
          return (
            <div key={asset.id} className="group relative shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={asset.name}
                    aria-pressed={active}
                    onClick={() => switchAsset(asset.id)}
                    className={cn(
                      'flex cursor-pointer items-center justify-center rounded-lg border p-0.5',
                      'transition-all duration-150 active:scale-[0.98]',
                      active
                        ? 'border-accent bg-accent-soft'
                        : 'border-transparent hover:border-border-strong hover:bg-bg-hover',
                    )}
                  >
                    <Thumbnail asset={asset} live={active} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{asset.name}</TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Actions for ${asset.name}`}
                    className="icon-btn absolute -top-1 -right-1 size-5 rounded-md bg-bg-panel opacity-0 transition-all duration-150 group-hover:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
                  >
                    <MoreHorizontal className="size-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => openRename(asset)}>Rename</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => duplicateAsset(asset.id)}>Duplicate</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setMasking(asset)}>
                    Tile variant{asset.tileMask !== undefined && ` (${asset.tileMask})`}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={assets.length <= 1}
                    onSelect={() => setConfirming(asset)}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}

        <div className="rail-sep" />

        <IconButton label="Add an asset" size="sm" side="bottom" onClick={() => createAsset()}>
          <Plus className="size-4" />
        </IconButton>
      </div>

      <Dialog open={masking !== null} onOpenChange={(open) => !open && setMasking(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tile variant</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="mb-3 text-xs leading-relaxed text-text-secondary">
              Tick the sides that have a matching neighbour. A full terrain set is
              sixteen assets, one per combination. Untick everything to make this an
              ordinary prop again.
            </p>
            <div className="flex flex-col gap-2">
              {Object.entries(TILE_BITS).map(([side, bit]) => (
                <label key={side} className="flex cursor-pointer items-center gap-2 text-xs text-text-primary capitalize">
                  <input
                    type="checkbox"
                    className="accent-accent"
                    checked={((masking?.tileMask ?? 0) & bit) !== 0}
                    onChange={(e) => {
                      if (!masking) return;
                      const current = masking.tileMask ?? 0;
                      const next = e.target.checked ? current | bit : current & ~bit;
                      setTileMask(masking.id, next);
                      setMasking({ ...masking, tileMask: next });
                    }}
                  />
                  {side}
                </label>
              ))}
            </div>
          </DialogBody>
          <DialogFooter>
            <button
              type="button"
              className="btn"
              disabled={masking?.tileMask === undefined}
              onClick={() => {
                if (masking) setTileMask(masking.id, undefined);
                setMasking(null);
              }}
            >
              Not a tile
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setMasking(null)}>
              Done
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={`Delete ${confirming?.name ?? 'this asset'}?`}
        description={describeDelete()}
        confirmLabel="Delete the asset"
        onConfirm={() => confirming && deleteAsset(confirming.id)}
      />

      <Dialog open={renaming !== null} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename the asset</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <input
              autoFocus
              aria-label="Asset name"
              className="field w-full"
              placeholder="asset name"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && commitRename()}
            />
          </DialogBody>
          <DialogFooter>
            <button type="button" className="btn" onClick={() => setRenaming(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!draft.trim() || draft.trim() === renaming?.name}
              onClick={commitRename}
            >
              Rename
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
