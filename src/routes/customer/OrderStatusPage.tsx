import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, Copy, FileText, Truck, RefreshCw, AlertTriangle } from 'lucide-react';
import { api } from '../../api';
import type { OrderRecord } from '../../api/client';
import { formatINR } from '../../shared/money';
import { formatIstDateTimeDisplay } from '../../shared/calendar';
import { getStatusLabel } from '../../shared/status';
import { buildWhatsAppUrl, isPlaceholder } from '../../shared/whatsapp';
import { useStore } from '../../stores/appContext';
import { useAuthStore } from '../../stores/auth';
import { useCartStore } from '../../stores/cart';
import { useUiStore } from '../../stores/ui';
import { useDevSimStore } from '../../dev/simStore';
import { Seo } from '../../seo/Seo';
import { StatusPill } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const RazorpayCheckoutMock = lazy(() => import('../../components/shop/RazorpayCheckoutMock'));

export function OrderStatusPage() {
  const { code = '' } = useParams<{ code: string }>();
  const { config } = useStore();
  const verifiedOrderCodes = useAuthStore((s) => s.verifiedOrderCodes);
  const rememberOrderAccess = useAuthStore((s) => s.rememberOrderAccess);
  const clearCart = useCartStore((s) => s.clearCart);
  const pushToast = useUiStore((s) => s.pushToast);
  const webhookLate = useDevSimStore((s) => s.webhookLateSec > 0);
  const navigate = useNavigate();

  const upperCode = code.toUpperCase();
  const [last4, setLast4] = useState(verifiedOrderCodes[upperCode] || '');
  const [last4Input, setLast4Input] = useState('');
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(last4));
  const [copied, setCopied] = useState(false);

  const [resumeModal, setResumeModal] = useState<{ razorpayOrderId: string; amountPaise: number } | null>(null);

  const fetchOrder = async (pin4: string) => {
    setLoading(true);
    setError('');
    try {
      const ord = await api.getOrder(upperCode, pin4);
      setOrder(ord);
      rememberOrderAccess(upperCode, pin4);
      setLast4(pin4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order not found or phone digits did not match.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (last4) {
      void fetchOrder(last4);
    }
  }, [upperCode]);

  // Poll every 3s for up to 15s when webhook confirmation is delayed (Section K2)
  useEffect(() => {
    if (!order || order.status !== 'pending_payment' || !last4) return;
    const id = window.setInterval(() => {
      void api.getOrder(upperCode, last4).then(setOrder).catch(() => {});
    }, 3000);
    return () => window.clearInterval(id);
  }, [order?.status, upperCode, last4]);

  const handleGateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(last4Input.trim())) {
      setError('Enter the last 4 digits of the phone number used at checkout.');
      return;
    }
    void fetchOrder(last4Input.trim());
  };

  const handleResumePayment = async () => {
    if (!order) return;
    try {
      const rzp = await api.createRazorpayOrder(order.publicCode);
      setResumeModal(rzp);
    } catch (err) {
      pushToast({ message: err instanceof Error ? err.message : 'Unable to restart payment.', tone: 'danger' });
    }
  };

  if (!order) {
    return (
      <>
        <Seo route="noindex" path={`/order/${upperCode}`} config={config} />
        <div className="mx-auto max-w-md px-4 py-12">
          <form
            onSubmit={handleGateSubmit}
            className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-6 shadow-[var(--sh-1)] space-y-4"
          >
            <h1 className="font-display text-2xl font-bold text-[var(--ink)]">Order {upperCode}</h1>
            <p className="text-sm text-[var(--ink-muted)]">
              Enter the last 4 digits of your checkout mobile number to view your order status and tax invoice.
            </p>
            <Input
              label="Last 4 digits of mobile"
              inputMode="numeric"
              maxLength={4}
              value={last4Input}
              onChange={(e) => setLast4Input(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="e.g. 3210"
              error={error}
              className="tabular-nums tracking-widest text-center text-lg font-bold"
              required
            />
            <Button type="submit" variant="primary" fullWidth loading={loading}>
              View order details
            </Button>
          </form>
        </div>
      </>
    );
  }

  const statusLabel = getStatusLabel(order.status, order.mode);
  const statusTone =
    order.status === 'delivered'
      ? 'ok'
      : order.status === 'cancelled' || order.status === 'expired'
      ? 'danger'
      : order.status === 'pending_payment'
      ? 'warn'
      : 'neutral';
  const waUrl = buildWhatsAppUrl('track', { code: order.publicCode }, config);
  const steps = ['paid', 'packed', 'shipped', 'delivered'] as const;

  return (
    <>
      <Seo route="noindex" path={`/order/${order.publicCode}`} config={config} />

      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
              {order.mode.toUpperCase()} · Placed {formatIstDateTimeDisplay(order.createdAt)}
            </p>
            <h1 className="font-display text-3xl font-bold text-[var(--ink)] mt-1">Order {order.publicCode}</h1>
          </div>
          <StatusPill label={statusLabel} tone={statusTone} />
        </div>

        {/* Pending / Expired / Mismatch callouts */}
        {order.status === 'pending_payment' && (
          <div className="rounded-2xl border border-[var(--warn-ink)]/25 bg-[var(--warn-bg)] p-5 shadow-[var(--sh-1)] space-y-3 text-[var(--warn-ink)]">
            <div className="flex items-start gap-2.5">
              <RefreshCw className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1 text-sm">
                <p className="font-bold">
                  {webhookLate
                    ? 'Confirming payment with Razorpay… please do not pay again.'
                    : 'Awaiting payment confirmation'}
                </p>
                <p>Reservation holds stock until {formatIstDateTimeDisplay(order.payBy)}.</p>
              </div>
            </div>
            {!webhookLate && (
              <Button variant="primary" onClick={handleResumePayment}>
                Resume payment ({formatINR(order.total)})
              </Button>
            )}
          </div>
        )}

        {order.status === 'expired' && (
          <div className="rounded-2xl border border-[var(--danger)]/25 bg-[var(--danger-bg)] p-5 shadow-[var(--sh-1)] flex flex-wrap items-center justify-between gap-3 text-[var(--danger)]">
            <p className="text-sm font-semibold">This unpaid order reservation has expired and stock was released.</p>
            <Button variant="primary" onClick={() => navigate('/shop')}>
              Start a fresh order
            </Button>
          </div>
        )}

        {order.amountMismatchFlag && (
          <div className="rounded-2xl border border-[var(--warn-ink)]/25 bg-[var(--warn-bg)] p-5 shadow-[var(--sh-1)] flex items-start gap-2.5 text-[var(--warn-ink)] text-sm">
            <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>We detected an amount verification check on this payment. Our team is reconciling it and will update shortly.</span>
          </div>
        )}

        {/* Progress Timeline */}
        {order.status !== 'cancelled' && order.status !== 'expired' && order.status !== 'refunded' && (
          <div className="rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)]/45 p-5 shadow-[var(--sh-1)]">
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {steps.map((st, idx) => {
                const currentIdx = steps.indexOf(order.status as typeof steps[number]);
                const done = currentIdx >= idx;
                return (
                  <div key={st} className="space-y-1.5">
                    <div
                      className={`mx-auto h-7 w-7 rounded-full flex items-center justify-center font-bold ${
                        done
                          ? 'bg-[var(--accent)] text-white shadow-xs'
                          : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--ink-muted)]'
                      }`}
                    >
                      {done ? <Check className="h-4 w-4" aria-hidden="true" /> : idx + 1}
                    </div>
                    <p className={done ? 'font-semibold text-[var(--on-secondary-fixed)]' : 'text-[var(--ink-muted)]'}>
                      {getStatusLabel(st, order.mode)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Courier tracking */}
        {order.trackingId && (
          <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-[var(--primary)]" aria-hidden="true" />
              <div className="text-sm">
                <p className="font-bold text-[var(--ink)]">{order.courierName || 'Courier'}</p>
                <p className="font-mono text-xs text-[var(--ink-muted)]">AWB: {order.trackingId}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  navigator.clipboard?.writeText(order.trackingId || '');
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1800);
                }}
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                {copied ? 'Copied' : 'Copy AWB'}
              </Button>
              {order.trackingUrl && (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pressable inline-flex min-h-[36px] items-center rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] px-3.5 text-xs font-semibold text-white transition-colors"
                >
                  Track parcel
                </a>
              )}
            </div>
          </div>
        )}

        {/* Line Items & Invoice Action */}
        <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-[var(--ink)]">Items &amp; tax invoice</h2>
            <div className="flex flex-wrap gap-2">
              <Link
                to={`/invoice/${order.publicCode}?t=${encodeURIComponent(order.invoiceToken)}`}
                className="pressable inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-high)] px-4 text-sm font-semibold text-[var(--ink)] transition-colors"
              >
                <FileText className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
                <span>View GST Invoice</span>
              </Link>
              {waUrl && !isPlaceholder(config.whatsapp.number) && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pressable inline-flex min-h-[44px] items-center rounded-xl bg-[var(--brand-whatsapp)] px-4 text-sm font-semibold text-white"
                >
                  WhatsApp Support
                </a>
              )}
            </div>
          </div>

          <ul className="divide-y divide-[var(--border-soft)] text-sm">
            {order.items.map((item) => (
              <li key={item.skuId} className="py-2.5 flex justify-between gap-2 tabular-nums">
                <span>
                  {item.name} × {item.qty} <span className="text-xs text-[var(--ink-muted)]">({item.skuCode})</span>
                </span>
                <span className="font-semibold">{formatINR(item.unitPaise * item.qty)}</span>
              </li>
            ))}
          </ul>

          <dl className="border-t border-[var(--border-soft)] pt-3 space-y-1.5 text-sm tabular-nums">
            <div className="flex justify-between">
              <dt className="text-[var(--ink-muted)]">Subtotal</dt>
              <dd>{formatINR(order.subtotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-[var(--success)]">
                <dt>Discount</dt>
                <dd>−{formatINR(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-[var(--ink-muted)]">Shipping</dt>
              <dd>{order.shipping === 0 ? 'Free' : formatINR(order.shipping)}</dd>
            </div>
            <div className="flex justify-between text-base font-bold text-[var(--ink)] pt-1">
              <dt>Total</dt>
              <dd>{formatINR(order.total)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <Suspense fallback={null}>
        {resumeModal && (
          <RazorpayCheckoutMock
            open
            brandName={config.brand.name}
            publicCode={order.publicCode}
            razorpayOrderId={resumeModal.razorpayOrderId}
            amountPaise={resumeModal.amountPaise}
            onSuccess={async ({ razorpayPaymentId, razorpaySignature }) => {
              const res = await api.verifyRazorpayPayment({
                publicCode: order.publicCode,
                razorpayOrderId: resumeModal.razorpayOrderId,
                razorpayPaymentId,
                razorpaySignature,
              });
              setOrder(res.order);
              clearCart();
              setResumeModal(null);
            }}
            onFailure={(reason) => pushToast({ message: reason, tone: 'danger' })}
            onDismiss={() => setResumeModal(null)}
          />
        )}
      </Suspense>
    </>
  );
}
