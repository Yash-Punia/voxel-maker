import { useState, useRef } from 'react';
import { useStore } from '../../store';
import { computeVoxels } from '../../core/depth-ops';
import { exportObj } from '../../exporters/export-obj';
import { exportGltf } from '../../exporters/export-gltf';
import { exportPly } from '../../exporters/export-ply';
import { exportVox } from '../../exporters/export-vox';
import { exportPng } from '../../exporters/export-png';

interface ExportMenuProps {
  getCanvas: () => HTMLCanvasElement | null;
}

export function ExportMenu({ getCanvas }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const getVoxels = () => {
    const s = useStore.getState();
    return computeVoxels(s.colorMap, s.depthMap, s.gridWidth, s.gridHeight, s.extrusionMode, s.shapeMap, s.rotationMap);
  };

  const items = [
    { label: '.obj + .mtl', action: () => exportObj(getVoxels()) },
    { label: '.gltf (JSON)', action: () => exportGltf(getVoxels(), false) },
    { label: '.glb (binary)', action: () => exportGltf(getVoxels(), true) },
    { label: '.ply', action: () => exportPly(getVoxels()) },
    { label: '.vox (MagicaVoxel)', action: () => exportVox(getVoxels()) },
    { divider: true },
    { label: '.png snapshot', action: () => { const c = getCanvas(); if (c) exportPng(c); else alert('3D canvas not ready'); } },
  ];

  return (
    <div className="dropdown" ref={ref}>
      <button className="btn" onClick={() => setOpen((v) => !v)}>
        Export ▾
      </button>
      {open && (
        <div className="dropdown-menu">
          {items.map((item, i) =>
            'divider' in item ? (
              <div key={i} className="dropdown-divider" />
            ) : (
              <div
                key={i}
                className="dropdown-item"
                onClick={() => { item.action(); setOpen(false); }}
              >
                {item.label}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
