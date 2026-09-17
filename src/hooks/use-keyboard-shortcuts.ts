import { useEffect } from 'react';
import { useStore } from '../store';
import { SHAPES } from '../core/shapes';
import { APP_EVENTS, emitAppEvent } from '../core/app-events';
import type { EditorMode } from '../types';

const MODE_ORDER: EditorMode[] = ['draw', 'depth', 'model', 'export'];

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const s = useStore.getState();
      const ctrl = e.ctrlKey || e.metaKey;

      // Ctrl+1..4 jump straight to a mode.
      if (ctrl && !e.shiftKey && e.key >= '1' && e.key <= '4') {
        e.preventDefault();
        s.setMode(MODE_ORDER[Number(e.key) - 1]);
        return;
      }

      if (ctrl && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); s.toggleChat(); return; }

      // Redo: Ctrl+Shift+Z (primary) or Ctrl+Y (classic Windows alias)
      if (ctrl && e.shiftKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); s.redo(); return; }
      if (ctrl && !e.shiftKey && e.key === 'z') { e.preventDefault(); s.undo(); return; }
      if (ctrl && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); s.redo(); return; }
      if (ctrl && e.key === 's') { e.preventDefault(); emitAppEvent(APP_EVENTS.save); return; }
      if (ctrl) return;

      // '?' opens the shortcuts reference (Shift+/ on US layouts)
      if (e.key === '?') { e.preventDefault(); emitAppEvent(APP_EVENTS.shortcuts); return; }

      if (e.key === 'Escape' && s.selectRect) {
        e.preventDefault();
        s.setSelectRect(null);
        return;
      }

      // Alt+Arrow shifts the whole board.
      if (e.altKey) {
        if (e.key === 'ArrowUp')    { e.preventDefault(); s.shiftCanvas(0, -1); return; }
        if (e.key === 'ArrowDown')  { e.preventDefault(); s.shiftCanvas(0, 1);  return; }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); s.shiftCanvas(-1, 0); return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); s.shiftCanvas(1, 0);  return; }
        return;
      }

      const onBoard = s.mode === 'draw' || s.mode === 'depth';

      // Frames and assets, on the keys an animator already reaches for. Shift
      // widens the step from one frame to one asset.
      if (e.key === ',' || e.key === '.' || e.key === '<' || e.key === '>') {
        e.preventDefault();
        const forward = e.key === '.' || e.key === '>';
        if (e.shiftKey) {
          const index = s.assets.findIndex((a) => a.id === s.activeAssetId);
          const next = s.assets[index + (forward ? 1 : -1)];
          if (next) s.switchAsset(next.id);
        } else {
          s.setActiveFrame(s.activeFrameIndex + (forward ? 1 : -1));
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'p': {
          const frames = s.assets.find((a) => a.id === s.activeAssetId)?.frames.length ?? 1;
          if (frames > 1) {
            // Playback reads the stored frames, so the live board goes back into
            // its frame first or the frame being edited plays back stale.
            if (!s.playing) s.commitActiveAsset();
            s.setPlaying(!s.playing);
          }
          return;
        }
        // Fit follows the mode, the way the number keys do: the board on a
        // board stage, the model in model mode.
        case 'h':
          if (onBoard) emitAppEvent(APP_EVENTS.fitView);
          else if (s.mode === 'model') emitAppEvent(APP_EVENTS.frameModel);
          return;
        case 'g': if (onBoard) s.setShowGrid(!s.showGrid); return;
        case '[': if (onBoard) s.setZoom(s.zoom - 2); return;
        case ']': if (onBoard) s.setZoom(s.zoom + 2); return;
      }

      if (s.mode === 'draw') {
        switch (e.key.toLowerCase()) {
          case 'b': s.setTool('pencil'); return;
          case 'e': s.setTool('eraser'); return;
          case 'f': s.setTool('fill'); return;
          case 'l': s.setTool('line'); return;
          case 'd': s.setTool('eyedropper'); return;
          case 's': s.setTool('rect-select'); return;
          case 'r': s.rotateActiveShape(); return;
        }
      }

      // Number keys mean the shape you are stamping, or the depth you are
      // painting, depending on which board is open.
      const n = parseInt(e.key);
      if (Number.isNaN(n)) return;

      if (s.mode === 'depth') {
        e.preventDefault();
        s.setActiveDepth(n);
        return;
      }

      if (s.mode === 'draw' && n >= 1 && n <= SHAPES.length) {
        s.setActiveShape(SHAPES[n - 1].id);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
