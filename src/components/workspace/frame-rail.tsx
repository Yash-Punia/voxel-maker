import { useEffect, useRef, useState } from 'react';
import { Copy, Pause, Play, Plus, Trash2 } from 'lucide-react';

import { useStore } from '../../store';
import type { Frame } from '../../types';
import { IconButton } from '@/components/ui/icon-button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const THUMB = 28;

function FrameThumb({ frame, w, h, live }: { frame: Frame; w: number; h: number; live: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  // Same as the asset rail: only the open frame reads the live board.
  const cells = useStore((s) => (live ? s.colorMap : frame.colorMap));

  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, THUMB, THUMB);
    const cell = Math.min(THUMB / w, THUMB / h);
    const ox = (THUMB - cell * w) / 2;
    const oy = (THUMB - cell * h) / 2;
    for (let i = 0; i < cells.length; i++) {
      if (!cells[i]) continue;
      ctx.fillStyle = cells[i];
      ctx.fillRect(ox + (i % w) * cell, oy + Math.floor(i / w) * cell, Math.ceil(cell), Math.ceil(cell));
    }
  }, [cells, w, h]);

  return <canvas ref={ref} width={THUMB} height={THUMB} className="size-7 select-none" />;
}

/** The active asset's frames. Frames are discrete boards, the way sprite
 *  animation works, so this is a strip and not a timeline. */
export function FrameRail() {
  const assets = useStore((s) => s.assets);
  const activeAssetId = useStore((s) => s.activeAssetId);
  const activeFrameIndex = useStore((s) => s.activeFrameIndex);
  const gridWidth = useStore((s) => s.gridWidth);
  const gridHeight = useStore((s) => s.gridHeight);
  const setActiveFrame = useStore((s) => s.setActiveFrame);
  const addFrame = useStore((s) => s.addFrame);
  const duplicateFrame = useStore((s) => s.duplicateFrame);
  const deleteFrame = useStore((s) => s.deleteFrame);
  const playing = useStore((s) => s.playing);
  const setPlaying = useStore((s) => s.setPlaying);
  const commitActiveAsset = useStore((s) => s.commitActiveAsset);

  const [confirming, setConfirming] = useState(false);

  const asset = assets.find((a) => a.id === activeAssetId);
  if (!asset) return null;
  const frames = asset.frames;
  const animated = frames.length > 1;

  // The painted check decides whether deleting needs a confirm. Throwing away an
  // empty frame loses nothing, and a dialog for it is noise.
  const activeHasPaint = useStore.getState().colorMap.some(Boolean);

  const requestDelete = () => {
    if (frames.length <= 1) return;
    if (activeHasPaint) setConfirming(true);
    else deleteFrame(activeFrameIndex);
  };

  return (
    <>
      <div className="flex max-w-[min(42vw,22rem)] shrink-0 items-center gap-1 overflow-x-auto">
        {/* Nothing to play, duplicate or delete until there is a second frame.
            Most boards never animate, and five dead controls is what made this
            row long enough to read as clutter. */}
        {animated && (
          <>
            <IconButton
              label={playing ? 'Pause' : 'Play the animation'}
              size="sm"
              side="top"
              active={playing}
              onClick={() => {
                // Playback reads the stored frames, so the live board goes back
                // into its frame first or the open frame plays back stale.
                if (!playing) commitActiveAsset();
                setPlaying(!playing);
              }}
            >
              {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            </IconButton>
            <div className="rail-sep" />
          </>
        )}

        {frames.map((frame, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`Frame ${i + 1}`}
                aria-pressed={i === activeFrameIndex}
                onClick={() => setActiveFrame(i)}
                className={cn(
                  'flex shrink-0 cursor-pointer items-center justify-center rounded-md border p-0.5',
                  'transition-all duration-150 active:scale-[0.98]',
                  i === activeFrameIndex
                    ? 'border-accent bg-accent-soft'
                    : 'border-transparent hover:border-border-strong hover:bg-bg-hover',
                )}
              >
                <FrameThumb
                  frame={frame}
                  w={gridWidth}
                  h={gridHeight}
                  live={i === activeFrameIndex}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Frame {i + 1}</TooltipContent>
          </Tooltip>
        ))}

        <div className="rail-sep" />

        <IconButton label="Add a frame" size="sm" side="top" onClick={addFrame}>
          <Plus className="size-3.5" />
        </IconButton>
        {animated && (
          <>
            <IconButton label="Duplicate this frame" size="sm" side="top" onClick={duplicateFrame}>
              <Copy className="size-3.5" />
            </IconButton>
            <IconButton label="Delete this frame" size="sm" side="top" onClick={requestDelete}>
              <Trash2 className="size-3.5" />
            </IconButton>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Delete frame ${activeFrameIndex + 1}?`}
        description="This frame's painting, depth and shapes go with it. The other frames stay."
        confirmLabel="Delete the frame"
        onConfirm={() => deleteFrame(activeFrameIndex)}
      />
    </>
  );
}
