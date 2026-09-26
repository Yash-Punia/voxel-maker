import { beforeEach, describe, expect, it } from 'vitest';

import { useStore } from './index';
import type { Snapshot } from '../types';

// Undo has to work across a set. A snapshot holds one board's maps, so replaying
// it on the wrong asset or the wrong frame silently overwrites work. These are
// the cases that made the first version throw the whole stack away on a switch.

const s = () => useStore.getState();

function paint(color: string) {
  const next = [...s().colorMap];
  next[0] = color;
  s().setColorMap(next);
}

function snapshot(): Snapshot {
  const now = s();
  return {
    colorMap: [...now.colorMap],
    depthMap: [...now.depthMap],
    shapeMap: [...now.shapeMap],
    rotationMap: [...now.rotationMap],
  };
}

beforeEach(() => {
  useStore.getState().resetAssets(4, 4);
  useStore.getState().clearHistory();
});

describe('undo and redo on one board', () => {
  it('puts back what was there before', () => {
    paint('#ff0000');
    s().pushSnapshot(snapshot());
    paint('#00ff00');

    s().undo();
    expect(s().colorMap[0]).toBe('#ff0000');
  });

  it('redo goes forward again', () => {
    paint('#ff0000');
    s().pushSnapshot(snapshot());
    paint('#00ff00');
    s().undo();
    s().redo();
    expect(s().colorMap[0]).toBe('#00ff00');
  });

  it('does nothing on an empty stack rather than throwing', () => {
    expect(() => s().undo()).not.toThrow();
    expect(() => s().redo()).not.toThrow();
  });

  it('a new edit drops the redo branch', () => {
    paint('#ff0000');
    s().pushSnapshot(snapshot());
    paint('#00ff00');
    s().undo();
    s().pushSnapshot(snapshot());
    expect(s().redoStack).toHaveLength(0);
  });
});

describe('undo across the set', () => {
  it('returns to the asset a snapshot belongs to', () => {
    paint('#ff0000');
    const first = s().activeAssetId;
    s().pushSnapshot(snapshot());
    paint('#00ff00');

    s().createAsset('second');
    // Undo now, from a different asset. It must go back to the first one rather
    // than painting the first one's board over the second.
    s().undo();
    expect(s().activeAssetId).toBe(first);
    expect(s().colorMap[0]).toBe('#ff0000');
  });

  it('survives a switch instead of losing the stack', () => {
    paint('#ff0000');
    s().pushSnapshot(snapshot());
    paint('#00ff00');
    const first = s().activeAssetId;

    s().createAsset('second');
    s().switchAsset(first);
    expect(s().undoStack.length).toBeGreaterThan(0);

    s().undo();
    expect(s().colorMap[0]).toBe('#ff0000');
  });

  it('returns to the frame a snapshot belongs to', () => {
    paint('#ff0000');
    s().pushSnapshot(snapshot());
    paint('#00ff00');
    s().addFrame();

    s().undo();
    expect(s().activeFrameIndex).toBe(0);
    expect(s().colorMap[0]).toBe('#ff0000');
  });

  it('drops the snapshots of a deleted asset, since they can never be replayed', () => {
    s().createAsset('second');
    const second = s().activeAssetId;
    paint('#ff0000');
    s().pushSnapshot(snapshot());

    s().deleteAsset(second);
    expect(s().undoStack.every((snap) => snap.assetId !== second)).toBe(true);
  });

  it('does nothing when the snapshot names an asset that is gone', () => {
    paint('#ff0000');
    s().pushSnapshot({ ...snapshot(), assetId: 'never-existed' });
    const before = s().colorMap[0];
    s().undo();
    expect(s().colorMap[0]).toBe(before);
  });
});

describe('an agent turn', () => {
  it('takes back the assets it created, not just the painting', () => {
    const before = s().assets.map((a) => a.id);
    paint('#ff0000');
    // What pushAgentSnapshot records: the board plus the set as it stood.
    s().pushSnapshot({ ...snapshot(), assetIds: before });

    s().createAsset('made by the agent');
    s().createAsset('also the agent');
    expect(s().assets).toHaveLength(3);

    s().undo();
    expect(s().assets.map((a) => a.id)).toEqual(before);
  });

  it('ends the redo line, because those boards are gone', () => {
    paint('#ff0000');
    s().pushSnapshot({ ...snapshot(), assetIds: s().assets.map((a) => a.id) });
    s().createAsset('made by the agent');

    s().undo();
    expect(s().redoStack).toHaveLength(0);
  });

  it('leaves the set alone when the turn created nothing', () => {
    paint('#ff0000');
    s().pushSnapshot({ ...snapshot(), assetIds: s().assets.map((a) => a.id) });
    paint('#00ff00');

    s().undo();
    expect(s().assets).toHaveLength(1);
    expect(s().colorMap[0]).toBe('#ff0000');
  });
});
