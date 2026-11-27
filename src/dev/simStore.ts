import { create } from 'zustand';

export interface DevSimState {
  latencyMinMs: number;
  latencyMaxMs: number;
  failRatePct: number;
  stockRace: boolean;
  priceChange: boolean;
  shopCloseMidCheckout: boolean;
  webhookLateSec: number;
  webhookDuplicate: boolean;
  amountMismatch: boolean;
  paymentFail: boolean;
  emailFail: boolean;
  sessionExpired: boolean;
  offline: boolean;
  storageBlocked: boolean;
  gpsDenied: boolean;
  slowImages: boolean;
  staleCatalog: boolean;
  clockOffsetMinutes: number;
  setSim: (patch: Partial<DevSimState>) => void;
  resetSim: () => void;
}

const DEFAULT_SIM: Omit<DevSimState, 'setSim' | 'resetSim'> = {
  latencyMinMs: 150,
  latencyMaxMs: 360,
  failRatePct: 0,
  stockRace: false,
  priceChange: false,
  shopCloseMidCheckout: false,
  webhookLateSec: 0,
  webhookDuplicate: false,
  amountMismatch: false,
  paymentFail: false,
  emailFail: false,
  sessionExpired: false,
  offline: false,
  storageBlocked: false,
  gpsDenied: false,
  slowImages: false,
  staleCatalog: false,
  clockOffsetMinutes: 0,
};

export const useDevSimStore = create<DevSimState>((set) => ({
  ...DEFAULT_SIM,
  setSim: (patch) => set((s) => ({ ...s, ...patch })),
  resetSim: () => set({ ...DEFAULT_SIM }),
}));

export function getSimulatedNow(): Date {
  const offset = useDevSimStore.getState().clockOffsetMinutes;
  return new Date(Date.now() + offset * 60_000);
}
