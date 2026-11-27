import { useState } from 'react';
import { Lock, ShieldCheck, X } from 'lucide-react';
import { formatINR } from '../../shared/money';
import { Button } from '../ui/Button';

export default function RazorpayCheckoutMock({
  open,
  brandName,
  publicCode,
  razorpayOrderId,
  amountPaise,
  onSuccess,
  onFailure,
  onDismiss,
}: {
  open: boolean;
  brandName: string;
  publicCode: string;
  razorpayOrderId: string;
  amountPaise: number;
  onSuccess: (payload: { razorpayPaymentId: string; razorpaySignature: string; simulateWebhook?: boolean }) => void;
  onFailure: (reason: string) => void;
  onDismiss: () => void;
}) {
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Simulated Razorpay payment gateway"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] border border-[var(--border-soft)]/70 shadow-[var(--sh-2)] overflow-hidden">
        <div className="flex items-center justify-between bg-[var(--ink)] px-5 py-4 text-white">
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--accent-soft)]">Razorpay Test Checkout</p>
            <p className="font-display text-lg font-bold">{brandName}</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onDismiss}
            aria-label="Dismiss payment modal"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-white/80 hover:bg-white/10"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] p-3.5">
            <div>
              <p className="text-xs text-[var(--ink-muted)]">Order {publicCode}</p>
              <p className="text-xs text-[var(--ink-muted)] font-mono">{razorpayOrderId}</p>
            </div>
            <p className="text-2xl font-bold tabular-nums text-[var(--ink)]">{formatINR(amountPaise)}</p>
          </div>

          <p className="text-xs text-[var(--ink-muted)] flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-[var(--success)] shrink-0" aria-hidden="true" />
            <span>Static simulation mode — simulate UPI/Card success, webhook-only confirmation, failure, or cancel.</span>
          </p>

          <div className="space-y-2.5">
            <Button
              variant="primary"
              fullWidth
              loading={busy}
              onClick={() => {
                setBusy(true);
                const pid = `pay_sim_${Math.random().toString(36).slice(2, 10)}`;
                window.setTimeout(() => {
                  onSuccess({ razorpayPaymentId: pid, razorpaySignature: `sig_sim_${pid}` });
                }, 400);
              }}
            >
              <Lock className="h-4 w-4" aria-hidden="true" />
              Simulate Payment Success ({formatINR(amountPaise)})
            </Button>

            <Button
              variant="secondary"
              fullWidth
              disabled={busy}
              onClick={() => onFailure('Bank declined the test transaction. You have not been charged.')}
            >
              Simulate Payment Failure
            </Button>

            <Button variant="ghost" fullWidth disabled={busy} onClick={onDismiss}>
              Cancel & keep order pending
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
