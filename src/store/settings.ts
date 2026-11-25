import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isLikelyLowEnd } from '../lib/webgl';

export type MotionPref = 'system' | 'reduce' | 'full';

interface SettingsState {
  motion: MotionPref;
  highContrast: boolean;
  lowGraphics: boolean;
  advanced: boolean;
  textScale: 1 | 1.125 | 1.25;
  introSeen: boolean;
  set: (patch: Partial<Omit<SettingsState, 'set'>>) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      motion: 'system',
      highContrast: false,
      lowGraphics: typeof navigator !== 'undefined' ? isLikelyLowEnd() : false,
      advanced: false,
      textScale: 1,
      introSeen: false,
      set: (patch) => set(patch),
    }),
    { name: 'fq-settings', version: 1 },
  ),
);
