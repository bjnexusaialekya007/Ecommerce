import { create } from 'zustand';
import type { CartLine, FulfilmentMode } from '../shared/schemas';
import { triggerLightHaptic } from '../shared/motion';
import { safeStorageGet, safeStorageSet } from './ui';

export interface CheckoutDraft {
  customerName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  pincode: string;
  stateCode: string;
  gstin: string;
  businessName: string;
  notes: string;
  mode: FulfilmentMode;
}

const DEFAULT_DRAFT: CheckoutDraft = {
  customerName: '',
  phone: '',
  email: '',
  addressLine1: '',
  addressLine2: '',
  landmark: '',
  pincode: '500012',
  stateCode: '36',
  gstin: '',
  businessName: '',
  notes: '',
  mode: 'local',
};

function readInitialLines(): CartLine[] {
  try {
    const raw = safeStorageGet('store_cart_v1');
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

function readInitialDraft(): CheckoutDraft {
  try {
    const raw = safeStorageGet('store_checkout_draft_v1');
    return raw ? { ...DEFAULT_DRAFT, ...(JSON.parse(raw) as Partial<CheckoutDraft>) } : DEFAULT_DRAFT;
  } catch {
    return DEFAULT_DRAFT;
  }
}

interface CartState {
  lines: CartLine[];
  couponCode: string;
  draft: CheckoutDraft;
  removedNotice: string | null;
  priceChangedSkuIds: string[];
  addLine: (skuId: string, delta?: number) => void;
  setQty: (skuId: string, qty: number) => void;
  removeLine: (skuId: string) => CartLine | null;
  restoreLine: (line: CartLine) => void;
  replaceLines: (lines: CartLine[], removedNotice?: string | null, priceChangedIds?: string[]) => void;
  setCouponCode: (code: string) => void;
  updateDraft: (patch: Partial<CheckoutDraft>) => void;
  clearCart: () => void;
  clearNotice: () => void;
}

function persistLines(lines: CartLine[]): void {
  safeStorageSet('store_cart_v1', JSON.stringify(lines));
}

export const useCartStore = create<CartState>((set, get) => ({
  lines: readInitialLines(),
  couponCode: '',
  draft: readInitialDraft(),
  removedNotice: null,
  priceChangedSkuIds: [],

  addLine: (skuId, delta = 1) => {
    triggerLightHaptic();
    const prev = get().lines;
    const existing = prev.find((l) => l.skuId === skuId);
    let next: CartLine[];
    if (!existing) {
      next = delta > 0 ? [...prev, { skuId, qty: delta }] : prev;
    } else {
      const nextQty = existing.qty + delta;
      next = nextQty <= 0 ? prev.filter((l) => l.skuId !== skuId) : prev.map((l) => (l.skuId === skuId ? { ...l, qty: nextQty } : l));
    }
    persistLines(next);
    set({ lines: next });
  },

  setQty: (skuId, qty) => {
    const prev = get().lines;
    const next =
      qty <= 0
        ? prev.filter((l) => l.skuId !== skuId)
        : prev.some((l) => l.skuId === skuId)
        ? prev.map((l) => (l.skuId === skuId ? { ...l, qty } : l))
        : [...prev, { skuId, qty }];
    persistLines(next);
    set({ lines: next });
  },

  removeLine: (skuId) => {
    const prev = get().lines;
    const removed = prev.find((l) => l.skuId === skuId) || null;
    const next = prev.filter((l) => l.skuId !== skuId);
    persistLines(next);
    set({ lines: next });
    return removed;
  },

  restoreLine: (line) => {
    const prev = get().lines;
    const exists = prev.some((l) => l.skuId === line.skuId);
    const next = exists
      ? prev.map((l) => (l.skuId === line.skuId ? { ...l, qty: l.qty + line.qty } : l))
      : [...prev, line];
    persistLines(next);
    set({ lines: next });
  },

  replaceLines: (lines, removedNotice = null, priceChangedSkuIds = []) => {
    persistLines(lines);
    set({ lines, removedNotice, priceChangedSkuIds });
  },

  setCouponCode: (couponCode) => set({ couponCode }),

  updateDraft: (patch) =>
    set((s) => {
      const draft = { ...s.draft, ...patch };
      safeStorageSet('store_checkout_draft_v1', JSON.stringify(draft));
      return { draft };
    }),

  clearCart: () => {
    persistLines([]);
    set({ lines: [], couponCode: '', removedNotice: null, priceChangedSkuIds: [] });
  },

  clearNotice: () => set({ removedNotice: null }),
}));
