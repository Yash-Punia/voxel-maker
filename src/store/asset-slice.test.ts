import { beforeEach, describe, expect, it } from 'vitest';

import { useStore } from './index';

// The set model rests on one move: commit the live board into its asset or
// frame, then apply the next. If that is wrong, edits bleed between boards, and
// nothing about the UI would make it obvious.

const s = () => useStore.getState();

/** Paints cell 0, which is the cheapest way to make a board distinguishable. */
function paint(color: string) {
  const next = [...s().colorMap];
  next[0] = color;
  s().setColorMap(next);
}

beforeEach(() => {
  useStore.getState().resetAssets(4, 4);
  useStore.getState().clearHistory();
  useStore.getState().clearDirty();
});

describe('assets', () => {
  it('starts with exactly one', () => {
    expect(s().assets).toHaveLength(1);
    expect(s().activeAssetId).toBe(s().assets[0].id);
  });

  it('creating one opens it', () => {
    s().createAsset('barrel');
    expect(s().assets).toHaveLength(2);
    expect(s().assets[1].name).toBe('barrel');
    expect(s().activeAssetId).toBe(s().assets[1].id);
  });

  it('keeps names unique, so a second barrel is not also called barrel', () => {
    s().createAsset('barrel');
    s().createAsset('barrel');
    expect(s().assets[1].name).not.toBe(s().assets[2].name);
  });

  it('holds each asset\'s work when switching away and back', () => {
    const first = s().activeAssetId;
    paint('#ff0000');
    s().createAsset('second');
    paint('#00ff00');

    expect(s().colorMap[0]).toBe('#00ff00');
    s().switchAsset(first);
    expect(s().colorMap[0]).toBe('#ff0000');
  });

  it('duplicating copies the artwork, not a reference to it', () => {
    paint('#ff0000');
    s().duplicateAsset(s().activeAssetId);
    expect(s().colorMap[0]).toBe('#ff0000');

    // Editing the copy must leave the original alone.
    paint('#0000ff');
    s().switchAsset(s().assets[0].id);
    expect(s().colorMap[0]).toBe('#ff0000');
  });

  it('refuses to delete the last asset, so the stage always has something', () => {
    s().deleteAsset(s().activeAssetId);
    expect(s().assets).toHaveLength(1);
  });

  it('deleting the open asset opens a neighbour', () => {
    s().createAsset('second');
    const second = s().activeAssetId;
    s().deleteAsset(second);
    expect(s().assets).toHaveLength(1);
    expect(s().activeAssetId).not.toBe(second);
  });

  it('renaming an asset to a name in use does not collide', () => {
    s().createAsset('barrel');
    s().createAsset('crate');
    s().renameAsset(s().activeAssetId, 'barrel');
    const names = s().assets.map((a) => a.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('an empty rename is ignored rather than wiping the name', () => {
    s().createAsset('barrel');
    s().renameAsset(s().activeAssetId, '   ');
    expect(s().assets[1].name).toBe('barrel');
  });

  it('every asset mutation marks the project dirty', () => {
    expect(s().isDirty).toBe(false);
    s().createAsset('barrel');
    expect(s().isDirty).toBe(true);
  });
});

describe('frames', () => {
  it('every asset starts with one', () => {
    expect(s().assets[0].frames).toHaveLength(1);
    expect(s().activeFrameIndex).toBe(0);
  });

  it('adding one opens it, and it is empty', () => {
    paint('#ff0000');
    s().addFrame();
    expect(s().assets[0].frames).toHaveLength(2);
    expect(s().activeFrameIndex).toBe(1);
    expect(s().colorMap[0]).toBe('');
  });

  it('holds each frame\'s work when stepping away and back', () => {
    paint('#ff0000');
    s().addFrame();
    paint('#00ff00');

    s().setActiveFrame(0);
    expect(s().colorMap[0]).toBe('#ff0000');
    s().setActiveFrame(1);
    expect(s().colorMap[0]).toBe('#00ff00');
  });

  it('duplicating a frame copies its artwork', () => {
    paint('#ff0000');
    s().duplicateFrame();
    expect(s().colorMap[0]).toBe('#ff0000');
    expect(s().assets[0].frames).toHaveLength(2);
  });

  it('refuses to delete the last frame', () => {
    s().deleteFrame(0);
    expect(s().assets[0].frames).toHaveLength(1);
  });

  it('deleting a frame that is not open keeps the live board', () => {
    paint('#ff0000');
    s().addFrame();
    paint('#00ff00');
    // Frame 1 is open. Deleting frame 0 must not throw away what is on screen.
    s().deleteFrame(0);
    expect(s().assets[0].frames).toHaveLength(1);
    expect(s().colorMap[0]).toBe('#00ff00');
  });

  it('ignores an index outside the list', () => {
    s().setActiveFrame(99);
    expect(s().activeFrameIndex).toBe(0);
  });

  it('frames belong to their asset, not to the project', () => {
    s().addFrame();
    s().createAsset('second');
    expect(s().assets[1].frames).toHaveLength(1);
    expect(s().activeFrameIndex).toBe(0);
  });
});

describe('tile masks', () => {
  it('clamps a mask into the four bits it has', () => {
    const id = s().activeAssetId;
    s().setTileMask(id, 99);
    expect(s().assets[0].tileMask).toBe(15);
    s().setTileMask(id, -3);
    expect(s().assets[0].tileMask).toBe(0);
  });

  it('clearing a mask makes it an ordinary prop again', () => {
    const id = s().activeAssetId;
    s().setTileMask(id, 5);
    s().setTileMask(id, undefined);
    expect(s().assets[0].tileMask).toBeUndefined();
  });
});

describe('a new project', () => {
  it('drops the scenes with the assets', () => {
    // Scenes hold asset ids. Keeping them across a reset would leave every
    // placement pointing at an asset that no longer exists.
    s().createScene('a scene');
    s().placeAsset(s().activeAssetId, 0, 0);
    expect(s().scenes).toHaveLength(1);

    s().resetAssets(8, 8);
    expect(s().scenes).toHaveLength(0);
    expect(s().activeSceneId).toBeNull();
  });
});
