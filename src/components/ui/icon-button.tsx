import * as React from "react";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/kbd";

interface IconButtonProps extends React.ComponentProps<"button"> {
  /** Accessible name and tooltip copy. Keep it under ~60 characters. */
  label: string;
  shortcut?: string;
  active?: boolean;
  side?: React.ComponentProps<typeof TooltipContent>["side"];
  size?: "default" | "sm";
}

/** Icon-only control. Every one carries a tooltip, so the rails can stay
 *  wordless without the user having to guess what a glyph does. */
export function IconButton({
  label,
  shortcut,
  active,
  side = "bottom",
  size = "default",
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={active}
          className={cn("icon-btn", size === "sm" && "icon-btn-sm", active && "active", className)}
          {...props}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side={side}>
        {label}
        {shortcut && <Kbd keys={shortcut} tone="inverted" className="ml-1" />}
      </TooltipContent>
    </Tooltip>
  );
}
