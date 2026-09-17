import type { Asset, VxsFile } from '../types';
import { makeAsset } from '../store/asset-slice';

// Reading a project is the one place old files meet new code, so every version
// is normalised here and nowhere else. Callers always receive v3.0 shapes.

export const VXS_VERSION = '3.0';

/** Rejects anything that is not a project file, before any field is trusted. */
export function isVxsFile(data: unknown): data is VxsFile {
  if (typeof data !== 'object' || data === null) return false;
  const file = data as VxsFile;
  if (typeof file.version !== 'string') return false;
  // v3.0 carries assets. Older files carry the two maps that every version had.
  if (Array.isArray(file.assets)) return file.assets.length > 0;
  return Array.isArray(file.colorMap) && Array.isArray(file.depthMap);
}

/** One board from v1.0 or v2.0 becomes a one-asset project. v1.0 had no shape
 *  or rotation data, so those are filled with the defaults. */
export function readAssets(file: VxsFile): Asset[] {
  if (file.assets?.length) return file.assets;

  const w = file.gridWidth ?? 16;
  const h = file.gridHeight ?? 16;
  const size = w * h;
  const asset = makeAsset('asset 1', w, h);
  asset.frames[0] = {
    colorMap: file.colorMap ?? new Array(size).fill(''),
    depthMap: file.depthMap ?? new Array(size).fill(1),
    shapeMap: file.shapeMap ?? new Array(size).fill('square'),
    rotationMap: file.rotationMap ?? new Array(size).fill(0),
  };
  return [asset];
}
