import { useState, useRef } from 'react';
import { useStore } from '../../store';
import { DepthCanvas, type DepthViewMode } from './depth-canvas';
import { generateDepth, type DepthGenMode } from '../../core/depth-generate';
import { exportDepthMapPng, importDepthMapPng } from '../../core/depth-map-io';

const MODE_LABELS: { id: DepthGenMode; label: string; title: string }[] = [
  { id: 'luminosity',   label: 'Luma',   title: 'Brighter colors → more depth' },
  { id: 'color-index',  label: 'Palette', title: 'Palette position → depth' },
  { id: 'noise',        label: 'Noise',  title: 'Random depth per cell' },
];

export function DepthEditor() {
  const { activeDepth, setActiveDepth, extrusionMode, setExtrusionMode, depthMultiplier, setDepthMultiplier, colorMap, depthMap, shapeMap, rotationMap, gridWidth, gridHeight, palette, pushSnapshot, setDepthMap } = useStore();

  const [viewMode, setViewMode] = useState<DepthViewMode>('depth');
  const [genMode, setGenMode] = useState<DepthGenMode>('luminosity');
  const [genMin, setGenMin] = useState(1);
  const [genMax, setGenMax] = useState(8);
  const [genInvert, setGenInvert] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const handleExportDepth = () => exportDepthMapPng(depthMap, colorMap, gridWidth, gridHeight);

  const handleImportDepth = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importDepthMapPng(file, gridWidth, gridHeight).then((newDepth) => {
      pushSnapshot({ colorMap: [...colorMap], depthMap: [...depthMap], shapeMap: [...shapeMap], rotationMap: [...rotationMap] });
      setDepthMap(newDepth);
    });
    e.target.value = '';
  };

  const handleApply = () => {
    const newDepth = generateDepth(colorMap, genMode, palette, { min: genMin, max: genMax, invert: genInvert });
    pushSnapshot({ colorMap: [...colorMap], depthMap: [...depthMap], shapeMap: [...shapeMap], rotationMap: [...rotationMap] });
    setDepthMap(newDepth);
  };

  return (
    <div className="flex flex-col bg-bg-panel overflow-hidden min-w-0 flex-[1_1_320px]">
      <div className="h-9 bg-bg-secondary border-b border-border flex items-center px-2.5 gap-2 shrink-0">
        <span className="font-semibold text-xs text-text-secondary uppercase tracking-[0.08em]">Depth Editor</span>
        <div className="flex gap-0.5 ml-auto">
          <button
            className={`btn text-[11px]${viewMode === 'depth' ? ' active' : ''}`}
            onClick={() => setViewMode('depth')}
            title="Show depth values as cool-to-warm color ramp with numbers"
          >
            Depth
          </button>
          <button
            className={`btn text-[11px]${viewMode === 'color' ? ' active' : ''}`}
            onClick={() => setViewMode('color')}
            title="Show actual paint colors for reference"
          >
            Color
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="flex-1 flex overflow-hidden">
          <DepthCanvas viewMode={viewMode} />
        </div>

        {/* Brush + extrusion controls */}
        <div className="bg-bg-secondary border-t border-border p-2 shrink-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] text-text-secondary min-w-17.5">Brush depth:</span>
            <input
              type="number"
              className="w-13 h-6.5 px-1.5 border border-border rounded-sm bg-bg-input text-text-primary text-xs text-center focus:outline-hidden focus:border-border-focus"
              value={activeDepth}
              min={0}
              max={32}
              title="Brush depth (0 = suppress, 1-32 = extrusion units)"
              onChange={(e) => setActiveDepth(parseInt(e.target.value) || 0)}
            />
            <span className="text-[11px] text-text-muted">(0 = suppress)</span>
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] text-text-secondary min-w-17.5">Multiplier:</span>
            <input
              type="range"
              className="flex-1 h-3 accent-accent cursor-pointer"
              value={depthMultiplier}
              min={0.25}
              max={4.0}
              step={0.25}
              title="Depth multiplier applied at export (0.25× – 4×)"
              onChange={(e) => setDepthMultiplier(parseFloat(e.target.value))}
            />
            <span className="text-[11px] text-text-muted w-7 text-right">{depthMultiplier.toFixed(2)}×</span>
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] text-text-secondary min-w-17.5">Extrusion:</span>
            <div className="flex gap-0.5">
              <button
                className={`btn${extrusionMode === 'single' ? ' active' : ''}`}
                onClick={() => setExtrusionMode('single')}
                title="Front: extrude toward viewer (Z=0 to +depth)"
              >
                Front
              </button>
              <button
                className={`btn${extrusionMode === 'symmetric' ? ' active' : ''}`}
                onClick={() => setExtrusionMode('symmetric')}
                title="Center: extrude both ways (±depth/2)"
              >
                Center
              </button>
              <button
                className={`btn${extrusionMode === 'back' ? ' active' : ''}`}
                onClick={() => setExtrusionMode('back')}
                title="Back: extrude away from viewer (-depth to Z=0)"
              >
                Back
              </button>
            </div>
          </div>
          <div className="text-[10px] text-text-muted mt-1">
            {extrusionMode === 'symmetric'
              ? 'Depth N → ±N/2 centered at Z=0'
              : extrusionMode === 'back'
              ? 'Depth N → Z=−N to Z=0 (away from viewer)'
              : 'Depth N → Z=0 to Z=+N (toward viewer)'}
          </div>
        </div>

        {/* Auto-depth generation */}
        <div className="bg-bg-secondary border-t border-border p-2 shrink-0">
          <div className="text-[10px] text-text-muted uppercase tracking-widest mb-1.5">Auto Depth</div>

          {/* Mode */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] text-text-secondary min-w-17.5">Mode:</span>
            <div className="flex gap-0.5">
              {MODE_LABELS.map((m) => (
                <button
                  key={m.id}
                  className={`btn text-[11px]${genMode === m.id ? ' active' : ''}`}
                  onClick={() => setGenMode(m.id)}
                  title={m.title}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Min / Max */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] text-text-secondary min-w-17.5">Min / Max:</span>
            <input
              type="number"
              className="w-10 h-6.5 px-1 border border-border rounded-sm bg-bg-input text-text-primary text-xs text-center focus:outline-hidden focus:border-border-focus"
              value={genMin}
              min={1}
              max={genMax}
              onChange={(e) => setGenMin(Math.max(1, parseInt(e.target.value) || 1))}
            />
            <span className="text-[11px] text-text-muted">–</span>
            <input
              type="number"
              className="w-10 h-6.5 px-1 border border-border rounded-sm bg-bg-input text-text-primary text-xs text-center focus:outline-hidden focus:border-border-focus"
              value={genMax}
              min={genMin}
              max={32}
              onChange={(e) => setGenMax(Math.min(32, parseInt(e.target.value) || 1))}
            />
          </div>

          {/* Invert + Apply */}
          <div className="flex items-center gap-2">
            <label
              className="flex items-center gap-1.5 cursor-pointer select-none"
              title="Flip mapping: lighter / higher index → shallower depth"
            >
              <input
                type="checkbox"
                className="size-3 accent-accent cursor-pointer"
                checked={genInvert}
                onChange={(e) => setGenInvert(e.target.checked)}
              />
              <span className="text-[11px] text-text-secondary">Invert</span>
            </label>
            <button
              className="btn btn-primary ml-auto text-[11px]"
              onClick={handleApply}
              title="Apply auto-depth to all painted cells"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Depth map import / export */}
        <div className="bg-bg-secondary border-t border-border p-2 shrink-0">
          <div className="text-[10px] text-text-muted uppercase tracking-widest mb-1.5">Depth Map PNG</div>
          <div className="flex gap-1.5">
            <button
              className="btn text-[11px]"
              onClick={handleExportDepth}
              title="Export depth map as grayscale PNG (brightness = depth)"
            >
              Export
            </button>
            <button
              className="btn text-[11px]"
              onClick={() => importRef.current?.click()}
              title="Import grayscale PNG as depth map"
            >
              Import
            </button>
            <input
              ref={importRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleImportDepth}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
