import type { ClientConfig } from '../config/schema';

export function formatAddress(config: ClientConfig, mode: 'oneLine' | 'multiLine' = 'oneLine'): string {
  const p = config.contact.addressParts;
  const parts = [p.line1, p.line2, p.area, `${p.city}, ${p.state} ${p.pincode}`].filter(
    (part): part is string => Boolean(part && part.trim().length > 0)
  );
  return mode === 'oneLine' ? parts.join(', ') : parts.join('\n');
}

export function getDirectionsUrl(config: ClientConfig): string {
  if (config.contact.mapUrl) return config.contact.mapUrl;
  return `https://www.google.com/maps/dir/?api=1&destination=${config.contact.lat},${config.contact.lng}`;
}
