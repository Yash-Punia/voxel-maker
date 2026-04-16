import { useEffect, useRef } from 'react';
import { SAMPLES, materializeSample, type SampleDef } from '../../core/samples';
import { getShape } from '../../core/shapes';

interface SamplesModalProps {
  onSelect: (sample: SampleDef) => void;
  onClose: () => void;
}

const THUMB_SIZE = 96;

function SampleThumbnail({ sample }: { sample: SampleDef }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const { gridWidth: w, gridHeight: h, colorMap, shapeMap, rotationMap } = materializeSample(sample);
    const cell = THUMB_SIZE / Math.max(w, h);

    ctx.clearRect(0, 0, THUMB_SIZE, THUMB_SIZE);
    ctx.fillStyle = '#1a1a20';
    ctx.fillRect(0, 0, THUMB_SIZE, THUMB_SIZE);

    const ox = (THUMB_SIZE - w * cell) / 2;
    const oy = (THUMB_SIZE - h * cell) / 2;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const color = colorMap[idx];
        if (!color) continue;
        ctx.fillStyle = color;
        const shape = getShape(shapeMap[idx] ?? 'square');
        shape.draw2D(ctx, ox + x * cell, oy + y * cell, cell, rotationMap[idx] ?? 0);
      }
    }
  }, [sample]);

  return (
    <canvas
      ref={ref}
      width={THUMB_SIZE}
      height={THUMB_SIZE}
      className="rounded-sm"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

export function SamplesModal({ onSelect, onClose }: SamplesModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/55 flex items-center justify-center z-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-bg-secondary border border-border rounded-md shadow-app p-5 min-w-110 max-w-160 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="label-title text-text-primary">Sample Projects</div>
          <button className="btn text-xs" onClick={onClose}>Close</button>
        </div>
        <div className="text-xs text-text-muted">Click any sample to load it. Unsaved changes will be lost.</div>
        <div className="grid grid-cols-3 gap-3">
          {SAMPLES.map((s) => (
            <button
              key={s.id}
              className="flex flex-col items-start gap-1.5 p-2 rounded-md border border-border hover:bg-bg-hover hover:border-border-focus cursor-pointer text-left transition-all active:scale-[0.98]"
              onClick={() => onSelect(s)}
            >
              <SampleThumbnail sample={s} />
              <div className="text-xs text-text-primary font-medium">{s.name}</div>
              <div className="text-[10px] text-text-muted leading-tight">{s.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
