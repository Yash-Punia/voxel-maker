import { useEffect, useMemo, useRef } from 'react';
import { Undo2 } from 'lucide-react';

import { useStore } from '../../store';
import { ToolStep } from './tool-step';
import type { AgentTurn, ToolCall, ToolResult } from '../../ai/types';

interface RenderedTurn {
  key: number;
  role: 'user' | 'assistant';
  text: string;
  pending: boolean;
  steps: { call: ToolCall; result?: ToolResult }[];
  undoLevel?: number;
}

/** Pairs each assistant turn with the tool results that answered it, so the
 *  transcript reads as one block per exchange instead of raw protocol turns. */
function render(turns: AgentTurn[]): RenderedTurn[] {
  const out: RenderedTurn[] = [];

  turns.forEach((turn, index) => {
    if (turn.role === 'user') {
      out.push({ key: index, role: 'user', text: turn.text, pending: false, steps: [] });
      return;
    }
    if (turn.role === 'assistant') {
      const next = turns[index + 1];
      const results = next?.role === 'tool' ? next.results : [];
      out.push({
        key: index,
        role: 'assistant',
        text: turn.text,
        pending: turn.pending === true,
        undoLevel: turn.undoLevel,
        steps: turn.toolCalls.map((call) => ({
          call,
          result: results.find((r) => r.id === call.id),
        })),
      });
    }
  });

  return out;
}

function RevertButton({ undoLevel }: { undoLevel: number }) {
  const undoStack = useStore((s) => s.undoStack);
  const undo = useStore((s) => s.undo);
  // Only offered while the assistant's edit is still the newest thing on the
  // undo stack. After that, undo would take back the person's own work.
  if (undoStack.length !== undoLevel) return null;

  return (
    <button type="button" className="btn btn-ghost btn-dense mt-1" onClick={undo}>
      <Undo2 className="size-3" />
      Undo these edits
    </button>
  );
}

export function ChatTranscript() {
  const turns = useStore((s) => s.chatTurns);
  const running = useStore((s) => s.chatRunning);
  const bottomRef = useRef<HTMLDivElement>(null);
  const rendered = useMemo(() => render(turns), [turns]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [turns, running]);

  return (
    <div className="flex flex-col gap-4 p-3">
      {rendered.map((turn) =>
        turn.role === 'user' ? (
          <div key={turn.key} className="flex justify-end">
            <div className="max-w-[85%] rounded-xl rounded-br-sm bg-bg-elevated px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap text-text-primary">
              {turn.text}
            </div>
          </div>
        ) : (
          <div key={turn.key} className="flex flex-col gap-2">
            {turn.text && (
              <p className="text-xs leading-relaxed whitespace-pre-wrap text-text-secondary">
                {turn.text}
              </p>
            )}
            {turn.pending && !turn.text && (
              <div className="flex gap-1" aria-label="Working">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="size-1.5 animate-pulse rounded-full bg-text-muted"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            )}
            {turn.steps.length > 0 && (
              <div className="flex flex-col gap-1">
                {turn.steps.map((step) => (
                  <ToolStep key={step.call.id} call={step.call} result={step.result} />
                ))}
              </div>
            )}
            {turn.undoLevel !== undefined && <RevertButton undoLevel={turn.undoLevel} />}
          </div>
        ),
      )}
      <div ref={bottomRef} />
    </div>
  );
}
