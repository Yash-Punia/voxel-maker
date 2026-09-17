import { useState } from 'react';

import { useStore } from '../../store';
import { APP_EVENTS } from '../../core/app-events';
import { useAppEvent } from '../../hooks/use-app-event';
import { shouldShowOnboarding, markOnboardingSeen } from '../../core/onboarding-storage';
import { materializeSample, type SampleDef } from '../../core/samples';
import { NewProjectDialog } from './new-project-dialog';
import { SaveDialog } from './save-dialog';
import { SamplesModal } from './samples-modal';
import { ShortcutsModal } from './shortcuts-modal';
import { OnboardingTour } from './onboarding-tour';
import { AiSettingsDialog } from '../assistant/ai-settings-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

/** Every dialog in the app lives here, at the page root, driven by app events.
 *  Nothing that opens a dialog has to own its state or survive a re-render. */
export function DialogHost() {
  const [newProject, setNewProject] = useState(false);
  const [save, setSave] = useState(false);
  const [samples, setSamples] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [clearCanvas, setClearCanvas] = useState(false);
  const [discardForSamples, setDiscardForSamples] = useState(false);
  const [aiSettings, setAiSettings] = useState(false);
  const [onboarding, setOnboarding] = useState(() => shouldShowOnboarding());

  useAppEvent(APP_EVENTS.newProject, () => setNewProject(true));
  useAppEvent(APP_EVENTS.save, () => setSave(true));
  useAppEvent(APP_EVENTS.shortcuts, () => setShortcuts(true));
  useAppEvent(APP_EVENTS.clearCanvas, () => setClearCanvas(true));
  useAppEvent(APP_EVENTS.replayOnboarding, () => setOnboarding(true));
  useAppEvent(APP_EVENTS.aiSettings, () => setAiSettings(true));
  useAppEvent(APP_EVENTS.samples, () => {
    if (useStore.getState().isDirty) setDiscardForSamples(true);
    else setSamples(true);
  });

  const handleClearCanvas = () => {
    const s = useStore.getState();
    s.pushSnapshot({
      colorMap: [...s.colorMap],
      depthMap: [...s.depthMap],
      shapeMap: [...s.shapeMap],
      rotationMap: [...s.rotationMap],
    });
    s.clearGrid();
  };

  const handleSampleSelect = (sample: SampleDef) => {
    const m = materializeSample(sample);
    const s = useStore.getState();
    s.resizeGrid(m.gridWidth, m.gridHeight);
    s.setColorMap(m.colorMap);
    s.setDepthMap(m.depthMap);
    s.setShapeMap(m.shapeMap);
    s.setRotationMap(m.rotationMap);
    s.clearHistory();
    s.clearDirty();
    s.setProjectName(sample.name.toLowerCase().replace(/\s+/g, '-'));
    setSamples(false);
  };

  const closeOnboarding = () => {
    markOnboardingSeen();
    setOnboarding(false);
  };

  return (
    <>
      <NewProjectDialog open={newProject} onOpenChange={setNewProject} />
      <SaveDialog open={save} onOpenChange={setSave} />
      <SamplesModal open={samples} onOpenChange={setSamples} onSelect={handleSampleSelect} />
      <ShortcutsModal open={shortcuts} onOpenChange={setShortcuts} />
      <OnboardingTour open={onboarding} onClose={closeOnboarding} />
      <AiSettingsDialog open={aiSettings} onOpenChange={setAiSettings} />

      <ConfirmDialog
        open={clearCanvas}
        onOpenChange={setClearCanvas}
        title="Clear the canvas?"
        description="Every painted cell and depth value is wiped. The palette, the canvas size and the tool settings stay. Ctrl+Z brings it back."
        confirmLabel="Clear the canvas"
        onConfirm={handleClearCanvas}
      />

      <ConfirmDialog
        open={discardForSamples}
        onOpenChange={setDiscardForSamples}
        title="Discard unsaved changes?"
        description="This board has edits that are not saved to a .vxs file. Loading a sample replaces them and cannot be undone."
        confirmLabel="Discard and browse"
        onConfirm={() => setSamples(true)}
      />
    </>
  );
}
