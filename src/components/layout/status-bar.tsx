import { useMemo } from 'react';
import { Circle } from 'lucide-react';
import { useStore } from '../../store';

export function StatusBar() {
  const { cursorPos, activeColor, activeDepth, gridWidth, gridHeight, activeTool, colorMap, isDirty, projectName } = useStore();

  const { cellsFilled, colorsUsed } = useMemo(() => {
    const used = new Set<string>();
    let filled = 0;
    for (const c of colorMap) {
      if (c) {
        used.add(c);
        filled++;
      }
    }
    return { cellsFilled: filled, colorsUsed: used.size };
  }, [colorMap]);

  const totalCells = gridWidth * gridHeight;

  return (
    <div className="h-7 bg-bg-secondary border-t border-border flex items-center px-3 gap-4 shrink-0 text-xs text-text-secondary">
      {projectName && (
        <div className="flex items-center gap-1">
          <span className="text-text-primary font-mono truncate max-w-48" title={projectName}>
            {projectName}
          </span>
        </div>
      )}
      <div className="flex items-center gap-1">
        <span className="text-text-muted">Tool:</span>
        <span className="text-text-primary font-mono">{activeTool}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-text-muted">Cursor:</span>
        <span className="text-text-primary font-mono">
          {cursorPos ? `${cursorPos.x}, ${cursorPos.y}` : '—, —'}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-text-muted">Color:</span>
        <div className="size-2.5 rounded-full border border-border" style={{ background: activeColor }} />
        <span className="text-text-primary font-mono">{activeColor}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-text-muted">Depth:</span>
        <span className="text-text-primary font-mono">{activeDepth}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-text-muted">Grid:</span>
        <span className="text-text-primary font-mono">{gridWidth}×{gridHeight}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-text-muted">Cells:</span>
        <span className="text-text-primary font-mono">{cellsFilled}/{totalCells}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-text-muted">Colors:</span>
        <span className="text-text-primary font-mono">{colorsUsed}</span>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <Circle
          className={`size-2.5 ${isDirty ? 'text-accent fill-current' : 'text-text-muted'}`}
          strokeWidth={isDirty ? 0 : 1.8}
        />
        <span className={isDirty ? 'text-accent font-medium' : 'text-text-muted'}>
          {isDirty ? 'unsaved' : 'saved'}
        </span>
      </div>
    </div>
  );
}
