import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Shown as a tooltip when the label alone does not explain the choice. */
  title?: string;
  disabled?: boolean;
}

interface SegmentedProps<T extends string> {
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  itemClassName?: string;
  "aria-label"?: string;
}

/** Row of mutually exclusive choices. Used anywhere a handful of options would
 *  otherwise become a dropdown the user has to open to read. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
  itemClassName,
  ...props
}: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={props["aria-label"]} className={cn("seg", className)}>
      {options.map((option) => {
        const item = (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            data-active={value === option.value}
            disabled={option.disabled}
            className={cn("seg-item", itemClassName)}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );

        if (!option.title) return item;

        return (
          <Tooltip key={option.value}>
            <TooltipTrigger asChild>{item}</TooltipTrigger>
            <TooltipContent>{option.title}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
