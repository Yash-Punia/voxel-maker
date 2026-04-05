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
    <div className="flex flex-col bg-bg-panel overflow-hidden min-w-0 flex-[1_1_320px]">
      <div className="h-9 bg-bg-secondary border-b border-border flex items-center px-2.5 gap-2 shrink-0">
        <span className="font-semibold text-xs text-text-secondary uppercase tracking-[0.08em]">Paint Editor</span>
        <button
          className={`btn btn-icon${showGrid ? ' active' : ''}`}
          onClick={() => setShowGrid(!showGrid)}
          title="Toggle grid (G)"
          style={{ marginLeft: 'auto', fontSize: 12 }}
        >
          Grid
        </button>
        <button className="btn btn-icon" onClick={() => setZoom(zoom - 2)} title="Zoom out ([)">−</button>
        <span className="text-[11px] text-text-secondary min-w-7.5 text-center">{zoom}px</span>
        <button className="btn btn-icon" onClick={() => setZoom(zoom + 2)} title="Zoom in (])">+</button>
        {activeTool === 'rect-select' && (
          <button className="btn btn-icon text-[11px]" onClick={() => setSelectRect(null)} title="Clear selection">✕ Sel</button>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="flex-1 flex overflow-hidden">
          {/* Tool sidebar */}
          <div className="w-9 bg-bg-secondary border-r border-border flex flex-col items-center py-1.5 gap-0.5 shrink-0">
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
