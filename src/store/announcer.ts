import { create } from 'zustand';

interface AnnouncerState {
  message: string;
  id: number;
  announce: (msg: string) => void;
}

/** Feeds a single polite aria-live region so screen readers hear run results and status changes. */
export const useAnnouncer = create<AnnouncerState>((set, get) => ({
  message: '',
  id: 0,
  announce: (message) => set({ message, id: get().id + 1 }),
}));

export const announce = (msg: string) => useAnnouncer.getState().announce(msg);
