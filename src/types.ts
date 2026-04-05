export type Tool = 'pencil' | 'eraser' | 'fill' | 'eyedropper' | 'rect-select' | 'line';
export type MirrorMode = 'none' | 'horizontal' | 'vertical';
export type ExtrusionMode = 'symmetric' | 'single';

// Flat arrays indexed by (y * gridWidth + x)
// "" means transparent (no voxel)
export type ColorMap = string[];
export type DepthMap = number[];
// shape ID per cell, e.g. "square", "triangle", "quarter-circle" — default "square"
export type ShapeMap = string[];
// rotation per cell: 0 | 1 | 2 | 3 (0°, 90°, 180°, 270°) — default 0
export type RotationMap = number[];

export interface SelectRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface VxsFile {
  version: string;
  gridWidth: number;
  gridHeight: number;
  colorMap: ColorMap;
  depthMap: DepthMap;
  shapeMap: ShapeMap;
  rotationMap: RotationMap;
  palette: string[];
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
}

// Raw buffer data for 3D mesh — consumed by Three.js and all exporters
export interface MeshData {
  positions: number[];
  normals: number[];
  colors: number[];  // per-vertex RGB in [0,1]
  indices: number[];
}
