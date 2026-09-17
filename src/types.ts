export type Tool = 'pencil' | 'eraser' | 'fill' | 'eyedropper' | 'rect-select' | 'line';
// The workspace shows one stage at a time. Rails and top-bar clusters follow it.
export type EditorMode = 'draw' | 'depth' | 'model' | 'export';
export type MirrorMode = 'none' | 'horizontal' | 'vertical';
export type ExtrusionMode = 'symmetric' | 'single' | 'back';
// Depth stage tint: the cool-to-warm ramp, or the artwork's own colours.
export type DepthView = 'depth' | 'color';

// Flat arrays indexed by (y * gridWidth + x)
// "" means transparent (no voxel)
export type ColorMap = string[];
export type DepthMap = number[];
// shape ID per cell, e.g. "square", "triangle", "quarter-circle" — default "square"
export type ShapeMap = string[];
// rotation per cell: 0 | 1 | 2 | 3 (0°, 90°, 180°, 270°) — default 0
export type RotationMap = number[];

/** One board. The frames array is length 1 today. It exists now so adding
 *  animation later does not reshape the save format a second time. */
export interface Frame {
  colorMap: ColorMap;
  depthMap: DepthMap;
  shapeMap: ShapeMap;
  rotationMap: RotationMap;
}

export interface Asset {
  id: string;
  name: string;
  gridWidth: number;
  gridHeight: number;
  frames: Frame[];
  /** 4-bit auto-tile mask, 0 to 15: which sides have a matching neighbour.
   *  1 north, 2 east, 4 south, 8 west. Absent on an ordinary prop. */
  tileMask?: number;
}

export interface SelectRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** v3.0 holds a set of assets. v1.0 and v2.0 held one board, and their fields
 *  are kept optional here so an old file still loads as a one-asset project. */
export interface VxsFile {
  version: string;
  palette: string[];
  /** v3.0 and later. */
  assets?: Asset[];
  activeAssetId?: string;
  /** v1.0 and v2.0 only. */
  gridWidth?: number;
  gridHeight?: number;
  colorMap?: ColorMap;
  depthMap?: DepthMap;
  shapeMap?: ShapeMap;
  rotationMap?: RotationMap;
}

export interface Voxel {
  x: number;
  y: number;
  z: number;
  color: string; // "#rrggbb"
  shape: string;
  rotation: number;
}

export interface Snapshot {
  colorMap: ColorMap;
  depthMap: DepthMap;
  shapeMap: ShapeMap;
  rotationMap: RotationMap;
  /** Which asset these maps belong to. Undo returns there before applying them,
   *  so a snapshot can never paint itself over a different board. */
  assetId?: string;
  /** Which frame of that asset. Undo returns to it before applying the maps. */
  frameIndex?: number;
  /** The asset ids that existed when this was taken. Set only by the agent,
   *  whose one snapshot per turn has to undo a turn that created assets too. */
  assetIds?: string[];
}

// Raw buffer data for 3D mesh — consumed by Three.js and all exporters
export interface MeshData {
  positions: number[];
  normals: number[];
  colors: number[];  // per-vertex RGB in [0,1]
  indices: number[];
}
