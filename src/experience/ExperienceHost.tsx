import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { shouldLoadExperience, readRuntimeEnv, type GateDecision } from './gate';
import { useExperience } from './index';
import type { HeroSceneController, HeroSceneMetrics } from './tier2/HeroScene';

export const experienceTelemetry: {
  decision: GateDecision | null;
  metrics: HeroSceneMetrics | null;
  controller: HeroSceneController | null;
} = {
  decision: null,
  metrics: null,
  controller: null,
};

export function ExperienceHost({
  enabled,
  heroMode = '3d',
  heroModelUrl = '',
  pauseControl = true,
  heroImageUrl,
  heroAlt,
}: {
  enabled: boolean;
  heroMode?: '3d' | 'text' | 'image';
  heroModelUrl?: string;
  pauseControl?: boolean;
  heroImageUrl: string;
  heroAlt: string;
}) {
  const { tier, fxEnabled, reducedMotion, downgrade } = useExperience();
  const stageRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<HeroSceneController | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [paused, setPaused] = useState(false);

  const allowProceduralHero = enabled && heroMode === '3d' && !heroModelUrl.trim() && tier === 2;

  const [decision, setDecision] = useState<GateDecision>(() => {
    const d = shouldLoadExperience(readRuntimeEnv(allowProceduralHero));
    experienceTelemetry.decision = d;
    return d;
  });

  useEffect(() => {
    const nextDecision = shouldLoadExperience(readRuntimeEnv(allowProceduralHero));
    setDecision(nextDecision);
    experienceTelemetry.decision = nextDecision;

    if (!nextDecision.load || !stageRef.current) {
      setSceneReady(false);
      return;
    }

    let cancelled = false;
    const mount = async () => {
      try {
        const mod = await import('./tier2/HeroScene');
        if (cancelled || !stageRef.current) return;
        const ctrl = mod.mountHeroScene(stageRef.current, {
          onMetrics: (m) => {
            experienceTelemetry.metrics = m;
            setPaused(m.paused);
          },
          onFallback: (reason) => {
            setSceneReady(false);
            downgrade(reason || 'frame_budget_exceeded');
          },
        });
        controllerRef.current = ctrl;
        experienceTelemetry.controller = ctrl;
        setSceneReady(true);
      } catch {
        setSceneReady(false);
      }
    };

    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
    let raf1 = 0;
    let raf2 = 0;
    let idleId = 0;
    let timeoutId = 0;

    // Double-rAF guarantees the static poster image has completed first paint before scheduling idle 3D import
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (cancelled) return;
        if (ric) {
          idleId = ric(() => void mount(), { timeout: 900 });
        } else {
          timeoutId = window.setTimeout(() => void mount(), 220);
        }
      });
    });

    return () => {
      cancelled = true;
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      if (idleId && (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback) {
        (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(idleId);
      }
      if (timeoutId) window.clearTimeout(timeoutId);
      controllerRef.current?.dispose();
      controllerRef.current = null;
      experienceTelemetry.controller = null;
      setSceneReady(false);
    };
  }, [allowProceduralHero, downgrade]);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[var(--surface-2)] border border-[var(--border-soft)] shadow-[var(--sh-1)]">
      {/* Static poster always paints first as LCP; Tier 0 hero-settle eases scale 1.04 -> 1 once */}
      <img
        src={heroImageUrl}
        alt={heroAlt}
        width={1200}
        height={900}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        className={`h-full w-full object-cover transition-opacity duration-[var(--dur-slow)] ${
          fxEnabled && !reducedMotion ? 'hero-settle' : ''
        } ${sceneReady ? 'opacity-25' : 'opacity-100'}`}
      />

      {/* Lazy WebGL stage layered over static poster (Tier 2 only) */}
      {decision.load && (
        <div
          ref={stageRef}
          className={`absolute inset-0 transition-opacity duration-[var(--dur-slow)] ${
            sceneReady ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />
      )}

      {/* Subtle Pause / Play control when 3D scene is active */}
      {sceneReady && pauseControl && (
        <button
          type="button"
          onClick={() => {
            if (paused) controllerRef.current?.resume();
            else controllerRef.current?.pause();
          }}
          aria-label={paused ? 'Play 3D showcase' : 'Pause 3D showcase'}
          className="pressable absolute bottom-3 right-3 z-10 inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full bg-[var(--surface)]/90 px-3 text-xs font-semibold text-[var(--ink)] border border-[var(--border-soft)] shadow-[var(--sh-1)]"
        >
          {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
          <span>{paused ? 'Play' : 'Pause'}</span>
        </button>
      )}
    </div>
  );
}
