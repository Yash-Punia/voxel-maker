import { useEffect, useRef } from 'react';
import type { AppEvent } from '../core/app-events';

/** Subscribes to an app event for the life of the component. The handler is
 *  read through a ref, so a new closure every render does not resubscribe. */
export function useAppEvent(name: AppEvent, handler: () => void): void {
  const ref = useRef(handler);

  useEffect(() => {
    ref.current = handler;
  }, [handler]);

  useEffect(() => {
    const listener = () => ref.current();
    document.addEventListener(name, listener);
    return () => document.removeEventListener(name, listener);
  }, [name]);
}
