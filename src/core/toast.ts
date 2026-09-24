import { APP_EVENTS, emitAppEvent } from './app-events';

// Failure feedback for the whole app. The emitter is pure, so the modules under
// src/core and src/exporters can report a problem without mounting a React
// surface. The Toaster is the only thing that listens.

export type ToastTone = 'error' | 'warning';

export interface ToastSpec {
  tone: ToastTone;
  title: string;
  description?: string;
}

function emit(tone: ToastTone, title: string, description?: string): void {
  const spec: ToastSpec = { tone, title, description };
  emitAppEvent(APP_EVENTS.toast, spec);
}

export const toast = {
  /** The action did not happen. */
  error: (title: string, description?: string): void => emit('error', title, description),
  /** The action happened, but the result is degraded and the person must know. */
  warning: (title: string, description?: string): void => emit('warning', title, description),
};
