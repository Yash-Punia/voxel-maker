// Commands that can come from several places at once: the project menu, a
// keyboard shortcut, the mode bar, or the assistant. The dialogs and the
// canvases listen for them, so no caller has to hold a ref to the other side.

export const APP_EVENTS = {
  newProject: 'vxs:new-project',
  save: 'vxs:save',
  samples: 'vxs:samples',
  shortcuts: 'vxs:shortcuts',
  clearCanvas: 'vxs:clear-canvas',
  replayOnboarding: 'vxs:replay-onboarding',
  aiSettings: 'vxs:ai-settings',
  fitView: 'vxs:fit-view',
  frameModel: 'vxs:frame-model',
  toast: 'vxs:toast',
} as const;

export type AppEvent = (typeof APP_EVENTS)[keyof typeof APP_EVENTS];

export function emitAppEvent(name: AppEvent, detail?: unknown): void {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}
