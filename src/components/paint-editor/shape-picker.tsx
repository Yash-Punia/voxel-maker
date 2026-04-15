import { useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { SHAPES } from '../../core/shapes';
import type { ShapeDef } from '../../core/shapes';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const ICON_SIZE = 22;
const ACTIVE_COLOR = '#6b6bff';
const IDLE_COLOR = '#9898a8';

function ShapeIcon({ shape, rotation, active }: { shape: ShapeDef; rotation: number; active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
    ctx.fillStyle = active ? ACTIVE_COLOR : IDLE_COLOR;
    shape.draw2D(ctx, 0, 0, ICON_SIZE, rotation);
  }, [shape, rotation, active]);

  return <canvas ref={ref} width={ICON_SIZE} height={ICON_SIZE} style={{ display: 'block' }} />;
}

export function ShapePicker() {
  const { activeShape, activeRotation, setActiveShape, setActiveRotation } = useStore();

  return (
    <div className="bg-bg-secondary border-t border-border p-2 shrink-0">
      <div className="text-[10px] text-text-muted uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
        Shape
        <span className="text-[9px] normal-case tracking-normal">Space / scroll to rotate</span>
      </div>

      <div className="grid grid-cols-8 gap-0.75 mb-1.5">
        {SHAPES.map((shape, i) => (
          <Tooltip key={shape.id}>
            <TooltipTrigger asChild>
              <button
                className={`aspect-square border rounded-sm bg-bg-tertiary cursor-pointer flex items-center justify-center p-0.75 transition-all hover:bg-bg-hover active:scale-[0.98]${activeShape === shape.id ? ' border-accent bg-bg-active' : ' border-border'}`}
                onClick={() => setActiveShape(shape.id)}
                title={`${shape.label} (${i + 1})`}
              >
                <ShapeIcon
                  shape={shape}
                  rotation={activeShape === shape.id ? activeRotation : 0}
                  active={activeShape === shape.id}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {shape.label}
              <kbd data-slot="kbd" className="ml-1 bg-black/30 px-1 text-[10px]">{i + 1}</kbd>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-text-muted uppercase tracking-widest shrink-0">Rotation</span>
        <div className="flex gap-0.5">
          {([0, 1, 2, 3] as const).map((r) => (
            <button
              key={r}
              className={`btn text-[10px] h-5.5 px-1.5 min-w-0${activeRotation === r ? ' active' : ''}`}
              onClick={() => setActiveRotation(r)}
              title={`${r * 90}°`}
            >
              {r * 90}°
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
