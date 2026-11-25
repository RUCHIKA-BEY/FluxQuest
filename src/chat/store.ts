import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActionId, Evidence } from './knowledge/passages';

export type Level = 'auto' | 'simple' | 'detailed' | 'expert';
export type Lang = 'en' | 'hi';

export interface SourceRef {
  n: number;
  passageId: string;
  title: string;
  section: string;
  evidence: Evidence;
  sourceTitle: string;
  org: string;
  url?: string;
  citation?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
  sources?: SourceRef[];
  actions?: ActionId[];
  confidence?: 'high' | 'medium' | 'low';
  mode?: 'online' | 'offline' | 'cached' | 'safety' | 'low-confidence';
  level?: Exclude<Level, 'auto'>;
  followUp?: string;
  streaming?: boolean;
  feedback?: 'up' | 'down';
}

interface ChatState {
  messages: ChatMessage[];
  level: Level;
  lang: Lang;
  voiceOut: boolean;
  set: (patch: Partial<Pick<ChatState, 'level' | 'lang' | 'voiceOut'>>) => void;
  add: (m: ChatMessage) => void;
  patch: (id: string, p: Partial<ChatMessage>) => void;
  clear: () => void;
}

export const useChat = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      level: 'auto',
      lang: 'en',
      voiceOut: false,
      set: (patch) => set(patch),
      add: (m) => set((s) => ({ messages: [...s.messages, m].slice(-80) })),
      patch: (id, p) => set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...p } : m)) })),
      clear: () => set({ messages: [] }),
    }),
    {
      name: 'fq-magneto',
      version: 1,
      partialize: (s) => ({ messages: s.messages.filter((m) => !m.streaming), level: s.level, lang: s.lang, voiceOut: s.voiceOut }),
    },
  ),
);
