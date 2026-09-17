import './styles/index.css';

import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { useStore } from './store';
import { Workspace } from './components/workspace/workspace';
import { AssistantPanel } from './components/assistant/assistant-panel';
import { ModeBar } from './components/layout/mode-bar';
import { DialogHost } from './components/layout/dialog-host';
import { useKeyboardShortcuts } from './hooks/use-keyboard-shortcuts';
import { useDirtyState } from './hooks/use-dirty-state';
import { useDraftAutosave } from './hooks/use-draft-autosave';

export function App() {
  useKeyboardShortcuts();
  useDirtyState();
  useDraftAutosave();
  const chatOpen = useStore((s) => s.chatOpen);

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex h-screen flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1">
          <Workspace />
          {chatOpen && <AssistantPanel />}
        </div>
        <ModeBar />
      </div>
      <DialogHost />
      <Toaster />
    </TooltipProvider>
  );
}
