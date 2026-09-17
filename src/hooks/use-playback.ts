import { useEffect } from 'react';

import { useStore } from '../store';

/** Advances the playback frame while playing. Playback is view state, so this
 *  never touches the document, never dirties the project and never enters the
 *  undo stack. Mounted once, next to the 3D preview that reads it. */
export function usePlayback(): void {
  const playing = useStore((s) => s.playing);
  const fps = useStore((s) => s.playbackFps);
  const frameCount = useStore(
    (s) => s.assets.find((a) => a.id === s.activeAssetId)?.frames.length ?? 1,
  );
  const setPlaybackFrame = useStore((s) => s.setPlaybackFrame);
  const setPlaying = useStore((s) => s.setPlaying);

  useEffect(() => {
    if (!playing) return;
    // Nothing to play. Stop rather than spin a timer on a single frame.
    if (frameCount <= 1) {
      setPlaying(false);
      return;
    }
    const id = window.setInterval(() => {
      const next = (useStore.getState().playbackFrame + 1) % frameCount;
      setPlaybackFrame(next);
    }, 1000 / fps);
    return () => window.clearInterval(id);
  }, [playing, fps, frameCount, setPlaybackFrame, setPlaying]);
}
