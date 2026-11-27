import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

const PLAYED_KEY = 'hero_text_reveal_played';

export function animateHeroText(headingEl: HTMLElement | null): () => void {
  if (!headingEl || typeof window === 'undefined') return () => {};
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return () => {};
  try {
    if (window.sessionStorage.getItem(PLAYED_KEY) === '1') return () => {};
    window.sessionStorage.setItem(PLAYED_KEY, '1');
  } catch {
    // ignore storage limits
  }

  let split: SplitText | null = null;
  let tween: gsap.core.Tween | null = null;
  try {
    split = SplitText.create(headingEl, { type: 'lines', mask: 'lines' });
    tween = gsap.from(split.lines, {
      yPercent: 110,
      duration: 0.78,
      ease: 'expo.out',
      stagger: 0.08,
      clearProps: 'transform',
    });
  } catch {
    split?.revert();
  }

  return () => {
    tween?.kill();
    split?.revert();
  };
}
