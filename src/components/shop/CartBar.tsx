import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, m } from 'motion/react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import type { ClientConfig } from '../../config/schema';
import type { CatalogResponse } from '../../api/client';
import { formatINR } from '../../shared/money';
import { computeQuote } from '../../shared/quote';
import { EASE_OUT, MOTION_DURATIONS } from '../../shared/motion';
import { useCartStore } from '../../stores/cart';
import { useAuthStore } from '../../stores/auth';
import { useUiStore } from '../../stores/ui';

export function CartBar({
  config,
  catalog,
}: {
  config: ClientConfig;
  catalog: CatalogResponse | null;
}) {
  const lines = useCartStore((s) => s.lines);
  const draft = useCartStore((s) => s.draft);
  const buyer = useAuthStore((s) => s.buyer);
  const lastPincode = useUiStore((s) => s.lastPincode);

  const count = lines.reduce((sum, l) => sum + l.qty, 0);
  const visible = count > 0;

  useEffect(() => {
    document.documentElement.style.setProperty('--cartbar-h', visible ? '68px' : '0px');
    return () => {
      document.documentElement.style.setProperty('--cartbar-h', '0px');
    };
  }, [visible]);

  let estTotalPaise = 0;
  if (visible && catalog) {
    const q = computeQuote({
      lines,
      buyerType: buyer?.wholesaleStatus === 'approved' ? 'wholesale' : 'retail',
      mode: draft.mode,
      pincode: lastPincode || draft.pincode,
      stateCode: draft.stateCode || config.legal.stateCode,
      config,
      catalog,
      sessionApprovedWholesale: buyer?.wholesaleStatus === 'approved',
      now: new Date(),
    });
    estTotalPaise = q.subtotal + q.taxExtra - q.discount;
  }

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: MOTION_DURATIONS.base, ease: EASE_OUT }}
          aria-live="polite"
          className="cartbar fixed left-3 right-3 md:hidden z-30 bottom-[calc(var(--bottomnav-h)+10px+env(safe-area-inset-bottom))]"
        >
          <Link
            to="/cart"
            data-cart-target="mobile-bar"
            className="pressable group flex min-h-[56px] items-center justify-between rounded-2xl bg-[var(--ink)] px-3.5 py-2 text-white shadow-[var(--sh-2)] border border-white/10"
          >
            <div className="flex items-center gap-3 min-w-0">
              <ShoppingBag className="h-5 w-5 text-[var(--accent-soft)] shrink-0" aria-hidden="true" />
              <div className="leading-tight min-w-0">
                <span data-cart-badge="mobile-bar" className="inline-block text-sm font-semibold tabular-nums">
                  {count} {count === 1 ? 'Item' : 'Items'}
                </span>
                <span className="block text-xs text-[var(--accent-soft)] tabular-nums truncate">
                  {estTotalPaise > 0 ? `${formatINR(estTotalPaise)} · Ready for dispatch` : 'View bag'}
                </span>
              </div>
            </div>
            <span className="inline-flex min-h-[40px] items-center gap-1 rounded-xl bg-[var(--primary)] group-hover:bg-[var(--primary-hover)] px-3.5 text-xs sm:text-sm font-semibold text-white whitespace-nowrap shrink-0 transition-colors">
              View bag <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </Link>
        </m.div>
      )}
    </AnimatePresence>
  );
}
