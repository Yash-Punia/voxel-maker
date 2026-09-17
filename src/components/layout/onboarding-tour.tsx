import { useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Layers, Box, Download, Wand2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Logo } from '@/components/ui/logo';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Step {
  title: string;
  body: string;
  /** The welcome step shows the product mark instead of an icon. */
  Icon?: LucideIcon;
}

const STEPS: Step[] = [
  {
    title: 'Welcome to VoxBrush',
    body: 'You draw a flat board, give each cell a depth, and the 3D model builds itself. Four modes, one at a time, along the bottom of the screen.',
  },
  {
    Icon: Pencil,
    title: 'Draw',
    body: 'Shapes sit on the left rail, colours on the right, tools across the top. Every cell can hold a different shape, not only a square. Press R to rotate the one you are holding.',
  },
  {
    Icon: Layers,
    title: 'Depth',
    body: 'Give each painted cell a thickness with the number chips on the right, or press 0 to 9. Auto depth writes the whole board for you from the artwork.',
  },
  {
    Icon: Box,
    title: 'Model',
    body: 'Drag to orbit, scroll to zoom. The small preview in the corner stays live in every mode, so you never lose sight of the model while you paint.',
  },
  {
    Icon: Wand2,
    title: 'Ask instead of drawing',
    body: 'The assistant can paint, set depth, swap palettes and resize the board for you. Bring your own API key, press Ctrl+K, and say what you want. Everything it does is one Ctrl+Z away.',
  },
  {
    Icon: Download,
    title: 'Export',
    body: 'OBJ, GLB, STL, MagicaVoxel, Minecraft, SVG, PNG and a turntable GIF. Pick the type, pick the format, hit export.',
  },
];

interface OnboardingTourProps {
  open: boolean;
  onClose: () => void;
}

export function OnboardingTour({ open, onClose }: OnboardingTourProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md" showClose={false}>
        <DialogHeader className="pr-5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
              {current.Icon ? <current.Icon className="size-4" /> : <Logo className="size-5" />}
            </span>
            <DialogTitle>{current.title}</DialogTitle>
          </div>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-4">
          <DialogDescription>{current.body}</DialogDescription>
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors duration-200',
                  i <= step ? 'bg-accent' : 'bg-bg-hover',
                )}
              />
            ))}
          </div>
        </DialogBody>

        <DialogFooter className="justify-between">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Skip
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ChevronLeft className="size-3.5" />
              Back
            </button>
            {isLast ? (
              <button type="button" autoFocus className="btn btn-primary" onClick={onClose}>
                Start drawing
              </button>
            ) : (
              <button
                type="button"
                autoFocus
                className="btn btn-primary"
                onClick={() => setStep((s) => s + 1)}
              >
                Next
                <ChevronRight className="size-3.5" />
              </button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
