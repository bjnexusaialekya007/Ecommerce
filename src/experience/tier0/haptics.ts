export function triggerHaptic(
  _kind: 'add' | 'order' = 'add',
  opts?: { fxEnabled?: boolean; reducedMotion?: boolean }
): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  if (typeof navigator.vibrate !== 'function') return false;

  if (opts?.reducedMotion || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return false;
  }

  if (opts?.fxEnabled === false || document.documentElement.dataset.fx === 'off') {
    return false;
  }

  try {
    if (window.localStorage.getItem('experience_opt_out') === '1') return false;
  } catch {
    // ignore storage access errors
  }

  try {
    return Boolean(navigator.vibrate(10));
  } catch {
    return false;
  }
}
