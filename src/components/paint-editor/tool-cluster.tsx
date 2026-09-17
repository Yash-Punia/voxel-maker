import {
  Pencil, Eraser, PaintBucket, Slash, Pipette, SquareDashed,
  CircleOff, FlipHorizontal2, FlipVertical2,
  type LucideIcon,
} from "lucide-react";

import { useStore } from "../../store";
import { IconButton } from "@/components/ui/icon-button";
import type { MirrorMode, Tool } from "../../types";

const TOOLS: { id: Tool; Icon: LucideIcon; label: string; shortcut: string }[] = [
  { id: "pencil",      Icon: Pencil,       label: "Pencil",            shortcut: "B" },
  { id: "eraser",      Icon: Eraser,       label: "Eraser",            shortcut: "E" },
  { id: "fill",        Icon: PaintBucket,  label: "Fill",              shortcut: "F" },
  { id: "line",        Icon: Slash,        label: "Line",              shortcut: "L" },
  { id: "eyedropper",  Icon: Pipette,      label: "Eyedropper",        shortcut: "D" },
  { id: "rect-select", Icon: SquareDashed, label: "Rectangle select",  shortcut: "S" },
];

const MIRROR_MODES: { id: MirrorMode; Icon: LucideIcon; label: string }[] = [
  { id: "none",       Icon: CircleOff,       label: "Mirror off" },
  { id: "horizontal", Icon: FlipHorizontal2, label: "Mirror left to right" },
  { id: "vertical",   Icon: FlipVertical2,   label: "Mirror top to bottom" },
];

/** Top-bar cluster for draw mode: what the pointer does, and whether strokes
 *  are mirrored across the board. */
export function ToolCluster() {
  const activeTool = useStore((s) => s.activeTool);
  const setTool = useStore((s) => s.setTool);
  const mirrorMode = useStore((s) => s.mirrorMode);
  const setMirrorMode = useStore((s) => s.setMirrorMode);

  return (
    <>
      <div className="rail">
        {TOOLS.map((tool) => (
          <IconButton
            key={tool.id}
            label={tool.label}
            shortcut={tool.shortcut}
            active={activeTool === tool.id}
            onClick={() => setTool(tool.id)}
          >
            <tool.Icon className="size-4" />
          </IconButton>
        ))}
      </div>

      <div className="rail">
        {MIRROR_MODES.map((m) => (
          <IconButton
            key={m.id}
            label={m.label}
            active={mirrorMode === m.id}
            onClick={() => setMirrorMode(m.id)}
          >
            <m.Icon className="size-4" />
          </IconButton>
        ))}
      </div>
    </>
  );
}
