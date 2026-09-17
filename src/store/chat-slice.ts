import type { StateCreator } from 'zustand';
import type { AgentTurn, AiSettings, ToolCall, ToolResult } from '../ai/types';
import type { FriendlyError } from '../ai/provider-error';
import { loadAiSettings, saveAiSettings } from '../core/ai-settings-storage';
import type { StoreState } from './index';

export interface ChatSlice {
  chatOpen: boolean;
  chatTurns: AgentTurn[];
  chatRunning: boolean;
  chatError: FriendlyError | null;
  aiSettings: AiSettings;
  setChatOpen: (open: boolean) => void;
  toggleChat: () => void;
  setAiSettings: (patch: Partial<AiSettings>) => void;
  appendUserTurn: (text: string) => void;
  appendPendingAssistant: () => void;
  appendAssistantText: (delta: string) => void;
  finishAssistantTurn: (turn: { text: string; toolCalls: ToolCall[]; raw?: unknown }) => void;
  settlePendingAssistant: () => void;
  appendToolTurn: (results: ToolResult[]) => void;
  markUndoLevel: (level: number) => void;
  setChatRunning: (running: boolean) => void;
  setChatError: (error: FriendlyError | null) => void;
  /** Drops the failed exchange and hands back the question, so a retry does
   *  not leave the same message in the transcript twice. */
  takeLastQuestion: () => string | null;
  clearChat: () => void;
}

export const createChatSlice: StateCreator<
  StoreState,
  [['zustand/immer', never]],
  [],
  ChatSlice
> = (set, get) => ({
  chatOpen: false,
  chatTurns: [],
  chatRunning: false,
  chatError: null,
  aiSettings: loadAiSettings(),

  setChatOpen: (open) => set((state: ChatSlice) => { state.chatOpen = open; }),
  toggleChat: () => set((state: ChatSlice) => { state.chatOpen = !state.chatOpen; }),

  setAiSettings: (patch) =>
    set((state: ChatSlice) => {
      state.aiSettings = { ...state.aiSettings, ...patch };
      saveAiSettings(state.aiSettings);
    }),

  appendUserTurn: (text) =>
    set((state: ChatSlice) => {
      state.chatTurns.push({ role: 'user', text });
    }),

  appendPendingAssistant: () =>
    set((state: ChatSlice) => {
      state.chatTurns.push({ role: 'assistant', text: '', toolCalls: [], pending: true });
    }),

  appendAssistantText: (delta) =>
    set((state: ChatSlice) => {
      const last = state.chatTurns[state.chatTurns.length - 1];
      if (last?.role === 'assistant') last.text += delta;
    }),

  finishAssistantTurn: ({ text, toolCalls, raw }) =>
    set((state: ChatSlice) => {
      const last = state.chatTurns[state.chatTurns.length - 1];
      if (last?.role !== 'assistant') return;
      last.text = text;
      last.toolCalls = toolCalls;
      last.raw = raw;
      last.pending = false;
    }),

  // A request that fails or is stopped mid-stream leaves a turn marked
  // pending. Settling it stops the typing indicator from spinning forever.
  settlePendingAssistant: () =>
    set((state: ChatSlice) => {
      const last = state.chatTurns[state.chatTurns.length - 1];
      if (last?.role !== 'assistant' || !last.pending) return;
      last.pending = false;
      if (!last.text && last.toolCalls.length === 0) state.chatTurns.pop();
    }),

  appendToolTurn: (results) =>
    set((state: ChatSlice) => {
      state.chatTurns.push({ role: 'tool', results });
    }),

  // Recorded on the last assistant turn so the UI can offer a revert while
  // nothing else has touched the board since the assistant did.
  markUndoLevel: (level) =>
    set((state: ChatSlice) => {
      for (let i = state.chatTurns.length - 1; i >= 0; i--) {
        const turn = state.chatTurns[i];
        if (turn.role === 'assistant') {
          turn.undoLevel = level;
          return;
        }
      }
    }),

  setChatRunning: (running) => set((state: ChatSlice) => { state.chatRunning = running; }),
  setChatError: (error) => set((state: ChatSlice) => { state.chatError = error; }),

  takeLastQuestion: () => {
    const turns = get().chatTurns;
    for (let i = turns.length - 1; i >= 0; i--) {
      const turn = turns[i];
      if (turn.role !== 'user') continue;
      const text = turn.text;
      set((state: ChatSlice) => {
        state.chatTurns = state.chatTurns.slice(0, i);
        state.chatError = null;
      });
      return text;
    }
    return null;
  },

  clearChat: () =>
    set((state: ChatSlice) => {
      state.chatTurns = [];
      state.chatError = null;
    }),
});
