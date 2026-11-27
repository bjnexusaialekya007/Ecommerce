import { create } from 'zustand';
import type { Customer } from '../shared/schemas';

interface AuthState {
  adminEmail: string | null;
  buyer: Customer | null;
  verifiedOrderCodes: Record<string, string>; // publicCode -> last4
  setAdminEmail: (email: string | null) => void;
  setBuyer: (buyer: Customer | null) => void;
  rememberOrderAccess: (code: string, last4: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  adminEmail: null,
  buyer: null,
  verifiedOrderCodes: {},
  setAdminEmail: (adminEmail) => set({ adminEmail }),
  setBuyer: (buyer) => set({ buyer }),
  rememberOrderAccess: (code, last4) =>
    set((s) => ({
      verifiedOrderCodes: { ...s.verifiedOrderCodes, [code.toUpperCase()]: last4 },
    })),
}));
