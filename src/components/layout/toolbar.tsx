import { useRef, useState, useEffect } from 'react';
import { useStore } from '../../store';
import { useSave, useLoad } from '../../hooks/use-vxs-io';
import { loadImageFromFile, quantizeImageToGrid } from '../../core/image-import';

const GRID_SIZES = [8, 16, 24, 32, 48, 64];

function SaveDialog({ onConfirm, onCancel }: { onConfirm: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState('project');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onConfirm(name);
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal">
        <div className="modal-title">Save project</div>
        <div className="modal-row">
          <input
            ref={inputRef}
            className="modal-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="filename"
            spellCheck={false}
          />
          <span className="modal-ext">.vxs</span>
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onConfirm(name)}>Save</button>
        </div>
      </div>
    </div>
  );
}

export function Toolbar() {
  const { gridWidth, gridHeight, resizeGrid, clearGrid, pushSnapshot, colorMap, depthMap } = useStore();
  const save = useSave();
  const load = useLoad();

  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const openFileRef = useRef<HTMLInputElement>(null);
  const imgFileRef = useRef<HTMLInputElement>(null);

  const openSaveDialog = () => setShowSaveDialog(true);

  const handleSaveConfirm = (name: string) => {
    setShowSaveDialog(false);
    save(name);
  };

  // Expose save dialog to keyboard shortcut handler
  useEffect(() => {
    const handler = () => openSaveDialog();
    document.addEventListener('vxs:save', handler);
    return () => document.removeEventListener('vxs:save', handler);
  }, []);

  const handleNew = () => {
    if (confirm('Start a new project? Unsaved changes will be lost.')) {
      clearGrid();
    }
  };

  const handleOpen = () => openFileRef.current?.click();

  const handleOpenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) load(file);
    e.target.value = '';
  };

  const handleImgImport = () => imgFileRef.current?.click();

  const handleImgFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imgData = await loadImageFromFile(file);
      const newColorMap = quantizeImageToGrid(imgData, gridWidth, gridHeight);
      pushSnapshot({ colorMap: [...colorMap], depthMap: [...depthMap] });
      useStore.getState().setColorMap(newColorMap);
    } catch {
      alert('Failed to load image');
    }
    e.target.value = '';
  };

  const handleGridSize = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const n = parseInt(e.target.value);
    if (confirm(`Resize grid to ${n}×${n}? Content will be cropped/padded.`)) {
      pushSnapshot({ colorMap: [...colorMap], depthMap: [...depthMap] });
      resizeGrid(n, n);
    }
  };

  return (
    <>
      <div className="toolbar">
        <span className="toolbar-brand">Voxel Studio</span>

        <button className="btn" onClick={handleNew} title="New project">New</button>
        <button className="btn" onClick={handleOpen} title="Open .vxs file">Open</button>
        <button className="btn btn-primary" onClick={openSaveDialog} title="Save project (Ctrl+S)">Save</button>
        <button className="btn" onClick={handleImgImport} title="Import image as pixel art">Import Image</button>

        <div className="toolbar-separator" />

        <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Grid:</label>
        <select
          className="grid-size-select"
          value={gridWidth}
          onChange={handleGridSize}
        >
          {GRID_SIZES.map((s) => (
            <option key={s} value={s}>{s}×{s}</option>
          ))}
        </select>

        <input ref={openFileRef} type="file" accept=".vxs" style={{ display: 'none' }} onChange={handleOpenFile} />
        <input ref={imgFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImgFile} />
      </div>

      {showSaveDialog && (
        <SaveDialog
          onConfirm={handleSaveConfirm}
          onCancel={() => setShowSaveDialog(false)}
        />
      )}
    </>
  );
}
