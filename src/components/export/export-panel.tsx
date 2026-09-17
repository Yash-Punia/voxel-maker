import { useMemo, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

import { useStore } from '../../store';
import { computeShapeMesh, computeVoxels } from '../../core/depth-ops';
import { toast } from '../../core/toast';
import { getPreviewCanvas } from '../preview-3d/preview-canvas-handle';
import { Segmented } from '@/components/ui/segmented';
import type { Asset, MeshData, Voxel } from '../../types';
import { cn } from '@/lib/utils';

type ExportGroup = 'mesh' | 'voxel' | 'image' | 'animated' | 'sprite';
type ExportFormat =
  | 'obj' | 'gltf' | 'glb' | 'ply' | 'stl' | 'dae'
  | 'vox' | 'minecraft'
  | 'svg' | 'png2d' | 'png3d'
  | 'gif'
  | 'spritesheet';

interface FormatDef {
  id: ExportFormat;
  label: string;
  group: ExportGroup;
  supportsOptimize: boolean;
  supportsScale: boolean;
  supportsAtlas: boolean;
  supportsSheet: boolean;
  note: string;
}

const FORMATS: FormatDef[] = [
  { id: 'obj',       label: 'OBJ',       group: 'mesh',     supportsOptimize: true,  supportsScale: true,  supportsAtlas: true,  supportsSheet: false, note: 'Ships .obj plus .mtl, and a PNG in atlas mode. Universal DCC support.' },
  { id: 'glb',       label: 'GLB',       group: 'mesh',     supportsOptimize: true,  supportsScale: true,  supportsAtlas: true,  supportsSheet: false, note: 'One binary file with textures embedded. Preferred for web and game engines.' },
  { id: 'gltf',      label: 'glTF',      group: 'mesh',     supportsOptimize: true,  supportsScale: true,  supportsAtlas: true,  supportsSheet: false, note: 'JSON flavour of glTF. The atlas texture is embedded as a data URI.' },
  { id: 'stl',       label: 'STL',       group: 'mesh',     supportsOptimize: true,  supportsScale: true,  supportsAtlas: false, supportsSheet: false, note: 'Geometry only, colours are dropped. The common format for 3D printing.' },
  { id: 'ply',       label: 'PLY',       group: 'mesh',     supportsOptimize: true,  supportsScale: true,  supportsAtlas: false, supportsSheet: false, note: 'Per-vertex colours only, because most PLY readers ignore materials.' },
  { id: 'dae',       label: 'DAE',       group: 'mesh',     supportsOptimize: true,  supportsScale: true,  supportsAtlas: true,  supportsSheet: false, note: 'Collada XML. Wide DCC support, but larger files than glTF.' },
  { id: 'vox',       label: 'MagicaVoxel', group: 'voxel',  supportsOptimize: false, supportsScale: false, supportsAtlas: false, supportsSheet: false, note: 'Discrete voxels, so shape profiles collapse to cubes. 256³ maximum.' },
  { id: 'minecraft', label: 'Minecraft',  group: 'voxel',   supportsOptimize: false, supportsScale: false, supportsAtlas: false, supportsSheet: false, note: 'Block model plus an atlas PNG. Scaled to fit 16³, maximum 256 colours.' },
  { id: 'png2d',     label: 'PNG',       group: 'image',    supportsOptimize: false, supportsScale: false, supportsAtlas: false, supportsSheet: false, note: 'Raster copy of the board on a transparent background, 16px per cell.' },
  { id: 'svg',       label: 'SVG',       group: 'image',    supportsOptimize: false, supportsScale: false, supportsAtlas: false, supportsSheet: false, note: 'Vector copy of the board, one polygon per cell. Keeps shape outlines.' },
  { id: 'png3d',     label: 'PNG 3D',    group: 'image',    supportsOptimize: false, supportsScale: false, supportsAtlas: false, supportsSheet: false, note: 'Screenshot of the 3D preview with its current camera and lighting.' },
  { id: 'spritesheet', label: 'PNG sheet', group: 'sprite', supportsOptimize: true,  supportsScale: false, supportsAtlas: false, supportsSheet: true,  note: 'One row of angles, plus a matching normal map and a JSON layout. For 2.5D and isometric games.' },
  { id: 'gif',       label: 'GIF',       group: 'animated', supportsOptimize: true,  supportsScale: true,  supportsAtlas: false, supportsSheet: false, note: '36-frame 256×256 turntable. Encoding takes a few seconds.' },
];

const GROUPS = [
  { value: 'mesh' as const,     label: '3D model' },
  { value: 'voxel' as const,    label: 'Voxel' },
  { value: 'image' as const,    label: 'Image' },
  { value: 'animated' as const, label: 'Animated' },
  { value: 'sprite' as const,   label: 'Sprite sheet' },
];

const TEXTURE_MODES = [
  {
    value: 'vertex' as const,
    label: 'Vertex colours',
    title: 'Colour is baked into the mesh. No image file, but some engines ignore it.',
  },
  {
    value: 'atlas' as const,
    label: 'Texture atlas',
    title: 'Emits a PNG plus UVs. Works everywhere, and the colours stay editable.',
  },
];

const OPTIMIZE_MODES = [
  { value: 'on' as const, label: 'On', title: 'Merge touching flat faces into one. Far fewer triangles.' },
  { value: 'off' as const, label: 'Off', title: 'Keep one quad per cell face. Larger, but easier to edit by hand.' },
];

const ANGLE_OPTIONS = [
  { value: '1' as const,  label: '1',  title: 'One render from the front. A flat billboard.' },
  { value: '4' as const,  label: '4',  title: 'Four cardinal directions, 90 degrees apart.' },
  { value: '8' as const,  label: '8',  title: 'Eight directions, 45 degrees apart. The usual choice.' },
  { value: '16' as const, label: '16', title: 'Sixteen directions. Smoothest turning, largest sheet.' },
];

const CELL_OPTIONS = [
  { value: '32' as const,  label: '32' },
  { value: '64' as const,  label: '64' },
  { value: '128' as const, label: '128' },
  { value: '256' as const, label: '256' },
];

const PITCH_OPTIONS = [
  { value: 'iso' as const,  label: 'Isometric', title: '30 degrees above the horizon. The classic isometric view.' },
  { value: 'top' as const,  label: 'Top-down',  title: '60 degrees above the horizon, for a top-down game.' },
  { value: 'side' as const, label: 'Side',      title: 'Level with the horizon, for a side-on game.' },
];

const PITCH_DEGREES: Record<'iso' | 'top' | 'side', number> = { iso: 30, top: 60, side: 0 };

const NORMAL_OPTIONS = [
  { value: 'off' as const,   label: 'Off',   title: 'Colour sheet only.' },
  { value: 'godot' as const, label: 'Godot', title: 'Green channel points up, which Godot and most 2D engines expect.' },
  { value: 'unity' as const, label: 'Unity', title: 'Green channel flipped, which Unity expects.' },
];

const SCOPE_OPTIONS = [
  { value: 'active' as const, label: 'This asset', title: 'Export only the asset on the stage.' },
  { value: 'set' as const,    label: 'Whole set',  title: 'Export every asset in the project, one file each.' },
];

const GROUP_TITLES: Record<ExportGroup, string> = {
  mesh: 'A polygon model for a 3D tool or a game engine',
  voxel: 'Discrete cubes for a voxel editor or Minecraft',
  image: 'A flat picture of the board or the preview',
  animated: 'A turntable loop',
  sprite: 'Angled renders in one sheet, for a 2D or isometric engine',
};

function scaleMesh(mesh: MeshData, scale: number): MeshData {
  if (scale === 1) return mesh;
  return { ...mesh, positions: mesh.positions.map((v) => v * scale) };
}

function scaleVoxels(voxels: Voxel[], scale: number): Voxel[] {
  if (scale === 1) return voxels;
  return voxels.map((v) => ({ ...v, x: v.x * scale, y: v.y * scale, z: v.z * scale }));
}

/** Export mode. One decision per row, top to bottom: what kind of file, which
 *  format, then the options that format actually supports. */
export function ExportPanel() {
  const projectName = useStore((s) => s.projectName);
  const [group, setGroup] = useState<ExportGroup>('mesh');
  const [format, setFormat] = useState<ExportFormat>('obj');
  const [optimize, setOptimize] = useState<'on' | 'off'>('on');
  const [texture, setTexture] = useState<'vertex' | 'atlas'>('vertex');
  const [scale, setScale] = useState(1);
  const [angles, setAngles] = useState<'1' | '4' | '8' | '16'>('8');
  const [cellSize, setCellSize] = useState<'32' | '64' | '128' | '256'>('128');
  const [pitch, setPitch] = useState<'iso' | 'top' | 'side'>('iso');
  const [normal, setNormal] = useState<'off' | 'godot' | 'unity'>('godot');
  const [scope, setScope] = useState<'active' | 'set'>('active');
  const assetCount = useStore((s) => s.assets.length);
  const [busy, setBusy] = useState(false);

  const formatsInGroup = useMemo(() => FORMATS.filter((f) => f.group === group), [group]);
  const current = FORMATS.find((f) => f.id === format) ?? formatsInGroup[0];

  const baseName = (projectName ?? 'voxbrush').replace(/\.vxs$/i, '');

  const handleGroupChange = (next: ExportGroup) => {
    setGroup(next);
    const first = FORMATS.find((f) => f.group === next);
    if (first) setFormat(first.id);
  };

  const getMesh = (withOptimize: boolean, asset?: Asset): MeshData => {
    const s = useStore.getState();
    const frame = asset?.frames[0];
    return scaleMesh(
      computeShapeMesh(
        frame?.colorMap ?? s.colorMap,
        frame?.depthMap ?? s.depthMap,
        frame?.shapeMap ?? s.shapeMap,
        frame?.rotationMap ?? s.rotationMap,
        asset?.gridWidth ?? s.gridWidth,
        asset?.gridHeight ?? s.gridHeight,
        s.extrusionMode, s.depthMultiplier,
        withOptimize,
      ),
      scale,
    );
  };

  const getVoxels = (): Voxel[] => {
    const s = useStore.getState();
    return scaleVoxels(
      computeVoxels(
        s.colorMap, s.depthMap, s.gridWidth, s.gridHeight,
        s.extrusionMode, s.shapeMap, s.rotationMap, s.depthMultiplier,
      ),
      scale,
    );
  };

  // Only the formats that take a MeshData can be pointed at another asset. The
  // voxel and image exporters read the live board, so a set run would repeat it.
  const setCapable = current.group === 'mesh' || current.group === 'sprite';
  const wholeSet = setCapable && assetCount > 1 && scope === 'set';

  const handleExportSet = async () => {
    const s = useStore.getState();
    s.commitActiveAsset();
    const assets = useStore.getState().assets;
    const opt = current.supportsOptimize && optimize === 'on';
    setBusy(true);
    try {
      for (const asset of assets) {
        const mesh = getMesh(opt, asset);
        if (mesh.positions.length === 0) continue;
        await exportOne(current.id, mesh, asset.name);
      }
    } finally {
      setBusy(false);
    }
  };

  /** The mesh-backed formats, addressed by name so a set run can repeat them. */
  const exportOne = async (id: ExportFormat, mesh: MeshData, name: string) => {
    const atlas = current.supportsAtlas && texture === 'atlas';
    switch (id) {
      case 'obj': {
        const { exportObj } = await import('../../exporters/export-obj');
        exportObj(mesh, name, { atlas });
        break;
      }
      case 'glb':
      case 'gltf': {
        const { exportGltf } = await import('../../exporters/export-gltf');
        exportGltf(mesh, id === 'glb', name, { atlas });
        break;
      }
      case 'stl': {
        const { exportStl } = await import('../../exporters/export-stl');
        exportStl(mesh, `${name}.stl`);
        break;
      }
      case 'ply': {
        const { exportPly } = await import('../../exporters/export-ply');
        exportPly(mesh, `${name}.ply`);
        break;
      }
      case 'dae': {
        const { exportDae } = await import('../../exporters/export-dae');
        exportDae(mesh, `${name}.dae`, { atlas });
        break;
      }
      case 'spritesheet': {
        const { exportSpriteSheet } = await import('../../exporters/export-sprite-sheet');
        exportSpriteSheet(mesh, {
          angles: parseInt(angles, 10),
          cellSize: parseInt(cellSize, 10),
          pitch: PITCH_DEGREES[pitch],
          normalMap: normal !== 'off',
          flipGreen: normal === 'unity',
          filename: name,
        });
        break;
      }
    }
  };

  const handleExport = async () => {
    const opt = current.supportsOptimize && optimize === 'on';
    const atlas = current.supportsAtlas && texture === 'atlas';
    setBusy(true);

    try {
      switch (format) {
        case 'obj': {
          const { exportObj } = await import('../../exporters/export-obj');
          exportObj(getMesh(opt), baseName, { atlas });
          break;
        }
        case 'gltf':
        case 'glb': {
          const { exportGltf } = await import('../../exporters/export-gltf');
          exportGltf(getMesh(opt), format === 'glb', baseName, { atlas });
          break;
        }
        case 'ply': {
          const { exportPly } = await import('../../exporters/export-ply');
          exportPly(getMesh(opt), `${baseName}.ply`);
          break;
        }
        case 'stl': {
          const { exportStl } = await import('../../exporters/export-stl');
          exportStl(getMesh(opt), `${baseName}.stl`);
          break;
        }
        case 'dae': {
          const { exportDae } = await import('../../exporters/export-dae');
          exportDae(getMesh(opt), `${baseName}.dae`, { atlas });
          break;
        }
        case 'vox': {
          const { exportVox } = await import('../../exporters/export-vox');
          exportVox(getVoxels(), `${baseName}.vox`);
          break;
        }
        case 'minecraft': {
          const { exportMinecraft } = await import('../../exporters/export-minecraft');
          exportMinecraft(getVoxels(), baseName);
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
          const canvas = getPreviewCanvas();
          if (!canvas) {
            toast.error('The 3D preview is not ready', 'Open model mode once, then export again.');
            break;
          }
          const { exportPng } = await import('../../exporters/export-png');
          exportPng(canvas, `${baseName}.png`);
          break;
        }
        case 'spritesheet': {
          const { exportSpriteSheet } = await import('../../exporters/export-sprite-sheet');
          exportSpriteSheet(getMesh(opt), {
            angles: parseInt(angles, 10),
            cellSize: parseInt(cellSize, 10),
            pitch: PITCH_DEGREES[pitch],
            normalMap: normal !== 'off',
            flipGreen: normal === 'unity',
            filename: baseName,
          });
          break;
        }
        case 'gif': {
          const { exportGif } = await import('../../exporters/export-gif');
          await exportGif(getMesh(opt));
          break;
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex size-full items-center justify-center overflow-y-auto p-8">
      <div className="surface w-full max-w-lg p-6">
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-semibold text-text-primary">Export</h2>
          <span className="font-mono text-xs text-text-muted">{baseName}</span>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-text-secondary">Type</span>
            <Segmented
              value={group}
              options={GROUPS.map((g) => ({ ...g, title: GROUP_TITLES[g.value] }))}
              onChange={handleGroupChange}
              aria-label="Export type"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-text-secondary">Format</span>
            <Segmented
              value={format}
              options={formatsInGroup.map((f) => ({ value: f.id, label: f.label, title: f.note }))}
              onChange={setFormat}
              aria-label="Export format"
            />
          </div>

          <p className="rounded-lg border border-border bg-bg-input px-3 py-2.5 text-[11px] leading-relaxed text-text-muted">
            {current.note}
          </p>

          {setCapable && assetCount > 1 && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-text-secondary">Scope</span>
              <Segmented value={scope} options={SCOPE_OPTIONS} onChange={setScope} aria-label="Export scope" />
            </div>
          )}

          <div className="h-px bg-border" />

          <div className={cn('flex items-center justify-between gap-4', !current.supportsAtlas && 'opacity-40')}>
            <span className="text-xs text-text-secondary">Colour</span>
            <Segmented
              value={current.supportsAtlas ? texture : 'vertex'}
              options={TEXTURE_MODES.map((m) => ({ ...m, disabled: !current.supportsAtlas }))}
              onChange={setTexture}
              aria-label="Colour mode"
            />
          </div>

          <div className={cn('flex items-center justify-between gap-4', !current.supportsOptimize && 'opacity-40')}>
            <span className="text-xs text-text-secondary">Optimise mesh</span>
            <Segmented
              value={current.supportsOptimize ? optimize : 'off'}
              options={OPTIMIZE_MODES.map((m) => ({ ...m, disabled: !current.supportsOptimize }))}
              onChange={setOptimize}
              aria-label="Optimise mesh"
            />
          </div>

          {current.supportsSheet && (
            <>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-text-secondary">Angles</span>
                <Segmented value={angles} options={ANGLE_OPTIONS} onChange={setAngles} aria-label="Angles" />
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-text-secondary">Cell size</span>
                <Segmented value={cellSize} options={CELL_OPTIONS} onChange={setCellSize} aria-label="Cell size" />
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-text-secondary">Camera</span>
                <Segmented value={pitch} options={PITCH_OPTIONS} onChange={setPitch} aria-label="Camera pitch" />
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-text-secondary">Normal map</span>
                <Segmented value={normal} options={NORMAL_OPTIONS} onChange={setNormal} aria-label="Normal map" />
              </div>
            </>
          )}

          <div className={cn('flex items-center justify-between gap-4', !current.supportsScale && 'opacity-40')}>
            <span className="text-xs text-text-secondary">Scale</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                aria-label="Export scale"
                className="field field-mono w-20 text-center"
                value={scale}
                min={0.1}
                max={100}
                step={0.5}
                disabled={!current.supportsScale}
                onChange={(e) => setScale(Math.max(0.1, Math.min(100, parseFloat(e.target.value) || 1)))}
              />
              <span className="text-xs text-text-muted">× world units</span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-lg mt-2 w-full"
            onClick={wholeSet ? handleExportSet : handleExport}
            disabled={busy}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {busy
              ? 'Building the file…'
              : wholeSet
                ? `Export ${assetCount} assets as ${current.label}`
                : `Export ${current.label}`}
          </button>
        </div>
      </div>
    </div>
  );
}
