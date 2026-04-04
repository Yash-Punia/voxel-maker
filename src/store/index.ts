import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createGridSlice, type GridSlice } from './gridSlice';
import { createToolSlice, type ToolSlice } from './toolSlice';
import { createHistorySlice, type HistorySlice } from './historySlice';

export type StoreState = GridSlice & ToolSlice & HistorySlice;

export const useStore = create<StoreState>()(
  immer((set, get) => ({
    ...createGridSlice(set),
    ...createToolSlice(set),
    ...createHistorySlice(set, get),
  }))
);
