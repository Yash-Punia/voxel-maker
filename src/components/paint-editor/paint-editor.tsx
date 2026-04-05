import { useStore } from "../../store";
import { PaintCanvas } from "./paint-canvas";
import { ColorPicker } from "./color-picker";
import { Palette } from "./palette";
import { ShapePicker } from "./shape-picker";
import type { MirrorMode } from "../../types";

const TOOLS = [
  { id: "pencil", icon: "✏️", label: "Pencil (B)" },
  { id: "eraser", icon: "⬜", label: "Eraser (E)" },
  { id: "fill", icon: "🪣", label: "Fill (F)" },
  { id: "line", icon: "╱", label: "Line (L)" },
  { id: "eyedropper", icon: "💉", label: "Eyedropper (D)" },
  { id: "rect-select", icon: "⬚", label: "Select (S)" },
] as const;

const MIRROR_MODES: { id: MirrorMode; icon: string; label: string }[] = [
  { id: "none", icon: "○", label: "No mirror" },
  { id: "horizontal", icon: "⇔", label: "Mirror horizontal" },
  { id: "vertical", icon: "⇕", label: "Mirror vertical" },
];

export function PaintEditor() {
  const {
    activeTool,
    setTool,
    showGrid,
    setShowGrid,
    zoom,
    setZoom,
    setSelectRect,
    mirrorMode,
    setMirrorMode,
  } = useStore();

  return (
    <div className="flex flex-col bg-bg-panel overflow-hidden min-w-0 flex-[1_1_320px]">
      <div className="h-9 bg-bg-secondary border-b border-border flex items-center px-2.5 gap-1.5 shrink-0">
        <span className="font-semibold text-xs text-text-secondary uppercase tracking-[0.08em] shrink-0">
          Paint
        </span>

        <div className="w-px h-4 bg-border mx-0.5 shrink-0" />

        {/* Mirror mode */}
        <div className="flex gap-0.5">
          {MIRROR_MODES.map((m) => (
            <button
              key={m.id}
              className={`btn btn-icon text-xs${mirrorMode === m.id ? " active" : ""}`}
              onClick={() => setMirrorMode(m.id)}
              title={m.label}
            >
              {m.icon}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-border mx-0.5 shrink-0" />

        <button
          className={`btn btn-icon ml-auto text-xs${showGrid ? " active" : ""}`}
          onClick={() => setShowGrid(!showGrid)}
          title="Toggle grid (G)"
        >
          Grid
        </button>
        <button className="btn btn-icon" onClick={() => setZoom(zoom - 2)} title="Zoom out ([)">−</button>
        <span className="text-[11px] text-text-secondary min-w-7.5 text-center">{zoom}px</span>
        <button className="btn btn-icon" onClick={() => setZoom(zoom + 2)} title="Zoom in (])">+</button>
        {activeTool === "rect-select" && (
          <button className="btn btn-icon text-[11px]" onClick={() => setSelectRect(null)} title="Clear selection">
            ✕ Sel
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="flex-1 flex overflow-hidden">
          <div className="w-9 bg-bg-secondary border-r border-border flex flex-col items-center py-1.5 gap-0.5 shrink-0">
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                className={`tool-btn${activeTool === tool.id ? " active" : ""}`}
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
