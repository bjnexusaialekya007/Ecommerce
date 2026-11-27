import { create } from 'zustand';
import type { NotificationMessage } from '../shared/providers';

interface OutboxState {
  messages: NotificationMessage[];
  pushMessage: (msg: NotificationMessage) => void;
  markRetried: (id: string) => void;
  clear: () => void;
}

export const useOutboxStore = create<OutboxState>((set) => ({
  messages: [],
  pushMessage: (msg) => set((s) => ({ messages: [msg, ...s.messages] })),
  markRetried: (id) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, status: 'sent', error: undefined } : m)),
    })),
  clear: () => set({ messages: [] }),
}));
