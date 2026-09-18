import { describe, expect, it } from 'vitest';

import { describeHttpFailure, extractProviderMessage } from './provider-error';

// The rule is that a provider's error body never reaches the user. Every shape
// below is one a real provider actually sends, and the failure mode is the same
// every time: raw JSON in the panel, or a blank message that says nothing.

describe('extractProviderMessage', () => {
  it('reads the OpenAI and Anthropic shape', () => {
    expect(extractProviderMessage('{"error":{"message":"Incorrect API key"}}')).toBe('Incorrect API key');
  });

  it('reads the Google shape, which arrives wrapped in an array', () => {
    const body = '[{"error":{"code":400,"message":"API key not valid"}}]';
    expect(extractProviderMessage(body)).toBe('API key not valid');
  });

  it('reads a plain error string', () => {
    expect(extractProviderMessage('{"error":"nope"}')).toBe('nope');
  });

  it('falls back to message and then detail', () => {
    expect(extractProviderMessage('{"message":"too many tokens"}')).toBe('too many tokens');
    expect(extractProviderMessage('{"detail":"model is loading"}')).toBe('model is loading');
  });

  it('returns undefined for an empty body rather than an empty string', () => {
    expect(extractProviderMessage('')).toBeUndefined();
    expect(extractProviderMessage('   ')).toBeUndefined();
  });

  it('passes non-JSON through, which is what a proxy or gateway returns', () => {
    expect(extractProviderMessage('502 Bad Gateway')).toBe('502 Bad Gateway');
  });

  it('caps the length, so an HTML error page cannot flood the panel', () => {
    const huge = '<html>' + 'x'.repeat(5000) + '</html>';
    expect(extractProviderMessage(huge)!.length).toBeLessThanOrEqual(300);
  });

  it('does not throw on JSON of an unexpected shape', () => {
    expect(() => extractProviderMessage('{"error":{"code":400}}')).not.toThrow();
    expect(() => extractProviderMessage('[]')).not.toThrow();
    expect(() => extractProviderMessage('null')).not.toThrow();
    expect(() => extractProviderMessage('42')).not.toThrow();
  });
});

describe('describeHttpFailure', () => {
  it('sends a rejected key to the settings', () => {
    for (const status of [401, 403]) {
      const result = describeHttpFailure(status, '{"error":{"message":"bad key"}}');
      expect(result.action).toBe('settings');
      expect(result.message).toContain('API key');
    }
  });

  it('catches the 400 that Google uses for a bad key, by its words', () => {
    // Not every provider uses 401. Reading the status alone would send this
    // person to "try again" forever.
    const result = describeHttpFailure(400, '[{"error":{"message":"Please pass a valid API key"}}]');
    expect(result.action).toBe('settings');
    expect(result.message).toContain('API key');
  });

  it('does not treat every 400 as an auth problem', () => {
    const result = describeHttpFailure(400, '{"error":{"message":"temperature must be <= 2"}}');
    expect(result.message).not.toContain('API key');
  });

  it('offers a retry on a rate limit', () => {
    expect(describeHttpFailure(429, '').action).toBe('retry');
  });

  it('sends a missing model to the settings', () => {
    expect(describeHttpFailure(404, '').action).toBe('settings');
  });

  it('names credit on a 402', () => {
    expect(describeHttpFailure(402, '').message).toContain('credit');
  });

  it('always returns a sentence, whatever the status', () => {
    for (const status of [400, 402, 404, 418, 429, 500, 502, 503, 0]) {
      const result = describeHttpFailure(status, '');
      expect(result.message.length).toBeGreaterThan(10);
      expect(result.message).not.toContain('{');
    }
  });

  it("keeps the provider's own words in detail, not in the message", () => {
    const result = describeHttpFailure(401, '{"error":{"message":"Incorrect API key provided: sk-abc"}}');
    expect(result.detail).toContain('Incorrect API key provided');
    expect(result.message).not.toContain('sk-abc');
  });
});
