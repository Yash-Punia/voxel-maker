import { useState } from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';

import { useStore } from '../../store';
import type { Scene } from '../../types';
import { IconButton } from '@/components/ui/icon-button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const MIN_SIZE = 1;
const MAX_SIZE = 64;

/** Every scene in the project. Named rather than thumbnailed, because a ground
 *  plan at rail size reads as noise where an asset's artwork does not. */
export function SceneRail() {
  const scenes = useStore((s) => s.scenes);
  const activeSceneId = useStore((s) => s.activeSceneId);
  const createScene = useStore((s) => s.createScene);
  const switchScene = useStore((s) => s.switchScene);
  const renameScene = useStore((s) => s.renameScene);
  const duplicateScene = useStore((s) => s.duplicateScene);
  const deleteScene = useStore((s) => s.deleteScene);
  const resizeScene = useStore((s) => s.resizeScene);

  const [confirming, setConfirming] = useState<Scene | null>(null);
  const [renaming, setRenaming] = useState<Scene | null>(null);
  const [draft, setDraft] = useState('');
  const [resizing, setResizing] = useState<Scene | null>(null);
  const [size, setSize] = useState({ width: 16, depth: 16 });

  if (scenes.length === 0) return null;

  const openRename = (scene: Scene) => {
    setRenaming(scene);
    setDraft(scene.name);
  };

  const openResize = (scene: Scene) => {
    setResizing(scene);
    setSize({ width: scene.width, depth: scene.depth });
  };

  const clamp = (n: number) => Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.round(n) || MIN_SIZE));

  // Shrinking drops anything left outside, so the count is worth stating before
  // rather than after.
  const losing = resizing
    ? resizing.placements.filter((p) => p.x >= size.width || p.z >= size.depth).length
    : 0;

  return (
    <>
      <div className="rail max-w-[min(70vw,40rem)] gap-1 overflow-x-auto p-1.5">
        {scenes.map((scene) => (
          <div key={scene.id} className="group relative shrink-0">
            <button
              type="button"
              aria-pressed={scene.id === activeSceneId}
              onClick={() => switchScene(scene.id)}
              className={cn('chip chip-text pr-7', scene.id === activeSceneId && 'active')}
            >
              {scene.name}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Actions for ${scene.name}`}
                  className="icon-btn absolute top-1/2 right-0 size-5 -translate-y-1/2 rounded-md"
                >
                  <MoreHorizontal className="size-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => openRename(scene)}>Rename</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openResize(scene)}>
                  Ground size ({scene.width} by {scene.depth})
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => duplicateScene(scene.id)}>Duplicate</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setConfirming(scene)}>Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}

        <div className="rail-sep" />

        <IconButton label="Add a scene" size="sm" side="bottom" onClick={() => createScene()}>
          <Plus className="size-4" />
        </IconButton>
      </div>

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={`Delete ${confirming?.name ?? 'this scene'}?`}
        description={`The arrangement goes with it. Every asset it placed stays, because a scene holds references and not artwork.`}
        confirmLabel="Delete the scene"
        onConfirm={() => confirming && deleteScene(confirming.id)}
      />

      <Dialog open={renaming !== null} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename the scene</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <input
              autoFocus
              aria-label="Scene name"
              className="field w-full"
              placeholder="scene name"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || !renaming) return;
                renameScene(renaming.id, draft);
                setRenaming(null);
              }}
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
              onClick={() => {
                if (renaming) renameScene(renaming.id, draft);
                setRenaming(null);
              }}
            >
              Rename
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resizing !== null} onOpenChange={(open) => !open && setResizing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ground size</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="flex items-center gap-3">
              <label className="flex flex-1 flex-col gap-1.5 text-xs text-text-secondary">
                Across
                <input
                  type="number"
                  className="field field-mono w-full"
                  min={MIN_SIZE}
                  max={MAX_SIZE}
                  value={size.width}
                  onChange={(e) => setSize((v) => ({ ...v, width: clamp(Number(e.target.value)) }))}
                />
              </label>
              <label className="flex flex-1 flex-col gap-1.5 text-xs text-text-secondary">
                Back
                <input
                  type="number"
                  className="field field-mono w-full"
                  min={MIN_SIZE}
                  max={MAX_SIZE}
                  value={size.depth}
                  onChange={(e) => setSize((v) => ({ ...v, depth: clamp(Number(e.target.value)) }))}
                />
              </label>
            </div>
            {losing > 0 && (
              <p className="mt-3 text-xs leading-relaxed text-warning">
                {losing} placement{losing === 1 ? '' : 's'} sit outside that ground and would be
                removed.
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="btn" onClick={() => setResizing(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (resizing) resizeScene(resizing.id, size.width, size.depth);
                setResizing(null);
              }}
            >
              Resize
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
