// Shapes shared by the assistant: what a provider is, what a turn looks like,
// and what a tool is. Nothing here imports a provider SDK.

export type ProviderId = 'anthropic' | 'openai-compatible';

export interface AiSettings {
  provider: ProviderId;
  model: string;
  apiKey: string;
  /** OpenAI-compatible only. The root the client appends /chat/completions to. */
  baseUrl: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  id: string;
  name: string;
  output: string;
  isError: boolean;
}

/**
 * One entry in the transcript. The same array is what the UI renders and what
 * gets replayed to the provider, so the two can never drift apart.
 */
export type AgentTurn =
  | { role: 'user'; text: string }
  | {
      role: 'assistant';
      text: string;
      toolCalls: ToolCall[];
      /** Provider-native content blocks, replayed verbatim when the provider
       *  needs its own reasoning blocks back unchanged. */
      raw?: unknown;
      /** Undo depth right after this turn, used to offer a one-click revert
       *  while nothing else has touched the board since. */
      undoLevel?: number;
      pending?: boolean;
    }
  | { role: 'tool'; results: ToolResult[] };

export interface ToolSpec {
  name: string;
  description: string;
  schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties: false;
  };
  /** Mutating tools make the agent take an undo snapshot before the first one. */
  mutates: boolean;
  run: (input: Record<string, unknown>) => string;
}

export type StreamEvent =
  | { type: 'text'; delta: string }
  | { type: 'thinking'; delta: string };

export interface ProviderRequest {
  system: string;
  turns: AgentTurn[];
  tools: ToolSpec[];
  model: string;
  signal: AbortSignal;
  onEvent: (event: StreamEvent) => void;
}

export interface ProviderReply {
  text: string;
  toolCalls: ToolCall[];
  raw?: unknown;
  stopReason: 'end' | 'tool_use' | 'max_tokens' | 'refusal';
}

export interface ChatProvider {
  send: (request: ProviderRequest) => Promise<ProviderReply>;
}
