import { useStore } from '../../store';

export function StatusBar() {
  const { cursorPos, activeColor, activeDepth, gridWidth, gridHeight, activeTool } = useStore();

  return (
    <div className="statusbar">
      <div className="statusbar-item">
        <span className="statusbar-label">Tool:</span>
        <span className="statusbar-value">{activeTool}</span>
      </div>
      <div className="statusbar-item">
        <span className="statusbar-label">Cursor:</span>
        <span className="statusbar-value">
          {cursorPos ? `${cursorPos.x}, ${cursorPos.y}` : '—, —'}
        </span>
      </div>
      <div className="statusbar-item">
        <span className="statusbar-label">Color:</span>
        <div className="statusbar-color-dot" style={{ background: activeColor }} />
        <span className="statusbar-value">{activeColor}</span>
      </div>
      <div className="statusbar-item">
        <span className="statusbar-label">Depth:</span>
        <span className="statusbar-value">{activeDepth}</span>
      </div>
      <div className="statusbar-item">
        <span className="statusbar-label">Grid:</span>
        <span className="statusbar-value">{gridWidth}×{gridHeight}</span>
      </div>
    </div>
  );
}
