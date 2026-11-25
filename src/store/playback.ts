import { create } from 'zustand';

export const SPEEDS = [1, 0.5, 0.25, 0.1] as const;
export type Speed = (typeof SPEEDS)[number];

interface PlaybackState {
  t: number;
  /** Updated ~8×/s for heavier subscribers (charts). */
  tCoarse: number;
  playing: boolean;
  speed: Speed;
  finishedId: number;
  set: (patch: Partial<Omit<PlaybackState, 'set'>>) => void;
}

export const usePlayback = create<PlaybackState>((set) => ({
  t: 0,
  tCoarse: 0,
  playing: false,
  speed: 1,
  finishedId: 0,
  set: (patch) => set(patch),
}));
