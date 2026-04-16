import { useRef, useState, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useStore } from '../../store';
import { extractPaletteFromImage, savePaletteJson, loadPaletteJson } from '../../core/palette-io';
import { loadImageFromFile } from '../../core/image-import';
import { SAMPLE_PALETTES } from '../../core/palette-samples';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const PALETTE_SIZE = 32;

function padPalette(colors: string[]): string[] {
  const out = colors.slice(0, PALETTE_SIZE);
  while (out.length < PALETTE_SIZE) out.push('#000000');
  return out;
}

export function Palette() {
  const { palette, activeColor, setColor, setPaletteColor, setPalette } = useStore();
  const pngRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

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
        <div className="relative" ref={menuRef}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="btn text-[10px] py-0.5 px-1.5"
                onClick={() => setMenuOpen((v) => !v)}
                title="Palette actions — import, save, built-ins"
              >
                <MoreHorizontal className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Palette actions — import, save, built-ins</TooltipContent>
          </Tooltip>
          {menuOpen && (
            <div className="absolute top-full right-0 mt-0.5 bg-bg-secondary border border-border rounded-md shadow-app min-w-48 z-100 overflow-hidden">
              <MenuItem label="Import from PNG" onClick={() => { pngRef.current?.click(); setMenuOpen(false); }} />
              <MenuItem label="Import JSON"     onClick={() => { jsonRef.current?.click(); setMenuOpen(false); }} />
              <MenuItem label="Save as JSON"    onClick={() => { savePaletteJson(palette); setMenuOpen(false); }} />
              <Divider />
              <div className="py-1 px-3 text-[10px] uppercase tracking-wider text-text-muted">Built-in</div>
              {SAMPLE_PALETTES.map((p) => (
                <MenuItem
                  key={p.id}
                  label={p.name}
                  onClick={() => { setPalette(padPalette(p.colors)); setMenuOpen(false); }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-8 gap-1">
        {palette.map((color, i) => (
          <div
            key={i}
            className={`swatch${activeColor === color ? ' active' : ''}`}
            style={{ background: color || '#000' }}
            title={color}
            onClick={() => setColor(color)}
            onDoubleClick={() => setPaletteColor(i, activeColor)}
          />
        ))}
      </div>

      <input ref={pngRef}  type="file" accept="image/*"       className="hidden" onChange={handleImportPng} />
      <input ref={jsonRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportJson} />
    </div>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="w-full text-left py-1.5 px-3 cursor-pointer text-xs text-text-primary hover:bg-bg-hover transition-all active:scale-[0.98]"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function Divider() {
  return <div className="h-px bg-border my-0.5" />;
}
