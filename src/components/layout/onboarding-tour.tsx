import { useState } from 'react';
import { Blocks, ChevronLeft, ChevronRight, Film, Grid2x2, Pencil, Layers, Box, Download, Wand2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Logo } from '@/components/ui/logo';
import {
  AssistantArt, DepthArt, DrawArt, ExportArt, FramesArt, ModelArt, SceneArt, SetArt, WelcomeArt,
} from './onboarding-art';

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
  /** The drawing above the text. Every step has one: a tour that is nine
   *  paragraphs and an icon is one nobody reads to the end of. */
  Art: () => React.ReactElement;
}

const STEPS: Step[] = [
  {
    Art: WelcomeArt,
    title: 'Welcome to VoxBrush',
    body: 'You draw a flat board, give each cell a depth, and the 3D model builds itself. Four modes, one at a time, along the bottom of the screen.',
  },
  {
    Icon: Pencil,
    Art: DrawArt,
    title: 'Draw',
    body: 'Shapes sit on the left rail, colours on the right, tools across the top. Every cell can hold a different shape, not only a square. Press R to rotate the one you are holding.',
  },
  {
    Icon: Layers,
    Art: DepthArt,
    title: 'Depth',
    body: 'Give each painted cell a thickness with the number chips on the right, or press 0 to 9. Auto depth writes the whole board for you from the artwork.',
  },
  {
    Icon: Box,
    Art: ModelArt,
    title: 'Model',
    body: 'Drag to orbit, scroll to zoom. The small preview in the corner stays live in every mode, so you never lose sight of the model while you paint.',
  },
  {
    Icon: Grid2x2,
    Art: SetArt,
    title: 'One project, a whole set',
    body: 'The strip at the top holds every asset in the project, all sharing one palette. That shared palette is the point: it is what makes a set look like it belongs together instead of like a pile of unrelated props.',
  },
  {
    Icon: Film,
    Art: FramesArt,
    title: 'Frames',
    body: 'Each asset can hold animation frames, on the second strip. Comma and full stop step between them, P plays. Onion skin ghosts the frame before so you can draw a pose against the one it follows.',
  },
  {
    Icon: Blocks,
    Art: SceneArt,
    title: 'Scene',
    body: 'Arrange the assets you have drawn onto a ground plan. Click to place, click a placement to select it, right click to turn. A scene holds references, so editing an asset updates every scene it stands in, and the whole arrangement exports as one model or one sprite.',
  },
  {
    Icon: Wand2,
    Art: AssistantArt,
    title: 'Ask instead of drawing',
    body: 'The assistant can paint, set depth, build a whole set and make variants of what you already drew. It matches the colours, shapes and depths your project already uses, so what it adds fits what you made. Bring your own API key, press Ctrl+K, and say what you want. Everything it does is one Ctrl+Z away.',
  },
  {
    Icon: Download,
    Art: ExportArt,
    title: 'Export',
    body: 'OBJ, GLB, STL, MagicaVoxel, Minecraft, SVG and PNG, plus sprite sheets with normal maps for 2.5D and isometric games, and auto-tile sheets for terrain. Pick the type, pick the format, hit export.',
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
          <current.Art />
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
