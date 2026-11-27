/**
 * Single source of truth for UI motion tokens (Section A9 & K8).
 * Never use ease-in on UI. Only animate transform and opacity.
 */
export const MOTION_DURATIONS = {
  instant: 0.1,  // 100ms
  fast: 0.16,    // 160ms
  base: 0.24,    // 240ms
  slow: 0.36,    // 360ms
} as const;

export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const EASE_IN_OUT: [number, number, number, number] = [0.77, 0, 0.175, 1];

export const SHEET_SPRING = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 34,
  mass: 1,
};

export const STEPPER_SPRING = {
  type: 'spring' as const,
  stiffness: 520,
  damping: 30,
};

export function triggerLightHaptic(): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  if (document.documentElement.dataset.fx === 'off') return;
  try {
    if (window.localStorage.getItem('experience_opt_out') === '1') return;
  } catch {
    // ignore
  }
  navigator.vibrate?.(10);
}
