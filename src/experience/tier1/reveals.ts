import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function mountTier1ImageReveals(scopeEl: HTMLElement | null): () => void {
  if (!scopeEl || typeof window === 'undefined') return () => {};
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return () => {};

  const mm = gsap.matchMedia();
  mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
    const targets = gsap.utils.toArray<HTMLElement>('[data-tier1-reveal]', scopeEl).slice(0, 2);
    for (const target of targets) {
      gsap.fromTo(
        target,
        { clipPath: 'inset(0 0 18% 0)' },
        {
          clipPath: 'inset(0 0 0% 0)',
          duration: 0.65,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: target,
            start: 'top 82%',
            once: true,
          },
        }
      );
    }
  });

  return () => mm.revert();
}
