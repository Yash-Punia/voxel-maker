import { useCallback } from 'react';

import { useStore } from '../store';
import { runAgent } from '../ai/agent';
import { ProviderError } from '../ai/provider-error';

export interface AssistantControls {
  send: (text: string) => Promise<void>;
  /** Rewinds to the last question and asks it again. */
  retry: () => void;
  stop: () => void;
  running: boolean;
}

// One run at a time, so the controller belongs to the module rather than to a
// component. The composer and the error banner both drive the same request.
let inFlight: AbortController | null = null;

/** Drives the agent for whichever part of the panel needs to start or stop it. */
export function useAssistant(): AssistantControls {
  const running = useStore((s) => s.chatRunning);

  const stop = useCallback(() => {
    inFlight?.abort();
    inFlight = null;
    useStore.getState().settlePendingAssistant();
    useStore.getState().setChatRunning(false);
  }, []);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || useStore.getState().chatRunning) return;

    const controller = new AbortController();
    inFlight = controller;
    useStore.getState().setChatRunning(true);

    try {
      await runAgent(trimmed, controller.signal);
    } catch (error) {
      if (!controller.signal.aborted) {
        useStore.getState().setChatError(
          error instanceof ProviderError
            ? { message: error.message, detail: error.detail, action: error.action }
            : { message: (error as Error).message, action: 'retry' },
        );
      }
    } finally {
      if (inFlight === controller) inFlight = null;
      useStore.getState().settlePendingAssistant();
      useStore.getState().setChatRunning(false);
    }
  }, []);

  const retry = useCallback(() => {
    const question = useStore.getState().takeLastQuestion();
    if (question) void send(question);
  }, [send]);

  return { send, retry, stop, running };
}
