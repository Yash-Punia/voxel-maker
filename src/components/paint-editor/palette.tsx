import { useStore } from '../../store';

export function Palette() {
  const { palette, activeColor, setColor, setPaletteColor } = useStore();

  return (
    <div className="bg-bg-secondary border-t border-border p-2 shrink-0">
      <div className="text-[10px] text-text-muted uppercase tracking-widest mb-1.5">Palette (double-click to set)</div>
      <div className="grid grid-cols-8 gap-0.75">
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
    </div>
  );
}
