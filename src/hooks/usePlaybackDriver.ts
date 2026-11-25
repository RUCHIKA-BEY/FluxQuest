import { useEffect } from 'react';
import { usePlayback } from '../store/playback';

/**
 * Drives the shared playback clock with requestAnimationFrame while playing.
 * The 3D scene reads `t` imperatively each frame; DOM widgets subscribe to it; charts use `tCoarse`.
 */
export function usePlaybackDriver(duration: number | null, onFinish?: () => void) {
  const playing = usePlayback((s) => s.playing);
  useEffect(() => {
    if (!playing || duration == null) return;
    let raf = 0;
    let last = performance.now();
    let lastCoarse = 0;
    const tick = (now: number) => {
      const st = usePlayback.getState();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      let t = st.t + dt * st.speed;
      if (t >= duration) {
        t = duration;
        usePlayback.setState({ t, tCoarse: t, playing: false, finishedId: st.finishedId + 1 });
        onFinish?.();
        return;
      }
      const patch: { t: number; tCoarse?: number } = { t };
      if (now - lastCoarse > 120) {
        patch.tCoarse = t;
        lastCoarse = now;
      }
      usePlayback.setState(patch);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration, onFinish]);
}
