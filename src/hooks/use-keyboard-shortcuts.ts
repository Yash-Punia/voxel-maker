import { useEffect } from 'react';
import { useStore } from '../store';

export function useKeyboardShortcuts() {
  const { setTool, setZoom, setShowGrid, zoom, undo, redo, rotateActiveShape } = useStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'z') { e.preventDefault(); undo(); return; }
      if (ctrl && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); return; }
      if (ctrl && e.key === 's') { e.preventDefault(); document.dispatchEvent(new CustomEvent('vxs:save')); return; }

      switch (e.key.toLowerCase()) {
        case 'b': setTool('pencil'); break;
        case 'e': setTool('eraser'); break;
        case 'f': setTool('fill'); break;
        case 'd': setTool('eyedropper'); break;
        case 's': if (!ctrl) setTool('rect-select'); break;
        case 'g': setShowGrid(!(useStore.getState().showGrid)); break;
        case '[': setZoom(zoom - 2); break;
        case ']': setZoom(zoom + 2); break;
        case ' ': e.preventDefault(); rotateActiveShape(); break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [zoom, undo, redo, setTool, setZoom, setShowGrid, rotateActiveShape]);
}
