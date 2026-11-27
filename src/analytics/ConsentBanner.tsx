import { Link } from 'react-router-dom';
import type { ClientConfig } from '../config/schema';
import { useConsentStore } from './consent';

export function ConsentBanner({ config }: { config: ClientConfig }) {
  const { bannerOpen, setDecision } = useConsentStore();

  // Do not show banner when no GA4 ID is configured (Section G1)
  if (!config.features.analytics || !config.analytics.ga4Id || !bannerOpen) {
    return null;
  }

  return (
    <aside
      aria-label="Cookie and analytics preferences"
      className="no-print fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-4 shadow-[var(--sh-2)]"
    >
      <p className="text-sm text-[var(--ink)]">
        We use essential storage for your cart and checkout. With your permission, we also use Google Analytics to improve store speed.{' '}
        <Link to="/policies/privacy" className="underline font-medium text-[var(--primary)]">
          Privacy policy
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setDecision(false)}
          className="flex-1 min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-high)] px-3 py-2 text-sm font-medium text-[var(--ink)] pressable transition-colors"
        >
          Reject
        </button>
        <button
          type="button"
          onClick={() => setDecision(true)}
          className="flex-1 min-h-[44px] rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] px-3 py-2 text-sm font-semibold text-white pressable transition-colors"
        >
          Accept analytics
        </button>
      </div>
    </aside>
  );
}
