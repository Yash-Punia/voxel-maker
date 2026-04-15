import { useEffect } from 'react';
import { useStore } from '../store';

// Attaches a beforeunload listener that prompts the user when the project
// has unsaved changes (isDirty === true). Browsers show a generic confirm
// dialog — custom text is ignored by modern browsers for security reasons.

export function useDirtyState(): void {
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (useStore.getState().isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);
}
