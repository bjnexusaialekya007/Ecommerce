export interface ExperienceEnv {
  featureEnabled: boolean;
  prefersReducedMotion: boolean;
  saveData: boolean;
  effectiveType?: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  viewportWidth: number;
  webgl2Supported: boolean;
  pageVisible: boolean;
  optOutStorage: boolean;
  urlOffParam: boolean;
}

export interface GateDecision {
  load: boolean;
  reasons: string[];
}

export function shouldLoadExperience(env: ExperienceEnv): GateDecision {
  const reasons: string[] = [];

  if (!env.featureEnabled) reasons.push('features.experience is disabled');
  if (env.urlOffParam) reasons.push('URL parameter ?experience=off is active');
  if (env.optOutStorage) reasons.push('User opted out via experience_opt_out');
  if (env.prefersReducedMotion) reasons.push('prefers-reduced-motion: reduce');
  if (env.saveData) reasons.push('navigator.connection.saveData is enabled');
  if (env.effectiveType && env.effectiveType !== '4g') {
    reasons.push(`Slow connection (${env.effectiveType})`);
  }
  if (typeof env.deviceMemory === 'number' && env.deviceMemory < 4) {
    reasons.push(`Low deviceMemory (${env.deviceMemory} GB < 4 GB)`);
  }
  if (typeof env.hardwareConcurrency === 'number' && env.hardwareConcurrency < 4) {
    reasons.push(`Low hardwareConcurrency (${env.hardwareConcurrency} < 4 cores)`);
  }
  if (env.viewportWidth < 360) {
    reasons.push(`Viewport width ${env.viewportWidth}px < 360px`);
  }
  if (!env.webgl2Supported) {
    reasons.push('WebGL2 context unavailable');
  }
  if (!env.pageVisible) {
    reasons.push('Page is currently hidden');
  }

  return {
    load: reasons.length === 0,
    reasons,
  };
}

export function detectWebGL2(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return false;
    const lose = gl.getExtension('WEBGL_lose_context');
    lose?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function readRuntimeEnv(featureEnabled: boolean): ExperienceEnv {
  if (typeof window === 'undefined') {
    return {
      featureEnabled: false,
      prefersReducedMotion: true,
      saveData: false,
      viewportWidth: 0,
      webgl2Supported: false,
      pageVisible: false,
      optOutStorage: false,
      urlOffParam: false,
    };
  }

  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
    deviceMemory?: number;
  };
  let optOutStorage = false;
  try {
    optOutStorage = localStorage.getItem('experience_opt_out') === '1';
  } catch {
    // ignore
  }

  const params = new URLSearchParams(window.location.search);

  return {
    featureEnabled,
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
  };
}
