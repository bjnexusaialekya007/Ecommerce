import { describe, expect, it } from 'vitest';
import { shouldLoadExperience, type ExperienceEnv } from './gate';

const BASE_ENV: ExperienceEnv = {
  featureEnabled: true,
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

describe('Experience Gate', () => {
  it('allows loading on capable 4G desktop with WebGL2 and no reduced motion', () => {
    const res = shouldLoadExperience(BASE_ENV);
    expect(res.load).toBe(true);
    expect(res.reasons).toHaveLength(0);
  });

  it('blocks when reduced motion, saveData, low RAM, missing WebGL2, or ?experience=off', () => {
    expect(shouldLoadExperience({ ...BASE_ENV, prefersReducedMotion: true }).load).toBe(false);
    expect(shouldLoadExperience({ ...BASE_ENV, saveData: true }).load).toBe(false);
    expect(shouldLoadExperience({ ...BASE_ENV, effectiveType: '3g' }).load).toBe(false);
    expect(shouldLoadExperience({ ...BASE_ENV, deviceMemory: 2 }).load).toBe(false);
    expect(shouldLoadExperience({ ...BASE_ENV, hardwareConcurrency: 2 }).load).toBe(false);
    expect(shouldLoadExperience({ ...BASE_ENV, webgl2Supported: false }).load).toBe(false);
    expect(shouldLoadExperience({ ...BASE_ENV, urlOffParam: true }).load).toBe(false);
  });
});
