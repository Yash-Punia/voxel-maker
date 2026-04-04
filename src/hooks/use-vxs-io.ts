import { useStore } from '../store';
import type { VxsFile } from '../types';

const APP_VERSION = '1.0';

export function useSave() {
  return (filename: string) => {
    const s = useStore.getState();
    const file: VxsFile = {
      version: APP_VERSION,
      gridWidth: s.gridWidth,
      gridHeight: s.gridHeight,
      colorMap: [...s.colorMap],
      depthMap: [...s.depthMap],
      palette: [...s.palette],
    };
    const json = JSON.stringify(file, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = filename.trim() || 'project';
    a.download = safeName.endsWith('.vxs') ? safeName : `${safeName}.vxs`;
    a.click();
    URL.revokeObjectURL(url);
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
        const s = useStore.getState();
        s.resizeGrid(data.gridWidth, data.gridHeight);
        s.setColorMap(data.colorMap);
        s.setDepthMap(data.depthMap);
        if (data.palette) {
          data.palette.forEach((color, i) => s.setPaletteColor(i, color));
        }
      } catch {
        alert('Failed to parse .vxs file');
      }
    };
    reader.readAsText(file);
  };
}
