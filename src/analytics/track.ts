import { create } from 'zustand';
import type { ClientConfig } from '../config/schema';
import type { OrderAttribution } from '../shared/schemas';
import { useConsentStore } from './consent';
import type { AnalyticsEventName, LoggedAnalyticsEvent } from './events';

const PII_KEY_REGEX = /(name|phone|email|address|gstin|pincode|otp)/i;
const SENT_PURCHASES_KEY = 'ga_sent_purchases_v1';
const ATTRIBUTION_KEY = 'store_utm_attribution_v1';

interface AnalyticsDebugState {
  logs: LoggedAnalyticsEvent[];
  piiDroppedCount: number;
  gtagLoaded: boolean;
  pushLog: (entry: LoggedAnalyticsEvent, dropped: number) => void;
  setGtagLoaded: () => void;
  clearLogs: () => void;
}

export const useAnalyticsDebugStore = create<AnalyticsDebugState>((set) => ({
  logs: [],
  piiDroppedCount: 0,
  gtagLoaded: false,
  pushLog: (entry, dropped) =>
    set((s) => ({
      logs: [entry, ...s.logs].slice(0, 100),
      piiDroppedCount: s.piiDroppedCount + dropped,
    })),
  setGtagLoaded: () => set({ gtagLoaded: true }),
  clearLogs: () => set({ logs: [], piiDroppedCount: 0 }),
}));

export function sanitizeAnalyticsParams(params: Record<string, unknown>): {
  clean: Record<string, unknown>;
  strippedKeys: string[];
} {
  const clean: Record<string, unknown> = {};
  const strippedKeys: string[] = [];

  for (const [k, v] of Object.entries(params)) {
    if (PII_KEY_REGEX.test(k)) {
      strippedKeys.push(k);
    } else if (Array.isArray(v)) {
      clean[k] = v.map((item) =>
        item && typeof item === 'object' ? sanitizeAnalyticsParams(item as Record<string, unknown>).clean : item
      );
    } else if (v && typeof v === 'object') {
      clean[k] = sanitizeAnalyticsParams(v as Record<string, unknown>).clean;
    } else {
      clean[k] = v;
    }
  }
  return { clean, strippedKeys };
}

function hasSentPurchase(orderCode: string): boolean {
  try {
    const raw = localStorage.getItem(SENT_PURCHASES_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    return list.includes(orderCode);
  } catch {
    return false;
  }
}

function markSentPurchase(orderCode: string): void {
  try {
    const raw = localStorage.getItem(SENT_PURCHASES_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    if (!list.includes(orderCode)) {
      localStorage.setItem(SENT_PURCHASES_KEY, JSON.stringify([...list.slice(-50), orderCode]));
    }
  } catch {
    // ignore storage errors
  }
}

export function captureFirstTouchAttribution(search = ''): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (sessionStorage.getItem(ATTRIBUTION_KEY)) return;
    const p = new URLSearchParams(search);
    const attr: OrderAttribution = {};
    if (p.get('utm_source')) attr.utm_source = p.get('utm_source')!;
    if (p.get('utm_medium')) attr.utm_medium = p.get('utm_medium')!;
    if (p.get('utm_campaign')) attr.utm_campaign = p.get('utm_campaign')!;
    if (p.get('gclid')) attr.gclid = p.get('gclid')!;
    if (Object.keys(attr).length > 0) {
      sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attr));
    }
  } catch {
    // ignore
  }
}

export function getStoredAttribution(): OrderAttribution | undefined {
  if (typeof sessionStorage === 'undefined') return undefined;
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_KEY);
    return raw ? (JSON.parse(raw) as OrderAttribution) : undefined;
  } catch {
    return undefined;
  }
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function ensureGtag(ga4Id: string): void {
  if (!ga4Id || typeof document === 'undefined') return;
  if (useAnalyticsDebugStore.getState().gtagLoaded) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args: unknown[]) => {
    window.dataLayer?.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', ga4Id, { send_page_view: false });

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`;
  document.head.appendChild(s);
  useAnalyticsDebugStore.getState().setGtagLoaded();
}

export function track(
  name: AnalyticsEventName,
  params: Record<string, unknown> = {},
  config?: ClientConfig
): void {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
    useAnalyticsDebugStore.getState().pushLog(
      {
        id: Math.random().toString(36).slice(2, 10),
        ts: new Date().toISOString(),
        name,
        params: {},
        strippedKeys: [],
        status: 'blocked_admin',
      },
      0
    );
    return;
  }

  if (name === 'purchase' && typeof params.transaction_id === 'string') {
    if (hasSentPurchase(params.transaction_id)) return;
    markSentPurchase(params.transaction_id);
  }

  const { clean, strippedKeys } = sanitizeAnalyticsParams(params);
  const consent = useConsentStore.getState().consent;
  const ga4Id = config?.analytics.ga4Id || '';
  const consentGranted = Boolean(consent?.analytics);

  let status: LoggedAnalyticsEvent['status'] = 'blocked_no_consent';
  if (consentGranted) {
    if (ga4Id && config?.features.analytics) {
      ensureGtag(ga4Id);
      window.gtag?.('event', name, clean);
      status = 'sent';
    } else {
      status = 'queued';
    }
  }

  useAnalyticsDebugStore.getState().pushLog(
    {
      id: Math.random().toString(36).slice(2, 10),
      ts: new Date().toISOString(),
      name,
      params: clean,
      strippedKeys,
      status,
    },
    strippedKeys.length
  );
}
