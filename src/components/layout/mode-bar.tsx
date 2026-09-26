import { useMemo } from 'react';
import { Pencil, Layers, Box, Download, Circle, Blocks } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useStore } from '../../store';
import { ViewControls } from './view-controls';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Kbd } from '@/components/ui/kbd';
import type { EditorMode } from '../../types';
import { cn } from '@/lib/utils';

const MODES: { id: EditorMode; label: string; Icon: LucideIcon; hint: string }[] = [
  { id: 'draw',   label: 'Draw',   Icon: Pencil,   hint: 'Paint the flat board' },
  { id: 'depth',  label: 'Depth',  Icon: Layers,   hint: 'Give each cell a thickness' },
  { id: 'scene',  label: 'Scene',  Icon: Blocks,   hint: 'Arrange assets into a scene' },
  { id: 'model',  label: 'Model',  Icon: Box,      hint: 'Orbit the built model' },
  { id: 'export', label: 'Export', Icon: Download, hint: 'Write a file' },
];

function ProjectStatus() {
  const projectName = useStore((s) => s.projectName);
  const isDirty = useStore((s) => s.isDirty);
  const gridWidth = useStore((s) => s.gridWidth);
  const gridHeight = useStore((s) => s.gridHeight);
  const cursorPos = useStore((s) => s.cursorPos);
  const colorMap = useStore((s) => s.colorMap);

  const { cellsFilled, colorsUsed } = useMemo(() => {
    const used = new Set<string>();
    let filled = 0;
    for (const c of colorMap) {
      if (!c) continue;
      used.add(c);
      filled++;
    }
    return { cellsFilled: filled, colorsUsed: used.size };
  }, [colorMap]);

  return (
    <div className="flex items-center gap-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex cursor-default items-center gap-1.5">
            <span className="max-w-44 truncate font-mono text-xs text-text-primary">
              {(projectName ?? 'untitled').replace(/\.vxs$/i, '')}
            </span>
            <Circle
              aria-hidden="true"
              className={cn('size-2', isDirty ? 'fill-accent text-accent' : 'fill-text-muted text-text-muted')}
              strokeWidth={0}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          {isDirty ? 'Unsaved changes' : 'Saved'}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <span className="hidden cursor-default rounded-md border border-border bg-bg-secondary px-2 py-1 font-mono text-[11px] text-text-muted sm:inline">
            {gridWidth}×{gridHeight}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          {cellsFilled} of {gridWidth * gridHeight} cells painted, {colorsUsed} colours used
        </TooltipContent>
      </Tooltip>

      <span className="hidden min-w-16 font-mono text-[11px] text-text-muted lg:inline">
        {cursorPos ? `${cursorPos.x}, ${cursorPos.y}` : ''}
      </span>
    </div>
  );
}

/** The bottom bar: which project, which mode, and how the 2D stage is framed.
 *  Mode is the only navigation in the app. */
export function ModeBar() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const showViewControls = mode === 'draw' || mode === 'depth';

  return (
    <footer className="z-20 grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-t border-border bg-bg-panel px-3">
      <ProjectStatus />

      <nav aria-label="Editor mode" className="flex h-full items-stretch justify-self-center">
        {MODES.map((m) => (
          <Tooltip key={m.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-current={mode === m.id ? 'page' : undefined}
                className={cn('mode-tab', mode === m.id && 'active')}
                onClick={() => setMode(m.id)}
              >
                <m.Icon className="size-4" />
                <span className="text-[11px] font-medium">{m.label}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {m.hint}
              <Kbd keys={`Ctrl+${MODES.indexOf(m) + 1}`} tone="inverted" className="ml-1" />
            </TooltipContent>
          </Tooltip>
        ))}
      </nav>

      <div className="justify-self-end">{showViewControls && <ViewControls />}</div>
    </footer>
  );
}
