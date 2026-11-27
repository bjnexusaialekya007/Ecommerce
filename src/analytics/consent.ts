import { create } from 'zustand';
import { safeStorageGet, safeStorageSet } from '../stores/ui';

export interface ConsentRecord {
  analytics: boolean;
  ts: string;
  version: 1;
}

const CONSENT_KEY = 'consent.v1';

function loadConsent(): ConsentRecord | null {
  try {
    const raw = safeStorageGet(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    return typeof parsed.analytics === 'boolean' ? parsed : null;
  } catch {
    return null;
  }
}

interface ConsentState {
  consent: ConsentRecord | null;
  bannerOpen: boolean;
  setDecision: (analytics: boolean) => void;
  reopenBanner: () => void;
}

export const useConsentStore = create<ConsentState>((set) => {
  const initial = loadConsent();
  return {
    consent: initial,
    bannerOpen: initial === null,
    setDecision: (analytics) => {
      const rec: ConsentRecord = { analytics, ts: new Date().toISOString(), version: 1 };
      safeStorageSet(CONSENT_KEY, JSON.stringify(rec));
      set({ consent: rec, bannerOpen: false });
    },
    reopenBanner: () => set({ bannerOpen: true }),
  };
});
