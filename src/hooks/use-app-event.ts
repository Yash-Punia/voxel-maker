import { useEffect, useRef } from 'react';
import type { AppEvent } from '../core/app-events';

/** Subscribes to an app event for the life of the component. The handler is
 *  read through a ref, so a new closure every render does not resubscribe.
 *  Commands carry no payload, so most handlers take no argument. */
export function useAppEvent<T = void>(name: AppEvent, handler: (detail: T) => void): void {
  const ref = useRef(handler);

  useEffect(() => {
    ref.current = handler;
  }, [handler]);

  useEffect(() => {
    const listener = (event: Event) => ref.current((event as CustomEvent<T>).detail);
    document.addEventListener(name, listener);
    return () => document.removeEventListener(name, listener);
  }, [name]);
}
