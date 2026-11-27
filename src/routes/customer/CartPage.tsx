import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ArrowRight, TicketPercent, AlertCircle, Truck, CheckCircle2 } from 'lucide-react';
import { api } from '../../api';
import type { QuoteResponse } from '../../shared/quote';
import { formatINR, formatWeight } from '../../shared/money';
import { formatIstDateDisplay } from '../../shared/calendar';
import { useStore } from '../../stores/appContext';
import { useCartStore } from '../../stores/cart';
import { useAuthStore } from '../../stores/auth';
import { useUiStore } from '../../stores/ui';
import { Seo } from '../../seo/Seo';
import { ImageSlot } from '../../components/ui/ImageSlot';
import { VegMark } from '../../components/ui/VegMark';
import { Stepper } from '../../components/ui/Stepper';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/States';
import { PincodeChecker } from '../../components/shop/PincodeChecker';

export function CartPage() {
  const { config, catalog } = useStore();
  const buyer = useAuthStore((s) => s.buyer);
  const isWholesale = Boolean(buyer?.wholesaleStatus === 'approved' && config.features.wholesale);

  const lines = useCartStore((s) => s.lines);
  const couponCode = useCartStore((s) => s.couponCode);
  const draft = useCartStore((s) => s.draft);
  const setQty = useCartStore((s) => s.setQty);
  const removeLine = useCartStore((s) => s.removeLine);
  const restoreLine = useCartStore((s) => s.restoreLine);
  const replaceLines = useCartStore((s) => s.replaceLines);
  const clearCart = useCartStore((s) => s.clearCart);
  const setCouponCode = useCartStore((s) => s.setCouponCode);
  const updateDraft = useCartStore((s) => s.updateDraft);
  const lastPincode = useUiStore((s) => s.lastPincode);
  const pushToast = useUiStore((s) => s.pushToast);

  const navigate = useNavigate();
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [couponInput, setCouponInput] = useState(couponCode);
  const [removedBanner, setRemovedBanner] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activePin = lastPincode || draft.pincode || '';

  useEffect(() => {
    if (!lines.length) {
      setQuote(null);
      return;
    }
    let active = true;
    setLoading(true);
    api
      .quoteCart({
        lines,
        mode: draft.mode,
        pincode: activePin,
        stateCode: draft.stateCode || config.legal.stateCode,
        couponCode,
        gstin: draft.gstin || buyer?.gstin,
      })
      .then((q) => {
        if (!active) return;
        setQuote(q);
        // Sync if any SKU became unavailable and was dropped by server quote
        const validIds = new Set(q.lines.map((l) => l.skuId));
        if (catalog && q.lines.length < lines.length) {
          const validLines = lines.filter((l) => validIds.has(l.skuId));
          replaceLines(validLines, 'One or more unavailable packs were removed from your cart.');
          setRemovedBanner('Some unavailable items were automatically removed.');
        }
      })
      .catch(() => {
        // leave previous quote
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [lines, draft.mode, activePin, draft.stateCode, couponCode, draft.gstin, buyer?.gstin]);

  const handleRemove = (skuId: string, label: string) => {
    const removed = removeLine(skuId);
    if (removed) {
      pushToast({
        message: `Removed ${label}`,
        tone: 'info',
        undoAction: () => restoreLine(removed),
      });
    }
  };

  if (lines.length === 0) {
    return (
      <>
        <Seo route="noindex" path="/cart" config={config} />
        <div className="mx-auto max-w-4xl px-4 py-12">
          <EmptyState
            title="Your cart is empty"
            body="Explore freshly fried Aloo Bhujia, Ratlami Laung Sev, Mixtures, and Butter Murukku."
            actionLabel="Browse snacks"
            onAction={() => navigate('/shop')}
          />
        </div>
      </>
    );
  }

  const totalPacks = lines.reduce((sum, l) => sum + l.qty, 0);
  const freeTarget = config.freeShippingAbovePaise ?? null;
  const remainingFree = quote?.amountToFreeShippingPaise ?? null;
  const freePct =
    freeTarget && quote
      ? remainingFree === 0
        ? 100
        : Math.min(99, Math.max(0, Math.round((quote.subtotal / freeTarget) * 100)))
      : null;

  return (
    <>
      <Seo route="noindex" path="/cart" config={config} />

      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-display text-3xl font-bold text-[var(--ink)]">Checkout Flow</h1>
            {isWholesale && (
              <p className="text-xs font-semibold text-[var(--accent)] mt-1">
                Wholesale billing active · prices excl. GST until summary
              </p>
            )}
          </div>
          <Link to="/shop" className="text-sm font-semibold text-[var(--primary)] hover:underline whitespace-nowrap">
            Continue shopping
          </Link>
        </div>

        {/* 3-Step Flow Indicator */}
        <nav aria-label="Checkout steps" className="rounded-full bg-[var(--surface-low)] border border-[var(--border-soft)] px-3 py-2 flex items-center justify-between gap-2 overflow-x-auto text-xs font-semibold">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-3.5 py-1.5 text-white shadow-[var(--sh-1)] whitespace-nowrap shrink-0">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[var(--primary)] text-[11px] font-bold">1</span>
            <span>Bag &amp; Review</span>
          </span>
          <span className="h-px flex-1 min-w-[16px] bg-[var(--border)]/60" aria-hidden="true" />
          {quote?.ok ? (
            <Link
              to="/checkout"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[var(--primary)] hover:underline whitespace-nowrap shrink-0"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--primary)] text-[11px] font-bold">2</span>
              <span>Delivery</span>
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[var(--ink-muted)] whitespace-nowrap shrink-0">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--ink-muted)] text-[11px] font-bold">2</span>
              <span>Delivery</span>
            </span>
          )}
          <span className="h-px flex-1 min-w-[16px] bg-[var(--border)]/60" aria-hidden="true" />
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[var(--ink-muted)] whitespace-nowrap shrink-0">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--ink-muted)] text-[11px] font-bold">3</span>
            <span>Payment</span>
          </span>
        </nav>

        {/* Pistachio Free Express Delivery Progress Banner */}
        {quote && freeTarget !== null && freePct !== null && (
          <div className="rounded-2xl bg-[var(--accent-soft)] p-4 text-[var(--on-secondary-container)] shadow-[var(--sh-1)] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--on-secondary-fixed)] tabular-nums">
                <Truck className="h-4 w-4 text-[var(--accent)] shrink-0" aria-hidden="true" />
                <span>
                  {remainingFree === 0
                    ? `Free delivery threshold unlocked (${formatINR(quote.subtotal)})`
                    : `Almost there! ${formatINR(quote.subtotal)} / ${formatINR(freeTarget)}`}
                </span>
              </p>
              <span className="rounded-full bg-[var(--surface)]/90 px-2.5 py-0.5 text-xs font-bold text-[var(--accent)] tabular-nums">
                {freePct}% reached
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-[var(--surface)]/80 overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300"
                style={{ width: `${freePct}%` }}
              />
            </div>
            {remainingFree !== null && remainingFree > 0 && (
              <p className="text-xs leading-snug text-[var(--on-secondary-container)] tabular-nums">
                Add <strong className="text-[var(--primary)]">{formatINR(remainingFree)}</strong> more for free Express Delivery.
              </p>
            )}
          </div>
        )}

        {removedBanner && (
          <div className="flex items-center gap-2 rounded-xl bg-[var(--warn-bg)] px-4 py-3 text-sm text-[var(--warn-ink)]">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{removedBanner}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Cart lines */}
          <div className="lg:col-span-7 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <h2 className="font-display text-xl font-bold text-[var(--ink)]">Selected Batches</h2>
                <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-semibold text-[var(--primary)] tabular-nums">
                  {totalPacks} {totalPacks === 1 ? 'Pack' : 'Packs'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearCart();
                  pushToast({ message: 'Cleared all batches from cart', tone: 'info' });
                }}
                className="text-xs font-semibold text-[var(--primary)] hover:underline min-h-[36px] px-1 whitespace-nowrap"
              >
                Clear All
              </button>
            </div>

            {(quote?.lines || []).map((line) => {
              const sku = catalog?.skus.find((s) => s.id === line.skuId);
              const prod = catalog?.products.find((p) => p.id === sku?.productId);
              const maxAllowed = Math.min(sku?.stockQty ?? 50, isWholesale ? 500 : config.maxQtyPerOrder);
              return (
                <div
                  key={line.skuId}
                  className="flex gap-3.5 rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-3.5 shadow-[var(--sh-1)]"
                >
                  <Link to={`/p/${line.productSlug}`} className="relative w-20 shrink-0">
                    <ImageSlot src={line.imageUrl} alt={line.name} label={line.name} aspect="1/1" className="rounded-xl" />
                    <div className="absolute top-1.5 left-1.5 rounded bg-[var(--surface)]/92 p-0.5">
                      <VegMark veg={prod?.veg ?? true} />
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link to={`/p/${line.productSlug}`} className="font-display text-base font-bold text-[var(--ink)] hover:text-[var(--primary)] block truncate">
                          {line.name}
                        </Link>
                        <p className="text-xs text-[var(--ink-muted)] tabular-nums">
                          {sku?.packLabel ? `${sku.packLabel} · ` : ''}{formatINR(line.unitPaise)} / pack · {formatWeight(line.shipWeightG)} shipped
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemove(line.skuId, line.name)}
                        aria-label={`Remove ${line.name}`}
                        className="p-2 text-[var(--ink-muted)] hover:text-[var(--danger)] min-h-[44px] min-w-[44px] inline-flex items-center justify-center shrink-0"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold text-base tabular-nums text-[var(--ink)]">
                        {formatINR(line.lineSubtotal)}
                      </span>
                      <Stepper
                        qty={line.qty}
                        max={maxAllowed}
                        itemName={line.name}
                        onChange={(n) => {
                          if (n <= 0) handleRemove(line.skuId, line.name);
                          else setQty(line.skuId, n);
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pincode & mode check */}
            <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-4 shadow-[var(--sh-1)] space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-2">
                  Fulfilment mode
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['local', 'Local Delivery'],
                      ['courier', 'All-India Courier'],
                      ['pickup', 'Store Pickup'],
                    ] as const
                  ).map(([m, label]) => {
                    const info = quote?.availableModes.find((am) => am.mode === m);
                    const disabled = info ? !info.enabled : false;
                    return (
                      <button
                        key={m}
                        type="button"
                        disabled={disabled}
                        onClick={() => updateDraft({ mode: m })}
                        className={`min-h-[44px] rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
                          draft.mode === m
                            ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-[var(--sh-1)]'
                            : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink)] hover:bg-[var(--surface-high)] disabled:opacity-45'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <PincodeChecker config={config} weightG={quote?.shipWeightG || 500} onChecked={(p) => updateDraft({ pincode: p })} />
            </div>
          </div>

          {/* Summary Column */}
          <aside className="lg:col-span-5 rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-4">
            <h2 className="font-display text-xl font-bold text-[var(--ink)]">Order summary</h2>

            {/* Applied Coupon Savings Card in Pistachio */}
            {quote?.appliedCoupon && quote.discount > 0 && (
              <div className="rounded-xl bg-[var(--accent-soft)] p-3 flex items-center justify-between gap-2 text-[var(--on-secondary-fixed)]">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="h-4 w-4 text-[var(--accent)] shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold tabular-nums">{formatINR(quote.discount)} saved!</p>
                    <p className="text-[11px] text-[var(--on-secondary-container)] truncate">Coupon {quote.appliedCoupon} applied</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCouponInput('');
                    setCouponCode('');
                  }}
                  className="text-xs font-bold uppercase tracking-wide text-[var(--accent)] hover:underline px-2 py-1 shrink-0"
                >
                  Remove
                </button>
              </div>
            )}

            {/* Coupon */}
            {config.features.coupons && !quote?.appliedCoupon && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setCouponCode(couponInput.trim().toUpperCase());
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <TicketPercent className="h-4 w-4 text-[var(--ink-muted)] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <input
                    type="text"
                    aria-label="Coupon code"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Coupon (e.g. NAMKEEN10)"
                    className="min-h-[44px] w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] focus:bg-[var(--surface)] focus:border-[var(--primary)] pl-9 pr-3 text-sm uppercase font-mono transition-colors"
                  />
                </div>
                <Button type="submit" variant="secondary">
                  Apply
                </Button>
              </form>
            )}

            {/* Errors / warnings from quote engine */}
            {quote?.errors.map((err, i) => (
              <p key={i} className="rounded-lg bg-[var(--danger-bg)] px-3 py-2 text-xs text-[var(--danger-ink)] font-medium">
                {err.message}
              </p>
            ))}

            {quote && (
              <dl className="space-y-2 text-sm tabular-nums border-t border-[var(--border-soft)] pt-3">
                <div className="flex justify-between">
                  <dt className="text-[var(--ink-muted)]">Items total ({formatWeight(quote.shipWeightG)} shipped)</dt>
                  <dd className="font-medium">{formatINR(quote.subtotal)}</dd>
                </div>
                {quote.discount > 0 && (
                  <div className="flex justify-between text-[var(--success)]">
                    <dt>Coupon ({quote.appliedCoupon})</dt>
                    <dd>−{formatINR(quote.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-[var(--ink-muted)]">Shipping ({draft.mode})</dt>
                  <dd className="font-medium">{quote.shipping === 0 ? 'Free' : formatINR(quote.shipping)}</dd>
                </div>
                {quote.isInterState ? (
                  <div className="flex justify-between text-xs text-[var(--ink-muted)]">
                    <dt>IGST {quote.pricesInclusive ? '(included in prices)' : '(added)'}</dt>
                    <dd>{formatINR(quote.igst)}</dd>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-xs text-[var(--ink-muted)]">
                      <dt>CGST {quote.pricesInclusive ? '(included)' : '(added)'}</dt>
                      <dd>{formatINR(quote.cgst)}</dd>
                    </div>
                    <div className="flex justify-between text-xs text-[var(--ink-muted)]">
                      <dt>SGST {quote.pricesInclusive ? '(included)' : '(added)'}</dt>
                      <dd>{formatINR(quote.sgst)}</dd>
                    </div>
                  </>
                )}
                <div className="flex justify-between border-t border-[var(--border-soft)] pt-2.5 text-base font-bold text-[var(--ink)]">
                  <dt>Total payable</dt>
                  <dd>{formatINR(quote.total)}</dd>
                </div>
                <p className="text-[11px] text-[var(--ink-muted)]">
                  Estimated dispatch: {formatIstDateDisplay(quote.dispatchBy)}
                </p>
              </dl>
            )}

            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={loading || !quote?.ok}
              onClick={() => navigate('/checkout')}
            >
              <span>Proceed to checkout · {quote ? formatINR(quote.total) : '…'}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </aside>
        </div>
      </div>
    </>
  );
}
