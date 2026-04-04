export type Tool = 'pencil' | 'eraser' | 'fill' | 'eyedropper' | 'rect-select';
export type ExtrusionMode = 'symmetric' | 'single';

// Flat arrays indexed by (y * gridWidth + x)
// "" means transparent (no voxel)
export type ColorMap = string[];
export type DepthMap = number[];

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
  palette: string[];
}

export interface Voxel {
  x: number;
  y: number;
  z: number;
  color: string; // "#rrggbb"
}

export interface Snapshot {
  colorMap: ColorMap;
  depthMap: DepthMap;
}
