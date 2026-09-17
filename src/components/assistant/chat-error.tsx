import { useState } from 'react';
import { RotateCw, Settings2, TriangleAlert } from 'lucide-react';

import { useStore } from '../../store';
import { APP_EVENTS, emitAppEvent } from '../../core/app-events';

interface ChatErrorProps {
  onRetry: () => void;
}

/** What went wrong in one sentence, what to do about it as a button, and the
 *  provider's own words only for whoever goes looking. */
export function ChatError({ onRetry }: ChatErrorProps) {
  const error = useStore((s) => s.chatError);
  const running = useStore((s) => s.chatRunning);
  const [showDetail, setShowDetail] = useState(false);
  if (!error) return null;

  return (
    <div className="shrink-0 border-t border-danger/25 bg-danger/8 px-3 py-2.5">
      <div className="flex gap-2">
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-danger" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-[11px] leading-relaxed break-words text-danger">{error.message}</p>

          {showDetail && error.detail && (
            <pre className="max-h-24 overflow-auto rounded-md bg-black/30 p-2 font-mono text-[10px] leading-relaxed break-words whitespace-pre-wrap text-danger/80">
              {error.detail}
            </pre>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            {error.action === 'retry' && (
              <button
                type="button"
                className="btn btn-dense"
                onClick={onRetry}
                disabled={running}
              >
                <RotateCw className="size-3" />
                Try again
              </button>
            )}
            {error.action === 'settings' && (
              <button
                type="button"
                className="btn btn-dense"
                onClick={() => emitAppEvent(APP_EVENTS.aiSettings)}
              >
                <Settings2 className="size-3" />
                Open settings
              </button>
            )}
            {error.detail && (
              <button
                type="button"
                className="btn btn-ghost btn-dense text-text-muted"
                aria-expanded={showDetail}
                onClick={() => setShowDetail((v) => !v)}
              >
                {showDetail ? 'Hide details' : 'Show details'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
