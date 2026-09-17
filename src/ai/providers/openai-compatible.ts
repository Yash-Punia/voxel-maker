// Any endpoint that speaks the OpenAI chat-completions shape: OpenAI itself,
// OpenRouter, Groq, Together, a local Ollama or LM Studio server. Raw fetch,
// because one streaming POST does not earn an SDK dependency.

import type {
  AgentTurn,
  ChatProvider,
  ProviderReply,
  ProviderRequest,
  ToolCall,
} from '../types';
import { describeHttpFailure, ProviderError } from '../provider-error';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
}

function toMessages(system: string, turns: AgentTurn[]): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: 'system', content: system }];

  for (const turn of turns) {
    if (turn.role === 'user') {
      messages.push({ role: 'user', content: turn.text });
      continue;
    }

    if (turn.role === 'assistant') {
      if (!turn.text.trim() && turn.toolCalls.length === 0) continue;
      messages.push({
        role: 'assistant',
        content: turn.text || null,
        ...(turn.toolCalls.length > 0 && {
          tool_calls: turn.toolCalls.map((call) => ({
            id: call.id,
            type: 'function' as const,
            function: { name: call.name, arguments: JSON.stringify(call.input) },
          })),
        }),
      });
      continue;
    }

    // This dialect wants one message per result, not one message holding them all.
    for (const result of turn.results) {
      messages.push({ role: 'tool', tool_call_id: result.id, content: result.output });
    }
  }

  return messages;
}

function parseArguments(raw: string, toolName: string): Record<string, unknown> {
  if (!raw.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    throw new ProviderError({
      message: `The arguments for ${toolName} could not be read as JSON.`,
      detail: raw.slice(0, 400),
      action: 'retry',
    });
  }
}

export function createOpenAiCompatibleProvider(apiKey: string, baseUrl: string): ChatProvider {
  return {
    async send({ system, turns, tools, model, signal, onEvent }: ProviderRequest): Promise<ProviderReply> {
      const root = baseUrl.trim().replace(/\/+$/, '');
      const endpoint = `${root}/chat/completions`;

      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          signal,
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({
            model,
            stream: true,
            messages: toMessages(system, turns),
            tools: tools.map((tool) => ({
              type: 'function',
              function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.schema,
              },
            })),
          }),
        });
      } catch (error) {
        if (signal.aborted) throw error;
        // A browser reports a refused connection and a blocked origin the same
        // way, so the message has to cover both.
        throw new ProviderError({
          message: 'Could not reach the provider. Check the base URL, and that the server allows requests from this page.',
          detail: endpoint,
          action: 'settings',
        });
      }

      if (!response.ok || !response.body) {
        const body = await response.text().catch(() => '');
        throw new ProviderError(describeHttpFailure(response.status, body));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let text = '';
      let finishReason = '';
      // Two dialects share this endpoint shape. OpenAI streams one tool call as
      // fragments across chunks, keyed by `index`, with the id only on the
      // first. Google sends each tool call complete in its own chunk, with a
      // fresh id and no `index` at all. Keying on the id when there is one, and
      // on the index otherwise, reads both without concatenating separate calls
      // into a single unparseable string.
      interface PartialCall { id: string; name: string; args: string }
      const byId = new Map<string, PartialCall>();
      const byIndex = new Map<number, PartialCall>();
      const calls: PartialCall[] = [];

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') continue;

          let chunk: {
            choices?: {
              delta?: {
                content?: string | null;
                tool_calls?: {
                  /** Absent on providers that send one complete call per chunk. */
                  index?: number;
                  id?: string;
                  function?: { name?: string; arguments?: string };
                }[];
              };
              finish_reason?: string | null;
            }[];
            error?: { message?: string };
          };
          try {
            chunk = JSON.parse(payload);
          } catch {
            continue;
          }

          // Some providers stream an error object instead of failing the request.
          if (chunk.error) {
            throw new ProviderError({
              message: 'The provider stopped partway through the response.',
              detail: chunk.error.message,
              action: 'retry',
            });
          }

          const choice = chunk.choices?.[0];
          if (!choice) continue;
          if (choice.finish_reason) finishReason = choice.finish_reason;

          const delta = choice.delta;
          if (delta?.content) {
            text += delta.content;
            onEvent({ type: 'text', delta: delta.content });
          }

          for (const call of delta?.tool_calls ?? []) {
            const slot = call.index ?? 0;
            let entry = call.id ? byId.get(call.id) : byIndex.get(slot);

            if (!entry) {
              entry = { id: call.id ?? '', name: '', args: '' };
              calls.push(entry);
              byIndex.set(slot, entry);
              if (call.id) byId.set(call.id, entry);
            }

            const name = call.function?.name;
            if (name && !entry.name) entry.name = name;
            else if (name && !entry.name.endsWith(name)) entry.name += name;

            if (call.function?.arguments) entry.args += call.function.arguments;
          }
        }
      }

      // Arrival order, because a provider that omits `index` gives nothing to
      // sort by.
      const toolCalls: ToolCall[] = calls
        .filter((entry) => entry.name)
        .map((entry, i) => ({
          id: entry.id || `call_${i}`,
          name: entry.name,
          input: parseArguments(entry.args, entry.name),
        }));

      return {
        text,
        toolCalls,
        stopReason:
          toolCalls.length > 0 ? 'tool_use' : finishReason === 'length' ? 'max_tokens' : 'end',
      };
    },
  };
}
