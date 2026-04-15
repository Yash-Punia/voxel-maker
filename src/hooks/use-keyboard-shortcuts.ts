import { useEffect } from 'react';
import { useStore } from '../store';
import { SHAPES } from '../core/shapes';

export function useKeyboardShortcuts() {
  const { setTool, setZoom, setShowGrid, zoom, undo, redo, rotateActiveShape, setActiveShape, shiftCanvas, setSelectRect } = useStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const ctrl = e.ctrlKey || e.metaKey;

      // Redo: Ctrl+Shift+Z (primary) or Ctrl+Y (classic Windows alias)
      if (ctrl && e.shiftKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); redo(); return; }
      if (ctrl && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo(); return; }
      if (ctrl && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); return; }
      if (ctrl && e.key === 's') { e.preventDefault(); document.dispatchEvent(new CustomEvent('vxs:save')); return; }

      // '?' opens the shortcuts reference modal (Shift+/ on US layouts)
      if (e.key === '?') { e.preventDefault(); document.dispatchEvent(new CustomEvent('vxs:shortcuts')); return; }

      // Escape clears rect-select mask
      if (e.key === 'Escape') {
        if (useStore.getState().selectRect) {
          e.preventDefault();
          setSelectRect(null);
          return;
        }
      }

      // Alt+Arrow = shift canvas
      if (e.altKey) {
        if (e.key === 'ArrowUp')    { e.preventDefault(); shiftCanvas(0, -1); return; }
        if (e.key === 'ArrowDown')  { e.preventDefault(); shiftCanvas(0, 1);  return; }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); shiftCanvas(-1, 0); return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); shiftCanvas(1, 0);  return; }
      }

      switch (e.key.toLowerCase()) {
        case 'b': setTool('pencil'); break;
        case 'e': setTool('eraser'); break;
        case 'f': setTool('fill'); break;
        case 'l': setTool('line'); break;
        case 'd': setTool('eyedropper'); break;
        case 's': if (!ctrl) setTool('rect-select'); break;
        case 'g': setShowGrid(!(useStore.getState().showGrid)); break;
        case '[': setZoom(zoom - 2); break;
        case ']': setZoom(zoom + 2); break;
        case ' ': e.preventDefault(); rotateActiveShape(); break;
        default: {
          const n = parseInt(e.key);
          if (n >= 1 && n <= SHAPES.length) setActiveShape(SHAPES[n - 1].id);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [zoom, undo, redo, setTool, setZoom, setShowGrid, rotateActiveShape, setActiveShape, shiftCanvas, setSelectRect]);
}
