import { create } from 'zustand';
import { en } from './en';
import { te } from './te';

export type Lang = 'en' | 'te';

function getInitialLang(): Lang {
  try {
    const saved = localStorage.getItem('store_lang');
    if (saved === 'te') return 'te';
  } catch {
    // ignore storage errors
  }
  return 'en';
}

export const useLangStore = create<{ lang: Lang; setLang: (lang: Lang) => void }>((set) => ({
  lang: getInitialLang(),
  setLang: (lang) => {
    try {
      localStorage.setItem('store_lang', lang);
    } catch {
      // ignore
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang === 'te' ? 'te-IN' : 'en-IN';
    }
    set({ lang });
  },
}));

function lookupPath(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === 'string' ? cur : undefined;
}

export function t(key: string, vars?: Record<string, string | number>, langOverride?: Lang): string {
  const lang = langOverride ?? useLangStore.getState().lang;
  const raw =
    (lang === 'te' ? lookupPath(te, key) : undefined) ??
    lookupPath(en as unknown as Record<string, unknown>, key) ??
    key;
  if (!vars) return raw;
  return raw.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, k) => String(vars[k] ?? ''));
}
