import { detectWebGL2, type ExperienceEnv } from './gate';

export type ExperienceTier = 0 | 1 | 2;

export interface TierEnv extends ExperienceEnv {
  tier0Enabled: boolean;
  fxOffParam: boolean;
  downgradedTier?: ExperienceTier | null;
  isAdminRoute?: boolean;
}

export interface TierDecision {
  tier: ExperienceTier;
  fxEnabled: boolean;
  reducedMotion: boolean;
  prefetchAllowed: boolean;
  reasons: string[];
}

const DOWNGRADE_KEY = 'experience_tier_downgrade';

export function readDowngradedTier(): ExperienceTier | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(DOWNGRADE_KEY);
    if (raw === '0' || raw === '1' || raw === '2') return Number(raw) as ExperienceTier;
  } catch {
    // ignore storage access issues
  }
  return null;
}

export function writeDowngradedTier(tier: ExperienceTier | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (tier === null) window.sessionStorage.removeItem(DOWNGRADE_KEY);
    else window.sessionStorage.setItem(DOWNGRADE_KEY, String(tier));
  } catch {
    // ignore storage access issues
  }
}

export function readTierEnv(opts: {
  featureEnabled: boolean;
  tier0Enabled: boolean;
  isAdminRoute?: boolean;
  downgradedTier?: ExperienceTier | null;
}): TierEnv {
  if (typeof window === 'undefined') {
    return {
      featureEnabled: false,
      tier0Enabled: false,
      prefersReducedMotion: true,
      saveData: false,
      viewportWidth: 0,
      webgl2Supported: false,
      pageVisible: false,
      optOutStorage: false,
      urlOffParam: false,
      fxOffParam: false,
      downgradedTier: null,
      isAdminRoute: opts.isAdminRoute,
    };
  }

  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
    deviceMemory?: number;
  };

  let optOutStorage = false;
  try {
    optOutStorage = window.localStorage.getItem('experience_opt_out') === '1';
  } catch {
    // ignore
  }

  const params = new URLSearchParams(window.location.search);

  return {
    featureEnabled: opts.featureEnabled,
    tier0Enabled: opts.tier0Enabled,
    prefersReducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    saveData: Boolean(nav.connection?.saveData),
    effectiveType: nav.connection?.effectiveType,
    deviceMemory: nav.deviceMemory,
    hardwareConcurrency: nav.hardwareConcurrency,
    viewportWidth: window.innerWidth,
    webgl2Supported: detectWebGL2(),
    pageVisible: document.visibilityState === 'visible',
    optOutStorage,
    urlOffParam: params.get('experience') === 'off',
    fxOffParam: params.get('fx') === 'off',
    downgradedTier: opts.downgradedTier !== undefined ? opts.downgradedTier : readDowngradedTier(),
    isAdminRoute: opts.isAdminRoute ?? window.location.pathname.startsWith('/admin'),
  };
}

export function computeTier(env: TierEnv): TierDecision {
  const reasons: string[] = [];
  const reducedMotion = Boolean(env.prefersReducedMotion);
  const slowNet = Boolean(env.effectiveType && env.effectiveType !== '4g');
  const prefetchAllowed =
    !env.isAdminRoute &&
    env.tier0Enabled &&
    !env.fxOffParam &&
    !reducedMotion &&
    !env.saveData &&
    !slowNet;

  if (env.isAdminRoute) {
    reasons.push('Admin route: effects disabled');
    return { tier: 0, fxEnabled: false, reducedMotion, prefetchAllowed: false, reasons };
  }

  if (env.fxOffParam) {
    reasons.push('URL parameter ?fx=off is active');
    return { tier: 0, fxEnabled: false, reducedMotion, prefetchAllowed: false, reasons };
  }

  if (!env.tier0Enabled) {
    reasons.push('experience.tier0 is disabled');
    return { tier: 0, fxEnabled: false, reducedMotion, prefetchAllowed: false, reasons };
  }

  if (reducedMotion) {
    reasons.push('prefers-reduced-motion: reduce (spatial motion suppressed)');
    return { tier: 0, fxEnabled: false, reducedMotion: true, prefetchAllowed: false, reasons };
  }

  // Tier 0 is allowed cleanly even under Save-Data / low-end hardware (with prefetch off on Save-Data/slow net)
  if (env.saveData) reasons.push('Save-Data active: Tier 0 kept, prefetching disabled');
  if (slowNet) reasons.push(`Slow connection (${env.effectiveType}): Tier 0 only, prefetching disabled`);
  if (!env.featureEnabled) reasons.push('features.experience is disabled');
  if (env.urlOffParam) reasons.push('URL parameter ?experience=off is active');
  if (env.optOutStorage) reasons.push('User opted out via experience_opt_out');
  if (typeof env.deviceMemory === 'number' && env.deviceMemory < 4) {
    reasons.push(`Low deviceMemory (${env.deviceMemory} GB < 4 GB)`);
  }
  if (typeof env.hardwareConcurrency === 'number' && env.hardwareConcurrency < 4) {
    reasons.push(`Low hardwareConcurrency (${env.hardwareConcurrency} < 4 cores)`);
  }
  if (env.viewportWidth < 360) {
    reasons.push(`Viewport width ${env.viewportWidth}px < 360px`);
  }
  if (!env.pageVisible) {
    reasons.push('Page is currently hidden');
  }

  const tier1Blocked =
    !env.featureEnabled ||
    env.urlOffParam ||
    env.optOutStorage ||
    env.saveData ||
    slowNet ||
    (typeof env.deviceMemory === 'number' && env.deviceMemory < 4) ||
    (typeof env.hardwareConcurrency === 'number' && env.hardwareConcurrency < 4) ||
    env.viewportWidth < 360 ||
    !env.pageVisible;

  if (env.downgradedTier === 0) {
    reasons.push('Runtime frame monitor downgraded to Tier 0 for this session');
    return { tier: 0, fxEnabled: !env.optOutStorage, reducedMotion: false, prefetchAllowed, reasons };
  }

  if (tier1Blocked) {
    return { tier: 0, fxEnabled: !env.optOutStorage, reducedMotion: false, prefetchAllowed, reasons };
  }

  if (env.downgradedTier === 1) {
    reasons.push('Runtime frame monitor downgraded to Tier 1 for this session');
    return { tier: 1, fxEnabled: true, reducedMotion: false, prefetchAllowed, reasons };
  }

  if (!env.webgl2Supported) {
    reasons.push('WebGL2 context unavailable (capped at Tier 1)');
    return { tier: 1, fxEnabled: true, reducedMotion: false, prefetchAllowed, reasons };
  }

  return {
    tier: 2,
    fxEnabled: true,
    reducedMotion: false,
    prefetchAllowed,
    reasons,
  };
}
