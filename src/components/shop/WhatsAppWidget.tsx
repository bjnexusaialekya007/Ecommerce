import { useState } from 'react';
import { X, MessageCircle, ExternalLink } from 'lucide-react';
import type { ClientConfig } from '../../config/schema';
import { getShopStatus } from '../../shared/calendar';
import { buildWhatsAppUrl, isPlaceholder, normalizeWaNumber } from '../../shared/whatsapp';
import { track } from '../../analytics/track';
import { useUiStore } from '../../stores/ui';
import { WhatsAppGlyph } from '../BrandIcon';

export function WhatsAppWidget({
  config,
  hidden = false,
}: {
  config: ClientConfig;
  hidden?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pushToast = useUiStore((s) => s.pushToast);

  if (!config.whatsapp.enabled || hidden) return null;

  const isPh = isPlaceholder(config.whatsapp.number) || !normalizeWaNumber(config.whatsapp.number);
  const shop = getShopStatus(config);

  const quickLinks = [
    { label: 'Ask about packs & freshness', kind: 'general' as const },
    { label: 'Track or modify an order', kind: 'track' as const },
    { label: 'Bulk & wholesale enquiry', kind: 'wholesale' as const },
  ];

  return (
    <div
      className="fixed right-4 z-40 print:hidden bottom-[calc(var(--cartbar-h)+var(--bottomnav-h)+14px+env(safe-area-inset-bottom))] md:bottom-6"
    >
      {open && (
        <div
          role="dialog"
          aria-label="WhatsApp order help"
          className="mb-3 w-[min(320px,calc(100vw-32px))] rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] shadow-[var(--sh-2)] overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2 bg-[var(--brand-whatsapp)] px-4 py-3 text-white">
            <div>
              <p className="text-sm font-bold leading-tight">{config.brand.name}</p>
              <p className="text-xs text-white/90">
                {shop.isOpenNow ? 'Typically replies within 15 min' : shop.reason}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close WhatsApp help"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-white hover:bg-black/15"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="p-3.5 space-y-2.5">
            {isPh && (
              <div className="rounded-lg bg-[var(--warn-bg)] px-2.5 py-2 text-xs text-[var(--warn-ink)]">
                DEV placeholder WhatsApp number active. Real wa.me links unlock once configured in <code className="font-mono">client.config.ts</code>.
              </div>
            )}

            <p className="text-xs text-[var(--ink-muted)]">Choose a topic to start a chat:</p>

            <div className="space-y-1.5">
              {quickLinks.map((q) => {
                const url = buildWhatsAppUrl(q.kind, {}, config);
                if (isPh || !url) {
                  return (
                    <button
                      key={q.kind}
                      type="button"
                      onClick={() => pushToast({ message: 'Placeholder WhatsApp number, configure in client.config.ts', tone: 'info' })}
                      className="flex w-full min-h-[44px] items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-high)] px-3 py-2 text-left text-sm font-medium text-[var(--ink)] transition-colors"
                    >
                      <span>{q.label}</span>
                      <span className="rounded bg-[var(--warn-bg)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--warn-ink)]">DEV</span>
                    </button>
                  );
                }
                return (
                  <a
                    key={q.kind}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track('click_contact', { channel: 'whatsapp', source: 'widget', context: q.kind }, config)}
                    className="pressable flex w-full min-h-[44px] items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-high)] px-3 py-2 text-left text-sm font-medium text-[var(--ink)] transition-colors"
                  >
                    <span>{q.label}</span>
                    <ExternalLink className="h-4 w-4 text-[var(--ink-muted)] shrink-0" aria-hidden="true" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="WhatsApp order help"
          className="pressable relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-whatsapp)] text-white shadow-[var(--sh-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]"
        >
          {open ? <MessageCircle className="h-6 w-6" aria-hidden="true" /> : <WhatsAppGlyph className="h-7 w-7" />}
          {isPh && (
            <span className="absolute -top-1 -right-1 rounded bg-[var(--warn-bg)] px-1 text-[9px] font-bold text-[var(--warn-ink)] border border-[var(--warn-ink)]/20">
              DEV
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
