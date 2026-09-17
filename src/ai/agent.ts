// The agent loop. Send the transcript, run whatever tools come back, send the
// results, repeat until the model stops asking for tools.

import { useStore } from '../store';
import { AI_TOOLS, resetTurnLimits, runTool, toolMutates } from './tools';
import { pushAgentSnapshot } from './board-io';
import { buildSystemPrompt } from './system-prompt';
import { createProvider, isConfigured } from './providers';
import { ProviderError } from './provider-error';
import type { ToolResult } from './types';

// Enough for a multi-step drawing, low enough that a confused model cannot
// spend the person's money in a loop.
const MAX_STEPS = 12;

export class NotConfiguredError extends ProviderError {
  constructor() {
    super({ message: 'Add an API key in the assistant settings first.', action: 'settings' });
    this.name = 'NotConfiguredError';
  }
}

export async function runAgent(userText: string, signal: AbortSignal): Promise<void> {
  resetTurnLimits();
  const store = useStore.getState();
  if (!isConfigured(store.aiSettings)) throw new NotConfiguredError();

  const provider = createProvider(store.aiSettings);
  const model = store.aiSettings.model.trim();

  store.setChatError(null);
  store.appendUserTurn(userText);

  // One snapshot per turn, taken before the first write, so the whole turn is
  // a single Ctrl+Z.
  let snapshotTaken = false;

  for (let step = 0; step < MAX_STEPS; step++) {
    if (signal.aborted) return;

    useStore.getState().appendPendingAssistant();

    const reply = await provider.send({
      system: buildSystemPrompt(),
      // Drop the pending turn we just pushed; it is a UI placeholder.
      turns: useStore.getState().chatTurns.slice(0, -1),
      tools: AI_TOOLS,
      model,
      signal,
      onEvent: (event) => {
        if (event.type === 'text') useStore.getState().appendAssistantText(event.delta);
      },
    });

    useStore.getState().finishAssistantTurn({
      text: reply.text,
      toolCalls: reply.toolCalls,
      raw: reply.raw,
    });

    if (reply.stopReason === 'refusal') return;
    if (reply.toolCalls.length === 0) break;

    const results: ToolResult[] = [];
    for (const call of reply.toolCalls) {
      if (signal.aborted) return;
      if (!snapshotTaken && toolMutates(call.name)) {
        pushAgentSnapshot();
        snapshotTaken = true;
      }
      const { output, isError } = runTool(call.name, call.input);
      results.push({ id: call.id, name: call.name, output, isError });
    }

    useStore.getState().appendToolTurn(results);

    if (step === MAX_STEPS - 1) {
      useStore.getState().setChatError({
        message: `Stopped after ${MAX_STEPS} tool steps. Ask again to carry on from where it left off.`,
        action: null,
      });
    }
  }

  if (snapshotTaken) {
    useStore.getState().markUndoLevel(useStore.getState().undoStack.length);
  }
}
