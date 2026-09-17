import { useEffect, useMemo, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

import { useStore } from '../../store';
import { extractPaletteFromImage, savePaletteJson, loadPaletteJson } from '../../core/palette-io';
import { loadImageFromFile } from '../../core/image-import';
import { SAMPLE_PALETTES } from '../../core/palette-samples';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const PALETTE_SIZE = 32;

function padPalette(colors: string[]): string[] {
  const out = colors.slice(0, PALETTE_SIZE);
  while (out.length < PALETTE_SIZE) out.push('#000000');
  return out;
}

function ColorPopover() {
  const activeColor = useStore((s) => s.activeColor);
  const setColor = useStore((s) => s.setColor);
  const [hexInput, setHexInput] = useState(activeColor);

  useEffect(() => {
    setHexInput(activeColor);
  }, [activeColor]);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHexInput(value);
    if (/^#[0-9a-fA-F]{6}$/.test(value)) setColor(value);
  };

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Active colour ${activeColor}`}
              className="size-8 shrink-0 cursor-pointer rounded-lg border border-border-strong transition-all duration-150 hover:border-text-muted active:scale-[0.98]"
              style={{ background: activeColor }}
            />
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="left">Active colour, click to edit</TooltipContent>
      </Tooltip>
      <PopoverContent side="left" align="start" className="w-64">
        <div className="flex flex-col gap-3">
          <div className="label-section">Active colour</div>
          <div className="flex items-center gap-2">
            <div
              className="relative size-9 shrink-0 cursor-pointer rounded-lg border border-border-strong"
              style={{ background: activeColor }}
            >
              <input
                type="color"
                aria-label="Pick colour"
                className="absolute inset-0 size-full cursor-pointer opacity-0"
                value={activeColor}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
            <input
              type="text"
              aria-label="Hex colour"
              className="field field-mono flex-1"
              value={hexInput}
              onChange={handleHexChange}
              maxLength={7}
              placeholder="#rrggbb"
              spellCheck={false}
            />
          </div>
          <p className="text-[11px] leading-relaxed text-text-muted">
            Double-click a swatch to overwrite it with this colour.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Right rail in draw mode: the 32-slot palette, the active colour, and the
 *  palette import and export actions. */
export function PaletteRail() {
  const palette = useStore((s) => s.palette);
  const activePaletteIndex = useStore((s) => s.activePaletteIndex);
  const activeColor = useStore((s) => s.activeColor);
  const pickPaletteSlot = useStore((s) => s.pickPaletteSlot);
  const setPaletteColor = useStore((s) => s.setPaletteColor);
  const setPalette = useStore((s) => s.setPalette);

  const pngRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);

  const activeBuiltIn = useMemo(
    () =>
      SAMPLE_PALETTES.find((sample) =>
        padPalette(sample.colors).every((color, index) => color === palette[index]),
      )?.id ?? null,
    [palette],
  );

  const handleImportPng = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPalette(extractPaletteFromImage(await loadImageFromFile(file)));
    } catch {
      alert('Failed to load image');
    }
    e.target.value = '';
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPalette(await loadPaletteJson(file));
    } catch (err) {
      alert((err as Error).message);
    }
    e.target.value = '';
  };

  return (
    <div className="rail rail-v gap-2 p-1.5">
      <ColorPopover />

      <div className="rail-sep-v" />

      <div className="grid grid-cols-2 gap-1.5">
        {palette.map((color, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`Palette slot ${i + 1}, ${color}`}
                className={cn('swatch size-6', activePaletteIndex === i && 'active')}
                style={{ background: color || '#000000' }}
                onClick={() => pickPaletteSlot(i)}
                onDoubleClick={() => setPaletteColor(i, activeColor)}
              />
            </TooltipTrigger>
            <TooltipContent side="left">
              <span className="font-mono">{color}</span>
              <span className="text-background/60">double-click to replace</span>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      <div className="rail-sep-v" />

      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Palette actions" className="icon-btn">
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="left">Palette actions</TooltipContent>
        </Tooltip>
        <DropdownMenuContent side="left" align="end">
          <DropdownMenuLabel>Built-in palettes</DropdownMenuLabel>
          {SAMPLE_PALETTES.map((sample) => (
            <DropdownMenuItem
              key={sample.id}
              onSelect={() => setPalette(padPalette(sample.colors))}
            >
              <span
                className="size-3 shrink-0 rounded-full border border-black/40"
                style={{ background: sample.colors[8] ?? sample.colors[0] }}
              />
              {sample.name}
              {activeBuiltIn === sample.id && (
                <span className="ml-auto text-[10px] text-accent">active</span>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>File</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => pngRef.current?.click()}>
            Import from PNG
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => jsonRef.current?.click()}>
            Import JSON
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => savePaletteJson(palette)}>
            Save as JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input ref={pngRef} type="file" accept="image/*" className="hidden" onChange={handleImportPng} />
      <input
        ref={jsonRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportJson}
      />
    </div>
  );
}
