import { create } from 'zustand';
import { useDevSimStore } from '../dev/simStore';

export function safeStorageGet(key: string): string | null {
  if (useDevSimStore.getState().storageBlocked) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeStorageSet(key: string, val: string): void {
  if (useDevSimStore.getState().storageBlocked) return;
  try {
    localStorage.setItem(key, val);
  } catch {
    // app continues cleanly when storage throws
  }
}

export interface ToastItem {
  id: string;
  message: string;
  tone: 'info' | 'success' | 'danger';
  undoAction?: () => void;
}

interface UiState {
  toasts: ToastItem[];
  announcementDismissed: boolean;
  lastPincode: string;
  recentSearches: string[];
  pushToast: (t: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;
  dismissAnnouncement: () => void;
  setLastPincode: (pin: string) => void;
  addRecentSearch: (q: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  announcementDismissed: false,
  lastPincode: safeStorageGet('store_last_pin') || '500012',
  recentSearches: (() => {
    try {
      const raw = safeStorageGet('store_recent_searches');
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  })(),
  pushToast: (t) => {
    const id = Math.random().toString(36).slice(2, 10);
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }));
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  dismissAnnouncement: () => set({ announcementDismissed: true }),
  setLastPincode: (pin) => {
    safeStorageSet('store_last_pin', pin);
    set({ lastPincode: pin });
  },
  addRecentSearch: (q) =>
    set((s) => {
      const clean = q.trim();
      if (!clean) return s;
      const next = [clean, ...s.recentSearches.filter((x) => x !== clean)].slice(0, 5);
      safeStorageSet('store_recent_searches', JSON.stringify(next));
      return { recentSearches: next };
    }),
}));
