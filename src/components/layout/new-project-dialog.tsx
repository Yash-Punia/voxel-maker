import { useState } from 'react';

import { useStore } from '../../store';
import { DEFAULT_PALETTE, DEFAULT_SHAPE } from '../../store/tool-slice';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const GRID_SIZES = [8, 16, 24, 32, 48, 64];

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewProjectDialog({ open, onOpenChange }: NewProjectDialogProps) {
  const isDirty = useStore((s) => s.isDirty);
  const [size, setSize] = useState(16);

  const handleCreate = () => {
    // Hard reset: grid size, palette, tool settings, maps, history, project name.
    const s = useStore.getState();
    s.resetAssets(size, size);
    s.setPalette([...DEFAULT_PALETTE]);
    s.setActiveShape(DEFAULT_SHAPE);
    s.setActiveRotation(0);
    s.setMirrorMode('none');
    s.setExtrusionMode('symmetric');
    s.setDepthMultiplier(1.0);
    s.clearGrid();
    s.clearHistory();
    s.setProjectName(null);
    s.setMode('draw');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Resets the palette, the tool settings, and the undo history.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-4">
          {isDirty && (
            <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
              You have unsaved changes. A new project discards them.
            </p>
          )}

          <div className="flex flex-col gap-2">
            <div className="label-section">Canvas size</div>
            <div className="grid grid-cols-3 gap-2">
              {GRID_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={cn('btn justify-center font-mono', size === s && 'active')}
                  onClick={() => setSize(s)}
                >
                  {s}×{s}
                </button>
              ))}
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <button type="button" className="btn" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleCreate}>
            Create
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
