import { Sparkles, Settings2, Trash2, X, KeyRound } from 'lucide-react';

import { useStore } from '../../store';
import { isConfigured } from '../../ai/providers';
import { APP_EVENTS, emitAppEvent } from '../../core/app-events';
import { ChatTranscript } from './chat-transcript';
import { ChatComposer } from './chat-composer';
import { ChatError } from './chat-error';
import { IconButton } from '@/components/ui/icon-button';
import { useAssistant } from '../../hooks/use-assistant';

function SetupPrompt() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <KeyRound className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium text-text-primary">Add a key to start</p>
        <p className="text-[11px] leading-relaxed text-text-muted">
          The assistant runs against your own key, straight from this browser. Anthropic, or any
          endpoint that speaks the OpenAI chat format.
        </p>
      </div>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => emitAppEvent(APP_EVENTS.aiSettings)}
      >
        Open settings
      </button>
    </div>
  );
}

/** The assistant sidebar. It sits beside the stage rather than over it, so the
 *  board stays visible while the model edits it. */
export function AssistantPanel() {
  const settings = useStore((s) => s.aiSettings);
  const hasTurns = useStore((s) => s.chatTurns.length > 0);
  const running = useStore((s) => s.chatRunning);
  const clearChat = useStore((s) => s.clearChat);
  const { retry } = useAssistant();
  const setChatOpen = useStore((s) => s.setChatOpen);
  const ready = isConfigured(settings);

  return (
    // max-w-[60vw] so a narrow window always keeps most of the stage. The cap
    // never binds on a desktop width.
    <aside className="flex w-95 max-w-[60vw] shrink-0 flex-col overflow-hidden border-l border-border bg-bg-panel">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        <Sparkles aria-hidden="true" className="size-4 shrink-0 text-accent" />
        <span className="text-xs font-semibold text-text-primary">Assistant</span>
        <span className="truncate rounded-md border border-border bg-bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
          {settings.model || 'no model'}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <IconButton
            label="Clear the conversation"
            size="sm"
            disabled={!hasTurns || running}
            onClick={clearChat}
          >
            <Trash2 className="size-3.5" />
          </IconButton>
          <IconButton
            label="Assistant settings"
            size="sm"
            onClick={() => emitAppEvent(APP_EVENTS.aiSettings)}
          >
            <Settings2 className="size-3.5" />
          </IconButton>
          <IconButton
            label="Close the assistant"
            shortcut="Ctrl+K"
            size="sm"
            onClick={() => setChatOpen(false)}
          >
            <X className="size-3.5" />
          </IconButton>
        </div>
      </header>

      {!ready ? (
        <SetupPrompt />
      ) : (
        <>
          <div data-chat-scroller className="min-h-0 flex-1 overflow-y-auto">
            <ChatTranscript />
          </div>

          <ChatError onRetry={retry} />
          <ChatComposer />
        </>
      )}
    </aside>
  );
}
