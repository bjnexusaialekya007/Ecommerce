import { useState } from 'react';
import { Download } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export function PWAInstallButton({
  className = '',
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={`pressable inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-high)] px-3.5 text-xs font-semibold text-[var(--ink)] hover:border-[var(--primary)] hover:text-[var(--primary)] whitespace-nowrap shrink-0 transition-colors ${className}`.trim()}
      >
        <Download className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
        <span>{compact ? 'Install App' : 'Install Store App'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`pressable inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-high)] px-3.5 text-xs font-semibold text-[var(--ink)] whitespace-nowrap shrink-0 transition-colors ${className}`.trim()}
        >
          <Download className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          >
            <div className="w-full max-w-sm rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[var(--sh-2)] space-y-3">
              <h3 id="ios-install-title" className="font-display text-lg font-bold text-[var(--ink)]">
                Install on iPhone or iPad
              </h3>
              <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
                1. Tap the <strong>Share</strong> button in the Safari toolbar.
                <br />
                2. Scroll down and tap <strong>Add to Home Screen</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="pressable w-full min-h-[44px] rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-sm font-semibold text-white transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
