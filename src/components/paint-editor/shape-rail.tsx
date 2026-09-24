import { useEffect, useRef } from 'react';
import { RotateCw } from 'lucide-react';

import { useStore } from '../../store';
import { SHAPES } from '../../core/shapes';
import type { ShapeDef } from '../../core/shapes';
import { SHAPE_ICON_ACTIVE, SHAPE_ICON_IDLE } from '../../core/theme';
import { IconButton } from '@/components/ui/icon-button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';

const ICON_SIZE = 22;

function ShapeIcon({ shape, rotation, active }: { shape: ShapeDef; rotation: number; active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
    ctx.fillStyle = active ? SHAPE_ICON_ACTIVE : SHAPE_ICON_IDLE;
    shape.draw2D(ctx, 0, 0, ICON_SIZE, rotation);
  }, [shape, rotation, active]);

  return <canvas ref={ref} width={ICON_SIZE} height={ICON_SIZE} className="block" />;
}

/** Left rail in draw mode. The active shape previews its own rotation, so the
 *  rail always shows the stamp that is about to land on the board. */
export function ShapeRail() {
  const activeShape = useStore((s) => s.activeShape);
  const activeRotation = useStore((s) => s.activeRotation);
  const setActiveShape = useStore((s) => s.setActiveShape);
  const rotateActiveShape = useStore((s) => s.rotateActiveShape);

  return (
    <div className="rail rail-v gap-1 p-1.5">
      <div className="grid grid-cols-2 gap-1">
        {SHAPES.map((shape, i) => {
          const isActive = activeShape === shape.id;
          return (
            <Tooltip key={shape.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={shape.label}
                  aria-pressed={isActive}
                  className={cn('icon-btn', isActive && 'active')}
                  onClick={() => setActiveShape(shape.id)}
                >
                  <ShapeIcon shape={shape} rotation={isActive ? activeRotation : 0} active={isActive} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {shape.label}
                {i < 9 && <Kbd keys={String(i + 1)} tone="inverted" className="ml-1" />}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      <div className="rail-sep-v" />

      <IconButton
        label={`Rotate shape to ${((activeRotation + 1) % 4) * 90}°`}
        shortcut="R"
        side="right"
        onClick={rotateActiveShape}
      >
        <RotateCw className="size-4" style={{ transform: `rotate(${activeRotation * 90}deg)` }} />
      </IconButton>
    </div>
  );
}
