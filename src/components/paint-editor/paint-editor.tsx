import { Group, Panel, Separator, useDefaultLayout } from "react-resizable-panels";
import {
  Pencil, Eraser, PaintBucket, Slash, Pipette, SquareDashed,
  CircleOff, FlipHorizontal2, FlipVertical2,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Minus, Plus, X,
  type LucideIcon,
} from "lucide-react";
import { useStore } from "../../store";
import { PaintCanvas } from "./paint-canvas";
import { ColorPicker } from "./color-picker";
import { Palette } from "./palette";
import { ShapePicker } from "./shape-picker";
import type { MirrorMode } from "../../types";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const TOOLS: { id: 'pencil' | 'eraser' | 'fill' | 'line' | 'eyedropper' | 'rect-select'; Icon: LucideIcon; label: string }[] = [
  { id: "pencil",      Icon: Pencil,       label: "Pencil (B)" },
  { id: "eraser",      Icon: Eraser,       label: "Eraser (E)" },
  { id: "fill",        Icon: PaintBucket,  label: "Fill (F)" },
  { id: "line",        Icon: Slash,        label: "Line (L)" },
  { id: "eyedropper",  Icon: Pipette,      label: "Eyedropper (D)" },
  { id: "rect-select", Icon: SquareDashed, label: "Select (S)" },
];

const MIRROR_MODES: { id: MirrorMode; Icon: LucideIcon; label: string }[] = [
  { id: "none",       Icon: CircleOff,       label: "No mirror" },
  { id: "horizontal", Icon: FlipHorizontal2, label: "Mirror horizontal" },
  { id: "vertical",   Icon: FlipVertical2,   label: "Mirror vertical" },
];

export function PaintEditor() {
  const {
    activeTool,
    setTool,
    showGrid,
    setShowGrid,
    zoom,
    setZoom,
    selectRect,
    setSelectRect,
    mirrorMode,
    setMirrorMode,
    shiftCanvas,
  } = useStore();

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "vxs-paint-inner",
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  });

  return (
    <div className="flex flex-col bg-bg-panel overflow-hidden min-w-0 h-full">
      <div className="min-h-9 bg-bg-secondary border-b border-border flex flex-wrap items-center px-3 py-1 gap-2 shrink-0">
        <span className="label-title shrink-0">Paint</span>

        {/* Mirror mode */}
        <div className="flex gap-1">
          {MIRROR_MODES.map((m) => (
            <Tooltip key={m.id}>
              <TooltipTrigger asChild>
                <button
                  className={`btn btn-icon text-xs${mirrorMode === m.id ? " active" : ""}`}
                  onClick={() => setMirrorMode(m.id)}
                  title={m.label}
                >
                  <m.Icon className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{m.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Canvas shift */}
        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="btn btn-icon text-xs" onClick={() => shiftCanvas(0, -1)} title="Shift up (Alt+↑)"><ArrowUp className="size-3.5" /></button>
            </TooltipTrigger>
            <TooltipContent>Shift up <kbd data-slot="kbd" className="ml-1 bg-black/30 px-1 text-[10px]">Alt+↑</kbd></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="btn btn-icon text-xs" onClick={() => shiftCanvas(0, 1)} title="Shift down (Alt+↓)"><ArrowDown className="size-3.5" /></button>
            </TooltipTrigger>
            <TooltipContent>Shift down <kbd data-slot="kbd" className="ml-1 bg-black/30 px-1 text-[10px]">Alt+↓</kbd></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="btn btn-icon text-xs" onClick={() => shiftCanvas(-1, 0)} title="Shift left (Alt+←)"><ArrowLeft className="size-3.5" /></button>
            </TooltipTrigger>
            <TooltipContent>Shift left <kbd data-slot="kbd" className="ml-1 bg-black/30 px-1 text-[10px]">Alt+←</kbd></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="btn btn-icon text-xs" onClick={() => shiftCanvas(1, 0)} title="Shift right (Alt+→)"><ArrowRight className="size-3.5" /></button>
            </TooltipTrigger>
            <TooltipContent>Shift right <kbd data-slot="kbd" className="ml-1 bg-black/30 px-1 text-[10px]">Alt+→</kbd></TooltipContent>
          </Tooltip>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={`btn btn-icon ml-auto${showGrid ? " active" : ""}`}
              onClick={() => setShowGrid(!showGrid)}
              title="Toggle grid (G)"
            >
              Grid
            </button>
          </TooltipTrigger>
          <TooltipContent>Toggle grid <kbd data-slot="kbd" className="ml-1 bg-black/30 px-1 text-[10px]">G</kbd></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button className="btn btn-icon" onClick={() => setZoom(zoom - 2)} title="Zoom out ([)"><Minus className="size-3.5" strokeWidth={1.8} /></button>
          </TooltipTrigger>
          <TooltipContent>Zoom out <kbd data-slot="kbd" className="ml-1 bg-black/30 px-1 text-[10px]">[</kbd></TooltipContent>
        </Tooltip>
        <span className="text-xs text-text-muted min-w-8 text-center">{zoom}px</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="btn btn-icon" onClick={() => setZoom(zoom + 2)} title="Zoom in (])"><Plus className="size-3.5" strokeWidth={1.8} /></button>
          </TooltipTrigger>
          <TooltipContent>Zoom in <kbd data-slot="kbd" className="ml-1 bg-black/30 px-1 text-[10px]">]</kbd></TooltipContent>
        </Tooltip>
        {selectRect && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="btn btn-primary text-xs inline-flex items-center gap-1 whitespace-nowrap"
                onClick={() => setSelectRect(null)}
                title="Paint is locked to the rectangle you drew. Click to unlock."
              >
                <X className="size-3" />
                <span>Clear selection</span>
                <span className="text-[10px] opacity-70 font-mono">Esc</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Paint is locked to the rectangle. Click to unlock.
              <kbd data-slot="kbd" className="ml-1 bg-black/30 px-1 text-[10px]">Esc</kbd>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <Group
        orientation="vertical"
        id="vxs-paint-inner"
        defaultLayout={defaultLayout}
        onLayoutChanged={onLayoutChanged}
        className="flex-1 overflow-hidden"
      >
        <Panel id="canvas" defaultSize={60} minSize={25}>
          <div className="flex h-full overflow-hidden">
            <div className="w-9 bg-bg-secondary border-r border-border flex flex-col items-center py-1.5 gap-0.5 shrink-0">
              {TOOLS.map((tool) => {
                const [name, shortcut] = tool.label.split(' (');
                return (
                  <Tooltip key={tool.id}>
                    <TooltipTrigger asChild>
                      <button
                        className={`tool-btn${activeTool === tool.id ? " active" : ""}`}
                        onClick={() => setTool(tool.id)}
                        title={tool.label}
                      >
                        <tool.Icon className="size-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {name}
                      {shortcut && (
                        <kbd data-slot="kbd" className="ml-1 bg-black/30 px-1 text-[10px]">
                          {shortcut.replace(')', '')}
                        </kbd>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
            <PaintCanvas />
          </div>
        </Panel>
        <Separator className="resize-handle-v" />
        <Panel id="controls" defaultSize={40} minSize={20}>
          <div className="h-full overflow-y-auto bg-bg-secondary">
            <Accordion type="multiple" defaultValue={['color', 'palette']}>
              <AccordionItem value="color">
                <AccordionTrigger>Color</AccordionTrigger>
                <AccordionContent>
                  <ColorPicker />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="palette">
                <AccordionTrigger>Palette</AccordionTrigger>
                <AccordionContent>
                  <Palette />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="shape">
                <AccordionTrigger>Shape</AccordionTrigger>
                <AccordionContent>
                  <ShapePicker />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </Panel>
      </Group>
    </div>
  );
}
