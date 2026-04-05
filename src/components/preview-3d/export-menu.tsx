import { useState, useRef } from 'react';
import { useStore } from '../../store';
import { computeShapeMesh, computeVoxels } from '../../core/depth-ops';
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

  const getMesh = () => {
    const s = useStore.getState();
    return computeShapeMesh(s.colorMap, s.depthMap, s.shapeMap, s.rotationMap, s.gridWidth, s.gridHeight, s.extrusionMode);
  };

  const getVoxels = () => {
    const s = useStore.getState();
    return computeVoxels(s.colorMap, s.depthMap, s.gridWidth, s.gridHeight, s.extrusionMode, s.shapeMap, s.rotationMap);
  };

  const items = [
    { label: '.obj + .mtl', action: () => exportObj(getMesh()) },
    { label: '.gltf (JSON)', action: () => exportGltf(getMesh(), false) },
    { label: '.glb (binary)', action: () => exportGltf(getMesh(), true) },
    { label: '.ply', action: () => exportPly(getMesh()) },
    { label: '.vox (MagicaVoxel)', action: () => exportVox(getVoxels()) },
    { divider: true },
    { label: '.png snapshot', action: () => { const c = getCanvas(); if (c) exportPng(c); else alert('3D canvas not ready'); } },
  ];

  return (
    <div className="relative" ref={ref}>
      <button className="btn" onClick={() => setOpen((v) => !v)}>
        Export ▾
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-0.5 bg-bg-secondary border border-border rounded-md shadow-app min-w-40 z-100 overflow-hidden">
          {items.map((item, i) =>
            'divider' in item ? (
              <div key={i} className="h-px bg-border my-0.5" />
            ) : (
              <div
                key={i}
                className="py-1.75 px-3 cursor-pointer text-xs text-text-primary flex items-center gap-2 hover:bg-bg-hover"
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
