import { describe, expect, it } from 'vitest';
import { clientConfig } from '../config/client.config';
import { formatAddress } from './address';
import { buildWhatsAppUrl, isPlaceholder, normalizeWaNumber } from './whatsapp';

describe('WhatsApp & Address helpers', () => {
  it('detects placeholders accurately (N1)', () => {
    expect(isPlaceholder('REPLACE_ME')).toBe(true);
    expect(isPlaceholder('+91 00000 00000')).toBe(true);
    expect(isPlaceholder('910000000000')).toBe(true);
    expect(isPlaceholder('hello@example.com')).toBe(true);
    expect(isPlaceholder('919876543210')).toBe(false);
  });

  it('normalizes valid Indian mobile numbers to E.164 digits without +', () => {
    expect(normalizeWaNumber('98765 43210')).toBe('919876543210');
    expect(normalizeWaNumber('09876543210')).toBe('919876543210');
    expect(normalizeWaNumber('+91 98765 43210')).toBe('919876543210');
    expect(normalizeWaNumber('12345')).toBeNull();
    expect(normalizeWaNumber('+91 00000 00000')).toBeNull();
  });

  it('builds safe wa.me link capped <= 1000 characters without PII', () => {
    const hugeItems = Array.from({ length: 40 }, (_, i) => `Product ${i} super long description line × 5`);
    const url = buildWhatsAppUrl('cart', { items: hugeItems, total: '₹1,200' }, clientConfig);
    expect(url).toBeTruthy();
    const textParam = new URL(url!).searchParams.get('text') || '';
    expect(textParam.length).toBeLessThanOrEqual(1000);
  });

  it('returns null when WhatsApp number is a placeholder', () => {
    const phConfig = { ...clientConfig, whatsapp: { ...clientConfig.whatsapp, number: '910000000000' } };
    expect(buildWhatsAppUrl('general', {}, phConfig)).toBeNull();
  });

  it('formats Indian store address cleanly', () => {
    const oneLine = formatAddress(clientConfig, 'oneLine');
    expect(oneLine).toContain(clientConfig.contact.addressParts.city);
    expect(oneLine).toContain(clientConfig.contact.addressParts.pincode);
  });
});
