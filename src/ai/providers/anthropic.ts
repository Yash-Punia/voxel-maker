// Anthropic provider, through the official SDK. The SDK is imported lazily so
// it only reaches the bundle of someone who actually opens the assistant.

import type Anthropic from '@anthropic-ai/sdk';
import type {
  AgentTurn,
  ChatProvider,
  ProviderReply,
  ProviderRequest,
  ToolCall,
} from '../types';
import { extractProviderMessage, ProviderError } from '../provider-error';

// Thinking is deliberately not configured. Omitting it runs adaptive thinking
// on the models that have it and no thinking on the ones that do not, which is
// the only setting that is correct for every model the picker offers.
const MAX_TOKENS = 32000;

function toMessages(turns: AgentTurn[]): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = [];

  for (const turn of turns) {
    if (turn.role === 'user') {
      messages.push({ role: 'user', content: turn.text });
      continue;
    }

    if (turn.role === 'assistant') {
      // Replay the provider's own blocks when we have them, so reasoning
      // blocks return unchanged alongside the tool calls they belong to.
      if (Array.isArray(turn.raw) && turn.raw.length > 0) {
        messages.push({ role: 'assistant', content: turn.raw as Anthropic.ContentBlockParam[] });
        continue;
      }
      const content: Anthropic.ContentBlockParam[] = [];
      if (turn.text.trim()) content.push({ type: 'text', text: turn.text });
      for (const call of turn.toolCalls) {
        content.push({ type: 'tool_use', id: call.id, name: call.name, input: call.input });
      }
      if (content.length > 0) messages.push({ role: 'assistant', content });
      continue;
    }

    messages.push({
      role: 'user',
      content: turn.results.map((result) => ({
        type: 'tool_result' as const,
        tool_use_id: result.id,
        content: result.output,
        is_error: result.isError,
      })),
    });
  }

  return messages;
}

export function createAnthropicProvider(apiKey: string): ChatProvider {
  return {
    async send({ system, turns, tools, model, signal, onEvent }: ProviderRequest): Promise<ProviderReply> {
      const { default: Client } = await import('@anthropic-ai/sdk');
      const client = new Client({
        apiKey,
        // The key belongs to the person using their own browser. Anthropic
        // still requires both of these before it will answer a browser origin.
        dangerouslyAllowBrowser: true,
        defaultHeaders: { 'anthropic-dangerous-direct-browser-access': 'true' },
      });

      const stream = client.messages.stream(
        {
          model,
          max_tokens: MAX_TOKENS,
          system,
          messages: toMessages(turns),
          tools: tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            input_schema: tool.schema as Anthropic.Tool.InputSchema,
          })),
        },
        { signal },
      );

      stream.on('text', (delta) => onEvent({ type: 'text', delta }));
      stream.on('thinking', (delta) => onEvent({ type: 'thinking', delta }));

      let final;
      try {
        final = await stream.finalMessage();
      } catch (error) {
        // Typed classes, not message matching: the three failures worth
        // explaining differently are a bad key, a rate limit, and the browser
        // not being able to reach the API at all.
        const detail = error instanceof Error ? extractProviderMessage(error.message) : undefined;
        if (error instanceof Client.AuthenticationError) {
          throw new ProviderError({
            message: 'Anthropic rejected that API key. Check it in the assistant settings.',
            detail,
            action: 'settings',
          });
        }
        if (error instanceof Client.RateLimitError) {
          throw new ProviderError({
            message: 'Rate limited by Anthropic. Wait a moment and try again, or switch to a smaller model.',
            detail,
            action: 'retry',
          });
        }
        if (error instanceof Client.NotFoundError) {
          throw new ProviderError({
            message: 'Anthropic has no such model. Check the model name in the assistant settings.',
            detail,
            action: 'settings',
          });
        }
        if (error instanceof Client.APIConnectionError) {
          throw new ProviderError({
            message: 'Could not reach the Anthropic API from this browser. Check the network and the key.',
            detail,
            action: 'retry',
          });
        }
        throw error;
      }

      let text = '';
      const toolCalls: ToolCall[] = [];
      for (const block of final.content) {
        if (block.type === 'text') text += block.text;
        else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            name: block.name,
            input: (block.input ?? {}) as Record<string, unknown>,
          });
        }
      }

      if (final.stop_reason === 'refusal') {
        return {
          text: text || final.stop_details?.explanation || 'The model declined this request.',
          toolCalls: [],
          raw: final.content,
          stopReason: 'refusal',
        };
      }

      return {
        text,
        toolCalls,
        raw: final.content,
        stopReason:
          final.stop_reason === 'tool_use'
            ? 'tool_use'
            : final.stop_reason === 'max_tokens'
              ? 'max_tokens'
              : 'end',
      };
    },
  };
}
