import { useStore } from '../../store';
import { DepthCanvas } from './depth-canvas';

export function DepthEditor() {
  const { activeDepth, setActiveDepth, extrusionMode, setExtrusionMode } = useStore();

  return (
    <div className="panel panel-depth">
      <div className="panel-header">
        <span className="panel-title">Depth Editor</span>
      </div>

      <div className="panel-body">
        <div className="canvas-area">
          <DepthCanvas />
        </div>

        <div className="depth-controls">
          <div className="depth-row">
            <span className="depth-label">Brush depth:</span>
            <input
              type="number"
              className="depth-input"
              value={activeDepth}
              min={0}
              max={32}
              onChange={(e) => setActiveDepth(parseInt(e.target.value) || 0)}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(0 = suppress)</span>
          </div>
          <div className="depth-row">
            <span className="depth-label">Extrusion:</span>
            <div className="mode-toggle">
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
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
            {extrusionMode === 'symmetric'
              ? 'Depth N → ±N/2 voxels centered at Z=0'
              : 'Depth N → N voxels from Z=0 upward'}
          </div>
        </div>
      </div>
    </div>
  );
}
