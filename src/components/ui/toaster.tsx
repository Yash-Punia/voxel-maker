import * as React from "react";
import { Toast as ToastPrimitive } from "radix-ui";
import { CircleAlert, TriangleAlert, X, type LucideIcon } from "lucide-react";

import { APP_EVENTS } from "@/core/app-events";
import type { ToastSpec, ToastTone } from "@/core/toast";
import { useAppEvent } from "@/hooks/use-app-event";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

const DURATION = 6000;

const TONE_ICON: Record<ToastTone, LucideIcon> = {
  error: CircleAlert,
  warning: TriangleAlert,
};

// The tone-to-colour map lives here and nowhere else. src/core/toast.ts returns
// a tone, never a class, so the pure layer stays free of Tailwind.
const TONE_COLOR: Record<ToastTone, string> = {
  error: "text-danger",
  warning: "text-warning",
};

interface QueuedToast extends ToastSpec {
  id: number;
}

let nextId = 0;

/** The one toaster for the app, mounted at the root. Anything that needs to
 *  report a failure emits through `toast` in src/core/toast.ts, so the pure
 *  modules can report one without reaching into React. */
export function Toaster() {
  const [queue, setQueue] = React.useState<QueuedToast[]>([]);

  useAppEvent<ToastSpec>(APP_EVENTS.toast, (spec) => {
    setQueue((prev) => [...prev, { ...spec, id: nextId++ }]);
  });

  const dismiss = (id: number) => setQueue((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastPrimitive.Provider duration={DURATION} swipeDirection="right">
      {queue.map(({ id, tone, title, description }) => {
        const Icon = TONE_ICON[tone];
        return (
          <ToastPrimitive.Root
            key={id}
            onOpenChange={(open) => !open && dismiss(id)}
            className="flex items-start gap-2.5 rounded-xl border border-border bg-bg-elevated p-3 shadow-app duration-150 data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-right-4 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x) data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform data-[swipe=end]:animate-out data-[swipe=end]:fade-out-0"
          >
            <Icon aria-hidden="true" className={cn("mt-px size-4 shrink-0", TONE_COLOR[tone])} />
            <div className="flex min-w-0 flex-col gap-0.5">
              <ToastPrimitive.Title className="text-xs font-medium text-text-primary">
                {title}
              </ToastPrimitive.Title>
              {description && (
                <ToastPrimitive.Description className="text-xs leading-relaxed text-text-secondary">
                  {description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close asChild>
              <IconButton label="Dismiss" size="sm" side="left" className="-my-0.5 -mr-1 ml-auto">
                <X aria-hidden="true" className="size-3.5" />
              </IconButton>
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        );
      })}
      <ToastPrimitive.Viewport className="fixed right-0 bottom-14 z-50 flex w-90 max-w-[calc(100vw-2rem)] flex-col gap-2 p-4 outline-hidden" />
    </ToastPrimitive.Provider>
  );
}
