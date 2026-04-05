import { useStore } from '../../store';
import { PaintCanvas } from './paint-canvas';
import { ColorPicker } from './color-picker';
import { Palette } from './palette';
import { ShapePicker } from './shape-picker';

const TOOLS = [
  { id: 'pencil', icon: '✏️', label: 'Pencil (B)' },
  { id: 'eraser', icon: '⬜', label: 'Eraser (E)' },
  { id: 'fill', icon: '🪣', label: 'Fill (F)' },
  { id: 'eyedropper', icon: '💉', label: 'Eyedropper (D)' },
  { id: 'rect-select', icon: '⬚', label: 'Select (S)' },
] as const;

export function PaintEditor() {
  const { activeTool, setTool, showGrid, setShowGrid, zoom, setZoom, setSelectRect } = useStore();

  return (
    <div className="panel panel-paint">
      <div className="panel-header">
        <span className="panel-title">Paint Editor</span>
        <button
          className={`btn btn-icon${showGrid ? ' active' : ''}`}
          onClick={() => setShowGrid(!showGrid)}
          title="Toggle grid (G)"
          style={{ marginLeft: 'auto', fontSize: 12 }}
        >
          Grid
        </button>
        <button className="btn btn-icon" onClick={() => setZoom(zoom - 2)} title="Zoom out ([)">−</button>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 30, textAlign: 'center' }}>{zoom}px</span>
        <button className="btn btn-icon" onClick={() => setZoom(zoom + 2)} title="Zoom in (])">+</button>
        {activeTool === 'rect-select' && (
          <button className="btn btn-icon" onClick={() => setSelectRect(null)} title="Clear selection" style={{ fontSize: 11 }}>✕ Sel</button>
        )}
      </div>

      <div className="panel-body">
        <div className="canvas-area">
          {/* Tool sidebar */}
          <div className="tool-sidebar">
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                className={`tool-btn${activeTool === tool.id ? ' active' : ''}`}
                onClick={() => setTool(tool.id)}
                title={tool.label}
              >
                {tool.icon}
              </button>
            ))}
          </div>
          <PaintCanvas />
        </div>

        <ColorPicker />
        <Palette />
        <ShapePicker />
      </div>
    </div>
  );
}
