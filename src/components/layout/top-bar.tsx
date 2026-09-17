import { Undo2, Redo2, Keyboard, Sparkles } from 'lucide-react';

import { useStore } from '../../store';
import { APP_EVENTS, emitAppEvent } from '../../core/app-events';
import { AppMenu } from './app-menu';
import { ToolCluster } from '../paint-editor/tool-cluster';
import { DepthCluster } from '../depth-editor/depth-cluster';
import { ModelCluster } from '../preview-3d/model-cluster';
import { IconButton } from '@/components/ui/icon-button';

function ModeCluster() {
  const mode = useStore((s) => s.mode);
  if (mode === 'draw') return <ToolCluster />;
  if (mode === 'depth') return <DepthCluster />;
  if (mode === 'model') return <ModelCluster />;
  return null;
}

/** Floats over the stage. Three clusters: the project on the left, the
 *  controls for the current mode in the middle, help on the right. */
export function TopBar() {
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.undoStack.length > 0);
  const canRedo = useStore((s) => s.redoStack.length > 0);
  const chatOpen = useStore((s) => s.chatOpen);
  const toggleChat = useStore((s) => s.toggleChat);

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 grid grid-cols-[1fr_auto_1fr] items-start gap-3 p-3">
      <div className="pointer-events-auto flex items-start gap-2 justify-self-start">
        <div className="rail">
          <AppMenu />
          <div className="rail-sep" />
          <IconButton label="Undo" shortcut="Ctrl+Z" disabled={!canUndo} onClick={undo}>
            <Undo2 className="size-4" />
          </IconButton>
          <IconButton label="Redo" shortcut="Ctrl+Shift+Z" disabled={!canRedo} onClick={redo}>
            <Redo2 className="size-4" />
          </IconButton>
        </div>
      </div>

      <div className="pointer-events-auto flex items-start gap-2 justify-self-center">
        <ModeCluster />
      </div>

      <div className="pointer-events-auto flex items-start gap-2 justify-self-end">
        <div className="rail">
          <IconButton
            label="Keyboard shortcuts"
            shortcut="?"
            onClick={() => emitAppEvent(APP_EVENTS.shortcuts)}
          >
            <Keyboard className="size-4" />
          </IconButton>
          <div className="rail-sep" />
          <IconButton
            label="Assistant"
            shortcut="Ctrl+K"
            active={chatOpen}
            onClick={toggleChat}
          >
            <Sparkles className="size-4" />
          </IconButton>
        </div>
      </div>
    </header>
  );
}
