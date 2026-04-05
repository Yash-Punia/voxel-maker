import { useStore } from '../../store';

export function StatusBar() {
  const { cursorPos, activeColor, activeDepth, gridWidth, gridHeight, activeTool } = useStore();

  return (
    <div className="h-7 bg-bg-secondary border-t border-border flex items-center px-3 gap-4 shrink-0 text-[11px] text-text-secondary">
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
        <div className="w-2.5 h-2.5 rounded-full border border-border" style={{ background: activeColor }} />
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
    </div>
  );
}
