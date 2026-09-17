import { useStore } from '../store';
import type { VxsFile } from '../types';
import { VXS_VERSION, isVxsFile, readAssets } from '../core/vxs-format';
import { toast } from '../core/toast';

export function useSave() {
  return (filename: string) => {
    // The live board is the active asset, so it has to go back into the set
    // before the set is written.
    useStore.getState().commitActiveAsset();
    const s = useStore.getState();
    const file: VxsFile = {
      version: VXS_VERSION,
      palette: [...s.palette],
      assets: s.assets,
      activeAssetId: s.activeAssetId,
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
        const data: unknown = JSON.parse(e.target!.result as string);
        if (!isVxsFile(data)) {
          toast.error('Invalid .vxs file', 'The file is missing its version or its board data.');
          return;
        }
        const assets = readAssets(data);
        const s = useStore.getState();
        s.loadAssets(assets, data.activeAssetId ?? assets[0].id);
        if (data.palette) {
          data.palette.forEach((color, i) => s.setPaletteColor(i, color));
        }
        useStore.getState().clearHistory();
        useStore.getState().clearDirty();
        useStore.getState().setProjectName(file.name);
      } catch {
        toast.error('Could not read the .vxs file', 'The file is not valid JSON.');
      }
    };
    reader.readAsText(file);
  };
}
