import { useEffect, useRef, useState } from 'react';

import { useStore } from '../../store';
import { useSave } from '../../hooks/use-vxs-io';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface SaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Mounted only while the dialog is open, so the filename field starts from
 *  the loaded project every time instead of syncing in an effect. */
function SaveForm({ onDone }: { onDone: () => void }) {
  const projectName = useStore((s) => s.projectName);
  const save = useSave();
  const [name, setName] = useState(() => (projectName ?? 'project').replace(/\.vxs$/i, ''));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const handleSave = () => {
    save(name);
    onDone();
  };

  return (
    <>
      <DialogBody>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            autoFocus
            aria-label="File name"
            className="field field-mono flex-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
            placeholder="filename"
            spellCheck={false}
          />
          <span className="font-mono text-xs text-text-muted">.vxs</span>
        </div>
      </DialogBody>

      <DialogFooter>
        <button type="button" className="btn" onClick={onDone}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={name.trim().length === 0}
        >
          Save
        </button>
      </DialogFooter>
    </>
  );
}

export function SaveDialog({ open, onOpenChange }: SaveDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Save project</DialogTitle>
          <DialogDescription>
            Downloads a .vxs file with the art, the depth and the palette.
          </DialogDescription>
        </DialogHeader>
        <SaveForm onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
