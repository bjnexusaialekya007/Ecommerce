import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { ClientConfig } from '../config/schema';
import { track } from '../analytics/track';
import {
  computeTier,
  readDowngradedTier,
  readTierEnv,
  writeDowngradedTier,
  type ExperienceTier,
  type TierDecision,
} from './tier';

export interface ExperienceContextValue extends TierDecision {
  config: ClientConfig;
  downgradedTier: ExperienceTier | null;
  downgrade: (reason: string) => ExperienceTier;
  resetDowngrade: () => void;
  refreshTier: () => void;
}

const DEFAULT_DECISION: TierDecision = {
  tier: 0,
  fxEnabled: true,
  reducedMotion: false,
  prefetchAllowed: true,
  reasons: [],
};

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

export function ExperienceProvider({
  config,
  children,
}: {
  config: ClientConfig;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const [downgradedTier, setDowngradedTier] = useState<ExperienceTier | null>(() => readDowngradedTier());
  const [rev, setRev] = useState(0);

  const decision = useMemo(() => {
    const env = readTierEnv({
      featureEnabled: config.features.experience,
      tier0Enabled: config.experience.tier0 ?? true,
      isAdminRoute: location.pathname.startsWith('/admin'),
      downgradedTier,
    });
    return computeTier(env);
  }, [config.features.experience, config.experience.tier0, location.pathname, location.search, downgradedTier, rev]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.dataset.fx = decision.fxEnabled && !decision.reducedMotion ? 'on' : 'off';
    root.dataset.tier = String(decision.tier);
    root.dataset.prefetch = decision.prefetchAllowed ? 'on' : 'off';
  }, [decision.fxEnabled, decision.reducedMotion, decision.tier, decision.prefetchAllowed]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setRev((n) => n + 1);
    mq.addEventListener?.('change', onChange);
    const onVis = () => setRev((n) => n + 1);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      mq.removeEventListener?.('change', onChange);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const downgrade = useCallback(
    (reason: string): ExperienceTier => {
      const current = decision.tier;
      const next: ExperienceTier = current === 2 ? 1 : 0;
      writeDowngradedTier(next);
      setDowngradedTier(next);
      track('experience_downgrade', { from_tier: current, to_tier: next, reason }, config);
      return next;
    },
    [decision.tier, config]
  );

  const resetDowngrade = useCallback(() => {
    writeDowngradedTier(null);
    setDowngradedTier(null);
  }, []);

  const refreshTier = useCallback(() => setRev((n) => n + 1), []);

  const value = useMemo<ExperienceContextValue>(
    () => ({
      ...decision,
      config,
      downgradedTier,
      downgrade,
      resetDowngrade,
      refreshTier,
    }),
    [decision, config, downgradedTier, downgrade, resetDowngrade, refreshTier]
  );

  return React.createElement(ExperienceContext.Provider, { value }, children);
}

export function useExperience(): ExperienceContextValue {
  const ctx = useContext(ExperienceContext);
  if (!ctx) {
    return {
      ...DEFAULT_DECISION,
      config: {} as ClientConfig,
      downgradedTier: null,
      downgrade: () => 0,
      resetDowngrade: () => {},
      refreshTier: () => {},
    };
  }
  return ctx;
}

export function useTier(): ExperienceTier {
  return useExperience().tier;
}
