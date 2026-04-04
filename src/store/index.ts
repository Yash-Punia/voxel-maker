import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createGridSlice, type GridSlice } from './grid-slice';
import { createToolSlice, type ToolSlice } from './tool-slice';
import { createHistorySlice, type HistorySlice } from './history-slice';

export type StoreState = GridSlice & ToolSlice & HistorySlice;

export const useStore = create<StoreState>()(
  immer((set, get) => ({
    ...createGridSlice(set),
    ...createToolSlice(set),
    ...createHistorySlice(set, get),
  }))
);
