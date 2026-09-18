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
  /** One sentence. Everything else is a point, because nine paragraphs is a
   *  tour people skip rather than read. */
  body: string;
  points: string[];
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
    body: 'You draw a flat board, give each cell a depth, and the 3D model builds itself.',
    points: [
      'Five modes along the bottom, one at a time',
      'Ctrl+1 to Ctrl+5 jumps straight to one',
      'Nothing you do here is destructive, Ctrl+Z takes it back',
    ],
  },
  {
    Icon: Pencil,
    Art: DrawArt,
    title: 'Draw',
    body: 'Paint the flat board. Shapes on the left, colours on the right.',
    points: [
      'A cell holds a shape, not just a colour',
      'R turns the shape you are holding',
      'B pencil, E eraser, F fill, S select',
    ],
  },
  {
    Icon: Layers,
    Art: DepthArt,
    title: 'Depth',
    body: 'Give each painted cell a thickness, and the extrusion follows.',
    points: [
      '0 to 9 sets the brush depth',
      'Higher means it sticks out further',
      'Auto depth writes the whole board from the artwork',
    ],
  },
  {
    Icon: Box,
    Art: ModelArt,
    title: 'Model',
    body: 'The built model, live, in every mode.',
    points: [
      'Drag to orbit, scroll to zoom',
      'H frames it again when you lose it',
      'The corner preview stays live while you paint',
    ],
  },
  {
    Icon: Grid2x2,
    Art: SetArt,
    title: 'One project, a whole set',
    body: 'A project holds many assets, and they all share one palette.',
    points: [
      'The strip at the top switches between them',
      'Shift+comma and Shift+full stop step through',
      'One palette is what makes a set look like a set',
    ],
  },
  {
    Icon: Film,
    Art: FramesArt,
    title: 'Frames',
    body: 'Every asset can hold animation frames.',
    points: [
      'Comma and full stop step, P plays',
      'Onion skin ghosts the frame before',
      'Frames export as sprite sheet rows or as a GIF',
    ],
  },
  {
    Icon: Blocks,
    Art: SceneArt,
    title: 'Scene',
    body: 'Arrange the assets you have drawn onto a ground plan.',
    points: [
      'Click to place, click a placement to select it',
      'Right click turns it',
      'Edit an asset and every scene it stands in updates',
    ],
  },
  {
    Icon: Wand2,
    Art: AssistantArt,
    title: 'Ask instead of drawing',
    body: 'The assistant paints, sets depth, builds sets and arranges scenes.',
    points: [
      'Ctrl+K opens it, bring your own API key',
      'It matches the colours and depths you already use',
      'A whole turn is one Ctrl+Z',
    ],
  },
  {
    Icon: Download,
    Art: ExportArt,
    title: 'Export',
    body: 'Fifteen formats, grouped by what you need.',
    points: [
      'OBJ, GLB, STL and friends for a 3D engine',
      'Sprite sheets with normal maps for 2.5D and isometric',
      'Auto-tile sheets for terrain',
    ],
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
          <ul className="flex flex-col gap-1.5">
            {current.points.map((point) => (
              <li key={point} className="flex items-start gap-2 text-xs leading-relaxed text-text-secondary">
                <span aria-hidden="true" className="mt-1.5 inline-block size-1 shrink-0 rounded-full bg-accent" />
                {point}
              </li>
            ))}
          </ul>
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
