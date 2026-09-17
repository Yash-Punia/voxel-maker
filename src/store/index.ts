import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createGridSlice, type GridSlice } from './grid-slice';
import { createAssetSlice, type AssetSlice } from './asset-slice';
import { createToolSlice, type ToolSlice } from './tool-slice';
import { createHistorySlice, type HistorySlice } from './history-slice';
import { createChatSlice, type ChatSlice } from './chat-slice';

export type StoreState = GridSlice & AssetSlice & ToolSlice & HistorySlice & ChatSlice;

export const useStore = create<StoreState>()(
  immer((...a) => ({
    ...createGridSlice(...a),
    ...createAssetSlice(...a),
    ...createToolSlice(...a),
    ...createHistorySlice(...a),
    ...createChatSlice(...a),
  }))
);
