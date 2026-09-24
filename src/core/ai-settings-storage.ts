// The assistant runs entirely in the browser against the person's own key, so
// the key lives in their localStorage and never leaves for anywhere but the
// provider they chose. The UI says so next to the field.

import type { AiSettings } from '../ai/types';

const KEY = 'vxs:ai-settings:v1';

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: 'anthropic',
  model: 'claude-opus-5',
  apiKey: '',
  baseUrl: '',
};

export function loadAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AiSettings>;
    return {
      provider: parsed.provider === 'openai-compatible' ? 'openai-compatible' : 'anthropic',
      model: typeof parsed.model === 'string' ? parsed.model : DEFAULT_AI_SETTINGS.model,
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : '',
    };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export function saveAiSettings(settings: AiSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Private windows and blocked site data both throw. The assistant still
    // works for this session, it just will not remember the key.
  }
}

export function clearAiSettings(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to do if storage is unavailable.
  }
}
