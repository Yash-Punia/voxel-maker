import { useStore } from '../store';
import type { VxsFile } from '../types';

const APP_VERSION = '2.0';

export function useSave() {
  return (filename: string) => {
    const s = useStore.getState();
    const file: VxsFile = {
      version: APP_VERSION,
      gridWidth: s.gridWidth,
      gridHeight: s.gridHeight,
      colorMap: [...s.colorMap],
      depthMap: [...s.depthMap],
      shapeMap: [...s.shapeMap],
      rotationMap: [...s.rotationMap],
      palette: [...s.palette],
    };
    const json = JSON.stringify(file, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = filename.trim() || 'project';
    const fullName = safeName.endsWith('.vxs') ? safeName : `${safeName}.vxs`;
    a.download = fullName;
    a.click();
    URL.revokeObjectURL(url);
    useStore.getState().clearDirty();
    useStore.getState().setProjectName(fullName);
  };
}

export function useLoad() {
  return (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data: VxsFile = JSON.parse(e.target!.result as string);
        if (!data.version || !data.colorMap || !data.depthMap) {
          alert('Invalid .vxs file');
          return;
        }
        const size = data.gridWidth * data.gridHeight;
        // backward compat: v1.0 files have no shape/rotation data
        const shapeMap = data.shapeMap ?? new Array(size).fill('square');
        const rotationMap = data.rotationMap ?? new Array(size).fill(0);

        const s = useStore.getState();
        s.resizeGrid(data.gridWidth, data.gridHeight);
        s.setColorMap(data.colorMap);
        s.setDepthMap(data.depthMap);
        s.setShapeMap(shapeMap);
        s.setRotationMap(rotationMap);
        if (data.palette) {
          data.palette.forEach((color, i) => s.setPaletteColor(i, color));
        }
        useStore.getState().clearDirty();
        useStore.getState().setProjectName(file.name);
      } catch {
        alert('Failed to parse .vxs file');
      }
    };
    reader.readAsText(file);
  };
}
