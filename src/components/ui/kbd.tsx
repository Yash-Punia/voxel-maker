import * as React from "react";
import {
  ArrowBigUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CornerDownLeft,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

// Keys whose legend is a symbol on a real keyboard get the icon. Keys whose
// legend is a word (Ctrl, Alt, Esc) stay as the word, because an Option glyph
// means nothing to someone on Windows.
const KEY_ICONS: Record<string, LucideIcon> = {
  up: ArrowUp,
  down: ArrowDown,
  left: ArrowLeft,
  right: ArrowRight,
  shift: ArrowBigUp,
  enter: CornerDownLeft,
};

interface KbdProps {
  /** One chord. "Ctrl+Shift+Z" renders three chips. */
  keys: string;
  /** Inverted sits on the tooltip's bone surface, which is theme-constant. */
  tone?: "default" | "inverted";
  className?: string;
}

const ARROW_GROUP = [ArrowUp, ArrowDown, ArrowLeft, ArrowRight];

function Key({ token, tone }: { token: string; tone: "default" | "inverted" }) {
  const Icon: LucideIcon | undefined = KEY_ICONS[token.toLowerCase()];
  const className = cn(
    "inline-flex h-4.5 min-w-4.5 items-center justify-center rounded px-1 font-mono text-[10px] leading-none",
    tone === "inverted"
      ? "bg-black/12 text-background"
      : "border border-border bg-bg-elevated text-text-secondary",
  );

  // One chip for all four arrow keys, so "Alt + arrows" does not need four
  // separate chords and four copies of the modifier.
  if (token.toLowerCase() === "arrows") {
    return (
      <kbd data-slot="kbd" className={cn(className, "gap-0.5 px-1.5")}>
        {ARROW_GROUP.map((Arrow, i) => (
          <Arrow key={i} aria-hidden="true" className="size-3" />
        ))}
        <span className="sr-only">any arrow key</span>
      </kbd>
    );
  }

  if (Icon === undefined) {
    return (
      <kbd data-slot="kbd" className={className}>
        {token}
      </kbd>
    );
  }

  return (
    <kbd data-slot="kbd" className={className}>
      <Icon aria-hidden="true" className="size-3" />
      <span className="sr-only">{token}</span>
    </kbd>
  );
}

/** The one way a keyboard shortcut is drawn anywhere in the app. */
export function Kbd({ keys, tone = "default", className }: KbdProps) {
  const tokens = keys.split("+").map((t) => t.trim()).filter(Boolean);

  return (
    <span className={cn("inline-flex shrink-0 items-center gap-0.5", className)}>
      {tokens.map((token, i) => (
        <React.Fragment key={`${token}-${i}`}>
          {i > 0 && (
            <span
              aria-hidden="true"
              className={cn(
                "text-[9px]",
                tone === "inverted" ? "text-background/50" : "text-text-muted",
              )}
            >
              +
            </span>
          )}
          <Key token={token} tone={tone} />
        </React.Fragment>
      ))}
    </span>
  );
}

/** A run of keys, as in "1 through 9". The gap is an icon, never an ellipsis. */
export function KbdRange({ from, to, tone = "default" }: { from: string; to: string; tone?: "default" | "inverted" }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      <Kbd keys={from} tone={tone} />
      <MoreHorizontal
        aria-label="through"
        role="img"
        className={cn("size-3", tone === "inverted" ? "text-background/50" : "text-text-muted")}
      />
      <Kbd keys={to} tone={tone} />
    </span>
  );
}
