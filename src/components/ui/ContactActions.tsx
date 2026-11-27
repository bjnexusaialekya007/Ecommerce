import { MapPin, Mail, MessageCircle, Phone } from 'lucide-react';
import { track } from '../../analytics/track';
import type { ClientConfig } from '../../config/schema';
import { getDirectionsUrl } from '../../shared/address';
import { buildWhatsAppUrl, isPlaceholder, type WaContext, type WaKind } from '../../shared/whatsapp';
import { useUiStore } from '../../stores/ui';

export function ContactActions({
  config,
  context,
  waKind = 'general',
  waCtx = {},
}: {
  config: ClientConfig;
  context: string;
  waKind?: WaKind;
  waCtx?: WaContext;
}) {
  const pushToast = useUiStore((s) => s.pushToast);
  const phonePlaceholder = isPlaceholder(config.contact.phone);
  const waUrl = buildWhatsAppUrl(waKind, waCtx, config);
  const waPlaceholder = isPlaceholder(config.whatsapp.number);
  const telHref = `tel:${config.contact.phone.replace(/\s+/g, '')}`;
  const directionsUrl = getDirectionsUrl(config);

  const handlePlaceholderClick = (label: string) => {
    pushToast({ message: `Placeholder ${label}, set it in client.config.ts`, tone: 'info' });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {phonePlaceholder ? (
        <button
          type="button"
          onClick={() => handlePlaceholderClick('phone')}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-high)] px-3.5 py-2 text-sm font-medium text-[var(--ink)] transition-colors"
        >
          <Phone className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
          <span>{config.contact.phone}</span>
          <span className="rounded bg-[var(--warn-bg)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--warn-ink)]">DEV</span>
        </button>
      ) : (
        <a
          href={telHref}
          onClick={() => track('click_contact', { method: 'call', context }, config)}
          className="pressable inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-high)] px-3.5 py-2 text-sm font-medium text-[var(--ink)] transition-colors"
        >
          <Phone className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
          <span>Call {config.contact.phone}</span>
        </a>
      )}

      {config.whatsapp.enabled && (
        waPlaceholder || !waUrl ? (
          <button
            type="button"
            onClick={() => handlePlaceholderClick('WhatsApp number')}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-high)] px-3.5 py-2 text-sm font-medium text-[var(--ink)] transition-colors"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            <span>WhatsApp</span>
            <span className="rounded bg-[var(--warn-bg)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--warn-ink)]">DEV</span>
          </button>
        ) : (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('click_contact', { method: 'whatsapp', context }, config)}
            className="pressable inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-high)] px-3.5 py-2 text-sm font-medium text-[var(--ink)] transition-colors"
          >
            <MessageCircle className="h-4 w-4 text-[var(--brand-whatsapp)]" aria-hidden="true" />
            <span>WhatsApp</span>
          </a>
        )
      )}

      <a
        href={`mailto:${config.contact.email}`}
        onClick={() => track('click_contact', { method: 'email', context }, config)}
        className="pressable inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-high)] px-3.5 py-2 text-sm font-medium text-[var(--ink)] transition-colors"
      >
        <Mail className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
        <span>Email</span>
      </a>

      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('click_contact', { method: 'directions', context }, config)}
        className="pressable inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-high)] px-3.5 py-2 text-sm font-medium text-[var(--ink)] transition-colors"
      >
        <MapPin className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
        <span>Directions</span>
      </a>
    </div>
  );
}
