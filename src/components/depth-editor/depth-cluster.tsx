import { useState } from 'react';
import { Sparkles, Ruler } from 'lucide-react';

import { useStore } from '../../store';
import { generateDepth, type DepthGenMode } from '../../core/depth-generate';
import { Segmented } from '@/components/ui/segmented';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { ExtrusionMode } from '../../types';

const VIEWS = [
  { value: 'depth' as const, label: 'Ramp', title: 'Tint cells by depth value' },
  { value: 'color' as const, label: 'Art', title: 'Show the painted colours' },
];

const GEN_MODES: { value: DepthGenMode; label: string; title: string }[] = [
  { value: 'luminosity', label: 'Luma', title: 'Brighter colours get more depth' },
  { value: 'color-index', label: 'Slot', title: 'Palette position sets depth' },
  { value: 'noise', label: 'Noise', title: 'Random depth per cell' },
];

const EXTRUSIONS: { value: ExtrusionMode; label: string; title: string }[] = [
  { value: 'single', label: 'Front', title: 'Extrude toward the viewer, Z=0 to +depth' },
  { value: 'symmetric', label: 'Centre', title: 'Extrude both ways, ±depth/2' },
  { value: 'back', label: 'Back', title: 'Extrude away from the viewer, −depth to Z=0' },
];

function AutoDepthPopover() {
  const [genMode, setGenMode] = useState<DepthGenMode>('luminosity');
  const [genMin, setGenMin] = useState(1);
  const [genMax, setGenMax] = useState(8);
  const [genInvert, setGenInvert] = useState(false);
  const [open, setOpen] = useState(false);

  const handleApply = () => {
    const s = useStore.getState();
    const next = generateDepth(s.colorMap, genMode, s.palette, {
      min: genMin,
      max: genMax,
      invert: genInvert,
    });
    s.pushSnapshot({
      colorMap: [...s.colorMap],
      depthMap: [...s.depthMap],
      shapeMap: [...s.shapeMap],
      rotationMap: [...s.rotationMap],
    });
    s.setDepthMap(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button type="button" className="btn btn-ghost" aria-label="Auto depth">
              <Sparkles className="size-4" />
              Auto depth
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Generate depth from the artwork</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-72">
        <div className="flex flex-col gap-3">
          <div className="label-section">Auto depth</div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-text-secondary">Source</span>
            <Segmented value={genMode} options={GEN_MODES} onChange={setGenMode} aria-label="Depth source" />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-text-secondary">Range</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                aria-label="Minimum depth"
                className="field field-mono w-12 px-1 text-center"
                value={genMin}
                min={1}
                max={genMax}
                onChange={(e) => setGenMin(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <span className="text-xs text-text-muted">to</span>
              <input
                type="number"
                aria-label="Maximum depth"
                className="field field-mono w-12 px-1 text-center"
                value={genMax}
                min={genMin}
                max={32}
                onChange={(e) => setGenMax(Math.min(32, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 select-none">
            <input
              type="checkbox"
              className="size-3.5 cursor-pointer accent-accent"
              checked={genInvert}
              onChange={(e) => setGenInvert(e.target.checked)}
            />
            <span className="text-xs text-text-secondary">Invert the mapping</span>
          </label>

          <p className="text-[11px] leading-relaxed text-text-muted">
            Rewrites the depth of every painted cell. Undo with Ctrl+Z.
          </p>

          <button type="button" className="btn btn-primary w-full" onClick={handleApply}>
            Apply to painted cells
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ExtrusionPopover() {
  const extrusionMode = useStore((s) => s.extrusionMode);
  const setExtrusionMode = useStore((s) => s.setExtrusionMode);
  const depthMultiplier = useStore((s) => s.depthMultiplier);
  const setDepthMultiplier = useStore((s) => s.setDepthMultiplier);

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button type="button" className="btn btn-ghost" aria-label="Extrusion settings">
              <Ruler className="size-4" />
              Extrusion
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>How depth becomes thickness</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-72">
        <div className="flex flex-col gap-3">
          <div className="label-section">Extrusion</div>

          <Segmented
            value={extrusionMode}
            options={EXTRUSIONS}
            onChange={setExtrusionMode}
            className="w-full"
            itemClassName="flex-1"
            aria-label="Extrusion direction"
          />

          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs text-text-secondary">Multiplier</span>
            <input
              type="range"
              aria-label="Depth multiplier"
              className="h-3 flex-1 cursor-pointer accent-accent"
              value={depthMultiplier}
              min={0.25}
              max={4.0}
              step={0.25}
              onChange={(e) => setDepthMultiplier(parseFloat(e.target.value))}
            />
            <span className="w-10 text-right font-mono text-xs text-text-muted">
              {depthMultiplier.toFixed(2)}×
            </span>
          </div>

          <p className="text-[11px] leading-relaxed text-text-muted">
            The multiplier scales every depth value when the model is built and exported.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Top-bar cluster for depth mode. */
export function DepthCluster() {
  const depthView = useStore((s) => s.depthView);
  const setDepthView = useStore((s) => s.setDepthView);

  return (
    <>
      <div className="rail gap-2 px-2.5">
        <span className="label-section">Tint</span>
        <Segmented value={depthView} options={VIEWS} onChange={setDepthView} aria-label="Depth tint" />
      </div>

      <div className="rail">
        <AutoDepthPopover />
        <div className="rail-sep" />
        <ExtrusionPopover />
      </div>
    </>
  );
}
