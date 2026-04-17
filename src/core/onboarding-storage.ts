// Persistence helpers for the onboarding tour.
// Separated from the component so Fast Refresh stays happy.

const STORAGE_KEY = 'vxs-onboarding-seen';

export function shouldShowOnboarding(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'true';
  } catch {
    return false;
  }
}

export function markOnboardingSeen(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    /* ignore */
  }
}

export function resetOnboarding(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
