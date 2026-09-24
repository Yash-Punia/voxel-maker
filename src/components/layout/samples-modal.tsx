import { useEffect, useRef } from 'react';

import { SAMPLES, materializeSample, type SampleDef } from '../../core/samples';
import { getShape } from '../../core/shapes';
import { CANVAS_COLORS } from '../../core/theme';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface SamplesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (sample: SampleDef) => void;
}

const THUMB_SIZE = 112;

function SampleThumbnail({ sample }: { sample: SampleDef }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const { gridWidth: w, gridHeight: h, colorMap, shapeMap, rotationMap } = materializeSample(sample);
    const cell = THUMB_SIZE / Math.max(w, h);

    ctx.clearRect(0, 0, THUMB_SIZE, THUMB_SIZE);
    ctx.fillStyle = CANVAS_COLORS.boardLight;
    ctx.fillRect(0, 0, THUMB_SIZE, THUMB_SIZE);

    const ox = (THUMB_SIZE - w * cell) / 2;
    const oy = (THUMB_SIZE - h * cell) / 2;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const color = colorMap[idx];
        if (!color) continue;
        ctx.fillStyle = color;
        getShape(shapeMap[idx] ?? 'square').draw2D(
          ctx,
          ox + x * cell,
          oy + y * cell,
          cell,
          rotationMap[idx] ?? 0,
        );
      }
    }
  }, [sample]);

  return (
    <canvas
      ref={ref}
      width={THUMB_SIZE}
      height={THUMB_SIZE}
      className="w-full rounded-lg"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

export function SamplesModal({ open, onOpenChange, onSelect }: SamplesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sample projects</DialogTitle>
          <DialogDescription>
            Each one loads a finished board you can take apart.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SAMPLES.map((sample) => (
              <button
                key={sample.id}
                type="button"
                className="flex cursor-pointer flex-col gap-2 rounded-xl border border-border bg-bg-secondary p-2 text-left transition-all duration-150 hover:border-border-strong hover:bg-bg-hover active:scale-[0.98]"
                onClick={() => onSelect(sample)}
              >
                <SampleThumbnail sample={sample} />
                <div className="px-0.5 pb-0.5">
                  <div className="text-xs font-medium text-text-primary">{sample.name}</div>
                  <div className="mt-0.5 text-[10px] leading-tight text-text-muted">
                    {sample.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
