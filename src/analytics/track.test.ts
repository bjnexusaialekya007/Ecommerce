import { describe, expect, it } from 'vitest';
import { clientConfig } from '../config/client.config';
import { sanitizeAnalyticsParams, track, useAnalyticsDebugStore } from './track';
import { useConsentStore } from './consent';

describe('Analytics PII & Consent Gate', () => {
  it('strips all PII fields before queuing or logging', () => {
    const { clean, strippedKeys } = sanitizeAnalyticsParams({
      currency: 'INR',
      value: 220,
      customerName: 'Secret Name',
      phone: '9876543210',
      email: 'a@b.com',
      pincode: '500012',
      gstin: '36AABCU9603R1ZM',
    });
    expect(clean).toEqual({ currency: 'INR', value: 220 });
    expect(strippedKeys).toEqual(expect.arrayContaining(['customerName', 'phone', 'email', 'pincode', 'gstin']));
  });

  it('blocks events when consent has not been granted', () => {
    useAnalyticsDebugStore.getState().clearLogs();
    useConsentStore.getState().setDecision(false);
    track('view_item', { value: 95 }, clientConfig);
    const logs = useAnalyticsDebugStore.getState().logs;
    expect(logs[0]?.status).toBe('blocked_no_consent');
  });
});
