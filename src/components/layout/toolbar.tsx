import { useRef, useState, useEffect } from "react";
import { Undo2, Redo2, Circle, HelpCircle } from "lucide-react";
import { useStore } from "../../store";
import { useSave, useLoad } from "../../hooks/use-vxs-io";
import {
  loadImageFromFile,
  quantizeImageToGrid,
} from "../../core/image-import";
import { SamplesModal } from "./samples-modal";
import { ShortcutsModal } from "./shortcuts-modal";
import { materializeSample, type SampleDef } from "../../core/samples";
import { DEFAULT_PALETTE, DEFAULT_SHAPE } from "../../store/tool-slice";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

const GRID_SIZES = [8, 16, 24, 32, 48, 64];

function SaveDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("project");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onConfirm(name);
    if (e.key === "Escape") onCancel();
  };

  return (
    <div
      className="fixed inset-0 bg-black/55 flex items-center justify-center z-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="bg-bg-secondary border border-border rounded-md shadow-app p-5 min-w-75 flex flex-col gap-3">
        <div className="text-[13px] font-semibold text-text-primary">
          Save project
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            className="flex-1 h-7.5 px-2 border border-border rounded-sm bg-bg-input text-text-primary text-[13px] focus:outline-hidden focus:border-border-focus"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="filename"
            spellCheck={false}
          />
          <span className="text-xs text-text-muted whitespace-nowrap">
            .vxs
          </span>
        </div>
        <div className="flex justify-end gap-1.5">
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={() => onConfirm(name)}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function Toolbar() {
  const {
    gridWidth,
    gridHeight,
    resizeGrid,
    clearGrid,
    pushSnapshot,
    colorMap,
    depthMap,
    shapeMap,
    rotationMap,
    isDirty,
    undo,
    redo,
    undoStack,
    redoStack,
    setPalette,
    setActiveShape,
    setActiveRotation,
    setMirrorMode,
    setExtrusionMode,
    setDepthMultiplier,
    clearHistory,
  } = useStore();
  const save = useSave();
  const load = useLoad();

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showSamples, setShowSamples] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const openFileRef = useRef<HTMLInputElement>(null);
  const imgFileRef = useRef<HTMLInputElement>(null);

  const openSaveDialog = () => setShowSaveDialog(true);

  const handleSaveConfirm = (name: string) => {
    setShowSaveDialog(false);
    save(name);
  };

  useEffect(() => {
    const onSave = () => openSaveDialog();
    const onShortcuts = () => setShowShortcuts(true);
    document.addEventListener("vxs:save", onSave);
    document.addEventListener("vxs:shortcuts", onShortcuts);
    return () => {
      document.removeEventListener("vxs:save", onSave);
      document.removeEventListener("vxs:shortcuts", onShortcuts);
    };
  }, []);

  const handleNew = () => {
    if (
      isDirty &&
      !confirm(
        "Start a new project? This resets the grid to 16×16, restores the default palette, resets shape/mirror/extrusion settings, and wipes undo history. Unsaved changes will be lost.",
      )
    )
      return;
    // Defer so Radix Tooltip's post-confirm focus/pointer unwind
    // doesn't race with the store updates.
    setTimeout(() => {
      resizeGrid(16, 16);
      setPalette([...DEFAULT_PALETTE]);
      setActiveShape(DEFAULT_SHAPE);
      setActiveRotation(0);
      setMirrorMode("none");
      setExtrusionMode("symmetric");
      setDepthMultiplier(1.0);
      clearGrid();
      clearHistory();
    }, 0);
  };

  const handleClear = () => {
    if (
      !confirm(
        "Clear the canvas? Painted cells and depth values will be wiped. Palette and grid size are kept. You can undo this with Ctrl+Z.",
      )
    )
      return;
    setTimeout(() => {
      pushSnapshot({
        colorMap: [...colorMap],
        depthMap: [...depthMap],
        shapeMap: [...shapeMap],
        rotationMap: [...rotationMap],
      });
      clearGrid();
    }, 0);
  };

  const handleOpen = () => {
    if (
      isDirty &&
      !confirm("Open another project? Unsaved changes will be lost.")
    )
      return;
    setTimeout(() => openFileRef.current?.click(), 0);
  };

  const handleSamples = () => {
    if (isDirty && !confirm("Load a sample? Unsaved changes will be lost."))
      return;
    // Defer off the current event tick so Radix Tooltip's focus/pointer
    // unwind after confirm() doesn't race with the modal mount.
    setTimeout(() => setShowSamples(true), 0);
  };

  const handleSampleSelect = (sample: SampleDef) => {
    const m = materializeSample(sample);
    const s = useStore.getState();
    s.resizeGrid(m.gridWidth, m.gridHeight);
    s.setColorMap(m.colorMap);
    s.setDepthMap(m.depthMap);
    s.setShapeMap(m.shapeMap);
    s.setRotationMap(m.rotationMap);
    s.clearDirty();
    setShowSamples(false);
  };

  const handleOpenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) load(file);
    e.target.value = "";
  };

  const handleImgImport = () => imgFileRef.current?.click();

  const handleImgFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imgData = await loadImageFromFile(file);
      const newColorMap = quantizeImageToGrid(imgData, gridWidth, gridHeight);
      pushSnapshot({
        colorMap: [...colorMap],
        depthMap: [...depthMap],
        shapeMap: [...shapeMap],
        rotationMap: [...rotationMap],
      });
      useStore.getState().setColorMap(newColorMap);
    } catch {
      alert("Failed to load image");
    }
    e.target.value = "";
  };

  const handleGridSize = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const n = parseInt(e.target.value);
    if (confirm(`Resize grid to ${n}×${n}? Content will be cropped/padded.`)) {
      pushSnapshot({
        colorMap: [...colorMap],
        depthMap: [...depthMap],
        shapeMap: [...shapeMap],
        rotationMap: [...rotationMap],
      });
      resizeGrid(n, n);
    }
  };

  return (
    <>
      <div className="h-11 bg-bg-secondary border-b border-border flex items-center gap-1 px-2.5 shrink-0 z-10">
        <span className="font-bold text-sm text-accent mr-3 tracking-[0.03em]">
          Voxel Studio
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="btn"
              onClick={handleNew}
              title="New project — full reset: grid 16×16, default palette, default tool settings, history wiped"
            >
              New
            </button>
          </TooltipTrigger>
          <TooltipContent>
            Full reset — grid 16×16, default palette, default tool
            settings, history wiped
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="btn"
              onClick={handleClear}
              title="Clear canvas only — palette, grid size, tool settings kept; undo-able"
            >
              Clear
            </button>
          </TooltipTrigger>
          <TooltipContent>
            Clear canvas only — palette, grid, tool settings kept.
            Undo with Ctrl+Z.
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button className="btn" onClick={handleOpen} title="Open .vxs file">
              Open
            </button>
          </TooltipTrigger>
          <TooltipContent>Open .vxs file</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="btn btn-primary inline-flex items-center gap-1.5"
              onClick={openSaveDialog}
              title={
                isDirty ? "Save project (unsaved changes)" : "Save project"
              }
            >
              <span className="inline-flex items-center gap-1">
                Save
                {isDirty && (
                  <Circle className="size-2 fill-current" strokeWidth={0} />
                )}
              </span>
              <span className="text-[9px] opacity-60 font-mono">Ctrl+S</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {isDirty ? "Save project (unsaved changes)" : "Save project"}
            <kbd data-slot="kbd" className="ml-1 bg-black/30 px-1 text-[10px]">
              Ctrl+S
            </kbd>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="btn"
              onClick={handleImgImport}
              title="Import image as pixel art"
            >
              Import Image
            </button>
          </TooltipTrigger>
          <TooltipContent>Import image as pixel art</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="btn"
              onClick={handleSamples}
              title="Browse sample projects"
            >
              Samples
            </button>
          </TooltipTrigger>
          <TooltipContent>Browse sample projects</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="btn btn-icon"
              onClick={() => setShowShortcuts(true)}
              title="Keyboard shortcuts (?)"
            >
              <HelpCircle className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            Keyboard shortcuts
            <kbd data-slot="kbd" className="ml-1 bg-black/30 px-1 text-[10px]">?</kbd>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-border mx-1.5" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="btn inline-flex items-center gap-1"
              onClick={undo}
              disabled={undoStack.length === 0}
              title="Undo"
            >
              <Undo2 className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            Undo
            <kbd data-slot="kbd" className="ml-1 bg-black/30 px-1 text-[10px]">
              Ctrl+Z
            </kbd>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="btn inline-flex items-center gap-1"
              onClick={redo}
              disabled={redoStack.length === 0}
              title="Redo"
            >
              <Redo2 className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            Redo
            <kbd data-slot="kbd" className="ml-1 bg-black/30 px-1 text-[10px]">
              Ctrl+⇧+Z
            </kbd>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-border mx-1.5" />

        <label className="text-[11px] text-text-secondary">Grid:</label>
        <select
          className="h-7 px-1.5 border border-border rounded-sm bg-bg-input text-text-primary text-xs cursor-pointer focus:outline-hidden focus:border-border-focus"
          value={gridWidth}
          onChange={handleGridSize}
          title="Resize canvas (content is cropped/padded; confirmation required)"
        >
          {GRID_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}×{s}
            </option>
          ))}
        </select>

        <input
          ref={openFileRef}
          type="file"
          accept=".vxs"
          className="hidden"
          onChange={handleOpenFile}
        />
        <input
          ref={imgFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImgFile}
        />
      </div>

      {showSaveDialog && (
        <SaveDialog
          onConfirm={handleSaveConfirm}
          onCancel={() => setShowSaveDialog(false)}
        />
      )}

      {showSamples && (
        <SamplesModal
          onSelect={handleSampleSelect}
          onClose={() => setShowSamples(false)}
        />
      )}

      {showShortcuts && (
        <ShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}
    </>
  );
}
