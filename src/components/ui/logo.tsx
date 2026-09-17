import { cn } from "@/lib/utils";

/**
 * The VoxBrush mark: a voxel whose top face is a painted 2x2 board, sitting on
 * the depth that board extrudes into. Decorative by default, because it always
 * sits beside a label or inside a button that carries its own name.
 * Keep it in step with public/logo.svg and public/favicon.svg.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={cn("size-full", className)}
    >
      <path d="M16 4 22 7.5 16 11 10 7.5Z" fill="#ffc7ad" />
      <path d="M22 7.5 28 11 22 14.5 16 11Z" fill="#ff8256" />
      <path d="M16 11 22 14.5 16 18 10 14.5Z" fill="#ffc7ad" />
      <path d="M10 7.5 16 11 10 14.5 4 11Z" fill="#ff8256" />
      <path d="M4 11 16 18 16 28 4 21Z" fill="#8f2a15" />
      <path d="M28 11 16 18 16 28 28 21Z" fill="#e84f28" />
    </svg>
  );
}
