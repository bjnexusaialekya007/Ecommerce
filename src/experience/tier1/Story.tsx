import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const STORY_STEPS = [
  {
    step: '01',
    title: 'Small-batch roasting in pure cold-pressed oil',
    detail: 'Every tin of Bikaneri bhujia and Ratlami sev is tempered in controlled batches so crunch holds naturally for weeks.',
  },
  {
    step: '02',
    title: 'Nitrogen-flushed freshness pouches',
    detail: 'Moisture-barrier foil laminates seal aroma within two hours of cooling—never re-packed from open bins.',
  },
  {
    step: '03',
    title: 'Same-day dispatch across India',
    detail: 'Local orders deliver inside our pincode zones; all-India parcels ship by insured weight-slab courier with live tracking.',
  },
];

export default function Story({ enabled }: { enabled: boolean }) {
  const scopeRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!enabled || !scopeRef.current) return;
      const mm = gsap.matchMedia();

      mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
        const cards = gsap.utils.toArray<HTMLElement>('.story-step-card', scopeRef.current!);
        gsap.fromTo(
          cards,
          { opacity: 0.35, y: 18 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.18,
            duration: 0.45,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: scopeRef.current,
              start: 'top 78%',
              end: 'bottom 55%',
              scrub: 0.4,
            },
          }
        );
      });

      return () => mm.revert();
    },
    { scope: scopeRef, dependencies: [enabled] }
  );

  return (
    <section ref={scopeRef} className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 max-w-xl">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Craft &amp; Logistics</p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-[var(--ink)] mt-1">
          How your order reaches you crisp
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STORY_STEPS.map((s) => (
          <div
            key={s.step}
            className="story-step-card rounded-2xl border border-[var(--border-soft)]/70 hover:border-[var(--accent-border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-2.5 transition-colors"
          >
            <span className="inline-flex h-7 items-center rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] px-2.5 font-mono text-xs font-bold text-[var(--accent)]">
              {s.step}
            </span>
            <h3 className="font-display text-lg font-bold text-[var(--ink)]">{s.title}</h3>
            <p className="text-sm text-[var(--ink-muted)] leading-relaxed">{s.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
