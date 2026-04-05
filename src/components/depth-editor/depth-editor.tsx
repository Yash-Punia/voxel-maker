import { useStore } from '../../store';
import { DepthCanvas } from './depth-canvas';

export function DepthEditor() {
  const { activeDepth, setActiveDepth, extrusionMode, setExtrusionMode } = useStore();

  return (
    <div className="flex flex-col bg-bg-panel overflow-hidden min-w-0 flex-[1_1_320px]">
      <div className="h-9 bg-bg-secondary border-b border-border flex items-center px-2.5 gap-2 shrink-0">
        <span className="font-semibold text-xs text-text-secondary uppercase tracking-[0.08em]">Depth Editor</span>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="flex-1 flex overflow-hidden">
          <DepthCanvas />
        </div>

        <div className="bg-bg-secondary border-t border-border p-2 shrink-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] text-text-secondary min-w-17.5">Brush depth:</span>
            <input
              type="number"
              className="w-13 h-6.5 px-1.5 border border-border rounded-sm bg-bg-input text-text-primary text-xs text-center focus:outline-hidden focus:border-border-focus"
              value={activeDepth}
              min={0}
              max={32}
              onChange={(e) => setActiveDepth(parseInt(e.target.value) || 0)}
            />
            <span className="text-[11px] text-text-muted">(0 = suppress)</span>
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] text-text-secondary min-w-17.5">Extrusion:</span>
            <div className="flex gap-0.5">
              <button
                className={`btn${extrusionMode === 'symmetric' ? ' active' : ''}`}
                onClick={() => setExtrusionMode('symmetric')}
                title="Symmetric: voxels centered on Z=0"
              >
                Symmetric
              </button>
              <button
                className={`btn${extrusionMode === 'single' ? ' active' : ''}`}
                onClick={() => setExtrusionMode('single')}
                title="Single-sided: voxels from Z=0 upward"
              >
                Single
              </button>
            </div>
          </div>
          <div className="text-[10px] text-text-muted mt-1">
            {extrusionMode === 'symmetric'
              ? 'Depth N → ±N/2 voxels centered at Z=0'
              : 'Depth N → N voxels from Z=0 upward'}
          </div>
        </div>
      </div>
    </div>
  );
}
