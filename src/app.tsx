import { lazy, Suspense, useEffect, useState } from 'react';
import './styles/index.css';
import { Group, Panel, Separator, useDefaultLayout } from 'react-resizable-panels';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toolbar } from './components/layout/toolbar';
import { StatusBar } from './components/layout/status-bar';
import { PaintEditor } from './components/paint-editor/paint-editor';
import { DepthEditor } from './components/depth-editor/depth-editor';
import { OnboardingTour } from './components/layout/onboarding-tour';
import { shouldShowOnboarding, markOnboardingSeen } from './core/onboarding-storage';
import { useKeyboardShortcuts } from './hooks/use-keyboard-shortcuts';
import { useDirtyState } from './hooks/use-dirty-state';

const Preview3D = lazy(async () => {
  const mod = await import('./components/preview-3d/preview-3d');
  return { default: mod.Preview3D };
});

function PreviewFallback() {
  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden bg-bg-panel">
      <div className="h-9 shrink-0 border-b border-border bg-bg-secondary px-2.5">
        <div className="flex h-full items-center">
          <span className="label-title">3D Preview</span>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center bg-[#0d0d12]">
        <span className="text-xs text-text-muted">Loading preview…</span>
      </div>
    </div>
  );
}

export function App() {
  useKeyboardShortcuts();
  useDirtyState();

  // Lazy initializer — runs once on mount. Avoids setState-in-effect.
  const [showOnboarding, setShowOnboarding] = useState(() => shouldShowOnboarding());

  useEffect(() => {
    const replay = () => setShowOnboarding(true);
    document.addEventListener('vxs:replay-onboarding', replay);
    return () => document.removeEventListener('vxs:replay-onboarding', replay);
  }, []);

  const closeOnboarding = () => {
    markOnboardingSeen();
    setShowOnboarding(false);
  };

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: 'vxs-root',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  });

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col h-screen overflow-hidden">
        <Toolbar />
        <Group
          orientation="horizontal"
          id="vxs-root"
          defaultLayout={defaultLayout}
          onLayoutChanged={onLayoutChanged}
          className="flex-1 overflow-hidden"
        >
          <Panel id="paint" defaultSize={33} minSize={18}>
            <PaintEditor />
          </Panel>
          <Separator className="resize-handle-h" />
          <Panel id="depth" defaultSize={33} minSize={18}>
            <DepthEditor />
          </Panel>
          <Separator className="resize-handle-h" />
          <Panel id="preview" defaultSize={34} minSize={20}>
            <Suspense fallback={<PreviewFallback />}>
              <Preview3D />
            </Suspense>
          </Panel>
        </Group>
        <StatusBar />
      </div>
      {showOnboarding && <OnboardingTour onClose={closeOnboarding} />}
    </TooltipProvider>
  );
}
