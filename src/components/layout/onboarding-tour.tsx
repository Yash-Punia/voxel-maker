import { useEffect, useState } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

interface Step {
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    title: 'Welcome to Voxel Studio',
    body: 'A quick 6-step tour of the workspace. Takes 30 seconds. You can skip any time.',
  },
  {
    title: 'Paint in 2D (left panel)',
    body: 'Pick a shape + color, click or drag. Each grid cell can be a different shape — not just a square. The 3D preview updates live.',
  },
  {
    title: 'Palette — click and double-click',
    body: 'Single-click any colour to activate it. Double-click to overwrite the slot with your currently active colour. Import Lospec palettes or pick from 5 built-ins via the ··· menu.',
  },
  {
    title: 'Paint depth (middle panel)',
    body: 'Paint per-cell depth values. Higher depth = more extrusion in 3D. Use auto-depth (Luma / Palette / Noise) to generate depths from your colours automatically.',
  },
  {
    title: '3D preview (right panel)',
    body: 'Your model in 3D. Drag to orbit, scroll to zoom, right-drag to pan. Toggle Flat / Shaded and Ortho / Persp in the header. Click Export to save as .obj / .glb / .stl / .gif / .svg + many more.',
  },
  {
    title: 'Shortcuts + samples',
    body: 'Press ? any time for the full keyboard reference. Try a ready-made project from the Samples button. Happy voxeling.',
  },
];

interface OnboardingTourProps {
  onClose: () => void;
}

export function OnboardingTour({ onClose }: OnboardingTourProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setStep((s) => Math.min(STEPS.length - 1, s + 1));
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(0, s - 1));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-300"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-bg-secondary border border-border rounded-md shadow-app p-6 min-w-110 max-w-130 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="label-title text-text-primary">{current.title}</div>
          <button
            className="btn btn-icon"
            onClick={onClose}
            title="Skip tour"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="text-xs text-text-secondary leading-relaxed">{current.body}</div>

        <div className="flex items-center gap-1 mt-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-accent' : 'bg-bg-tertiary'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            className="btn text-xs"
            onClick={onClose}
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            <button
              className="btn text-xs inline-flex items-center gap-1"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={isFirst}
            >
              <ChevronLeft className="size-3.5" /> Back
            </button>
            {isLast ? (
              <button className="btn btn-primary text-xs" onClick={onClose}>
                Get started
              </button>
            ) : (
              <button
                className="btn btn-primary text-xs inline-flex items-center gap-1"
                onClick={() => setStep((s) => s + 1)}
              >
                Next <ChevronRight className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="text-[10px] text-text-muted text-center flex items-center justify-center gap-1.5">
          Step {step + 1} of {STEPS.length}
          <span className="opacity-60">·</span>
          <ChevronLeft className="size-3" />
          <ChevronRight className="size-3" />
          <span>to navigate</span>
        </div>
      </div>
    </div>
  );
}

