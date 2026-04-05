import { useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { SHAPES } from '../../core/shapes';
import type { ShapeDef } from '../../core/shapes';

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
    <div className="shape-section">
      <div className="color-section-title">
        Shape
        <span className="shape-hint">Space / scroll to rotate</span>
      </div>

      <div className="shape-grid">
        {SHAPES.map((shape, i) => (
          <button
            key={shape.id}
            className={`shape-btn${activeShape === shape.id ? ' active' : ''}`}
            onClick={() => setActiveShape(shape.id)}
            title={`${shape.label} (${i + 1})`}
          >
            <ShapeIcon
              shape={shape}
              rotation={activeShape === shape.id ? activeRotation : 0}
              active={activeShape === shape.id}
            />
          </button>
        ))}
      </div>

      <div className="shape-rotation-row">
        <span className="shape-rotation-label">Rotation</span>
        <div className="shape-rotation-btns">
          {([0, 1, 2, 3] as const).map((r) => (
            <button
              key={r}
              className={`btn shape-rot-btn${activeRotation === r ? ' active' : ''}`}
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
