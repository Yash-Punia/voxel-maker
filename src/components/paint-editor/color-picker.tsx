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
    <div className="color-section">
      <div className="color-section-title">Color</div>
      <div className="color-row">
        <div className="color-preview" style={{ background: activeColor }}>
          <input
            type="color"
            className="color-picker-native"
            value={activeColor}
            onChange={handleNativePicker}
            title="Pick color"
          />
        </div>
        <input
          type="text"
          className="color-hex-input"
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
