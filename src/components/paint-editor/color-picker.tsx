import { useState, useEffect } from 'react';
import { useStore } from '../../store';

export function ColorPicker() {
  const { activeColor, setColor } = useStore();
  const [hexInput, setHexInput] = useState(activeColor);

  useEffect(() => {
    setHexInput(activeColor);
  }, [activeColor]);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHexInput(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      setColor(val);
    }
  };

  const handleNativePicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    setColor(e.target.value);
  };

  return (
    <div className="bg-bg-secondary border-t border-border p-2 shrink-0">
      <div className="text-[10px] text-text-muted uppercase tracking-widest mb-1.5">Color</div>
      <div className="flex items-center gap-2 mb-2">
        <div className="size-8 rounded-sm border border-border shrink-0 cursor-pointer relative" style={{ background: activeColor }}>
          <input
            type="color"
            className="absolute inset-0 opacity-0 cursor-pointer size-full"
            value={activeColor}
            onChange={handleNativePicker}
            title="Pick color"
          />
        </div>
        <input
          type="text"
          className="flex-1 h-7 px-1.5 border border-border rounded-sm bg-bg-input text-text-primary text-xs font-mono focus:outline-hidden focus:border-border-focus"
          value={hexInput}
          onChange={handleHexChange}
          maxLength={7}
          placeholder="#rrggbb"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
