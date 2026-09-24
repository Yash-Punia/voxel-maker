import { useState } from 'react';
import { Check, ChevronRight, TriangleAlert, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ToolCall, ToolResult } from '../../ai/types';

interface ToolStepProps {
  call: ToolCall;
  result?: ToolResult;
}

/** One tool call in the transcript. Collapsed it is a single line. Expanded it
 *  shows exactly what the assistant sent and what came back. */
export function ToolStep({ call, result }: ToolStepProps) {
  const [open, setOpen] = useState(false);
  const pending = !result;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg-secondary">
      <button
        type="button"
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-left transition-all duration-150 hover:bg-bg-hover active:scale-[0.99]"
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronRight
          aria-hidden="true"
          className={cn(
            'size-3 shrink-0 text-text-muted transition-transform duration-150',
            open && 'rotate-90',
          )}
        />
        <span className="font-mono text-[11px] text-text-secondary">{call.name}</span>
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          {pending ? (
            <Loader2 aria-label="Running" className="size-3 animate-spin text-text-muted" />
          ) : result.isError ? (
            <TriangleAlert aria-label="Failed" className="size-3 text-danger" />
          ) : (
            <Check aria-label="Done" className="size-3 text-success" />
          )}
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-1.5 border-t border-border px-2 py-2">
          <pre className="overflow-x-auto rounded-md bg-bg-input p-2 font-mono text-[10px] leading-relaxed text-text-muted">
            {JSON.stringify(call.input, null, 2)}
          </pre>
          {result && (
            <pre
              className={cn(
                'overflow-x-auto rounded-md bg-bg-input p-2 font-mono text-[10px] leading-relaxed',
                result.isError ? 'text-danger' : 'text-text-secondary',
              )}
            >
              {result.output.length > 2000 ? `${result.output.slice(0, 2000)}…` : result.output}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
