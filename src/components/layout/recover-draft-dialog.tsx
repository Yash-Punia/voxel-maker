import { useEffect, useState } from 'react';

import { useStore } from '../../store';
import { clearDraft, readDraft, type Draft } from '../../core/draft-storage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

function howLongAgo(then: number): string {
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return 'less than a minute ago';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/** A draft only exists when the tab died with unsaved work in it, so finding one
 *  is always worth asking about. Restoring is never automatic: the person may
 *  have moved on, and silently replacing their board would be its own data loss. */
export function RecoverDraftDialog() {
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    void readDraft().then((found) => {
      if (found?.assets?.length) setDraft(found);
    });
  }, []);

  const restore = () => {
    if (!draft) return;
    const s = useStore.getState();
    s.loadAssets(draft.assets, draft.activeAssetId);
    // Older drafts predate scenes, so an absent list is empty rather than a fault.
    s.loadScenes(draft.scenes ?? [], draft.activeSceneId ?? null);
    draft.palette.forEach((color, i) => s.setPaletteColor(i, color));
    s.setProjectName(draft.projectName);
    setDraft(null);
  };

  const discard = () => {
    void clearDraft();
    setDraft(null);
  };

  const count = draft?.assets.length ?? 0;
  const sceneCount = draft?.scenes?.length ?? 0;

  return (
    <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Recover unsaved work?</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <DialogDescription>
            {`VoxBrush closed with unsaved changes ${draft ? howLongAgo(draft.savedAt) : ''}. The copy holds ${count} asset${count === 1 ? '' : 's'}${sceneCount ? ` and ${sceneCount} scene${sceneCount === 1 ? '' : 's'}` : ''}. Restoring replaces whatever is on the board now.`}
          </DialogDescription>
        </DialogBody>
        <DialogFooter>
          <button type="button" className="btn" onClick={discard}>
            Discard it
          </button>
          <button type="button" className="btn btn-primary" onClick={restore}>
            Restore
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
