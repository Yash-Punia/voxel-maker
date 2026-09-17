import { useRef, useState } from 'react';
import { ArrowUp, Square } from 'lucide-react';

import { useStore } from '../../store';
import { useAssistant } from '../../hooks/use-assistant';
import { IconButton } from '@/components/ui/icon-button';
import { deriveStyleProfile } from '../../core/style-profile';
import { Palette } from 'lucide-react';

const SUGGESTIONS = [
  'Draw a red mushroom with a spotted cap',
  'Give the board depth so the front reads as rounded',
  'Make a 24×24 sword using the PICO-8 palette',
];

export function ChatComposer() {
  const { send, stop, running } = useAssistant();
  const hasTurns = useStore((s) => s.chatTurns.length > 0);
  // Style matching happens on every request whether or not it is mentioned.
  // Saying so is the difference between a feature and an invisible one.
  const style = useStore((s) => deriveStyleProfile(s.assets, s.palette));
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const submit = (text: string) => {
    if (running || !text.trim()) return;
    setValue('');
    void send(text);
  };

  return (
    <div className="shrink-0 border-t border-border bg-bg-panel p-3">
      {!hasTurns && (
        <div className="mb-3 flex flex-col gap-1.5">
          {style && (
            <p className="mb-1 flex items-center gap-1.5 text-[11px] text-text-muted">
              <Palette aria-hidden="true" className="size-3.5 shrink-0 text-accent" />
              Matching this project: {style.colors.length} colours, {style.shapes.length} shapes, depth {style.depth.min} to {style.depth.max}
            </p>
          )}
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="cursor-pointer rounded-lg border border-border bg-bg-secondary px-2.5 py-2 text-left text-[11px] text-text-secondary transition-all duration-150 hover:border-border-strong hover:bg-bg-hover hover:text-text-primary active:scale-[0.98]"
              onClick={() => submit(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 rounded-xl border border-border bg-bg-input p-1.5 transition-all duration-200 focus-within:border-accent">
        <textarea
          ref={inputRef}
          rows={1}
          value={value}
          aria-label="Message the assistant"
          placeholder="Ask for a change to the board"
          spellCheck={false}
          className="max-h-32 min-h-8 flex-1 resize-none bg-transparent px-2 py-1.5 text-xs leading-5 text-text-primary placeholder:text-xs placeholder:text-text-muted focus:outline-hidden"
          onChange={(e) => {
            setValue(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit(value);
              if (inputRef.current) inputRef.current.style.height = 'auto';
            }
          }}
        />
        {running ? (
          <IconButton label="Stop the assistant" side="top" onClick={stop}>
            <Square className="size-3.5 fill-current" />
          </IconButton>
        ) : (
          <IconButton
            label="Send"
            shortcut="Enter"
            side="top"
            className="border-accent bg-accent text-white hover:border-accent-hover hover:bg-accent-hover hover:text-white"
            onClick={() => submit(value)}
            disabled={!value.trim()}
          >
            <ArrowUp className="size-4" />
          </IconButton>
        )}
      </div>
    </div>
  );
}
