import { useStore } from '../../store';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';

const QUICK_DEPTHS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Right rail in depth mode. Ten one-key depths on chips, and a field for the
 *  rest of the 0-32 range. */
export function DepthRail() {
  const activeDepth = useStore((s) => s.activeDepth);
  const setActiveDepth = useStore((s) => s.setActiveDepth);

  return (
    <div className="rail rail-v gap-1 p-1.5">
      {QUICK_DEPTHS.map((depth) => (
        <Tooltip key={depth}>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={depth === 0 ? 'Depth 0, suppress cell' : `Depth ${depth}`}
              aria-pressed={activeDepth === depth}
              className={cn('chip', activeDepth === depth && 'active')}
              onClick={() => setActiveDepth(depth)}
            >
              {depth}
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {depth === 0 ? 'Suppress cell' : `${depth} units deep`}
            <Kbd keys={String(depth)} tone="inverted" className="ml-1" />
          </TooltipContent>
        </Tooltip>
      ))}

      <div className="rail-sep-v" />

      <Tooltip>
        <TooltipTrigger asChild>
          <input
            type="number"
            aria-label="Brush depth"
            className="field field-mono h-7 w-9 px-0 text-center"
            value={activeDepth}
            min={0}
            max={32}
            onChange={(e) => setActiveDepth(parseInt(e.target.value) || 0)}
          />
        </TooltipTrigger>
        <TooltipContent side="left">Exact depth, 0 to 32</TooltipContent>
      </Tooltip>
    </div>
  );
}
