import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from '../../api';
import { useStore } from '../../stores/appContext';
import { useAuthStore } from '../../stores/auth';
import { Seo } from '../../seo/Seo';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export function TrackPage() {
  const { config } = useStore();
  const rememberOrderAccess = useAuthStore((s) => s.rememberOrderAccess);
  const navigate = useNavigate();

  const [code, setCode] = useState('');
  const [last4, setLast4] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanCode = code.trim().toUpperCase();
    const cleanPin = last4.trim();
    if (!cleanCode) {
      setError('Enter your order code (e.g. ORD-2026-0001).');
      return;
    }
    if (!/^\d{4}$/.test(cleanPin)) {
      setError('Enter the last 4 digits of your checkout phone number.');
      return;
    }
    setLoading(true);
    try {
      const ord = await api.getOrder(cleanCode, cleanPin);
      rememberOrderAccess(ord.publicCode, cleanPin);
      navigate(`/order/${ord.publicCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order not found or digits did not match.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Seo route="noindex" path="/track" config={config} />
      <div className="mx-auto max-w-md px-4 py-12">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-6 shadow-[var(--sh-1)] space-y-4"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Order &amp; Invoice Lookup</p>
            <h1 className="font-display text-2xl font-bold text-[var(--ink)]">Track your order</h1>
          </div>
          <p className="text-sm text-[var(--ink-muted)]">
            Enter your order code and the last 4 digits of your mobile number to view live packing &amp; courier status.
          </p>

          <Input
            label="Order code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ORD-2026-0001"
            className="font-mono uppercase"
            required
          />

          <Input
            label="Last 4 digits of mobile number"
            inputMode="numeric"
            maxLength={4}
            value={last4}
            onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="3210"
            className="tabular-nums font-mono"
            error={error}
            required
          />

          <Button type="submit" variant="primary" fullWidth loading={loading}>
            <Search className="h-4 w-4" aria-hidden="true" />
            <span>Check order status</span>
          </Button>

          <div className="rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-border)] px-3 py-2 text-[11px] font-medium text-[var(--on-secondary-fixed)]">
            Download your GST tax invoice &amp; courier AWB immediately after verification.
          </div>
        </form>
      </div>
    </>
  );
}
