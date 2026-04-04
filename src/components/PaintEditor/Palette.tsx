import { useStore } from '../../store';

export function Palette() {
  const { palette, activeColor, setColor, setPaletteColor } = useStore();

  const handleSwatchClick = (color: string) => {
    setColor(color);
  };

  const handleSwatchDoubleClick = (index: number) => {
    // Replace swatch with current active color
    setPaletteColor(index, activeColor);
  };

  return (
    <div className="color-section">
      <div className="color-section-title">Palette (double-click to set)</div>
      <div className="palette-grid">
        {palette.map((color, i) => (
          <div
            key={i}
            className={`swatch${activeColor === color ? ' active' : ''}`}
            style={{ background: color || '#000' }}
            title={color}
            onClick={() => handleSwatchClick(color)}
            onDoubleClick={() => handleSwatchDoubleClick(i)}
          />
        ))}
      </div>
    </div>
  );
}
