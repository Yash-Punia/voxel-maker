import { useEffect, useRef } from 'react';

import { useStore } from '../store';
import { clearDraft, writeDraft } from '../core/draft-storage';

// Two seconds after the last edit. Short enough that a crash costs almost
// nothing, long enough that a drag across the board is one write and not fifty.
const DEBOUNCE_MS = 2000;

/** Keeps a recovery copy of the project while it has unsaved changes, and drops
 *  it the moment the work is saved. A draft existing therefore means exactly one
 *  thing: the tab died with unsaved work in it. */
export function useDraftAutosave(): void {
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    // Immer hands back a new reference for anything it touched, so identity is
    // enough to tell a real edit from a cursor move. Without this the pointer
    // moving over the board resets the timer forever and nothing is ever
    // written.
    const documentState = () => {
      const s = useStore.getState();
      return [s.colorMap, s.depthMap, s.shapeMap, s.rotationMap, s.assets, s.scenes, s.palette, s.projectName];
    };

    let previous = documentState();

    const flush = () => {
      const s = useStore.getState();
      if (!s.isDirty) {
        void clearDraft();
        return;
      }
      // The live board belongs to an asset, and it is only written back on
      // switch, so a draft taken now would miss whatever is on screen.
      s.commitActiveAsset();
      const next = useStore.getState();
      previous = documentState();
      void writeDraft({
        savedAt: Date.now(),
        projectName: next.projectName,
        palette: [...next.palette],
        assets: next.assets,
        activeAssetId: next.activeAssetId,
        scenes: next.scenes,
        activeSceneId: next.activeSceneId,
      });
    };

    const unsubscribe = useStore.subscribe(() => {
      const next = documentState();
      if (next.every((part, i) => part === previous[i])) return;
      previous = next;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, DEBOUNCE_MS);
    });

    return () => {
      window.clearTimeout(timer.current);
      unsubscribe();
    };
  }, []);
}
