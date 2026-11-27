import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, LocateFixed, Lock, ReceiptIndianRupee, ShieldCheck, Truck, User } from 'lucide-react';
import { api } from '../../api';
import type { QuoteResponse } from '../../shared/quote';
import { INDIAN_STATES, lookupStateByPincode } from '../../shared/constants';
import { formatINR, validateGSTIN, validateIndianPhone } from '../../shared/money';
import { CreateOrderSchema, type CreateOrderInput } from '../../shared/schemas';
import { useExperience } from '../../experience';
import { triggerHaptic } from '../../experience/tier0/haptics';
import { useStore } from '../../stores/appContext';
import { useCartStore } from '../../stores/cart';
import { useAuthStore } from '../../stores/auth';
import { useUiStore } from '../../stores/ui';
import { Seo } from '../../seo/Seo';
import { getStoredAttribution, track } from '../../analytics/track';
import { Button } from '../../components/ui/Button';
import { Input, PhoneInput, PincodeInput, Select, Textarea } from '../../components/ui/Input';
import { TurnstileWidget } from '../../components/shop/TurnstileWidget';

const RazorpayCheckoutMock = lazy(() => import('../../components/shop/RazorpayCheckoutMock'));

export function CheckoutPage() {
  const { config } = useStore();
  const { fxEnabled, reducedMotion } = useExperience();
  const buyer = useAuthStore((s) => s.buyer);
  const rememberOrderAccess = useAuthStore((s) => s.rememberOrderAccess);
  const isWholesale = Boolean(buyer?.wholesaleStatus === 'approved' && config.features.wholesale);

  const lines = useCartStore((s) => s.lines);
  const couponCode = useCartStore((s) => s.couponCode);
  const draft = useCartStore((s) => s.draft);
  const updateDraft = useCartStore((s) => s.updateDraft);
  const clearCart = useCartStore((s) => s.clearCart);
  const pushToast = useUiStore((s) => s.pushToast);

  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('razorpay');
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Payment modal state
  const [payModal, setPayModal] = useState<{
    publicCode: string;
    last4: string;
    razorpayOrderId: string;
    amountPaise: number;
  } | null>(null);

  const idempotencyKey = useMemo(
    () => `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    [lines.length]
  );

  // Autofill wholesale buyer details if empty
  useEffect(() => {
    if (buyer) {
      updateDraft({
        customerName: draft.customerName || buyer.name,
        phone: draft.phone || buyer.phone,
        email: draft.email || buyer.email,
        gstin: draft.gstin || buyer.gstin || '',
        businessName: draft.businessName || buyer.businessName || '',
        stateCode: draft.stateCode || buyer.stateCode,
      });
    }
  }, [buyer?.id]);

  // Quote revalidation whenever mode/pincode/state/gstin changes
  useEffect(() => {
    if (lines.length === 0) return;
    let active = true;
    api
      .quoteCart({
        lines,
        mode: draft.mode,
        pincode: draft.pincode,
        stateCode: draft.stateCode || config.legal.stateCode,
        couponCode,
        gstin: draft.gstin || buyer?.gstin,
      })
      .then((q) => {
        if (active) setQuote(q);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [lines, draft.mode, draft.pincode, draft.stateCode, couponCode, draft.gstin]);

  useEffect(() => {
    if (quote && lines.length > 0) {
      track(
        'begin_checkout',
        {
          currency: 'INR',
          value: quote.total / 100,
          coupon: quote.appliedCoupon || undefined,
          items: quote.lines.map((l) => ({
            item_id: l.skuCode,
            item_name: l.name,
            item_variant: l.packLabel,
            price: l.unitPaise / 100,
            quantity: l.qty,
          })),
        },
        config
      );
    }
  }, [quote?.total]);

  const handlePincodeChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 6);
    const patch: Partial<typeof draft> = { pincode: clean };
    const matched = lookupStateByPincode(clean);
    if (matched) patch.stateCode = matched.stateCode;
    updateDraft(patch);
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      pushToast({ message: 'Location not available in this browser — enter pincode manually.', tone: 'info' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        updateDraft({ pincode: '500012', stateCode: '36', mode: 'local' });
        pushToast({ message: 'Detected Hyderabad local zone (500012). Verify your street address.', tone: 'success' });
      },
      () => {
        pushToast({ message: 'Location permission declined — type your address and 6-digit pincode.', tone: 'info' });
      },
      { timeout: 6000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const errs: Record<string, string> = {};
    if (!draft.customerName.trim() || draft.customerName.trim().length < 2) errs.customerName = 'Enter your full name.';
    if (!validateIndianPhone(draft.phone)) errs.phone = 'Enter a valid 10-digit Indian mobile number.';
    if (draft.mode !== 'pickup') {
      if (!draft.addressLine1.trim() || draft.addressLine1.trim().length < 5) {
        errs.addressLine1 = 'Enter house no., street, and locality.';
      }
      if (!/^\d{6}$/.test(draft.pincode.trim())) {
        errs.pincode = 'Enter a valid 6-digit pincode.';
      }
    }
    if (isWholesale && !validateGSTIN(draft.gstin)) {
      errs.gstin = 'Valid 15-character GSTIN is required for wholesale GST invoice.';
    } else if (draft.gstin && !validateGSTIN(draft.gstin)) {
      errs.gstin = 'Invalid 15-character GSTIN checksum.';
    }
    if (!turnstileToken) errs.turnstile = 'Please tick the human verification box.';
    if (!acceptTerms) errs.acceptTerms = 'Please accept the Terms & Refund Policy.';

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    const input: CreateOrderInput = {
      lines,
      mode: draft.mode,
      paymentMethod,
      customerName: draft.customerName.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      addressLine1: draft.addressLine1.trim(),
      addressLine2: draft.addressLine2.trim(),
      landmark: draft.landmark.trim(),
      pincode: draft.pincode.trim(),
      stateCode: draft.stateCode || config.legal.stateCode,
      gstin: draft.gstin.trim() || undefined,
      businessName: draft.businessName.trim() || undefined,
      couponCode: couponCode || undefined,
      notes: draft.notes.trim() || undefined,
      acceptTerms: true,
      turnstileToken,
      honeypot,
      attribution: getStoredAttribution(),
    };

    const parsed = CreateOrderSchema.safeParse(input);
    if (!parsed.success) {
      const nextErrs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        nextErrs[String(issue.path[0] || 'form')] = issue.message;
      }
      setFieldErrors(nextErrs);
      return;
    }

    setSubmitting(true);
    try {
      const order = await api.createOrder(parsed.data, idempotencyKey);
      const last4 = order.phone.slice(-4);
      rememberOrderAccess(order.publicCode, last4);

      if (paymentMethod === 'cod') {
        clearCart();
        triggerHaptic('order', { fxEnabled, reducedMotion });
        track(
          'purchase',
          {
            transaction_id: order.publicCode,
            currency: 'INR',
            value: order.total / 100,
            shipping: order.shipping / 100,
            tax: order.tax / 100,
          },
          config
        );
        navigate(`/order/${order.publicCode}`);
      } else {
        const rzp = await api.createRazorpayOrder(order.publicCode);
        setPayModal({
          publicCode: order.publicCode,
          last4,
          razorpayOrderId: rzp.razorpayOrderId,
          amountPaise: rzp.amountPaise,
        });
      }
    } catch (err) {
      pushToast({ message: err instanceof Error ? err.message : 'Unable to create order.', tone: 'danger' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Seo route="noindex" path="/checkout" config={config} />

      <div className="mx-auto max-w-6xl px-4 py-6 space-y-5">
        <div className="space-y-4">
          <h1 className="font-display text-3xl font-bold text-[var(--ink)]">Checkout</h1>
          <nav aria-label="Checkout steps" className="rounded-full bg-[var(--surface-low)] border border-[var(--border-soft)] px-3 py-2 flex items-center justify-between gap-2 overflow-x-auto text-xs font-semibold">
            <Link to="/cart" className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[var(--accent)] hover:underline whitespace-nowrap shrink-0">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)] text-[11px] font-bold">1</span>
              <span>Bag &amp; Review</span>
            </Link>
            <span className="h-px flex-1 min-w-[16px] bg-[var(--primary)]/40" aria-hidden="true" />
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-3.5 py-1.5 text-white shadow-[var(--sh-1)] whitespace-nowrap shrink-0">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[var(--primary)] text-[11px] font-bold">2</span>
              <span>Delivery &amp; GST</span>
            </span>
            <span className="h-px flex-1 min-w-[16px] bg-[var(--border)]/60" aria-hidden="true" />
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[var(--ink-muted)] whitespace-nowrap shrink-0">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--ink-muted)] text-[11px] font-bold">3</span>
              <span>Payment</span>
            </span>
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Form Columns */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Contact */}
            <section className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-[var(--primary)]" aria-hidden="true" />
                <h2 className="font-display text-lg font-bold text-[var(--ink)]">1. Contact details</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full name"
                  autoComplete="name"
                  value={draft.customerName}
                  onChange={(e) => updateDraft({ customerName: e.target.value })}
                  error={fieldErrors.customerName}
                  required
                />
                <PhoneInput
                  label="Mobile number (for delivery & tracking)"
                  value={draft.phone}
                  onChange={(e) => updateDraft({ phone: e.target.value })}
                  error={fieldErrors.phone}
                  required
                />
              </div>
              <Input
                label="Email address (optional, for tax invoice copy)"
                type="email"
                autoComplete="email"
                value={draft.email}
                onChange={(e) => updateDraft({ email: e.target.value })}
                error={fieldErrors.email}
              />
            </section>

            {/* Step 2: Delivery / Fulfilment */}
            <section className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-[var(--primary)]" aria-hidden="true" />
                  <h2 className="font-display text-lg font-bold text-[var(--ink)]">2. Delivery &amp; address</h2>
                </div>
                <button
                  type="button"
                  onClick={handleUseLocation}
                  className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-[var(--primary)] hover:underline whitespace-nowrap"
                >
                  <LocateFixed className="h-4 w-4" aria-hidden="true" />
                  <span>Use current location</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(
                  [
                    ['local', 'Local Delivery', 'Same/next day'],
                    ['courier', 'All-India Courier', 'Weight-slab shipping'],
                    ['pickup', 'Store Pickup', 'Free at counter'],
                  ] as const
                ).map(([m, title, sub]) => {
                  const info = quote?.availableModes.find((am) => am.mode === m);
                  const disabled = info ? !info.enabled : false;
                  const active = draft.mode === m;
                  return (
                    <label
                      key={m}
                      className={`cursor-pointer rounded-xl border p-3 text-sm transition-colors ${
                        active
                          ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-[var(--sh-1)]'
                          : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink)] hover:bg-[var(--surface-high)]'
                      } ${disabled ? 'opacity-45 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="radio"
                        name="fulfilmentMode"
                        value={m}
                        checked={active}
                        disabled={disabled}
                        onChange={() => updateDraft({ mode: m })}
                        className="sr-only"
                      />
                      <span className="block font-bold">{title}</span>
                      <span className={`block text-xs mt-0.5 ${active ? 'text-[var(--on-primary-container)]' : 'text-[var(--ink-muted)]'}`}>
                        {info?.reason || sub}
                      </span>
                    </label>
                  );
                })}
              </div>

              {draft.mode !== 'pickup' && (
                <div className="space-y-4 pt-1">
                  <Input
                    label="Flat, House no., Street / Locality"
                    autoComplete="street-address"
                    value={draft.addressLine1}
                    onChange={(e) => updateDraft({ addressLine1: e.target.value })}
                    error={fieldErrors.addressLine1}
                    required
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Landmark (optional)"
                      value={draft.landmark}
                      onChange={(e) => updateDraft({ landmark: e.target.value })}
                    />
                    <PincodeInput
                      label="Pincode"
                      value={draft.pincode}
                      onChange={(e) => handlePincodeChange(e.target.value)}
                      error={fieldErrors.pincode}
                      required
                    />
                  </div>
                </div>
              )}

              <Select
                label="State (for GST Place of Supply)"
                value={draft.stateCode}
                onChange={(e) => updateDraft({ stateCode: e.target.value })}
                options={Object.entries(INDIAN_STATES).map(([code, name]) => ({
                  value: code,
                  label: `${code} · ${name}`,
                }))}
              />
            </section>

            {/* Step 3: GST / Business & Payment */}
            <section className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-4">
              <div className="flex items-center gap-2">
                <ReceiptIndianRupee className="h-5 w-5 text-[var(--primary)]" aria-hidden="true" />
                <h2 className="font-display text-lg font-bold text-[var(--ink)]">3. GST &amp; payment</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label={isWholesale ? 'Buyer GSTIN (required)' : 'GSTIN (optional, for B2B invoice)'}
                  value={draft.gstin}
                  maxLength={15}
                  onChange={(e) => updateDraft({ gstin: e.target.value.toUpperCase() })}
                  placeholder="36AABCU9603R1ZO"
                  error={fieldErrors.gstin}
                  className="font-mono uppercase"
                />
                <Input
                  label="Business / Shop name (optional)"
                  value={draft.businessName}
                  onChange={(e) => updateDraft({ businessName: e.target.value })}
                />
              </div>

              {draft.gstin.length === 15 && validateGSTIN(draft.gstin) && (
                <div className="rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-border)] px-3.5 py-2.5 flex items-center gap-2.5 text-xs text-[var(--on-secondary-fixed)]">
                  <CheckCircle2 className="h-4 w-4 text-[var(--accent)] shrink-0" aria-hidden="true" />
                  <span>
                    GSTIN verified · Your tax invoice will include B2B Input Tax Credit (ITC) details.
                  </span>
                </div>
              )}

              <Textarea
                label="Delivery note or gift message (optional)"
                rows={2}
                value={draft.notes}
                onChange={(e) => updateDraft({ notes: e.target.value })}
              />

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">Payment method</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`cursor-pointer rounded-xl border p-3.5 text-sm transition-colors ${
                      paymentMethod === 'razorpay'
                        ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-[var(--sh-1)]'
                        : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink)] hover:bg-[var(--surface-high)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="razorpay"
                      checked={paymentMethod === 'razorpay'}
                      onChange={() => setPaymentMethod('razorpay')}
                      className="sr-only"
                    />
                    <span className="font-bold block">UPI / Cards / NetBanking</span>
                    <span className={`text-xs ${paymentMethod === 'razorpay' ? 'text-[var(--on-primary-container)]' : 'text-[var(--ink-muted)]'}`}>
                      Instant via Razorpay
                    </span>
                  </label>

                  {config.features.cod && (
                    <label
                      className={`cursor-pointer rounded-xl border p-3.5 text-sm transition-colors ${
                        paymentMethod === 'cod'
                          ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-[var(--sh-1)]'
                          : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink)] hover:bg-[var(--surface-high)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cod"
                        checked={paymentMethod === 'cod'}
                        onChange={() => setPaymentMethod('cod')}
                        className="sr-only"
                      />
                      <span className="font-bold block">Cash / UPI on Delivery</span>
                      <span className={`text-xs ${paymentMethod === 'cod' ? 'text-[var(--on-primary-container)]' : 'text-[var(--ink-muted)]'}`}>
                        Pay when pack arrives
                      </span>
                    </label>
                  )}
                </div>
              </div>

              {/* Hidden honeypot */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                className="hidden"
                aria-hidden="true"
              />

              <TurnstileWidget siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || ''} onVerify={setTurnstileToken} />
              {fieldErrors.turnstile && <p className="text-xs text-[var(--danger)]">{fieldErrors.turnstile}</p>}

              <label className="flex items-start gap-2.5 text-xs text-[var(--ink-muted)] cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
                />
                <span>
                  I accept the <Link to="/policies/terms" className="underline font-semibold text-[var(--primary)]">Terms</Link> and{' '}
                  <Link to="/policies/refunds" className="underline font-semibold text-[var(--primary)]">Refund Policy</Link>. Sealed food items cannot be returned once opened.
                </span>
              </label>
              {fieldErrors.acceptTerms && <p className="text-xs text-[var(--danger)]">{fieldErrors.acceptTerms}</p>}
            </section>
          </div>

          {/* Right Order Summary */}
          <aside className="lg:col-span-5 rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-4 lg:sticky lg:top-20">
            <h2 className="font-display text-xl font-bold text-[var(--ink)]">Payable summary</h2>

            {quote?.errors.map((err, i) => (
              <p key={i} className="rounded-lg bg-[var(--danger-bg)] px-3 py-2 text-xs text-[var(--danger)] font-medium">
                {err.message}
              </p>
            ))}

            {quote && (
              <>
                <ul className="space-y-2 text-sm border-b border-[var(--border-soft)] pb-3">
                  {quote.lines.map((l) => (
                    <li key={l.skuId} className="flex justify-between gap-2">
                      <span className="text-[var(--ink)]">
                        {l.name} × {l.qty}
                      </span>
                      <span className="font-medium tabular-nums">{formatINR(l.lineSubtotal)}</span>
                    </li>
                  ))}
                </ul>

                <dl className="space-y-2 text-sm tabular-nums">
                  <div className="flex justify-between">
                    <dt className="text-[var(--ink-muted)]">Subtotal</dt>
                    <dd>{formatINR(quote.subtotal)}</dd>
                  </div>
                  {quote.discount > 0 && (
                    <div className="flex justify-between text-[var(--success)]">
                      <dt>Discount ({quote.appliedCoupon})</dt>
                      <dd>−{formatINR(quote.discount)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-[var(--ink-muted)]">Shipping</dt>
                    <dd>{quote.shipping === 0 ? 'Free' : formatINR(quote.shipping)}</dd>
                  </div>
                  <div className="flex justify-between text-xs text-[var(--ink-muted)]">
                    <dt>
                      GST ({quote.isInterState ? 'IGST' : 'CGST+SGST'},{' '}
                      {quote.pricesInclusive ? 'incl.' : 'extra'})
                    </dt>
                    <dd>{formatINR(quote.tax)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-[var(--border-soft)] pt-3 text-lg font-bold text-[var(--ink)]">
                    <dt>Total</dt>
                    <dd>{formatINR(quote.total)}</dd>
                  </div>
                </dl>
              </>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={submitting}
              disabled={!quote?.ok}
            >
              <Lock className="h-4 w-4" aria-hidden="true" />
              <span>
                {paymentMethod === 'cod'
                  ? `Place COD Order · ${quote ? formatINR(quote.total) : '…'}`
                  : `Pay ${quote ? formatINR(quote.total) : '…'}`}
              </span>
            </Button>

            <div className="rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-border)] px-3 py-2 text-[11px] font-semibold text-[var(--on-secondary-fixed)] flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" aria-hidden="true" />
              <span>100% encrypted GST-compliant checkout · Freshness guaranteed</span>
            </div>
          </aside>
        </form>
      </div>

      <Suspense fallback={null}>
        {payModal && (
          <RazorpayCheckoutMock
            open
            brandName={config.brand.name}
            publicCode={payModal.publicCode}
            razorpayOrderId={payModal.razorpayOrderId}
            amountPaise={payModal.amountPaise}
            onSuccess={async ({ razorpayPaymentId, razorpaySignature }) => {
              try {
                const res = await api.verifyRazorpayPayment({
                  publicCode: payModal.publicCode,
                  razorpayOrderId: payModal.razorpayOrderId,
                  razorpayPaymentId,
                  razorpaySignature,
                });
                clearCart();
                triggerHaptic('order', { fxEnabled, reducedMotion });
                track(
                  'purchase',
                  {
                    transaction_id: res.order.publicCode,
                    currency: 'INR',
                    value: res.order.total / 100,
                    shipping: res.order.shipping / 100,
                    tax: res.order.tax / 100,
                  },
                  config
                );
                setPayModal(null);
                navigate(`/order/${res.order.publicCode}`);
              } catch (err) {
                pushToast({ message: err instanceof Error ? err.message : 'Payment check failed.', tone: 'danger' });
              }
            }}
            onFailure={(reason) => {
              pushToast({ message: reason, tone: 'danger' });
            }}
            onDismiss={() => {
              const code = payModal.publicCode;
              setPayModal(null);
              navigate(`/order/${code}`);
            }}
          />
        )}
      </Suspense>
    </>
  );
}
