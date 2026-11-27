import type { ClientConfig } from '../config/schema';

/**
 * Matches placeholder values per Section N1.
 */
export function isPlaceholder(value: string | undefined | null): boolean {
  if (!value) return false;
  const v = value.trim();
  if (/REPLACE_ME/i.test(v)) return true;
  if (/example\.com/i.test(v)) return true;
  if (/\blorem\b/i.test(v)) return true;
  const digits = v.replace(/\D/g, '');
  if (digits.length >= 6 && /^0+$/.test(digits.slice(-10))) return true;
  if (digits === '910000000000') return true;
  return false;
}

/**
 * Normalizes WhatsApp numbers to international digits only.
 * Accepts 10-digit Indian mobile (adds 91), 0-prefixed 11-digit, or +91/91-prefixed 12-digit.
 * Rejects placeholders and invalid numbers.
 */
export function normalizeWaNumber(input: string): string | null {
  if (!input || isPlaceholder(input)) return null;
  let digits = input.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91') && /^[6-9]\d{9}$/.test(digits.slice(2))) {
    return digits;
  }
  return null;
}

export type WaKind = 'general' | 'cart' | 'product' | 'track' | 'wholesale';

export interface WaContext {
  product?: string;
  pack?: string;
  url?: string;
  items?: string[];
  total?: string;
  pincode?: string;
  code?: string;
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  // Strip ASCII control characters except newline
  const cleaned = template.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '');
  return cleaned.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, k) => vars[k] ?? '');
}

/**
 * Builds a safe WhatsApp wa.me link capped at 1,000 characters without PII.
 * Returns null if the number is invalid or a placeholder (Section N4).
 */
export function buildWhatsAppUrl(kind: WaKind, ctx: WaContext, config: ClientConfig): string | null {
  if (!config.whatsapp.enabled) return null;
  const num = normalizeWaNumber(config.whatsapp.number);
  if (!num) return null;

  if (config.whatsapp.shortLink && kind === 'general') {
    return config.whatsapp.shortLink;
  }

  let itemsText = '';
  if (ctx.items && ctx.items.length > 0) {
    const kept: string[] = [];
    for (let i = 0; i < ctx.items.length; i++) {
      const next = [...kept, ctx.items[i]].join('\n');
      if (next.length > 680) {
        kept.push(`+${ctx.items.length - i} more`);
        break;
      }
      kept.push(ctx.items[i]);
    }
    itemsText = kept.join('\n');
  }

  const template = config.whatsapp.messages[kind] || config.whatsapp.messages.general;
  let message = renderTemplate(template, {
    brand: config.brand.name,
    product: ctx.product || '',
    pack: ctx.pack || '',
    url: ctx.url || '',
    items: itemsText,
    total: ctx.total || '',
    pincode: ctx.pincode || 'your area',
    code: ctx.code || '',
  }).trim();

  if (message.length > 1000) {
    message = message.slice(0, 997) + '…';
  }

  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}
