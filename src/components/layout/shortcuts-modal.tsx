import { Kbd, KbdRange } from '@/components/ui/kbd';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface ShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Shortcut {
  /** Alternatives for the same action, or the ends of a run when range is set. */
  keys: string[];
  desc: string;
  range?: boolean;
}

interface Section {
  title: string;
  items: Shortcut[];
}

const SECTIONS: Section[] = [
  {
    title: 'Workspace',
    items: [
      { keys: ['Ctrl+1', 'Ctrl+4'], range: true, desc: 'Draw, Depth, Model, Export' },
      { keys: ['Ctrl+K'], desc: 'Assistant panel' },
      { keys: ['Ctrl+S'], desc: 'Save' },
      { keys: ['Ctrl+Z'], desc: 'Undo' },
      { keys: ['Ctrl+Shift+Z', 'Ctrl+Y'], desc: 'Redo' },
      { keys: ['?'], desc: 'Open this reference' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { keys: ['B'], desc: 'Pencil' },
      { keys: ['E'], desc: 'Eraser' },
      { keys: ['F'], desc: 'Fill' },
      { keys: ['L'], desc: 'Line' },
      { keys: ['D'], desc: 'Eyedropper' },
      { keys: ['S'], desc: 'Rectangle select' },
      { keys: ['Esc'], desc: 'Clear the selection' },
    ],
  },
  {
    title: 'Canvas',
    items: [
      { keys: ['Scroll'], desc: 'Zoom around the pointer' },
      { keys: ['Space+drag', 'Middle+drag'], desc: 'Pan' },
      { keys: ['H'], desc: 'Fit the board, or frame the model in model mode' },
      { keys: ['G'], desc: 'Grid overlay' },
      { keys: ['['], desc: 'Zoom out' },
      { keys: [']'], desc: 'Zoom in' },
      { keys: ['Alt+Arrows'], desc: 'Shift the whole board' },
    ],
  },
  {
    title: 'Assets and frames',
    items: [
      { keys: [','], desc: 'Previous frame' },
      { keys: ['.'], desc: 'Next frame' },
      { keys: ['Shift+,'], desc: 'Previous asset' },
      { keys: ['Shift+.'], desc: 'Next asset' },
      { keys: ['P'], desc: 'Play or pause the animation' },
    ],
  },
  {
    title: 'Shapes and depth',
    items: [
      { keys: ['1', '9'], range: true, desc: 'Pick a shape in draw mode' },
      { keys: ['R'], desc: 'Rotate the active shape' },
      { keys: ['0', '9'], range: true, desc: 'Set the brush depth in depth mode' },
    ],
  },
  {
    title: 'Pencil modifiers',
    items: [
      { keys: ['Ctrl+click'], desc: 'Paint the shape, keep the colour' },
      { keys: ['Shift+click'], desc: 'Paint the colour, keep the shape' },
    ],
  },
];

export function ShortcutsModal({ open, onOpenChange }: ShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Number keys follow the mode you are in.</DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {SECTIONS.map((section) => (
              <div key={section.title} className="flex flex-col gap-2">
                <div className="label-section">{section.title}</div>
                <div className="flex flex-col gap-1.5">
                  {section.items.map((item) => (
                    <div key={item.desc} className="flex items-center justify-between gap-3">
                      <span className="min-w-0 flex-1 text-xs text-text-secondary">{item.desc}</span>
                      {item.range ? (
                        <KbdRange from={item.keys[0]} to={item.keys[1]} />
                      ) : (
                        <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
                          {item.keys.map((k) => (
                            <Kbd key={k} keys={k} />
                          ))}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
