import { track } from '../analytics/track';
import type { ClientConfig } from '../config/schema';
import { isPlaceholder } from '../shared/whatsapp';
import { useUiStore } from '../stores/ui';
import { BrandIcon } from './BrandIcon';

export function SocialLinks({ config }: { config: ClientConfig }) {
  const pushToast = useUiStore((s) => s.pushToast);
  const visible = config.social.filter((s) => !(import.meta.env.PROD && isPlaceholder(s.url)));
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((s) => {
        const label = s.platform.charAt(0).toUpperCase() + s.platform.slice(1);
        const ph = isPlaceholder(s.url);
        if (ph) {
          return (
            <button
              key={s.platform}
              type="button"
              aria-label={`${label} (placeholder)`}
              onClick={() => pushToast({ message: `Placeholder ${label} URL, set in client.config.ts`, tone: 'info' })}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-high)] text-[var(--ink)] hover:text-[var(--primary)] transition-colors"
            >
              <BrandIcon platform={s.platform} />
            </button>
          );
        }
        return (
          <a
            key={s.platform}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${label}, opens in a new tab`}
            onClick={() => track('click_social', { platform: s.platform }, config)}
            className="pressable inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-high)] text-[var(--ink)] hover:text-[var(--primary)] transition-colors"
          >
            <BrandIcon platform={s.platform} />
          </a>
        );
      })}
    </div>
  );
}
