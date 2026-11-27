import type { ClientConfig } from '../config/schema';
import { INDIAN_STATES } from './constants';
import { validateGSTIN } from './money';
import { isPlaceholder, normalizeWaNumber } from './whatsapp';

export interface ClientCheckRow {
  field: string;
  ok: boolean;
  severity: 'error' | 'warn';
  value: string;
  detail: string;
}

export function evaluateClientConfig(config: ClientConfig, strict = false): ClientCheckRow[] {
  const rows: ClientCheckRow[] = [];
  const sev = strict ? 'error' : 'warn';

  const checkPlaceholder = (field: string, val: string) => {
    const ph = isPlaceholder(val);
    rows.push({
      field,
      ok: !ph,
      severity: ph ? sev : 'warn',
      value: val,
      detail: ph ? 'Placeholder detected' : 'Real value set',
    });
  };

  checkPlaceholder('brand.name', config.brand.name);
  checkPlaceholder('contact.phone', config.contact.phone);
  checkPlaceholder('contact.email', config.contact.email);
  checkPlaceholder('contact.addressParts.line1', config.contact.addressParts.line1);

  const phoneDigits = config.contact.phone.replace(/\D/g, '');
  const phoneValid =
    !isPlaceholder(config.contact.phone) &&
    ((phoneDigits.length === 12 && phoneDigits.startsWith('91') && /^[6-9]/.test(phoneDigits.slice(2))) ||
      (phoneDigits.length === 10 && /^[6-9]/.test(phoneDigits)));
  rows.push({
    field: 'contact.phone.format',
    ok: phoneValid,
    severity: phoneValid ? 'warn' : sev,
    value: config.contact.phone,
    detail: phoneValid ? 'Valid Indian phone' : 'Must be valid Indian mobile/landline',
  });

  const waOk = !config.whatsapp.enabled || normalizeWaNumber(config.whatsapp.number) !== null;
  rows.push({
    field: 'whatsapp.number',
    ok: waOk,
    severity: waOk ? 'warn' : sev,
    value: config.whatsapp.number,
    detail: waOk ? 'Valid E.164 digits without +' : 'Invalid or placeholder WhatsApp number',
  });

  const pinOk = /^\d{6}$/.test(config.contact.addressParts.pincode) && config.contact.addressParts.pincode !== '000000';
  rows.push({
    field: 'contact.pincode',
    ok: pinOk,
    severity: 'error',
    value: config.contact.addressParts.pincode,
    detail: pinOk ? 'Valid 6-digit pincode' : 'Invalid pincode',
  });

  const stateOk = Object.values(INDIAN_STATES).includes(config.contact.addressParts.state);
  rows.push({
    field: 'contact.state',
    ok: stateOk,
    severity: 'error',
    value: config.contact.addressParts.state,
    detail: stateOk ? 'Recognised Indian state' : 'State not in INDIAN_STATES',
  });

  const inIndia =
    config.contact.lat >= 6 && config.contact.lat <= 37.5 && config.contact.lng >= 68 && config.contact.lng <= 97.5;
  rows.push({
    field: 'contact.lat/lng',
    ok: inIndia,
    severity: 'error',
    value: `${config.contact.lat}, ${config.contact.lng}`,
    detail: inIndia ? 'Inside India bounds' : 'Coordinates outside India',
  });

  const gstinOk = !isPlaceholder(config.legal.gstin) && validateGSTIN(config.legal.gstin);
  rows.push({
    field: 'legal.gstin',
    ok: gstinOk,
    severity: gstinOk ? 'warn' : sev,
    value: config.legal.gstin,
    detail: gstinOk ? 'Valid GSTIN checksum' : 'Placeholder or invalid GSTIN checksum',
  });

  const fssaiOk = !isPlaceholder(config.legal.fssai) && /^\d{14}$/.test(config.legal.fssai);
  rows.push({
    field: 'legal.fssai',
    ok: fssaiOk,
    severity: fssaiOk ? 'warn' : sev,
    value: config.legal.fssai,
    detail: fssaiOk ? 'Valid 14-digit FSSAI' : 'Placeholder or must be 14 digits',
  });

  const zonesOk = !config.features.local || config.zones.length > 0;
  const slabsOk = !config.features.courier || config.shippingRates.length > 0;
  rows.push({
    field: 'zones & shippingRates',
    ok: zonesOk && slabsOk,
    severity: 'error',
    value: `${config.zones.length} zones, ${config.shippingRates.length} slabs`,
    detail: zonesOk && slabsOk ? 'Configured' : 'Missing delivery zones or shipping slabs',
  });

  for (const s of config.social) {
    const httpsOk = s.url.startsWith('https://') && !isPlaceholder(s.url);
    const hostOk =
      s.platform === 'other' ||
      s.platform === 'google' ||
      s.url.toLowerCase().includes(s.platform === 'x' ? 'x.com' : s.platform);
    rows.push({
      field: `social.${s.platform}`,
      ok: httpsOk && hostOk,
      severity: httpsOk && hostOk ? 'warn' : sev,
      value: s.url,
      detail: httpsOk && hostOk ? 'Valid HTTPS social URL' : 'Placeholder or host mismatch',
    });
  }

  return rows;
}
