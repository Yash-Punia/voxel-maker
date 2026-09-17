import { useRef, useState } from 'react';
import {
  FilePlus2, FolderOpen, Save, Image as ImageIcon, Shapes,
  ArrowDownToLine, ArrowUpFromLine, Eraser, Keyboard, Compass,
} from 'lucide-react';

import { useStore } from '../../store';
import { useLoad } from '../../hooks/use-vxs-io';
import { loadImageFromFile, quantizeImageToGrid } from '../../core/image-import';
import { exportDepthMapPng, importDepthMapPng } from '../../core/depth-map-io';
import { resetOnboarding } from '../../core/onboarding-storage';
import { APP_EVENTS, emitAppEvent } from '../../core/app-events';
import { toast } from '../../core/toast';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Logo } from '@/components/ui/logo';

/** Everything that happens to the project as a whole. Keeping it behind one
 *  button is what lets the top bar stay down to the controls you use while
 *  actually drawing. */
export function AppMenu() {
  const isDirty = useStore((s) => s.isDirty);
  const load = useLoad();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pending = useRef<(() => void) | null>(null);
  const openRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const depthRef = useRef<HTMLInputElement>(null);

  // Opening a file and loading a sample both replace the board outright and
  // cannot be undone, so unsaved work gets one confirmation first.
  const guardUnsaved = (action: () => void) => {
    if (!isDirty) {
      action();
      return;
    }
    pending.current = action;
    setConfirmOpen(true);
  };

  const handleOpenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) load(file);
    e.target.value = '';
  };

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const s = useStore.getState();
      const imgData = await loadImageFromFile(file);
      const colorMap = quantizeImageToGrid(imgData, s.gridWidth, s.gridHeight);
      s.pushSnapshot({
        colorMap: [...s.colorMap],
        depthMap: [...s.depthMap],
        shapeMap: [...s.shapeMap],
        rotationMap: [...s.rotationMap],
      });
      s.setColorMap(colorMap);
    } catch {
      toast.error('Could not load the image', 'This browser cannot decode that file.');
    }
    e.target.value = '';
  };

  const handleDepthFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const s = useStore.getState();
    const nextDepth = await importDepthMapPng(file, s.gridWidth, s.gridHeight);
    s.pushSnapshot({
      colorMap: [...s.colorMap],
      depthMap: [...s.depthMap],
      shapeMap: [...s.shapeMap],
      rotationMap: [...s.rotationMap],
    });
    s.setDepthMap(nextDepth);
    e.target.value = '';
  };

  const handleExportDepth = () => {
    const s = useStore.getState();
    exportDepthMapPng(s.depthMap, s.colorMap, s.gridWidth, s.gridHeight);
  };

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Project menu" className="icon-btn">
                <Logo className="size-5" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>VoxBrush, and everything about this project</TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="start" className="min-w-60">
          <DropdownMenuLabel>Project</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => emitAppEvent(APP_EVENTS.newProject)}>
            <FilePlus2 />
            New project
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => guardUnsaved(() => openRef.current?.click())}>
            <FolderOpen />
            Open .vxs file
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => emitAppEvent(APP_EVENTS.save)}>
            <Save />
            Save
            <DropdownMenuShortcut keys="Ctrl+S" />
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Start from</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => guardUnsaved(() => emitAppEvent(APP_EVENTS.samples))}>
            <Shapes />
            Sample projects
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => imageRef.current?.click()}>
            <ImageIcon />
            Import an image
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Depth map</DropdownMenuLabel>
          <DropdownMenuItem onSelect={handleExportDepth}>
            <ArrowDownToLine />
            Export as grayscale PNG
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => depthRef.current?.click()}>
            <ArrowUpFromLine />
            Import from grayscale PNG
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => emitAppEvent(APP_EVENTS.clearCanvas)} variant="destructive">
            <Eraser />
            Clear the canvas
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => emitAppEvent(APP_EVENTS.shortcuts)}>
            <Keyboard />
            Keyboard shortcuts
            <DropdownMenuShortcut keys="?" />
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              resetOnboarding();
              emitAppEvent(APP_EVENTS.replayOnboarding);
            }}
          >
            <Compass />
            Replay the tour
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Discard unsaved changes?"
        description="This board has edits that are not saved to a .vxs file. Loading another project replaces them and cannot be undone."
        confirmLabel="Discard and continue"
        onConfirm={() => pending.current?.()}
      />

      <input ref={openRef} type="file" accept=".vxs" className="hidden" onChange={handleOpenFile} />
      <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
      <input
        ref={depthRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleDepthFile}
      />
    </>
  );
}
