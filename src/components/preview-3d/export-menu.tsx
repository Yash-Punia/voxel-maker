import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useStore } from '../../store';
import { computeShapeMesh, computeVoxels } from '../../core/depth-ops';
import type { MeshData, Voxel } from '../../types';
interface ExportMenuProps {
  getCanvas: () => HTMLCanvasElement | null;
}

type MeshFormat = 'obj' | 'gltf' | 'glb' | 'ply' | 'stl' | 'dae' | 'vox' | 'minecraft' | 'svg' | 'png2d' | 'png3d' | 'gif';

interface FormatDef {
  id: MeshFormat;
  label: string;
  group: string;
  supportsOptimize: boolean;
  supportsScale: boolean;
  supportsAtlas: boolean;
  needs3dCanvas?: boolean;
  note?: string;
}

const FORMATS: FormatDef[] = [
  { id: 'obj',       label: '.obj + .mtl',       group: '3D Meshes', supportsOptimize: true,  supportsScale: true,  supportsAtlas: true,  note: 'Ships .obj + .mtl; atlas mode adds a PNG. Universal DCC support.' },
  { id: 'gltf',      label: '.gltf (JSON)',      group: '3D Meshes', supportsOptimize: true,  supportsScale: true,  supportsAtlas: true,  note: 'Modern PBR format. Atlas texture is embedded as a data URI.' },
  { id: 'glb',       label: '.glb (binary)',     group: '3D Meshes', supportsOptimize: true,  supportsScale: true,  supportsAtlas: true,  note: 'Single binary file with embedded textures. Preferred for web/engines.' },
  { id: 'ply',       label: '.ply',              group: '3D Meshes', supportsOptimize: true,  supportsScale: true,  supportsAtlas: false, note: 'Per-vertex colors only — most PLY readers ignore materials.' },
  { id: 'stl',       label: '.stl (binary)',     group: '3D Meshes', supportsOptimize: true,  supportsScale: true,  supportsAtlas: false, note: 'Geometry only — colors are discarded. Common for 3D printing.' },
  { id: 'dae',       label: '.dae (Collada)',    group: '3D Meshes', supportsOptimize: true,  supportsScale: true,  supportsAtlas: true,  note: 'XML format. Wide DCC support but larger files than glTF.' },
  { id: 'vox',       label: '.vox (MagicaVoxel)',group: 'Voxels',    supportsOptimize: false, supportsScale: false, supportsAtlas: false, note: 'Discrete voxels — shape profiles collapse to cubes. 256³ max.' },
  { id: 'minecraft', label: '.json (Minecraft)', group: 'Voxels',    supportsOptimize: false, supportsScale: false, supportsAtlas: false, note: 'Block model + atlas PNG. Scaled to fit 16³ if larger; max 256 colors.' },
  { id: 'svg',       label: '.svg (2D vector)',  group: '2D Images', supportsOptimize: false, supportsScale: false, supportsAtlas: false, note: 'Vector 2D canvas — one polygon per cell. Preserves shape outlines.' },
  { id: 'png2d',     label: '.png (2D canvas)',  group: '2D Images', supportsOptimize: false, supportsScale: false, supportsAtlas: false, note: 'Raster 2D canvas, transparent background. 16px per cell.' },
  { id: 'png3d',     label: '.png snapshot (3D)',group: '2D Images', supportsOptimize: false, supportsScale: false, supportsAtlas: false, needs3dCanvas: true, note: 'Screenshot of the current 3D preview. Uses its current camera/lighting.' },
  { id: 'gif',       label: '.gif (turntable)',  group: 'Animated',  supportsOptimize: true,  supportsScale: true,  supportsAtlas: false, note: '36-frame 256×256 turntable. Encoding can take several seconds.' },
];

function scaleMesh(mesh: MeshData, scale: number): MeshData {
  if (scale === 1) return mesh;
  const positions = mesh.positions.map((v) => v * scale);
  return { ...mesh, positions };
}

function scaleVoxels(voxels: Voxel[], scale: number): Voxel[] {
  if (scale === 1) return voxels;
  return voxels.map((v) => ({ ...v, x: v.x * scale, y: v.y * scale, z: v.z * scale }));
}

export function ExportMenu({ getCanvas }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<MeshFormat>('obj');
  const [optimize, setOptimize] = useState(true);
  const [atlas, setAtlas] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const current = FORMATS.find((f) => f.id === format)!;

  const getMesh = (withOptimize: boolean): MeshData => {
    const s = useStore.getState();
    const mesh = computeShapeMesh(
      s.colorMap, s.depthMap, s.shapeMap, s.rotationMap,
      s.gridWidth, s.gridHeight, s.extrusionMode, s.depthMultiplier,
      withOptimize,
    );
    return scaleMesh(mesh, scale);
  };

  const getVoxels = (): Voxel[] => {
    const s = useStore.getState();
    return scaleVoxels(
      computeVoxels(s.colorMap, s.depthMap, s.gridWidth, s.gridHeight, s.extrusionMode, s.shapeMap, s.rotationMap, s.depthMultiplier),
      scale,
    );
  };

  const handleExport = async () => {
    const opt = current.supportsOptimize && optimize;
    const atl = current.supportsAtlas && atlas;

    switch (format) {
      case 'obj': {
        const { exportObj } = await import('../../exporters/export-obj');
        exportObj(getMesh(opt), 'voxel-studio', { atlas: atl });
        break;
      }
      case 'gltf':
      case 'glb': {
        const { exportGltf } = await import('../../exporters/export-gltf');
        exportGltf(getMesh(opt), format === 'glb', 'voxel-studio', { atlas: atl });
        break;
      }
      case 'ply': {
        const { exportPly } = await import('../../exporters/export-ply');
        exportPly(getMesh(opt));
        break;
      }
      case 'stl': {
        const { exportStl } = await import('../../exporters/export-stl');
        exportStl(getMesh(opt));
        break;
      }
      case 'dae': {
        const { exportDae } = await import('../../exporters/export-dae');
        exportDae(getMesh(opt), 'voxel-studio.dae', { atlas: atl });
        break;
      }
      case 'vox': {
        const { exportVox } = await import('../../exporters/export-vox');
        exportVox(getVoxels());
        break;
      }
      case 'minecraft': {
        const { exportMinecraft } = await import('../../exporters/export-minecraft');
        exportMinecraft(getVoxels());
        break;
      }
      case 'svg': {
        const s = useStore.getState();
        const { exportSvg } = await import('../../exporters/export-svg');
        exportSvg(s.colorMap, s.shapeMap, s.rotationMap, s.gridWidth, s.gridHeight);
        break;
      }
      case 'png2d': {
        const s = useStore.getState();
        const { exportCanvasPng } = await import('../../exporters/export-canvas-png');
        exportCanvasPng(s.colorMap, s.shapeMap, s.rotationMap, s.gridWidth, s.gridHeight);
        break;
      }
      case 'png3d': {
        const c = getCanvas();
        if (c) {
          const { exportPng } = await import('../../exporters/export-png');
          exportPng(c);
        } else {
          alert('3D canvas not ready');
        }
        break;
      }
      case 'gif': {
        const { exportGif } = await import('../../exporters/export-gif');
        await exportGif(getMesh(opt));
        break;
      }
    }

    setOpen(false);
  };

  const groups = Array.from(new Set(FORMATS.map((f) => f.group)));

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="btn inline-flex items-center gap-1" onClick={() => setOpen(true)}>
            Export
            <ChevronDown className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Open export panel — mesh, voxel, 2D image, animation</TooltipContent>
      </Tooltip>

      {open && (
        <div
          className="fixed inset-0 bg-black/55 flex items-center justify-center z-200"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-bg-secondary border border-border rounded-md shadow-app p-5 min-w-110 max-w-130 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="label-title text-text-primary">Export</div>
              <button className="btn text-xs" onClick={() => setOpen(false)}>Close</button>
            </div>

            {/* Format picker */}
            <div className="flex flex-col gap-2">
              <div className="label-section">Format</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {groups.map((group) => (
                  <div key={group} className="flex flex-col gap-0.5">
                    <div className="label-section mb-1">{group}</div>
                    {FORMATS.filter((f) => f.group === group).map((f) => (
                      <label key={f.id} className="flex items-center gap-1.5 cursor-pointer text-xs py-0.5">
                        <input
                          type="radio"
                          name="format"
                          className="accent-accent cursor-pointer"
                          checked={format === f.id}
                          onChange={() => setFormat(f.id)}
                        />
                        <span className={format === f.id ? 'text-text-primary' : 'text-text-secondary'}>{f.label}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Format note */}
            {current.note && (
              <div className="text-xs text-text-secondary bg-bg-input border border-transparent rounded-sm px-3 py-2">
                <span className="text-text-muted">Note: </span>{current.note}
              </div>
            )}

            {/* Options */}
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <div className="label-section">Options</div>

              <label className={`flex items-center gap-2 text-xs ${current.supportsOptimize ? 'cursor-pointer' : 'opacity-50'}`}>
                <input
                  type="checkbox"
                  className="size-3 accent-accent cursor-pointer"
                  disabled={!current.supportsOptimize}
                  checked={optimize && current.supportsOptimize}
                  onChange={(e) => setOptimize(e.target.checked)}
                />
                <span className="text-text-primary">Optimize mesh</span>
                <span className="text-text-muted">— greedy-merge coplanar square faces</span>
              </label>

              <label className={`flex items-center gap-2 text-xs ${current.supportsAtlas ? 'cursor-pointer' : 'opacity-50'}`}>
                <input
                  type="checkbox"
                  className="size-3 accent-accent cursor-pointer"
                  disabled={!current.supportsAtlas}
                  checked={atlas && current.supportsAtlas}
                  onChange={(e) => setAtlas(e.target.checked)}
                />
                <span className="text-text-primary">Texture atlas</span>
                <span className="text-text-muted">— emit PNG atlas + UVs instead of vertex colors</span>
              </label>

              <div className={`flex items-center gap-2 text-xs ${current.supportsScale ? '' : 'opacity-50'}`}>
                <span className="text-text-primary">Scale</span>
                <input
                  type="number"
                  className="w-16 h-6.5 px-1 border border-border rounded-sm bg-bg-input text-text-primary text-xs text-center focus:outline-hidden focus:border-border-focus"
                  value={scale}
                  min={0.1}
                  max={100}
                  step={0.5}
                  disabled={!current.supportsScale}
                  title="Multiplies mesh/voxel positions at export time (0.1× – 100×)"
                  onChange={(e) => setScale(Math.max(0.1, Math.min(100, parseFloat(e.target.value) || 1)))}
                />
                <span className="text-text-muted">× (applied to mesh/voxel positions)</span>
              </div>
            </div>

            <div className="flex justify-end gap-1.5 pt-2 border-t border-border">
              <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleExport}>Export</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
