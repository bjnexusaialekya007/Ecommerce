import { describe, expect, it } from 'vitest';
import { computeTier, type TierEnv } from './tier';

const BASE_ENV: TierEnv = {
  featureEnabled: true,
  tier0Enabled: true,
  fxOffParam: false,
  downgradedTier: null,
  isAdminRoute: false,
  prefersReducedMotion: false,
  saveData: false,
  effectiveType: '4g',
  deviceMemory: 8,
  hardwareConcurrency: 8,
  viewportWidth: 1280,
  webgl2Supported: true,
  pageVisible: true,
  optOutStorage: false,
  urlOffParam: false,
};

describe('Experience computeTier (Section M9.1)', () => {
  it('returns Tier 2 when all hardware, network, WebGL2 and feature checks pass', () => {
    const res = computeTier(BASE_ENV);
    expect(res.tier).toBe(2);
    expect(res.fxEnabled).toBe(true);
    expect(res.prefetchAllowed).toBe(true);
    expect(res.reasons).toHaveLength(0);
  });

  it('caps at Tier 1 when WebGL2 is unavailable on capable hardware', () => {
    const res = computeTier({ ...BASE_ENV, webgl2Supported: false });
    expect(res.tier).toBe(1);
    expect(res.fxEnabled).toBe(true);
    expect(res.reasons.some((r) => r.includes('WebGL2'))).toBe(true);
  });

  it('forces Tier 0 with fxEnabled=false on ?fx=off, experience.tier0=false, reduced motion, or /admin/*', () => {
    const fxOff = computeTier({ ...BASE_ENV, fxOffParam: true });
    expect(fxOff.tier).toBe(0);
    expect(fxOff.fxEnabled).toBe(false);
    expect(fxOff.prefetchAllowed).toBe(false);

    const cfgOff = computeTier({ ...BASE_ENV, tier0Enabled: false });
    expect(cfgOff.tier).toBe(0);
    expect(cfgOff.fxEnabled).toBe(false);

    const reduced = computeTier({ ...BASE_ENV, prefersReducedMotion: true });
    expect(reduced.tier).toBe(0);
    expect(reduced.fxEnabled).toBe(false);
    expect(reduced.reducedMotion).toBe(true);
    expect(reduced.prefetchAllowed).toBe(false);

    const admin = computeTier({ ...BASE_ENV, isAdminRoute: true });
    expect(admin.tier).toBe(0);
    expect(admin.fxEnabled).toBe(false);
    expect(admin.prefetchAllowed).toBe(false);
  });

  it('keeps Tier 0 FX active under Save-Data while disabling prefetching and Tiers 1/2', () => {
    const res = computeTier({ ...BASE_ENV, saveData: true });
    expect(res.tier).toBe(0);
    expect(res.fxEnabled).toBe(true);
    expect(res.prefetchAllowed).toBe(false);
  });

  it('falls back to Tier 0 when low RAM, low CPU cores, 3g connection, or ?experience=off', () => {
    expect(computeTier({ ...BASE_ENV, deviceMemory: 2 }).tier).toBe(0);
    expect(computeTier({ ...BASE_ENV, hardwareConcurrency: 2 }).tier).toBe(0);
    const slow = computeTier({ ...BASE_ENV, effectiveType: '3g' });
    expect(slow.tier).toBe(0);
    expect(slow.prefetchAllowed).toBe(false);
    expect(computeTier({ ...BASE_ENV, urlOffParam: true }).tier).toBe(0);
  });

  it('respects runtime session downgrade steps (2 -> 1 -> 0)', () => {
    const down1 = computeTier({ ...BASE_ENV, downgradedTier: 1 });
    expect(down1.tier).toBe(1);
    expect(down1.reasons.some((r) => r.includes('downgraded to Tier 1'))).toBe(true);

    const down0 = computeTier({ ...BASE_ENV, downgradedTier: 0 });
    expect(down0.tier).toBe(0);
    expect(down0.fxEnabled).toBe(true);
    expect(down0.reasons.some((r) => r.includes('downgraded to Tier 0'))).toBe(true);
  });
});
