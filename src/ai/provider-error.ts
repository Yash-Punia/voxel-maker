// Providers report failures in their own shapes and their own words. This turns
// any of them into one sentence a person can act on, keeps the raw body for
// when that sentence is not enough, and says what the panel should offer next.

export type ErrorAction = 'settings' | 'retry' | null;

export interface FriendlyError {
  message: string;
  /** The provider's own words, shown only when the user asks for them. */
  detail?: string;
  action: ErrorAction;
}

export class ProviderError extends Error {
  readonly detail?: string;
  readonly action: ErrorAction;

  constructor({ message, detail, action }: FriendlyError) {
    super(message);
    this.name = 'ProviderError';
    this.detail = detail;
    this.action = action;
  }
}

/** Digs the human-readable part out of whatever the provider returned. */
export function extractProviderMessage(body: string): string | undefined {
  const trimmed = body.trim();
  if (!trimmed) return undefined;

  try {
    let parsed: unknown = JSON.parse(trimmed);
    // Google wraps its error body in an array.
    if (Array.isArray(parsed)) parsed = parsed[0];
    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>;
      const nested = record.error;
      if (nested && typeof nested === 'object') {
        const message = (nested as Record<string, unknown>).message;
        if (typeof message === 'string') return message;
      }
      if (typeof nested === 'string') return nested;
      if (typeof record.message === 'string') return record.message;
      if (typeof record.detail === 'string') return record.detail;
    }
  } catch {
    // Not JSON. Fall through to the raw text.
  }

  return trimmed.slice(0, 300);
}

const AUTH_WORDS = /api[- ]?key|unauthenticated|unauthorized|invalid.*credential|authentication/i;

export function describeHttpFailure(status: number, body: string): FriendlyError {
  const detail = extractProviderMessage(body);

  // Not every provider uses 401 for a bad key. Google answers 400 with
  // "Please pass a valid API key", so the words decide when the status does not.
  if (status === 400 && detail && AUTH_WORDS.test(detail)) {
    return {
      message: 'The provider rejected that API key. Check it in the assistant settings.',
      detail,
      action: 'settings',
    };
  }

  if (status === 401 || status === 403) {
    return {
      message: 'The provider rejected that API key. Check it in the assistant settings.',
      detail,
      action: 'settings',
    };
  }
  if (status === 404) {
    return {
      message: 'The provider has no such model or endpoint. Check the model name and the base URL.',
      detail,
      action: 'settings',
    };
  }
  if (status === 429) {
    return {
      message: 'Rate limited by the provider. Wait a moment and try again, or switch to a smaller model.',
      detail,
      action: 'retry',
    };
  }
  if (status === 402) {
    return {
      message: 'The provider says this account is out of credit.',
      detail,
      action: 'settings',
    };
  }
  if (status >= 500) {
    return {
      message: 'The provider had a server error. That one is on their side, so try again.',
      detail,
      action: 'retry',
    };
  }
  if (status === 400) {
    return {
      message: 'The provider refused the request. This is usually a model name it does not know, or a model that cannot call tools.',
      detail,
      action: 'settings',
    };
  }

  return {
    message: `The provider returned an error (${status}).`,
    detail,
    action: 'retry',
  };
}
