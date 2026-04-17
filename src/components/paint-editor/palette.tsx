import { useRef } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useStore } from '../../store';
import { extractPaletteFromImage, savePaletteJson, loadPaletteJson } from '../../core/palette-io';
import { loadImageFromFile } from '../../core/image-import';
import { SAMPLE_PALETTES } from '../../core/palette-samples';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const PALETTE_SIZE = 32;

function padPalette(colors: string[]): string[] {
  const out = colors.slice(0, PALETTE_SIZE);
  while (out.length < PALETTE_SIZE) out.push('#000000');
  return out;
}

export function Palette() {
  const { palette, activePaletteIndex, activeColor, pickPaletteSlot, setPaletteColor, setPalette } = useStore();
  const pngRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);

  const handleImportPng = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const img = await loadImageFromFile(file);
      setPalette(extractPaletteFromImage(img));
    } catch {
      alert('Failed to load image');
    }
    e.target.value = '';
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const colors = await loadPaletteJson(file);
      setPalette(colors);
    } catch (err) {
      alert((err as Error).message);
    }
    e.target.value = '';
  };

  return (
    <div className="shrink-0">
      <div className="flex items-center justify-between mb-2">
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  className="btn text-[10px] py-0.5 px-1.5"
                  title="Palette actions — import, save, built-ins"
                >
                  <MoreHorizontal className="size-3.5" />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Palette actions — import, save, built-ins</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="min-w-48">
            <DropdownMenuItem onSelect={() => pngRef.current?.click()}>
              Import from PNG
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => jsonRef.current?.click()}>
              Import JSON
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => savePaletteJson(palette)}>
              Save as JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="label-section">Built-in</DropdownMenuLabel>
            {SAMPLE_PALETTES.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onSelect={() => setPalette(padPalette(p.colors))}
              >
                {p.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-8 gap-1">
        {palette.map((color, i) => (
          <div
            key={i}
            className={`swatch${activePaletteIndex === i ? ' active' : ''}`}
            style={{ background: color || '#000' }}
            title={color}
            onClick={() => pickPaletteSlot(i)}
            onDoubleClick={() => setPaletteColor(i, activeColor)}
          />
        ))}
      </div>

      <input ref={pngRef}  type="file" accept="image/*"       className="hidden" onChange={handleImportPng} />
      <input ref={jsonRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportJson} />
    </div>
  );
}
