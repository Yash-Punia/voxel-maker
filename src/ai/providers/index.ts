import type { AiSettings, ChatProvider, ProviderId } from '../types';
import { createAnthropicProvider } from './anthropic';
import { createOpenAiCompatibleProvider } from './openai-compatible';

export interface ProviderPreset {
  id: ProviderId;
  label: string;
  /** Prefilled when the person picks this provider. */
  baseUrl: string;
  defaultModel: string;
  models: string[];
  keyHint: string;
  docsLabel: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    baseUrl: '',
    defaultModel: 'claude-opus-5',
    models: ['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5', 'claude-fable-5-1'],
    keyHint: 'sk-ant-…',
    docsLabel: 'console.anthropic.com',
  },
  {
    id: 'openai-compatible',
    label: 'OpenAI-compatible',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-5',
    models: [],
    keyHint: 'sk-…',
    docsLabel: 'OpenAI, OpenRouter, Groq, Ollama, LM Studio',
  },
];

export function presetFor(id: ProviderId): ProviderPreset {
  return PROVIDER_PRESETS.find((p) => p.id === id) ?? PROVIDER_PRESETS[0];
}

/** A provider needs a key, except for a local server that does not check one. */
export function isConfigured(settings: AiSettings): boolean {
  if (!settings.model.trim()) return false;
  if (settings.provider === 'anthropic') return settings.apiKey.trim().length > 0;
  return settings.baseUrl.trim().length > 0;
}

export function createProvider(settings: AiSettings): ChatProvider {
  if (settings.provider === 'anthropic') {
    return createAnthropicProvider(settings.apiKey.trim());
  }
  return createOpenAiCompatibleProvider(settings.apiKey.trim(), settings.baseUrl);
}
